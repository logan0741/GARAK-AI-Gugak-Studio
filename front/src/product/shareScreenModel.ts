import { ExportedAudio, PracticeResult } from '../studio/studioTypes';
import type { GarakProductAction, GarakProductState } from './garakProductState';
import { getInstrumentName, getPracticeSongTitle, PRACTICE_SONGS } from './productFixtures';

export type ShareFeedCategory = {
  label: string;
  active: boolean;
};

export type ShareFeedHero = {
  owner: string;
  title: string;
  description: string;
};

export type ShareFeedPlayer = {
  title: string;
  sourceKind: 'demo' | 'work' | 'exportedAudio' | 'practiceResult';
  workId?: string;
  exportedAudioId?: string;
  practiceResultId?: string;
};

export type ShareFeedRecentCard = {
  id: string;
  title: string;
  subtitle: string;
  liked: boolean;
  artwork: 'floral' | 'dancheong' | 'pattern';
};

export type ShareFeedViewModel = {
  categories: ShareFeedCategory[];
  hero: ShareFeedHero;
  player: ShareFeedPlayer;
  recentCards: ShareFeedRecentCard[];
};

export type SharePrepareViewModel = {
  canShare: boolean;
  title: string;
  description: string;
  durationLabel: string;
  instrumentLabel: string;
  sourceLabel: string;
  isPreviewing: boolean;
};

const SHARE_FEED_CATEGORIES = ['Hot', 'K-pop', 'K-Drama OST', 'K-Minyo', 'Arirang'] as const;

const FIGMA_RECENT_CARDS: ShareFeedRecentCard[] = [
  {
    id: 'recent-kdrama-ost',
    title: 'K-Drama OST',
    subtitle: 'Drama mood',
    liked: false,
    artwork: 'floral',
  },
  {
    id: 'recent-kpop-demon-hunters',
    title: 'K-pop Demon Hunters',
    subtitle: 'Remix',
    liked: true,
    artwork: 'dancheong',
  },
  {
    id: 'recent-korea-minyo',
    title: 'Korea Minyo',
    subtitle: 'Minyo',
    liked: false,
    artwork: 'pattern',
  },
];

export function getShareFeedViewModel(state: GarakProductState): ShareFeedViewModel {
  return {
    categories: SHARE_FEED_CATEGORIES.map((label, index) => ({
      label,
      active: index === 0,
    })),
    hero: {
      owner: 'Minsu_Kim',
      title: 'Minsu_Kim님을 위한 추천 가락',
      description: '케이팝 데몬 헌터스의 노래들을 가락과 함께 국악으로 연주해요.',
    },
    player: getShareablePlayer(state),
    recentCards: FIGMA_RECENT_CARDS,
  };
}

export function getSharePrepareViewModel(state: GarakProductState): SharePrepareViewModel {
  const shareTarget = getSharePrepareTarget(state);

  if (shareTarget === undefined) {
    return {
      canShare: false,
      title: '공유 대상 없음',
      description: '작업을 내보내거나 따라하기 결과를 저장하면 공유할 수 있습니다.',
      durationLabel: '준비 전',
      instrumentLabel: '사용 악기 없음',
      sourceLabel: '공유 대상 없음',
      isPreviewing: false,
    };
  }

  if (shareTarget.kind === 'exported_audio') {
    const durationLabel = formatSeconds(shareTarget.durationSeconds);
    const instrumentLabel = formatExportedInstrumentNames(shareTarget);

    return {
      canShare: true,
      title: shareTarget.title,
      description: `${durationLabel} · ${instrumentLabel} · 내보낸 음원`,
      durationLabel,
      instrumentLabel,
      sourceLabel: shareTarget.sourceLabel ?? (shareTarget.workId === undefined ? '내보낸 음원' : '출처 작업'),
      isPreviewing: state.sharePreviewStatus === 'playing',
    };
  }

  const instrumentLabel = getInstrumentName(shareTarget.instrument);

  return {
    canShare: true,
    title: `${getPracticeSongTitle(shareTarget.songId)} 연습 결과`,
    description: `${instrumentLabel} · 정확도 ${shareTarget.accuracyScore}% · 따라하기 결과`,
    durationLabel: getPracticeSongDurationLabel(shareTarget.songId),
    instrumentLabel,
    sourceLabel: '따라하기 결과',
    isPreviewing: state.sharePreviewStatus === 'playing',
  };
}

export function getSharePrepareAction(state: GarakProductState): GarakProductAction | undefined {
  return getSharePrepareViewModel(state).canShare
    ? { type: 'navigate', target: 'S17' }
    : undefined;
}

function getSharePrepareTarget(state: GarakProductState): ExportedAudio | PracticeResult | undefined {
  const selectedPlayerItem = state.selectedPlayerItem;

  if (selectedPlayerItem?.kind === 'exportedAudio') {
    return state.library.exportedAudios.find(
      (audio) => audio.id === selectedPlayerItem.exportedAudioId,
    );
  }

  if (selectedPlayerItem?.kind === 'practiceResult') {
    return state.library.practiceResults.find(
      (result) => result.id === selectedPlayerItem.practiceResultId,
    );
  }

  if (selectedPlayerItem !== undefined) {
    return undefined;
  }

  return [...state.library.exportedAudios, ...state.library.practiceResults].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  )[0];
}

function formatSeconds(seconds: number): string {
  return `${seconds}초`;
}

function formatExportedInstrumentNames(audio: ExportedAudio): string {
  const names = audio.instrumentNames.map((name) => name.trim()).filter((name) => name.length > 0);

  return names.length > 0 ? names.join(', ') : '사용 악기 없음';
}

function getPracticeSongDurationLabel(songId: string): string {
  const song = PRACTICE_SONGS.find((item) => item.id === songId);

  return song === undefined ? '길이 정보 없음' : formatSeconds(song.durationSeconds);
}

function getShareablePlayer(state: GarakProductState): ShareFeedPlayer {
  const selectedPlayer = getSelectedSharedPlayer(state);

  if (selectedPlayer !== undefined) {
    return selectedPlayer;
  }

  const newestSharedItem = [
    ...state.library.exportedAudios
      .filter((audio) => audio.shareState === 'shared')
      .map((audio) => ({ createdAt: audio.createdAt, player: toExportedAudioPlayer(audio) })),
    ...state.library.practiceResults
      .filter((result) => result.shareState === 'shared')
      .map((result) => ({ createdAt: result.createdAt, player: toPracticeResultPlayer(result) })),
  ].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];

  if (newestSharedItem !== undefined) {
    return newestSharedItem.player;
  }

  return {
    title: 'My Arirang',
    sourceKind: 'demo',
  };
}

function getSelectedSharedPlayer(state: GarakProductState): ShareFeedPlayer | undefined {
  const selected = state.selectedPlayerItem;

  if (selected?.kind === 'exportedAudio') {
    const audio = state.library.exportedAudios.find(
      (item) => item.id === selected.exportedAudioId && item.shareState === 'shared',
    );

    return audio === undefined ? undefined : toExportedAudioPlayer(audio);
  }

  if (selected?.kind === 'practiceResult') {
    const result = state.library.practiceResults.find(
      (item) => item.id === selected.practiceResultId && item.shareState === 'shared',
    );

    return result === undefined ? undefined : toPracticeResultPlayer(result);
  }

  return undefined;
}

function toExportedAudioPlayer(audio: ExportedAudio): ShareFeedPlayer {
  return {
    title: audio.title,
    sourceKind: 'exportedAudio',
    exportedAudioId: audio.id,
  };
}

function toPracticeResultPlayer(result: PracticeResult): ShareFeedPlayer {
  return {
    title: `${getPracticeSongTitle(result.songId)} 연습 결과`,
    sourceKind: 'practiceResult',
    practiceResultId: result.id,
  };
}

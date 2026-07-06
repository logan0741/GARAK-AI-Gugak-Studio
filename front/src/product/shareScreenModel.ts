import { ExportedAudio, PracticeResult } from '../studio/studioTypes';
import type { GarakProductAction, GarakProductState } from './garakProductState';
import {
  FEATURED_SHARED_RECORDING,
  findSharedRecordingById,
  getInstrumentName,
  getPracticeSongTitle,
  PRACTICE_SONGS,
  SHARE_FEED_RECORDINGS,
  type SharedRecording,
} from './productFixtures';
import { isPlayableExportedAudioForPlayback } from './libraryPlaybackAudio';

export type ShareFeedCategory = {
  label: string;
  active: boolean;
};

export type ShareFeedHero = {
  owner: string;
  recordingId: string;
  title: string;
  description: string;
};

export type ShareFeedPlayer = {
  title: string;
  sourceKind: 'demo' | 'work' | 'exportedAudio' | 'practiceResult' | 'unavailable';
  workId?: string;
  exportedAudioId?: string;
  practiceResultId?: string;
  playAction?: GarakProductAction;
};

export type ShareFeedRecentCard = {
  id: string;
  recordingId: string;
  title: string;
  subtitle: string;
  liked: boolean;
  artwork: 'floral' | 'dancheong' | 'pattern';
};

export type ShareFeedViewModel = {
  categories: ShareFeedCategory[];
  hero: ShareFeedHero;
  player: ShareFeedPlayer;
  sortLabel: string;
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
  isPublishing: boolean;
  publishButtonLabel: string;
  playbackNotice?: string;
  publishErrorMessage?: string;
};

export type SharedDetailViewModel = {
  title: string;
  instrument: SharedRecording['instrument'];
  provenanceLabel: string;
  durationLabel: string;
  remixStatusLabel: string;
  canRemix: boolean;
  isPlaying: boolean;
  playbackNotice?: string;
  actions: {
    play?: GarakProductAction;
    pause?: GarakProductAction;
    remix?: GarakProductAction;
    save?: GarakProductAction;
  };
};

const SHARE_FEED_CATEGORIES = ['Hot', 'K-pop', 'K-Drama OST', 'K-Minyo', 'Arirang'] as const;

const FIGMA_RECENT_CARD_PRESENTATION: Array<Pick<ShareFeedRecentCard, 'id' | 'recordingId' | 'liked' | 'artwork'>> = [
  {
    id: 'recent-kdrama-ost',
    recordingId: 'recent-kdrama-ost',
    liked: false,
    artwork: 'floral',
  },
  {
    id: 'recent-kpop-demon-hunters',
    recordingId: 'recent-kpop-demon-hunters',
    liked: true,
    artwork: 'dancheong',
  },
  {
    id: 'recent-korea-minyo',
    recordingId: 'recent-korea-minyo',
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
      recordingId: FEATURED_SHARED_RECORDING.id,
      title: 'Minsu_Kim님을 위한 추천 가락',
      description: '케이팝 데몬 헌터스의 노래들을 가락과 함께 국악으로 연주해요.',
    },
    player: getShareablePlayer(state),
    sortLabel: '인기순',
    recentCards: createRecentCards(),
  };
}

export function getSharePrepareViewModel(state: GarakProductState): SharePrepareViewModel {
  const shareTarget = getSharePrepareTarget(state);
  const publishState = getSharePreparePublishState(state);
  const playbackNotice = getSharePreparePlaybackNotice(state);

  if (shareTarget === undefined) {
    return {
      canShare: false,
      title: '공유 대상 없음',
      description: '작업을 내보내거나 따라하기 결과를 저장하면 공유할 수 있습니다.',
      durationLabel: '준비 전',
      instrumentLabel: '사용 악기 없음',
      sourceLabel: '공유 대상 없음',
      isPreviewing: false,
      playbackNotice,
      ...publishState,
    };
  }

  if (shareTarget.kind === 'exported_audio') {
    const durationLabel = formatSeconds(shareTarget.durationSeconds);
    const instrumentLabel = formatExportedInstrumentNames(shareTarget);

    return {
      canShare: true,
      title: shareTarget.title,
      description: `${durationLabel} / ${instrumentLabel} / 내보낸 음원`,
      durationLabel,
      instrumentLabel: joinShareMetadata([instrumentLabel, formatExportRenderKind(shareTarget)]),
      sourceLabel: shareTarget.sourceLabel ?? (shareTarget.workId === undefined ? '내보낸 음원' : '출처 작업'),
      isPreviewing: state.sharePreviewStatus === 'playing',
      playbackNotice,
      ...publishState,
    };
  }

  const instrumentLabel = getInstrumentName(shareTarget.instrument);

  return {
    canShare: true,
    title: `${getPracticeSongTitle(shareTarget.songId)} 연습 결과`,
    description: `${instrumentLabel} / 정확도 ${shareTarget.accuracyScore}% / 따라하기 결과`,
    durationLabel: getPracticeSongDurationLabel(shareTarget.songId),
    instrumentLabel,
    sourceLabel: '따라하기 결과',
    isPreviewing: state.sharePreviewStatus === 'playing',
    playbackNotice,
    ...publishState,
  };
}

function getSharePreparePlaybackNotice(state: GarakProductState): string | undefined {
  return state.playerPlaybackStatus.status === 'failed'
    ? `Playback unavailable: ${state.playerPlaybackStatus.message}`
    : undefined;
}

function getSharePreparePublishState(
  state: GarakProductState,
): Pick<SharePrepareViewModel, 'isPublishing' | 'publishButtonLabel' | 'publishErrorMessage'> {
  if (state.sharePublishStatus.status === 'publishing') {
    return {
      isPublishing: true,
      publishButtonLabel: 'Sharing...',
    };
  }

  if (state.sharePublishStatus.status === 'failed') {
    return {
      isPublishing: false,
      publishButtonLabel: '공유하기',
      publishErrorMessage: state.sharePublishStatus.message,
    };
  }

  return {
    isPublishing: false,
    publishButtonLabel: '공유하기',
  };
}

function formatExportRenderKind(audio: ExportedAudio): string | undefined {
  switch (audio.renderKind) {
    case 'audio_capture':
      return '녹음 파일';
    case 'event_replay':
      return '이벤트 녹음';
    case 'demo_sample':
      return '데모 샘플';
    case undefined:
      return undefined;
  }
}

function joinShareMetadata(parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => part !== undefined && part.length > 0).join(' / ');
}

export function getSharePrepareAction(state: GarakProductState): GarakProductAction | undefined {
  return getSharePrepareViewModel(state).canShare
    ? { type: 'navigate', target: 'S17' }
    : undefined;
}

export function getSharedDetailViewModel(state: GarakProductState): SharedDetailViewModel {
  const recording =
    state.selectedSharedRecordingId === undefined
      ? FEATURED_SHARED_RECORDING
      : findSharedRecordingById(state.selectedSharedRecordingId);

  if (recording === undefined) {
    return {
      title: 'Shared recording unavailable',
      instrument: FEATURED_SHARED_RECORDING.instrument,
      provenanceLabel: 'Selected recording is unavailable',
      durationLabel: '--',
      remixStatusLabel: 'Unavailable',
      canRemix: false,
      isPlaying: false,
      playbackNotice:
        getSharePreparePlaybackNotice(state) ?? 'Playback unavailable: Selected shared recording is unavailable.',
      actions: {
        play: undefined,
        pause: undefined,
        remix: undefined,
        save: undefined,
      },
    };
  }

  const instrumentName = getInstrumentName(recording.instrument);
  const isPlaying = state.playingSharedRecordingId === recording.id;

  return {
    title: recording.title,
    instrument: recording.instrument,
    provenanceLabel: `${recording.authorDisplayName} · ${instrumentName} · ${recording.sourceLabel}`,
    durationLabel: formatSeconds(recording.durationSeconds),
    remixStatusLabel: recording.remixable ? '리믹스 가능' : '저장만 가능',
    canRemix: recording.remixable,
    isPlaying,
    playbackNotice: getSharePreparePlaybackNotice(state),
    actions: {
      play: isPlaying ? undefined : { type: 'playSelectedSharedRecording' },
      pause: isPlaying ? { type: 'pauseSelectedSharedRecording' } : undefined,
      remix: recording.remixable ? { type: 'remixSharedRecording' } : undefined,
      save: { type: 'saveSharedRecording' },
    },
  };
}

function createRecentCards(): ShareFeedRecentCard[] {
  return FIGMA_RECENT_CARD_PRESENTATION.map((card) => {
    const recording = SHARE_FEED_RECORDINGS.find((item) => item.id === card.recordingId);

    if (recording === undefined) {
      return {
        ...card,
        title: card.recordingId,
        subtitle: '공유 정보 없음',
      };
    }

    return {
      ...card,
      title: recording.title,
      subtitle: formatSharedRecordingSubtitle(recording),
    };
  });
}

function formatSharedRecordingSubtitle(recording: SharedRecording): string {
  return `${recording.authorDisplayName} · ${getInstrumentName(recording.instrument)} · ${formatSeconds(recording.durationSeconds)}`;
}

function getSharePrepareTarget(state: GarakProductState): ExportedAudio | PracticeResult | undefined {
  const selectedPlayerItem = state.selectedPlayerItem;

  if (selectedPlayerItem?.kind === 'exportedAudio') {
    return state.library.exportedAudios.find(
      (audio) =>
        audio.id === selectedPlayerItem.exportedAudioId &&
        isShareableExportedAudio(state, audio),
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

  return [
    ...state.library.exportedAudios.filter((audio) => isShareableExportedAudio(state, audio)),
    ...state.library.practiceResults,
  ].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
}

function isShareableExportedAudio(state: GarakProductState, audio: ExportedAudio): boolean {
  return isPlayableExportedAudioForPlayback(state.library.works, audio);
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

  if (hasMissingExplicitShareFeedSelection(state)) {
    return {
      title: 'Selected item unavailable',
      sourceKind: 'unavailable',
    };
  }

  const newestSharedItem = [
    ...state.library.exportedAudios
      .filter((audio) => audio.shareState === 'shared' && isShareableExportedAudio(state, audio))
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
    playAction: {
      type: 'playLibraryItemNow',
      item: { kind: 'demo', title: 'My Arirang' },
    },
  };
}

function getSelectedSharedPlayer(state: GarakProductState): ShareFeedPlayer | undefined {
  const selected = state.selectedPlayerItem;

  if (selected?.kind === 'exportedAudio') {
    const audio = state.library.exportedAudios.find(
      (item) =>
        item.id === selected.exportedAudioId &&
        item.shareState === 'shared' &&
        isShareableExportedAudio(state, item),
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

function hasMissingExplicitShareFeedSelection(state: GarakProductState): boolean {
  const selected = state.selectedPlayerItem;

  if (selected?.kind === 'exportedAudio') {
    return !state.library.exportedAudios.some(
      (item) => item.id === selected.exportedAudioId && isShareableExportedAudio(state, item),
    );
  }

  if (selected?.kind === 'practiceResult') {
    return !state.library.practiceResults.some((item) => item.id === selected.practiceResultId);
  }

  return false;
}

function toExportedAudioPlayer(audio: ExportedAudio): ShareFeedPlayer {
  return {
    title: audio.title,
    sourceKind: 'exportedAudio',
    exportedAudioId: audio.id,
    playAction: {
      type: 'playLibraryItemNow',
      item: { kind: 'exportedAudio', exportedAudioId: audio.id },
    },
  };
}

function toPracticeResultPlayer(result: PracticeResult): ShareFeedPlayer {
  return {
    title: `${getPracticeSongTitle(result.songId)} 연습 결과`,
    sourceKind: 'practiceResult',
    practiceResultId: result.id,
    playAction: {
      type: 'playLibraryItemNow',
      item: { kind: 'practiceResult', practiceResultId: result.id },
    },
  };
}

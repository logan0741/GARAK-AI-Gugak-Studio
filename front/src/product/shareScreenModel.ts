import { GarakProductState } from './garakProductState';

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

function getShareablePlayer(state: GarakProductState): ShareFeedPlayer {
  const exportedAudio = state.library.exportedAudios[0];

  if (exportedAudio !== undefined) {
    return {
      title: exportedAudio.title,
      sourceKind: 'exportedAudio',
      exportedAudioId: exportedAudio.id,
    };
  }

  const work = state.library.works[0];

  if (work !== undefined) {
    return {
      title: work.title,
      sourceKind: 'work',
      workId: work.id,
    };
  }

  const practiceResult = state.library.practiceResults[0];

  if (practiceResult !== undefined) {
    return {
      title: 'Practice Result',
      sourceKind: 'practiceResult',
      practiceResultId: practiceResult.id,
    };
  }

  return {
    title: 'My Arirang',
    sourceKind: 'demo',
  };
}

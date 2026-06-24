import type { GarakProductState } from './garakProductState';

export type HomeScreenViewModel = {
  title: string;
  description: string;
  ctaLabel: string;
  quickAccessLabels: {
    library: string;
    home: string;
    share: string;
  };
};

export function getHomeScreenViewModel(state: GarakProductState): HomeScreenViewModel {
  if (state.language === 'en') {
    return {
      title: 'Play gugak with GARAK',
      description: 'Play traditional instruments and complete your own garak with AI.',
      ctaLabel: 'PLAY',
      quickAccessLabels: {
        library: 'My',
        home: 'Home',
        share: 'Share',
      },
    };
  }

  return {
    title: 'GARAK과 함께 국악 연주하기',
    description: '전통 악기를 연주하고, AI와 함께 자신만의 가락을 완성할 수 있습니다.',
    ctaLabel: 'PLAY',
    quickAccessLabels: {
      library: '마이',
      home: '홈',
      share: '쉐어',
    },
  };
}

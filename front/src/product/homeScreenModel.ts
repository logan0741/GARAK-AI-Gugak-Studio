import type { ScreenFlowMode } from '../screen-flow/screenDefinitions';
import type { GarakProductAction, GarakProductState } from './garakProductState';

export type HomeScreenModeOption = {
  id: ScreenFlowMode;
  label: string;
  isSelected: boolean;
  selectAction: GarakProductAction;
};

export type HomeScreenViewModel = {
  title: string;
  description: string;
  ctaLabel: string;
  modeOptions: HomeScreenModeOption[];
  selectedModeTitle: string;
  selectedModeDescription: string;
  quickAccessLabels: {
    library: string;
    home: string;
    share: string;
  };
};

export function getHomeScreenViewModel(state: GarakProductState): HomeScreenViewModel {
  const modeOptions = createHomeModeOptions(state);

  if (state.language === 'en') {
    return {
      title: 'Play gugak with GARAK',
      description: 'Play traditional instruments and complete your own garak with AI.',
      ctaLabel: 'PLAY',
      modeOptions,
      selectedModeTitle: state.selectedMode === 'practice' ? 'Practice mode' : 'Free creation mode',
      selectedModeDescription:
        state.selectedMode === 'practice'
          ? 'Pick a folk song and practice with guided timing feedback.'
          : 'Layer instruments and local jangdan accompaniment into your own garak.',
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
    modeOptions,
    selectedModeTitle: state.selectedMode === 'practice' ? '따라하기 모드' : '자유창작 모드',
    selectedModeDescription:
      state.selectedMode === 'practice'
        ? '민요를 고르고 가이드에 맞춰 연주해요.'
        : '악기와 로컬 장단 반주를 쌓아 나만의 가락을 만들어요.',
    quickAccessLabels: {
      library: '마이',
      home: '홈',
      share: '쉐어',
    },
  };
}

function createHomeModeOptions(state: GarakProductState): HomeScreenModeOption[] {
  return [
    createHomeModeOption(state, 'freeCreation', state.language === 'en' ? 'Free creation' : '자유창작 모드'),
    createHomeModeOption(state, 'practice', state.language === 'en' ? 'Practice' : '따라하기 모드'),
  ];
}

function createHomeModeOption(
  state: GarakProductState,
  mode: ScreenFlowMode,
  label: string,
): HomeScreenModeOption {
  return {
    id: mode,
    label,
    isSelected: state.selectedMode === mode,
    selectAction: { type: 'selectMode', mode },
  };
}

import type { GarakProductState } from './garakProductState';

export type FreeCreationMixEditorModel = {
  playerTitle: string;
  playerAccessibilityLabel: string;
};

export function getFreeCreationMixEditorModel(
  state: GarakProductState,
): FreeCreationMixEditorModel {
  const work = state.library.works.find((item) => item.id === state.currentWorkId);
  const playerTitle = work?.title ?? '현재 작업';

  return {
    playerTitle,
    playerAccessibilityLabel: `${playerTitle} 재생 미리보기`,
  };
}

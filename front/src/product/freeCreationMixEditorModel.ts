import type { GarakProductAction, GarakProductState } from './garakProductState';

export type FreeCreationMixEditorModel = {
  playerTitle: string;
  playerAccessibilityLabel: string;
  saveAction?: GarakProductAction;
  saveStatusLabel: string;
};

export function getFreeCreationMixEditorModel(
  state: GarakProductState,
): FreeCreationMixEditorModel {
  const work = state.library.works.find((item) => item.id === state.currentWorkId);
  const playerTitle = work?.title ?? '현재 작업';

  return {
    playerTitle,
    playerAccessibilityLabel: `${playerTitle} 재생 미리보기`,
    saveAction: work === undefined ? undefined : { type: 'saveCurrentWork' },
    saveStatusLabel: state.workSaveStatus === 'saved' ? '저장됨' : '작업 저장',
  };
}

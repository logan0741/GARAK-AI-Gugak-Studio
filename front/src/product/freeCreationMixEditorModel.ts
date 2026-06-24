import type { GarakProductAction, GarakProductState } from './garakProductState';

export type FreeCreationMixEditorModel = {
  playerTitle: string;
  playerAccessibilityLabel: string;
  playheadBeat: number;
  playheadBeatLabel: string;
  decreasePlayheadAction: GarakProductAction;
  increasePlayheadAction: GarakProductAction;
  saveAction?: GarakProductAction;
  saveStatusLabel: string;
};

export function getFreeCreationMixEditorModel(
  state: GarakProductState,
): FreeCreationMixEditorModel {
  const work = state.library.works.find((item) => item.id === state.currentWorkId);
  const playerTitle = work?.title ?? '현재 작업';
  const playheadBeat = normalizePlayheadBeat(state.workPlayheadBeat);

  return {
    playerTitle,
    playerAccessibilityLabel: `${playerTitle} 재생 미리보기`,
    playheadBeat,
    playheadBeatLabel: `${playheadBeat}박`,
    decreasePlayheadAction: {
      type: 'setWorkPlayheadBeat',
      beat: Math.max(1, playheadBeat - 1),
    },
    increasePlayheadAction: {
      type: 'setWorkPlayheadBeat',
      beat: playheadBeat + 1,
    },
    saveAction: work === undefined ? undefined : { type: 'saveCurrentWork' },
    saveStatusLabel: state.workSaveStatus === 'saved' ? '저장됨' : '작업 저장',
  };
}

function normalizePlayheadBeat(beat: number): number {
  return typeof beat === 'number' && Number.isFinite(beat) && beat > 0 ? Math.round(beat) : 1;
}

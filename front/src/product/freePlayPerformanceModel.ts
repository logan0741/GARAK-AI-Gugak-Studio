import type { GarakProductState } from './garakProductState';

export type FreePlayPerformanceCaptureModel = {
  captureEnabled: boolean;
  isRecording: boolean;
};

export function getFreePlayPerformanceCaptureModel(
  state: GarakProductState,
): FreePlayPerformanceCaptureModel {
  return {
    captureEnabled: true,
    isRecording: state.pendingFreePlayTake !== undefined,
  };
}

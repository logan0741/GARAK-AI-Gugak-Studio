import { expect, test } from 'vitest';
import {
  applyProductAction,
  createInitialGarakProductState,
} from '../garakProductState';
import { getFreePlayPerformanceCaptureModel } from '../freePlayPerformanceModel';

test('keeps S05 performance input enabled before recording starts', () => {
  let state = createInitialGarakProductState();

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });

  expect(getFreePlayPerformanceCaptureModel(state)).toEqual({
    captureEnabled: true,
    isRecording: false,
  });
});

test('marks S05 performance input as recording only after a pending take exists', () => {
  let state = createInitialGarakProductState();

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });

  expect(getFreePlayPerformanceCaptureModel(state)).toEqual({
    captureEnabled: true,
    isRecording: true,
  });
});

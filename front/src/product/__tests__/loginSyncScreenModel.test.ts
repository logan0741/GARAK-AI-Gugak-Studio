import { expect, test } from 'vitest';

import { applyProductAction, createInitialGarakProductState } from '../garakProductState';
import { getLoginSyncViewModel } from '../loginSyncScreenModel';

function completeRecordedFreePlay(state: ReturnType<typeof createInitialGarakProductState>) {
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  const captureAttemptId = requireRecordingCaptureAttemptId(state);
  state = applyProductAction(state, {
    type: 'appendFreePlayPerformanceEvents',
    events: [{ type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 }],
  });

  state = applyProductAction(state, { type: 'completePerformance' });

  return applyProductAction(state, {
    type: 'attachRecordingCaptureToTake',
    workId: 'work-1',
    trackId: 'track-1',
    takeId: 'take-1',
    recordingUri: 'file://garak/takes/take-1.m4a',
    durationSeconds: 8,
    captureAttemptId,
  });
}

function completeCurrentWorkExport(state: ReturnType<typeof createInitialGarakProductState>) {
  const workId = state.currentWorkId;
  if (workId === undefined) {
    throw new Error('Expected a current work before completing export.');
  }

  state = applyProductAction(state, { type: 'exportCurrentWork' });

  return applyProductAction(state, {
    type: 'completeWorkAudioExport',
    workId,
    audioUri: 'garak://library-demo/export-fallback',
    durationSeconds: 24,
    renderKind: 'event_replay',
    sourceTakeId: 'take-1',
    sourceEventCount: 1,
    completionTarget: 'player',
  });
}

function requireRecordingCaptureAttemptId(
  state: ReturnType<typeof createInitialGarakProductState>,
): string {
  if ('captureAttemptId' in state.recordingCaptureStatus) {
    return state.recordingCaptureStatus.captureAttemptId;
  }

  throw new Error('Expected an active recording capture attempt.');
}

test('previews S23 account sync without dropping local library items', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = completeCurrentWorkExport(state);

  const model = getLoginSyncViewModel(state);

  expect(model.localSummary).toBe('로컬 작업 1개 · 내보낸 음원/결과 1개');
  expect(model.accountSummary).toBe('계정 보관함 0개');
  expect(model.conflictLabel).toBe('충돌 항목 0개');
  expect(model.syncPreviewLabel).toBe('동기화 후 1개 작업 · 로컬 항목 보존');
  expect(model.emptyAccountMessage).toBe('계정에 저장된 곡이 없어요.');
  expect(model.actions).toEqual({
    completeLoginSync: { type: 'completeLoginSync' },
    skipLoginSync: { type: 'skipLoginSync' },
  });
});

test('localizes S23 account sync copy for English users', () => {
  const state = {
    ...createInitialGarakProductState(),
    language: 'en' as const,
  };

  expect(getLoginSyncViewModel(state)).toMatchObject({
    statusLabel: 'Before login · Keep local library',
    localSummary: 'Local works: 0 · Exported audio/results: 0',
    accountSummary: 'Account library: 0',
    conflictLabel: 'Conflicts: 0',
    syncPreviewLabel: 'Sync result: 0 works · Local items preserved',
    emptyAccountMessage: 'No songs saved in your account.',
  });
});

test('returns to the S23 entry surface when skipping login sync', () => {
  let settingsState = createInitialGarakProductState();
  settingsState = applyProductAction(settingsState, { type: 'navigate', target: 'S22' });
  settingsState = applyProductAction(settingsState, { type: 'loginAndLoadMySongs' });
  settingsState = applyProductAction(settingsState, getLoginSyncViewModel(settingsState).actions.skipLoginSync);

  expect(settingsState.screenFlow.currentScreen).toBe('S22');

  let libraryState = createInitialGarakProductState();
  libraryState = applyProductAction(libraryState, { type: 'navigate', target: 'S18' });
  libraryState = applyProductAction(libraryState, { type: 'loginAndLoadMySongs' });
  libraryState = applyProductAction(libraryState, getLoginSyncViewModel(libraryState).actions.skipLoginSync);

  expect(libraryState.screenFlow.currentScreen).toBe('S18');
});

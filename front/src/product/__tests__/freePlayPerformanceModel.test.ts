import { expect, test } from 'vitest';
import {
  applyProductAction,
  createInitialGarakProductState,
} from '../garakProductState';
import {
  canPlayLivePerformanceEvents,
  getFreePlayLiveAudioStatusModel,
  getFreePlayPerformanceCaptureModel,
} from '../freePlayPerformanceModel';

test('keeps S05 live playback disabled until the selected instrument is ready', () => {
  let state = createInitialGarakProductState({ sampleFallbackInstruments: ['janggu'] });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });

  expect(canPlayLivePerformanceEvents(state)).toBe(false);

  const failedAttempt = state.livePerformanceAudioStatus.status === 'preparing'
    ? state.livePerformanceAudioStatus.preparationAttemptId
    : '';
  state = applyProductAction(state, {
    type: 'failLivePerformanceAudioPreparation',
    instrument: 'janggu',
    preparationAttemptId: failedAttempt,
    message: 'native sampler failed',
  });

  expect(canPlayLivePerformanceEvents(state)).toBe(false);
});

test('enables S05 live playback only for the ready current instrument', () => {
  let state = createInitialGarakProductState({ sampleFallbackInstruments: ['janggu'] });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  const readyAttempt = state.livePerformanceAudioStatus.status === 'preparing'
    ? state.livePerformanceAudioStatus.preparationAttemptId
    : '';
  state = applyProductAction(state, {
    type: 'completeLivePerformanceAudioPreparation',
    instrument: 'janggu',
    preparationAttemptId: readyAttempt,
    sampleSourceLabel: 'bundled janggu sampler',
    releaseReady: true,
  });

  expect(canPlayLivePerformanceEvents(state)).toBe(true);
  expect(canPlayLivePerformanceEvents(state, 'daegeum')).toBe(false);
  expect(getFreePlayLiveAudioStatusModel(state.livePerformanceAudioStatus)).toEqual({
    tone: 'ready',
    label: '소리 준비 완료',
    qaReadinessLabel: 'Garak live audio ready',
    visible: false,
  });
});

test('enables S09 live playback only for the ready chosen extra instrument', () => {
  let state = createInitialGarakProductState();

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'completePerformance' });
  state = applyProductAction(state, { type: 'addTrack' });
  state = applyProductAction(state, { type: 'chooseInstrumentTrack', instrument: 'daegeum' });

  expect(canPlayLivePerformanceEvents(state)).toBe(false);

  const readyAttempt = state.livePerformanceAudioStatus.status === 'preparing'
    ? state.livePerformanceAudioStatus.preparationAttemptId
    : '';
  state = applyProductAction(state, {
    type: 'completeLivePerformanceAudioPreparation',
    instrument: 'daegeum',
    preparationAttemptId: readyAttempt,
    sampleSourceLabel: 'bundled daegeum sampler',
    releaseReady: true,
  });

  expect(canPlayLivePerformanceEvents(state)).toBe(true);
  expect(canPlayLivePerformanceEvents(state, 'gayageum')).toBe(false);
});

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
    liveAudioPlaybackEvidenceLabel: undefined,
    recordingCaptureNotice: undefined,
    recordingProgressLabel: undefined,
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
    liveAudioPlaybackEvidenceLabel: undefined,
    recordingCaptureNotice: '오디오 캡처 준비 중',
    recordingProgressLabel: '녹음 중 · 이벤트 0개 · 84 BPM',
  });
});

test('exposes successful S05 live audio playback evidence after a ready tap batch', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-07-05T12:00:00.000Z',
    sampleFallbackInstruments: ['janggu'],
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  const readyAttempt = state.livePerformanceAudioStatus.status === 'preparing'
    ? state.livePerformanceAudioStatus.preparationAttemptId
    : '';
  state = applyProductAction(state, {
    type: 'completeLivePerformanceAudioPreparation',
    instrument: 'janggu',
    preparationAttemptId: readyAttempt,
    sampleSourceLabel: 'bundled janggu sampler',
    releaseReady: true,
  });
  state = applyProductAction(state, {
    type: 'completeLivePerformanceEventPlayback',
    instrument: 'janggu',
    eventCount: 3,
  });

  expect(state.livePerformanceAudioStatus).toMatchObject({
    status: 'ready',
    instrument: 'janggu',
    lastPlaybackEventCount: 3,
    lastPlaybackAt: '2026-07-05T12:00:00.000Z',
  });
  expect(getFreePlayPerformanceCaptureModel(state).liveAudioPlaybackEvidenceLabel).toBe(
    'Live audio sent: 3 events',
  );
  expect(getFreePlayLiveAudioStatusModel(state.livePerformanceAudioStatus)).toEqual({
    tone: 'ready',
    label: 'Live audio sent: 3 events',
  });
});

test('summarizes S05 live audio preparing and failed states for the readiness badge', () => {
  let state = createInitialGarakProductState({ sampleFallbackInstruments: ['janggu'] });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });

  expect(getFreePlayLiveAudioStatusModel(state.livePerformanceAudioStatus)).toEqual({
    tone: 'preparing',
    label: '소리 준비 중',
  });

  const failedAttempt = state.livePerformanceAudioStatus.status === 'preparing'
    ? state.livePerformanceAudioStatus.preparationAttemptId
    : '';
  state = applyProductAction(state, {
    type: 'failLivePerformanceAudioPreparation',
    instrument: 'janggu',
    preparationAttemptId: failedAttempt,
    message: 'native sampler failed',
  });

  expect(getFreePlayLiveAudioStatusModel(state.livePerformanceAudioStatus)).toEqual({
    tone: 'failed',
    label: '소리를 재생할 수 없음',
    detailLabel: 'native sampler failed',
    retryAction: { type: 'retryLivePerformanceAudioPreparation' },
  });
});

test('accumulates S05 live audio playback evidence across tap batches', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-07-05T12:00:00.000Z',
    sampleFallbackInstruments: ['janggu'],
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  const readyAttempt = state.livePerformanceAudioStatus.status === 'preparing'
    ? state.livePerformanceAudioStatus.preparationAttemptId
    : '';
  state = applyProductAction(state, {
    type: 'completeLivePerformanceAudioPreparation',
    instrument: 'janggu',
    preparationAttemptId: readyAttempt,
    sampleSourceLabel: 'bundled janggu sampler',
    releaseReady: true,
  });
  state = applyProductAction(state, {
    type: 'completeLivePerformanceEventPlayback',
    instrument: 'janggu',
    eventCount: 2,
  });
  state = applyProductAction(state, {
    type: 'completeLivePerformanceEventPlayback',
    instrument: 'janggu',
    eventCount: 3,
  });

  expect(state.livePerformanceAudioStatus).toMatchObject({
    status: 'ready',
    instrument: 'janggu',
    lastPlaybackEventCount: 3,
    totalPlaybackEventCount: 5,
  });
  expect(getFreePlayPerformanceCaptureModel(state).liveAudioPlaybackEvidenceLabel).toBe(
    'Live audio sent: 5 events',
  );
});

test('summarizes the active S05 recording take progress', () => {
  let state = createInitialGarakProductState();

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, {
    type: 'startPerformanceRecording',
    recordingSetup: {
      presetId: 'jungmori',
      bpm: 72,
      beatUnit: '12/8',
    },
  });
  state = applyProductAction(state, {
    type: 'appendFreePlayPerformanceEvents',
    events: [
      { type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 },
      { type: 'string_release', tsMs: 1450, stringIndex: 3 },
    ],
  });

  expect(getFreePlayPerformanceCaptureModel(state).recordingProgressLabel).toBe(
    '녹음 중 · 이벤트 2개 · 약 2초 · 72 BPM',
  );
});

test('shows an event-only S05 recording notice when audio capture fails', () => {
  let state = createInitialGarakProductState();

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  const captureAttemptId = state.recordingCaptureStatus.status === 'starting'
    ? state.recordingCaptureStatus.captureAttemptId
    : '';
  state = applyProductAction(state, {
    type: 'failRecordingCaptureStart',
    instrument: 'janggu',
    captureAttemptId,
    message: '마이크 권한이 거부되었습니다.',
  });

  expect(getFreePlayPerformanceCaptureModel(state).recordingCaptureNotice).toBe(
    '이벤트 녹음만 저장됨: 마이크 권한이 거부되었습니다.',
  );
  expect(getFreePlayPerformanceCaptureModel(state).recordingProgressLabel).toBe(
    '녹음 중 · 이벤트 0개 · 84 BPM',
  );
});

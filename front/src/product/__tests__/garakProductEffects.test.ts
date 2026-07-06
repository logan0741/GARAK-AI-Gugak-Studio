import { describe, expect, test } from 'vitest';
import type { PerformanceEvent } from '../../domain/performanceEvent';
import { createInitialScreenFlowState } from '../../screen-flow/screenFlowMachine';
import type { Work } from '../../studio/studioTypes';
import type {
  GarakProductState,
  ProductLibraryState,
  ProductPlayerSelection,
} from '../garakProductState';
import {
  applyProductAction,
  createInitialGarakProductState,
} from '../garakProductState';
import {
  createInMemoryGarakProductServices,
  createNoopGarakProductServices,
} from '../garakProductServices';
import { runGarakProductEffect } from '../garakProductEffects';

function requireRecordingCaptureAttemptId(state: GarakProductState): string {
  if ('captureAttemptId' in state.recordingCaptureStatus) {
    return state.recordingCaptureStatus.captureAttemptId;
  }

  throw new Error('Expected an active recording capture attempt.');
}

describe('Garak product effect runner', () => {
  test('exports the current work through the audio export service before persisting it', async () => {
    const services = createInMemoryGarakProductServices();
    const initialState = createInitialGarakProductState({
      now: () => '2026-06-25T00:00:00.000Z',
    });
    const workState = {
      ...initialState,
      screenFlow: createInitialScreenFlowState({ currentScreen: 'S07' }),
      currentWorkId: 'work-1',
      library: {
        ...initialState.library,
        works: [createAudibleWork('work-1')],
      },
    };
    const action = { type: 'exportCurrentWork' } as const;
    const nextState = applyProductAction(workState, action);
    const servicesWithAudio = {
      ...services,
      audio: {
        ...services.audio,
        exportWorkAudio: async (work: Work) => {
          expect(work.id).toBe('work-1');
          return {
            status: 'ok' as const,
            value: {
              audioUri: 'garak://library-demo/export-fallback',
              durationSeconds: 24,
              renderKind: 'event_replay' as const,
              sourceTakeId: 'take-1',
              sourceEventCount: 1,
            },
          };
        },
      },
    };

    const followUpActions = await runGarakProductEffect({
      state: nextState,
      action,
      services: servicesWithAudio,
    });

    await expect(services.library.loadSnapshot()).resolves.toEqual(nextState.library);
    expect(nextState.library.exportedAudios).toEqual([]);
    expect(followUpActions).toEqual([
      {
        type: 'completeWorkAudioExport',
        workId: 'work-1',
        audioUri: 'garak://library-demo/export-fallback',
        durationSeconds: 24,
        renderKind: 'event_replay',
        sourceTakeId: 'take-1',
        sourceEventCount: 1,
        sourceRecordingUri: undefined,
        completionTarget: 'player',
      },
    ]);
  });

  test('returns a library replacement action when account sync loads a remote snapshot', async () => {
    const remoteLibrary: ProductLibraryState = {
      works: [createWork('remote-work')],
      exportedAudios: [],
      practiceResults: [],
    };
    const services = createInMemoryGarakProductServices(remoteLibrary);

    await expect(
      runGarakProductEffect({
        state: createInitialGarakProductState(),
        action: { type: 'completeLoginSync' },
        services,
      }),
    ).resolves.toEqual([{ type: 'replaceLibrarySnapshot', library: remoteLibrary }]);
  });

  test('saves the current work before exporting audio for Save & Share', async () => {
    const services = createInMemoryGarakProductServices();
    const workState = {
      ...createInitialGarakProductState({
        now: () => '2026-06-26T00:00:00.000Z',
      }),
      screenFlow: createInitialScreenFlowState({ currentScreen: 'S07' }),
      currentWorkId: 'work-1',
      library: {
        works: [createCapturedWork('work-1')],
        exportedAudios: [],
        practiceResults: [],
      },
    };
    const action = { type: 'saveAndShareCurrentWork' } as const;
    const nextState = applyProductAction(workState, action);
    const servicesWithAudio = {
      ...services,
      audio: {
        ...services.audio,
        exportWorkAudio: async (work: Work) => {
          expect(work.id).toBe('work-1');
          return {
            status: 'ok' as const,
            value: {
              audioUri: 'file://garak/export-1.wav',
              durationSeconds: 31,
              renderKind: 'audio_capture' as const,
              sourceTakeId: 'take-1',
              sourceRecordingUri: 'file://garak/takes/take-1.m4a',
            },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services: servicesWithAudio,
      }),
    ).resolves.toEqual([
      { type: 'completeCurrentWorkSave' },
      {
        type: 'completeWorkAudioExport',
        workId: 'work-1',
        audioUri: 'file://garak/export-1.wav',
        durationSeconds: 31,
        renderKind: 'audio_capture',
        sourceTakeId: 'take-1',
        sourceRecordingUri: 'file://garak/takes/take-1.m4a',
        completionTarget: 'share',
      },
    ]);
    await expect(services.library.loadSnapshot()).resolves.toEqual(nextState.library);
  });

  test.each([
    {
      value: {
        audioUri: 'file://garak/export-1.wav',
        durationSeconds: 31,
        renderKind: 'audio_capture' as const,
        sourceTakeId: 'take-missing',
        sourceRecordingUri: 'file://garak/takes/take-1.m4a',
      },
      message: 'Audio capture export source take is not available in the work.',
    },
    {
      value: {
        audioUri: 'file://garak/export-1.wav',
        durationSeconds: 31,
        renderKind: 'audio_capture' as const,
        sourceTakeId: 'take-1',
        sourceRecordingUri: 'file://garak/takes/wrong-take.m4a',
      },
      message: 'Audio capture export source recording URI does not match the source take.',
    },
  ])('rejects mismatched Save & Share capture provenance: $message', async ({ value, message }) => {
    const services = createInMemoryGarakProductServices();
    const workState = {
      ...createInitialGarakProductState({
        now: () => '2026-06-26T00:00:00.000Z',
      }),
      screenFlow: createInitialScreenFlowState({ currentScreen: 'S07' }),
      currentWorkId: 'work-1',
      library: {
        works: [createCapturedWork('work-1')],
        exportedAudios: [],
        practiceResults: [],
      },
    };
    const action = { type: 'saveAndShareCurrentWork' } as const;
    const nextState = applyProductAction(workState, action);
    const servicesWithAudio = {
      ...services,
      audio: {
        ...services.audio,
        exportWorkAudio: async () => ({
          status: 'ok' as const,
          value,
        }),
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services: servicesWithAudio,
      }),
    ).resolves.toEqual([
      { type: 'completeCurrentWorkSave' },
      {
        type: 'failWorkAudioExport',
        workId: 'work-1',
        message,
      },
    ]);
  });

  test('rejects Save & Share event replay provenance when the source take is muted out of the exported mix', async () => {
    const services = createInMemoryGarakProductServices();
    const workState = {
      ...createInitialGarakProductState({
        now: () => '2026-06-26T00:00:00.000Z',
      }),
      screenFlow: createInitialScreenFlowState({ currentScreen: 'S07' }),
      currentWorkId: 'work-muted-event-replay',
      library: {
        works: [createMutedReplaySourceWork('work-muted-event-replay')],
        exportedAudios: [],
        practiceResults: [],
      },
    };
    const action = { type: 'saveAndShareCurrentWork' } as const;
    const nextState = applyProductAction(workState, action);
    const servicesWithAudio = {
      ...services,
      audio: {
        ...services.audio,
        exportWorkAudio: async () => ({
          status: 'ok' as const,
          value: {
            audioUri: 'garak://library-demo/export-fallback',
            durationSeconds: 31,
            renderKind: 'event_replay' as const,
            sourceTakeId: 'take-muted',
            sourceEventCount: 1,
          },
        }),
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services: servicesWithAudio,
      }),
    ).resolves.toEqual([
      { type: 'completeCurrentWorkSave' },
      {
        type: 'failWorkAudioExport',
        workId: 'work-muted-event-replay',
        message: 'Event replay export source take is not audible in the exported work.',
      },
    ]);
  });

  test.each([
    {
      value: {
        audioUri: ' ',
        durationSeconds: 31,
        renderKind: 'audio_capture' as const,
      },
      message: 'Audio export returned an empty audio URI.',
    },
    {
      value: {
        audioUri: 'file://garak/export-1.wav',
        durationSeconds: 0,
        renderKind: 'audio_capture' as const,
      },
      message: 'Audio export returned a non-positive duration.',
    },
    {
      value: {
        audioUri: 'file://garak/export-1.wav',
        durationSeconds: 31,
      },
      message: 'Audio export returned no render provenance.',
    },
    {
      value: {
        audioUri: 'file://garak/export-1.wav',
        durationSeconds: 31,
        renderKind: 'audio_capture' as const,
        sourceTakeId: ' ',
        sourceRecordingUri: 'file://garak/takes/take-1.m4a',
      },
      message: 'Audio capture export returned no source take ID.',
    },
    {
      value: {
        audioUri: 'file://garak/export-1.wav',
        durationSeconds: 31,
        renderKind: 'audio_capture' as const,
        sourceTakeId: 'take-1',
        sourceRecordingUri: ' ',
      },
      message: 'Audio capture export returned no source recording URI.',
    },
    {
      value: {
        audioUri: 'garak://library-demo/export-fallback',
        durationSeconds: 31,
        renderKind: 'audio_capture' as const,
        sourceTakeId: 'take-1',
        sourceRecordingUri: 'file://garak/takes/take-1.m4a',
      },
      message: 'Audio capture export returned no capture audio URI.',
    },
    {
      value: {
        audioUri: 'file://garak/export-1.wav',
        durationSeconds: 31,
        renderKind: 'audio_capture' as const,
        sourceTakeId: 'take-1',
        sourceRecordingUri: 'garak://library-demo/export-fallback',
      },
      message: 'Audio capture export returned a non-file source recording URI.',
    },
    {
      value: {
        audioUri: 'garak://library-demo/export-fallback',
        durationSeconds: 31,
        renderKind: 'event_replay' as const,
        sourceTakeId: ' ',
      },
      message: 'Event replay export returned no source take ID.',
    },
    {
      value: {
        audioUri: 'garak://library-demo/export-fallback',
        durationSeconds: 31,
        renderKind: 'event_replay' as const,
        sourceTakeId: 'take-1',
      },
      message: 'Event replay export returned no source event count.',
    },
  ])('rejects invalid Save & Share export service results: $message', async ({ value, message }) => {
    const services = createInMemoryGarakProductServices();
    const workState = {
      ...createInitialGarakProductState({
        now: () => '2026-06-26T00:00:00.000Z',
      }),
      screenFlow: createInitialScreenFlowState({ currentScreen: 'S07' }),
      currentWorkId: 'work-1',
      library: {
        works: [createAudibleWork('work-1')],
        exportedAudios: [],
        practiceResults: [],
      },
    };
    const action = { type: 'saveAndShareCurrentWork' } as const;
    const nextState = applyProductAction(workState, action);
    const servicesWithAudio = {
      ...services,
      audio: {
        ...services.audio,
        exportWorkAudio: async () => ({
          status: 'ok' as const,
          value: value as never,
        }),
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services: servicesWithAudio,
      }),
    ).resolves.toEqual([
      { type: 'completeCurrentWorkSave' },
      {
        type: 'failWorkAudioExport',
        workId: 'work-1',
        message,
      },
    ]);
  });

  test('starts S05 recording capture through the audio service boundary', async () => {
    const recordingSetup = { presetId: 'semachi', bpm: 84, beatUnit: '4/4' } as const;
    let state = createInitialGarakProductState({
      now: () => '2026-07-04T10:00:00.000Z',
    });
    state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'startWithDefaults' });

    const action = { type: 'startPerformanceRecording', recordingSetup } as const;
    const nextState = applyProductAction(state, action);
    const noopServices = createNoopGarakProductServices();
    const captureInputs: Array<Parameters<typeof noopServices.audio.startRecordingCapture>[0]> = [];
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        startRecordingCapture: async (
          input: Parameters<typeof noopServices.audio.startRecordingCapture>[0],
        ) => {
          captureInputs.push(input);
          return {
            status: 'ok' as const,
            value: { started: true as const },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'completeRecordingCaptureStart',
        instrument: 'janggu',
        captureAttemptId: expect.any(String),
      },
    ]);
    expect(captureInputs).toEqual([
      {
        instrument: 'janggu',
        recordingSetup,
      },
    ]);
  });

  test('stops S05 recording capture after saving the event take', async () => {
    const capturedEvents: PerformanceEvent[] = [
      { type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 },
    ];
    let state = createInitialGarakProductState({
      now: () => '2026-07-04T10:00:00.000Z',
    });
    state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'startWithDefaults' });
    state = applyProductAction(state, { type: 'startPerformanceRecording' });
    state = applyProductAction(state, {
      type: 'completeRecordingCaptureStart',
      instrument: 'janggu',
      captureAttemptId: requireRecordingCaptureAttemptId(state),
    });
    state = applyProductAction(state, { type: 'appendFreePlayPerformanceEvents', events: capturedEvents });

    const action = { type: 'completePerformance' } as const;
    const nextState = applyProductAction(state, action);
    let stopCalls = 0;
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        stopRecordingCapture: async () => {
          stopCalls += 1;
          return {
            status: 'ok' as const,
            value: {
              recordingUri: 'file://garak/takes/take-1.m4a',
              durationSeconds: 8,
            },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'attachRecordingCaptureToTake',
        workId: 'work-1',
        trackId: 'track-1',
        takeId: 'take-1',
        recordingUri: 'file://garak/takes/take-1.m4a',
        durationSeconds: 8,
        captureAttemptId: expect.any(String),
      },
    ]);
    expect(stopCalls).toBe(1);
  });

  test('keeps the saved event take when S05 recording capture cannot be persisted', async () => {
    const capturedEvents: PerformanceEvent[] = [
      { type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 },
    ];
    let state = createInitialGarakProductState({
      now: () => '2026-07-04T10:00:00.000Z',
    });
    state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'startWithDefaults' });
    state = applyProductAction(state, { type: 'startPerformanceRecording' });
    state = applyProductAction(state, {
      type: 'completeRecordingCaptureStart',
      instrument: 'janggu',
      captureAttemptId: requireRecordingCaptureAttemptId(state),
    });
    state = applyProductAction(state, { type: 'appendFreePlayPerformanceEvents', events: capturedEvents });

    const action = { type: 'completePerformance' } as const;
    const nextState = applyProductAction(state, action);
    const savedTrack = nextState.library.works[0].tracks[0];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        stopRecordingCapture: async () => ({
          status: 'error' as const,
          message: 'Recording capture could not be saved: document directory is unavailable',
        }),
      },
    };

    expect(savedTrack.kind === 'instrument' ? savedTrack.takes[0] : undefined).toMatchObject({
      id: 'take-1',
      events: capturedEvents,
    });
    expect(savedTrack.kind === 'instrument' ? savedTrack.takes[0].recordingUri : undefined).toBeUndefined();
    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failRecordingCaptureStop',
        instrument: 'janggu',
        captureAttemptId: expect.any(String),
        message: 'Recording capture could not be saved: document directory is unavailable',
      },
    ]);
  });

  test('rejects S05 recording capture URIs when the captured duration is not positive', async () => {
    const capturedEvents: PerformanceEvent[] = [
      { type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 },
    ];
    let state = createInitialGarakProductState({
      now: () => '2026-07-04T10:00:00.000Z',
    });
    state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'startWithDefaults' });
    state = applyProductAction(state, { type: 'startPerformanceRecording' });
    state = applyProductAction(state, {
      type: 'completeRecordingCaptureStart',
      instrument: 'janggu',
      captureAttemptId: requireRecordingCaptureAttemptId(state),
    });
    state = applyProductAction(state, { type: 'appendFreePlayPerformanceEvents', events: capturedEvents });

    const action = { type: 'completePerformance' } as const;
    const nextState = applyProductAction(state, action);
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        stopRecordingCapture: async () => ({
          status: 'ok' as const,
          value: {
            recordingUri: 'file://garak/takes/empty-take.m4a',
            durationSeconds: 0,
          },
        }),
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failRecordingCaptureStop',
        instrument: 'janggu',
        captureAttemptId: expect.any(String),
        message: 'Recording capture completed without a positive duration.',
      },
    ]);
  });

  test('stops S09 recording capture after applying the extra instrument take', async () => {
    const capturedEvents: PerformanceEvent[] = [
      { type: 'string_pluck', tsMs: 220, stringIndex: 4, velocity: 0.8 },
    ];
    let state = createInitialGarakProductState({
      now: () => '2026-07-04T10:00:00.000Z',
    });
    state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'startWithDefaults' });
    state = applyProductAction(state, { type: 'startPerformanceRecording' });
    state = applyProductAction(state, { type: 'completePerformance' });
    state = applyProductAction(state, { type: 'addTrack' });
    state = applyProductAction(state, { type: 'chooseInstrumentTrack', instrument: 'daegeum' });
    state = applyProductAction(state, { type: 'startPerformanceRecording' });
    state = applyProductAction(state, {
      type: 'completeRecordingCaptureStart',
      instrument: 'daegeum',
      captureAttemptId: requireRecordingCaptureAttemptId(state),
    });
    state = applyProductAction(state, { type: 'appendFreePlayPerformanceEvents', events: capturedEvents });

    const action = { type: 'applyInstrumentTrack' } as const;
    const nextState = applyProductAction(state, action);
    let stopCalls = 0;
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        stopRecordingCapture: async () => {
          stopCalls += 1;
          return {
            status: 'ok' as const,
            value: {
              recordingUri: 'file://garak/takes/take-2.m4a',
              durationSeconds: 5,
            },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'attachRecordingCaptureToTake',
        workId: 'work-1',
        trackId: 'track-2',
        takeId: 'take-2',
        recordingUri: 'file://garak/takes/take-2.m4a',
        durationSeconds: 5,
        captureAttemptId: expect.any(String),
      },
    ]);
    expect(stopCalls).toBe(1);
  });

  test('restarts S09 recording capture after discarding the previous capture', async () => {
    const firstTakeEvents: PerformanceEvent[] = [
      { type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 0.72 },
    ];
    const secondTakeEvents: PerformanceEvent[] = [
      { type: 'string_pluck', tsMs: 220, stringIndex: 3, velocity: 0.9 },
    ];
    let state = createInitialGarakProductState({
      now: () => '2026-07-04T10:00:00.000Z',
    });
    state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'startWithDefaults' });
    state = applyProductAction(state, { type: 'startPerformanceRecording' });
    state = applyProductAction(state, { type: 'completePerformance' });
    state = applyProductAction(state, { type: 'addTrack' });
    state = applyProductAction(state, { type: 'chooseInstrumentTrack', instrument: 'daegeum' });
    state = applyProductAction(state, { type: 'startPerformanceRecording', events: firstTakeEvents });
    state = applyProductAction(state, {
      type: 'completeRecordingCaptureStart',
      instrument: 'daegeum',
      captureAttemptId: requireRecordingCaptureAttemptId(state),
    });

    const action = { type: 'restartInstrumentTrackRecording', events: secondTakeEvents } as const;
    const nextState = applyProductAction(state, action);
    const captureCalls: string[] = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        discardRecordingCapture: async () => {
          captureCalls.push('discard');
          return {
            status: 'ok' as const,
            value: { discarded: true },
          };
        },
        startRecordingCapture: async (
          input: Parameters<typeof noopServices.audio.startRecordingCapture>[0],
        ) => {
          captureCalls.push(`start:${input.instrument}:${input.recordingSetup.presetId}`);
          return {
            status: 'ok' as const,
            value: { started: true as const },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'completeRecordingCaptureStart',
        instrument: 'daegeum',
        captureAttemptId: expect.any(String),
      },
    ]);
    expect(captureCalls).toEqual(['discard', 'start:daegeum:semachi']);
  });

  test('discards S09 recording capture when canceling the extra instrument take', async () => {
    let state = createInitialGarakProductState({
      now: () => '2026-07-04T10:00:00.000Z',
    });
    state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'startWithDefaults' });
    state = applyProductAction(state, { type: 'startPerformanceRecording' });
    state = applyProductAction(state, { type: 'completePerformance' });
    state = applyProductAction(state, { type: 'addTrack' });
    state = applyProductAction(state, { type: 'chooseInstrumentTrack', instrument: 'daegeum' });
    state = applyProductAction(state, { type: 'startPerformanceRecording' });
    state = applyProductAction(state, {
      type: 'completeRecordingCaptureStart',
      instrument: 'daegeum',
      captureAttemptId: requireRecordingCaptureAttemptId(state),
    });

    const action = { type: 'cancelInstrumentTrack' } as const;
    const nextState = applyProductAction(state, action);
    let discardCalls = 0;
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        discardRecordingCapture: async () => {
          discardCalls += 1;
          return {
            status: 'ok' as const,
            value: { discarded: true },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'completeRecordingCaptureDiscard',
        captureAttemptId: expect.any(String),
      },
    ]);
    expect(discardCalls).toBe(1);
  });

  test('surfaces S09 recording capture discard failures when cancel cleanup fails', async () => {
    let state = createInitialGarakProductState({
      now: () => '2026-07-04T10:00:00.000Z',
    });
    state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
    state = applyProductAction(state, { type: 'next' });
    state = applyProductAction(state, { type: 'startWithDefaults' });
    state = applyProductAction(state, { type: 'startPerformanceRecording' });
    state = applyProductAction(state, { type: 'completePerformance' });
    state = applyProductAction(state, { type: 'addTrack' });
    state = applyProductAction(state, { type: 'chooseInstrumentTrack', instrument: 'daegeum' });
    state = applyProductAction(state, { type: 'startPerformanceRecording' });
    state = applyProductAction(state, {
      type: 'completeRecordingCaptureStart',
      instrument: 'daegeum',
      captureAttemptId: requireRecordingCaptureAttemptId(state),
    });

    const action = { type: 'cancelInstrumentTrack' } as const;
    const nextState = applyProductAction(state, action);
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        discardRecordingCapture: async () => ({
          status: 'error' as const,
          message: 'recorder cleanup failed',
        }),
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failRecordingCaptureStop',
        instrument: 'daegeum',
        captureAttemptId: expect.any(String),
        message: 'recorder cleanup failed',
      },
    ]);
  });

  test('does not run recording capture discard cleanup when cancel leaves no discard in progress', async () => {
    const state = createInitialGarakProductState();
    const action = { type: 'cancelInstrumentTrack' } as const;
    let discardCalls = 0;
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        discardRecordingCapture: async () => {
          discardCalls += 1;
          return {
            status: 'ok' as const,
            value: { discarded: true },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action,
        services,
      }),
    ).resolves.toEqual([]);
    expect(discardCalls).toBe(0);
  });

  test('publishes the selected share target through the share service boundary', async () => {
    const noopServices = createNoopGarakProductServices();
    const state: GarakProductState = {
      ...createInitialGarakProductState({
        now: () => '2026-06-26T00:00:00.000Z',
      }),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
      sharePublishStatus: {
        status: 'publishing',
        target: { kind: 'exportedAudio', id: 'export-1' },
      },
      library: {
        works: [],
        exportedAudios: [
          {
            id: 'export-1',
            kind: 'exported_audio',
            title: 'My Export',
            durationSeconds: 31,
            instrumentNames: ['Janggu'],
            createdAt: '2026-06-26T00:00:00.000Z',
            audioUri: 'file://garak/export-1.wav',
            shareState: 'ready',
          },
        ],
        practiceResults: [],
      },
    };
    const services = {
      ...noopServices,
      share: {
        publishShareTarget: async (input: Parameters<typeof noopServices.share.publishShareTarget>[0]) => {
          expect(input).toMatchObject({
            target: { kind: 'exportedAudio', id: 'export-1' },
            title: 'My Export',
            fileUri: 'file://garak/export-1.wav',
          });
          return {
            status: 'ok' as const,
            value: {
              remoteId: 'remote-export-1',
              shareUrl: 'https://garak.test/share/remote-export-1',
              expiresAtMs: 1783036800000,
              shareMethod: 'link' as const,
            },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'publishShareTarget' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'completeSharePublish',
        target: { kind: 'exportedAudio', id: 'export-1' },
        remoteId: 'remote-export-1',
        shareUrl: 'https://garak.test/share/remote-export-1',
        expiresAtMs: 1783036800000,
        shareMethod: 'link',
      },
    ]);
  });

  test('rejects placeholder exported-audio sharing without calling the share service', async () => {
    const noopServices = createNoopGarakProductServices();
    const state: GarakProductState = {
      ...createInitialGarakProductState({
        now: () => '2026-06-26T00:00:00.000Z',
      }),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-placeholder' },
      sharePublishStatus: {
        status: 'publishing',
        target: { kind: 'exportedAudio', id: 'export-placeholder' },
      },
      library: {
        works: [],
        exportedAudios: [
          {
            id: 'export-placeholder',
            kind: 'exported_audio',
            title: 'Legacy Placeholder Export',
            durationSeconds: 31,
            instrumentNames: ['Janggu'],
            createdAt: '2026-06-26T00:00:00.000Z',
            audioUri: 'placeholder://export-1.wav',
            renderKind: 'audio_capture',
            sourceTakeId: 'take-1',
            sourceRecordingUri: 'file://garak/takes/take-1.m4a',
            shareState: 'ready',
          },
        ],
        practiceResults: [],
      },
    };
    let publishCalls = 0;
    const services = {
      ...noopServices,
      share: {
        publishShareTarget: async () => {
          publishCalls += 1;
          return { status: 'unavailable' as const };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'publishShareTarget' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failSharePublish',
        target: { kind: 'exportedAudio', id: 'export-placeholder' },
        message: 'Share target is not available.',
      },
    ]);
    expect(publishCalls).toBe(0);
  });

  test('rejects stale audio-capture exports without file-backed capture provenance before sharing', async () => {
    const noopServices = createNoopGarakProductServices();
    const state: GarakProductState = {
      ...createInitialGarakProductState({
        now: () => '2026-06-26T00:00:00.000Z',
      }),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-stale-capture' },
      sharePublishStatus: {
        status: 'publishing',
        target: { kind: 'exportedAudio', id: 'export-stale-capture' },
      },
      library: {
        works: [],
        exportedAudios: [
          {
            id: 'export-stale-capture',
            kind: 'exported_audio',
            title: 'Stale Capture Export',
            durationSeconds: 31,
            instrumentNames: ['Janggu'],
            createdAt: '2026-06-26T00:00:00.000Z',
            audioUri: 'garak://library-demo/export-fallback',
            renderKind: 'audio_capture',
            sourceTakeId: 'take-1',
            sourceRecordingUri: 'garak://library-demo/export-fallback',
            shareState: 'ready',
          },
        ],
        practiceResults: [],
      },
    };
    let publishCalls = 0;
    const services = {
      ...noopServices,
      share: {
        publishShareTarget: async () => {
          publishCalls += 1;
          return { status: 'unavailable' as const };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'publishShareTarget' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failSharePublish',
        target: { kind: 'exportedAudio', id: 'export-stale-capture' },
        message: 'Share target is not available.',
      },
    ]);
    expect(publishCalls).toBe(0);
  });

  test('publishes event-replay exports without sending the fallback audio URI as a file', async () => {
    const noopServices = createNoopGarakProductServices();
    const publishInputs: Array<Parameters<typeof noopServices.share.publishShareTarget>[0]> = [];
    const state: GarakProductState = {
      ...createInitialGarakProductState({
        now: () => '2026-06-26T00:00:00.000Z',
      }),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-event-replay' },
      sharePublishStatus: {
        status: 'publishing',
        target: { kind: 'exportedAudio', id: 'export-event-replay' },
      },
      library: {
        works: [createAudibleWork('work-1')],
        exportedAudios: [
          {
            id: 'export-event-replay',
            kind: 'exported_audio',
            workId: 'work-1',
            title: 'Event Replay Export',
            durationSeconds: 12,
            instrumentNames: ['Gayageum'],
            createdAt: '2026-06-26T00:00:00.000Z',
            audioUri: 'garak://library-demo/export-fallback',
            renderKind: 'event_replay',
            sourceTakeId: 'take-1',
            sourceEventCount: 1,
            shareState: 'ready',
          },
        ],
        practiceResults: [],
      },
    };
    const services = {
      ...noopServices,
      share: {
        publishShareTarget: async (input: Parameters<typeof noopServices.share.publishShareTarget>[0]) => {
          publishInputs.push(input);
          return {
            status: 'ok' as const,
            value: {
              remoteId: 'remote-event-replay',
              shareUrl: 'https://garak.test/share/remote-event-replay',
              expiresAtMs: 1783036800000,
              shareMethod: 'link' as const,
            },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'publishShareTarget' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'completeSharePublish',
        target: { kind: 'exportedAudio', id: 'export-event-replay' },
        remoteId: 'remote-event-replay',
        shareUrl: 'https://garak.test/share/remote-event-replay',
        expiresAtMs: 1783036800000,
        shareMethod: 'link',
      },
    ]);
    expect(publishInputs).toEqual([
      {
        target: { kind: 'exportedAudio', id: 'export-event-replay' },
        title: 'Event Replay Export',
        message: 'Event Replay Export - GARAK',
        shareUrl: undefined,
      },
    ]);
  });

  test('does not publish event-replay exports when the source work is missing', async () => {
    const noopServices = createNoopGarakProductServices();
    const state: GarakProductState = {
      ...createInitialGarakProductState({
        now: () => '2026-06-26T00:00:00.000Z',
      }),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-event-replay' },
      sharePublishStatus: {
        status: 'publishing',
        target: { kind: 'exportedAudio', id: 'export-event-replay' },
      },
      library: {
        works: [],
        exportedAudios: [
          {
            id: 'export-event-replay',
            kind: 'exported_audio',
            workId: 'missing-work',
            title: 'Event Replay Export',
            durationSeconds: 12,
            instrumentNames: ['Gayageum'],
            createdAt: '2026-06-26T00:00:00.000Z',
            audioUri: 'garak://library-demo/export-fallback',
            renderKind: 'event_replay',
            sourceTakeId: 'take-1',
            sourceEventCount: 1,
            shareState: 'ready',
          },
        ],
        practiceResults: [],
      },
    };
    let publishCalls = 0;
    const services = {
      ...noopServices,
      share: {
        publishShareTarget: async () => {
          publishCalls += 1;
          return { status: 'unavailable' as const };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'publishShareTarget' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failSharePublish',
        target: { kind: 'exportedAudio', id: 'export-event-replay' },
        message: 'Share target is not available.',
      },
    ]);
    expect(publishCalls).toBe(0);
  });

  test('does not publish event-replay exports when the source take is missing', async () => {
    const noopServices = createNoopGarakProductServices();
    const state: GarakProductState = {
      ...createInitialGarakProductState({
        now: () => '2026-06-26T00:00:00.000Z',
      }),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-event-replay' },
      sharePublishStatus: {
        status: 'publishing',
        target: { kind: 'exportedAudio', id: 'export-event-replay' },
      },
      library: {
        works: [createAudibleWork('work-1')],
        exportedAudios: [
          {
            id: 'export-event-replay',
            kind: 'exported_audio',
            workId: 'work-1',
            title: 'Event Replay Export',
            durationSeconds: 12,
            instrumentNames: ['Gayageum'],
            createdAt: '2026-06-26T00:00:00.000Z',
            audioUri: 'garak://library-demo/export-fallback',
            renderKind: 'event_replay',
            sourceTakeId: 'missing-take',
            sourceEventCount: 1,
            shareState: 'ready',
          },
        ],
        practiceResults: [],
      },
    };
    let publishCalls = 0;
    const services = {
      ...noopServices,
      share: {
        publishShareTarget: async () => {
          publishCalls += 1;
          return { status: 'unavailable' as const };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'publishShareTarget' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failSharePublish',
        target: { kind: 'exportedAudio', id: 'export-event-replay' },
        message: 'Share target is not available.',
      },
    ]);
    expect(publishCalls).toBe(0);
  });

  test('does not publish event-replay exports without source event count provenance', async () => {
    const noopServices = createNoopGarakProductServices();
    const state: GarakProductState = {
      ...createInitialGarakProductState({
        now: () => '2026-06-26T00:00:00.000Z',
      }),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-event-replay' },
      sharePublishStatus: {
        status: 'publishing',
        target: { kind: 'exportedAudio', id: 'export-event-replay' },
      },
      library: {
        works: [createAudibleWork('work-1')],
        exportedAudios: [
          {
            id: 'export-event-replay',
            kind: 'exported_audio',
            workId: 'work-1',
            title: 'Event Replay Export',
            durationSeconds: 12,
            instrumentNames: ['Gayageum'],
            createdAt: '2026-06-26T00:00:00.000Z',
            audioUri: 'garak://library-demo/export-fallback',
            renderKind: 'event_replay',
            sourceTakeId: 'take-1',
            shareState: 'ready',
          },
        ],
        practiceResults: [],
      },
    };
    let publishCalls = 0;
    const services = {
      ...noopServices,
      share: {
        publishShareTarget: async () => {
          publishCalls += 1;
          return { status: 'unavailable' as const };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'publishShareTarget' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failSharePublish',
        target: { kind: 'exportedAudio', id: 'export-event-replay' },
        message: 'Share target is not available.',
      },
    ]);
    expect(publishCalls).toBe(0);
  });

  test('publishes demo-sample exports without treating the bundled fallback URI as a file', async () => {
    const noopServices = createNoopGarakProductServices();
    const publishInputs: Array<Parameters<typeof noopServices.share.publishShareTarget>[0]> = [];
    const state: GarakProductState = {
      ...createInitialGarakProductState({
        now: () => '2026-06-26T00:00:00.000Z',
      }),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-demo-sample' },
      sharePublishStatus: {
        status: 'publishing',
        target: { kind: 'exportedAudio', id: 'export-demo-sample' },
      },
      library: {
        works: [],
        exportedAudios: [
          {
            id: 'export-demo-sample',
            kind: 'exported_audio',
            title: 'Demo Sample Export',
            durationSeconds: 12,
            instrumentNames: ['Daegeum'],
            createdAt: '2026-06-26T00:00:00.000Z',
            audioUri: 'garak://library-demo/export-fallback',
            renderKind: 'demo_sample',
            shareState: 'ready',
          },
        ],
        practiceResults: [],
      },
    };
    const services = {
      ...noopServices,
      share: {
        publishShareTarget: async (input: Parameters<typeof noopServices.share.publishShareTarget>[0]) => {
          publishInputs.push(input);
          return {
            status: 'ok' as const,
            value: {
              remoteId: 'remote-demo-sample',
              shareUrl: 'https://garak.test/share/remote-demo-sample',
              expiresAtMs: 1783036800000,
              shareMethod: 'link' as const,
            },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'publishShareTarget' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'completeSharePublish',
        target: { kind: 'exportedAudio', id: 'export-demo-sample' },
        remoteId: 'remote-demo-sample',
        shareUrl: 'https://garak.test/share/remote-demo-sample',
        expiresAtMs: 1783036800000,
        shareMethod: 'link',
      },
    ]);
    expect(publishInputs).toEqual([
      {
        target: { kind: 'exportedAudio', id: 'export-demo-sample' },
        title: 'Demo Sample Export',
        message: 'Demo Sample Export - GARAK',
        shareUrl: undefined,
      },
    ]);
  });

  test('maps AI accompaniment recommendations to the existing jangdan preview action', async () => {
    const events: PerformanceEvent[] = [
      { type: 'string_pluck', tsMs: 0, stringIndex: 1, velocity: 0.7 },
    ];
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      currentWorkId: 'work-1',
      library: {
        works: [
          {
            ...createWork('work-1'),
            tracks: [
              {
                id: 'track-1',
                kind: 'instrument' as const,
                instrument: 'gayageum' as const,
                takes: [
                  {
                    id: 'take-1',
                    events,
                    startedAtBeat: 1,
                    durationBeats: 8,
                  },
                ],
                startedAtBeat: 1,
                volume: 1,
                mute: false,
                solo: false,
                createdAt: '2026-06-25T00:00:00.000Z',
              },
            ],
          },
        ],
        exportedAudios: [],
        practiceResults: [],
      },
    };
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      ai: {
        ...noopServices.ai,
        recommendAccompaniment: async (input: { events: readonly PerformanceEvent[] }) => {
          expect(input.events).toEqual(events);
          return {
            status: 'ok' as const,
            value: {
              presetId: 'semachi' as const,
              bpm: 96,
              volume: 0.72,
              reason: 'server recommendation',
            },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'chooseAccompanimentTrack' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failAutoAccompanimentGeneration',
        code: 'model_unavailable',
        message: 'AI auto accompaniment service is unavailable.',
      },
      {
        type: 'previewJangdanPreset',
        mode: 'track',
        presetId: 'semachi',
        bpm: 96,
        volume: 0.72,
      },
    ]);
  });

  test('requests an AI auto accompaniment candidate from the current work on S10B entry', async () => {
    const events: PerformanceEvent[] = [
      { type: 'string_pluck', tsMs: 0, stringIndex: 1, velocity: 0.7 },
    ];
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      currentWorkId: 'work-1',
      library: {
        works: [
          {
            ...createWork('work-1'),
            tracks: [
              {
                id: 'track-1',
                kind: 'instrument' as const,
                instrument: 'gayageum' as const,
                takes: [
                  {
                    id: 'take-1',
                    events,
                    startedAtBeat: 1,
                    durationBeats: 8,
                    recordingSetup: {
                      presetId: 'semachi' as const,
                      bpm: 84,
                      beatUnit: '4/4',
                    },
                  },
                ],
                startedAtBeat: 1,
                volume: 1,
                mute: false,
                solo: false,
                createdAt: '2026-06-25T00:00:00.000Z',
              },
            ],
          },
        ],
        exportedAudios: [],
        practiceResults: [],
      },
    };
    const candidate = {
      id: 'candidate-1',
      status: 'ready' as const,
      sourceWorkId: 'work-1',
      sourceTrackId: 'track-1',
      sourceTakeId: 'take-1',
      sourceInstrument: 'gayageum' as const,
      analysis: {
        jo: 'pyeongjo' as const,
        jangdan: 'jungmori' as const,
        bpm: 84,
        confidence: 0.86,
      },
      generatedTracks: [
        {
          instrument: 'daegeum' as const,
          role: 'melody' as const,
          audioUri: 'file://garak/daegeum.wav',
          volume: 0.7,
          startedAtBeat: 1,
        },
        {
          instrument: 'janggu' as const,
          role: 'rhythm' as const,
          audioUri: 'file://garak/janggu.wav',
          volume: 0.6,
          startedAtBeat: 1,
        },
      ],
      mixedAudioUri: 'file://garak/mix.wav',
      durationSeconds: 24,
      model: {
        pitchModelId: 'pitch-v1',
        rhythmModelId: 'rhythm-v1',
        temperature: 0.7,
      },
    };
    const services = {
      ...createNoopGarakProductServices(),
      ai: {
        recommendAccompaniment: async () => ({ status: 'unavailable' as const }),
        generateAutoAccompaniment: async (
          input: Parameters<
            ReturnType<typeof createNoopGarakProductServices>['ai']['generateAutoAccompaniment']
          >[0],
        ) => {
          expect(input).toMatchObject({
            source: 's10b_auto_accompaniment',
            workId: 'work-1',
            sourceTrackId: 'track-1',
            sourceTakeId: 'take-1',
            sourceInstrument: 'gayageum',
            events,
            options: {
              outputKind: 'ensemble_wav_candidate',
              maxCandidates: 1,
              temperature: 0.7,
            },
          });

          return {
            status: 'ok' as const,
            value: candidate,
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'chooseAccompanimentTrack' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'completeAutoAccompanimentGeneration',
        candidate,
      },
    ]);
  });

  test('keeps captured free-play event effects limited to state persistence follow-ups', async () => {
    const events: PerformanceEvent[] = [
      { type: 'string_pluck', tsMs: 120, stringIndex: 2, velocity: 0.7 },
    ];
    let playedEvents: readonly PerformanceEvent[] | undefined;
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playPerformanceEvents: async (input: { events: readonly PerformanceEvent[] }) => {
          playedEvents = input.events;
          return {
            status: 'ok' as const,
            value: { handledEvents: input.events.length },
          };
        },
      },
    };

    const followUpActions = await runGarakProductEffect({
      state: createInitialGarakProductState(),
      action: { type: 'appendFreePlayPerformanceEvents', events },
      services,
    });

    expect(playedEvents).toBeUndefined();
    expect(followUpActions).toEqual([]);
  });

  test('prepares live performance audio when S05 starts', async () => {
    const initialState: GarakProductState = {
      ...createInitialGarakProductState({ sampleFallbackInstruments: ['janggu'] }),
      selectedInstrument: 'janggu',
      screenFlow: {
        currentScreen: 'S04A',
        history: ['S01', 'S03', 'S04'],
        mode: 'freeCreation',
      },
    };
    const action = { type: 'next' } as const;
    const nextState = applyProductAction(initialState, action);
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        prepareLivePerformanceAudio: async (input: { instrument: 'gayageum' | 'janggu' | 'daegeum' }) => {
          expect(input).toEqual({ instrument: 'janggu' });
          return {
            status: 'ok' as const,
            value: {
              instrument: input.instrument,
              sampleSourceLabel: 'bundled dev sampler',
              releaseReady: false,
            },
          };
        },
      },
    };

    expect(nextState.livePerformanceAudioStatus).toMatchObject({
      status: 'preparing',
      instrument: 'janggu',
    });
    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'completeLivePerformanceAudioPreparation',
        instrument: 'janggu',
        preparationAttemptId: expect.any(String),
        sampleSourceLabel: 'bundled dev sampler',
        releaseReady: false,
      },
    ]);
  });

  test('warms live performance audio when a playable S04 instrument is selected', async () => {
    const initialState: GarakProductState = {
      ...createInitialGarakProductState({ sampleFallbackInstruments: ['janggu', 'daegeum'] }),
      screenFlow: {
        currentScreen: 'S04',
        history: ['S01', 'S03'],
        mode: 'freeCreation',
      },
    };
    const action = { type: 'selectInstrument', instrument: 'daegeum' } as const;
    const nextState = applyProductAction(initialState, action);
    const preparedInstruments: Array<'gayageum' | 'janggu' | 'daegeum'> = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        prepareLivePerformanceAudio: async (input: { instrument: 'gayageum' | 'janggu' | 'daegeum' }) => {
          preparedInstruments.push(input.instrument);
          return {
            status: 'ok' as const,
            value: {
              instrument: input.instrument,
              sampleSourceLabel: `${input.instrument} warm sampler`,
              releaseReady: false,
            },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([]);
    expect(preparedInstruments).toEqual(['daegeum']);
    expect(nextState.livePerformanceAudioStatus).toEqual({ status: 'idle' });
  });

  test('warms the visible default live instrument when entering S04A preview', async () => {
    const initialState: GarakProductState = {
      ...createInitialGarakProductState({ sampleFallbackInstruments: ['janggu'] }),
      screenFlow: {
        currentScreen: 'S04',
        history: ['S01', 'S03'],
        mode: 'freeCreation',
      },
    };
    const action = { type: 'next' } as const;
    const nextState = applyProductAction(initialState, action);
    const preparedInstruments: Array<'gayageum' | 'janggu' | 'daegeum'> = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        prepareLivePerformanceAudio: async (input: { instrument: 'gayageum' | 'janggu' | 'daegeum' }) => {
          preparedInstruments.push(input.instrument);
          return {
            status: 'ok' as const,
            value: {
              instrument: input.instrument,
              sampleSourceLabel: `${input.instrument} warm sampler`,
              releaseReady: false,
            },
          };
        },
      },
    };

    expect(nextState.screenFlow.currentScreen).toBe('S04A');
    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([]);
    expect(preparedInstruments).toEqual(['janggu']);
    expect(nextState.livePerformanceAudioStatus).toEqual({ status: 'idle' });
  });

  test('surfaces live performance audio preparation failures on S05', async () => {
    const initialState: GarakProductState = {
      ...createInitialGarakProductState({ sampleFallbackInstruments: ['daegeum'] }),
      selectedInstrument: 'daegeum',
      screenFlow: {
        currentScreen: 'S04A',
        history: ['S01', 'S03', 'S04'],
        mode: 'freeCreation',
      },
    };
    const action = { type: 'next' } as const;
    const nextState = applyProductAction(initialState, action);
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        prepareLivePerformanceAudio: async () => ({
          status: 'error' as const,
          message: 'native sampler failed',
        }),
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failLivePerformanceAudioPreparation',
        instrument: 'daegeum',
        preparationAttemptId: expect.any(String),
        message: 'native sampler failed',
      },
    ]);
  });

  test('retries live performance audio preparation through the S05 service boundary', async () => {
    const failedState: GarakProductState = {
      ...createInitialGarakProductState({ sampleFallbackInstruments: ['daegeum'] }),
      selectedInstrument: 'daegeum',
      screenFlow: {
        currentScreen: 'S05',
        history: ['S01', 'S03', 'S04', 'S04A'],
        mode: 'freeCreation',
      },
      livePerformanceAudioStatus: {
        status: 'failed',
        instrument: 'daegeum',
        message: 'native sampler failed',
      },
    };
    const action = { type: 'retryLivePerformanceAudioPreparation' } as const;
    const nextState = applyProductAction(failedState, action);
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        prepareLivePerformanceAudio: async (input: { instrument: 'gayageum' | 'janggu' | 'daegeum' }) => {
          expect(input).toEqual({ instrument: 'daegeum' });
          return {
            status: 'ok' as const,
            value: {
              instrument: input.instrument,
              sampleSourceLabel: 'bundled dev sampler',
              releaseReady: false,
            },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'completeLivePerformanceAudioPreparation',
        instrument: 'daegeum',
        preparationAttemptId: expect.any(String),
        sampleSourceLabel: 'bundled dev sampler',
        releaseReady: false,
      },
    ]);
  });

  test('retries live performance audio preparation through the S09 service boundary', async () => {
    const failedState: GarakProductState = {
      ...createInitialGarakProductState({ sampleFallbackInstruments: ['gayageum', 'daegeum'] }),
      selectedInstrument: 'gayageum',
      screenFlow: {
        currentScreen: 'S09',
        history: ['S01', 'S03', 'S04', 'S04A', 'S05', 'S07', 'S08'],
        mode: 'freeCreation',
      },
      livePerformanceAudioStatus: {
        status: 'failed',
        instrument: 'daegeum',
        message: 'native sampler failed',
      },
    };
    const action = { type: 'retryLivePerformanceAudioPreparation' } as const;
    const nextState = applyProductAction(failedState, action);
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        prepareLivePerformanceAudio: async (input: { instrument: 'gayageum' | 'janggu' | 'daegeum' }) => {
          expect(input).toEqual({ instrument: 'daegeum' });
          return {
            status: 'ok' as const,
            value: {
              instrument: input.instrument,
              sampleSourceLabel: 'bundled extra sampler',
              releaseReady: false,
            },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'completeLivePerformanceAudioPreparation',
        instrument: 'daegeum',
        preparationAttemptId: expect.any(String),
        sampleSourceLabel: 'bundled extra sampler',
        releaseReady: false,
      },
    ]);
  });

  test('prepares live performance audio when the S05 instrument changes', async () => {
    const readyState: GarakProductState = {
      ...createInitialGarakProductState({ sampleFallbackInstruments: ['janggu', 'daegeum'] }),
      selectedInstrument: 'janggu',
      screenFlow: {
        currentScreen: 'S05',
        history: ['S01', 'S03', 'S04', 'S04A'],
        mode: 'freeCreation',
      },
      livePerformanceAudioStatus: {
        status: 'ready',
        instrument: 'janggu',
        sampleSourceLabel: 'janggu sampler',
        releaseReady: true,
      },
    };
    const action = { type: 'selectInstrument', instrument: 'daegeum' } as const;
    const nextState = applyProductAction(readyState, action);
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        prepareLivePerformanceAudio: async (input: { instrument: 'gayageum' | 'janggu' | 'daegeum' }) => {
          expect(input).toEqual({ instrument: 'daegeum' });
          return {
            status: 'ok' as const,
            value: {
              instrument: input.instrument,
              sampleSourceLabel: 'daegeum sampler',
              releaseReady: true,
            },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'completeLivePerformanceAudioPreparation',
        instrument: 'daegeum',
        preparationAttemptId: expect.any(String),
        sampleSourceLabel: 'daegeum sampler',
        releaseReady: true,
      },
    ]);
  });

  test('prepares live performance audio when the S09 extra instrument is chosen', async () => {
    const initialState: GarakProductState = {
      ...createInitialGarakProductState({ sampleFallbackInstruments: ['gayageum', 'daegeum'] }),
      selectedInstrument: 'gayageum',
      screenFlow: {
        currentScreen: 'S08',
        history: ['S01', 'S03', 'S04', 'S04A', 'S05', 'S07'],
        mode: 'freeCreation',
      },
    };
    const action = { type: 'chooseInstrumentTrack', instrument: 'daegeum' } as const;
    const nextState = applyProductAction(initialState, action);
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        prepareLivePerformanceAudio: async (input: { instrument: 'gayageum' | 'janggu' | 'daegeum' }) => {
          expect(input).toEqual({ instrument: 'daegeum' });
          return {
            status: 'ok' as const,
            value: {
              instrument: input.instrument,
              sampleSourceLabel: 'daegeum sampler',
              releaseReady: true,
            },
          };
        },
      },
    };

    expect(nextState.screenFlow.currentScreen).toBe('S09');
    expect(nextState.livePerformanceAudioStatus).toMatchObject({
      status: 'preparing',
      instrument: 'daegeum',
    });
    await expect(
      runGarakProductEffect({
        state: nextState,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'completeLivePerformanceAudioPreparation',
        instrument: 'daegeum',
        preparationAttemptId: expect.any(String),
        sampleSourceLabel: 'daegeum sampler',
        releaseReady: true,
      },
    ]);
  });

  test('plays the selected exported audio through the library audio service boundary', async () => {
    const selectedAudio = {
      id: 'export-1',
      kind: 'exported_audio' as const,
      workId: 'work-1',
      title: 'My Arirang Export',
      durationSeconds: 31,
      instrumentNames: ['Gayageum'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'file://garak/export-1.wav',
      shareState: 'ready' as const,
    };
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      playingPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      library: {
        works: [createWork('work-1')],
        exportedAudios: [selectedAudio],
        practiceResults: [],
      },
    };
    const playedUris: string[] = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playLibraryAudio: async (input: { audioUri: string }) => {
          playedUris.push(input.audioUri);
          return {
            status: 'ok' as const,
            value: { audioUri: input.audioUri },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([]);

    expect(playedUris).toEqual(['file://garak/export-1.wav']);
  });

  test('does not play stale audio-capture exports without file-backed capture provenance', async () => {
    const selectedAudio = {
      id: 'export-stale-capture',
      kind: 'exported_audio' as const,
      workId: 'work-1',
      title: 'Stale Capture Export',
      durationSeconds: 31,
      instrumentNames: ['Gayageum'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'garak://library-demo/export-fallback',
      renderKind: 'audio_capture' as const,
      sourceTakeId: 'take-1',
      sourceRecordingUri: 'garak://library-demo/export-fallback',
      shareState: 'ready' as const,
    };
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      playingPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      library: {
        works: [createWork('work-1')],
        exportedAudios: [selectedAudio],
        practiceResults: [],
      },
    };
    let playCalls = 0;
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playLibraryAudio: async () => {
          playCalls += 1;
          return { status: 'unavailable' as const };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'Audio capture export is missing file-backed capture provenance.',
      },
    ]);
    expect(playCalls).toBe(0);
  });

  test('plays a demo library item when opening it from a visible play affordance', async () => {
    const initialState = applyProductAction(createInitialGarakProductState(), {
      type: 'navigate',
      target: 'S20',
    });
    const action = {
      type: 'playLibraryItemNow',
      item: { kind: 'demo' as const, title: 'My Arirang' },
    } as const;
    const state = applyProductAction(initialState, action);
    const playedSources: Array<{ audioUri: string; title?: string; sourceKind?: string }> = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playLibraryAudio: async (input: {
          audioUri: string;
          title?: string;
          sourceKind?: string;
        }) => {
          playedSources.push(input);
          return {
            status: 'ok' as const,
            value: { audioUri: input.audioUri },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action,
        services,
      }),
    ).resolves.toEqual([]);

    expect(playedSources).toEqual([
      expect.objectContaining({
        title: 'My Arirang',
        sourceKind: 'demo',
      }),
    ]);
  });

  test('plays event-replay exported audio through its source work mix even when the fallback asset is playable', async () => {
    const work = createAudibleWork('work-1');
    const selectedAudio = {
      id: 'export-1',
      kind: 'exported_audio' as const,
      workId: work.id,
      title: 'Event Replay Export',
      durationSeconds: 31,
      instrumentNames: ['Gayageum'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'garak://library-demo/export-fallback',
      renderKind: 'event_replay' as const,
      sourceTakeId: 'take-1',
      sourceEventCount: 1,
      shareState: 'ready' as const,
    };
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      playingPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      library: {
        works: [work],
        exportedAudios: [selectedAudio],
        practiceResults: [],
      },
    };
    const playedWorkIds: string[] = [];
    const playedLibrarySources: Array<{ audioUri: string; title?: string; sourceKind?: string }> = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (playedWork: Work) => {
          playedWorkIds.push(playedWork.id);
          return {
            status: 'ok' as const,
            value: { handledTracks: playedWork.tracks.length },
          };
        },
        playLibraryAudio: async (input: { audioUri: string; title?: string; sourceKind?: string }) => {
          playedLibrarySources.push(input);
          return {
            status: 'ok' as const,
            value: { audioUri: input.audioUri },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([]);
    expect(playedWorkIds).toEqual(['work-1']);
    expect(playedLibrarySources).toEqual([]);
  });

  test('plays layered event-replay exports through every audible source work event track', async () => {
    const work: Work = {
      ...createAudibleWork('work-layered-replay'),
      tracks: [
        ...createAudibleWork('work-layered-replay').tracks,
        {
          id: 'track-2',
          kind: 'instrument',
          instrument: 'gayageum',
          startedAtBeat: 3,
          volume: 0.6,
          mute: false,
          solo: false,
          createdAt: '2026-06-25T00:01:00.000Z',
          takes: [
            {
              id: 'take-2',
              events: [{ type: 'string_pluck', tsMs: 180, stringIndex: 5, velocity: 0.8 }],
              startedAtBeat: 1,
              durationBeats: 4,
            },
          ],
        },
      ],
    };
    const selectedAudio = {
      id: 'export-layered-replay',
      kind: 'exported_audio' as const,
      workId: work.id,
      title: 'Layered Event Replay Export',
      durationSeconds: 31,
      instrumentNames: ['Janggu', 'Gayageum'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'garak://library-demo/export-fallback',
      renderKind: 'event_replay' as const,
      sourceTakeId: 'take-1',
      sourceEventCount: 2,
      shareState: 'ready' as const,
    };
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      playingPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      library: {
        works: [work],
        exportedAudios: [selectedAudio],
        practiceResults: [],
      },
    };
    const playedMixes: Array<{
      workId: string;
      trackIds: string[];
      volumes: number[];
    }> = [];
    const playedLibrarySources: unknown[] = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (
          playedWork: Work,
          mixPlan: { tracks: Array<{ trackId: string; volume: number }> },
        ) => {
          playedMixes.push({
            workId: playedWork.id,
            trackIds: mixPlan.tracks.map((track) => track.trackId),
            volumes: mixPlan.tracks.map((track) => track.volume),
          });

          return {
            status: 'ok' as const,
            value: { handledTracks: mixPlan.tracks.length },
          };
        },
        playLibraryAudio: async (input: unknown) => {
          playedLibrarySources.push(input);
          return {
            status: 'ok' as const,
            value: { audioUri: 'unexpected://fallback.wav' },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([]);
    expect(playedMixes).toEqual([
      {
        workId: 'work-layered-replay',
        trackIds: ['track-1', 'track-2'],
        volumes: [1, 0.6],
      },
    ]);
    expect(playedLibrarySources).toEqual([]);
  });

  test('rejects placeholder event-replay playback instead of using a source work mix fallback', async () => {
    const work = createAudibleWork('work-1');
    const selectedAudio = {
      id: 'export-1',
      kind: 'exported_audio' as const,
      workId: work.id,
      title: 'Event Replay Export',
      durationSeconds: 31,
      instrumentNames: ['Gayageum'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'placeholder://export-1.wav',
      renderKind: 'event_replay' as const,
      sourceTakeId: 'take-1',
      sourceEventCount: 1,
      shareState: 'ready' as const,
    };
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      playingPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      library: {
        works: [work],
        exportedAudios: [selectedAudio],
        practiceResults: [],
      },
    };
    const playedWorkIds: string[] = [];
    const playedLibraryUris: string[] = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (playedWork: Work) => {
          playedWorkIds.push(playedWork.id);
          return {
            status: 'ok' as const,
            value: { handledTracks: playedWork.tracks.length },
          };
        },
        playLibraryAudio: async (input: { audioUri: string }) => {
          playedLibraryUris.push(input.audioUri);
          return {
            status: 'ok' as const,
            value: { audioUri: input.audioUri },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'Selected audio is not a playable export artifact.',
      },
    ]);
    expect(playedWorkIds).toEqual([]);
    expect(playedLibraryUris).toEqual([]);
  });

  test('does not play event-replay exported audio when its source take is missing', async () => {
    const work = createAudibleWork('work-1');
    const selectedAudio = {
      id: 'export-missing-source-take',
      kind: 'exported_audio' as const,
      workId: work.id,
      title: 'Missing Source Take Replay',
      durationSeconds: 31,
      instrumentNames: ['Gayageum'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'garak://library-demo/export-fallback',
      renderKind: 'event_replay' as const,
      shareState: 'ready' as const,
    };
    const selection: ProductPlayerSelection = {
      kind: 'exportedAudio',
      exportedAudioId: selectedAudio.id,
    };
    const playedWorkIds: string[] = [];
    const playedLibraryUris: string[] = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (playedWork: Work) => {
          playedWorkIds.push(playedWork.id);
          return {
            status: 'ok' as const,
            value: { handledTracks: playedWork.tracks.length },
          };
        },
        playLibraryAudio: async (input: { audioUri: string }) => {
          playedLibraryUris.push(input.audioUri);
          return {
            status: 'ok' as const,
            value: { audioUri: input.audioUri },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: {
          ...createInitialGarakProductState(),
          selectedPlayerItem: selection,
          playingPlayerItem: selection,
          library: {
            works: [work],
            exportedAudios: [selectedAudio],
            practiceResults: [],
          },
        },
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'Event replay source take is unavailable.',
      },
    ]);
    expect(playedWorkIds).toEqual([]);
    expect(playedLibraryUris).toEqual([]);
  });

  test('surfaces event-replay exported audio with no audible source tracks instead of starting silent playback', async () => {
    const mutedWork: Work = {
      ...createWork('work-muted-event-replay'),
      tracks: [
        {
          id: 'track-muted-event-replay',
          kind: 'instrument',
          instrument: 'janggu',
          takes: [
            {
              id: 'take-muted',
              events: [{ type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 }],
              startedAtBeat: 1,
              durationBeats: 4,
            },
          ],
          startedAtBeat: 1,
          volume: 1,
          mute: true,
          solo: false,
          createdAt: '2026-06-25T00:00:00.000Z',
        },
      ],
    };
    const selectedAudio = {
      id: 'export-muted-replay',
      kind: 'exported_audio' as const,
      workId: mutedWork.id,
      title: 'Muted Event Replay Export',
      durationSeconds: 31,
      instrumentNames: ['Janggu'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'garak://library-demo/export-fallback',
      renderKind: 'event_replay' as const,
      sourceTakeId: 'take-muted',
      sourceEventCount: 1,
      shareState: 'ready' as const,
    };
    const selection: ProductPlayerSelection = {
      kind: 'exportedAudio',
      exportedAudioId: selectedAudio.id,
    };
    const noopServices = createNoopGarakProductServices();
    const playWorkMixCalls: Work[] = [];
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (work: Work) => {
          playWorkMixCalls.push(work);
          return {
            status: 'ok' as const,
            value: { handledTracks: 0 },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: {
          ...createInitialGarakProductState(),
          selectedPlayerItem: selection,
          playingPlayerItem: selection,
          playerPlaybackStatus: { status: 'playing' },
          library: {
            works: [mutedWork],
            exportedAudios: [selectedAudio],
            practiceResults: [],
          },
        },
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'No audible tracks are available to play.',
      },
    ]);
    expect(playWorkMixCalls).toEqual([]);
  });

  test('does not play an event-replay export when its source take is muted but another source track is audible', async () => {
    const work = createMutedReplaySourceWork('work-muted-event-replay');
    const selectedAudio = {
      id: 'export-muted-source-replay',
      kind: 'exported_audio' as const,
      workId: work.id,
      title: 'Muted Source Replay Export',
      durationSeconds: 31,
      instrumentNames: ['Janggu'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'garak://library-demo/export-fallback',
      renderKind: 'event_replay' as const,
      sourceTakeId: 'take-muted',
      sourceEventCount: 1,
      shareState: 'ready' as const,
    };
    const selection: ProductPlayerSelection = {
      kind: 'exportedAudio',
      exportedAudioId: selectedAudio.id,
    };
    const noopServices = createNoopGarakProductServices();
    const playWorkMixCalls: Work[] = [];
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (playedWork: Work) => {
          playWorkMixCalls.push(playedWork);
          return {
            status: 'ok' as const,
            value: { handledTracks: playedWork.tracks.length },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: {
          ...createInitialGarakProductState(),
          selectedPlayerItem: selection,
          playingPlayerItem: selection,
          playerPlaybackStatus: { status: 'playing' },
          library: {
            works: [work],
            exportedAudios: [selectedAudio],
            practiceResults: [],
          },
        },
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'Event replay source take is not audible.',
      },
    ]);
    expect(playWorkMixCalls).toEqual([]);
  });

  test('does not play an event-replay export when its source take has no recorded events', async () => {
    const work: Work = {
      ...createWork('work-empty-event-replay'),
      tracks: [
        {
          id: 'track-empty',
          kind: 'instrument',
          instrument: 'janggu',
          takes: [
            {
              id: 'take-empty',
              events: [],
              startedAtBeat: 1,
              durationBeats: 4,
            },
          ],
          startedAtBeat: 1,
          volume: 1,
          mute: false,
          solo: false,
          createdAt: '2026-06-25T00:00:00.000Z',
        },
      ],
    };
    const selectedAudio = {
      id: 'export-empty-source-replay',
      kind: 'exported_audio' as const,
      workId: work.id,
      title: 'Empty Source Replay Export',
      durationSeconds: 31,
      instrumentNames: ['Janggu'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'garak://library-demo/export-fallback',
      renderKind: 'event_replay' as const,
      sourceTakeId: 'take-empty',
      shareState: 'ready' as const,
    };
    const selection: ProductPlayerSelection = {
      kind: 'exportedAudio',
      exportedAudioId: selectedAudio.id,
    };
    const noopServices = createNoopGarakProductServices();
    const playWorkMixCalls: Work[] = [];
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (playedWork: Work) => {
          playWorkMixCalls.push(playedWork);
          return {
            status: 'ok' as const,
            value: { handledTracks: playedWork.tracks.length },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: {
          ...createInitialGarakProductState(),
          selectedPlayerItem: selection,
          playingPlayerItem: selection,
          playerPlaybackStatus: { status: 'playing' },
          library: {
            works: [work],
            exportedAudios: [selectedAudio],
            practiceResults: [],
          },
        },
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'Event replay source take has no recorded events.',
      },
    ]);
    expect(playWorkMixCalls).toEqual([]);
  });

  test('does not play an event-replay export when the source events changed after export', async () => {
    const work: Work = {
      ...createWork('work-changed-event-replay'),
      tracks: [
        {
          id: 'track-1',
          kind: 'instrument',
          instrument: 'janggu',
          takes: [
            {
              id: 'take-1',
              events: [{ type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 }],
              startedAtBeat: 1,
              durationBeats: 4,
            },
          ],
          startedAtBeat: 1,
          volume: 1,
          mute: false,
          solo: false,
          createdAt: '2026-06-25T00:00:00.000Z',
        },
      ],
    };
    const selectedAudio = {
      id: 'export-changed-source-replay',
      kind: 'exported_audio' as const,
      workId: work.id,
      title: 'Changed Source Replay Export',
      durationSeconds: 31,
      instrumentNames: ['Janggu'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'garak://library-demo/export-fallback',
      renderKind: 'event_replay' as const,
      sourceTakeId: 'take-1',
      sourceEventCount: 2,
      shareState: 'ready' as const,
    };
    const selection: ProductPlayerSelection = {
      kind: 'exportedAudio',
      exportedAudioId: selectedAudio.id,
    };
    const noopServices = createNoopGarakProductServices();
    const playWorkMixCalls: Work[] = [];
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (playedWork: Work) => {
          playWorkMixCalls.push(playedWork);
          return {
            status: 'ok' as const,
            value: { handledTracks: playedWork.tracks.length },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: {
          ...createInitialGarakProductState(),
          selectedPlayerItem: selection,
          playingPlayerItem: selection,
          playerPlaybackStatus: { status: 'playing' },
          library: {
            works: [work],
            exportedAudios: [selectedAudio],
            practiceResults: [],
          },
        },
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'Event replay source events changed after export.',
      },
    ]);
    expect(playWorkMixCalls).toEqual([]);
  });

  test('does not play an event-replay exported audio through a fallback file when its source work is missing', async () => {
    const selectedAudio = {
      id: 'export-1',
      kind: 'exported_audio' as const,
      workId: 'missing-work',
      title: 'Orphan Event Replay Export',
      durationSeconds: 31,
      instrumentNames: ['Gayageum'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'garak://library-demo/export-fallback',
      renderKind: 'event_replay' as const,
      sourceTakeId: 'take-1',
      shareState: 'ready' as const,
    };
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      playingPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      library: {
        works: [],
        exportedAudios: [selectedAudio],
        practiceResults: [],
      },
    };
    const playedLibraryUris: string[] = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playLibraryAudio: async (input: { audioUri: string }) => {
          playedLibraryUris.push(input.audioUri);
          return {
            status: 'ok' as const,
            value: { audioUri: input.audioUri },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'Event replay source work is unavailable.',
      },
    ]);
    expect(playedLibraryUris).toEqual([]);
  });

  test('surfaces selected player playback failures instead of silently swallowing them', async () => {
    const selectedAudio = {
      id: 'export-1',
      kind: 'exported_audio' as const,
      workId: 'work-1',
      title: 'My Arirang Export',
      durationSeconds: 31,
      instrumentNames: ['Gayageum'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'file://garak/export-1.wav',
      shareState: 'ready' as const,
    };
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      playingPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      library: {
        works: [],
        exportedAudios: [selectedAudio],
        practiceResults: [],
      },
    };
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playLibraryAudio: async () => ({
          status: 'error' as const,
          message: 'speaker route unavailable',
        }),
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'speaker route unavailable',
      },
    ]);
  });

  test('rejects placeholder exported-audio playback without calling the audio service', async () => {
    const selectedAudio = {
      id: 'export-placeholder',
      kind: 'exported_audio' as const,
      workId: 'work-1',
      title: 'Legacy Placeholder Export',
      durationSeconds: 31,
      instrumentNames: ['Gayageum'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'placeholder://export-1.wav',
      shareState: 'ready' as const,
    };
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      playingPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      library: {
        works: [],
        exportedAudios: [selectedAudio],
        practiceResults: [],
      },
    };
    let playCalls = 0;
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playLibraryAudio: async (input: { audioUri: string }) => {
          playCalls += 1;
          return {
            status: 'ok' as const,
            value: { audioUri: input.audioUri },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'Selected audio is not a playable export artifact.',
      },
    ]);
    expect(playCalls).toBe(0);
  });

  test.each([
    {
      selection: { kind: 'work', workId: 'missing-work' },
      message: 'Selected work is unavailable.',
    },
    {
      selection: { kind: 'exportedAudio', exportedAudioId: 'missing-export' },
      message: 'Selected audio is unavailable.',
    },
    {
      selection: { kind: 'practiceResult', practiceResultId: 'missing-practice-result' },
      message: 'Selected practice result is unavailable.',
    },
  ] satisfies Array<{ selection: ProductPlayerSelection; message: string }>)(
    'surfaces stale $selection.kind player selections as playback failures',
    async ({ selection, message }) => {
      const state: GarakProductState = {
        ...createInitialGarakProductState(),
        selectedPlayerItem: selection,
        playingPlayerItem: selection,
        playerPlaybackStatus: { status: 'playing' },
        library: {
          works: [],
          exportedAudios: [],
          practiceResults: [],
        },
      };

      await expect(
        runGarakProductEffect({
          state,
          action: { type: 'playLibraryItemNow', item: selection },
          services: createNoopGarakProductServices(),
        }),
      ).resolves.toEqual([
        {
          type: 'failPlayerPlayback',
          message,
        },
      ]);
    },
  );

  test('surfaces all-muted work player selections instead of starting silent playback', async () => {
    const mutedWork: Work = {
      ...createWork('work-muted'),
      tracks: [
        {
          id: 'track-muted',
          kind: 'instrument',
          instrument: 'janggu',
          takes: [],
          startedAtBeat: 1,
          volume: 1,
          mute: true,
          solo: false,
          createdAt: '2026-06-25T00:00:00.000Z',
        },
      ],
    };
    const selection: ProductPlayerSelection = { kind: 'work', workId: mutedWork.id };
    const noopServices = createNoopGarakProductServices();
    const playWorkMixCalls: Work[] = [];
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (work: Work) => {
          playWorkMixCalls.push(work);
          return {
            status: 'ok' as const,
            value: { handledTracks: 0 },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: {
          ...createInitialGarakProductState(),
          selectedPlayerItem: selection,
          playingPlayerItem: selection,
          playerPlaybackStatus: { status: 'playing' },
          library: {
            works: [mutedWork],
            exportedAudios: [],
            practiceResults: [],
          },
        },
        action: { type: 'playLibraryItemNow', item: selection },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'No audible tracks are available to play.',
      },
    ]);
    expect(playWorkMixCalls).toEqual([]);
  });

  test('surfaces zero-volume work player selections instead of starting silent playback', async () => {
    const zeroVolumeWork = createZeroVolumeWork('work-zero-volume');
    const selection: ProductPlayerSelection = { kind: 'work', workId: zeroVolumeWork.id };
    const noopServices = createNoopGarakProductServices();
    const playWorkMixCalls: Work[] = [];
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (work: Work) => {
          playWorkMixCalls.push(work);
          return {
            status: 'ok' as const,
            value: { handledTracks: 0 },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: {
          ...createInitialGarakProductState(),
          selectedPlayerItem: selection,
          playingPlayerItem: selection,
          playerPlaybackStatus: { status: 'playing' },
          library: {
            works: [zeroVolumeWork],
            exportedAudios: [],
            practiceResults: [],
          },
        },
        action: { type: 'playLibraryItemNow', item: selection },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'No audible tracks are available to play.',
      },
    ]);
    expect(playWorkMixCalls).toEqual([]);
  });

  test('plays the selected S21 shared recording through the library audio service boundary', async () => {
    let state = applyProductAction(createInitialGarakProductState(), {
      type: 'navigate',
      target: 'S20',
    });
    state = applyProductAction(state, {
      type: 'openSharedRecordingDetail',
      recordingId: 'recent-kpop-demon-hunters',
    });
    const action = { type: 'playSelectedSharedRecording' } as const;
    state = applyProductAction(state, action);
    const playedSources: Array<{ audioUri: string; title?: string; sourceKind?: string }> = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playLibraryAudio: async (input: {
          audioUri: string;
          title?: string;
          sourceKind?: string;
        }) => {
          playedSources.push(input);
          return {
            status: 'ok' as const,
            value: { audioUri: input.audioUri },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action,
        services,
      }),
    ).resolves.toEqual([]);

    expect(playedSources).toEqual([
      expect.objectContaining({
        title: 'K-pop Demon Hunters',
        sourceKind: 'sharedRecording',
      }),
    ]);
    expect(playedSources[0].audioUri).not.toMatch(/^placeholder:\/\//);
  });

  test('surfaces stale S21 shared recording selections instead of playing the featured fallback', async () => {
    const action = { type: 'playSelectedSharedRecording' } as const;
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedSharedRecordingId: 'missing-shared-recording',
      playingSharedRecordingId: 'missing-shared-recording',
      playerPlaybackStatus: { status: 'playing' },
    };
    const playedSources: Array<{ audioUri: string; title?: string; sourceKind?: string }> = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playLibraryAudio: async (input: {
          audioUri: string;
          title?: string;
          sourceKind?: string;
        }) => {
          playedSources.push(input);
          return {
            status: 'ok' as const,
            value: { audioUri: input.audioUri },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action,
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'Selected shared recording is unavailable.',
      },
    ]);
    expect(playedSources).toEqual([]);
  });

  test('plays an S21 shared recording saved to S19 library without leaking placeholder audio URIs', async () => {
    let state = applyProductAction(createInitialGarakProductState(), {
      type: 'navigate',
      target: 'S20',
    });
    state = applyProductAction(state, {
      type: 'openSharedRecordingDetail',
      recordingId: 'recent-kdrama-ost',
    });
    state = applyProductAction(state, { type: 'saveSharedRecording' });
    const savedAudio = state.library.exportedAudios[0];
    const action = {
      type: 'playLibraryItemNow',
      item: { kind: 'exportedAudio', exportedAudioId: savedAudio.id },
    } as const;
    state = applyProductAction(state, action);
    const playedSources: Array<{ audioUri: string; title?: string; sourceKind?: string }> = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playLibraryAudio: async (input: {
          audioUri: string;
          title?: string;
          sourceKind?: string;
        }) => {
          playedSources.push(input);
          return {
            status: 'ok' as const,
            value: { audioUri: input.audioUri },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action,
        services,
      }),
    ).resolves.toEqual([]);

    expect(playedSources).toEqual([
      expect.objectContaining({
        title: 'K-Drama OST',
        sourceKind: 'exportedAudio',
      }),
    ]);
    expect(playedSources[0].audioUri).not.toMatch(/^placeholder:\/\//);
  });

  test('pauses the selected S21 shared recording through the library audio service boundary', async () => {
    let pauseCalls = 0;
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        pauseLibraryAudio: async () => {
          pauseCalls += 1;
          return {
            status: 'ok' as const,
            value: { paused: true },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: createInitialGarakProductState(),
        action: { type: 'pauseSelectedSharedRecording' },
        services,
      }),
    ).resolves.toEqual([]);
    expect(pauseCalls).toBe(1);
  });

  test('plays the selected practice result through the library audio service boundary', async () => {
    const selectedPracticeResult = {
      id: 'practice-1',
      kind: 'practice_result' as const,
      songId: 'song-arirang',
      instrument: 'janggu' as const,
      accuracyScore: 82,
      timingScore: 76,
      feedback: '장단의 첫 박이 안정적이에요.',
      createdAt: '2026-06-25T00:00:00.000Z',
      shareState: 'ready' as const,
    };
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: {
        kind: 'practiceResult',
        practiceResultId: selectedPracticeResult.id,
      },
      playingPlayerItem: {
        kind: 'practiceResult',
        practiceResultId: selectedPracticeResult.id,
      },
      library: {
        works: [],
        exportedAudios: [],
        practiceResults: [selectedPracticeResult],
      },
    };
    const playedSources: Array<{ audioUri: string; title?: string; sourceKind?: string }> = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playLibraryAudio: async (input: {
          audioUri: string;
          title?: string;
          sourceKind?: string;
        }) => {
          playedSources.push(input);
          return {
            status: 'ok' as const,
            value: { audioUri: input.audioUri },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'playSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([]);

    expect(playedSources).toEqual([
      {
        audioUri: 'garak://library-demo/arirang',
        title: 'Arirang practice - janggu',
        sourceKind: 'practiceResult',
      },
    ]);
  });

  test('pauses the active library audio through the library audio service boundary', async () => {
    let pauseCalls = 0;
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        pauseLibraryAudio: async () => {
          pauseCalls += 1;
          return {
            status: 'ok' as const,
            value: { paused: true },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: createInitialGarakProductState(),
        action: { type: 'pauseSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([]);

    expect(pauseCalls).toBe(1);
  });

  test('surfaces active library pause failures instead of hiding them behind idle UI', async () => {
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        pauseLibraryAudio: async () => ({
          status: 'error' as const,
          message: 'native pause failed',
        }),
      },
    };

    await expect(
      runGarakProductEffect({
        state: createInitialGarakProductState(),
        action: { type: 'pauseSelectedPlayerItem' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'native pause failed',
      },
    ]);
  });

  test('previews the selected S17 exported audio through the library audio service boundary', async () => {
    const selectedAudio = {
      id: 'export-1',
      kind: 'exported_audio' as const,
      workId: 'work-1',
      title: 'My Arirang Export',
      durationSeconds: 31,
      instrumentNames: ['Gayageum'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'file://garak/export-1.wav',
      shareState: 'ready' as const,
    };
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      library: {
        works: [],
        exportedAudios: [selectedAudio],
        practiceResults: [],
      },
    };
    const playedSources: Array<{ audioUri: string; title?: string; sourceKind?: string }> = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playLibraryAudio: async (input: {
          audioUri: string;
          title?: string;
          sourceKind?: string;
        }) => {
          playedSources.push(input);
          return {
            status: 'ok' as const,
            value: { audioUri: input.audioUri },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'previewShareTarget' },
        services,
      }),
    ).resolves.toEqual([]);

    expect(playedSources).toEqual([
      {
        audioUri: 'file://garak/export-1.wav',
        title: 'My Arirang Export',
        sourceKind: 'exportedAudio',
      },
    ]);
  });

  test('surfaces S17 preview playback failures', async () => {
    const selectedAudio = {
      id: 'export-1',
      kind: 'exported_audio' as const,
      title: 'Broken Export',
      durationSeconds: 31,
      instrumentNames: ['Janggu'],
      createdAt: '2026-06-25T00:00:00.000Z',
      audioUri: 'file://garak/missing.wav',
      shareState: 'ready' as const,
    };
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: selectedAudio.id },
      library: {
        works: [],
        exportedAudios: [selectedAudio],
        practiceResults: [],
      },
    };
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playLibraryAudio: async () => ({
          status: 'error' as const,
          message: 'preview asset missing',
        }),
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'previewShareTarget' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'preview asset missing',
      },
    ]);
  });

  test('surfaces stale explicit S17 preview selections instead of leaving preview playing', async () => {
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'missing-export' },
      sharePreviewStatus: 'playing',
      library: {
        works: [],
        exportedAudios: [
          {
            id: 'export-1',
            kind: 'exported_audio' as const,
            title: 'Available Export',
            durationSeconds: 31,
            instrumentNames: ['Janggu'],
            createdAt: '2026-06-25T00:00:00.000Z',
            audioUri: 'file://garak/export-1.wav',
            shareState: 'ready' as const,
          },
        ],
        practiceResults: [],
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'previewShareTarget' },
        services: createNoopGarakProductServices(),
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'Selected share target is unavailable.',
      },
    ]);
  });

  test('previews a valid practice result instead of a newer stale event-replay export', async () => {
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: undefined,
      library: {
        works: [],
        exportedAudios: [
          {
            id: 'export-stale',
            kind: 'exported_audio' as const,
            workId: 'missing-work',
            title: 'Stale Event Replay Export',
            durationSeconds: 31,
            instrumentNames: ['Janggu'],
            createdAt: '2026-06-26T00:00:00.000Z',
            audioUri: 'garak://library-demo/export-fallback',
            renderKind: 'event_replay' as const,
            sourceTakeId: 'take-1',
            shareState: 'ready' as const,
          },
        ],
        practiceResults: [
          {
            id: 'practice-1',
            kind: 'practice_result' as const,
            songId: 'arirang',
            instrument: 'janggu' as const,
            accuracyScore: 91,
            timingScore: 87,
            feedback: 'Good timing',
            createdAt: '2026-06-25T00:00:00.000Z',
            shareState: 'ready' as const,
          },
        ],
      },
    };
    const playedSources: Array<{ audioUri?: string; title?: string; sourceKind?: string }> = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playLibraryAudio: async (input: { audioUri?: string; title?: string; sourceKind?: string }) => {
          playedSources.push(input);
          return {
            status: 'ok' as const,
            value: { audioUri: 'garak://library-demo/arirang' },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'previewShareTarget' },
        services,
      }),
    ).resolves.toEqual([]);

    expect(playedSources).toEqual([
      {
        audioUri: 'garak://library-demo/arirang',
        title: 'Arirang practice - janggu',
        sourceKind: 'practiceResult',
      },
    ]);
  });

  test('plays the current work through the work mix service boundary', async () => {
    const currentWork: Work = {
      ...createWork('work-1'),
      tracks: [
        {
          id: 'track-muted',
          kind: 'instrument',
          instrument: 'janggu',
          takes: [],
          startedAtBeat: 1,
          volume: 1,
          mute: true,
          solo: false,
          createdAt: '2026-06-25T00:00:00.000Z',
        },
        {
          id: 'track-solo',
          kind: 'accompaniment',
          presetId: 'jungmori',
          bpm: 84,
          startedAtBeat: 4,
          volume: 0.6,
          mute: false,
          solo: true,
          createdAt: '2026-06-25T00:00:00.000Z',
        },
      ],
    };
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      currentWorkId: currentWork.id,
      library: {
        works: [currentWork],
        exportedAudios: [],
        practiceResults: [],
      },
    };
    const playedMixes: Array<{
      workId: string;
      trackIds: string[];
      hasSoloTracks: boolean;
    }> = [];
    const noopServices = createNoopGarakProductServices();
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (
          work: Work,
          mixPlan: { tracks: Array<{ trackId: string }>; hasSoloTracks: boolean },
        ) => {
          playedMixes.push({
            workId: work.id,
            trackIds: mixPlan.tracks.map((track) => track.trackId),
            hasSoloTracks: mixPlan.hasSoloTracks,
          });

          return {
            status: 'ok' as const,
            value: {
              handledTracks: mixPlan.tracks.length,
            },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'playCurrentWorkMix' },
        services,
      }),
    ).resolves.toEqual([]);

    expect(playedMixes).toEqual([
      {
        workId: 'work-1',
        trackIds: ['track-solo'],
        hasSoloTracks: true,
      },
    ]);
  });

  test('surfaces S07 mix preview failures when the current work is missing', async () => {
    const noopServices = createNoopGarakProductServices();
    const playWorkMixCalls: Work[] = [];
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (work: Work) => {
          playWorkMixCalls.push(work);
          return {
            status: 'ok' as const,
            value: { handledTracks: 1 },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: {
          ...createInitialGarakProductState(),
          currentWorkId: 'missing-work',
          library: {
            works: [],
            exportedAudios: [],
            practiceResults: [],
          },
        },
        action: { type: 'playCurrentWorkMix' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'Current work is unavailable.',
      },
    ]);
    expect(playWorkMixCalls).toEqual([]);
  });

  test('surfaces S07 mix preview failures when every work track is muted', async () => {
    const mutedWork: Work = {
      ...createWork('work-muted'),
      tracks: [
        {
          id: 'track-muted',
          kind: 'instrument',
          instrument: 'janggu',
          takes: [],
          startedAtBeat: 1,
          volume: 1,
          mute: true,
          solo: false,
          createdAt: '2026-06-25T00:00:00.000Z',
        },
      ],
    };
    const noopServices = createNoopGarakProductServices();
    const playWorkMixCalls: Work[] = [];
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (work: Work) => {
          playWorkMixCalls.push(work);
          return {
            status: 'ok' as const,
            value: { handledTracks: 0 },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: {
          ...createInitialGarakProductState(),
          currentWorkId: mutedWork.id,
          library: {
            works: [mutedWork],
            exportedAudios: [],
            practiceResults: [],
          },
        },
        action: { type: 'playCurrentWorkMix' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'No audible tracks are available to preview.',
      },
    ]);
    expect(playWorkMixCalls).toEqual([]);
  });

  test('surfaces S07 mix preview failures when every selected track volume is zero', async () => {
    const zeroVolumeWork = createZeroVolumeWork('work-zero-volume-preview');
    const noopServices = createNoopGarakProductServices();
    const playWorkMixCalls: Work[] = [];
    const services = {
      ...noopServices,
      audio: {
        ...noopServices.audio,
        playWorkMix: async (work: Work) => {
          playWorkMixCalls.push(work);
          return {
            status: 'ok' as const,
            value: { handledTracks: 0 },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state: {
          ...createInitialGarakProductState(),
          currentWorkId: zeroVolumeWork.id,
          library: {
            works: [zeroVolumeWork],
            exportedAudios: [],
            practiceResults: [],
          },
        },
        action: { type: 'playCurrentWorkMix' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'failPlayerPlayback',
        message: 'No audible tracks are available to preview.',
      },
    ]);
    expect(playWorkMixCalls).toEqual([]);
  });
});

function createWork(id: string): Work {
  return {
    id,
    title: 'My Arirang',
    createdAt: '2026-06-25T00:00:00.000Z',
    updatedAt: '2026-06-25T00:00:00.000Z',
    source: 'free_creation' as const,
    syncState: 'local_only' as const,
    tracks: [],
  };
}

function createAudibleWork(id: string): Work {
  return {
    ...createWork(id),
    tracks: [
      {
        id: 'track-1',
        kind: 'instrument',
        instrument: 'janggu',
        startedAtBeat: 1,
        volume: 1,
        mute: false,
        solo: false,
        createdAt: '2026-06-25T00:00:00.000Z',
        takes: [
          {
            id: 'take-1',
            events: [{ type: 'string_pluck', tsMs: 120, stringIndex: 2, velocity: 0.7 }],
            startedAtBeat: 1,
            durationBeats: 4,
          },
        ],
      },
    ],
  };
}

function createZeroVolumeWork(id: string): Work {
  const work = createAudibleWork(id);

  return {
    ...work,
    tracks: work.tracks.map((track) => ({ ...track, volume: 0 })),
  };
}

function createMutedReplaySourceWork(id: string): Work {
  const work = createAudibleWork(id);
  const baseTrack = work.tracks[0];
  if (baseTrack?.kind !== 'instrument') {
    throw new Error('Expected createAudibleWork to create an instrument track.');
  }

  return {
    ...work,
    tracks: [
      {
        ...baseTrack,
        id: 'track-muted',
        mute: true,
        takes: [
          {
            id: 'take-muted',
            events: [{ type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 }],
            startedAtBeat: 1,
            durationBeats: 4,
          },
        ],
      },
      {
        ...baseTrack,
        id: 'track-audible',
        mute: false,
        takes: [
          {
            id: 'take-audible',
            events: [{ type: 'string_pluck', tsMs: 160, stringIndex: 4, velocity: 0.8 }],
            startedAtBeat: 1,
            durationBeats: 4,
          },
        ],
      },
    ],
  };
}

function createCapturedWork(id: string): Work {
  const work = createAudibleWork(id);
  const firstTrack = work.tracks[0];
  if (firstTrack?.kind !== 'instrument') {
    throw new Error('Expected createAudibleWork to create an instrument track.');
  }

  return {
    ...work,
    tracks: [
      {
        ...firstTrack,
        takes: firstTrack.takes.map((take) =>
          take.id === 'take-1'
            ? { ...take, recordingUri: 'file://garak/takes/take-1.m4a' }
            : take,
        ),
      },
      ...work.tracks.slice(1),
    ],
  };
}

import { expect, test } from 'vitest';
import type { PerformanceEvent } from '../../domain/performanceEvent';
import { createInitialScreenFlowState } from '../../screen-flow/screenFlowMachine';
import type { Work } from '../../studio/studioTypes';
import type { AiAutoAccompanimentCandidate } from '../aiAutoAccompaniment';
import {
  applyProductAction,
  createInitialGarakProductState,
} from '../garakProductState';
import { getJangdanPresetPanelModel } from '../jangdanPresetPanelModel';

test('tracks the S10B auto accompaniment generation lifecycle without mutating the work', () => {
  const initialState = {
    ...createInitialGarakProductState(),
    currentWorkId: 'work-1',
    screenFlow: createInitialScreenFlowState({
      currentScreen: 'S08',
      history: ['S01', 'S03', 'S04', 'S04A', 'S05', 'S07'],
    }),
    library: {
      works: [createWork()],
      exportedAudios: [],
      practiceResults: [],
    },
  };

  const generatingState = applyProductAction(initialState, { type: 'chooseAccompanimentTrack' });

  expect(generatingState.screenFlow.currentScreen).toBe('S10B');
  expect(generatingState.autoAccompanimentStatus).toEqual({
    status: 'generating',
    stage: 'analyzing',
  });
  expect(generatingState.library.works[0].tracks).toHaveLength(1);

  const candidate = createCandidate();
  const readyState = applyProductAction(generatingState, {
    type: 'completeAutoAccompanimentGeneration',
    candidate,
  });

  expect(readyState.autoAccompanimentStatus).toEqual({
    status: 'candidateReady',
    candidate,
  });
  expect(readyState.library.works[0].tracks).toHaveLength(1);
  expect(getJangdanPresetPanelModel(readyState, 'track').autoAccompaniment?.status).toBe(
    'candidateReady',
  );

  const cancelledState = applyProductAction(readyState, { type: 'cancelAccompanimentTrack' });

  expect(cancelledState.autoAccompanimentStatus).toEqual({ status: 'idle' });
});

test('surfaces auto accompaniment failure while preserving the local jangdan fallback', () => {
  const state = applyProductAction(
    {
      ...createInitialGarakProductState(),
      currentWorkId: 'work-1',
      screenFlow: createInitialScreenFlowState({ currentScreen: 'S10B' }),
      library: {
        works: [createWork()],
        exportedAudios: [],
        practiceResults: [],
      },
    },
    {
      type: 'failAutoAccompanimentGeneration',
      code: 'model_unavailable',
      message: 'AI accompaniment service is not connected.',
    },
  );

  const model = getJangdanPresetPanelModel(state, 'track');

  expect(state.autoAccompanimentStatus).toEqual({
    status: 'failed',
    code: 'model_unavailable',
    message: 'AI accompaniment service is not connected.',
  });
  expect(model.autoAccompaniment?.status).toBe('failed');
  expect(model.manualPresets.length).toBeGreaterThan(0);
});

function createWork(): Work {
  const events: PerformanceEvent[] = [
    { type: 'string_pluck', tsMs: 0, stringIndex: 1, velocity: 0.7 },
  ];

  return {
    id: 'work-1',
    title: 'My Work',
    createdAt: '2026-06-26T00:00:00.000Z',
    updatedAt: '2026-06-26T00:00:00.000Z',
    source: 'free_creation',
    syncState: 'local_only',
    tracks: [
      {
        id: 'track-1',
        kind: 'instrument',
        instrument: 'gayageum',
        startedAtBeat: 1,
        volume: 1,
        mute: false,
        solo: false,
        createdAt: '2026-06-26T00:00:00.000Z',
        takes: [
          {
            id: 'take-1',
            events,
            startedAtBeat: 1,
            durationBeats: 8,
          },
        ],
      },
    ],
  };
}

function createCandidate(): AiAutoAccompanimentCandidate {
  return {
    id: 'candidate-1',
    status: 'ready',
    sourceWorkId: 'work-1',
    sourceTrackId: 'track-1',
    sourceTakeId: 'take-1',
    sourceInstrument: 'gayageum',
    analysis: {
      jo: 'pyeongjo',
      jangdan: 'jungmori',
      bpm: 84,
      confidence: 0.86,
    },
    generatedTracks: [
      {
        instrument: 'daegeum',
        role: 'melody',
        audioUri: 'file://garak/daegeum.wav',
        volume: 0.7,
        startedAtBeat: 1,
      },
      {
        instrument: 'janggu',
        role: 'rhythm',
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
}

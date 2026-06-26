import { describe, expect, test } from 'vitest';
import type { PerformanceEvent } from '../../domain/performanceEvent';
import { createInitialScreenFlowState } from '../../screen-flow/screenFlowMachine';
import type { Work } from '../../studio/studioTypes';
import type { GarakProductState, ProductLibraryState } from '../garakProductState';
import {
  applyProductAction,
  createInitialGarakProductState,
} from '../garakProductState';
import {
  createInMemoryGarakProductServices,
  createNoopGarakProductServices,
} from '../garakProductServices';
import { runGarakProductEffect } from '../garakProductEffects';

describe('Garak product effect runner', () => {
  test('persists the post-reducer library snapshot after local library mutations', async () => {
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
        works: [createWork('work-1')],
      },
    };
    const action = { type: 'exportCurrentWork' } as const;
    const nextState = applyProductAction(workState, action);

    const followUpActions = await runGarakProductEffect({
      state: nextState,
      action,
      services,
    });

    await expect(services.library.loadSnapshot()).resolves.toEqual(nextState.library);
    expect(followUpActions).toEqual([]);
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
    const services = {
      ...createNoopGarakProductServices(),
      ai: {
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
        requestPracticeFeedback: async () => ({ status: 'unavailable' as const }),
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
        type: 'previewJangdanPreset',
        mode: 'track',
        presetId: 'semachi',
        bpm: 96,
        volume: 0.72,
      },
    ]);
  });

  test('requests AI practice feedback after a completed practice attempt', async () => {
    const events: PerformanceEvent[] = [
      { type: 'string_pluck', tsMs: 0, stringIndex: 1, velocity: 0.7 },
    ];
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      language: 'ko',
      selectedPracticeSongId: 'arirang',
      selectedInstrument: 'gayageum',
      practiceAttempt: {
        songId: 'arirang',
        instrument: 'gayageum',
        status: 'completed',
        completedAt: '2026-06-25T00:00:01.000Z',
        guideEvents: [],
        inputEvents: events,
        timingErrorsMs: [],
      },
    };
    const services = {
      ...createNoopGarakProductServices(),
      ai: {
        recommendAccompaniment: async () => ({ status: 'unavailable' as const }),
        requestPracticeFeedback: async (input: {
          sessionId: string;
          accuracyScore: number;
          songName: string;
          locale: 'ko' | 'en';
          events: readonly PerformanceEvent[];
        }) => {
          expect(input).toEqual({
            sessionId: 'practice-arirang-1782345601000',
            accuracyScore: 17,
            songName: '아리랑',
            locale: 'ko',
            events,
          });
          return {
            status: 'ok' as const,
            value: {
              feedbackText: 'AI가 장단 흐름을 분석했어요.',
            },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'finishPractice' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'receiveAiPracticeFeedback',
        feedbackText: 'AI가 장단 흐름을 분석했어요.',
      },
    ]);
  });

  test('requests audio export and returns a URI update action', async () => {
    const work = createWork('work-1');
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      currentWorkId: 'work-1',
      selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
      library: {
        works: [work],
        exportedAudios: [],
        practiceResults: [],
      },
    };
    const services = {
      ...createNoopGarakProductServices(),
      audio: {
        exportWorkAudio: async (input: Work) => {
          expect(input).toBe(work);
          return {
            status: 'ok' as const,
            value: { audioUri: 'https://cdn.garak.test/export-1.wav' },
          };
        },
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'exportCurrentWork' },
        services,
      }),
    ).resolves.toEqual([
      {
        type: 'receiveExportedAudioUri',
        exportedAudioId: 'export-1',
        audioUri: 'https://cdn.garak.test/export-1.wav',
      },
    ]);
  });

  test('publishes selected share targets through the share service port', async () => {
    const published: Array<{
      kind: 'exportedAudio' | 'practiceResult';
      id: string;
      sessionId?: string;
    }> = [];
    const state: GarakProductState = {
      ...createInitialGarakProductState(),
      selectedPlayerItem: { kind: 'practiceResult', practiceResultId: 'practice-1' },
    };
    const services = {
      ...createNoopGarakProductServices(),
      share: {
        publishShareTarget: async (target: {
          kind: 'exportedAudio' | 'practiceResult';
          id: string;
          sessionId?: string;
        }) => {
          published.push(target);
          return { status: 'ok' as const, value: { remoteId: 'remote-practice-1' } };
        },
        loadFeed: async () => ({ status: 'unavailable' as const }),
      },
    };

    await expect(
      runGarakProductEffect({
        state,
        action: { type: 'publishShareTarget' },
        services,
      }),
    ).resolves.toEqual([]);
    expect(published).toEqual([
      { kind: 'practiceResult', id: 'practice-1', sessionId: 'practice-1' },
    ]);
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

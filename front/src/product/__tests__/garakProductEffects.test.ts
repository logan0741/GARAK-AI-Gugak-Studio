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

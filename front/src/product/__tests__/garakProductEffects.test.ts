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

  test('saves the current work before exporting audio for Save & Share', async () => {
    const services = createInMemoryGarakProductServices();
    const workState = {
      ...createInitialGarakProductState({
        now: () => '2026-06-26T00:00:00.000Z',
      }),
      screenFlow: createInitialScreenFlowState({ currentScreen: 'S07' }),
      currentWorkId: 'work-1',
      library: {
        works: [createWork('work-1')],
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
      },
    ]);
    await expect(services.library.loadSnapshot()).resolves.toEqual(nextState.library);
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
        playPerformanceEvents: async (inputEvents: readonly PerformanceEvent[]) => {
          playedEvents = inputEvents;
          return {
            status: 'ok' as const,
            value: { handledEvents: inputEvents.length },
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

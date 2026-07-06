import { describe, expect, test } from 'vitest';
import {
  addInstrumentTrack,
  autoSaveTakeAsWork,
  createWorkMixPlan,
  toggleWorkTrackMute,
  toggleWorkTrackSolo,
} from '../../studio/studioLibrary';
import type { Work } from '../../studio/studioTypes';
import type { ProductLibraryState } from '../garakProductState';
import {
  createInMemoryGarakProductServices,
  createNoopGarakProductServices,
} from '../garakProductServices';
import {
  createExpoFileSystemRecordingCaptureStoragePort,
  createLocalGarakProductServices,
} from '../localGarakProductServices';
import { createSharedRecordingLibraryAudioUri } from '../libraryPlaybackAudio';

describe('Garak product service ports', () => {
  test('stores and reloads library snapshots through the public service contract', async () => {
    const services = createInMemoryGarakProductServices();
    const snapshot: ProductLibraryState = {
      works: [],
      exportedAudios: [],
      practiceResults: [],
    };

    await services.library.saveSnapshot(snapshot);

    await expect(services.library.loadSnapshot()).resolves.toEqual(snapshot);
  });

  test('keeps persisted library snapshots isolated from caller mutation', async () => {
    const services = createInMemoryGarakProductServices();
    const snapshot: ProductLibraryState = {
      works: [],
      exportedAudios: [],
      practiceResults: [],
    };

    await services.library.saveSnapshot(snapshot);
    snapshot.works.push({
      id: 'caller-mutation',
      title: 'Mutated Work',
      createdAt: '2026-06-25T00:00:00.000Z',
      updatedAt: '2026-06-25T00:00:00.000Z',
      source: 'free_creation',
      tracks: [],
      syncState: 'local_only',
    });

    await expect(services.library.loadSnapshot()).resolves.toEqual({
      works: [],
      exportedAudios: [],
      practiceResults: [],
    });
  });

  test('noop services expose unavailable backend and AI boundaries without throwing', async () => {
    const services = createNoopGarakProductServices();

    await expect(services.account.loginAndLoadLibrary()).resolves.toEqual({
      status: 'unavailable',
    });
    await expect(services.ai.recommendAccompaniment({ events: [] })).resolves.toEqual({
      status: 'unavailable',
    });
    await expect(
      services.ai.generateAutoAccompaniment({
        requestId: 'request-1',
        source: 's10b_auto_accompaniment',
        workId: 'work-1',
        sourceTrackId: 'track-1',
        sourceTakeId: 'take-1',
        sourceInstrument: 'gayageum',
        events: [],
        options: {
          outputKind: 'ensemble_wav_candidate',
          maxCandidates: 1,
          temperature: 0.7,
        },
      }),
    ).resolves.toEqual({
      status: 'unavailable',
    });
    await expect(
      services.share.publishShareTarget({
        target: { kind: 'practiceResult', id: 'practice-1' },
        title: 'Practice result',
        message: 'Practice result',
      }),
    ).resolves.toEqual({
      status: 'unavailable',
    });
    await expect(
      services.audio.playPerformanceEvents({ instrument: 'gayageum', events: [] }),
    ).resolves.toEqual({
      status: 'unavailable',
    });
    const work = createWork('work-1');
    await expect(services.audio.playWorkMix(work, createWorkMixPlan(work))).resolves.toEqual({
      status: 'unavailable',
    });
  });

  test('local services persist snapshots and publish share metadata with an expiring link', async () => {
    const values = new Map<string, string>();
    const shareCalls: Array<{ title?: string; message: string; url?: string }> = [];
    const services = createLocalGarakProductServices({
      storage: {
        getItem: async (key) => values.get(key) ?? null,
        setItem: async (key, value) => {
          values.set(key, value);
        },
        deleteItem: async (key) => {
          values.delete(key);
        },
      },
      share: async (content) => {
        shareCalls.push(content);
      },
      nowMs: () => 1000,
      createRemoteId: () => 'uuid-share-1',
    });
    const snapshot: ProductLibraryState = {
      works: [],
      exportedAudios: [],
      practiceResults: [],
    };

    await services.library.saveSnapshot(snapshot);
    await expect(services.library.loadSnapshot()).resolves.toEqual(snapshot);

    await expect(
      services.share.publishShareTarget({
        target: { kind: 'exportedAudio', id: 'export-1' },
        title: 'My Export',
        message: 'My Export - GARAK',
        fileUri: 'file://garak/export-1.wav',
      }),
    ).resolves.toEqual({
      status: 'ok',
      value: {
        remoteId: 'uuid-share-1',
        shareUrl: 'https://garak.local/share/uuid-share-1',
        expiresAtMs: 604801000,
        shareMethod: 'file',
      },
    });
    expect(shareCalls).toEqual([
      {
        title: 'My Export',
        message: 'My Export - GARAK\nhttps://garak.local/share/uuid-share-1',
        url: 'file://garak/export-1.wav',
      },
    ]);
  });

  test('local services strip non-file recording URIs when loading persisted snapshots', async () => {
    const capturedWork = autoSaveTakeAsWork({
      workId: 'work-1',
      trackId: 'track-1',
      takeId: 'take-1',
      title: 'Persisted Capture Work',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'https://example.com/not-a-local-capture.m4a',
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });
    const snapshot: ProductLibraryState = {
      works: [capturedWork],
      exportedAudios: [],
      practiceResults: [],
    };
    const services = createLocalGarakProductServices({
      storage: createStaticSnapshotStorage(snapshot),
    });

    await expect(services.library.loadSnapshot()).resolves.toEqual({
      works: [
        {
          ...capturedWork,
          tracks: [
            {
              ...capturedWork.tracks[0],
              takes:
                capturedWork.tracks[0].kind === 'instrument'
                  ? [{ ...capturedWork.tracks[0].takes[0], recordingUri: undefined }]
                  : [],
            },
          ],
        },
      ],
      exportedAudios: [],
      practiceResults: [],
    });
  });

  test('local services downgrade stale audio capture exports when persisted source evidence is invalid', async () => {
    const capturedWork = autoSaveTakeAsWork({
      workId: 'work-1',
      trackId: 'track-1',
      takeId: 'take-1',
      title: 'Persisted Export Work',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'https://example.com/not-a-local-capture.m4a',
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });
    const snapshot: ProductLibraryState = {
      works: [capturedWork],
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: 'Persisted Export',
          durationSeconds: 8,
          instrumentNames: ['janggu'],
          createdAt: '2026-07-04T10:01:00.000Z',
          audioUri: 'https://example.com/not-a-local-capture.m4a',
          renderKind: 'audio_capture',
          sourceTakeId: 'take-1',
          sourceRecordingUri: 'https://example.com/not-a-local-capture.m4a',
          shareState: 'ready',
        },
      ],
      practiceResults: [],
    };
    const services = createLocalGarakProductServices({
      storage: createStaticSnapshotStorage(snapshot),
    });

    await expect(services.library.loadSnapshot()).resolves.toMatchObject({
      exportedAudios: [
        {
          id: 'export-1',
          audioUri: expect.stringMatching(/^garak:\/\/library-demo\/export-/),
          renderKind: 'event_replay',
          sourceTakeId: 'take-1',
        },
      ],
    });
    const loaded = await services.library.loadSnapshot();
    expect(loaded.exportedAudios[0].sourceRecordingUri).toBeUndefined();
  });

  test('local services downgrade file audio capture exports when a source take has instrument events', async () => {
    const capturedWork = autoSaveTakeAsWork({
      workId: 'work-1',
      trackId: 'track-1',
      takeId: 'take-1',
      title: 'Persisted File Export Work',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/take-1.m4a',
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });
    const snapshot: ProductLibraryState = {
      works: [capturedWork],
      exportedAudios: [
        {
          id: 'export-file-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: 'Persisted File Export',
          durationSeconds: 8,
          instrumentNames: ['janggu'],
          createdAt: '2026-07-04T10:01:00.000Z',
          audioUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/take-1.m4a',
          renderKind: 'audio_capture',
          sourceTakeId: 'take-1',
          sourceRecordingUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/take-1.m4a',
          shareState: 'ready',
        },
      ],
      practiceResults: [],
    };
    const services = createLocalGarakProductServices({
      storage: createStaticSnapshotStorage(snapshot),
    });

    const loaded = await services.library.loadSnapshot();

    expect(loaded.exportedAudios[0]).toMatchObject({
      id: 'export-file-1',
      audioUri: expect.stringMatching(/^garak:\/\/library-demo\/export-/),
      renderKind: 'event_replay',
      sourceTakeId: 'take-1',
    });
    expect(loaded.exportedAudios[0].sourceRecordingUri).toBeUndefined();
  });

  test('local services keep file-backed capture exports after the export file is copied', async () => {
    const capturedWork = autoSaveTakeAsWork({
      workId: 'work-copied-capture',
      trackId: 'track-1',
      takeId: 'take-1',
      title: 'Persisted Copied Capture Work',
      instrument: 'janggu',
      events: [],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/take-1.m4a',
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });
    const snapshot: ProductLibraryState = {
      works: [capturedWork],
      exportedAudios: [
        {
          id: 'export-copied-capture-1',
          kind: 'exported_audio',
          workId: 'work-copied-capture',
          title: 'Persisted Copied Capture Export',
          durationSeconds: 8,
          instrumentNames: ['janggu'],
          createdAt: '2026-07-04T10:01:00.000Z',
          audioUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-exports/export-1.m4a',
          renderKind: 'audio_capture',
          sourceTakeId: 'take-1',
          sourceRecordingUri:
            'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/take-1.m4a',
          shareState: 'ready',
        },
      ],
      practiceResults: [],
    };
    const services = createLocalGarakProductServices({
      storage: createStaticSnapshotStorage(snapshot),
    });

    const loaded = await services.library.loadSnapshot();

    expect(loaded.exportedAudios[0]).toMatchObject({
      id: 'export-copied-capture-1',
      audioUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-exports/export-1.m4a',
      renderKind: 'audio_capture',
      sourceTakeId: 'take-1',
      sourceRecordingUri:
        'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/take-1.m4a',
    });
  });

  test('local services preserve full source mix event count when downgrading layered capture exports', async () => {
    const capturedWork = autoSaveTakeAsWork({
      workId: 'work-layered-capture',
      trackId: 'track-1',
      takeId: 'take-1',
      title: 'Persisted Layered Capture Work',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/take-1.m4a',
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });
    const layeredWork = addInstrumentTrack(capturedWork, {
      trackId: 'track-2',
      takeId: 'take-2',
      instrument: 'gayageum',
      events: [{ type: 'string_pluck', tsMs: 200, stringIndex: 5, velocity: 0.7 }],
      createdAt: '2026-07-04T10:01:00.000Z',
      durationBeats: 4,
    });
    const snapshot: ProductLibraryState = {
      works: [layeredWork],
      exportedAudios: [
        {
          id: 'export-layered-file-1',
          kind: 'exported_audio',
          workId: layeredWork.id,
          title: 'Persisted Layered File Export',
          durationSeconds: 8,
          instrumentNames: ['janggu', 'gayageum'],
          createdAt: '2026-07-04T10:02:00.000Z',
          audioUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/take-1.m4a',
          renderKind: 'audio_capture',
          sourceTakeId: 'take-1',
          sourceRecordingUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/take-1.m4a',
          shareState: 'ready',
        },
      ],
      practiceResults: [],
    };
    const services = createLocalGarakProductServices({
      storage: createStaticSnapshotStorage(snapshot),
    });

    const loaded = await services.library.loadSnapshot();

    expect(loaded.exportedAudios[0]).toMatchObject({
      id: 'export-layered-file-1',
      audioUri: expect.stringMatching(/^garak:\/\/library-demo\/export-/),
      renderKind: 'event_replay',
      sourceTakeId: 'take-1',
      sourceEventCount: 2,
    });
    expect(loaded.exportedAudios[0].sourceRecordingUri).toBeUndefined();
  });

  test('local services do not downgrade capture exports to event replay when source events are muted', async () => {
    const capturedWork = autoSaveTakeAsWork({
      workId: 'work-muted-capture',
      trackId: 'track-1',
      takeId: 'take-1',
      title: 'Persisted Muted Capture Work',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/take-1.m4a',
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });
    const mutedWork: Work = {
      ...capturedWork,
      tracks: capturedWork.tracks.map((track) =>
        track.id === 'track-1' ? { ...track, mute: true } : track,
      ),
    };
    const snapshot: ProductLibraryState = {
      works: [mutedWork],
      exportedAudios: [
        {
          id: 'export-muted-capture-1',
          kind: 'exported_audio',
          workId: mutedWork.id,
          title: 'Persisted Muted Capture Export',
          durationSeconds: 8,
          instrumentNames: ['janggu'],
          createdAt: '2026-07-04T10:02:00.000Z',
          audioUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/take-1.m4a',
          renderKind: 'audio_capture',
          sourceTakeId: 'take-1',
          sourceRecordingUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/take-1.m4a',
          shareState: 'ready',
        },
      ],
      practiceResults: [],
    };
    const services = createLocalGarakProductServices({
      storage: createStaticSnapshotStorage(snapshot),
    });

    const loaded = await services.library.loadSnapshot();

    expect(loaded.exportedAudios[0]).toMatchObject({
      id: 'export-muted-capture-1',
      audioUri: expect.stringMatching(/^garak:\/\/library-demo\/export-/),
      renderKind: 'demo_sample',
    });
    expect(loaded.exportedAudios[0].sourceTakeId).toBeUndefined();
    expect(loaded.exportedAudios[0].sourceEventCount).toBeUndefined();
    expect(loaded.exportedAudios[0].sourceRecordingUri).toBeUndefined();
  });

  test('local services normalize persisted event replay exports before exposing them to the library', async () => {
    const work = autoSaveTakeAsWork({
      workId: 'work-1',
      trackId: 'track-1',
      takeId: 'take-1',
      title: 'Persisted Replay Work',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });
    const snapshot: ProductLibraryState = {
      works: [work],
      exportedAudios: [
        {
          id: 'export-valid-replay',
          kind: 'exported_audio',
          workId: work.id,
          title: 'Valid Replay',
          durationSeconds: 8,
          instrumentNames: ['janggu'],
          createdAt: '2026-07-04T10:01:00.000Z',
          audioUri: 'placeholder://event-replay.wav',
          renderKind: 'event_replay',
          sourceTakeId: 'take-1',
          sourceEventCount: 1,
          sourceRecordingUri: 'file://garak/should-not-survive.m4a',
          shareState: 'ready',
        },
        {
          id: 'export-stale-replay',
          kind: 'exported_audio',
          workId: work.id,
          title: 'Stale Replay',
          durationSeconds: 8,
          instrumentNames: ['janggu'],
          createdAt: '2026-07-04T10:02:00.000Z',
          audioUri: 'garak://library-demo/export-fallback',
          renderKind: 'event_replay',
          sourceTakeId: 'missing-take',
          shareState: 'ready',
        },
      ],
      practiceResults: [],
    };
    const services = createLocalGarakProductServices({
      storage: createStaticSnapshotStorage(snapshot),
    });

    const loaded = await services.library.loadSnapshot();

    expect(loaded.exportedAudios[0]).toMatchObject({
      id: 'export-valid-replay',
      audioUri: expect.stringMatching(/^garak:\/\/library-demo\/export-/),
      renderKind: 'event_replay',
      sourceTakeId: 'take-1',
      sourceEventCount: 1,
    });
    expect(loaded.exportedAudios[0].sourceRecordingUri).toBeUndefined();
    expect(loaded.exportedAudios[1]).toMatchObject({
      id: 'export-stale-replay',
      audioUri: expect.stringMatching(/^garak:\/\/library-demo\/export-/),
      renderKind: 'demo_sample',
    });
    expect(loaded.exportedAudios[1].sourceTakeId).toBeUndefined();
  });

  test('local recording capture service can be injected for the product recording flow', async () => {
    const captureCalls: string[] = [];
    const services = createLocalGarakProductServices({
      recordingCapture: {
        startRecordingCapture: async (input) => {
          captureCalls.push(`start:${input.instrument}:${input.recordingSetup.presetId}`);
          return { status: 'ok', value: { started: true } };
        },
        stopRecordingCapture: async () => {
          captureCalls.push('stop');
          return {
            status: 'ok',
            value: {
              recordingUri: 'file://garak/takes/take-1.m4a',
              durationSeconds: 8,
            },
          };
        },
        discardRecordingCapture: async () => {
          captureCalls.push('discard');
          return { status: 'ok', value: { discarded: true } };
        },
      },
    });

    await expect(
      services.audio.startRecordingCapture({
        instrument: 'janggu',
        recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
      }),
    ).resolves.toEqual({ status: 'ok', value: { started: true } });
    await expect(services.audio.stopRecordingCapture()).resolves.toEqual({
      status: 'ok',
      value: {
        recordingUri: 'file://garak/takes/take-1.m4a',
        durationSeconds: 8,
      },
    });
    await expect(services.audio.discardRecordingCapture()).resolves.toEqual({
      status: 'ok',
      value: { discarded: true },
    });
    expect(captureCalls).toEqual(['start:janggu:semachi', 'stop', 'discard']);
  });

  test('local recording capture stop waits for an in-flight start before stopping', async () => {
    let releaseStart: (() => void) | undefined;
    const startGate = new Promise<void>((resolve) => {
      releaseStart = resolve;
    });
    const captureCalls: string[] = [];
    const services = createLocalGarakProductServices({
      recordingCapture: {
        startRecordingCapture: async (input) => {
          captureCalls.push(`start:${input.instrument}`);
          await startGate;
          captureCalls.push('start:ready');
          return { status: 'ok', value: { started: true } };
        },
        stopRecordingCapture: async () => {
          captureCalls.push('stop');
          return {
            status: 'ok',
            value: {
              recordingUri: 'file://garak/takes/take-1.m4a',
              durationSeconds: 8,
            },
          };
        },
        discardRecordingCapture: async () => ({ status: 'ok', value: { discarded: true } }),
      },
    });

    const startPromise = services.audio.startRecordingCapture({
      instrument: 'janggu',
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });
    await Promise.resolve();

    const stopPromise = services.audio.stopRecordingCapture();
    await Promise.resolve();

    expect(captureCalls).toEqual(['start:janggu']);

    releaseStart?.();

    await expect(startPromise).resolves.toEqual({ status: 'ok', value: { started: true } });
    await expect(stopPromise).resolves.toEqual({
      status: 'ok',
      value: {
        recordingUri: 'file://garak/takes/take-1.m4a',
        durationSeconds: 8,
      },
    });
    expect(captureCalls).toEqual(['start:janggu', 'start:ready', 'stop']);
  });

  test('local recording capture treats a duplicate in-flight start as the same capture', async () => {
    let releaseStart: (() => void) | undefined;
    const startGate = new Promise<void>((resolve) => {
      releaseStart = resolve;
    });
    const captureCalls: string[] = [];
    const services = createLocalGarakProductServices({
      recordingCapture: {
        startRecordingCapture: async (input) => {
          captureCalls.push(`start:${input.instrument}`);
          await startGate;
          captureCalls.push('start:ready');
          return { status: 'ok', value: { started: true } };
        },
        stopRecordingCapture: async () => ({
          status: 'ok',
          value: {
            recordingUri: 'file://garak/takes/take-1.m4a',
            durationSeconds: 8,
          },
        }),
        discardRecordingCapture: async () => ({ status: 'ok', value: { discarded: true } }),
      },
    });

    const firstStart = services.audio.startRecordingCapture({
      instrument: 'janggu',
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });
    await Promise.resolve();
    const duplicateStart = services.audio.startRecordingCapture({
      instrument: 'janggu',
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });
    await Promise.resolve();

    expect(captureCalls).toEqual(['start:janggu']);

    releaseStart?.();

    await expect(firstStart).resolves.toEqual({ status: 'ok', value: { started: true } });
    await expect(duplicateStart).resolves.toEqual({ status: 'ok', value: { started: true } });
    expect(captureCalls).toEqual(['start:janggu', 'start:ready']);
  });

  test('local recording capture can persist the returned recording uri before product state stores it', async () => {
    const storageInputs: unknown[] = [];
    const services = createLocalGarakProductServices({
      nowMs: () => 1783179000000,
      recordingCapture: {
        startRecordingCapture: async () => ({ status: 'ok', value: { started: true } }),
        stopRecordingCapture: async () => ({
          status: 'ok',
          value: {
            recordingUri: 'file://cache/recording-temp.m4a',
            durationSeconds: 8,
          },
        }),
        discardRecordingCapture: async () => ({ status: 'ok', value: { discarded: true } }),
      },
      recordingCaptureStorage: {
        persistRecordingCapture: async (input) => {
          storageInputs.push(input);
          return {
            status: 'ok',
            value: {
              recordingUri: 'file://document/garak/recording-temp.m4a',
            },
          };
        },
      },
    });

    await expect(
      services.audio.startRecordingCapture({
        instrument: 'janggu',
        recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
      }),
    ).resolves.toEqual({ status: 'ok', value: { started: true } });
    await expect(services.audio.stopRecordingCapture()).resolves.toEqual({
      status: 'ok',
      value: {
        recordingUri: 'file://document/garak/recording-temp.m4a',
        durationSeconds: 8,
      },
    });
    expect(storageInputs).toEqual([
      {
        recordingUri: 'file://cache/recording-temp.m4a',
        durationSeconds: 8,
        capturedAtMs: 1783179000000,
      },
    ]);
  });

  test('local recording capture falls back to elapsed session time when native duration is zero', async () => {
    const storageInputs: unknown[] = [];
    const nowValues = [1000, 3500, 4000];
    let nowIndex = 0;
    const services = createLocalGarakProductServices({
      nowMs: () => nowValues[Math.min(nowIndex++, nowValues.length - 1)] ?? 4000,
      recordingCapture: {
        startRecordingCapture: async () => ({ status: 'ok', value: { started: true } }),
        stopRecordingCapture: async () => ({
          status: 'ok',
          value: {
            recordingUri: 'file://cache/recording-temp.m4a',
            durationSeconds: 0,
          },
        }),
        discardRecordingCapture: async () => ({ status: 'ok', value: { discarded: true } }),
      },
      recordingCaptureStorage: {
        persistRecordingCapture: async (input) => {
          storageInputs.push(input);
          return {
            status: 'ok',
            value: {
              recordingUri: 'file://document/garak/recording-temp.m4a',
            },
          };
        },
      },
    });

    await expect(
      services.audio.startRecordingCapture({
        instrument: 'janggu',
        recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
      }),
    ).resolves.toEqual({ status: 'ok', value: { started: true } });
    await expect(services.audio.stopRecordingCapture()).resolves.toEqual({
      status: 'ok',
      value: {
        recordingUri: 'file://document/garak/recording-temp.m4a',
        durationSeconds: 2.5,
      },
    });
    expect(storageInputs).toEqual([
      {
        recordingUri: 'file://cache/recording-temp.m4a',
        durationSeconds: 2.5,
        capturedAtMs: 4000,
      },
    ]);
  });

  test('local recording capture does not expose an unpersisted cache uri when storage fails', async () => {
    const services = createLocalGarakProductServices({
      nowMs: () => 1783179000000,
      recordingCapture: {
        startRecordingCapture: async () => ({ status: 'ok', value: { started: true } }),
        stopRecordingCapture: async () => ({
          status: 'ok',
          value: {
            recordingUri: 'file://cache/recording-temp.m4a',
            durationSeconds: 8,
          },
        }),
        discardRecordingCapture: async () => ({ status: 'ok', value: { discarded: true } }),
      },
      recordingCaptureStorage: {
        persistRecordingCapture: async () => ({
          status: 'error',
          message: 'document directory is unavailable',
        }),
      },
    });

    await expect(
      services.audio.startRecordingCapture({
        instrument: 'janggu',
        recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
      }),
    ).resolves.toEqual({ status: 'ok', value: { started: true } });
    await expect(services.audio.stopRecordingCapture()).resolves.toEqual({
      status: 'error',
      message: 'Recording capture could not be saved: document directory is unavailable',
    });
  });

  test('file-system recording capture storage copies captures into a GARAK document directory', async () => {
    const fileSystemCalls: unknown[] = [];
    const storage = createExpoFileSystemRecordingCaptureStoragePort({
      documentDirectory: 'file:///document/',
      makeDirectoryAsync: async (uri, options) => {
        fileSystemCalls.push({ type: 'mkdir', uri, options });
      },
      copyAsync: async (input) => {
        fileSystemCalls.push({ type: 'copy', ...input });
      },
    });

    await expect(
      storage.persistRecordingCapture({
        recordingUri: 'file:///cache/Recording 1.m4a',
        durationSeconds: 8,
        capturedAtMs: 1783179000000,
      }),
    ).resolves.toEqual({
      status: 'ok',
      value: {
        recordingUri: 'file:///document/garak-recordings/1783179000000-Recording-1.m4a',
      },
    });
    expect(fileSystemCalls).toEqual([
      {
        type: 'mkdir',
        uri: 'file:///document/garak-recordings',
        options: { intermediates: true },
      },
      {
        type: 'copy',
        from: 'file:///cache/Recording 1.m4a',
        to: 'file:///document/garak-recordings/1783179000000-Recording-1.m4a',
      },
    ]);
  });

  test('local services keep recording capture event-only unless a native capture port is injected', async () => {
    const services = createLocalGarakProductServices();

    await expect(
      services.audio.startRecordingCapture({
        instrument: 'janggu',
        recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
      }),
    ).resolves.toEqual({ status: 'unavailable' });
    await expect(services.audio.stopRecordingCapture()).resolves.toEqual({ status: 'unavailable' });
    await expect(services.audio.discardRecordingCapture()).resolves.toEqual({
      status: 'ok',
      value: { discarded: false },
    });
  });

  test('local export prefers event replay over a mic capture recording uri', async () => {
    const services = createLocalGarakProductServices();
    const work = autoSaveTakeAsWork({
      workId: 'work-1',
      trackId: 'track-1',
      takeId: 'take-1',
      title: 'Captured Work',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'file://garak/takes/take-1.m4a',
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });

    const result = await services.audio.exportWorkAudio(work);

    expect(result).toMatchObject({
      status: 'ok',
      value: {
        renderKind: 'event_replay',
        sourceTakeId: 'take-1',
      },
    });
    expect(result).not.toMatchObject({
      value: {
        sourceRecordingUri: 'file://garak/takes/take-1.m4a',
      },
    });
  });

  test('local export treats non-file recording URIs as event replay instead of audio capture', async () => {
    const services = createLocalGarakProductServices();
    const work = autoSaveTakeAsWork({
      workId: 'work-1',
      trackId: 'track-1',
      takeId: 'take-1',
      title: 'Captured Work',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'https://example.com/not-a-capture.m4a',
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });

    const result = await services.audio.exportWorkAudio(work);

    expect(result).toMatchObject({
      status: 'ok',
      value: {
        renderKind: 'event_replay',
        sourceTakeId: 'take-1',
      },
    });
    expect(result.status === 'ok' ? result.value.sourceRecordingUri : undefined).toBeUndefined();
  });

  test('local work mix preview replays instrument events before mic capture audio', async () => {
    const playedEvents: unknown[] = [];
    const work = autoSaveTakeAsWork({
      workId: 'work-1',
      trackId: 'track-1',
      takeId: 'take-1',
      title: 'Captured Work',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'file://garak/takes/take-1.m4a',
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });
    const services = createLocalGarakProductServices({
      liveAudio: {
        prepareLivePerformanceAudio: async (input) => ({
          status: 'ok' as const,
          value: {
            instrument: input.instrument,
            sampleSourceLabel: 'test sampler',
            releaseReady: true,
          },
        }),
        playPerformanceEvents: async (input) => {
          playedEvents.push(input);
          return { status: 'ok' as const, value: { handledEvents: input.events.length } };
        },
      },
      libraryAudio: {
        playLibraryAudio: async () => {
          throw new Error('Expected instrument event replay instead of mic capture audio.');
        },
        pauseLibraryAudio: async () => ({ status: 'ok', value: { paused: true } }),
      },
    });

    await expect(services.audio.playWorkMix(work, createWorkMixPlan(work))).resolves.toEqual({
      status: 'ok',
      value: { handledTracks: 1 },
    });
    expect(playedEvents).toEqual([
      {
        instrument: 'janggu',
        events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      },
    ]);
  });

  test('local event replay work mix preview applies track volume before mic capture audio', async () => {
    const playedEvents: unknown[] = [];
    const capturedWork = autoSaveTakeAsWork({
      workId: 'work-captured-volume',
      trackId: 'track-1',
      takeId: 'take-1',
      title: 'Captured Quiet Work',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'file://garak/takes/take-1.m4a',
      recordingSetup: { presetId: 'semachi', bpm: 84, beatUnit: '4/4' },
    });
    const work = {
      ...capturedWork,
      tracks: capturedWork.tracks.map((track) => ({ ...track, volume: 0.35 })),
    };
    const services = createLocalGarakProductServices({
      liveAudio: {
        prepareLivePerformanceAudio: async (input) => ({
          status: 'ok' as const,
          value: {
            instrument: input.instrument,
            sampleSourceLabel: 'test sampler',
            releaseReady: true,
          },
        }),
        playPerformanceEvents: async (input) => {
          playedEvents.push(input);
          return { status: 'ok' as const, value: { handledEvents: input.events.length } };
        },
      },
      libraryAudio: {
        playLibraryAudio: async () => {
          throw new Error('Expected instrument event replay instead of mic capture audio.');
        },
        pauseLibraryAudio: async () => ({ status: 'ok', value: { paused: true } }),
      },
    });

    await expect(services.audio.playWorkMix(work, createWorkMixPlan(work))).resolves.toEqual({
      status: 'ok',
      value: { handledTracks: 1 },
    });
    expect(playedEvents).toEqual([
      {
        instrument: 'janggu',
        events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.28 }],
      },
    ]);
  });

  test('local work mix preview rejects zero-volume mixes instead of reporting silent success', async () => {
    const work = autoSaveTakeAsWork({
      workId: 'work-zero-volume-preview',
      trackId: 'track-1',
      takeId: 'take-1',
      title: 'Zero Volume Preview',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'file://garak/takes/take-1.m4a',
    });
    const zeroVolumeWork: Work = {
      ...work,
      tracks: work.tracks.map((track) => ({ ...track, volume: 0 })),
    };
    const services = createLocalGarakProductServices({
      liveAudio: {
        prepareLivePerformanceAudio: async (input) => ({
          status: 'ok' as const,
          value: {
            instrument: input.instrument,
            sampleSourceLabel: 'test sampler',
            releaseReady: true,
          },
        }),
        playPerformanceEvents: async () => {
          throw new Error('Expected zero-volume preview to avoid event playback.');
        },
      },
      libraryAudio: {
        playLibraryAudio: async () => {
          throw new Error('Expected zero-volume preview to avoid fallback playback.');
        },
        pauseLibraryAudio: async () => ({ status: 'ok', value: { paused: true } }),
      },
    });

    await expect(
      services.audio.playWorkMix(zeroVolumeWork, createWorkMixPlan(zeroVolumeWork)),
    ).resolves.toEqual({
      status: 'error',
      message: 'No audible tracks are available to preview.',
    });
  });

  test('local export rejects zero-volume mixes instead of creating a fallback artifact', async () => {
    const work = autoSaveTakeAsWork({
      workId: 'work-zero-volume-export',
      trackId: 'track-1',
      takeId: 'take-1',
      title: 'Zero Volume Export',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'file://garak/takes/take-1.m4a',
    });
    const zeroVolumeWork: Work = {
      ...work,
      tracks: work.tracks.map((track) => ({ ...track, volume: 0 })),
    };
    const services = createLocalGarakProductServices();

    await expect(services.audio.exportWorkAudio(zeroVolumeWork)).resolves.toEqual({
      status: 'error',
      message: 'No audible tracks are available to export.',
    });
  });

  test('local work mix preview rejects accompaniment-only mixes instead of playing fallback audio', async () => {
    const work: Work = {
      id: 'work-accompaniment-only-preview',
      title: 'Accompaniment Only Preview',
      createdAt: '2026-07-04T10:00:00.000Z',
      updatedAt: '2026-07-04T10:00:00.000Z',
      source: 'free_creation',
      syncState: 'local_only',
      tracks: [
        {
          id: 'track-accompaniment',
          kind: 'accompaniment',
          presetId: 'semachi',
          bpm: 84,
          volume: 0.7,
          mute: false,
          solo: false,
          startedAtBeat: 1,
          createdAt: '2026-07-04T10:00:00.000Z',
        },
      ],
    };
    const services = createLocalGarakProductServices({
      libraryAudio: {
        playLibraryAudio: async () => {
          throw new Error('Expected accompaniment-only preview to avoid fallback playback.');
        },
        pauseLibraryAudio: async () => ({ status: 'ok', value: { paused: true } }),
      },
    });

    await expect(services.audio.playWorkMix(work, createWorkMixPlan(work))).resolves.toEqual({
      status: 'error',
      message: 'Local work mix preview cannot render a full mixed audio preview yet.',
    });
  });

  test('local export rejects accompaniment-only mixes instead of creating a fallback artifact', async () => {
    const work: Work = {
      id: 'work-accompaniment-only-export',
      title: 'Accompaniment Only Export',
      createdAt: '2026-07-04T10:00:00.000Z',
      updatedAt: '2026-07-04T10:00:00.000Z',
      source: 'free_creation',
      syncState: 'local_only',
      tracks: [
        {
          id: 'track-accompaniment',
          kind: 'accompaniment',
          presetId: 'semachi',
          bpm: 84,
          volume: 0.7,
          mute: false,
          solo: false,
          startedAtBeat: 1,
          createdAt: '2026-07-04T10:00:00.000Z',
        },
      ],
    };
    const services = createLocalGarakProductServices();

    await expect(services.audio.exportWorkAudio(work)).resolves.toEqual({
      status: 'error',
      message: 'Local export cannot render a full mixed audio artifact yet.',
    });
  });

  test('local work mix preview rejects mixed audio it cannot fully represent', async () => {
    const playedAudio: unknown[] = [];
    const capturedWork = autoSaveTakeAsWork({
      workId: 'work-mixed-preview',
      trackId: 'track-capture',
      takeId: 'take-capture',
      title: 'Captured With Backing',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'file://garak/takes/take-capture.m4a',
    });
    const mixedWork: Work = {
      ...capturedWork,
      source: 'remix',
      tracks: [
        ...capturedWork.tracks,
        {
          id: 'track-reference',
          kind: 'reference',
          sourceShareId: 'recent-kdrama-ost',
          title: 'K-Drama OST',
          authorDisplayName: 'Drama_Garak',
          sourceLabel: 'shared feed demo',
          volume: 0.8,
          mute: false,
          solo: false,
          startedAtBeat: 1,
          createdAt: '2026-07-04T10:01:00.000Z',
        },
      ],
    };
    const services = createLocalGarakProductServices({
      libraryAudio: {
        playLibraryAudio: async (input) => {
          playedAudio.push(input);
          return { status: 'ok', value: { audioUri: input.audioUri } };
        },
        pauseLibraryAudio: async () => ({ status: 'ok', value: { paused: true } }),
      },
    });

    await expect(services.audio.playWorkMix(mixedWork, createWorkMixPlan(mixedWork))).resolves.toEqual({
      status: 'error',
      message: 'Local work mix preview cannot render a full mixed audio preview yet.',
    });
    expect(playedAudio).toEqual([]);
  });

  test('local export rejects mixed audio it cannot fully render', async () => {
    const capturedWork = autoSaveTakeAsWork({
      workId: 'work-mixed-export',
      trackId: 'track-capture',
      takeId: 'take-capture',
      title: 'Captured Export With Backing',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'file://garak/takes/take-capture.m4a',
    });
    const mixedWork: Work = {
      ...capturedWork,
      source: 'remix',
      tracks: [
        ...capturedWork.tracks,
        {
          id: 'track-reference',
          kind: 'reference',
          sourceShareId: 'recent-kpop-demon-hunters',
          title: 'K-pop Demon Hunters',
          authorDisplayName: 'Kpop_Garak',
          sourceLabel: 'shared feed demo',
          volume: 0.75,
          mute: false,
          solo: false,
          startedAtBeat: 1,
          createdAt: '2026-07-04T10:01:00.000Z',
        },
      ],
    };
    const services = createLocalGarakProductServices();

  await expect(services.audio.exportWorkAudio(mixedWork)).resolves.toEqual({
    status: 'error',
    message: 'Local export cannot render a full mixed audio artifact yet.',
  });
});

test('local export stores layered event-only work as event replay instead of requiring a full mix renderer', async () => {
  const baseWork = autoSaveTakeAsWork({
    workId: 'work-layered-event-export',
    trackId: 'track-gayageum',
    takeId: 'take-gayageum',
    title: 'Layered Event Export',
    instrument: 'gayageum',
    events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.9 }],
    createdAt: '2026-07-04T10:00:00.000Z',
    startedAtBeat: 1,
    durationBeats: 4,
  });
  const layeredWork = addInstrumentTrack(baseWork, {
    trackId: 'track-janggu',
    takeId: 'take-janggu',
    instrument: 'janggu',
    events: [{ type: 'string_pluck', tsMs: 200, stringIndex: 6, velocity: 0.8 }],
    createdAt: '2026-07-04T10:01:00.000Z',
    durationBeats: 4,
    playheadBeat: 3,
  });
  const services = createLocalGarakProductServices();

  await expect(services.audio.exportWorkAudio(layeredWork)).resolves.toMatchObject({
    status: 'ok',
    value: {
      audioUri: expect.stringMatching(/^garak:\/\/library-demo\/export-/),
      renderKind: 'event_replay',
      sourceTakeId: 'take-gayageum',
      sourceEventCount: 2,
      durationSeconds: expect.any(Number),
    },
  });
});

test('local work mix preview replays audible instrument events with mix volume', async () => {
  const playedInputs: unknown[] = [];
  const baseWork = autoSaveTakeAsWork({
      workId: 'work-1',
      trackId: 'track-muted',
      takeId: 'take-muted',
      title: 'Layered Work',
      instrument: 'gayageum',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.9 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
    });
    const layeredWork = addInstrumentTrack(baseWork, {
      trackId: 'track-solo',
      takeId: 'take-solo',
      instrument: 'janggu',
      events: [
        { type: 'string_pluck', tsMs: 200, stringIndex: 6, velocity: 0.8 },
        { type: 'string_release', tsMs: 320, stringIndex: 6 },
      ],
      createdAt: '2026-07-04T10:01:00.000Z',
      durationBeats: 4,
      playheadBeat: 3,
    });
    const mutedWork = toggleWorkTrackMute(layeredWork, {
      trackId: 'track-muted',
      updatedAt: '2026-07-04T10:02:00.000Z',
    });
    const mixedWork = {
      ...toggleWorkTrackSolo(mutedWork, {
        trackId: 'track-solo',
        updatedAt: '2026-07-04T10:03:00.000Z',
      }),
      tracks: mutedWork.tracks.map((track) =>
        track.id === 'track-solo' ? { ...track, solo: true, volume: 0.5 } : track,
      ),
    };
    const services = createLocalGarakProductServices({
      liveAudio: {
        prepareLivePerformanceAudio: async (input) => ({
          status: 'ok' as const,
          value: {
            instrument: input.instrument,
            sampleSourceLabel: 'test sampler',
            releaseReady: true,
          },
        }),
        playPerformanceEvents: async (input) => {
          playedInputs.push(input);
          return { status: 'ok' as const, value: { handledEvents: input.events.length } };
        },
      },
      libraryAudio: {
        playLibraryAudio: async () => {
          throw new Error('Expected event replay instead of fallback audio artifact.');
        },
        pauseLibraryAudio: async () => ({ status: 'ok', value: { paused: true } }),
      },
    });

    await expect(services.audio.playWorkMix(mixedWork, createWorkMixPlan(mixedWork))).resolves.toEqual({
      status: 'ok',
      value: { handledTracks: 1 },
    });
  expect(playedInputs).toEqual([
    {
      instrument: 'janggu',
      events: [
        { type: 'string_pluck', tsMs: 1629, stringIndex: 6, velocity: 0.4 },
          { type: 'string_release', tsMs: 1749, stringIndex: 6 },
        ],
    },
  ]);
});

test('local work mix preview replays multiple audible event tracks with mix volume and timing', async () => {
  const playedInputs: unknown[] = [];
  const baseWork = autoSaveTakeAsWork({
    workId: 'work-layered-events',
    trackId: 'track-gayageum',
    takeId: 'take-gayageum',
    title: 'Layered Event Work',
    instrument: 'gayageum',
    events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.9 }],
    createdAt: '2026-07-04T10:00:00.000Z',
    startedAtBeat: 1,
    durationBeats: 4,
    recordingSetup: { presetId: 'semachi', bpm: 120, beatUnit: '4/4' },
  });
  const layeredWork = addInstrumentTrack(
    {
      ...baseWork,
      tracks: baseWork.tracks.map((track) => ({ ...track, volume: 0.5 })),
    },
    {
      trackId: 'track-janggu',
      takeId: 'take-janggu',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 200, stringIndex: 6, velocity: 0.8 }],
      createdAt: '2026-07-04T10:01:00.000Z',
      durationBeats: 4,
      playheadBeat: 3,
      recordingSetup: { presetId: 'jajinmori', bpm: 120, beatUnit: '4/4' },
    },
  );
  const services = createLocalGarakProductServices({
    liveAudio: {
      prepareLivePerformanceAudio: async (input) => ({
        status: 'ok' as const,
        value: {
          instrument: input.instrument,
          sampleSourceLabel: 'test sampler',
          releaseReady: true,
        },
      }),
      playPerformanceEvents: async (input) => {
        playedInputs.push(input);
        return { status: 'ok' as const, value: { handledEvents: input.events.length } };
      },
    },
    libraryAudio: {
      playLibraryAudio: async () => {
        throw new Error('Expected event replay for every audible track.');
      },
      pauseLibraryAudio: async () => ({ status: 'ok', value: { paused: true } }),
    },
  });

  await expect(services.audio.playWorkMix(layeredWork, createWorkMixPlan(layeredWork))).resolves.toEqual({
    status: 'ok',
    value: { handledTracks: 2 },
  });
  expect(playedInputs).toEqual([
    {
      instrument: 'gayageum',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.45 }],
    },
    {
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 1200, stringIndex: 6, velocity: 0.8 }],
    },
  ]);
});

test('local work mix preview plays reference-only remix work from the source shared recording', async () => {
  const playedAudio: Array<{ audioUri: string; title?: string; sourceKind: string; volume?: number }> = [];
  const remixWork: Work = {
      id: 'work-reference-remix',
      title: 'K-Drama OST Remix',
      createdAt: '2026-07-04T10:00:00.000Z',
      updatedAt: '2026-07-04T10:00:00.000Z',
      source: 'remix',
      syncState: 'local_only',
      tracks: [
        {
          id: 'track-reference',
          kind: 'reference',
          sourceShareId: 'recent-kdrama-ost',
          title: 'K-Drama OST',
          authorDisplayName: 'Drama_Garak',
          sourceLabel: 'shared feed demo',
          volume: 0.8,
          mute: false,
          solo: false,
          startedAtBeat: 1,
          createdAt: '2026-07-04T10:00:00.000Z',
        },
      ],
    };
    const services = createLocalGarakProductServices({
      libraryAudio: {
        playLibraryAudio: async (input) => {
          playedAudio.push(input);
          return { status: 'ok', value: { audioUri: input.audioUri } };
        },
        pauseLibraryAudio: async () => ({ status: 'ok', value: { paused: true } }),
      },
    });

    await expect(services.audio.playWorkMix(remixWork, createWorkMixPlan(remixWork))).resolves.toEqual({
      status: 'ok',
      value: { handledTracks: 1 },
    });
    expect(playedAudio).toEqual([
      {
        audioUri: createSharedRecordingLibraryAudioUri({
          id: 'recent-kdrama-ost',
          title: 'K-Drama OST',
          authorDisplayName: 'Drama_Garak',
          sourceLabel: 'shared feed demo',
          instrument: 'daegeum',
          durationSeconds: 57,
          audioUri: 'placeholder://recent-kdrama-ost.wav',
          remixable: true,
        }),
        title: 'K-Drama OST',
        sourceKind: 'sharedRecording',
        volume: 0.8,
      },
    ]);
  });

  test('local export keeps reference-only remix work tied to the source shared recording audio', async () => {
    const remixWork: Work = {
      id: 'work-reference-export',
      title: 'K-pop Demon Hunters Remix',
      createdAt: '2026-07-04T10:00:00.000Z',
      updatedAt: '2026-07-04T10:00:00.000Z',
      source: 'remix',
      syncState: 'local_only',
      tracks: [
        {
          id: 'track-reference',
          kind: 'reference',
          sourceShareId: 'recent-kpop-demon-hunters',
          title: 'K-pop Demon Hunters',
          authorDisplayName: 'Kpop_Garak',
          sourceLabel: 'shared feed demo',
          volume: 0.75,
          mute: false,
          solo: false,
          startedAtBeat: 1,
          createdAt: '2026-07-04T10:00:00.000Z',
        },
      ],
    };
    const services = createLocalGarakProductServices();

    await expect(services.audio.exportWorkAudio(remixWork)).resolves.toMatchObject({
      status: 'ok',
      value: {
        audioUri: createSharedRecordingLibraryAudioUri({
          id: 'recent-kpop-demon-hunters',
          title: 'K-pop Demon Hunters',
          authorDisplayName: 'Kpop_Garak',
          sourceLabel: 'shared feed demo',
          instrument: 'janggu',
          durationSeconds: 64,
          audioUri: 'placeholder://recent-kpop-demon-hunters.wav',
          remixable: true,
        }),
        renderKind: 'demo_sample',
      },
    });
  });

  test('local export rejects reference-only remix work when the source shared recording is unavailable', async () => {
    const remixWork: Work = {
      id: 'work-missing-reference-export',
      title: 'Missing Reference Remix',
      createdAt: '2026-07-04T10:00:00.000Z',
      updatedAt: '2026-07-04T10:00:00.000Z',
      source: 'remix',
      syncState: 'local_only',
      tracks: [
        {
          id: 'track-reference',
          kind: 'reference',
          sourceShareId: 'missing-shared-recording',
          title: 'Missing Shared Recording',
          authorDisplayName: 'Missing',
          sourceLabel: 'shared feed demo',
          volume: 0.75,
          mute: false,
          solo: false,
          startedAtBeat: 1,
          createdAt: '2026-07-04T10:00:00.000Z',
        },
      ],
    };
    const services = createLocalGarakProductServices();

    await expect(services.audio.exportWorkAudio(remixWork)).resolves.toEqual({
      status: 'error',
      message: 'Reference audio source is unavailable.',
    });
  });

  test('local work mix preview offsets event timing by the track start beat', async () => {
    const playedInputs: unknown[] = [];
    const baseWork = autoSaveTakeAsWork({
      workId: 'work-offset',
      trackId: 'track-base',
      takeId: 'take-base',
      title: 'Offset Work',
      instrument: 'gayageum',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.9 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
    });
    const layeredWork = addInstrumentTrack(baseWork, {
      trackId: 'track-offset',
      takeId: 'take-offset',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 200, stringIndex: 6, velocity: 0.8 }],
      createdAt: '2026-07-04T10:01:00.000Z',
      durationBeats: 4,
      playheadBeat: 3,
      recordingSetup: { presetId: 'jajinmori', bpm: 120, beatUnit: '4/4' },
    });
    const mixedWork = toggleWorkTrackSolo(layeredWork, {
      trackId: 'track-offset',
      updatedAt: '2026-07-04T10:02:00.000Z',
    });
    const services = createLocalGarakProductServices({
      liveAudio: {
        prepareLivePerformanceAudio: async (input) => ({
          status: 'ok' as const,
          value: {
            instrument: input.instrument,
            sampleSourceLabel: 'test sampler',
            releaseReady: true,
          },
        }),
        playPerformanceEvents: async (input) => {
          playedInputs.push(input);
          return { status: 'ok' as const, value: { handledEvents: input.events.length } };
        },
      },
      libraryAudio: {
        playLibraryAudio: async () => {
          throw new Error('Expected event replay instead of fallback audio artifact.');
        },
        pauseLibraryAudio: async () => ({ status: 'ok', value: { paused: true } }),
      },
    });

    await expect(services.audio.playWorkMix(mixedWork, createWorkMixPlan(mixedWork))).resolves.toEqual({
      status: 'ok',
      value: { handledTracks: 1 },
    });
    expect(playedInputs).toEqual([
      {
        instrument: 'janggu',
        events: [{ type: 'string_pluck', tsMs: 1200, stringIndex: 6, velocity: 0.8 }],
      },
    ]);
  });

  test('local work mix preview ignores captured audio from muted tracks', async () => {
    const playedInputs: unknown[] = [];
    const baseWork = autoSaveTakeAsWork({
      workId: 'work-muted-capture',
      trackId: 'track-muted-capture',
      takeId: 'take-muted-capture',
      title: 'Muted Capture Work',
      instrument: 'janggu',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 }],
      createdAt: '2026-07-04T10:00:00.000Z',
      startedAtBeat: 1,
      durationBeats: 4,
      recordingUri: 'file://garak/takes/muted-capture.m4a',
    });
    const layeredWork = addInstrumentTrack(baseWork, {
      trackId: 'track-audible',
      takeId: 'take-audible',
      instrument: 'gayageum',
      events: [{ type: 'string_pluck', tsMs: 180, stringIndex: 5, velocity: 0.7 }],
      createdAt: '2026-07-04T10:01:00.000Z',
      durationBeats: 4,
    });
    const mixedWork = toggleWorkTrackMute(layeredWork, {
      trackId: 'track-muted-capture',
      updatedAt: '2026-07-04T10:02:00.000Z',
    });
    const services = createLocalGarakProductServices({
      liveAudio: {
        prepareLivePerformanceAudio: async (input) => ({
          status: 'ok' as const,
          value: {
            instrument: input.instrument,
            sampleSourceLabel: 'test sampler',
            releaseReady: true,
          },
        }),
        playPerformanceEvents: async (input) => {
          playedInputs.push(input);
          return { status: 'ok' as const, value: { handledEvents: input.events.length } };
        },
      },
      libraryAudio: {
        playLibraryAudio: async () => {
          throw new Error('Expected muted capture to be skipped.');
        },
        pauseLibraryAudio: async () => ({ status: 'ok', value: { paused: true } }),
      },
    });

    await expect(services.audio.playWorkMix(mixedWork, createWorkMixPlan(mixedWork))).resolves.toEqual({
      status: 'ok',
      value: { handledTracks: 1 },
    });
    expect(playedInputs).toEqual([
      {
        instrument: 'gayageum',
        events: [{ type: 'string_pluck', tsMs: 180, stringIndex: 5, velocity: 0.7 }],
      },
    ]);
  });

  test('local services route S05 live performance through the injected live audio port', async () => {
    const events = [
      { type: 'string_pluck' as const, tsMs: 120, stringIndex: 2, velocity: 0.7 },
    ];
    const preparedInstruments: string[] = [];
    const playedInputs: unknown[] = [];
    const services = createLocalGarakProductServices({
      liveAudio: {
        prepareLivePerformanceAudio: async (input) => {
          preparedInstruments.push(input.instrument);
          return {
            status: 'ok' as const,
            value: {
              instrument: input.instrument,
              sampleSourceLabel: 'bundled dev sampler',
              releaseReady: false,
            },
          };
        },
        playPerformanceEvents: async (input) => {
          playedInputs.push(input);
          return {
            status: 'ok' as const,
            value: { handledEvents: input.events.length },
          };
        },
      },
    });

    await expect(
      services.audio.prepareLivePerformanceAudio({ instrument: 'janggu' }),
    ).resolves.toEqual({
      status: 'ok',
      value: {
        instrument: 'janggu',
        sampleSourceLabel: 'bundled dev sampler',
        releaseReady: false,
      },
    });
    await expect(
      services.audio.playPerformanceEvents({ instrument: 'janggu', events }),
    ).resolves.toEqual({
      status: 'ok',
      value: { handledEvents: 1 },
    });
    expect(preparedInstruments).toEqual(['janggu']);
    expect(playedInputs).toEqual([{ instrument: 'janggu', events }]);
  });
});

function createWork(id: string): Work {
  return {
    id,
    title: 'My Arirang',
    createdAt: '2026-06-25T00:00:00.000Z',
    updatedAt: '2026-06-25T00:00:00.000Z',
    source: 'free_creation',
    syncState: 'local_only',
    tracks: [],
  };
}

function createStaticSnapshotStorage(snapshot: ProductLibraryState) {
  return {
    getItem: async () => JSON.stringify(snapshot),
    setItem: async () => undefined,
    deleteItem: async () => undefined,
  };
}

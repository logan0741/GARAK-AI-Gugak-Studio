import { describe, expect, test } from 'vitest';
import type { ProductLibraryState } from '../garakProductState';
import {
  createInMemoryGarakProductServices,
  createNoopGarakProductServices,
} from '../garakProductServices';
import { createLocalGarakProductServices } from '../localGarakProductServices';

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
    await expect(services.audio.playPerformanceEvents([])).resolves.toEqual({
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
});

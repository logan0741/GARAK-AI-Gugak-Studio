import { describe, expect, test } from 'vitest';
import type { SampleAssetManifest } from '../../domain/sampleManifest';
import type { AuthStoragePort } from '../authSessionStore';
import type { GarakFetch } from '../garakHttpProductServices';
import type { ProductLibraryState } from '../garakProductState';
import { createRuntimeGarakProductServices } from '../garakRuntimeProductServices';

describe('runtime Garak product services', () => {
  test('falls back to noop services when the API base URL is absent', async () => {
    const services = createRuntimeGarakProductServices({ apiBaseUrl: '' });

    await expect(services.account.loginAndLoadLibrary()).resolves.toEqual({
      status: 'unavailable',
    });
  });

  test('keeps live performance playback local instead of using the HTTP product API', async () => {
    const requests: Array<{ url: string; init?: Parameters<GarakFetch>[1] }> = [];
    const playedEvents: unknown[] = [];
    const fetchImpl: GarakFetch = async (url, init) => {
      requests.push({ url, init });

      return {
        ok: true,
        status: 204,
        json: async () => ({}),
        text: async () => '',
      };
    };
    const services = createRuntimeGarakProductServices({
      apiBaseUrl: 'https://api.garak.test',
      fetch: fetchImpl,
      getAccessToken: async () => 'token-1',
      liveAudio: {
        prepareLivePerformanceAudio: async (input) => ({
          status: 'ok' as const,
          value: {
            instrument: input.instrument,
            sampleSourceLabel: 'local sampler',
            releaseReady: false,
          },
        }),
        playPerformanceEvents: async (input) => {
          playedEvents.push(input);
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
        sampleSourceLabel: 'local sampler',
        releaseReady: false,
      },
    });
    await expect(
      services.audio.playPerformanceEvents({
        instrument: 'janggu',
        events: [{ type: 'string_pluck', tsMs: 120, stringIndex: 2, velocity: 0.7 }],
      }),
    ).resolves.toEqual({
      status: 'ok',
      value: { handledEvents: 1 },
    });
    expect(requests).toEqual([]);
    expect(playedEvents).toEqual([
      {
        instrument: 'janggu',
        events: [{ type: 'string_pluck', tsMs: 120, stringIndex: 2, velocity: 0.7 }],
      },
    ]);

    await services.library.saveSnapshot({
      works: [],
      exportedAudios: [],
      practiceResults: [],
    });

    expect(requests[0]).toMatchObject({
      url: 'https://api.garak.test/library/snapshot',
      init: {
        method: 'PUT',
        headers: {
          authorization: 'Bearer token-1',
        },
      },
    });
  });

  test('feeds backend sample manifests into local live audio preparation', async () => {
    const requests: Array<{ url: string; init?: Parameters<GarakFetch>[1] }> = [];
    const samplerInputs: Array<{ instrument: string; manifest?: SampleAssetManifest }> = [];
    const manifest: SampleAssetManifest = {
      version: '2026.07.janggu',
      assets: [
        {
          id: 'janggu-left-hit',
          instrument: 'janggu',
          stringIndex: 3,
          pitchHz: 110,
          fileUri: 'assets/audio/janggu/left-hit.wav',
          sourceLayer: 'public_asset',
          sourceName: 'National Gugak Center monotone candidate',
          licenseNote: 'KOGL type 1 attribution required',
        },
      ],
    };
    const services = createRuntimeGarakProductServices({
      apiBaseUrl: 'https://api.garak.test/api',
      fetch: async (url, init) => {
        requests.push({ url, init });
        return {
          ok: true,
          status: 200,
          json: async () => manifest,
          text: async () => JSON.stringify(manifest),
        };
      },
      createLiveSampler: async (input) => {
        samplerInputs.push(input);
        return {
          engine: { handleEvent: () => undefined },
          sampleSourceLabel: `${input.instrument} sampler`,
          releaseReady: true,
        };
      },
    });

    await expect(
      services.audio.prepareLivePerformanceAudio({ instrument: 'janggu' }),
    ).resolves.toMatchObject({
      status: 'ok',
      value: { instrument: 'janggu' },
    });

    expect(requests).toEqual([
      {
        url: 'https://api.garak.test/api/instruments/janggu/samples',
        init: expect.objectContaining({
          method: 'GET',
        }),
      },
    ]);
    expect(samplerInputs).toEqual([
      {
        instrument: 'janggu',
        manifest,
      },
    ]);
  });

  test('uses the local library when the runtime has an API base URL but no access token', async () => {
    const requests: Array<{ url: string; init?: Parameters<GarakFetch>[1] }> = [];
    const storage = createMemoryStorage();
    const services = createRuntimeGarakProductServices({
      apiBaseUrl: 'https://api.garak.test',
      fetch: async (url, init) => {
        requests.push({ url, init });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            works: [{ id: 'remote-work' }],
            exportedAudios: [],
            practiceResults: [],
          }),
          text: async () => '',
        };
      },
      getAccessToken: async () => undefined,
      libraryStorage: storage,
    });
    const localSnapshot: ProductLibraryState = {
      works: [],
      exportedAudios: [],
      practiceResults: [],
    };

    await services.library.saveSnapshot(localSnapshot);

    await expect(services.library.loadSnapshot()).resolves.toEqual(localSnapshot);
    expect(requests).toEqual([]);
  });

  test('falls back to the local library when remote library requests fail', async () => {
    const requests: Array<{ url: string; init?: Parameters<GarakFetch>[1] }> = [];
    const storage = createMemoryStorage();
    const services = createRuntimeGarakProductServices({
      apiBaseUrl: 'https://api.garak.test',
      fetch: async (url, init) => {
        requests.push({ url, init });
        throw new Error('network offline');
      },
      getAccessToken: async () => 'token-1',
      libraryStorage: storage,
    });
    const localSnapshot: ProductLibraryState = {
      works: [],
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: 'Local export',
          durationSeconds: 12,
          instrumentNames: ['가야금'],
          createdAt: '2026-07-03T00:00:00.000Z',
          audioUri: 'file://garak/export-1.wav',
          shareState: 'ready',
        },
      ],
      practiceResults: [],
    };

    await services.library.saveSnapshot(localSnapshot);

    await expect(services.library.loadSnapshot()).resolves.toEqual(localSnapshot);
    expect(requests.map((request) => request.init?.method)).toEqual(['PUT', 'GET']);
  });
});

function createMemoryStorage(): AuthStoragePort {
  const values = new Map<string, string>();

  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    deleteItem: async (key) => {
      values.delete(key);
    },
  };
}

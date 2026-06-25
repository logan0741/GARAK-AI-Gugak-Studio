import { describe, expect, test } from 'vitest';
import type { GarakFetch } from '../garakHttpProductServices';
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
    });

    await expect(
      services.audio.playPerformanceEvents([
        { type: 'string_pluck', tsMs: 120, stringIndex: 2, velocity: 0.7 },
      ]),
    ).resolves.toEqual({
      status: 'unavailable',
    });
    expect(requests).toEqual([]);

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
});

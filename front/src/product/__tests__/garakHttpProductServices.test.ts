import { describe, expect, test } from 'vitest';
import type { ProductLibraryState } from '../garakProductState';
import { createHttpGarakProductServices, type GarakFetch } from '../garakHttpProductServices';

describe('HTTP Garak product services', () => {
  test('saves library snapshots through the backend JSON contract', async () => {
    const requests: Array<{ url: string; init: Parameters<GarakFetch>[1] }> = [];
    const fetch: GarakFetch = async (url, init) => {
      requests.push({ url, init });
      return jsonResponse(204, undefined);
    };
    const services = createHttpGarakProductServices({
      baseUrl: 'https://api.garak.test/v1/',
      fetch,
      getAccessToken: async () => 'access-token',
    });
    const snapshot = createLibrarySnapshot();

    await services.library.saveSnapshot(snapshot);

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://api.garak.test/v1/library/snapshot');
    expect(requests[0].init).toMatchObject({
      method: 'PUT',
      headers: {
        accept: 'application/json',
        authorization: 'Bearer access-token',
        'content-type': 'application/json',
      },
    });
    expect(JSON.parse(String(requests[0].init?.body))).toEqual(snapshot);
  });

  test('maps account sync and AI recommendation responses to service results', async () => {
    const remoteLibrary = createLibrarySnapshot('remote-work');
    const requests: string[] = [];
    const fetch: GarakFetch = async (url, init) => {
      requests.push(`${init?.method ?? 'GET'} ${url}`);

      if (url.endsWith('/account/login-sync')) {
        return jsonResponse(200, remoteLibrary);
      }

      if (url.endsWith('/ai/accompaniment/recommendations')) {
        expect(JSON.parse(String(init?.body))).toEqual({
          events: [],
        });
        return jsonResponse(200, {
          presetId: 'jungmori',
          bpm: 88,
          volume: 0.64,
          reason: 'server matched a medium tempo phrase',
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    };
    const services = createHttpGarakProductServices({
      baseUrl: 'https://api.garak.test/v1',
      fetch,
    });

    await expect(services.account.loginAndLoadLibrary()).resolves.toEqual({
      status: 'ok',
      value: remoteLibrary,
    });
    await expect(services.ai.recommendAccompaniment({ events: [] })).resolves.toEqual({
      status: 'ok',
      value: {
        presetId: 'jungmori',
        bpm: 88,
        volume: 0.64,
        reason: 'server matched a medium tempo phrase',
      },
    });
    expect(requests).toEqual([
      'POST https://api.garak.test/v1/account/login-sync',
      'POST https://api.garak.test/v1/ai/accompaniment/recommendations',
    ]);
  });

  test('keeps unavailable backend endpoints explicit', async () => {
    const services = createHttpGarakProductServices({
      baseUrl: 'https://api.garak.test/v1',
      fetch: async () => jsonResponse(501, { message: 'not implemented' }),
    });

    await expect(services.share.publishShareTarget({ kind: 'practiceResult', id: 'practice-1' })).resolves.toEqual({
      status: 'unavailable',
    });
  });

  test('posts live performance events to the audio playback service boundary', async () => {
    const requests: Array<{ url: string; init: Parameters<GarakFetch>[1] }> = [];
    const services = createHttpGarakProductServices({
      baseUrl: 'https://api.garak.test/v1',
      fetch: async (url, init) => {
        requests.push({ url, init });
        return jsonResponse(200, { handledEvents: 1 });
      },
    });
    const events = [
      { type: 'string_pluck' as const, tsMs: 120, stringIndex: 2, velocity: 0.7 },
    ];

    await expect(services.audio.playPerformanceEvents(events)).resolves.toEqual({
      status: 'ok',
      value: { handledEvents: 1 },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://api.garak.test/v1/audio/performance-events/play');
    expect(requests[0].init?.method).toBe('POST');
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({ events });
  });
});

function createLibrarySnapshot(workId = 'work-1'): ProductLibraryState {
  return {
    works: [
      {
        id: workId,
        title: 'My Arirang',
        createdAt: '2026-06-25T00:00:00.000Z',
        updatedAt: '2026-06-25T00:00:00.000Z',
        source: 'free_creation',
        syncState: 'local_only',
        tracks: [],
      },
    ],
    exportedAudios: [],
    practiceResults: [],
  };
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

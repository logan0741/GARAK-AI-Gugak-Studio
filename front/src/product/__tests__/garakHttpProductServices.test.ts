import { describe, expect, test } from 'vitest';
import type { ProductLibraryState } from '../garakProductState';
import { createHttpGarakProductServices, type GarakFetch } from '../garakHttpProductServices';

describe('HTTP Garak product services', () => {
  test('saves library works through the backend session contract', async () => {
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
    expect(requests[0].url).toBe('https://api.garak.test/v1/api/sessions');
    expect(requests[0].init).toMatchObject({
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: 'Bearer access-token',
        'content-type': 'application/json',
      },
    });
    expect(JSON.parse(String(requests[0].init?.body))).toMatchObject({
      id: 'work-1',
      instrumentId: 'gayageum_12',
      sampleAssetManifestId: 'gayageum_samples_2026_06_a',
      title: 'My Arirang',
      mode: 'creative',
      events: [],
    });
  });

  test('maps account sync and AI recommendation responses to service results', async () => {
    const requests: string[] = [];
    const fetch: GarakFetch = async (url, init) => {
      requests.push(`${init?.method ?? 'GET'} ${url}`);

      if (url.endsWith('/api/sessions')) {
        return jsonResponse(200, [
          {
            id: 'remote-work',
            title: 'Remote Work',
            mode: 'creative',
            instrument_id: 'gayageum',
            created_at_ms: 1782345600000,
            updated_at_ms: 1782345600000,
          },
        ]);
      }

      if (url.endsWith('/api/analyze')) {
        expect(JSON.parse(String(init?.body))).toEqual({
          sessionId: 'local-preview',
          events: [
            {
              id: 'ai-event-1',
              type: 'string_pluck',
              tsMs: 0,
              stringIndex: 1,
              velocity: 0.8,
            },
          ],
        });
        return jsonResponse(200, {
          key: 'pyeongjo',
          jangdan: 'gutgeori',
          estimatedBpm: 88,
          density: 'medium',
        });
      }

      if (url.endsWith('/api/accompaniment')) {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          key: 'pyeongjo',
          jangdan: 'jungmori',
          bpm: 88,
        });
        return jsonResponse(200, {
          patternSequence: [{ step: 0 }],
          playbackRate: 1,
          crossfadeMs: 120,
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
      value: {
        works: [
          expect.objectContaining({
            id: 'remote-work',
            title: 'Remote Work',
            source: 'free_creation',
            syncState: 'synced',
          }),
        ],
        exportedAudios: [],
        practiceResults: [],
      },
    });
    await expect(
      services.ai.recommendAccompaniment({
        events: [{ type: 'string_pluck', tsMs: 0, stringIndex: 1, velocity: 0.8 }],
      }),
    ).resolves.toEqual({
      status: 'ok',
      value: {
        presetId: 'jungmori',
        bpm: 88,
        volume: 0.72,
        reason: 'AI matched gutgeori and generated 1 steps.',
      },
    });
    expect(requests).toEqual([
      'GET https://api.garak.test/v1/api/sessions',
      'POST https://api.garak.test/v1/api/analyze',
      'POST https://api.garak.test/v1/api/accompaniment',
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

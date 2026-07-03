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
        const body = JSON.parse(String(init?.body));
        expect(body).toMatchObject({
          timestamps: expect.any(Array),
          notes: expect.any(Array),
        });
        return jsonResponse(200, {
          jo: '평조',
          jangdan: '굿거리',
          jo_confidence: 0.9,
          jangdan_confidence: 0.85,
          detected_bpm: 88,
          ioi_ms: [300, 310],
        });
      }

      if (url.endsWith('/api/feedback')) {
        const body = JSON.parse(String(init?.body));
        expect(body).toMatchObject({
          jo: '평조',
          jangdan: '굿거리',
          accuracy: expect.any(Number),
          language: 'ko',
        });
        return jsonResponse(200, {
          feedback: '장단 흐름이 안정적이에요.',
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

    // recommendAccompaniment — needs ≥2 events to extract timestamps
    await expect(
      services.ai.recommendAccompaniment({
        events: [
          { type: 'string_pluck', tsMs: 0, stringIndex: 1, velocity: 0.8 },
          { type: 'string_pluck', tsMs: 500, stringIndex: 3, velocity: 0.7 },
        ],
      }),
    ).resolves.toEqual({
      status: 'ok',
      value: {
        presetId: 'jungmori',
        bpm: 88,
        volume: 0.72,
        reason: 'AI가 굿거리(평조)을(를) 감지했습니다.',
      },
    });

    await expect(
      services.ai.requestPracticeFeedback({
        sessionId: 'practice-arirang',
        accuracyScore: 0.78,
        songName: '아리랑',
        locale: 'ko',
        events: [
          { type: 'string_pluck', tsMs: 0, stringIndex: 1, velocity: 0.8 },
          { type: 'string_pluck', tsMs: 500, stringIndex: 3, velocity: 0.7 },
        ],
      }),
    ).resolves.toEqual({
      status: 'ok',
      value: {
        feedbackText: '장단 흐름이 안정적이에요.',
      },
    });

    expect(requests).toEqual([
      'GET https://api.garak.test/v1/api/sessions',
      'POST https://api.garak.test/v1/api/analyze',
      'POST https://api.garak.test/v1/api/analyze',
      'POST https://api.garak.test/v1/api/feedback',
    ]);
  });

  test('returns unavailable when events have fewer than 2 pluck events', async () => {
    const services = createHttpGarakProductServices({
      baseUrl: 'https://api.garak.test/v1',
      fetch: async () => { throw new Error('should not call'); },
    });

    await expect(
      services.ai.recommendAccompaniment({
        events: [{ type: 'string_pluck', tsMs: 0, stringIndex: 1, velocity: 0.8 }],
      }),
    ).resolves.toEqual({ status: 'unavailable' });
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

  test('publishes share targets through the backend share contract', async () => {
    const requests: Array<{ url: string; init: Parameters<GarakFetch>[1] }> = [];
    const services = createHttpGarakProductServices({
      baseUrl: 'https://api.garak.test/v1',
      fetch: async (url, init) => {
        requests.push({ url, init });
        return jsonResponse(201, { shareId: 'share-1' });
      },
    });

    await expect(
      services.share.publishShareTarget({
        kind: 'exportedAudio',
        id: 'export-1',
        sessionId: 'work-1',
      }),
    ).resolves.toEqual({
      status: 'ok',
      value: { remoteId: 'share-1' },
    });
    expect(requests[0].url).toBe('https://api.garak.test/v1/api/share');
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      sessionId: 'work-1',
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

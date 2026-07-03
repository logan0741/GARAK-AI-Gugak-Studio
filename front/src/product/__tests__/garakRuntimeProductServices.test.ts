import { describe, expect, test } from 'vitest';
import type { SampleAssetManifest } from '../../domain/sampleManifest';
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
});

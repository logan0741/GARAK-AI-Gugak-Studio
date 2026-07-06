import { beforeEach, expect, test, vi } from 'vitest';
import { createLivePerformanceAudioPort } from '../livePerformanceAudio';

const defaultSamplerMocks = vi.hoisted(() => ({
  createAndPreloadPrototypeNativeSamplerEngine: vi.fn(async () => ({
    handleEvent: () => undefined,
  })),
  createLivePerformanceBundledSampleAssetResolver: vi.fn(() => ({
    resolveFileUri: async (fileUri: string) => `file://resolved/${fileUri}`,
  })),
}));

vi.mock('../../prototype/prototypeNativeSamplerEngineFactory', () => ({
  createAndPreloadPrototypeNativeSamplerEngine:
    defaultSamplerMocks.createAndPreloadPrototypeNativeSamplerEngine,
}));

vi.mock('../../prototype/prototypeSampleManifest', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../prototype/prototypeSampleManifest')>();
  return {
    ...original,
    summarizePrototypeSampleManifestProvenance: (manifest: { assets: Array<{ sourceName: string }> }) => ({
      assetCount: manifest.assets.length,
      licenseNotes: [],
      qualityNote: 'test',
      releaseReady: true,
      sourceLayerCounts: {
        own_asset: 0,
        public_asset: manifest.assets.length,
      },
      sourceNames: [...new Set(manifest.assets.map((asset) => asset.sourceName))],
    }),
  };
});

vi.mock('../livePerformanceBundledSampleAssetRegistry', () => ({
  createLivePerformanceBundledSampleAssetResolver:
    defaultSamplerMocks.createLivePerformanceBundledSampleAssetResolver,
}));

beforeEach(() => {
  defaultSamplerMocks.createAndPreloadPrototypeNativeSamplerEngine.mockClear();
  defaultSamplerMocks.createLivePerformanceBundledSampleAssetResolver.mockClear();
});

test('default live audio preparation uses bundled janggu samples for janggu performance', async () => {
  const port = createLivePerformanceAudioPort();

  await expect(port.prepareLivePerformanceAudio({ instrument: 'janggu' })).resolves.toMatchObject({
    status: 'ok',
    value: {
      instrument: 'janggu',
      releaseReady: true,
    },
  });

  expect(defaultSamplerMocks.createAndPreloadPrototypeNativeSamplerEngine).toHaveBeenCalledWith(
    expect.objectContaining({
      candidate: 'expo-audio',
      manifest: expect.objectContaining({
        version: 'ngc-monotone-janggu-2026-07-03',
      }),
      requiredStringIndexes: [3, 6, 10],
      assetResolver: expect.any(Object),
    }),
  );
});

test('default live audio preparation uses bundled daegeum samples for daegeum performance', async () => {
  const port = createLivePerformanceAudioPort();

  await expect(port.prepareLivePerformanceAudio({ instrument: 'daegeum' })).resolves.toMatchObject({
    status: 'ok',
    value: {
      instrument: 'daegeum',
      releaseReady: true,
    },
  });

  expect(defaultSamplerMocks.createAndPreloadPrototypeNativeSamplerEngine).toHaveBeenCalledWith(
    expect.objectContaining({
      candidate: 'expo-audio',
      manifest: expect.objectContaining({
        version: 'ngc-monotone-sanjodaegeum-2026-07-03',
      }),
      requiredStringIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      assetResolver: expect.any(Object),
    }),
  );
});

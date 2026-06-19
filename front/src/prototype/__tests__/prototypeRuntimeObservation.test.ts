import { expect, test } from 'vitest';
import { FakeSamplerEngine } from '../../audio/fakeSamplerEngine';
import { SamplerEngine } from '../../audio/samplerEngine';
import { GayageumSampleAsset, SampleAssetManifest } from '../../domain/sampleManifest';
import { createPrototypeRuntimeObservation } from '../prototypeRuntimeObservation';
import { createPrototypeSamplerEngineHost } from '../prototypeSamplerEngineHost';

const completeManifest: SampleAssetManifest = {
  version: 'test-12-string-manifest',
  assets: Array.from({ length: 12 }, (_, index) => ({
    id: `string-${index + 1}`,
    instrument: 'gayageum_12',
    stringIndex: index + 1,
    pitchHz: 196 + index * 12,
    fileUri: `asset://gayageum/${String(index + 1).padStart(2, '0')}.wav`,
    sourceLayer: 'public_asset',
    sourceName: 'test fixture',
    licenseNote: 'test only',
  })),
};

test('maps prototype host states into copyable runtime observations', () => {
  const nativeEngine: SamplerEngine = {
    handleEvent: () => undefined,
  };

  expect(
    createPrototypeRuntimeObservation(
      createPrototypeSamplerEngineHost({
        requestedCandidate: 'react-native-audio-api',
        manifest: {
          version: 'partial-manifest',
          assets: completeManifest.assets.slice(0, 11),
        },
        nativeCandidate: { status: 'ready', engine: nativeEngine },
        createFakeEngine: () => new FakeSamplerEngine(),
      }),
    ),
  ).toEqual({
    activeRuntime: 'fake-prototype',
    nativePreloadStatus: 'not_started',
    requestedCandidate: 'react-native-audio-api',
    runtimeStatus: 'missing_sample_manifest',
    sampleManifestVersion: 'partial-manifest',
  });

  expect(
    createPrototypeRuntimeObservation(
      createPrototypeSamplerEngineHost({
        requestedCandidate: 'react-native-audio-api',
        manifest: completeManifest,
        nativeCandidate: { status: 'preloading' },
        createFakeEngine: () => new FakeSamplerEngine(),
      }),
    ),
  ).toEqual({
    activeRuntime: 'fake-prototype',
    nativePreloadStatus: 'preloading',
    requestedCandidate: 'react-native-audio-api',
    runtimeStatus: 'native_candidate_preloading',
    sampleManifestVersion: 'test-12-string-manifest',
  });

  expect(
    createPrototypeRuntimeObservation(
      createPrototypeSamplerEngineHost({
        requestedCandidate: 'expo-audio',
        manifest: completeManifest,
        nativeCandidate: { status: 'failed', errorMessage: 'native module unavailable' },
        createFakeEngine: () => new FakeSamplerEngine(),
      }),
    ),
  ).toEqual({
    activeRuntime: 'fake-prototype',
    nativePreloadStatus: 'failed',
    preloadErrorMessage: 'native module unavailable',
    requestedCandidate: 'expo-audio',
    runtimeStatus: 'native_candidate_failed',
    sampleManifestVersion: 'test-12-string-manifest',
  });

  expect(
    createPrototypeRuntimeObservation(
      createPrototypeSamplerEngineHost({
        requestedCandidate: 'expo-audio',
        manifest: completeManifest,
        nativeCandidate: { status: 'ready', engine: nativeEngine },
        createFakeEngine: () => new FakeSamplerEngine(),
      }),
    ),
  ).toEqual({
    activeRuntime: 'expo-audio',
    nativePreloadStatus: 'ready',
    requestedCandidate: 'expo-audio',
    runtimeStatus: 'native_candidate_ready',
    sampleManifestVersion: 'test-12-string-manifest',
  });
});

test('includes unexpected sample string indexes in runtime observations', () => {
  expect(
    createPrototypeRuntimeObservation(
      createPrototypeSamplerEngineHost({
        requestedCandidate: 'expo-audio',
        manifest: {
          version: 'unexpected-manifest',
          assets: [
            ...completeManifest.assets,
            {
              ...(completeManifest.assets[0] as GayageumSampleAsset),
              id: 'string-13',
              stringIndex: 13,
            },
          ],
        },
        nativeCandidate: { status: 'ready', engine: { handleEvent: () => undefined } },
        createFakeEngine: () => new FakeSamplerEngine(),
      }),
    ),
  ).toEqual({
    activeRuntime: 'fake-prototype',
    nativePreloadStatus: 'not_started',
    requestedCandidate: 'expo-audio',
    runtimeStatus: 'invalid_sample_manifest',
    sampleManifestVersion: 'unexpected-manifest',
    unexpectedStringIndexes: [13],
  });
});

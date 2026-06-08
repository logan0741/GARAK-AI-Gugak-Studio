import { expect, test } from 'vitest';
import { FakeSamplerEngine } from '../../audio/fakeSamplerEngine';
import { SamplerEngine } from '../../audio/samplerEngine';
import { SampleAssetManifest } from '../../domain/sampleManifest';
import {
  createPrototypeSamplerEngineHost,
  getMissingSampleStringIndexes,
} from '../prototypeSamplerEngineHost';

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

test('reports missing sample strings before native candidate activation', () => {
  expect(
    getMissingSampleStringIndexes({
      version: 'partial',
      assets: completeManifest.assets.slice(0, 3),
    }),
  ).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('keeps the fake prototype engine when a native candidate has no complete manifest', () => {
  const host = createPrototypeSamplerEngineHost({
    requestedCandidate: 'react-native-audio-api',
    manifest: {
      version: 'partial',
      assets: completeManifest.assets.slice(0, 11),
    },
    nativeCandidate: { status: 'ready', engine: { handleEvent: () => undefined } },
    createFakeEngine: () => new FakeSamplerEngine(),
  });

  expect(host).toMatchObject({
    activeRuntime: 'fake-prototype',
    requestedCandidate: 'react-native-audio-api',
    manifestVersion: 'partial',
    status: 'missing_sample_manifest',
    missingStringIndexes: [12],
  });
  expect(host.engine).toBeInstanceOf(FakeSamplerEngine);
});

test('keeps the fake prototype engine when a manifest has duplicate string indexes', () => {
  const host = createPrototypeSamplerEngineHost({
    requestedCandidate: 'react-native-audio-api',
    manifest: {
      version: 'duplicate',
      assets: [...completeManifest.assets, { ...completeManifest.assets[0], id: 'duplicate-string-1' }],
    },
    nativeCandidate: { status: 'ready', engine: { handleEvent: () => undefined } },
    createFakeEngine: () => new FakeSamplerEngine(),
  });

  expect(host).toMatchObject({
    activeRuntime: 'fake-prototype',
    requestedCandidate: 'react-native-audio-api',
    manifestVersion: 'duplicate',
    status: 'duplicate_sample_manifest',
    missingStringIndexes: [],
    duplicateStringIndexes: [1],
  });
  expect(host.engine).toBeInstanceOf(FakeSamplerEngine);
});

test('keeps the fake prototype engine while a complete native candidate is preloading', () => {
  const fakeEngine = new FakeSamplerEngine();
  const host = createPrototypeSamplerEngineHost({
    requestedCandidate: 'react-native-audio-api',
    manifest: completeManifest,
    nativeCandidate: { status: 'preloading' },
    createFakeEngine: () => fakeEngine,
  });

  expect(host).toMatchObject({
    activeRuntime: 'fake-prototype',
    requestedCandidate: 'react-native-audio-api',
    manifestVersion: 'test-12-string-manifest',
    status: 'native_candidate_preloading',
    missingStringIndexes: [],
  });
  expect(host.engine).toBe(fakeEngine);
});

test('keeps the fake prototype engine when native candidate preload fails', () => {
  const fakeEngine = new FakeSamplerEngine();
  const host = createPrototypeSamplerEngineHost({
    requestedCandidate: 'expo-audio',
    manifest: completeManifest,
    nativeCandidate: { status: 'failed', errorMessage: 'native module unavailable' },
    createFakeEngine: () => fakeEngine,
  });

  expect(host).toMatchObject({
    activeRuntime: 'fake-prototype',
    requestedCandidate: 'expo-audio',
    manifestVersion: 'test-12-string-manifest',
    status: 'native_candidate_failed',
    missingStringIndexes: [],
    preloadErrorMessage: 'native module unavailable',
  });
  expect(host.engine).toBe(fakeEngine);
});

test('activates a native candidate host only after preload is ready', () => {
  const nativeEngine: SamplerEngine = {
    handleEvent: () => undefined,
  };
  const host = createPrototypeSamplerEngineHost({
    requestedCandidate: 'expo-audio',
    manifest: completeManifest,
    nativeCandidate: { status: 'ready', engine: nativeEngine },
    createFakeEngine: () => new FakeSamplerEngine(),
  });

  expect(host).toEqual({
    activeRuntime: 'expo-audio',
    requestedCandidate: 'expo-audio',
    engine: nativeEngine,
    manifestVersion: 'test-12-string-manifest',
    missingStringIndexes: [],
    duplicateStringIndexes: [],
    status: 'native_candidate_ready',
  });
});

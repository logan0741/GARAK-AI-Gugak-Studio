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
    createFakeEngine: () => new FakeSamplerEngine(),
    createNativeEngine: () => {
      throw new Error('native factory should not run without all 12 samples');
    },
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

test('creates a native candidate host when all 12 sample strings are present', () => {
  const nativeEngine: SamplerEngine = {
    handleEvent: () => undefined,
  };
  const host = createPrototypeSamplerEngineHost({
    requestedCandidate: 'expo-audio',
    manifest: completeManifest,
    createFakeEngine: () => new FakeSamplerEngine(),
    createNativeEngine: ({ candidate, manifest }) => {
      expect(candidate).toBe('expo-audio');
      expect(manifest.version).toBe('test-12-string-manifest');
      return nativeEngine;
    },
  });

  expect(host).toEqual({
    activeRuntime: 'expo-audio',
    requestedCandidate: 'expo-audio',
    engine: nativeEngine,
    manifestVersion: 'test-12-string-manifest',
    missingStringIndexes: [],
    status: 'native_candidate_ready',
  });
});

import { readFileSync, statSync } from 'node:fs';
import { expect, test } from 'vitest';
import { validateSampleAssetManifest } from '../../domain/sampleManifest';
import { createPrototypeSamplerEngineHost, getMissingSampleStringIndexes } from '../prototypeSamplerEngineHost';
import {
  prototypeGayageumSampleManifest,
  resolvePrototypeSampleAssetPath,
} from '../prototypeSampleManifest';

test('provides a validated 12-string synthetic dev sample manifest', () => {
  const manifest = validateSampleAssetManifest(prototypeGayageumSampleManifest);

  expect(manifest.version).toBe('dev-synthetic-gayageum-2026-06-08');
  expect(manifest.assets).toHaveLength(12);
  expect(manifest.assets.map((asset) => asset.stringIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  expect(manifest.assets.every((asset) => asset.sourceLayer === 'own_asset')).toBe(true);
  expect(getMissingSampleStringIndexes(manifest)).toEqual([]);
});

test('points every dev sample manifest entry at a local wav fixture', () => {
  for (const asset of prototypeGayageumSampleManifest.assets) {
    const assetPath = resolvePrototypeSampleAssetPath(asset);
    const header = readFileSync(assetPath).subarray(0, 12).toString('ascii');

    expect(statSync(assetPath).size).toBeGreaterThan(44);
    expect(header.slice(0, 4)).toBe('RIFF');
    expect(header.slice(8, 12)).toBe('WAVE');
  }
});

test('allows the prototype host to become native-candidate-ready after dev sample preload', () => {
  const nativeEngine = { handleEvent: () => undefined };

  const host = createPrototypeSamplerEngineHost({
    requestedCandidate: 'react-native-audio-api',
    manifest: prototypeGayageumSampleManifest,
    nativeCandidate: { status: 'ready', engine: nativeEngine },
    createFakeEngine: () => {
      throw new Error('fake engine should not be selected when all dev samples exist');
    },
  });

  expect(host).toMatchObject({
    activeRuntime: 'react-native-audio-api',
    status: 'native_candidate_ready',
    missingStringIndexes: [],
  });
  expect(host.manifestVersion).toBe('dev-synthetic-gayageum-2026-06-08');
});

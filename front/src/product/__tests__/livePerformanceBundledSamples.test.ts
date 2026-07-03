import { readFileSync, statSync } from 'node:fs';
import { expect, test } from 'vitest';
import type { SampleAssetManifest } from '../../domain/sampleManifest';
import { validateSampleAssetManifest } from '../../domain/sampleManifest';
import type { InstrumentId } from '../../studio/studioTypes';
import {
  getLivePerformanceBundledSampleManifest,
  getLivePerformanceRequiredStringIndexes,
  resolveLivePerformanceBundledSampleAssetPath,
} from '../livePerformanceBundledSamples';

test('bundles a public-asset janggu hit manifest for the S05 hit zones', () => {
  const manifest = validateSampleAssetManifest(
    getLivePerformanceBundledSampleManifest('janggu'),
  );

  expect(manifest.version).toBe('ngc-monotone-janggu-2026-07-03');
  expect(manifest.assets.map((asset) => asset.stringIndex)).toEqual([3, 6, 10]);
  expect(manifest.assets.every((asset) => asset.instrument === 'janggu')).toBe(true);
  expect(manifest.assets.every((asset) => asset.sourceLayer === 'public_asset')).toBe(true);
  expect(getLivePerformanceRequiredStringIndexes('janggu')).toEqual([3, 6, 10]);
});

test('bundles a public-asset daegeum scale manifest for the S05 melodic zones', () => {
  const manifest = validateSampleAssetManifest(
    getLivePerformanceBundledSampleManifest('daegeum'),
  );

  expect(manifest.version).toBe('ngc-monotone-sanjodaegeum-2026-07-03');
  expect(manifest.assets.map((asset) => asset.stringIndex)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  ]);
  expect(manifest.assets.every((asset) => asset.instrument === 'daegeum')).toBe(true);
  expect(manifest.assets.every((asset) => asset.sourceLayer === 'public_asset')).toBe(true);
  expect(getLivePerformanceRequiredStringIndexes('daegeum')).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  ]);
});

test('bundled live performance sample files are local WAV assets', () => {
  for (const instrument of ['janggu', 'daegeum'] as const) {
    for (const asset of requireBundledManifest(instrument).assets) {
      const assetPath = resolveLivePerformanceBundledSampleAssetPath(asset);
      const header = readFileSync(assetPath).subarray(0, 12).toString('ascii');

      expect(statSync(assetPath).size).toBeGreaterThan(44);
      expect(header.slice(0, 4)).toBe('RIFF');
      expect(header.slice(8, 12)).toBe('WAVE');
    }
  }
});

function requireBundledManifest(instrument: InstrumentId): SampleAssetManifest {
  const manifest = getLivePerformanceBundledSampleManifest(instrument);
  if (manifest === undefined) {
    throw new Error(`Bundled manifest missing for ${instrument}`);
  }

  return manifest;
}

import { expect, test } from 'vitest';
import { validateDataReferenceManifest } from '../dataReferenceManifest';
import { validateSampleAssetManifest } from '../sampleManifest';

test('sample manifest only allows playable asset layers', () => {
  const manifest = validateSampleAssetManifest({
    version: '2026-06-02-dev',
    assets: [
      {
        id: 'gayageum-01',
        instrument: 'gayageum_12',
        stringIndex: 1,
        pitchHz: 196,
        fileUri: 'asset://gayageum/01.wav',
        sourceLayer: 'public_asset',
        sourceName: 'NIGAK digital sound candidate',
        licenseNote: 'Public use candidate; verify before release',
      },
    ],
  });

  expect(manifest.assets[0].sourceLayer).toBe('public_asset');
});

test('sample manifest accepts MVP instrument manifests beyond gayageum', () => {
  const manifest = validateSampleAssetManifest({
    version: '2026-07-janggu-candidate',
    assets: [
      {
        id: 'janggu-left-hit',
        instrument: 'janggu',
        stringIndex: 3,
        pitchHz: 110,
        fileUri: 'assets/audio/janggu/left-hit.wav',
        sourceLayer: 'public_asset',
        sourceName: 'National Gugak Center monotone candidate',
        licenseNote: 'Public asset candidate; verify attribution before release',
      },
      {
        id: 'janggu-center-hit',
        instrument: 'janggu',
        stringIndex: 6,
        pitchHz: 130,
        fileUri: 'assets/audio/janggu/center-hit.wav',
        sourceLayer: 'public_asset',
        sourceName: 'National Gugak Center monotone candidate',
        licenseNote: 'Public asset candidate; verify attribution before release',
      },
      {
        id: 'janggu-right-hit',
        instrument: 'janggu',
        stringIndex: 10,
        pitchHz: 160,
        fileUri: 'assets/audio/janggu/right-hit.wav',
        sourceLayer: 'public_asset',
        sourceName: 'National Gugak Center monotone candidate',
        licenseNote: 'Public asset candidate; verify attribution before release',
      },
    ],
  });

  expect(manifest.assets.map((asset) => asset.instrument)).toEqual([
    'janggu',
    'janggu',
    'janggu',
  ]);
});

test('sample manifest rejects analysis references as playable assets', () => {
  expect(() =>
    validateSampleAssetManifest({
      version: 'bad',
      assets: [
        {
          id: 'analysis-only',
          instrument: 'gayageum_12',
          stringIndex: 1,
          pitchHz: 196,
          fileUri: 'asset://bad.wav',
          sourceLayer: 'analysis_reference',
          sourceName: 'AI Hub',
          licenseNote: 'not playable',
        },
      ],
    }),
  ).toThrow('sourceLayer must be public_asset or own_asset');
});

test('sample manifest rejects unsupported instruments', () => {
  expect(() =>
    validateSampleAssetManifest({
      version: 'bad',
      assets: [
        {
          id: 'wrong-instrument',
          instrument: 'piano',
          stringIndex: 1,
          pitchHz: 196,
          fileUri: 'asset://bad.wav',
          sourceLayer: 'public_asset',
          sourceName: 'Candidate source',
          licenseNote: 'Candidate license',
        },
      ],
    } as any),
  ).toThrow('instrument must be gayageum_12, janggu, or daegeum');
});

test('sample manifest rejects non-positive pitch values', () => {
  expect(() =>
    validateSampleAssetManifest({
      version: 'bad',
      assets: [
        {
          id: 'bad-pitch',
          instrument: 'gayageum_12',
          stringIndex: 1,
          pitchHz: 0,
          fileUri: 'asset://bad.wav',
          sourceLayer: 'public_asset',
          sourceName: 'Candidate source',
          licenseNote: 'Candidate license',
        },
      ],
    }),
  ).toThrow('pitchHz must be a positive finite number');
});

test('sample manifest rejects missing attribution fields', () => {
  expect(() =>
    validateSampleAssetManifest({
      version: 'bad',
      assets: [
        {
          id: 'missing-attribution',
          instrument: 'gayageum_12',
          stringIndex: 1,
          pitchHz: 196,
          fileUri: 'asset://bad.wav',
          sourceLayer: 'public_asset',
          sourceName: '',
          licenseNote: '',
        },
      ],
    }),
  ).toThrow('must include sourceName and licenseNote');
});

test('data reference manifest allows analysis and validation references', () => {
  const manifest = validateDataReferenceManifest({
    version: '2026-06-02-dev',
    references: [
      {
        id: 'aihub-gugak-score-audio',
        referenceLayer: 'analysis_reference',
        sourceName: 'AI Hub 국악 악보 및 음원 데이터',
        usage: 'pitch/envelope/jangdan analysis reference',
      },
    ],
  });

  expect(manifest.references[0].referenceLayer).toBe('analysis_reference');
});

test('data reference manifest rejects missing reference id', () => {
  expect(() =>
    validateDataReferenceManifest({
      version: 'bad',
      references: [
        {
          id: '',
          referenceLayer: 'analysis_reference',
          sourceName: 'AI Hub',
          usage: 'analysis only',
        },
      ],
    }),
  ).toThrow('DataReference.id is required');
});

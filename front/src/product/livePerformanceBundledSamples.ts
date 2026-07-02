import type { SampleAsset, SampleAssetManifest } from '../domain/sampleManifest';
import type { InstrumentId } from '../studio/studioTypes';

export const NGC_MONOTONE_SAMPLE_DIRECTORY = 'assets/audio/ngc-monotone';
export const NGC_MONOTONE_SOURCE_NAME =
  'National Gugak Center Korean Traditional Instrument Digital Sound - Monotone';
export const NGC_MONOTONE_LICENSE_NOTE =
  'KOGL Type 1 attribution required. Source: National Gugak Center, Monotone Download.';

const GAYAGEUM_REQUIRED_STRING_INDEXES = createSequentialStringIndexes(12);
const JANGGU_REQUIRED_STRING_INDEXES = [3, 6, 10] as const;
const DAEGEUM_REQUIRED_STRING_INDEXES = createSequentialStringIndexes(12);

const jangguAssets: SampleAsset[] = [
  {
    id: 'ngc-janggu-kung-strong',
    instrument: 'janggu',
    stringIndex: 3,
    pitchHz: 110,
    fileUri: `${NGC_MONOTONE_SAMPLE_DIRECTORY}/janggu/kung-strong.wav`,
    sourceLayer: 'public_asset',
    sourceName: NGC_MONOTONE_SOURCE_NAME,
    licenseNote: `${NGC_MONOTONE_LICENSE_NOTE} Original file: Janggu_3_1.wav, mntnSeq=2288.`,
  },
  {
    id: 'ngc-janggu-deong-strong',
    instrument: 'janggu',
    stringIndex: 6,
    pitchHz: 130,
    fileUri: `${NGC_MONOTONE_SAMPLE_DIRECTORY}/janggu/deong-strong.wav`,
    sourceLayer: 'public_asset',
    sourceName: NGC_MONOTONE_SOURCE_NAME,
    licenseNote: `${NGC_MONOTONE_LICENSE_NOTE} Original file: Janggu_1_1.wav, mntnSeq=2282.`,
  },
  {
    id: 'ngc-janggu-deok-strong',
    instrument: 'janggu',
    stringIndex: 10,
    pitchHz: 160,
    fileUri: `${NGC_MONOTONE_SAMPLE_DIRECTORY}/janggu/deok-strong.wav`,
    sourceLayer: 'public_asset',
    sourceName: NGC_MONOTONE_SOURCE_NAME,
    licenseNote: `${NGC_MONOTONE_LICENSE_NOTE} Original file: Janggu_5_1.wav, mntnSeq=2294.`,
  },
];

const DAEGEUM_APPROXIMATE_PITCHES_HZ = [
  261.63,
  293.66,
  329.63,
  349.23,
  392,
  440,
  493.88,
  523.25,
  587.33,
  659.25,
  698.46,
  783.99,
] as const;

const daegeumAssets: SampleAsset[] = DAEGEUM_APPROXIMATE_PITCHES_HZ.map((pitchHz, index) => {
  const stringIndex = index + 1;

  return {
    id: `ngc-sanjodaegeum-note-${String(stringIndex).padStart(2, '0')}`,
    instrument: 'daegeum',
    stringIndex,
    pitchHz,
    fileUri: `${NGC_MONOTONE_SAMPLE_DIRECTORY}/daegeum/note-${String(stringIndex).padStart(2, '0')}.wav`,
    sourceLayer: 'public_asset',
    sourceName: NGC_MONOTONE_SOURCE_NAME,
    licenseNote: `${NGC_MONOTONE_LICENSE_NOTE} Cropped from sanjo_deageum_scale_sus_04.wav, mntnSeq=2550.`,
  };
});

export const jangguNgcMonotoneSampleManifest: SampleAssetManifest = {
  version: 'ngc-monotone-janggu-2026-07-03',
  assets: jangguAssets,
};

export const daegeumNgcMonotoneSampleManifest: SampleAssetManifest = {
  version: 'ngc-monotone-sanjodaegeum-2026-07-03',
  assets: daegeumAssets,
};

export function getLivePerformanceBundledSampleManifest(
  instrument: InstrumentId,
): SampleAssetManifest | undefined {
  if (instrument === 'janggu') {
    return jangguNgcMonotoneSampleManifest;
  }

  if (instrument === 'daegeum') {
    return daegeumNgcMonotoneSampleManifest;
  }

  return undefined;
}

export function getLivePerformanceRequiredStringIndexes(
  instrument: InstrumentId,
): readonly number[] {
  if (instrument === 'janggu') {
    return JANGGU_REQUIRED_STRING_INDEXES;
  }

  if (instrument === 'daegeum') {
    return DAEGEUM_REQUIRED_STRING_INDEXES;
  }

  return GAYAGEUM_REQUIRED_STRING_INDEXES;
}

export function resolveLivePerformanceBundledSampleAssetPath(
  asset: Pick<SampleAsset, 'fileUri'>,
): string {
  return asset.fileUri;
}

function createSequentialStringIndexes(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

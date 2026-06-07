import { SampleAsset, SampleAssetManifest } from '../domain/sampleManifest';

export const PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY = 'assets/audio/gayageum-dev';
export const PROTOTYPE_GAYAGEUM_SAMPLE_MANIFEST_VERSION = 'dev-synthetic-gayageum-2026-06-08';

const DEV_SAMPLE_PITCHES_HZ = [
  196,
  207.65,
  220,
  246.94,
  261.63,
  293.66,
  329.63,
  349.23,
  392,
  440,
  493.88,
  523.25,
] as const;

export const prototypeGayageumSampleManifest: SampleAssetManifest = {
  version: PROTOTYPE_GAYAGEUM_SAMPLE_MANIFEST_VERSION,
  assets: DEV_SAMPLE_PITCHES_HZ.map((pitchHz, index) => {
    const stringIndex = index + 1;
    return {
      id: `dev-gayageum-string-${String(stringIndex).padStart(2, '0')}`,
      instrument: 'gayageum_12',
      stringIndex,
      pitchHz,
      fileUri: `${PROTOTYPE_GAYAGEUM_SAMPLE_DIRECTORY}/string-${String(stringIndex).padStart(2, '0')}.wav`,
      sourceLayer: 'own_asset',
      sourceName: 'GUKAK STUDIO synthetic dev sample',
      licenseNote: 'Generated in-repo for Week 1 technical QA only; replace before release.',
    };
  }),
};

export function resolvePrototypeSampleAssetPath(asset: Pick<SampleAsset, 'fileUri'>): string {
  return asset.fileUri;
}

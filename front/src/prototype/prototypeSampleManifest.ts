import { SampleAsset, SampleAssetManifest, SampleSourceLayer } from '../domain/sampleManifest';

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

export type PrototypeSampleManifestProvenanceSummary = {
  assetCount: number;
  licenseNotes: string[];
  qualityNote: string;
  releaseReady: boolean;
  sourceLayerCounts: Record<SampleSourceLayer, number>;
  sourceNames: string[];
};

export function summarizePrototypeSampleManifestProvenance(
  manifest: SampleAssetManifest,
): PrototypeSampleManifestProvenanceSummary {
  const licenseNotes = collectUniqueStrings(
    manifest.assets.map((asset) => asset.licenseNote),
  );
  const sourceNames = collectUniqueStrings(manifest.assets.map((asset) => asset.sourceName));
  const releaseReady = !isPrototypeTechnicalFixture(manifest);

  return {
    assetCount: manifest.assets.length,
    licenseNotes,
    qualityNote: releaseReady
      ? 'Candidate release asset; verify final recording quality before publish.'
      : 'Technical fixture only; replace before release-quality sound decisions.',
    releaseReady,
    sourceLayerCounts: countSourceLayers(manifest.assets),
    sourceNames,
  };
}

export function resolvePrototypeSampleAssetPath(asset: Pick<SampleAsset, 'fileUri'>): string {
  return asset.fileUri;
}

function collectUniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function countSourceLayers(assets: SampleAsset[]): Record<SampleSourceLayer, number> {
  return assets.reduce<Record<SampleSourceLayer, number>>(
    (counts, asset) => ({
      ...counts,
      [asset.sourceLayer]: counts[asset.sourceLayer] + 1,
    }),
    {
      own_asset: 0,
      public_asset: 0,
    },
  );
}

function isPrototypeTechnicalFixture(manifest: SampleAssetManifest): boolean {
  return (
    manifest.version === PROTOTYPE_GAYAGEUM_SAMPLE_MANIFEST_VERSION ||
    manifest.assets.some((asset) => asset.licenseNote.toLowerCase().includes('replace before release'))
  );
}

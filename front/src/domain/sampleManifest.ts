import { assertStringIndex } from './performanceEvent';

export type SampleSourceLayer = 'public_asset' | 'own_asset';
export type SampleInstrumentId = 'gayageum_12' | 'janggu' | 'daegeum';

export type SampleAsset = {
  id: string;
  instrument: SampleInstrumentId;
  stringIndex: number;
  pitchHz?: number;
  basePitchCents?: number;
  fileUri: string;
  sourceLayer: SampleSourceLayer;
  sourceName: string;
  licenseNote: string;
};

export type SampleAssetManifest = {
  version: string;
  assets: SampleAsset[];
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, errorMessage: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(errorMessage);
  }

  return value;
}

function requireSourceLayer(value: unknown): SampleSourceLayer {
  if (value !== 'public_asset' && value !== 'own_asset') {
    throw new Error('sourceLayer must be public_asset or own_asset');
  }

  return value;
}

function requireSampleInstrument(value: unknown): SampleInstrumentId {
  if (value !== 'gayageum_12' && value !== 'janggu' && value !== 'daegeum') {
    throw new Error('instrument must be gayageum_12, janggu, or daegeum');
  }

  return value;
}

function optionalPositiveFiniteNumber(value: unknown, errorMessage: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(errorMessage);
  }

  return value;
}

function optionalFiniteNumber(value: unknown, errorMessage: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(errorMessage);
  }

  return value;
}

function validateSampleAsset(assetCandidate: unknown): SampleAsset {
  if (!isRecord(assetCandidate)) {
    throw new Error('SampleAsset must be an object');
  }

  const id = requireNonEmptyString(assetCandidate.id, 'SampleAsset.id is required');

  const instrument = requireSampleInstrument(assetCandidate.instrument);
  if (typeof assetCandidate.stringIndex !== 'number') {
    throw new Error('stringIndex must be a number');
  }
  const pitchHz = optionalPositiveFiniteNumber(
    assetCandidate.pitchHz,
    'pitchHz must be a positive finite number',
  );
  const basePitchCents = optionalFiniteNumber(
    assetCandidate.basePitchCents,
    'basePitchCents must be a finite number',
  );
  if (pitchHz === undefined && basePitchCents === undefined) {
    throw new Error('pitchHz or basePitchCents is required');
  }

  assertStringIndex(assetCandidate.stringIndex);

  const fileUri = requireNonEmptyString(assetCandidate.fileUri, `SampleAsset ${id} must include fileUri`);
  const sourceLayer = requireSourceLayer(assetCandidate.sourceLayer);
  const sourceName = requireNonEmptyString(assetCandidate.sourceName, `SampleAsset ${id} must include sourceName and licenseNote`);
  const licenseNote = requireNonEmptyString(assetCandidate.licenseNote, `SampleAsset ${id} must include sourceName and licenseNote`);

  return {
    id,
    instrument,
    stringIndex: assetCandidate.stringIndex,
    ...(pitchHz === undefined ? {} : { pitchHz }),
    ...(basePitchCents === undefined ? {} : { basePitchCents }),
    fileUri,
    sourceLayer,
    sourceName,
    licenseNote,
  };
}

export function validateSampleAssetManifest(manifest: unknown): SampleAssetManifest {
  if (!isRecord(manifest)) {
    throw new Error('SampleAssetManifest must be an object');
  }

  const version = requireNonEmptyString(manifest.version, 'SampleAssetManifest.version is required');
  if (!Array.isArray(manifest.assets)) {
    throw new Error('SampleAssetManifest.assets must be an array');
  }

  return {
    version,
    assets: manifest.assets.map(validateSampleAsset),
  };
}

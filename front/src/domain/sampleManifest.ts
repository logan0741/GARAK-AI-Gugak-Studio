import {
  DaegeumFingering,
  JangguSurface,
  assertDaegeumFingering,
  assertJangguSurface,
  assertStringIndex,
} from './performanceEvent';

export type SampleSourceLayer = 'public_asset' | 'own_asset';

type BaseSampleAsset = {
  id: string;
  fileUri: string;
  sourceLayer: SampleSourceLayer;
  sourceName: string;
  licenseNote: string;
};

export type GayageumSampleAsset = BaseSampleAsset & {
  instrument: 'gayageum_12';
  stringIndex: number;
  pitchHz: number;
};

export type JangguSampleAsset = BaseSampleAsset & {
  instrument: 'janggu';
  surface: JangguSurface;
};

export type DaegeumSampleAsset = BaseSampleAsset & {
  instrument: 'daegeum';
  fingering: DaegeumFingering;
  pitchHz: number;
};

export type SampleAsset = GayageumSampleAsset | JangguSampleAsset | DaegeumSampleAsset;

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

function requirePositiveFiniteNumber(value: unknown, errorMessage: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(errorMessage);
  }

  return value;
}

function validateGayageumSampleAsset(input: {
  assetCandidate: UnknownRecord;
  base: BaseSampleAsset;
}): GayageumSampleAsset {
  if (typeof input.assetCandidate.stringIndex !== 'number') {
    throw new Error('stringIndex must be a number');
  }

  assertStringIndex(input.assetCandidate.stringIndex);
  const pitchHz = requirePositiveFiniteNumber(
    input.assetCandidate.pitchHz,
    'pitchHz must be a positive finite number',
  );

  return {
    ...input.base,
    instrument: 'gayageum_12',
    stringIndex: input.assetCandidate.stringIndex,
    pitchHz,
  };
}

function validateJangguSampleAsset(input: {
  assetCandidate: UnknownRecord;
  base: BaseSampleAsset;
}): JangguSampleAsset {
  assertJangguSurface(input.assetCandidate.surface as JangguSurface);

  return {
    ...input.base,
    instrument: 'janggu',
    surface: input.assetCandidate.surface as JangguSurface,
  };
}

function validateDaegeumSampleAsset(input: {
  assetCandidate: UnknownRecord;
  base: BaseSampleAsset;
}): DaegeumSampleAsset {
  assertDaegeumFingering(input.assetCandidate.fingering as DaegeumFingering);
  const pitchHz = requirePositiveFiniteNumber(
    input.assetCandidate.pitchHz,
    'pitchHz must be a positive finite number',
  );

  return {
    ...input.base,
    instrument: 'daegeum',
    fingering: input.assetCandidate.fingering as DaegeumFingering,
    pitchHz,
  };
}

function validateSampleAsset(assetCandidate: unknown): SampleAsset {
  if (!isRecord(assetCandidate)) {
    throw new Error('SampleAsset must be an object');
  }

  const id = requireNonEmptyString(assetCandidate.id, 'SampleAsset.id is required');
  const fileUri = requireNonEmptyString(assetCandidate.fileUri, `SampleAsset ${id} must include fileUri`);
  const sourceLayer = requireSourceLayer(assetCandidate.sourceLayer);
  const sourceName = requireNonEmptyString(assetCandidate.sourceName, `SampleAsset ${id} must include sourceName and licenseNote`);
  const licenseNote = requireNonEmptyString(assetCandidate.licenseNote, `SampleAsset ${id} must include sourceName and licenseNote`);

  const base = {
    id,
    fileUri,
    sourceLayer,
    sourceName,
    licenseNote,
  };

  if (assetCandidate.instrument === 'gayageum_12') {
    return validateGayageumSampleAsset({ assetCandidate, base });
  }

  if (assetCandidate.instrument === 'janggu') {
    return validateJangguSampleAsset({ assetCandidate, base });
  }

  if (assetCandidate.instrument === 'daegeum') {
    return validateDaegeumSampleAsset({ assetCandidate, base });
  }

  throw new Error('instrument must be gayageum_12, janggu, or daegeum');
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

export function isGayageumSampleAsset(asset: SampleAsset): asset is GayageumSampleAsset {
  return asset.instrument === 'gayageum_12';
}

export function isJangguSampleAsset(asset: SampleAsset): asset is JangguSampleAsset {
  return asset.instrument === 'janggu';
}

export function isDaegeumSampleAsset(asset: SampleAsset): asset is DaegeumSampleAsset {
  return asset.instrument === 'daegeum';
}

export function getSampleAssetPlaybackKey(asset: SampleAsset): string {
  if (isGayageumSampleAsset(asset)) {
    return `gayageum_12:string:${asset.stringIndex}`;
  }

  if (isJangguSampleAsset(asset)) {
    return `janggu:surface:${asset.surface}`;
  }

  return `daegeum:fingering:${asset.fingering}`;
}

export function describeSampleAssetPlaybackTarget(asset: SampleAsset): string {
  if (isGayageumSampleAsset(asset)) {
    return `string ${asset.stringIndex}`;
  }

  if (isJangguSampleAsset(asset)) {
    return `janggu surface ${asset.surface}`;
  }

  return `daegeum fingering ${asset.fingering}`;
}

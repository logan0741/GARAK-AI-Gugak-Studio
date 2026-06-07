export type ReferenceLayer = 'analysis_reference' | 'validation_reference';

export type DataReference = {
  id: string;
  referenceLayer: ReferenceLayer;
  sourceName: string;
  usage: string;
};

export type DataReferenceManifest = {
  version: string;
  references: DataReference[];
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

function requireReferenceLayer(value: unknown): ReferenceLayer {
  if (value !== 'analysis_reference' && value !== 'validation_reference') {
    throw new Error('referenceLayer must be analysis_reference or validation_reference');
  }

  return value;
}

function validateDataReference(referenceCandidate: unknown): DataReference {
  if (!isRecord(referenceCandidate)) {
    throw new Error('DataReference must be an object');
  }

  const id = requireNonEmptyString(referenceCandidate.id, 'DataReference.id is required');
  const referenceLayer = requireReferenceLayer(referenceCandidate.referenceLayer);
  const sourceName = requireNonEmptyString(referenceCandidate.sourceName, `DataReference ${id} must include sourceName and usage`);
  const usage = requireNonEmptyString(referenceCandidate.usage, `DataReference ${id} must include sourceName and usage`);

  return {
    id,
    referenceLayer,
    sourceName,
    usage,
  };
}

export function validateDataReferenceManifest(manifest: unknown): DataReferenceManifest {
  if (!isRecord(manifest)) {
    throw new Error('DataReferenceManifest must be an object');
  }

  const version = requireNonEmptyString(manifest.version, 'DataReferenceManifest.version is required');
  if (!Array.isArray(manifest.references)) {
    throw new Error('DataReferenceManifest.references must be an array');
  }

  return {
    version,
    references: manifest.references.map(validateDataReference),
  };
}

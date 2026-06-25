import { validateSampleAssetManifest, type SampleAssetManifest } from '../domain/sampleManifest';
import type { InstrumentId } from '../studio/studioTypes';

export type InstrumentSampleStatus = 'ready' | 'fallback' | 'downloadRequired';

export type InstrumentSampleStatusMap = Record<InstrumentId, InstrumentSampleStatus>;

export type InstrumentSampleReadinessInput = {
  sampleManifests?: Partial<Record<InstrumentId, SampleAssetManifest>>;
  fallbackInstruments?: readonly InstrumentId[];
};

const PRODUCT_INSTRUMENTS: InstrumentId[] = ['gayageum', 'janggu', 'daegeum'];
const FALLBACK_SAMPLE_INSTRUMENTS = new Set<InstrumentId>(['janggu', 'daegeum']);
const GAYAGEUM_STRING_COUNT = 12;

export function resolveInstrumentSampleStatuses(
  input: InstrumentSampleReadinessInput = {},
): InstrumentSampleStatusMap {
  const fallbackInstrumentSet = new Set(input.fallbackInstruments ?? []);

  return PRODUCT_INSTRUMENTS.reduce<InstrumentSampleStatusMap>(
    (statuses, instrument) => ({
      ...statuses,
      [instrument]: resolveInstrumentSampleStatus(
        instrument,
        input.sampleManifests?.[instrument],
        fallbackInstrumentSet,
      ),
    }),
    {
      gayageum: 'downloadRequired',
      janggu: 'downloadRequired',
      daegeum: 'downloadRequired',
    },
  );
}

function resolveInstrumentSampleStatus(
  instrument: InstrumentId,
  manifest: SampleAssetManifest | undefined,
  fallbackInstrumentSet: ReadonlySet<InstrumentId>,
): InstrumentSampleStatus {
  if (hasReadyInstrumentManifest(instrument, manifest)) {
    return 'ready';
  }

  return fallbackInstrumentSet.has(instrument) && FALLBACK_SAMPLE_INSTRUMENTS.has(instrument)
    ? 'fallback'
    : 'downloadRequired';
}

function hasReadyInstrumentManifest(
  instrument: InstrumentId,
  manifest: SampleAssetManifest | undefined,
): boolean {
  if (instrument !== 'gayageum' || manifest === undefined) {
    return false;
  }

  let validatedManifest: SampleAssetManifest;
  try {
    validatedManifest = validateSampleAssetManifest(manifest);
  } catch {
    return false;
  }

  const stringIndexes = new Set(
    validatedManifest.assets
      .filter((asset) => asset.instrument === 'gayageum_12')
      .map((asset) => asset.stringIndex),
  );

  return Array.from({ length: GAYAGEUM_STRING_COUNT }, (_, index) => index + 1).every((stringIndex) =>
    stringIndexes.has(stringIndex),
  );
}

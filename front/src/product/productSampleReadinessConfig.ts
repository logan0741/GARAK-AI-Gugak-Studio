import type { InstrumentSampleReadinessInput } from './instrumentSampleReadiness';
import { productionGayageumSampleManifest } from './productionSampleManifest';

export const PRODUCT_SAMPLE_MANIFESTS = {
  gayageum: productionGayageumSampleManifest,
} satisfies NonNullable<InstrumentSampleReadinessInput['sampleManifests']>;

export const PRODUCT_SAMPLE_FALLBACK_INSTRUMENTS = [
  'janggu',
  'daegeum',
] as const satisfies NonNullable<InstrumentSampleReadinessInput['fallbackInstruments']>;

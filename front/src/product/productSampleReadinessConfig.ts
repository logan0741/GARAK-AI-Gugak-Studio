import { prototypeGayageumSampleManifest } from '../prototype/prototypeSampleManifest';
import type { InstrumentSampleReadinessInput } from './instrumentSampleReadiness';

export const PRODUCT_SAMPLE_MANIFESTS = {
  gayageum: prototypeGayageumSampleManifest,
} satisfies NonNullable<InstrumentSampleReadinessInput['sampleManifests']>;

export const PRODUCT_SAMPLE_FALLBACK_INSTRUMENTS = [
  'janggu',
  'daegeum',
] as const satisfies NonNullable<InstrumentSampleReadinessInput['fallbackInstruments']>;

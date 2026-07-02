import type { SampleInstrumentId } from '../domain/sampleManifest';
import type { InstrumentId } from '../studio/studioTypes';

export function toSampleManifestInstrumentId(instrument: InstrumentId): SampleInstrumentId {
  if (instrument === 'gayageum') {
    return 'gayageum_12';
  }

  return instrument;
}

import type { AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import type { SamplerEngine } from '../audio/samplerEngine';
import type { SampleAssetManifest } from '../domain/sampleManifest';
import type { InstrumentId } from '../studio/studioTypes';
import type {
  GarakProductServices,
  PrepareLivePerformanceAudioResult,
  ServiceResult,
} from './garakProductServices';

export type LivePerformanceAudioPort = Pick<
  GarakProductServices['audio'],
  'prepareLivePerformanceAudio' | 'playPerformanceEvents'
>;

export type LivePerformanceSamplerBundle = {
  engine: SamplerEngine;
  sampleSourceLabel: string;
  releaseReady: boolean;
};

export type LivePerformanceSamplerFactory = (input: {
  instrument: InstrumentId;
  manifest?: SampleAssetManifest;
}) => Promise<LivePerformanceSamplerBundle>;

export type LivePerformanceSampleManifestLoader = (input: {
  instrument: InstrumentId;
}) => Promise<ServiceResult<SampleAssetManifest>>;

export function createLivePerformanceAudioPort(
  input: {
    createSampler?: LivePerformanceSamplerFactory;
    loadSampleManifest?: LivePerformanceSampleManifestLoader;
  } = {},
): LivePerformanceAudioPort {
  const createSampler = input.createSampler ?? createDefaultLivePerformanceSampler;
  const loadSampleManifest = input.loadSampleManifest;
  const preparedSamplers = new Map<InstrumentId, LivePerformanceSamplerBundle>();
  const preparingSamplers = new Map<InstrumentId, Promise<LivePerformanceSamplerBundle>>();

  async function prepareSampler(instrument: InstrumentId): Promise<LivePerformanceSamplerBundle> {
    const preparedSampler = preparedSamplers.get(instrument);
    if (preparedSampler !== undefined) {
      return preparedSampler;
    }

    const preparingSampler = preparingSamplers.get(instrument);
    if (preparingSampler !== undefined) {
      return preparingSampler;
    }

    const nextPreparingSampler = prepareSamplerBundle({
      instrument,
      createSampler,
      loadSampleManifest,
    })
      .then((sampler) => {
        preparedSamplers.set(instrument, sampler);
        return sampler;
      })
      .finally(() => {
        preparingSamplers.delete(instrument);
      });
    preparingSamplers.set(instrument, nextPreparingSampler);

    return nextPreparingSampler;
  }

  return {
    async prepareLivePerformanceAudio(input) {
      try {
        const sampler = await prepareSampler(input.instrument);
        return {
          status: 'ok',
          value: createPrepareResult(input.instrument, sampler),
        };
      } catch (error) {
        return {
          status: 'error',
          message: getErrorMessage(error),
        };
      }
    },
    async playPerformanceEvents(input) {
      const { events, instrument } = input;
      if (events.length === 0) {
        return {
          status: 'ok',
          value: { handledEvents: 0 },
        };
      }

      try {
        const sampler = await prepareSampler(instrument);
        events.forEach((event) => sampler.engine.handleEvent(event));

        return {
          status: 'ok',
          value: { handledEvents: events.length },
        };
      } catch (error) {
        return {
          status: 'error',
          message: getErrorMessage(error),
        };
      }
    },
  };
}

async function prepareSamplerBundle(input: {
  instrument: InstrumentId;
  createSampler: LivePerformanceSamplerFactory;
  loadSampleManifest: LivePerformanceSampleManifestLoader | undefined;
}): Promise<LivePerformanceSamplerBundle> {
  const manifest = await loadLiveSampleManifest({
    instrument: input.instrument,
    loadSampleManifest: input.loadSampleManifest,
  });

  try {
    return await input.createSampler({ instrument: input.instrument, manifest });
  } catch (error) {
    if (manifest === undefined) {
      throw error;
    }

    return input.createSampler({ instrument: input.instrument });
  }
}

async function loadLiveSampleManifest(input: {
  instrument: InstrumentId;
  loadSampleManifest: LivePerformanceSampleManifestLoader | undefined;
}): Promise<SampleAssetManifest | undefined> {
  if (input.loadSampleManifest === undefined) {
    return undefined;
  }

  try {
    const result = await input.loadSampleManifest({ instrument: input.instrument });
    return result.status === 'ok' ? result.value : undefined;
  } catch {
    return undefined;
  }
}

function createPrepareResult(
  instrument: InstrumentId,
  sampler: LivePerformanceSamplerBundle,
): PrepareLivePerformanceAudioResult {
  return {
    instrument,
    sampleSourceLabel: sampler.sampleSourceLabel,
    releaseReady: sampler.releaseReady,
  };
}

async function createDefaultLivePerformanceSampler(input: {
  instrument: InstrumentId;
  manifest?: SampleAssetManifest;
}): Promise<LivePerformanceSamplerBundle> {
  const candidates: AudioEngineCandidateId[] = ['react-native-audio-api', 'expo-audio'];
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return await createNativeSampler(candidate, input.manifest);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Live performance sampler failed to start: ${getErrorMessage(lastError)}`);
}

async function createNativeSampler(
  candidate: AudioEngineCandidateId,
  manifest: SampleAssetManifest | undefined,
): Promise<LivePerformanceSamplerBundle> {
  const [
    { createAndPreloadPrototypeNativeSamplerEngine },
    { prototypeGayageumSampleManifest, summarizePrototypeSampleManifestProvenance },
  ] = await Promise.all([
    import('../prototype/prototypeNativeSamplerEngineFactory'),
    import('../prototype/prototypeSampleManifest'),
  ]);
  const samplerManifest = manifest ?? prototypeGayageumSampleManifest;
  const provenance = summarizePrototypeSampleManifestProvenance(samplerManifest);
  const engine = await createAndPreloadPrototypeNativeSamplerEngine({
    candidate,
    manifest: samplerManifest,
  });

  return {
    engine,
    sampleSourceLabel: `${candidate} / ${provenance.sourceNames.join(', ')}`,
    releaseReady: provenance.releaseReady,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

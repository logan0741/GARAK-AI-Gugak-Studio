import type { AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import type { SamplerEngine } from '../audio/samplerEngine';
import type { SampleAssetManifest } from '../domain/sampleManifest';
import type { InstrumentId } from '../studio/studioTypes';
import type {
  GarakProductServices,
  PrepareLivePerformanceAudioResult,
  ServiceResult,
} from './garakProductServices';
import {
  getLivePerformanceBundledSampleManifest,
  getLivePerformanceRequiredStringIndexes,
} from './livePerformanceBundledSamples';

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
  const requiredStringIndexes = getLivePerformanceRequiredStringIndexes(input.instrument);
  const bundledManifest = input.manifest ?? getLivePerformanceBundledSampleManifest(input.instrument);
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return await createNativeSampler({
        candidate,
        manifest: bundledManifest,
        requiredStringIndexes,
        useLivePerformanceAssetResolver: bundledManifest !== undefined,
      });
    } catch (error) {
      lastError = error;
    }
  }

  if (bundledManifest !== undefined && input.manifest === undefined) {
    for (const candidate of candidates) {
      try {
        return await createNativeSampler({
          candidate,
          requiredStringIndexes: getLivePerformanceRequiredStringIndexes('gayageum'),
          useLivePerformanceAssetResolver: false,
        });
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw new Error(`Live performance sampler failed to start: ${getErrorMessage(lastError)}`);
}

async function createNativeSampler(input: {
  candidate: AudioEngineCandidateId;
  manifest?: SampleAssetManifest;
  requiredStringIndexes: readonly number[];
  useLivePerformanceAssetResolver: boolean;
}): Promise<LivePerformanceSamplerBundle> {
  const [
    { createAndPreloadPrototypeNativeSamplerEngine },
    { prototypeGayageumSampleManifest, summarizePrototypeSampleManifestProvenance },
    livePerformanceAssetRegistry,
  ] = await Promise.all([
    import('../prototype/prototypeNativeSamplerEngineFactory'),
    import('../prototype/prototypeSampleManifest'),
    input.useLivePerformanceAssetResolver
      ? import('./livePerformanceBundledSampleAssetRegistry')
      : Promise.resolve(undefined),
  ]);
  const samplerManifest = input.manifest ?? prototypeGayageumSampleManifest;
  const provenance = summarizePrototypeSampleManifestProvenance(samplerManifest);
  const engine = await createAndPreloadPrototypeNativeSamplerEngine({
    candidate: input.candidate,
    manifest: samplerManifest,
    requiredStringIndexes: input.requiredStringIndexes,
    assetResolver: livePerformanceAssetRegistry?.createLivePerformanceBundledSampleAssetResolver(),
  });

  return {
    engine,
    sampleSourceLabel: `${input.candidate} / ${provenance.sourceNames.join(', ')}`,
    releaseReady: provenance.releaseReady,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

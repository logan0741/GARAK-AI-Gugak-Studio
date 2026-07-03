import type { AuthSessionStore } from './authSessionStore';
import type { AuthStoragePort } from './authSessionStore';
import {
  createHttpGarakProductServices,
  type GarakFetch,
} from './garakHttpProductServices';
import type { GarakProductServices } from './garakProductServices';
import {
  createLivePerformanceAudioPort,
  type LivePerformanceSampleManifestLoader,
  type LivePerformanceSamplerFactory,
} from './livePerformanceAudio';
import { createLocalGarakProductServices } from './localGarakProductServices';
import type { GarakSharePort, LocalGarakProductServicesInput } from './localGarakProductServices';

export type RuntimeGarakProductServicesInput = {
  apiBaseUrl?: string;
  fetch?: GarakFetch;
  getAccessToken?: () => Promise<string | undefined>;
  sessionStore?: AuthSessionStore;
  libraryStorage?: AuthStoragePort;
  share?: GarakSharePort;
  liveAudio?: LocalGarakProductServicesInput['liveAudio'];
  createLiveSampler?: LivePerformanceSamplerFactory;
};

export function createRuntimeGarakProductServices({
  apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL,
  fetch,
  getAccessToken,
  sessionStore,
  libraryStorage,
  share,
  liveAudio,
  createLiveSampler,
}: RuntimeGarakProductServicesInput = {}): GarakProductServices {
  const normalizedBaseUrl = apiBaseUrl?.trim();

  if (!normalizedBaseUrl) {
    return createLocalGarakProductServices({
      storage: libraryStorage,
      share,
      liveAudio: liveAudio ?? createLiveAudioPort({ createLiveSampler }),
    });
  }

  const httpServices = createHttpGarakProductServices({
    baseUrl: normalizedBaseUrl,
    fetch,
    getAccessToken: getAccessToken ?? createSessionAccessTokenReader(sessionStore),
  });
  const fallbackServices = createLocalGarakProductServices({
    storage: libraryStorage,
    share,
    liveAudio:
      liveAudio ??
      createLiveAudioPort({
        createLiveSampler,
        loadSampleManifest: httpServices.audio.loadInstrumentSampleManifest,
      }),
  });

  return {
    ...httpServices,
    audio: {
      ...httpServices.audio,
      prepareLivePerformanceAudio: fallbackServices.audio.prepareLivePerformanceAudio,
      playPerformanceEvents: fallbackServices.audio.playPerformanceEvents,
    },
  };
}

function createLiveAudioPort(input: {
  createLiveSampler: LivePerformanceSamplerFactory | undefined;
  loadSampleManifest?: LivePerformanceSampleManifestLoader;
}): LocalGarakProductServicesInput['liveAudio'] {
  if (input.createLiveSampler === undefined && input.loadSampleManifest === undefined) {
    return undefined;
  }

  return createLivePerformanceAudioPort({
    createSampler: input.createLiveSampler,
    loadSampleManifest: input.loadSampleManifest,
  });
}

function createSessionAccessTokenReader(
  sessionStore: AuthSessionStore | undefined,
): (() => Promise<string | undefined>) | undefined {
  if (sessionStore === undefined) {
    return undefined;
  }

  return async () => (await sessionStore.load())?.accessToken;
}

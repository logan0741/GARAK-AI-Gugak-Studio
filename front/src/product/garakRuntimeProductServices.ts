import type { AuthSessionStore } from './authSessionStore';
import type { AuthStoragePort } from './authSessionStore';
import {
  createHttpGarakProductServices,
  type GarakFetch,
} from './garakHttpProductServices';
import type { GarakProductServices } from './garakProductServices';
import type { ProductLibraryState } from './garakProductState';
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

  const accessTokenReader = getAccessToken ?? createSessionAccessTokenReader(sessionStore);
  const httpServices = createHttpGarakProductServices({
    baseUrl: normalizedBaseUrl,
    fetch,
    getAccessToken: accessTokenReader,
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
  const libraryService = {
    loadSnapshot: async () => {
      if (!(await hasAccessToken(accessTokenReader))) {
        return fallbackServices.library.loadSnapshot();
      }

      try {
        return await httpServices.library.loadSnapshot();
      } catch {
        return fallbackServices.library.loadSnapshot();
      }
    },
    saveSnapshot: async (snapshot: ProductLibraryState) => {
      if (!(await hasAccessToken(accessTokenReader))) {
        await fallbackServices.library.saveSnapshot(snapshot);
        return;
      }

      try {
        await httpServices.library.saveSnapshot(snapshot);
      } catch {
        await fallbackServices.library.saveSnapshot(snapshot);
      }
    },
  };

  return {
    ...httpServices,
    library: libraryService,
    audio: {
      ...httpServices.audio,
      prepareLivePerformanceAudio: fallbackServices.audio.prepareLivePerformanceAudio,
      playPerformanceEvents: fallbackServices.audio.playPerformanceEvents,
      playLibraryAudio: fallbackServices.audio.playLibraryAudio,
      pauseLibraryAudio: fallbackServices.audio.pauseLibraryAudio,
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

async function hasAccessToken(
  getAccessToken: (() => Promise<string | undefined>) | undefined,
): Promise<boolean> {
  const accessToken = await getAccessToken?.();
  return accessToken !== undefined && accessToken.trim().length > 0;
}

function createSessionAccessTokenReader(
  sessionStore: AuthSessionStore | undefined,
): (() => Promise<string | undefined>) | undefined {
  if (sessionStore === undefined) {
    return undefined;
  }

  return async () => (await sessionStore.load())?.accessToken;
}

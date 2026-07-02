import type { AuthSessionStore } from './authSessionStore';
import type { AuthStoragePort } from './authSessionStore';
import {
  createHttpGarakProductServices,
  type GarakFetch,
} from './garakHttpProductServices';
import type { GarakProductServices } from './garakProductServices';
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
};

export function createRuntimeGarakProductServices({
  apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL,
  fetch,
  getAccessToken,
  sessionStore,
  libraryStorage,
  share,
  liveAudio,
}: RuntimeGarakProductServicesInput = {}): GarakProductServices {
  const fallbackServices = createLocalGarakProductServices({ storage: libraryStorage, share, liveAudio });
  const normalizedBaseUrl = apiBaseUrl?.trim();

  if (!normalizedBaseUrl) {
    return fallbackServices;
  }

  const httpServices = createHttpGarakProductServices({
    baseUrl: normalizedBaseUrl,
    fetch,
    getAccessToken: getAccessToken ?? createSessionAccessTokenReader(sessionStore),
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

function createSessionAccessTokenReader(
  sessionStore: AuthSessionStore | undefined,
): (() => Promise<string | undefined>) | undefined {
  if (sessionStore === undefined) {
    return undefined;
  }

  return async () => (await sessionStore.load())?.accessToken;
}

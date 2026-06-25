import type { AuthSessionStore } from './authSessionStore';
import {
  createHttpGarakProductServices,
  type GarakFetch,
} from './garakHttpProductServices';
import {
  createNoopGarakProductServices,
  type GarakProductServices,
} from './garakProductServices';

export type RuntimeGarakProductServicesInput = {
  apiBaseUrl?: string;
  fetch?: GarakFetch;
  getAccessToken?: () => Promise<string | undefined>;
  sessionStore?: AuthSessionStore;
};

export function createRuntimeGarakProductServices({
  apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL,
  fetch,
  getAccessToken,
  sessionStore,
}: RuntimeGarakProductServicesInput = {}): GarakProductServices {
  const fallbackServices = createNoopGarakProductServices();
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

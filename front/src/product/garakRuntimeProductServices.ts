import type { AuthSessionStore } from './authSessionStore';
import type { AuthStoragePort } from './authSessionStore';
import {
  createHttpGarakProductServices,
  type GarakFetch,
} from './garakHttpProductServices';
import type { GarakProductServices, ServiceResult } from './garakProductServices';
import type { ProductLibraryState } from './garakProductState';
import {
  createLivePerformanceAudioPort,
  type LivePerformanceSampleManifestLoader,
  type LivePerformanceSamplerFactory,
} from './livePerformanceAudio';
import { createLocalGarakProductServices } from './localGarakProductServices';
import type { GarakSharePort, LocalGarakProductServicesInput } from './localGarakProductServices';
import { validateSampleAssetManifest } from '../domain/sampleManifest';
import { toSampleManifestInstrumentId } from './instrumentSampleManifest';

export type RuntimeGarakProductServicesInput = {
  apiBaseUrl?: string;
  fetch?: GarakFetch;
  getAccessToken?: () => Promise<string | undefined>;
  sessionStore?: AuthSessionStore;
  libraryStorage?: AuthStoragePort;
  share?: GarakSharePort;
  liveAudio?: LocalGarakProductServicesInput['liveAudio'];
  recordingCapture?: LocalGarakProductServicesInput['recordingCapture'];
  recordingCaptureStorage?: LocalGarakProductServicesInput['recordingCaptureStorage'];
  libraryAudio?: LocalGarakProductServicesInput['libraryAudio'];
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
  recordingCapture,
  recordingCaptureStorage,
  libraryAudio,
  createLiveSampler,
}: RuntimeGarakProductServicesInput = {}): GarakProductServices {
  const normalizedBaseUrl = apiBaseUrl?.trim().replace(/\/+$/, '');

  if (!normalizedBaseUrl) {
    return createLocalGarakProductServices({
      storage: libraryStorage,
      share,
      liveAudio: liveAudio ?? createLiveAudioPort({ createLiveSampler }),
      recordingCapture,
      recordingCaptureStorage,
      libraryAudio,
    });
  }

  const accessTokenReader = getAccessToken ?? createSessionAccessTokenReader(sessionStore);
  const httpFetch = fetch ?? (globalThis.fetch as unknown as GarakFetch);

  const fallbackServices = createLocalGarakProductServices({
    storage: libraryStorage,
    share,
    liveAudio: liveAudio ?? createLiveAudioPort({ createLiveSampler }),
    recordingCapture,
    recordingCaptureStorage,
    libraryAudio,
  });

  const loadSampleManifest: LivePerformanceSampleManifestLoader = async (input) => {
    try {
      const accessToken = await accessTokenReader?.();
      const headers: Record<string, string> = { accept: 'application/json' };
      if (accessToken) headers.authorization = `Bearer ${accessToken}`;

      const instrumentId = toSampleManifestInstrumentId(input.instrument);
      const response = await httpFetch(
        `${normalizedBaseUrl}/instruments/${instrumentId}/samples`,
        { method: 'GET', headers },
      );
      if (!response.ok) return { status: 'unavailable' };
      return { status: 'ok', value: validateSampleAssetManifest(await response.json()) };
    } catch {
      return { status: 'unavailable' };
    }
  };

  const httpServices = createHttpGarakProductServices({
    baseUrl: normalizedBaseUrl,
    fetch: httpFetch,
    getAccessToken: accessTokenReader,
  });

  const runtimeFallbackServices = createLocalGarakProductServices({
    storage: libraryStorage,
    share,
    liveAudio:
      liveAudio ??
      createLiveAudioPort({
        createLiveSampler,
        loadSampleManifest,
      }),
    recordingCapture,
    recordingCaptureStorage,
    libraryAudio,
  });

  const libraryService = {
    loadSnapshot: async (): Promise<ProductLibraryState> => {
      if (!(await hasAccessToken(accessTokenReader))) {
        return fallbackServices.library.loadSnapshot();
      }

      try {
        const accessToken = await accessTokenReader?.();
        const headers: Record<string, string> = { accept: 'application/json' };
        if (accessToken) headers.authorization = `Bearer ${accessToken}`;

        const response = await httpFetch(`${normalizedBaseUrl}/library/snapshot`, {
          method: 'GET',
          headers,
        });
        if (!response.ok) throw new Error(`GET /library/snapshot failed: ${response.status}`);
        return (await response.json()) as ProductLibraryState;
      } catch {
        return fallbackServices.library.loadSnapshot();
      }
    },
    saveSnapshot: async (snapshot: ProductLibraryState): Promise<void> => {
      if (!(await hasAccessToken(accessTokenReader))) {
        await fallbackServices.library.saveSnapshot(snapshot);
        return;
      }

      try {
        const accessToken = await accessTokenReader?.();
        const headers: Record<string, string> = {
          accept: 'application/json',
          'content-type': 'application/json',
        };
        if (accessToken) headers.authorization = `Bearer ${accessToken}`;

        const response = await httpFetch(`${normalizedBaseUrl}/library/snapshot`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(snapshot),
        });
        if (!response.ok) throw new Error(`PUT /library/snapshot failed: ${response.status}`);
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
      prepareLivePerformanceAudio: runtimeFallbackServices.audio.prepareLivePerformanceAudio,
      playPerformanceEvents: runtimeFallbackServices.audio.playPerformanceEvents,
      startRecordingCapture: runtimeFallbackServices.audio.startRecordingCapture,
      stopRecordingCapture: runtimeFallbackServices.audio.stopRecordingCapture,
      discardRecordingCapture: runtimeFallbackServices.audio.discardRecordingCapture,
      playWorkMix: runtimeFallbackServices.audio.playWorkMix,
      playLibraryAudio: runtimeFallbackServices.audio.playLibraryAudio,
      pauseLibraryAudio: runtimeFallbackServices.audio.pauseLibraryAudio,
      exportWorkAudio: runtimeFallbackServices.audio.exportWorkAudio,
      loadInstrumentSampleManifest: loadSampleManifest,
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

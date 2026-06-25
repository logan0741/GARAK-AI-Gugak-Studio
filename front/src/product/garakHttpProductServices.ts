import type { ProductLibraryState } from './garakProductState';
import type {
  ExportWorkAudioResult,
  GarakProductServices,
  ServiceResult,
  SharePublishResult,
} from './garakProductServices';

export type GarakFetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export type GarakHttpResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

export type GarakFetch = (url: string, init?: GarakFetchInit) => Promise<GarakHttpResponse>;

export type HttpGarakProductServicesInput = {
  baseUrl: string;
  fetch?: GarakFetch;
  getAccessToken?: () => Promise<string | undefined>;
};

export function createHttpGarakProductServices({
  baseUrl,
  fetch,
  getAccessToken,
}: HttpGarakProductServicesInput): GarakProductServices {
  const client = createHttpClient({
    baseUrl,
    fetch: fetch ?? (globalThis.fetch as unknown as GarakFetch),
    getAccessToken,
  });

  return {
    library: {
      loadSnapshot: () => client.requiredJson<ProductLibraryState>('/library/snapshot', 'GET'),
      saveSnapshot: (snapshot) => client.noContent('/library/snapshot', 'PUT', snapshot),
    },
    account: {
      loginAndLoadLibrary: () => client.serviceJson<ProductLibraryState>('/account/login-sync', 'POST'),
    },
    share: {
      publishShareTarget: (input) =>
        client.serviceJson<SharePublishResult>('/share/targets/publish', 'POST', input),
    },
    audio: {
      exportWorkAudio: (work) =>
        client.serviceJson<ExportWorkAudioResult>('/audio/exports', 'POST', {
          work,
        }),
      playPerformanceEvents: (events) =>
        client.serviceJson<{ handledEvents: number }>('/audio/performance-events/play', 'POST', {
          events,
        }),
    },
    ai: {
      generateAutoAccompaniment: async () => ({ status: 'unavailable' }),
      recommendAccompaniment: (input) =>
        client.serviceJson('/ai/accompaniment/recommendations', 'POST', input),
    },
  };
}

function createHttpClient({
  baseUrl,
  fetch,
  getAccessToken,
}: {
  baseUrl: string;
  fetch: GarakFetch;
  getAccessToken?: () => Promise<string | undefined>;
}) {
  return {
    requiredJson: async <T>(path: string, method: string, body?: unknown): Promise<T> => {
      const response = await request({ baseUrl, fetch, getAccessToken, path, method, body });

      if (!response.ok) {
        throw new Error(`GARAK backend request failed: ${method} ${path} (${response.status})`);
      }

      return (await response.json()) as T;
    },
    noContent: async (path: string, method: string, body?: unknown): Promise<void> => {
      const response = await request({ baseUrl, fetch, getAccessToken, path, method, body });

      if (!response.ok) {
        throw new Error(`GARAK backend request failed: ${method} ${path} (${response.status})`);
      }
    },
    serviceJson: async <T>(path: string, method: string, body?: unknown): Promise<ServiceResult<T>> => {
      try {
        const response = await request({ baseUrl, fetch, getAccessToken, path, method, body });

        if (response.status === 404 || response.status === 501) {
          return { status: 'unavailable' };
        }

        if (!response.ok) {
          return {
            status: 'error',
            message: await response.text(),
          };
        }

        return {
          status: 'ok',
          value: (await response.json()) as T,
        };
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

async function request({
  baseUrl,
  fetch,
  getAccessToken,
  path,
  method,
  body,
}: {
  baseUrl: string;
  fetch: GarakFetch;
  getAccessToken?: () => Promise<string | undefined>;
  path: string;
  method: string;
  body?: unknown;
}): Promise<GarakHttpResponse> {
  const accessToken = await getAccessToken?.();
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
  };

  if (accessToken !== undefined && accessToken.trim().length > 0) {
    headers.authorization = `Bearer ${accessToken}`;
  }

  return fetch(joinUrl(baseUrl, path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

import type { ProductLibraryState } from './garakProductState';
import type { GarakProductServices, ServiceResult } from './garakProductServices';
import type { PerformanceEvent } from '../domain/performanceEvent';
import type { InstrumentId, JangdanPresetId, Work } from '../studio/studioTypes';

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
      loadSnapshot: async () => ({
        works: await client.requiredJson<SessionSummaryResponse[]>('/api/sessions', 'GET').then((sessions) =>
          sessions.map(sessionSummaryToWork),
        ),
        exportedAudios: [],
        practiceResults: [],
      }),
      saveSnapshot: async (snapshot) => {
        await Promise.all(snapshot.works.map((work) => saveWorkSession(client, work)));
      },
    },
    account: {
      loginAndLoadLibrary: () => client.serviceJson('/api/sessions', 'GET', undefined, (sessions) => ({
        works: Array.isArray(sessions) ? sessions.map(sessionSummaryToWork) : [],
        exportedAudios: [],
        practiceResults: [],
      })),
    },
    share: {
      publishShareTarget: (target) =>
        client.serviceJson<{ remoteId: string }>('/share/targets/publish', 'POST', {
          target,
        }),
    },
    audio: {
      exportWorkAudio: (work) =>
        client.serviceJson<{ audioUri: string }>('/api/audio/exports', 'POST', {
          work,
        }),
    },
    ai: {
      recommendAccompaniment: async (input) => recommendAccompaniment(client, input.events),
    },
  };
}

type SessionSummaryResponse = {
  id: string;
  title: string;
  mode: 'creative' | 'practice' | string;
  instrument_id?: InstrumentId;
  instrumentId?: InstrumentId;
  duration_ms?: number;
  durationMs?: number;
  created_at_ms?: number;
  createdAtMs?: number;
  updated_at_ms?: number;
  updatedAtMs?: number;
};

type AnalyzeResponse = {
  key: string;
  jangdan: string;
  estimatedBpm: number;
};

type AccompanimentResponse = {
  patternSequence: unknown[];
};

type HttpClient = ReturnType<typeof createHttpClient>;

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
    serviceJson: async <T>(
      path: string,
      method: string,
      body?: unknown,
      mapValue?: (value: unknown) => T,
    ): Promise<ServiceResult<T>> => {
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

        const value = await response.json();

        return {
          status: 'ok',
          value: mapValue === undefined ? (value as T) : mapValue(value),
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

async function saveWorkSession(client: HttpClient, work: Work): Promise<void> {
  const events = collectWorkEvents(work).map((event, index) => ({
    id: `${work.id}-event-${index + 1}`,
    ...event,
  }));

  const response = await client.serviceJson('/api/sessions', 'POST', {
    id: work.id,
    instrumentId: toBackendInstrumentId(resolveWorkInstrument(work)),
    sampleAssetManifestId: 'gayageum_samples_2026_06_a',
    title: work.title,
    mode: work.source === 'free_creation' ? 'creative' : 'practice',
    schemaVersion: '2026.06.mvp',
    durationMs: Math.max(0, estimateWorkDurationMs(work)),
    createdAtMs: Date.parse(work.createdAt) || Date.now(),
    replaySettings: {
      tracks: work.tracks,
      source: work.source,
    },
    events,
  });

  if (response.status === 'error' && !response.message.includes('409')) {
    throw new Error(response.message);
  }
}

async function recommendAccompaniment(
  client: HttpClient,
  events: readonly PerformanceEvent[],
): Promise<ServiceResult<{ presetId: JangdanPresetId; bpm: number; volume: number; reason: string }>> {
  if (events.length === 0) {
    return { status: 'unavailable' };
  }

  const eventPayload = events.map((event, index) => ({
    id: `ai-event-${index + 1}`,
    ...event,
  }));
  const analyzed = await client.serviceJson<AnalyzeResponse>('/api/analyze', 'POST', {
    sessionId: 'local-preview',
    events: eventPayload,
  });

  if (analyzed.status !== 'ok') {
    return analyzed.status === 'unavailable'
      ? analyzed
      : {
          status: 'error',
          message: analyzed.message,
        };
  }

  const presetId = toSupportedJangdanPresetId(analyzed.value.jangdan);
  const accompaniment = await client.serviceJson<AccompanimentResponse>('/api/accompaniment', 'POST', {
    key: analyzed.value.key,
    jangdan: presetId,
    bpm: Math.max(1, analyzed.value.estimatedBpm),
    temperature: 0.7,
  });

  if (accompaniment.status !== 'ok') {
    return accompaniment.status === 'unavailable'
      ? accompaniment
      : {
          status: 'error',
          message: accompaniment.message,
        };
  }

  return {
    status: 'ok',
    value: {
      presetId,
      bpm: Math.max(1, analyzed.value.estimatedBpm),
      volume: 0.72,
      reason: `AI matched ${analyzed.value.jangdan} and generated ${accompaniment.value.patternSequence.length} steps.`,
    },
  };
}

function sessionSummaryToWork(session: SessionSummaryResponse): Work {
  const createdAt = fromEpochMs(session.created_at_ms ?? session.createdAtMs);
  const updatedAt = fromEpochMs(session.updated_at_ms ?? session.updatedAtMs);

  return {
    id: session.id,
    title: session.title,
    createdAt,
    updatedAt,
    source: session.mode === 'creative' ? 'free_creation' : 'synced',
    syncState: 'synced',
    tracks: [],
  };
}

function collectWorkEvents(work: Work): PerformanceEvent[] {
  return work.tracks.flatMap((track) =>
    track.kind === 'instrument' ? track.takes.flatMap((take) => take.events) : [],
  );
}

function resolveWorkInstrument(work: Work): InstrumentId {
  const instrumentTrack = work.tracks.find((track) => track.kind === 'instrument');
  return instrumentTrack?.kind === 'instrument' ? instrumentTrack.instrument : 'gayageum';
}

function toBackendInstrumentId(instrument: InstrumentId): string {
  if (instrument === 'gayageum') {
    return 'gayageum_12';
  }

  return instrument;
}

function estimateWorkDurationMs(work: Work): number {
  const maxEventMs = Math.max(0, ...collectWorkEvents(work).map((event) => event.tsMs));
  return maxEventMs + 2000;
}

function toSupportedJangdanPresetId(jangdan: string): JangdanPresetId {
  if (jangdan === 'semachi' || jangdan === 'jungmori' || jangdan === 'jajinmori') {
    return jangdan;
  }

  if (jangdan === 'jungjungmori' || jangdan === 'gutgeori') {
    return 'jungmori';
  }

  return 'jajinmori';
}

function fromEpochMs(value: number | undefined): string {
  return new Date(Number.isFinite(value) ? Number(value) : Date.now()).toISOString();
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

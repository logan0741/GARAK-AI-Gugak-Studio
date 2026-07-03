import type { ProductLibraryState } from './garakProductState';
import type { GarakProductServices, ServiceResult } from './garakProductServices';
import type { PerformanceEvent } from '../domain/performanceEvent';
import type { InstrumentId, JangdanPresetId, Track, Work } from '../studio/studioTypes';
import type { SharedRecording } from './productFixtures';

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
        client.serviceJson<{ shareId: string }, { remoteId: string }>(
          '/api/share',
          'POST',
          {
            sessionId: target.sessionId ?? target.id,
            ...(target.recordingId === undefined ? {} : { recordingId: target.recordingId }),
          },
          (value) => ({ remoteId: value.shareId }),
        ),
      loadFeed: () =>
        client.serviceJson<ShareFeedItemResponse[], SharedRecording[]>(
          '/api/share/feed',
          'GET',
          undefined,
          (items) => items.map(feedItemToSharedRecording),
        ),
    },
    audio: {
      exportWorkAudio: (work) =>
        client.serviceJson<{ audioUri: string }>('/api/audio/exports', 'POST', {
          work,
        }),
    },
    ai: {
      recommendAccompaniment: async (input) => recommendAccompaniment(client, input.events),
      requestPracticeFeedback: async (input) => requestPracticeFeedback(client, input),
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
  replay_settings?: { tracks: Track[]; source: string } | null;
};

type ShareFeedItemResponse = {
  id: string;
  title: string;
  authorDisplayName: string;
  sourceLabel: string;
  instrument: string;
  durationSeconds: number;
  audioUri: string;
  remixable: boolean;
};

type AnalyzeResponse = {
  jo: string;
  jangdan: string;
  jo_confidence: number;
  jangdan_confidence: number;
  detected_bpm: number;
  ioi_ms: number[];
};

type JobCreatedResponse = {
  job_id: string;
  status: string;
};

type JobStatusResponse = {
  job_id: string;
  status: string;
  audio_url?: string;
  pattern_sequence?: number[];
  jangdan?: string;
  jo?: string;
  bpm?: number;
  error?: string;
  created_at: number;
  elapsed_ms: number;
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
    serviceJson: async <T, R = T>(
      path: string,
      method: string,
      body?: unknown,
      mapValue?: (value: T) => R,
    ): Promise<ServiceResult<R>> => {
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

        const value = (await response.json()) as T;

        return {
          status: 'ok',
          value: mapValue === undefined ? (value as unknown as R) : mapValue(value),
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

// Gayageum string index (1-12) → MIDI note (12율 오름차순: 황=G3→응=B4)
const GAYAGEUM_STRING_TO_MIDI: Record<number, number> = {
  1: 55,  // 황 G3
  2: 56,  // 대 Ab3
  3: 57,  // 태 A3
  4: 58,  // 협 Bb3
  5: 59,  // 고 B3
  6: 60,  // 중 C4
  7: 62,  // 유 D4
  8: 64,  // 임 E4
  9: 65,  // 이 F4
  10: 67, // 남 G4
  11: 69, // 무 A4
  12: 71, // 응 B4
};

function extractAnalyzePayload(events: readonly PerformanceEvent[]): {
  timestamps: number[];
  notes: number[];
} {
  const pluckEvents = events.filter(
    (e): e is Extract<PerformanceEvent, { type: 'string_pluck' | 'glissando_step' }> =>
      e.type === 'string_pluck' || e.type === 'glissando_step',
  );
  return {
    timestamps: pluckEvents.map((e) => e.tsMs / 1000),
    notes: pluckEvents.map((e) => GAYAGEUM_STRING_TO_MIDI[e.stringIndex] ?? 69),
  };
}

async function pollAccompanimentJob(
  client: HttpClient,
  jobId: string,
): Promise<ServiceResult<JobStatusResponse>> {
  const maxWaitMs = 30_000;
  const intervalMs = 1_000;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
    const result = await client.serviceJson<JobStatusResponse>(
      `/api/accompaniment/status/${jobId}`,
      'GET',
    );
    if (result.status !== 'ok') return result;
    if (result.value.status === 'done') return result;
    if (result.value.status === 'failed') {
      return {
        status: 'error',
        message: result.value.error ?? '반주 생성 실패',
      };
    }
  }
  return { status: 'error', message: '반주 생성 시간 초과 (30초)' };
}

async function recommendAccompaniment(
  client: HttpClient,
  events: readonly PerformanceEvent[],
): Promise<ServiceResult<{ presetId: JangdanPresetId; bpm: number; volume: number; reason: string }>> {
  if (events.length === 0) {
    return { status: 'unavailable' };
  }

  const payload = extractAnalyzePayload(events);
  if (payload.timestamps.length < 2) {
    return { status: 'unavailable' };
  }

  const analyzed = await client.serviceJson<AnalyzeResponse>('/api/analyze', 'POST', payload);

  if (analyzed.status !== 'ok') {
    return analyzed.status === 'unavailable' ? analyzed : { status: 'error', message: analyzed.message };
  }

  const presetId = toSupportedJangdanPresetId(analyzed.value.jangdan);
  const bpm = Math.max(1, Math.round(analyzed.value.detected_bpm));

  return {
    status: 'ok',
    value: {
      presetId,
      bpm,
      volume: 0.72,
      reason: `AI가 ${analyzed.value.jangdan}(${analyzed.value.jo})을(를) 감지했습니다.`,
    },
  };
}

async function requestPracticeFeedback(
  client: HttpClient,
  input: {
    sessionId: string;
    accuracyScore: number;
    songName: string;
    locale: 'ko' | 'en';
    events: readonly PerformanceEvent[];
  },
): Promise<ServiceResult<{ feedbackText: string }>> {
  if (input.events.length === 0) {
    return { status: 'unavailable' };
  }

  const payload = extractAnalyzePayload(input.events);
  if (payload.timestamps.length < 2) {
    return { status: 'unavailable' };
  }

  const analyzed = await client.serviceJson<AnalyzeResponse>('/api/analyze', 'POST', payload);

  if (analyzed.status !== 'ok') {
    return analyzed.status === 'unavailable' ? analyzed : { status: 'error', message: analyzed.message };
  }

  const durationSec = payload.timestamps.length > 0
    ? Math.max(0, payload.timestamps[payload.timestamps.length - 1]! - payload.timestamps[0]!)
    : undefined;

  type BackendFeedbackResponse = { feedback: string; jo: string; jangdan: string; accuracy_pct: number; source: string };

  return client.serviceJson<BackendFeedbackResponse, { feedbackText: string }>(
    '/api/feedback',
    'POST',
    {
      jo: analyzed.value.jo,
      jangdan: analyzed.value.jangdan,
      accuracy: Math.max(0, Math.min(1, input.accuracyScore)),
      note_count: payload.timestamps.length,
      duration_sec: durationSec,
      language: input.locale,
    },
    (value) => ({ feedbackText: value.feedback }),
  );
}

function sessionSummaryToWork(session: SessionSummaryResponse): Work {
  const createdAt = fromEpochMs(session.created_at_ms ?? session.createdAtMs);
  const updatedAt = fromEpochMs(session.updated_at_ms ?? session.updatedAtMs);
  const replaySettings = session.replay_settings;

  return {
    id: session.id,
    title: session.title,
    createdAt,
    updatedAt,
    source: toWorkSource(replaySettings?.source) ?? (session.mode === 'creative' ? 'free_creation' : 'synced'),
    syncState: 'synced',
    tracks: replaySettings?.tracks ?? [],
  };
}

function toWorkSource(source: string | undefined): Work['source'] | undefined {
  if (source === 'free_creation' || source === 'remix' || source === 'synced') {
    return source;
  }
  return undefined;
}

function feedItemToSharedRecording(item: ShareFeedItemResponse): SharedRecording {
  const instrument = item.instrument === 'gayageum_12' ? 'gayageum' : item.instrument;
  return {
    id: item.id,
    title: item.title,
    authorDisplayName: item.authorDisplayName,
    sourceLabel: item.sourceLabel,
    instrument: instrument as InstrumentId,
    durationSeconds: item.durationSeconds,
    audioUri: item.audioUri,
    remixable: item.remixable,
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
  // English names (kept for compatibility)
  if (jangdan === 'semachi' || jangdan === 'jungmori' || jangdan === 'jajinmori') {
    return jangdan;
  }
  if (jangdan === 'jungjungmori' || jangdan === 'gutgeori') {
    return 'jungmori';
  }
  // Korean names returned by backend
  if (jangdan === '세마치') return 'semachi';
  if (jangdan === '중모리') return 'jungmori';
  if (jangdan === '자진모리') return 'jajinmori';
  if (jangdan === '굿거리' || jangdan === '중중모리') return 'jungmori';
  if (jangdan === '휘모리') return 'jajinmori';
  if (jangdan === '엇모리' || jangdan === '엇중모리' || jangdan === '진양조') return 'semachi';
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

import { validateSampleAssetManifest } from '../domain/sampleManifest';
import type { PerformanceEvent } from '../domain/performanceEvent';
import type { JangdanPresetId, Track, Work } from '../studio/studioTypes';
import type { ProductLibraryState } from './garakProductState';
import type {
  AccompanimentRecommendation,
  ExportWorkAudioResult,
  GarakProductServices,
  PauseLibraryAudioResult,
  PlayLibraryAudioResult,
  PlayWorkMixResult,
  ServiceResult,
  SharePublishResult,
} from './garakProductServices';
import { toSampleManifestInstrumentId } from './instrumentSampleManifest';

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
        works: await client.requiredJson<SessionSummaryResponse[]>('/api/sessions', 'GET').then(
          (sessions) => sessions.map(sessionSummaryToWork),
        ),
        exportedAudios: [],
        practiceResults: [],
      }),
      saveSnapshot: async (snapshot) => {
        await Promise.all(snapshot.works.map((work) => saveWorkSession(client, work)));
      },
    },
    account: {
      loginAndLoadLibrary: async () => {
        const result = await client.serviceJson<SessionSummaryResponse[]>('/api/sessions', 'GET');
        if (result.status !== 'ok') return result;
        return {
          status: 'ok',
          value: {
            works: result.value.map(sessionSummaryToWork),
            exportedAudios: [],
            practiceResults: [],
          },
        };
      },
    },
    share: {
      publishShareTarget: (input) =>
        client.serviceJson<{ shareId: string }, SharePublishResult>(
          '/api/share',
          'POST',
          { sessionId: input.target.id },
          (raw) => ({ remoteId: raw.shareId, shareMethod: 'link' as const }),
        ),
    },
    audio: {
      startRecordingCapture: async () => ({ status: 'unavailable' }),
      stopRecordingCapture: async () => ({ status: 'unavailable' }),
      discardRecordingCapture: async () => ({ status: 'unavailable' }),
      exportWorkAudio: (work) =>
        client.serviceJson<ExportWorkAudioResult>('/api/audio/exports', 'POST', { work }),
      playWorkMix: (work, mixPlan) =>
        client.serviceJson<PlayWorkMixResult>('/api/audio/work-mixes/play', 'POST', {
          work,
          mixPlan,
        }),
      playLibraryAudio: (input) =>
        client.serviceJson<PlayLibraryAudioResult>('/api/audio/library-audio/play', 'POST', input),
      pauseLibraryAudio: () =>
        client.serviceJson<PauseLibraryAudioResult>('/api/audio/library-audio/pause', 'POST'),
      prepareLivePerformanceAudio: async () => ({ status: 'unavailable' }),
      loadInstrumentSampleManifest: (input) =>
        client.serviceValidatedJson(
          `/api/instruments/${toSampleManifestInstrumentId(input.instrument)}/samples`,
          'GET',
          validateSampleAssetManifest,
        ),
      playPerformanceEvents: async () => ({ status: 'unavailable' }),
    },
    ai: {
      generateAutoAccompaniment: async () => ({ status: 'unavailable' }),
      recommendAccompaniment: async (input) => recommendAccompaniment(client, input.events),
    },
  };
}

// ── 내부 타입 ────────────────────────────────────────────────────────────────

type SessionSummaryResponse = {
  id: string;
  title: string;
  mode: 'creative' | 'practice' | string;
  instrument_id?: string;
  instrumentId?: string;
  duration_ms?: number;
  durationMs?: number;
  created_at_ms?: number;
  createdAtMs?: number;
  updated_at_ms?: number;
  updatedAtMs?: number;
  replay_settings?: { tracks: Track[]; source: string } | null;
};

type AnalyzeResponse = {
  jo: string;
  jangdan: string;
  jo_confidence: number;
  jangdan_confidence: number;
  detected_bpm: number;
  ioi_ms: number[];
};

type HttpClient = ReturnType<typeof createHttpClient>;

// ── HTTP 클라이언트 ───────────────────────────────────────────────────────────

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
        if (response.status === 404 || response.status === 501) return { status: 'unavailable' };
        if (!response.ok) return { status: 'error', message: await response.text() };
        const value = (await response.json()) as T;
        return {
          status: 'ok',
          value: mapValue === undefined ? (value as unknown as R) : mapValue(value),
        };
      } catch (error) {
        return { status: 'error', message: error instanceof Error ? error.message : String(error) };
      }
    },
    serviceValidatedJson: async <T>(
      path: string,
      method: string,
      validate: (value: unknown) => T,
      body?: unknown,
    ): Promise<ServiceResult<T>> => {
      try {
        const response = await request({ baseUrl, fetch, getAccessToken, path, method, body });
        if (response.status === 404 || response.status === 501) return { status: 'unavailable' };
        if (!response.ok) return { status: 'error', message: await response.text() };
        return { status: 'ok', value: validate(await response.json()) };
      } catch (error) {
        return { status: 'error', message: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

// ── AI 기능 ──────────────────────────────────────────────────────────────────

// 가야금 stringIndex(1-12) → MIDI note (12율 오름차순: 황=G3→응=B4)
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

async function recommendAccompaniment(
  client: HttpClient,
  events: readonly PerformanceEvent[],
): Promise<ServiceResult<AccompanimentRecommendation>> {
  if (events.length === 0) return { status: 'unavailable' };

  const payload = extractAnalyzePayload(events);
  if (payload.timestamps.length < 2) return { status: 'unavailable' };

  const analyzed = await client.serviceJson<AnalyzeResponse>('/api/analyze', 'POST', payload);
  if (analyzed.status !== 'ok') return analyzed.status === 'unavailable' ? analyzed : { status: 'error', message: analyzed.message };

  return {
    status: 'ok',
    value: {
      presetId: toSupportedJangdanPresetId(analyzed.value.jangdan),
      bpm: Math.max(1, Math.round(analyzed.value.detected_bpm)),
      volume: 0.72,
      reason: `AI가 ${analyzed.value.jangdan}(${analyzed.value.jo})을(를) 감지했습니다.`,
    },
  };
}

function toSupportedJangdanPresetId(jangdan: string): JangdanPresetId {
  if (jangdan === 'semachi' || jangdan === 'jungmori' || jangdan === 'jajinmori') return jangdan;
  if (jangdan === 'jungjungmori' || jangdan === 'gutgeori') return 'jungmori';
  if (jangdan === '세마치') return 'semachi';
  if (jangdan === '중모리') return 'jungmori';
  if (jangdan === '자진모리') return 'jajinmori';
  if (jangdan === '굿거리' || jangdan === '중중모리') return 'jungmori';
  if (jangdan === '휘모리') return 'jajinmori';
  if (jangdan === '엇모리' || jangdan === '엇중모리' || jangdan === '진양조') return 'semachi';
  return 'jajinmori';
}

// ── 라이브러리 영속성 ──────────────────────────────────────────────────────────

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
    replaySettings: { tracks: work.tracks, source: work.source },
    events,
  });

  if (response.status === 'error' && !response.message.includes('409')) {
    throw new Error(response.message);
  }
}

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

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
  if (source === 'free_creation' || source === 'remix' || source === 'synced') return source;
  return undefined;
}

function collectWorkEvents(work: Work): PerformanceEvent[] {
  return work.tracks.flatMap((track) =>
    track.kind === 'instrument' ? track.takes.flatMap((take) => take.events) : [],
  );
}

function resolveWorkInstrument(work: Work): string {
  const instrumentTrack = work.tracks.find((track) => track.kind === 'instrument');
  return instrumentTrack?.kind === 'instrument' ? instrumentTrack.instrument : 'gayageum';
}

function toBackendInstrumentId(instrument: string): string {
  return instrument === 'gayageum' ? 'gayageum_12' : instrument;
}

function estimateWorkDurationMs(work: Work): number {
  const maxEventMs = Math.max(0, ...collectWorkEvents(work).map((event) => event.tsMs));
  return maxEventMs + 2000;
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

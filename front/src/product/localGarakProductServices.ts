import type { AuthStoragePort } from './authSessionStore';
import type { ProductLibraryState } from './garakProductState';
import {
  createNoopGarakProductServices,
  type GarakProductServices,
} from './garakProductServices';
import {
  createLivePerformanceAudioPort,
  type LivePerformanceAudioPort,
} from './livePerformanceAudio';
import type { Work } from '../studio/studioTypes';

const LIBRARY_SNAPSHOT_STORAGE_KEY = 'garak.library.snapshot.v1';
const DEFAULT_SHARE_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type GarakSharePort = (content: {
  title?: string;
  message: string;
  url?: string;
}) => Promise<unknown>;

export type LocalGarakProductServicesInput = {
  storage?: AuthStoragePort;
  share?: GarakSharePort;
  liveAudio?: LivePerformanceAudioPort;
  nowMs?: () => number;
  createRemoteId?: () => string;
};

export function createLocalGarakProductServices({
  storage = createDefaultLocalStorage(),
  share = async () => undefined,
  liveAudio = createLivePerformanceAudioPort(),
  nowMs = () => Date.now(),
  createRemoteId = createShareId,
}: LocalGarakProductServicesInput = {}): GarakProductServices {
  const noopServices = createNoopGarakProductServices();

  return {
    ...noopServices,
    library: {
      loadSnapshot: async () => readLibrarySnapshot(storage),
      saveSnapshot: async (snapshot) => {
        await storage.setItem(LIBRARY_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
      },
    },
    audio: {
      ...noopServices.audio,
      prepareLivePerformanceAudio: liveAudio.prepareLivePerformanceAudio,
      playPerformanceEvents: liveAudio.playPerformanceEvents,
      exportWorkAudio: async (work) => ({
        status: 'ok',
        value: {
          audioUri: createLocalExportUri(work),
          durationSeconds: estimateWorkDurationSeconds(work),
        },
      }),
    },
    share: {
      publishShareTarget: async (input) => {
        const remoteId = createRemoteId();
        const shareUrl = input.shareUrl ?? createLocalShareUrl(remoteId);
        const expiresAtMs = nowMs() + DEFAULT_SHARE_LINK_TTL_MS;
        const shareMethod = input.fileUri === undefined ? 'link' : 'file';

        await share({
          title: input.title,
          message: `${input.message}\n${shareUrl}`,
          url: input.fileUri ?? shareUrl,
        });

        return {
          status: 'ok',
          value: {
            remoteId,
            shareUrl,
            expiresAtMs,
            shareMethod,
          },
        };
      },
    },
  };
}

async function readLibrarySnapshot(storage: AuthStoragePort): Promise<ProductLibraryState> {
  const rawSnapshot = await storage.getItem(LIBRARY_SNAPSHOT_STORAGE_KEY);

  if (rawSnapshot === null || rawSnapshot.trim().length === 0) {
    return createEmptyLibrarySnapshot();
  }

  try {
    return normalizeLibrarySnapshot(JSON.parse(rawSnapshot));
  } catch {
    return createEmptyLibrarySnapshot();
  }
}

function normalizeLibrarySnapshot(value: unknown): ProductLibraryState {
  if (typeof value !== 'object' || value === null) {
    return createEmptyLibrarySnapshot();
  }

  const snapshot = value as Partial<ProductLibraryState>;

  return {
    works: Array.isArray(snapshot.works) ? snapshot.works : [],
    exportedAudios: Array.isArray(snapshot.exportedAudios) ? snapshot.exportedAudios : [],
    practiceResults: Array.isArray(snapshot.practiceResults) ? snapshot.practiceResults : [],
  };
}

function createEmptyLibrarySnapshot(): ProductLibraryState {
  return {
    works: [],
    exportedAudios: [],
    practiceResults: [],
  };
}

function createLocalExportUri(work: Work): string {
  return `file://garak/exports/${encodeURIComponent(work.id)}.wav`;
}

function estimateWorkDurationSeconds(work: Work): number {
  const maxDurationBeats = Math.max(
    4,
    ...work.tracks.map((track) => {
      if (track.kind !== 'instrument') {
        return 4;
      }

      return Math.max(4, ...track.takes.map((take) => take.startedAtBeat + take.durationBeats));
    }),
  );

  return Math.max(4, Math.round(maxDurationBeats * 0.75));
}

function createLocalShareUrl(remoteId: string): string {
  return `https://garak.local/share/${remoteId}`;
}

function createShareId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid !== undefined) {
    return randomUuid;
  }

  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultLocalStorage(): AuthStoragePort {
  const memoryValues = new Map<string, string>();

  return {
    async getItem(key) {
      return globalThis.localStorage?.getItem(key) ?? memoryValues.get(key) ?? null;
    },
    async setItem(key, value) {
      if (globalThis.localStorage !== undefined) {
        globalThis.localStorage.setItem(key, value);
        return;
      }

      memoryValues.set(key, value);
    },
    async deleteItem(key) {
      globalThis.localStorage?.removeItem(key);
      memoryValues.delete(key);
    },
  };
}

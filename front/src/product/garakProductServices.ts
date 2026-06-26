import type { PerformanceEvent } from '../domain/performanceEvent';
import type {
  JangdanPresetId,
  ShareMethod,
  ShareTargetReference,
  Work,
} from '../studio/studioTypes';
import type { WorkMixPlan } from '../studio/studioLibrary';
import type { ProductLibraryState } from './garakProductState';
import type {
  AiAutoAccompanimentCandidate,
  AiAutoAccompanimentRequest,
} from './aiAutoAccompaniment';

export type { ShareMethod, ShareTargetReference } from '../studio/studioTypes';

export type ServiceUnavailableResult = {
  status: 'unavailable';
};

export type ServiceFailureResult = {
  status: 'error';
  message: string;
};

export type ServiceSuccessResult<T> = {
  status: 'ok';
  value: T;
};

export type ServiceResult<T> =
  | ServiceSuccessResult<T>
  | ServiceUnavailableResult
  | ServiceFailureResult;

export type ExportWorkAudioResult = {
  audioUri: string;
  durationSeconds?: number;
};

export type PlayWorkMixResult = {
  handledTracks: number;
};

export type SharePublishInput = {
  target: ShareTargetReference;
  title: string;
  message: string;
  fileUri?: string;
  shareUrl?: string;
};

export type SharePublishResult = {
  remoteId: string;
  shareUrl?: string;
  expiresAtMs?: number;
  shareMethod: ShareMethod;
};

export type AccompanimentRecommendationInput = {
  events: readonly PerformanceEvent[];
  work?: Work;
};

export type AccompanimentRecommendation = {
  presetId: JangdanPresetId;
  bpm: number;
  volume: number;
  reason: string;
};

export type GarakProductServices = {
  library: {
    loadSnapshot: () => Promise<ProductLibraryState>;
    saveSnapshot: (snapshot: ProductLibraryState) => Promise<void>;
  };
  account: {
    loginAndLoadLibrary: () => Promise<ServiceResult<ProductLibraryState>>;
  };
  share: {
    publishShareTarget: (input: SharePublishInput) => Promise<ServiceResult<SharePublishResult>>;
  };
  audio: {
    exportWorkAudio: (work: Work) => Promise<ServiceResult<ExportWorkAudioResult>>;
    playWorkMix: (
      work: Work,
      mixPlan: WorkMixPlan,
    ) => Promise<ServiceResult<PlayWorkMixResult>>;
    playPerformanceEvents: (
      events: readonly PerformanceEvent[],
    ) => Promise<ServiceResult<{ handledEvents: number }>>;
  };
  ai: {
    generateAutoAccompaniment: (
      input: AiAutoAccompanimentRequest,
    ) => Promise<ServiceResult<AiAutoAccompanimentCandidate>>;
    recommendAccompaniment: (
      input: AccompanimentRecommendationInput,
    ) => Promise<ServiceResult<AccompanimentRecommendation>>;
  };
};

export function createNoopGarakProductServices(): GarakProductServices {
  return {
    library: {
      loadSnapshot: async () => createEmptyLibrarySnapshot(),
      saveSnapshot: async () => undefined,
    },
    account: {
      loginAndLoadLibrary: async () => ({ status: 'unavailable' }),
    },
    share: {
      publishShareTarget: async () => ({ status: 'unavailable' }),
    },
    audio: {
      exportWorkAudio: async () => ({ status: 'unavailable' }),
      playWorkMix: async () => ({ status: 'unavailable' }),
      playPerformanceEvents: async () => ({ status: 'unavailable' }),
    },
    ai: {
      generateAutoAccompaniment: async () => ({ status: 'unavailable' }),
      recommendAccompaniment: async () => ({ status: 'unavailable' }),
    },
  };
}

export function createInMemoryGarakProductServices(
  initialSnapshot: ProductLibraryState = createEmptyLibrarySnapshot(),
): GarakProductServices {
  let snapshot = cloneLibrarySnapshot(initialSnapshot);

  return {
    ...createNoopGarakProductServices(),
    library: {
      loadSnapshot: async () => cloneLibrarySnapshot(snapshot),
      saveSnapshot: async (nextSnapshot) => {
        snapshot = cloneLibrarySnapshot(nextSnapshot);
      },
    },
    account: {
      loginAndLoadLibrary: async () => ({
        status: 'ok',
        value: cloneLibrarySnapshot(snapshot),
      }),
    },
  };
}

function createEmptyLibrarySnapshot(): ProductLibraryState {
  return {
    works: [],
    exportedAudios: [],
    practiceResults: [],
  };
}

function cloneLibrarySnapshot(snapshot: ProductLibraryState): ProductLibraryState {
  return {
    works: snapshot.works.map((work) => ({
      ...work,
      tracks: work.tracks.map(cloneTrack),
    })),
    exportedAudios: snapshot.exportedAudios.map((audio) => ({ ...audio })),
    practiceResults: snapshot.practiceResults.map((result) => ({ ...result })),
  };
}

function cloneTrack(track: Work['tracks'][number]): Work['tracks'][number] {
  if (track.kind !== 'instrument') {
    return {
      ...track,
    };
  }

  return {
    ...track,
    takes: track.takes.map((take) => ({
      ...take,
      events: take.events.map((event) => ({ ...event })),
      recordingSetup:
        take.recordingSetup === undefined
          ? undefined
          : {
              ...take.recordingSetup,
            },
      instrumentSettings:
        take.instrumentSettings === undefined
          ? undefined
          : {
              ...take.instrumentSettings,
            },
      liveJangdanGuide:
        take.liveJangdanGuide === undefined
          ? undefined
          : {
              ...take.liveJangdanGuide,
            },
    })),
  };
}

import type { PerformanceEvent } from '../domain/performanceEvent';
import type { SampleAssetManifest } from '../domain/sampleManifest';
import type {
  JangdanPresetId,
  InstrumentId,
  RecordingSetup,
  ShareMethod,
  ShareTargetReference,
  Work,
  ExportRenderKind,
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
  renderKind: ExportRenderKind;
  sourceTakeId?: string;
  sourceEventCount?: number;
  sourceRecordingUri?: string;
};

export type StartRecordingCaptureInput = {
  instrument: InstrumentId;
  recordingSetup: RecordingSetup;
};

export type StartRecordingCaptureResult = {
  started: true;
};

export type StopRecordingCaptureResult = {
  recordingUri?: string;
  durationSeconds?: number;
};

export type DiscardRecordingCaptureResult = {
  discarded: boolean;
};

export type PlayWorkMixResult = {
  handledTracks: number;
};

export type PlayLibraryAudioInput = {
  audioUri: string;
  title?: string;
  volume?: number;
  sourceKind: 'exportedAudio' | 'practiceResult' | 'demo' | 'sharedRecording' | 'audioCapture';
};

export type PlayLibraryAudioResult = {
  audioUri: string;
};

export type PauseLibraryAudioResult = {
  paused: boolean;
};

export type PrepareLivePerformanceAudioInput = {
  instrument: InstrumentId;
};

export type PrepareLivePerformanceAudioResult = {
  instrument: InstrumentId;
  sampleSourceLabel: string;
  releaseReady: boolean;
};

export type PlayPerformanceEventsInput = {
  instrument: InstrumentId;
  events: readonly PerformanceEvent[];
};

export type LoadInstrumentSampleManifestInput = {
  instrument: InstrumentId;
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
    startRecordingCapture: (
      input: StartRecordingCaptureInput,
    ) => Promise<ServiceResult<StartRecordingCaptureResult>>;
    stopRecordingCapture: () => Promise<ServiceResult<StopRecordingCaptureResult>>;
    discardRecordingCapture: () => Promise<ServiceResult<DiscardRecordingCaptureResult>>;
    exportWorkAudio: (work: Work) => Promise<ServiceResult<ExportWorkAudioResult>>;
    playWorkMix: (
      work: Work,
      mixPlan: WorkMixPlan,
    ) => Promise<ServiceResult<PlayWorkMixResult>>;
    playLibraryAudio: (
      input: PlayLibraryAudioInput,
    ) => Promise<ServiceResult<PlayLibraryAudioResult>>;
    pauseLibraryAudio: () => Promise<ServiceResult<PauseLibraryAudioResult>>;
    prepareLivePerformanceAudio: (
      input: PrepareLivePerformanceAudioInput,
    ) => Promise<ServiceResult<PrepareLivePerformanceAudioResult>>;
    loadInstrumentSampleManifest: (
      input: LoadInstrumentSampleManifestInput,
    ) => Promise<ServiceResult<SampleAssetManifest>>;
    playPerformanceEvents: (
      input: PlayPerformanceEventsInput,
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
      startRecordingCapture: async () => ({ status: 'unavailable' }),
      stopRecordingCapture: async () => ({ status: 'unavailable' }),
      discardRecordingCapture: async () => ({ status: 'unavailable' }),
      exportWorkAudio: async () => ({ status: 'unavailable' }),
      playWorkMix: async () => ({ status: 'unavailable' }),
      playLibraryAudio: async () => ({ status: 'unavailable' }),
      pauseLibraryAudio: async () => ({ status: 'unavailable' }),
      prepareLivePerformanceAudio: async () => ({ status: 'unavailable' }),
      loadInstrumentSampleManifest: async () => ({ status: 'unavailable' }),
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

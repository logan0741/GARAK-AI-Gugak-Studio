import { PerformanceEvent } from '../domain/performanceEvent';
import {
  createInitialScreenFlowState,
  ScreenFlowState,
  transitionScreenFlow,
} from '../screen-flow/screenFlowMachine';
import { ImplementedScreenId, ScreenFlowMode } from '../screen-flow/screenDefinitions';
import {
  addAccompanimentTrack,
  addInstrumentTrack,
  autoSaveTakeAsWork,
  countWorkMixPlanInstrumentEvents,
  createPracticeResult,
  createWorkMixPlan,
  exportWorkAudioPlaceholder,
} from '../studio/studioLibrary';
import {
  ExportedAudio,
  ExportRenderKind,
  InstrumentId,
  JangdanPresetId,
  PracticeResult,
  RecordingSetup,
  ShareMethod,
  ShareTargetReference,
  Take,
  Track,
  Work,
} from '../studio/studioTypes';
import {
  DEFAULT_FREE_CREATION_INSTRUMENT,
  FEATURED_SHARED_RECORDING,
  GARAK_BRAND,
  JANGDAN_PRESETS,
  PRACTICE_SONGS,
  SharedRecording,
  findSharedRecordingById,
  getInstrumentName,
  getPracticeSongTitle,
  PracticeSong,
} from './productFixtures';
import {
  getDefaultInstrumentSettingValues,
  resolveInstrumentSettingValues,
  type InstrumentSettingValueMap,
} from './instrumentSettingsConfig';
import {
  resolveInstrumentSampleStatuses,
  type InstrumentSampleReadinessInput,
  type InstrumentSampleStatus,
} from './instrumentSampleReadiness';
import {
  createSharedRecordingLibraryAudioUri,
  isPlayableExportedAudioForPlayback,
} from './libraryPlaybackAudio';
import type {
  AiAutoAccompanimentCandidate,
  AiAutoAccompanimentFailureCode,
  AiAutoAccompanimentGenerationStage,
  AiAutoAccompanimentStatus,
} from './aiAutoAccompaniment';
import { buildPracticeResultFeedback, evaluatePracticeResult } from './practiceResultEvaluation';

export type { InstrumentSampleStatus } from './instrumentSampleReadiness';

const EXPORT_FALLBACK_AUDIO_URI = 'garak://library-demo/export-fallback';
const ABSOLUTE_PERFORMANCE_EVENT_TIMESTAMP_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export type AccountState =
  | {
      status: 'guest';
    }
  | {
      status: 'loggedIn';
      userId: string;
      email: string;
    };

export type ProductPlayerSelection =
  | { kind: 'work'; workId: string }
  | { kind: 'exportedAudio'; exportedAudioId: string }
  | { kind: 'practiceResult'; practiceResultId: string }
  | { kind: 'demo'; title: string; date?: string };

export type ProductLibraryState = {
  works: Work[];
  exportedAudios: ExportedAudio[];
  practiceResults: PracticeResult[];
};

export type ProductLibraryTab = 'works' | 'shareables';

export type ProductLanguage = 'ko' | 'en';

export type PendingFreePlayTake = {
  events: PerformanceEvent[];
  recordingSetup: RecordingSetup;
  recordingUri?: string;
  startedAtMs: number;
};

export type FreePlayNotice = 'missingTake';

export type RecordingCaptureStatus =
  | { status: 'idle' }
  | { status: 'starting'; instrument: InstrumentId; captureAttemptId: string }
  | { status: 'capturing'; instrument: InstrumentId; captureAttemptId: string }
  | { status: 'stopping'; instrument: InstrumentId; captureAttemptId: string }
  | { status: 'discarding'; instrument?: InstrumentId; captureAttemptId: string }
  | { status: 'failed'; instrument?: InstrumentId; message: string };

export type TrackAddNotice = 'importLocked';

export type TrackAddSelection = 'instrument';

export type InstrumentSelectNotice = 'futureInstrument';

export type InstrumentSettingsNotice = 'sampleRequired';

export type InstrumentSettingSelections = Partial<Record<InstrumentId, InstrumentSettingValueMap>>;

export type ActiveInstrumentSettings = {
  instrument: InstrumentId;
  values: InstrumentSettingValueMap;
  source: 'default' | 'adjusted';
};

export type PracticeAttemptStatus = 'ready' | 'playing' | 'paused' | 'completed';

export type PracticeAttempt = {
  songId: PracticeSong['id'];
  instrument: InstrumentId;
  status: PracticeAttemptStatus;
  startedAt?: string;
  completedAt?: string;
  inputEvents: PerformanceEvent[];
  timingErrorsMs: number[];
};

export type WorkSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export type WorkExportStatus =
  | { status: 'idle' }
  | { status: 'exporting'; workId: Work['id'] }
  | { status: 'ready'; exportedAudioId: ExportedAudio['id'] }
  | { status: 'failed'; workId: Work['id']; message: string };

export type SharePublishStatus =
  | { status: 'idle' }
  | { status: 'publishing'; target: ShareTargetReference }
  | { status: 'shared'; target: ShareTargetReference; remoteId: string }
  | { status: 'failed'; target: ShareTargetReference; message: string };

export type PlayerPlaybackStatus =
  | { status: 'idle' }
  | { status: 'playing' }
  | { status: 'failed'; message: string };

export type LivePerformanceAudioStatus =
  | { status: 'idle' }
  | { status: 'preparing'; instrument: InstrumentId; preparationAttemptId: string }
  | {
      status: 'ready';
      instrument: InstrumentId;
      sampleSourceLabel: string;
      releaseReady: boolean;
      lastPlaybackEventCount?: number;
      totalPlaybackEventCount?: number;
      lastPlaybackAt?: string;
    }
  | { status: 'failed'; instrument: InstrumentId; message: string };

export type JangdanPresetPreviewMode = 'live' | 'track';

export type GarakProductState = {
  screenFlow: ScreenFlowState;
  selectedMode: ScreenFlowMode;
  language: ProductLanguage;
  selectedInstrument?: InstrumentId;
  selectedPracticeSongId?: PracticeSong['id'];
  previewingPracticeSongId?: PracticeSong['id'];
  currentWorkId?: string;
  workPlayheadBeat: number;
  selectedPlayerItem?: ProductPlayerSelection;
  playingPlayerItem?: ProductPlayerSelection;
  selectedSharedRecordingId?: SharedRecording['id'];
  playingSharedRecordingId?: SharedRecording['id'];
  sharePreviewStatus?: 'playing';
  libraryTab: ProductLibraryTab;
  librarySearchQuery: string;
  pendingFreePlayTake?: PendingFreePlayTake;
  freePlayRecordingSetup?: RecordingSetup;
  freePlayNotice?: FreePlayNotice;
  instrumentSelectNotice?: InstrumentSelectNotice;
  instrumentSampleStatuses: Record<InstrumentId, InstrumentSampleStatus>;
  instrumentSettingsNotice?: InstrumentSettingsNotice;
  instrumentSettingsAdjustmentOpen?: boolean;
  instrumentSettingSelections: InstrumentSettingSelections;
  activeInstrumentSettings?: ActiveInstrumentSettings;
  trackAddNotice?: TrackAddNotice;
  trackAddSelection?: TrackAddSelection;
  workSaveStatus: WorkSaveStatus;
  workSaveErrorMessage?: string;
  workExportStatus: WorkExportStatus;
  sharePublishStatus: SharePublishStatus;
  playerPlaybackStatus: PlayerPlaybackStatus;
  livePerformanceAudioStatus: LivePerformanceAudioStatus;
  recordingCaptureStatus: RecordingCaptureStatus;
  autoAccompanimentStatus: AiAutoAccompanimentStatus;
  practiceAttempt?: PracticeAttempt;
  pendingLiveJangdanGuide?: {
    presetId: JangdanPresetId;
    bpm: number;
    volume: number;
  };
  previewingJangdanPreset?: {
    mode: JangdanPresetPreviewMode;
    presetId: JangdanPresetId;
    bpm: number;
    volume: number;
  };
  library: ProductLibraryState;
  account: AccountState;
  counters: {
    work: number;
    track: number;
    take: number;
    export: number;
    practiceResult: number;
    recordingCapture: number;
    liveAudioPreparation: number;
  };
  now: () => string;
};

export type GarakProductAction =
  | { type: 'selectMode'; mode: ScreenFlowMode }
  | { type: 'selectIntroGuideMode'; mode: ScreenFlowMode }
  | { type: 'setLanguage'; language: ProductLanguage }
  | { type: 'next' }
  | { type: 'selectInstrument'; instrument: InstrumentId }
  | { type: 'showFutureInstrumentNotice' }
  | { type: 'startWithDefaults' }
  | { type: 'openInstrumentSettingsAdjustment' }
  | { type: 'cancelInstrumentSettingsAdjustment' }
  | { type: 'adjustInstrumentSetting'; instrument: InstrumentId; label: string; value: string }
  | { type: 'startWithAdjustedSettings' }
  | { type: 'openFreePlayRecordingSetup' }
  | { type: 'selectFreePlayRecordingPreset'; presetId: JangdanPresetId }
  | { type: 'adjustFreePlayRecordingBpm'; delta: number }
  | { type: 'cancelFreePlayRecordingSetup' }
  | { type: 'startPerformanceRecording'; events?: PerformanceEvent[]; recordingSetup?: RecordingSetup; recordingUri?: string }
  | { type: 'completeRecordingCaptureStart'; instrument: InstrumentId; captureAttemptId: string }
  | {
      type: 'failRecordingCaptureStart';
      instrument: InstrumentId;
      captureAttemptId: string;
      message: string;
    }
  | {
      type: 'attachRecordingCaptureToTake';
      workId: Work['id'];
      trackId: Track['id'];
      takeId: string;
      recordingUri: string;
      durationSeconds?: number;
      captureAttemptId: string;
    }
  | { type: 'completeRecordingCaptureDiscard'; captureAttemptId: string }
  | { type: 'failRecordingCaptureStop'; instrument?: InstrumentId; captureAttemptId: string; message: string }
  | { type: 'appendFreePlayPerformanceEvents'; events: PerformanceEvent[] }
  | { type: 'completePerformance'; events?: PerformanceEvent[] }
  | {
      type: 'completeLivePerformanceAudioPreparation';
      instrument: InstrumentId;
      preparationAttemptId: string;
      sampleSourceLabel: string;
      releaseReady: boolean;
    }
  | {
      type: 'failLivePerformanceAudioPreparation';
      instrument: InstrumentId;
      preparationAttemptId: string;
      message: string;
    }
  | {
      type: 'failLivePerformanceEventPlayback';
      instrument: InstrumentId;
      message: string;
    }
  | {
      type: 'completeLivePerformanceEventPlayback';
      instrument: InstrumentId;
      eventCount: number;
    }
  | { type: 'retryLivePerformanceAudioPreparation' }
  | { type: 'setWorkPlayheadBeat'; beat: number }
  | { type: 'adjustWorkTrackVolume'; trackId: string; delta: number }
  | { type: 'toggleWorkTrackMute'; trackId: string }
  | { type: 'toggleWorkTrackSolo'; trackId: string }
  | { type: 'deleteWorkTrack'; trackId: string }
  | { type: 'playCurrentWorkMix' }
  | { type: 'openLayerEditor' }
  | { type: 'openLiveJangdanGuide' }
  | { type: 'applyLiveJangdanGuide'; presetId: JangdanPresetId; bpm: number; volume: number }
  | {
      type: 'previewJangdanPreset';
      mode: JangdanPresetPreviewMode;
      presetId: JangdanPresetId;
      bpm: number;
      volume: number;
    }
  | { type: 'turnOffLiveJangdanGuide' }
  | { type: 'addTrack' }
  | { type: 'openInstrumentTrackSelection' }
  | { type: 'showLockedImportTrackNotice' }
  | { type: 'cancelTrackAdd' }
  | { type: 'chooseInstrumentTrack'; instrument: InstrumentId }
  | { type: 'restartInstrumentTrackRecording'; events?: PerformanceEvent[]; recordingSetup?: RecordingSetup; recordingUri?: string }
  | { type: 'applyInstrumentTrack'; events?: PerformanceEvent[]; playheadBeat?: number }
  | { type: 'cancelInstrumentTrack' }
  | { type: 'chooseAccompanimentTrack' }
  | { type: 'startAutoAccompanimentGeneration'; stage: AiAutoAccompanimentGenerationStage }
  | { type: 'completeAutoAccompanimentGeneration'; candidate: AiAutoAccompanimentCandidate }
  | {
      type: 'failAutoAccompanimentGeneration';
      code: AiAutoAccompanimentFailureCode;
      message: string;
    }
  | { type: 'addAccompanimentTrack'; presetId: JangdanPresetId; bpm: number; volume: number; playheadBeat?: number }
  | { type: 'cancelAccompanimentTrack' }
  | { type: 'saveCurrentWork' }
  | { type: 'completeCurrentWorkSave' }
  | { type: 'failCurrentWorkSave'; message: string }
  | { type: 'saveAndShareCurrentWork' }
  | { type: 'exportCurrentWork' }
  | {
      type: 'completeWorkAudioExport';
      workId: Work['id'];
      audioUri: string;
      durationSeconds: number;
      renderKind: ExportRenderKind;
      sourceTakeId?: string;
      sourceEventCount?: number;
      sourceRecordingUri?: string;
      completionTarget?: 'player' | 'share';
    }
  | { type: 'failWorkAudioExport'; workId: Work['id']; message: string }
  | { type: 'previewPracticeSong'; songId: PracticeSong['id'] }
  | { type: 'selectPracticeSong'; songId: PracticeSong['id'] }
  | { type: 'selectPracticeInstrument'; instrument: InstrumentId }
  | { type: 'startPractice' }
  | { type: 'pausePractice' }
  | { type: 'restartPractice' }
  | { type: 'finishPractice' }
  | { type: 'practiceAgain' }
  | { type: 'savePracticeResult' }
  | { type: 'sharePracticeResult' }
  | { type: 'chooseAnotherSong' }
  | { type: 'shareSelectedPlayerItem' }
  | { type: 'deleteSelectedPlayerItem' }
  | { type: 'previewShareTarget' }
  | { type: 'saveShareTargetOnly' }
  | { type: 'cancelShareTarget' }
  | { type: 'publishShareTarget' }
  | {
      type: 'completeSharePublish';
      target: ShareTargetReference;
      remoteId: string;
      shareUrl?: string;
      expiresAtMs?: number;
      shareMethod: ShareMethod;
    }
  | { type: 'failSharePublish'; target: ShareTargetReference; message: string }
  | { type: 'openSharedRecordingDetail'; recordingId: SharedRecording['id'] }
  | { type: 'playSelectedSharedRecording' }
  | { type: 'pauseSelectedSharedRecording' }
  | { type: 'remixSharedRecording' }
  | { type: 'saveSharedRecording' }
  | { type: 'loginAndLoadMySongs' }
  | { type: 'completeLoginSync' }
  | { type: 'skipLoginSync' }
  | { type: 'replaceLibrarySnapshot'; library: ProductLibraryState }
  | { type: 'selectLibraryTab'; tab: ProductLibraryTab }
  | { type: 'updateLibrarySearchQuery'; query: string }
  | { type: 'playLibraryItem'; item: ProductPlayerSelection }
  | { type: 'playLibraryItemNow'; item: ProductPlayerSelection }
  | { type: 'playSelectedPlayerItem' }
  | { type: 'pauseSelectedPlayerItem' }
  | { type: 'failPlayerPlayback'; message: string }
  | { type: 'openSelectedPlayerEditor' }
  | { type: 'navigate'; target: ImplementedScreenId }
  | { type: 'back' }
  | { type: 'openWork'; workId: string };

export type ScreenSummary = {
  id: ImplementedScreenId;
  title: string;
  eyebrow: string;
  description: string;
  primaryCtas: string[];
};

export function createInitialGarakProductState(
  input: {
    now?: () => string;
    account?: AccountState;
    sampleManifests?: InstrumentSampleReadinessInput['sampleManifests'];
    sampleFallbackInstruments?: InstrumentSampleReadinessInput['fallbackInstruments'];
  } = {},
): GarakProductState {
  return {
    screenFlow: createInitialScreenFlowState(),
    selectedMode: 'freeCreation',
    language: 'ko',
    library: {
      works: [],
      exportedAudios: [],
      practiceResults: [],
    },
    account: input.account ?? {
      status: 'guest',
    },
    libraryTab: 'works',
    librarySearchQuery: '',
    workPlayheadBeat: 1,
    workSaveStatus: 'idle',
    workExportStatus: { status: 'idle' },
    sharePublishStatus: { status: 'idle' },
    playerPlaybackStatus: { status: 'idle' },
    livePerformanceAudioStatus: { status: 'idle' },
    recordingCaptureStatus: { status: 'idle' },
    autoAccompanimentStatus: { status: 'idle' },
    instrumentSampleStatuses: resolveInstrumentSampleStatuses({
      sampleManifests: input.sampleManifests,
      fallbackInstruments: input.sampleFallbackInstruments,
    }),
    instrumentSettingSelections: {},
    counters: {
      work: 0,
      track: 0,
      take: 0,
      export: 0,
      practiceResult: 0,
      recordingCapture: 0,
      liveAudioPreparation: 0,
    },
    now: input.now ?? (() => new Date().toISOString()),
  };
}

export function applyProductAction(
  state: GarakProductState,
  action: GarakProductAction,
): GarakProductState {
  switch (action.type) {
    case 'playLibraryItem':
      return {
        ...state,
        selectedPlayerItem: action.item,
        playingPlayerItem: undefined,
        playerPlaybackStatus: { status: 'idle' },
        screenFlow:
          state.screenFlow.currentScreen === 'S18' || state.screenFlow.currentScreen === 'S20'
            ? transitionScreenFlow(state.screenFlow, { type: 'playLibraryItem' })
            : pushTarget(state.screenFlow, 'S19'),
      };
    case 'playLibraryItemNow':
      return {
        ...state,
        selectedPlayerItem: action.item,
        playingPlayerItem: action.item,
        playerPlaybackStatus: { status: 'playing' },
        screenFlow:
          state.screenFlow.currentScreen === 'S18' || state.screenFlow.currentScreen === 'S20'
            ? transitionScreenFlow(state.screenFlow, { type: 'playLibraryItem' })
            : pushTarget(state.screenFlow, 'S19'),
      };
    case 'playSelectedPlayerItem':
      return state.selectedPlayerItem === undefined
        ? state
        : {
            ...state,
            playingPlayerItem: state.selectedPlayerItem,
            playerPlaybackStatus: { status: 'playing' },
          };
    case 'pauseSelectedPlayerItem':
      return {
        ...state,
        playingPlayerItem: undefined,
        playerPlaybackStatus: { status: 'idle' },
      };
    case 'failPlayerPlayback':
      return {
        ...state,
        playingPlayerItem: undefined,
        playingSharedRecordingId: undefined,
        sharePreviewStatus: undefined,
        playerPlaybackStatus: {
          status: 'failed',
          message: action.message,
        },
      };
    case 'openSelectedPlayerEditor':
      return openSelectedPlayerEditor(state);
    case 'openWork':
      return {
        ...state,
        currentWorkId: action.workId,
        workSaveStatus: 'idle',
        workSaveErrorMessage: undefined,
        workPlayheadBeat: 1,
        screenFlow:
          state.screenFlow.currentScreen === 'S18'
            ? transitionScreenFlow(state.screenFlow, { type: 'openWork' })
            : pushTarget(state.screenFlow, 'S07'),
      };
    case 'selectMode':
      if (state.screenFlow.currentScreen === 'S01') {
        const modeGuideScreenFlow = transitionScreenFlow(state.screenFlow, {
          type: 'navigate',
          target: 'S03',
        });

        return {
          ...state,
          selectedMode: action.mode,
          screenFlow: transitionScreenFlow(modeGuideScreenFlow, {
            type: 'selectMode',
            mode: action.mode,
          }),
        };
      }

      return {
        ...state,
        selectedMode: action.mode,
        screenFlow: transitionScreenFlow(state.screenFlow, {
          type: 'selectMode',
          mode: action.mode,
        }),
      };
    case 'selectIntroGuideMode':
      if (action.mode !== 'freeCreation') {
        return state;
      }

      return {
        ...state,
        selectedMode: action.mode,
        screenFlow: transitionScreenFlow(state.screenFlow, {
          type: 'selectMode',
          mode: action.mode,
        }),
      };
    case 'setLanguage':
      return {
        ...state,
        language: action.language,
      };
    case 'next':
      if (state.screenFlow.currentScreen === 'S14') {
        return startPracticePerformanceScreen(state);
      }

      if (state.screenFlow.currentScreen === 'S04A') {
        return startFreePlayWithInstrumentSettings(state, 'default');
      }

      return {
        ...state,
        screenFlow: routeProductNext(state),
      };
    case 'selectInstrument':
      return selectInstrument(state, action.instrument);
    case 'showFutureInstrumentNotice':
      return {
        ...state,
        instrumentSelectNotice: 'futureInstrument',
      };
    case 'startWithDefaults':
      return startFreePlayWithInstrumentSettings(state, 'default');
    case 'openInstrumentSettingsAdjustment':
      return {
        ...state,
        instrumentSettingsAdjustmentOpen: true,
        instrumentSettingsNotice: undefined,
      };
    case 'cancelInstrumentSettingsAdjustment':
      return cancelInstrumentSettingsAdjustment(state);
    case 'adjustInstrumentSetting':
      return adjustInstrumentSetting(state, action);
    case 'startWithAdjustedSettings':
      return startFreePlayWithInstrumentSettings(state, 'adjusted');
    case 'openFreePlayRecordingSetup':
      return {
        ...state,
        freePlayRecordingSetup: state.freePlayRecordingSetup ?? createRecordingSetupSuggestion(state),
        freePlayNotice: undefined,
      };
    case 'selectFreePlayRecordingPreset':
      return {
        ...state,
        freePlayRecordingSetup: createRecordingSetup(action.presetId),
        freePlayNotice: undefined,
      };
    case 'adjustFreePlayRecordingBpm':
      return {
        ...state,
        freePlayRecordingSetup: adjustRecordingSetupBpm(
          state.freePlayRecordingSetup ?? createDefaultRecordingSetup(),
          action.delta,
        ),
        freePlayNotice: undefined,
      };
    case 'cancelFreePlayRecordingSetup':
      return {
        ...state,
        freePlayRecordingSetup: undefined,
      };
    case 'startPerformanceRecording':
      if (state.pendingFreePlayTake !== undefined) {
        return state;
      }

      const performanceStartedAtMs = toEpochMs(state.now());
      const performanceCaptureCounters = incrementCounters(state.counters, ['recordingCapture']);
      const performanceCaptureAttemptId = createRecordingCaptureAttemptId(
        performanceCaptureCounters.recordingCapture,
      );

      return {
        ...state,
        counters: performanceCaptureCounters,
        pendingFreePlayTake: {
          events: normalizeRecordedPerformanceEvents(action.events ?? [], performanceStartedAtMs),
          recordingSetup: normalizeRecordingSetup(
            action.recordingSetup ?? state.freePlayRecordingSetup ?? createDefaultRecordingSetup(),
          ),
          recordingUri: normalizeOptionalText(action.recordingUri),
          startedAtMs: performanceStartedAtMs,
        },
        recordingCaptureStatus: {
          status: 'starting',
          instrument: state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT,
          captureAttemptId: performanceCaptureAttemptId,
        },
        freePlayRecordingSetup: undefined,
        freePlayNotice: undefined,
      };
    case 'completeRecordingCaptureStart':
      if (
        state.pendingFreePlayTake === undefined ||
        state.recordingCaptureStatus.status !== 'starting' ||
        state.recordingCaptureStatus.instrument !== action.instrument ||
        !recordingCaptureAttemptMatches(state.recordingCaptureStatus, action.captureAttemptId)
      ) {
        return state;
      }

      return {
        ...state,
        recordingCaptureStatus: {
          status: 'capturing',
          instrument: action.instrument,
          captureAttemptId: action.captureAttemptId ?? state.recordingCaptureStatus.captureAttemptId,
        },
      };
    case 'failRecordingCaptureStart':
      if (
        state.pendingFreePlayTake === undefined ||
        state.recordingCaptureStatus.status !== 'starting' ||
        state.recordingCaptureStatus.instrument !== action.instrument ||
        !recordingCaptureAttemptMatches(state.recordingCaptureStatus, action.captureAttemptId)
      ) {
        return state;
      }

      return {
        ...state,
        recordingCaptureStatus: {
          status: 'failed',
          instrument: action.instrument,
          message: normalizeOptionalText(action.message) ?? 'Recording capture is unavailable.',
        },
      };
    case 'attachRecordingCaptureToTake':
      return attachRecordingCaptureToTake(state, action);
    case 'completeRecordingCaptureDiscard':
      if (
        state.recordingCaptureStatus.status !== 'discarding' ||
        !recordingCaptureAttemptMatches(state.recordingCaptureStatus, action.captureAttemptId)
      ) {
        return state;
      }

      return {
        ...state,
        recordingCaptureStatus: { status: 'idle' },
      };
    case 'failRecordingCaptureStop':
      if (
        (state.recordingCaptureStatus.status !== 'stopping' &&
          state.recordingCaptureStatus.status !== 'discarding') ||
        !recordingCaptureAttemptMatches(state.recordingCaptureStatus, action.captureAttemptId)
      ) {
        return state;
      }

      return {
        ...state,
        recordingCaptureStatus: {
          status: 'failed',
          instrument: action.instrument,
          message: normalizeOptionalText(action.message) ?? 'Recording capture stopped without audio.',
        },
      };
    case 'appendFreePlayPerformanceEvents':
      if (state.pendingFreePlayTake === undefined || action.events.length === 0) {
        return state;
      }

      return {
        ...state,
        pendingFreePlayTake: {
          ...state.pendingFreePlayTake,
          events: [
            ...state.pendingFreePlayTake.events,
            ...normalizeRecordedPerformanceEvents(
              action.events,
              state.pendingFreePlayTake.startedAtMs,
            ),
          ],
        },
        freePlayNotice: undefined,
      };
    case 'completePerformance':
      return completePerformance(state);
    case 'completeLivePerformanceAudioPreparation':
      if (
        !isPendingLivePerformanceAudioPreparation(
          state,
          action.instrument,
          action.preparationAttemptId,
        )
      ) {
        return state;
      }

      return {
        ...state,
        livePerformanceAudioStatus: {
          status: 'ready',
          instrument: action.instrument,
          sampleSourceLabel: action.sampleSourceLabel,
          releaseReady: action.releaseReady,
        },
      };
    case 'failLivePerformanceAudioPreparation':
      if (
        !isPendingLivePerformanceAudioPreparation(
          state,
          action.instrument,
          action.preparationAttemptId,
        )
      ) {
        return state;
      }

      return {
        ...state,
        livePerformanceAudioStatus: {
          status: 'failed',
          instrument: action.instrument,
          message: normalizeOptionalText(action.message) ?? 'Live performance audio is unavailable.',
        },
      };
    case 'failLivePerformanceEventPlayback':
      if (!isCurrentLivePerformancePlaybackInstrument(state, action.instrument)) {
        return state;
      }

      return {
        ...state,
        livePerformanceAudioStatus: {
          status: 'failed',
          instrument: action.instrument,
          message: normalizeOptionalText(action.message) ?? 'Live performance audio is unavailable.',
        },
      };
    case 'completeLivePerformanceEventPlayback':
      if (
        !isCurrentLivePerformancePlaybackInstrument(state, action.instrument) ||
        state.livePerformanceAudioStatus.status !== 'ready' ||
        state.livePerformanceAudioStatus.instrument !== action.instrument
      ) {
        return state;
      }

      const handledEventCount = Math.max(0, Math.floor(action.eventCount));
      const previousTotalPlaybackEventCount =
        state.livePerformanceAudioStatus.totalPlaybackEventCount ?? 0;

      return {
        ...state,
        livePerformanceAudioStatus: {
          ...state.livePerformanceAudioStatus,
          lastPlaybackEventCount: handledEventCount,
          totalPlaybackEventCount: previousTotalPlaybackEventCount + handledEventCount,
          lastPlaybackAt: state.now(),
        },
      };
    case 'retryLivePerformanceAudioPreparation':
      return retryLivePerformanceAudioPreparation(state);
    case 'setWorkPlayheadBeat':
      return {
        ...state,
        workPlayheadBeat: normalizeWorkPlayheadBeat(action.beat),
      };
    case 'adjustWorkTrackVolume':
      return updateCurrentWorkTrack(state, action.trackId, (track) => {
        const volume = clampTrackVolume(track.volume + action.delta);
        return volume === track.volume ? track : { ...track, volume };
      });
    case 'toggleWorkTrackMute':
      return updateCurrentWorkTrack(state, action.trackId, (track) => ({
        ...track,
        mute: !track.mute,
      }));
    case 'toggleWorkTrackSolo':
      return updateCurrentWorkTrack(state, action.trackId, (track) => ({
        ...track,
        solo: !track.solo,
      }));
    case 'deleteWorkTrack':
      return deleteCurrentWorkTrack(state, action.trackId);
    case 'playCurrentWorkMix':
      return {
        ...state,
        playerPlaybackStatus: { status: 'playing' },
      };
    case 'openLayerEditor':
      return openLayerEditor(state);
    case 'openLiveJangdanGuide':
      return {
        ...state,
        freePlayRecordingSetup: undefined,
        previewingJangdanPreset: undefined,
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'openLiveJangdanGuide' }),
      };
    case 'applyLiveJangdanGuide':
      return {
        ...state,
        pendingLiveJangdanGuide: {
          presetId: action.presetId,
          bpm: action.bpm,
          volume: action.volume,
        },
        previewingJangdanPreset: undefined,
        screenFlow:
          state.screenFlow.currentScreen === 'S10A'
            ? transitionScreenFlow(state.screenFlow, { type: 'applyLiveJangdanGuide' })
            : pushTarget(state.screenFlow, 'S05'),
      };
    case 'previewJangdanPreset':
      return {
        ...state,
        previewingJangdanPreset: {
          mode: action.mode,
          presetId: action.presetId,
          bpm: action.bpm,
          volume: action.volume,
        },
      };
    case 'turnOffLiveJangdanGuide':
      return {
        ...state,
        pendingLiveJangdanGuide: undefined,
        previewingJangdanPreset: undefined,
        screenFlow:
          state.screenFlow.currentScreen === 'S10A'
            ? transitionScreenFlow(state.screenFlow, { type: 'turnOffLiveJangdanGuide' })
            : pushTarget(state.screenFlow, 'S05'),
      };
    case 'addTrack':
      return {
        ...state,
        trackAddNotice: undefined,
        trackAddSelection: undefined,
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'addTrack' }),
      };
    case 'openInstrumentTrackSelection':
      return {
        ...state,
        trackAddNotice: undefined,
        trackAddSelection: 'instrument',
      };
    case 'showLockedImportTrackNotice':
      return {
        ...state,
        trackAddNotice: 'importLocked',
        trackAddSelection: undefined,
      };
    case 'cancelTrackAdd':
      return {
        ...state,
        trackAddNotice: undefined,
        trackAddSelection: undefined,
        screenFlow:
          state.screenFlow.currentScreen === 'S08'
            ? transitionScreenFlow(state.screenFlow, { type: 'cancelTrackAdd' })
            : pushTarget(state.screenFlow, 'S07'),
      };
    case 'chooseInstrumentTrack':
      return {
        ...state,
        selectedInstrument: action.instrument,
        trackAddNotice: undefined,
        trackAddSelection: undefined,
        pendingFreePlayTake: undefined,
        freePlayRecordingSetup: undefined,
        ...createLivePerformanceAudioPreparation(state, action.instrument),
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'chooseInstrumentTrack' }),
      };
    case 'restartInstrumentTrackRecording':
      const restartStartedAtMs = toEpochMs(state.now());
      const restartCaptureCounters = incrementCounters(state.counters, ['recordingCapture']);
      const restartCaptureAttemptId = createRecordingCaptureAttemptId(
        restartCaptureCounters.recordingCapture,
      );

      return {
        ...state,
        counters: restartCaptureCounters,
        pendingFreePlayTake: {
          events: normalizeRecordedPerformanceEvents(action.events ?? [], restartStartedAtMs),
          recordingSetup: normalizeRecordingSetup(action.recordingSetup ?? createDefaultRecordingSetup()),
          recordingUri: normalizeOptionalText(action.recordingUri),
          startedAtMs: restartStartedAtMs,
        },
        recordingCaptureStatus: {
          status: 'starting',
          instrument: state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT,
          captureAttemptId: restartCaptureAttemptId,
        },
        freePlayRecordingSetup: undefined,
        screenFlow:
          state.screenFlow.currentScreen === 'S09'
            ? state.screenFlow
            : pushTarget(state.screenFlow, 'S09'),
      };
    case 'applyInstrumentTrack':
      return applyInstrumentTrack(state, action.events ?? [], action.playheadBeat);
    case 'cancelInstrumentTrack':
      return {
        ...state,
        pendingFreePlayTake: undefined,
        recordingCaptureStatus: shouldDiscardRecordingCaptureAfterCancel(state.recordingCaptureStatus)
          ? {
              status: 'discarding',
              instrument: state.recordingCaptureStatus.instrument,
              captureAttemptId: state.recordingCaptureStatus.captureAttemptId,
            }
          : { status: 'idle' },
        freePlayRecordingSetup: undefined,
        screenFlow:
          state.screenFlow.currentScreen === 'S09'
            ? transitionScreenFlow(state.screenFlow, { type: 'cancelInstrumentTrack' })
            : pushTarget(state.screenFlow, 'S07'),
      };
    case 'chooseAccompanimentTrack':
      return {
        ...state,
        trackAddNotice: undefined,
        trackAddSelection: undefined,
        autoAccompanimentStatus: {
          status: 'generating',
          stage: 'analyzing',
        },
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'chooseAccompanimentTrack' }),
      };
    case 'startAutoAccompanimentGeneration':
      return {
        ...state,
        autoAccompanimentStatus: {
          status: 'generating',
          stage: action.stage,
        },
      };
    case 'completeAutoAccompanimentGeneration':
      return {
        ...state,
        autoAccompanimentStatus: {
          status: 'candidateReady',
          candidate: action.candidate,
        },
      };
    case 'failAutoAccompanimentGeneration':
      return {
        ...state,
        autoAccompanimentStatus: {
          status: 'failed',
          code: action.code,
          message: action.message,
        },
      };
    case 'addAccompanimentTrack':
      return applyAccompanimentTrack(state, action);
    case 'saveCurrentWork':
      return saveCurrentWork(state);
    case 'completeCurrentWorkSave':
      return {
        ...state,
        workSaveStatus: 'saved',
        workSaveErrorMessage: undefined,
      };
    case 'failCurrentWorkSave':
      return {
        ...state,
        workSaveStatus: 'failed',
        workSaveErrorMessage: action.message,
      };
    case 'saveAndShareCurrentWork':
      return saveAndShareCurrentWork(state);
    case 'cancelAccompanimentTrack':
      return {
        ...state,
        previewingJangdanPreset: undefined,
        autoAccompanimentStatus: { status: 'idle' },
        screenFlow:
          state.screenFlow.currentScreen === 'S10B'
            ? transitionScreenFlow(state.screenFlow, { type: 'cancelAccompanimentTrack' })
            : pushTarget(state.screenFlow, 'S07'),
      };
    case 'exportCurrentWork':
      return exportCurrentWork(state);
    case 'completeWorkAudioExport':
      return completeWorkAudioExport(state, action);
    case 'failWorkAudioExport':
      return {
        ...state,
        workExportStatus: {
          status: 'failed',
          workId: action.workId,
          message: action.message,
        },
      };
    case 'previewPracticeSong':
      return {
        ...state,
        previewingPracticeSongId: action.songId,
      };
    case 'selectPracticeSong':
      if (!canSelectPracticeSong(action.songId)) {
        return {
          ...state,
          previewingPracticeSongId: action.songId,
        };
      }

      return {
        ...state,
        selectedPracticeSongId: action.songId,
        previewingPracticeSongId: undefined,
        practiceAttempt: undefined,
        screenFlow:
          state.screenFlow.currentScreen === 'S13'
            ? transitionScreenFlow(state.screenFlow, { type: 'selectPracticeSong' })
            : pushTarget(state.screenFlow, 'S14'),
      };
    case 'selectPracticeInstrument':
      return {
        ...state,
        selectedInstrument: action.instrument,
        practiceAttempt: undefined,
      };
    case 'startPractice':
      return startPracticeAttempt(state);
    case 'pausePractice':
      return pausePracticeAttempt(state);
    case 'restartPractice':
      return restartPracticeAttempt(state);
    case 'finishPractice':
      return finishPractice(state);
    case 'practiceAgain':
      return practiceAgain(state);
    case 'savePracticeResult':
      return savePracticeResult(state);
    case 'sharePracticeResult':
      return createPracticeResultAndRoute(state, 'S17');
    case 'chooseAnotherSong':
      return chooseAnotherSong(state);
    case 'shareSelectedPlayerItem':
      return shareSelectedPlayerItem(state);
    case 'deleteSelectedPlayerItem':
      return deleteSelectedPlayerItem(state);
    case 'previewShareTarget':
      return {
        ...state,
        sharePreviewStatus: 'playing',
        playerPlaybackStatus: { status: 'playing' },
      };
    case 'saveShareTargetOnly':
      return {
        ...state,
        sharePreviewStatus: undefined,
        sharePublishStatus: { status: 'idle' },
        screenFlow:
          state.screenFlow.currentScreen === 'S17'
            ? transitionScreenFlow(state.screenFlow, { type: 'saveShareTargetOnly' })
            : pushTarget(state.screenFlow, 'S18'),
      };
    case 'cancelShareTarget':
      if (state.screenFlow.currentScreen !== 'S17') {
        return state;
      }

      return {
        ...state,
        sharePreviewStatus: undefined,
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'cancelShareTarget' }),
      };
    case 'publishShareTarget':
      return publishShareTarget(state);
    case 'completeSharePublish':
      return completeSharePublish(state, action);
    case 'failSharePublish':
      return {
        ...state,
        sharePublishStatus: {
          status: 'failed',
          target: action.target,
          message: action.message,
        },
      };
    case 'openSharedRecordingDetail':
      return {
        ...state,
        selectedSharedRecordingId: action.recordingId,
        playingSharedRecordingId: undefined,
        sharePreviewStatus: undefined,
        screenFlow:
          state.screenFlow.currentScreen === 'S20'
            ? transitionScreenFlow(state.screenFlow, { type: 'openSharedRecordingDetail' })
            : pushTarget(state.screenFlow, 'S21'),
      };
    case 'playSelectedSharedRecording':
      {
        const recording = findSelectedSharedRecording(state);
        if (recording === undefined) {
          return {
            ...state,
            playingSharedRecordingId: undefined,
            playerPlaybackStatus: {
              status: 'failed',
              message: 'Selected shared recording is unavailable.',
            },
          };
        }

        return {
          ...state,
          playingSharedRecordingId: recording.id,
          playerPlaybackStatus: { status: 'playing' },
        };
      }
    case 'pauseSelectedSharedRecording':
      return {
        ...state,
        playingSharedRecordingId: undefined,
        playerPlaybackStatus: { status: 'idle' },
      };
    case 'remixSharedRecording':
      return remixSharedRecording(state);
    case 'saveSharedRecording':
      return saveSharedRecording(state);
    case 'loginAndLoadMySongs':
      return {
        ...state,
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'loginAndLoadMySongs' }),
      };
    case 'completeLoginSync':
      return {
        ...state,
        account: resolveSyncedAccount(state.account),
        screenFlow:
          state.screenFlow.currentScreen === 'S23'
            ? transitionScreenFlow(state.screenFlow, { type: 'completeLoginSync' })
            : pushTarget(state.screenFlow, 'S18'),
      };
    case 'replaceLibrarySnapshot': {
      const library = mergeLibrarySnapshotWithLocalRecordingCaptures(state.library, action.library);
      return {
        ...state,
        library,
        counters: reconcileCountersWithLibrarySnapshot(state.counters, library),
      };
    }
    case 'skipLoginSync':
      if (state.screenFlow.currentScreen !== 'S23') {
        return state;
      }

      return {
        ...state,
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'skipLoginSync' }),
      };
    case 'selectLibraryTab':
      return {
        ...state,
        libraryTab: action.tab,
      };
    case 'updateLibrarySearchQuery':
      return {
        ...state,
        librarySearchQuery: action.query,
      };
    case 'navigate':
      if (action.target === 'S15') {
        return {
          ...state,
          practiceAttempt: createReadyPracticeAttempt(state),
          sharePreviewStatus: undefined,
          screenFlow: transitionScreenFlow(state.screenFlow, {
            type: 'navigate',
            target: action.target,
          }),
        };
      }

      return {
        ...state,
        selectedSharedRecordingId:
          action.target === 'S21' && state.selectedSharedRecordingId === undefined
            ? FEATURED_SHARED_RECORDING.id
            : state.selectedSharedRecordingId,
        sharePreviewStatus: undefined,
        screenFlow: transitionScreenFlow(state.screenFlow, {
          type: 'navigate',
          target: action.target,
        }),
      };
    case 'back':
      return {
        ...state,
        previewingJangdanPreset:
          state.screenFlow.currentScreen === 'S10A' || state.screenFlow.currentScreen === 'S10B'
            ? undefined
            : state.previewingJangdanPreset,
        sharePreviewStatus: undefined,
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'back' }),
      };
  }
}

function startFreePlayWithInstrumentSettings(
  state: GarakProductState,
  source: ActiveInstrumentSettings['source'],
): GarakProductState {
  const instrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
  const sampleStatus = state.instrumentSampleStatuses[instrument];

  if (sampleStatus === 'downloadRequired') {
    return {
      ...state,
      selectedInstrument: instrument,
      instrumentSettingsNotice: 'sampleRequired',
    };
  }

  return {
    ...state,
    selectedInstrument: instrument,
    activeInstrumentSettings: {
      instrument,
      values:
        source === 'default'
          ? getDefaultInstrumentSettingValues(instrument)
          : resolveInstrumentSettingValues(
              instrument,
              state.instrumentSettingSelections[instrument],
            ),
      source,
    },
    instrumentSelectNotice: undefined,
    instrumentSettingsNotice: undefined,
    instrumentSettingsAdjustmentOpen: undefined,
    pendingFreePlayTake: undefined,
    recordingCaptureStatus: { status: 'idle' },
    freePlayRecordingSetup: undefined,
    freePlayNotice: undefined,
    ...createLivePerformanceAudioPreparation(state, instrument),
    screenFlow: pushTarget(state.screenFlow, 'S05'),
  };
}

function selectInstrument(
  state: GarakProductState,
  instrument: InstrumentId,
): GarakProductState {
  const nextState = {
    ...state,
    selectedInstrument: instrument,
    instrumentSelectNotice: undefined,
    instrumentSettingsNotice: undefined,
    instrumentSettingsAdjustmentOpen: undefined,
    practiceAttempt: undefined,
  };

  if (state.screenFlow.currentScreen !== 'S05') {
    return nextState;
  }

  return {
    ...nextState,
    activeInstrumentSettings: {
      instrument,
      values: getDefaultInstrumentSettingValues(instrument),
      source: 'default',
    },
    ...createLivePerformanceAudioPreparation(state, instrument),
  };
}

function isPendingLivePerformanceAudioPreparation(
  state: GarakProductState,
  instrument: InstrumentId,
  preparationAttemptId: string,
): boolean {
  return (
    state.livePerformanceAudioStatus.status === 'preparing' &&
    state.livePerformanceAudioStatus.instrument === instrument &&
    state.livePerformanceAudioStatus.preparationAttemptId === preparationAttemptId
  );
}

function isCurrentLivePerformancePlaybackInstrument(
  state: GarakProductState,
  instrument: InstrumentId,
): boolean {
  if (state.screenFlow.currentScreen !== 'S05' && state.screenFlow.currentScreen !== 'S09') {
    return false;
  }

  return (state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT) === instrument;
}

function createLivePerformanceAudioPreparation(
  state: GarakProductState,
  instrument: InstrumentId,
): Pick<GarakProductState, 'counters' | 'livePerformanceAudioStatus'> {
  const liveAudioPreparationCounter = state.counters.liveAudioPreparation + 1;

  return {
    counters: {
      ...state.counters,
      liveAudioPreparation: liveAudioPreparationCounter,
    },
    livePerformanceAudioStatus: {
      status: 'preparing',
      instrument,
      preparationAttemptId: createLivePerformanceAudioPreparationAttemptId(
        liveAudioPreparationCounter,
      ),
    },
  };
}

function createLivePerformanceAudioPreparationAttemptId(counter: number): string {
  return `live-audio-${counter}`;
}

function retryLivePerformanceAudioPreparation(state: GarakProductState): GarakProductState {
  if (state.screenFlow.currentScreen !== 'S05' && state.screenFlow.currentScreen !== 'S09') {
    return state;
  }

  const instrument =
    state.livePerformanceAudioStatus.status === 'failed' ||
    state.livePerformanceAudioStatus.status === 'preparing' ||
    state.livePerformanceAudioStatus.status === 'ready'
      ? state.livePerformanceAudioStatus.instrument
      : state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;

  return {
    ...state,
    ...createLivePerformanceAudioPreparation(state, instrument),
  };
}

function adjustInstrumentSetting(
  state: GarakProductState,
  action: Extract<GarakProductAction, { type: 'adjustInstrumentSetting' }>,
): GarakProductState {
  return {
    ...state,
    instrumentSettingSelections: {
      ...state.instrumentSettingSelections,
      [action.instrument]: {
        ...state.instrumentSettingSelections[action.instrument],
        [action.label]: action.value,
      },
    },
    instrumentSettingsNotice: undefined,
  };
}

function cancelInstrumentSettingsAdjustment(state: GarakProductState): GarakProductState {
  const instrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
  const {
    [instrument]: _discardedSelection,
    ...remainingSelections
  } = state.instrumentSettingSelections;

  return {
    ...state,
    instrumentSettingSelections: remainingSelections,
    instrumentSettingsAdjustmentOpen: false,
    instrumentSettingsNotice: undefined,
  };
}

function getRecordingInstrumentSettings(
  state: GarakProductState,
  instrument: InstrumentId,
): InstrumentSettingValueMap {
  if (state.activeInstrumentSettings?.instrument === instrument) {
    return state.activeInstrumentSettings.values;
  }

  return getDefaultInstrumentSettingValues(instrument);
}

export function getCurrentScreenSummary(state: GarakProductState): ScreenSummary {
  const screenId = state.screenFlow.currentScreen;

  switch (screenId) {
    case 'S01':
      return {
        id: screenId,
        title: GARAK_BRAND.serviceName,
        eyebrow: GARAK_BRAND.subtitle,
        description: 'GARAK과 함께 국악 연주하기 hero의 PLAY로 연주 모드 선택 화면에 진입해요.',
        primaryCtas: ['PLAY', '언어 변경', '마이', '쉐어', '설정'],
      };
    case 'S04':
      return summary(
        screenId,
        '악기 선택',
        '자유창작',
        state.instrumentSelectNotice === 'futureInstrument'
          ? '새로운 악기가 업데이트될 예정이에요. 지금은 가야금, 장구, 대금 중 선택해 주세요.'
          : '가야금, 장구, 대금 중 연주할 악기를 선택해요.',
        ['Next'],
      );
    case 'S04A':
      return summary(
        screenId,
        '연주 화면 미리보기',
        getInstrumentLabel(state),
        state.instrumentSettingsNotice === 'sampleRequired'
          ? '필수 샘플 준비 후 연주를 시작할 수 있어요.'
          : '선택한 악기의 연주 화면을 미리 확인하고 바로 시작해요.',
        ['NEXT'],
      );
    case 'S05':
      return summary(
        screenId,
        `${getInstrumentLabel(state)} 자유연주`,
        '녹음',
        freePlayDescription(state),
        ['녹음', '장단', '레이어 편집', '완료'],
      );
    case 'S07':
      return summary(screenId, '트랙/레이어 편집', currentWorkTitle(state), '작업 위에 악기와 반주 트랙을 레이어로 쌓아요.', [
        '트랙 추가',
        '작업 저장',
        '내보내기',
      ]);
    case 'S08':
      return summary(screenId, '트랙 추가', currentWorkTitle(state), '추가할 트랙 타입을 선택해요.', [
        '악기 연주 추가',
        '장단/반주 추가',
        '가져오기',
        '취소',
      ]);
    case 'S09':
      return summary(screenId, '추가 악기 녹음', getInstrumentLabel(state), '기존 작업을 들으며 새 악기를 덧녹음해요.', [
        '녹음',
        '적용',
        '다시 녹음',
        '취소',
      ]);
    case 'S10A':
      return summary(screenId, '라이브 장단 가이드', '연주 보조', '연주 중 들을 장단과 BPM을 정해요.', [
        '미리듣기',
        '적용하고 연주로 돌아가기',
        '끄기',
      ]);
    case 'S10B':
      return summary(screenId, '반주 트랙 만들기', currentWorkTitle(state), '작업에 추가할 장단/반주 트랙을 만들어요.', [
        '미리듣기',
        '반주 트랙 추가',
        '취소',
      ]);
    case 'S13':
      return summary(screenId, '민요 선택', '따라하기', practiceSongSelectDescription(state), [
        '아리랑',
        '도라지',
        '뱃노래',
        '미리듣기',
      ]);
    case 'S14':
      return summary(screenId, '따라하기 악기 선택', selectedSongLabel(state), '추천 악기는 배지로만 보여주고 선택은 열어둬요.', [
        '가야금',
        '장구',
        '대금',
        'NEXT',
      ]);
    case 'S15':
      return summary(
        screenId,
        '따라하기 연주',
        selectedSongLabel(state),
        practiceAttemptDescription(state),
        ['시작', '일시정지', '완주', '다시 시작'],
      );
    case 'S16':
      return summary(screenId, '결과 / AI 피드백', selectedSongLabel(state), '정확도와 로컬 피드백을 확인해요.', [
        '다시 연주',
        '저장',
        '공유',
        '다른 민요 선택',
      ]);
    case 'S17':
      return summary(screenId, '공유 준비', '내보낸 음원 / 결과', '공유할 제목과 미리보기를 확인해요.', [
        '미리듣기',
        '공유하기',
        '저장만 하기',
        '취소',
      ]);
    case 'S18':
      return summary(screenId, '보관함', `${state.library.works.length}개 작업`, '작업과 내보낸 음원/결과를 나눠 관리해요.', [
        '작업 열기',
        '들어보기',
        '공유',
        '더보기',
        '검색',
        '보관함 동기화',
      ]);
    case 'S19':
      return summary(screenId, '연주 상세 / 플레이어', '내보낸 음원', '저장된 결과물을 듣고 공유하거나 편집으로 돌아가요.', [
        '재생',
        '일시정지',
        '편집으로 열기',
        '공유',
        '삭제',
      ]);
    case 'S20':
      return summary(screenId, '쉐어 / 둘러보기', '데모 피드', '다른 GARAK을 듣고 리믹스할 수 있어요.', [
        '재생',
        '리믹스',
        '저장',
        '상세 보기',
      ]);
    case 'S21':
      return summary(screenId, '공유 곡 상세', '쉐어', '공유 곡을 자세히 듣고 리믹스 여부를 결정해요.', [
        '재생',
        '리믹스',
        '저장',
      ]);
    case 'S22':
      return summary(screenId, '마이 / 설정', accountLabel(state), '로그인은 내 곡을 불러올 때만 사용해요.', [
        '로그인하고 내 곡 불러오기',
        '언어 변경',
        '보관함 관리',
      ]);
    case 'S23':
      return summary(screenId, '로그인 / 보관함 동기화', '선택 동기화', '로컬 작업을 유지한 채 계정 곡을 불러와요.', [
        '로그인',
        '동기화',
        '선택해서 가져오기',
        '건너뛰기',
      ]);
    case 'S02':
      return summary(screenId, '언어 전환', '설정', '한국어와 영어 표시를 바꿔요.', ['한국어', 'English']);
    case 'S03':
      return summary(screenId, '연주 모드 선택', '홈-자유창작모드', '자유창작 모드와 따라하기 모드 중 현재 연주 흐름을 선택해요.', [
        '자유창작 모드',
        '따라하기 모드',
        'NEXT',
      ]);
  }
}

function completePerformance(state: GarakProductState): GarakProductState {
  if (state.pendingFreePlayTake === undefined) {
    return {
      ...state,
      freePlayRecordingSetup: undefined,
      freePlayNotice: 'missingTake',
    };
  }

  if (hasEmptyFailedPendingTake(state)) {
    return {
      ...state,
      pendingFreePlayTake: undefined,
      freePlayRecordingSetup: undefined,
      freePlayNotice: 'missingTake',
    };
  }

  const nextCounters = incrementCounters(state.counters, ['work', 'track', 'take']);
  const now = state.now();
  const instrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
  const takeEvents = state.pendingFreePlayTake.events;
  const instrumentSettings = getRecordingInstrumentSettings(state, instrument);
  const work = autoSaveTakeAsWork({
    workId: `work-${nextCounters.work}`,
    trackId: `track-${nextCounters.track}`,
    takeId: `take-${nextCounters.take}`,
    title: `${getInstrumentName(instrument)} 작업 ${nextCounters.work}`,
    instrument,
    events: takeEvents,
    createdAt: now,
    startedAtBeat: 1,
    durationBeats: getPerformanceTakeDurationBeats(
      takeEvents,
      state.pendingFreePlayTake.recordingSetup,
    ),
    recordingUri: state.pendingFreePlayTake.recordingUri,
    instrumentSettings,
    recordingSetup: state.pendingFreePlayTake.recordingSetup,
    liveJangdanGuide: state.pendingLiveJangdanGuide
      ? {
          presetId: state.pendingLiveJangdanGuide.presetId,
          bpm: state.pendingLiveJangdanGuide.bpm,
          volume: state.pendingLiveJangdanGuide.volume,
          startedAtBeat: 1,
        }
      : undefined,
  });

  return {
    ...state,
    counters: nextCounters,
    currentWorkId: work.id,
    workPlayheadBeat: 1,
    pendingFreePlayTake: undefined,
    recordingCaptureStatus: shouldStopRecordingCaptureAfterCompletion(state.recordingCaptureStatus)
      ? {
          status: 'stopping',
          instrument: state.recordingCaptureStatus.instrument,
          captureAttemptId: state.recordingCaptureStatus.captureAttemptId,
        }
      : state.recordingCaptureStatus.status === 'failed'
        ? state.recordingCaptureStatus
        : { status: 'idle' },
    freePlayRecordingSetup: undefined,
    freePlayNotice: undefined,
    workSaveStatus: 'idle',
    workSaveErrorMessage: undefined,
    pendingLiveJangdanGuide: undefined,
    library: {
      ...state.library,
      works: [...state.library.works, work],
    },
    screenFlow: transitionScreenFlow(
      state.screenFlow.currentScreen === 'S05'
        ? state.screenFlow
        : pushTarget(state.screenFlow, 'S05'),
      { type: 'completePerformance' },
    ),
  };
}

function shouldStopRecordingCaptureAfterCompletion(
  status: RecordingCaptureStatus,
): status is Extract<RecordingCaptureStatus, { status: 'starting' | 'capturing' }> {
  return status.status === 'starting' || status.status === 'capturing';
}

function shouldDiscardRecordingCaptureAfterCancel(
  status: RecordingCaptureStatus,
): status is Extract<RecordingCaptureStatus, { status: 'starting' | 'capturing' | 'stopping' }> {
  return status.status === 'starting' || status.status === 'capturing' || status.status === 'stopping';
}

function createRecordingCaptureAttemptId(counter: number): string {
  return `capture-${counter}`;
}

function recordingCaptureAttemptMatches(
  status: Extract<RecordingCaptureStatus, { captureAttemptId?: string }>,
  captureAttemptId: string,
): boolean {
  return status.captureAttemptId === captureAttemptId;
}

function attachRecordingCaptureToTake(
  state: GarakProductState,
  action: Extract<GarakProductAction, { type: 'attachRecordingCaptureToTake' }>,
): GarakProductState {
  const recordingUri = normalizeOptionalText(action.recordingUri);
  if (recordingUri === undefined) {
    if (!activeRecordingCaptureAttemptMatches(state.recordingCaptureStatus, action.captureAttemptId)) {
      return state;
    }

    if (shouldPreserveActiveRecordingCapture(state.recordingCaptureStatus)) {
      return state;
    }

    return {
      ...state,
      recordingCaptureStatus: {
        status: 'failed',
        message: 'Recording capture stopped without a playable URI.',
      },
    };
  }

  if (!isCaptureFileUri(recordingUri)) {
    if (!activeRecordingCaptureAttemptMatches(state.recordingCaptureStatus, action.captureAttemptId)) {
      return state;
    }

    if (shouldPreserveActiveRecordingCapture(state.recordingCaptureStatus)) {
      return state;
    }

    return {
      ...state,
      recordingCaptureStatus: {
        status: 'failed',
        message: 'Recording capture returned a non-file URI.',
      },
    };
  }

  let didAttach = false;
  const works = state.library.works.map((work) => {
    if (work.id !== action.workId) {
      return work;
    }

    return {
      ...work,
      updatedAt: state.now(),
      tracks: work.tracks.map((track) => {
        if (track.id !== action.trackId || track.kind !== 'instrument') {
          return track;
        }

        const takes = track.takes.map((take) => {
          if (take.id !== action.takeId) {
            return take;
          }

          didAttach = true;
          return {
            ...take,
            recordingUri,
          };
        });

        return {
          ...track,
          takes,
        };
      }),
    };
  });

  if (!didAttach) {
    if (state.recordingCaptureStatus.status === 'stopping') {
      if (!recordingCaptureAttemptMatches(state.recordingCaptureStatus, action.captureAttemptId)) {
        return state;
      }

      return {
        ...state,
        recordingCaptureStatus: {
          status: 'failed',
          instrument: state.recordingCaptureStatus.instrument,
          message: 'Recording capture target is unavailable.',
        },
      };
    }

    return state;
  }

  return {
    ...state,
    library: {
      ...state.library,
      works,
    },
    recordingCaptureStatus: shouldPreserveRecordingCaptureStatusAfterAttach(state, action)
      ? state.recordingCaptureStatus
      : { status: 'idle' },
  };
}

function shouldPreserveActiveRecordingCapture(status: RecordingCaptureStatus): boolean {
  return status.status === 'starting' || status.status === 'capturing';
}

function activeRecordingCaptureAttemptMatches(
  status: RecordingCaptureStatus,
  captureAttemptId: string,
): boolean {
  if (
    status.status !== 'starting' &&
    status.status !== 'capturing' &&
    status.status !== 'stopping' &&
    status.status !== 'discarding'
  ) {
    return false;
  }

  return recordingCaptureAttemptMatches(status, captureAttemptId);
}

function shouldPreserveRecordingCaptureStatusAfterAttach(
  state: GarakProductState,
  action: Extract<GarakProductAction, { type: 'attachRecordingCaptureToTake' }>,
): boolean {
  if (shouldPreserveActiveRecordingCapture(state.recordingCaptureStatus)) {
    return true;
  }

  if (state.recordingCaptureStatus.status !== 'stopping') {
    return false;
  }

  return (
    !recordingCaptureAttemptMatches(state.recordingCaptureStatus, action.captureAttemptId) ||
    !isLatestInstrumentTakeCaptureTarget(state, action)
  );
}

function isLatestInstrumentTakeCaptureTarget(
  state: GarakProductState,
  action: Extract<GarakProductAction, { type: 'attachRecordingCaptureToTake' }>,
): boolean {
  const work = state.library.works.find((item) => item.id === action.workId);
  if (work === undefined) {
    return false;
  }

  for (let trackIndex = work.tracks.length - 1; trackIndex >= 0; trackIndex -= 1) {
    const track = work.tracks[trackIndex];
    if (track.kind !== 'instrument' || track.takes.length === 0) {
      continue;
    }

    const latestTake = track.takes[track.takes.length - 1];
    return track.id === action.trackId && latestTake.id === action.takeId;
  }

  return false;
}

function freePlayDescription(state: GarakProductState): string {
  if (state.freePlayRecordingSetup !== undefined) {
    return '녹음 전 BPM, 박자, 장단을 확인하고 시작해요.';
  }

  if (state.freePlayNotice === 'missingTake') {
    return '저장할 테이크가 없어요. 먼저 녹음을 시작해 주세요.';
  }

  if (state.livePerformanceAudioStatus.status === 'preparing') {
    return '연주 소리를 준비하는 중입니다. 준비가 끝나면 터치한 소리가 바로 납니다.';
  }

  if (state.livePerformanceAudioStatus.status === 'failed') {
    return `연주 소리를 준비하지 못했습니다. ${state.livePerformanceAudioStatus.message}`;
  }

  return '악기를 직접 연주하고 완료하면 작업으로 자동 저장돼요.';
}

function createDefaultRecordingSetup(): RecordingSetup {
  const preset = JANGDAN_PRESETS[0];
  return createRecordingSetup(preset.id, preset.defaultBpm);
}

function createRecordingSetupSuggestion(state: GarakProductState): RecordingSetup {
  if (state.pendingLiveJangdanGuide !== undefined) {
    return createRecordingSetup(state.pendingLiveJangdanGuide.presetId, state.pendingLiveJangdanGuide.bpm);
  }

  return createDefaultRecordingSetup();
}

function createRecordingSetup(presetId: JangdanPresetId, bpm?: number): RecordingSetup {
  const preset = JANGDAN_PRESETS.find((item) => item.id === presetId) ?? JANGDAN_PRESETS[0];

  return {
    presetId: preset.id,
    bpm: clampBpm(preset, bpm ?? preset.defaultBpm),
    beatUnit: preset.beatUnit,
  };
}

function adjustRecordingSetupBpm(setup: RecordingSetup, delta: number): RecordingSetup {
  return createRecordingSetup(setup.presetId, setup.bpm + delta);
}

function normalizeRecordingSetup(setup: RecordingSetup): RecordingSetup {
  const normalized = createRecordingSetup(setup.presetId, setup.bpm);

  return {
    ...normalized,
    beatUnit: setup.beatUnit.trim().length > 0 ? setup.beatUnit : normalized.beatUnit,
  };
}

function toEpochMs(isoDate: string): number {
  const epochMs = Date.parse(isoDate);

  return Number.isFinite(epochMs) ? epochMs : 0;
}

function getPerformanceTakeDurationBeats(
  events: PerformanceEvent[],
  recordingSetup: RecordingSetup,
): number {
  if (events.length === 0) {
    return 4;
  }

  const lastEventTsMs = Math.max(...events.map((event) => event.tsMs));
  const msPerBeat = 60_000 / recordingSetup.bpm;

  if (!Number.isFinite(lastEventTsMs) || !Number.isFinite(msPerBeat) || msPerBeat <= 0) {
    return 4;
  }

  return Math.max(1, Math.ceil(lastEventTsMs / msPerBeat));
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function mergeLibrarySnapshotWithLocalRecordingCaptures(
  currentLibrary: ProductLibraryState,
  incomingLibrary: ProductLibraryState,
): ProductLibraryState {
  const currentWorksById = new Map(currentLibrary.works.map((work) => [work.id, work]));
  let didRestoreCapture = false;
  const works = incomingLibrary.works.map((incomingWork) => {
    const currentWork = currentWorksById.get(incomingWork.id);
    if (currentWork === undefined) {
      return incomingWork;
    }

    const currentTracksById = new Map(currentWork.tracks.map((track) => [track.id, track]));
    let didRestoreWorkCapture = false;
    const tracks = incomingWork.tracks.map((incomingTrack) => {
      if (incomingTrack.kind !== 'instrument') {
        return incomingTrack;
      }

      const currentTrack = currentTracksById.get(incomingTrack.id);
      if (currentTrack?.kind !== 'instrument') {
        return incomingTrack;
      }

      const currentTakesById = new Map(currentTrack.takes.map((take) => [take.id, take]));
      let didRestoreTrackCapture = false;
      const takes = incomingTrack.takes.map((incomingTake) => {
        if (normalizeOptionalText(incomingTake.recordingUri) !== undefined) {
          return incomingTake;
        }

        const currentRecordingUri = normalizeOptionalText(
          currentTakesById.get(incomingTake.id)?.recordingUri,
        );
        if (currentRecordingUri === undefined) {
          return incomingTake;
        }

        didRestoreCapture = true;
        didRestoreWorkCapture = true;
        didRestoreTrackCapture = true;
        return {
          ...incomingTake,
          recordingUri: currentRecordingUri,
        };
      });

      return didRestoreTrackCapture ? { ...incomingTrack, takes } : incomingTrack;
    });

    return didRestoreWorkCapture ? { ...incomingWork, tracks } : incomingWork;
  });

  return didRestoreCapture ? { ...incomingLibrary, works } : incomingLibrary;
}

function reconcileCountersWithLibrarySnapshot(
  counters: GarakProductState['counters'],
  library: ProductLibraryState,
): GarakProductState['counters'] {
  let maxTrackCounter = 0;
  let maxTakeCounter = 0;

  for (const work of library.works) {
    for (const track of work.tracks) {
      maxTrackCounter = Math.max(maxTrackCounter, parseIdCounter(track.id, 'track-'));
      if (track.kind === 'instrument') {
        for (const take of track.takes) {
          maxTakeCounter = Math.max(maxTakeCounter, parseIdCounter(take.id, 'take-'));
        }
      }
    }
  }

  return {
    ...counters,
    work: Math.max(counters.work, ...library.works.map((work) => parseIdCounter(work.id, 'work-'))),
    track: Math.max(counters.track, maxTrackCounter),
    take: Math.max(counters.take, maxTakeCounter),
    export: Math.max(
      counters.export,
      ...library.exportedAudios.map((audio) => parseIdCounter(audio.id, 'export-')),
    ),
    practiceResult: Math.max(
      counters.practiceResult,
      ...library.practiceResults.map((result) => parseIdCounter(result.id, 'practice-')),
    ),
  };
}

function parseIdCounter(id: string, prefix: string): number {
  if (!id.startsWith(prefix)) {
    return 0;
  }

  const parsed = Number.parseInt(id.slice(prefix.length), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function isCaptureFileUri(value: string): boolean {
  return /^(file|content):\/\/\S+/i.test(value.trim());
}

function normalizeRecordedPerformanceEvents(
  events: PerformanceEvent[],
  startedAtMs: number,
): PerformanceEvent[] {
  if (!Number.isFinite(startedAtMs) || startedAtMs <= 0) {
    return events;
  }

  return events.map((event) => {
    if (!Number.isFinite(event.tsMs)) {
      return event;
    }

    const relativeTsMs =
      event.tsMs > ABSOLUTE_PERFORMANCE_EVENT_TIMESTAMP_THRESHOLD_MS
        ? Math.max(0, event.tsMs - startedAtMs)
        : Math.max(0, event.tsMs);

    return relativeTsMs === event.tsMs
      ? event
      : {
          ...event,
          tsMs: relativeTsMs,
        };
  });
}

function hasEmptyFailedPendingTake(state: GarakProductState): boolean {
  return state.pendingFreePlayTake !== undefined &&
    state.pendingFreePlayTake.events.length === 0 &&
    normalizeOptionalText(state.pendingFreePlayTake.recordingUri) === undefined &&
    state.recordingCaptureStatus.status === 'failed';
}

function clampBpm(preset: { minBpm: number; maxBpm: number }, bpm: number): number {
  return Math.min(preset.maxBpm, Math.max(preset.minBpm, Math.round(bpm)));
}

function normalizeWorkPlayheadBeat(beat: number): number {
  return typeof beat === 'number' && Number.isFinite(beat) && beat > 0 ? Math.round(beat) : 1;
}

function openLayerEditor(state: GarakProductState): GarakProductState {
  if (findCurrentWork(state) === undefined) {
    return {
      ...state,
      freePlayRecordingSetup: undefined,
      freePlayNotice: 'missingTake',
    };
  }

  return {
    ...state,
    freePlayRecordingSetup: undefined,
    freePlayNotice: undefined,
    screenFlow:
      state.screenFlow.currentScreen === 'S07'
        ? state.screenFlow
        : transitionScreenFlow(
            state.screenFlow.currentScreen === 'S05'
              ? state.screenFlow
              : pushTarget(state.screenFlow, 'S05'),
            { type: 'openLayerEditor' },
          ),
  };
}

function routeProductNext(state: GarakProductState): ScreenFlowState {
  if (state.screenFlow.currentScreen === 'S03') {
    return transitionScreenFlow(state.screenFlow, { type: 'next' });
  }

  if (state.screenFlow.currentScreen === 'S04') {
    return pushTarget(state.screenFlow, 'S04A');
  }

  if (state.screenFlow.currentScreen === 'S14') {
    return pushTarget(state.screenFlow, 'S15');
  }

  return state.screenFlow;
}

function startPracticePerformanceScreen(state: GarakProductState): GarakProductState {
  return {
    ...state,
    practiceAttempt: createReadyPracticeAttempt(state),
    screenFlow:
      state.screenFlow.currentScreen === 'S14'
        ? transitionScreenFlow(state.screenFlow, { type: 'next' })
        : pushTarget(state.screenFlow, 'S15'),
  };
}

function createReadyPracticeAttempt(state: GarakProductState): PracticeAttempt {
  const songId = state.selectedPracticeSongId ?? 'arirang';
  const song = PRACTICE_SONGS.find((item) => item.id === songId) ?? PRACTICE_SONGS[0];

  return {
    songId,
    instrument: state.selectedInstrument ?? song.recommendedInstrument,
    status: 'ready',
    inputEvents: [],
    timingErrorsMs: [],
  };
}

function canSelectPracticeSong(songId: PracticeSong['id']): boolean {
  return PRACTICE_SONGS.find((song) => song.id === songId)?.guideReady === true;
}

function startPracticeAttempt(state: GarakProductState): GarakProductState {
  const attempt = state.practiceAttempt ?? createReadyPracticeAttempt(state);

  return {
    ...state,
    practiceAttempt: {
      ...attempt,
      status: 'playing',
      startedAt: attempt.startedAt ?? state.now(),
    },
  };
}

function pausePracticeAttempt(state: GarakProductState): GarakProductState {
  if (state.practiceAttempt?.status !== 'playing') {
    return state;
  }

  return {
    ...state,
    practiceAttempt: {
      ...state.practiceAttempt,
      status: 'paused',
    },
  };
}

function restartPracticeAttempt(state: GarakProductState): GarakProductState {
  return {
    ...state,
    practiceAttempt: {
      ...createReadyPracticeAttempt(state),
      status: 'playing',
      startedAt: state.now(),
    },
  };
}

function finishPractice(state: GarakProductState): GarakProductState {
  const attempt = state.practiceAttempt ?? createReadyPracticeAttempt(state);

  return {
    ...state,
    practiceAttempt: {
      ...attempt,
      status: 'completed',
      startedAt: attempt.startedAt ?? state.now(),
      completedAt: state.now(),
    },
    screenFlow:
      state.screenFlow.currentScreen === 'S15'
        ? transitionScreenFlow(state.screenFlow, { type: 'finishPractice' })
        : pushTarget(state.screenFlow, 'S16'),
  };
}

function practiceAgain(state: GarakProductState): GarakProductState {
  return {
    ...state,
    practiceAttempt: createReadyPracticeAttempt(state),
    previewingPracticeSongId: undefined,
    screenFlow:
      state.screenFlow.currentScreen === 'S16'
        ? transitionScreenFlow(state.screenFlow, { type: 'practiceAgain' })
        : pushTarget(state.screenFlow, 'S15'),
  };
}

function chooseAnotherSong(state: GarakProductState): GarakProductState {
  return {
    ...state,
    practiceAttempt: undefined,
    previewingPracticeSongId: undefined,
    screenFlow:
      state.screenFlow.currentScreen === 'S16'
        ? transitionScreenFlow(state.screenFlow, { type: 'chooseAnotherSong' })
        : pushTarget(state.screenFlow, 'S13'),
  };
}

function applyInstrumentTrack(
  state: GarakProductState,
  events: PerformanceEvent[],
  playheadBeat?: number,
): GarakProductState {
  const currentWork = findCurrentWork(state);
  if (currentWork === undefined) {
    return state;
  }

  const pendingTake = state.pendingFreePlayTake;
  if (hasEmptyFailedPendingTake(state)) {
    return {
      ...state,
      pendingFreePlayTake: undefined,
      freePlayRecordingSetup: undefined,
    };
  }

  const hasRecordedTake = pendingTake !== undefined || events.length > 0;
  if (!hasRecordedTake) {
    return state;
  }
  const takeEvents = events.length > 0 ? events : pendingTake?.events ?? [];
  const recordingSetup = pendingTake?.recordingSetup ?? createDefaultRecordingSetup();

  const nextCounters = incrementCounters(state.counters, ['track', 'take']);
  const now = state.now();
  const instrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
  const nextWork = addInstrumentTrack(currentWork, {
    trackId: `track-${nextCounters.track}`,
    takeId: `take-${nextCounters.take}`,
    instrument,
    events: takeEvents,
    createdAt: now,
    durationBeats: getPerformanceTakeDurationBeats(takeEvents, recordingSetup),
    playheadBeat: playheadBeat ?? state.workPlayheadBeat,
    recordingUri: pendingTake?.recordingUri,
    recordingSetup,
    instrumentSettings: getRecordingInstrumentSettings(state, instrument),
  });
  const nextScreenFlow =
    state.screenFlow.currentScreen === 'S09'
      ? transitionScreenFlow(state.screenFlow, { type: 'applyInstrumentTrack' })
      : pushTarget(state.screenFlow, 'S07');

  return {
    ...replaceCurrentWork(state, nextWork, nextCounters, nextScreenFlow),
    pendingFreePlayTake: undefined,
    recordingCaptureStatus: shouldStopRecordingCaptureAfterCompletion(state.recordingCaptureStatus)
      ? {
          status: 'stopping',
          instrument: state.recordingCaptureStatus.instrument,
          captureAttemptId: state.recordingCaptureStatus.captureAttemptId,
        }
      : state.recordingCaptureStatus.status === 'failed'
        ? state.recordingCaptureStatus
        : { status: 'idle' },
  };
}

function applyAccompanimentTrack(
  state: GarakProductState,
  action: Extract<GarakProductAction, { type: 'addAccompanimentTrack' }>,
): GarakProductState {
  const currentWork = findCurrentWork(state);
  if (currentWork === undefined) {
    return state;
  }

  const nextCounters = incrementCounters(state.counters, ['track']);
  const nextWork = addAccompanimentTrack(currentWork, {
    trackId: `track-${nextCounters.track}`,
    presetId: action.presetId,
    bpm: action.bpm,
    volume: action.volume,
    createdAt: state.now(),
    playheadBeat: action.playheadBeat ?? state.workPlayheadBeat,
  });

  const nextState = replaceCurrentWork(
    state,
    nextWork,
    nextCounters,
    transitionScreenFlow(
      state.screenFlow.currentScreen === 'S10B'
        ? state.screenFlow
        : pushTarget(state.screenFlow, 'S10B'),
      { type: 'addAccompanimentTrack' },
    ),
  );

  return {
    ...nextState,
    previewingJangdanPreset: undefined,
    autoAccompanimentStatus: { status: 'idle' },
  };
}

function updateCurrentWorkTrack(
  state: GarakProductState,
  trackId: string,
  updateTrack: (track: Track) => Track,
): GarakProductState {
  const currentWork = findCurrentWork(state);
  if (currentWork === undefined) {
    return state;
  }

  let changed = false;
  const tracks = currentWork.tracks.map((track) => {
    if (track.id !== trackId) {
      return track;
    }

    const nextTrack = updateTrack(track);
    changed = nextTrack !== track;
    return nextTrack;
  });

  if (!changed) {
    return state;
  }

  return replaceCurrentWork(
    state,
    {
      ...currentWork,
      updatedAt: state.now(),
      tracks,
    },
    state.counters,
    state.screenFlow,
  );
}

function deleteCurrentWorkTrack(state: GarakProductState, trackId: string): GarakProductState {
  const currentWork = findCurrentWork(state);
  if (
    currentWork === undefined ||
    currentWork.tracks.length <= 1 ||
    !currentWork.tracks.some((track) => track.id === trackId)
  ) {
    return state;
  }

  return replaceCurrentWork(
    state,
    {
      ...currentWork,
      updatedAt: state.now(),
      tracks: currentWork.tracks.filter((track) => track.id !== trackId),
    },
    state.counters,
    state.screenFlow,
  );
}

function clampTrackVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return 0;
  }

  return Math.min(1, Math.max(0, Math.round(volume * 100) / 100));
}

type WorkExportArtifact = {
  audioUri: string;
  renderKind: ExportRenderKind;
  sourceTakeId?: string;
  sourceEventCount?: number;
  sourceRecordingUri?: string;
};

type WorkExportArtifactResult =
  | { status: 'ok'; artifact: WorkExportArtifact }
  | { status: 'failed'; message: string };

function createWorkExportArtifact(work: Work): WorkExportArtifactResult {
  const mixPlan = createWorkMixPlan(work);
  if (mixPlan.tracks.length === 0) {
    return {
      status: 'failed',
      message: 'No audible tracks are available to export.',
    };
  }

  const audibleTrackIds = new Set(mixPlan.tracks.map((track) => track.trackId));
  const eventTake = findFirstInstrumentTake(work, (take) => take.events.length > 0, audibleTrackIds);
  if (eventTake !== undefined) {
    return {
      status: 'ok',
      artifact: {
        audioUri: EXPORT_FALLBACK_AUDIO_URI,
        renderKind: 'event_replay',
        sourceTakeId: eventTake.id,
        sourceEventCount: countWorkMixPlanInstrumentEvents(work, mixPlan),
      },
    };
  }

  const capturedTake = findFirstInstrumentTake(
    work,
    (take) => {
      const recordingUri = normalizeOptionalText(take.recordingUri);
      return recordingUri !== undefined && isCaptureFileUri(recordingUri);
    },
    audibleTrackIds,
  );
  if (capturedTake !== undefined) {
    const recordingUri = normalizeOptionalText(capturedTake.recordingUri) as string;
    return {
      status: 'ok',
      artifact: {
        audioUri: recordingUri,
        renderKind: 'audio_capture',
        sourceTakeId: capturedTake.id,
        sourceRecordingUri: recordingUri,
      },
    };
  }

  const referenceTrack = findFirstReferenceTrack(work, audibleTrackIds);
  if (referenceTrack !== undefined) {
    const recording = findSharedRecordingById(referenceTrack.sourceShareId);
    if (recording === undefined) {
      return {
        status: 'failed',
        message: 'Reference audio source is unavailable.',
      };
    }

    return {
      status: 'ok',
      artifact: {
        audioUri: createSharedRecordingLibraryAudioUri(recording),
        renderKind: 'demo_sample',
      },
    };
  }

  return {
    status: 'ok',
    artifact: {
      audioUri: EXPORT_FALLBACK_AUDIO_URI,
      renderKind: 'demo_sample',
    },
  };
}

function findFirstInstrumentTake(
  work: Work,
  predicate: (take: Take) => boolean,
  trackIds?: ReadonlySet<string>,
): Take | undefined {
  for (const track of work.tracks) {
    if (trackIds !== undefined && !trackIds.has(track.id)) {
      continue;
    }

    if (track.kind !== 'instrument') {
      continue;
    }

    const take = track.takes.find(predicate);
    if (take !== undefined) {
      return take;
    }
  }

  return undefined;
}

function findInstrumentTakeById(
  work: Work,
  takeId: string,
): { track: Extract<Track, { kind: 'instrument' }>; take: Take } | undefined {
  for (const track of work.tracks) {
    if (track.kind !== 'instrument') {
      continue;
    }

    const take = track.takes.find((candidate) => candidate.id === takeId);
    if (take !== undefined) {
      return { track, take };
    }
  }

  return undefined;
}

function findFirstReferenceTrack(
  work: Work,
  trackIds?: ReadonlySet<string>,
): Extract<Track, { kind: 'reference' }> | undefined {
  for (const track of work.tracks) {
    if (trackIds !== undefined && !trackIds.has(track.id)) {
      continue;
    }

    if (track.kind === 'reference') {
      return track;
    }
  }

  return undefined;
}

function exportCurrentWork(state: GarakProductState): GarakProductState {
  if (hasPendingRecordingCaptureFinalization(state)) {
    return state;
  }

  const currentWork = findCurrentWork(state);
  if (currentWork === undefined) {
    return state;
  }

  const artifactResult = createWorkExportArtifact(currentWork);
  if (artifactResult.status === 'failed') {
    return {
      ...state,
      workExportStatus: {
        status: 'failed',
        workId: currentWork.id,
        message: artifactResult.message,
      },
    };
  }
  return {
    ...state,
    workExportStatus: {
      status: 'exporting',
      workId: currentWork.id,
    },
  };
}

function saveCurrentWork(state: GarakProductState): GarakProductState {
  const currentWork = findCurrentWork(state);
  if (currentWork === undefined) {
    return state;
  }

  const savedWork: Work = {
    ...currentWork,
    updatedAt: state.now(),
    syncState: 'local_only',
  };

  return {
    ...state,
    library: {
      ...state.library,
      works: state.library.works.map((work) => (work.id === savedWork.id ? savedWork : work)),
    },
    workSaveStatus: 'saving',
    workSaveErrorMessage: undefined,
  };
}

function saveAndShareCurrentWork(state: GarakProductState): GarakProductState {
  if (hasPendingRecordingCaptureFinalization(state)) {
    return state;
  }

  const currentWork = findCurrentWork(state);
  if (currentWork === undefined) {
    return state;
  }

  const savedWork: Work = {
    ...currentWork,
    updatedAt: state.now(),
    syncState: 'local_only',
  };
  const exportArtifact = createWorkExportArtifact(savedWork);

  return {
    ...state,
    library: {
      ...state.library,
      works: state.library.works.map((work) => (work.id === savedWork.id ? savedWork : work)),
    },
    workSaveStatus: 'saving',
    workSaveErrorMessage: undefined,
    workExportStatus:
      exportArtifact.status === 'failed'
        ? {
            status: 'failed',
            workId: savedWork.id,
            message: exportArtifact.message,
          }
        : {
            status: 'exporting',
            workId: savedWork.id,
          },
    sharePublishStatus: { status: 'idle' },
  };
}

function completeWorkAudioExport(
  state: GarakProductState,
  action: Extract<GarakProductAction, { type: 'completeWorkAudioExport' }>,
): GarakProductState {
  const work = state.library.works.find((item) => item.id === action.workId);
  if (work === undefined) {
    return state;
  }

  if (
    state.workExportStatus.status !== 'exporting' ||
    state.workExportStatus.workId !== action.workId
  ) {
    return state;
  }

  const failExport = (message: string): GarakProductState => ({
    ...state,
    workExportStatus: {
      status: 'failed',
      workId: work.id,
      message,
    },
  });
  const audioUri = normalizeOptionalText(action.audioUri);
  const sourceTakeId = normalizeOptionalText(action.sourceTakeId);
  const sourceRecordingUri = normalizeOptionalText(action.sourceRecordingUri);
  const actionSourceEventCount = action.sourceEventCount;
  const sourceEventCount =
    typeof actionSourceEventCount === 'number' &&
    Number.isInteger(actionSourceEventCount) &&
    actionSourceEventCount > 0
      ? actionSourceEventCount
      : undefined;

  if (audioUri === undefined) {
    return failExport('Audio export returned an empty audio URI.');
  }

  if (!Number.isFinite(action.durationSeconds) || action.durationSeconds <= 0) {
    return failExport('Audio export returned a non-positive duration.');
  }

  if (action.renderKind === 'audio_capture' && sourceTakeId === undefined) {
    return failExport('Audio capture export returned no source take ID.');
  }

  if (action.renderKind === 'audio_capture' && sourceRecordingUri === undefined) {
    return failExport('Audio capture export returned no source recording URI.');
  }

  if (action.renderKind === 'audio_capture' && !isCaptureFileUri(audioUri)) {
    return failExport('Audio capture export returned no capture audio URI.');
  }

  if (
    action.renderKind === 'audio_capture' &&
    sourceRecordingUri !== undefined &&
    !isCaptureFileUri(sourceRecordingUri)
  ) {
    return failExport('Audio capture export returned a non-file source recording URI.');
  }

  if (action.renderKind === 'event_replay' && sourceTakeId === undefined) {
    return failExport('Event replay export returned no source take ID.');
  }

  if (action.renderKind === 'event_replay' && sourceEventCount === undefined) {
    return failExport('Event replay export returned no source event count.');
  }

  if (action.renderKind === 'event_replay') {
    const sourceTake = findInstrumentTakeById(work, sourceTakeId as string);
    if (sourceTake === undefined) {
      return failExport('Event replay export source take is not available in the work.');
    }

    if (sourceTake.take.events.length === 0) {
      return failExport('Event replay export source take has no recorded events.');
    }

    if (countWorkMixPlanInstrumentEvents(work) !== sourceEventCount) {
      return failExport('Event replay export source events changed after export rendering.');
    }

    const audibleTrackIds = new Set(createWorkMixPlan(work).tracks.map((track) => track.trackId));
    if (!audibleTrackIds.has(sourceTake.track.id)) {
      return failExport('Event replay export source take is not audible in the exported work.');
    }
  }

  if (action.renderKind === 'audio_capture') {
    const sourceTake = findInstrumentTakeById(work, sourceTakeId as string);
    if (sourceTake === undefined) {
      return failExport('Audio capture export source take is not available in the work.');
    }

    const audibleTrackIds = new Set(createWorkMixPlan(work).tracks.map((track) => track.trackId));
    if (!audibleTrackIds.has(sourceTake.track.id)) {
      return failExport('Audio capture export source take is not audible in the exported work.');
    }

    const takeRecordingUri = normalizeOptionalText(sourceTake.take.recordingUri);
    if (takeRecordingUri === undefined) {
      return failExport('Audio capture export source take has no recording URI.');
    }

    if (takeRecordingUri !== sourceRecordingUri) {
      return failExport(
        'Audio capture export source recording URI does not match the source take.',
      );
    }
  }

  const nextCounters = incrementCounters(state.counters, ['export']);
  const exported = exportWorkAudioPlaceholder({
    id: `export-${nextCounters.export}`,
    work,
    title: `${work.title} 내보내기`,
    audioUri,
    durationSeconds: action.durationSeconds,
    createdAt: state.now(),
    renderKind: action.renderKind,
    sourceTakeId,
    sourceEventCount,
    sourceRecordingUri,
  });

  return {
    ...state,
    counters: nextCounters,
    library: {
      ...state.library,
      exportedAudios: [...state.library.exportedAudios, exported],
    },
    selectedPlayerItem: {
      kind: 'exportedAudio',
      exportedAudioId: exported.id,
    },
    sharePreviewStatus: undefined,
    workExportStatus: {
      status: 'ready',
      exportedAudioId: exported.id,
    },
    screenFlow:
      action.completionTarget === 'player'
        ? transitionScreenFlow(
            state.screenFlow.currentScreen === 'S07'
              ? state.screenFlow
              : pushTarget(state.screenFlow, 'S07'),
            { type: 'exportCurrentWork' },
          )
        : state.screenFlow.currentScreen === 'S17'
          ? state.screenFlow
          : transitionScreenFlow(
              state.screenFlow.currentScreen === 'S07'
                ? state.screenFlow
                : pushTarget(state.screenFlow, 'S07'),
              { type: 'saveAndShareCurrentWork' },
            ),
  };
}

function savePracticeResult(state: GarakProductState): GarakProductState {
  return createPracticeResultAndRoute(state, 'S18');
}

function createPracticeResultAndRoute(
  state: GarakProductState,
  target: ImplementedScreenId,
): GarakProductState {
  const nextCounters = incrementCounters(state.counters, ['practiceResult']);
  const evaluation = evaluatePracticeResult({
    practiceAttempt: state.practiceAttempt,
    selectedPracticeSongId: state.selectedPracticeSongId,
    selectedInstrument: state.selectedInstrument,
  });
  const feedback = buildPracticeResultFeedback(evaluation);
  const result = createPracticeResult({
    id: `practice-${nextCounters.practiceResult}`,
    songId: evaluation.songId,
    instrument: evaluation.instrument,
    accuracyScore: evaluation.accuracyScore,
    timingScore: evaluation.timingScore,
    feedback: feedback.fullText,
    createdAt: state.now(),
  });
  const nextScreenFlow =
    state.screenFlow.currentScreen === 'S16'
      ? transitionScreenFlow(state.screenFlow, {
          type: target === 'S17' ? 'sharePracticeResult' : 'savePracticeResult',
        })
      : pushTarget(state.screenFlow, target);

  return {
    ...state,
    counters: nextCounters,
    library: {
      ...state.library,
      practiceResults: [...state.library.practiceResults, result],
    },
    selectedPlayerItem: {
      kind: 'practiceResult',
      practiceResultId: result.id,
    },
    sharePreviewStatus: undefined,
    screenFlow: nextScreenFlow,
  };
}

function remixSharedRecording(state: GarakProductState): GarakProductState {
  const recording = findSelectedSharedRecording(state);

  if (recording === undefined) {
    return failSelectedSharedRecordingAction(state);
  }

  if (!recording.remixable) {
    return state;
  }

  const nextCounters = incrementCounters(state.counters, ['work', 'track']);
  const createdAt = state.now();
  const work: Work = {
    id: `work-${nextCounters.work}`,
    title: `${recording.title} 리믹스`,
    createdAt,
    updatedAt: createdAt,
    source: 'remix',
    syncState: 'local_only',
    tracks: [
      {
        id: `track-${nextCounters.track}`,
        kind: 'reference',
        sourceShareId: recording.id,
        title: recording.title,
        authorDisplayName: recording.authorDisplayName,
        sourceLabel: recording.sourceLabel,
        volume: 0.8,
        mute: false,
        solo: false,
        startedAtBeat: 1,
        createdAt,
      },
    ],
  };

  return {
    ...state,
    counters: nextCounters,
    currentWorkId: work.id,
    workSaveStatus: 'idle',
    workSaveErrorMessage: undefined,
    workPlayheadBeat: 1,
    library: {
      ...state.library,
      works: [...state.library.works, work],
    },
    screenFlow:
      state.screenFlow.currentScreen === 'S21'
        ? transitionScreenFlow(state.screenFlow, { type: 'remixSharedRecording' })
        : pushTarget(state.screenFlow, 'S07'),
  };
}

function saveSharedRecording(state: GarakProductState): GarakProductState {
  const recording = findSelectedSharedRecording(state);

  if (recording === undefined) {
    return failSelectedSharedRecordingAction(state);
  }

  const nextCounters = incrementCounters(state.counters, ['export']);
  const playableAudioUri = createSharedRecordingLibraryAudioUri(recording);
  const usesDemoSample = playableAudioUri !== recording.audioUri.trim();
  const exported: ExportedAudio = {
    id: `export-${nextCounters.export}`,
    kind: 'exported_audio',
    title: recording.title,
    durationSeconds: recording.durationSeconds,
    instrumentNames: [getInstrumentName(recording.instrument)],
    createdAt: state.now(),
    audioUri: playableAudioUri,
    renderKind: usesDemoSample ? 'demo_sample' : undefined,
    shareState: 'ready',
    sourceShareId: recording.id,
    authorDisplayName: recording.authorDisplayName,
    sourceLabel: recording.sourceLabel,
  };

  return {
    ...state,
    counters: nextCounters,
    library: {
      ...state.library,
      exportedAudios: [...state.library.exportedAudios, exported],
    },
    selectedPlayerItem: {
      kind: 'exportedAudio',
      exportedAudioId: exported.id,
    },
    screenFlow:
      state.screenFlow.currentScreen === 'S21'
        ? transitionScreenFlow(state.screenFlow, { type: 'saveSharedRecording' })
        : pushTarget(state.screenFlow, 'S18'),
  };
}

function findSelectedSharedRecording(state: GarakProductState): SharedRecording | undefined {
  if (state.selectedSharedRecordingId === undefined) {
    return FEATURED_SHARED_RECORDING;
  }

  return findSharedRecordingById(state.selectedSharedRecordingId);
}

function failSelectedSharedRecordingAction(state: GarakProductState): GarakProductState {
  return {
    ...state,
    playingSharedRecordingId: undefined,
    playerPlaybackStatus: {
      status: 'failed',
      message: 'Selected shared recording is unavailable.',
    },
  };
}

function publishShareTarget(state: GarakProductState): GarakProductState {
  const selection = resolveShareTargetSelection(state);
  const target = selectionToShareTargetReference(selection);

  if (target === undefined) {
    return state;
  }

  return {
    ...state,
    sharePreviewStatus: undefined,
    sharePublishStatus: {
      status: 'publishing',
      target,
    },
    selectedPlayerItem: selection,
    screenFlow: state.screenFlow.currentScreen === 'S17' ? state.screenFlow : pushTarget(state.screenFlow, 'S17'),
  };
}

function completeSharePublish(
  state: GarakProductState,
  action: Extract<GarakProductAction, { type: 'completeSharePublish' }>,
): GarakProductState {
  if (
    state.sharePublishStatus.status !== 'publishing' ||
    !shareTargetReferencesEqual(state.sharePublishStatus.target, action.target) ||
    !hasShareTargetReference(state, action.target)
  ) {
    return state;
  }

  const selection = shareTargetReferenceToSelection(action.target);
  const sharedAt = state.now();
  const sharedFields = {
    shareState: 'shared' as const,
    remoteShareId: action.remoteId,
    shareUrl: action.shareUrl,
    shareExpiresAtMs: action.expiresAtMs,
    shareMethod: action.shareMethod,
    sharedAt,
  };

  if (action.target.kind === 'exportedAudio') {
    return {
      ...state,
      sharePreviewStatus: undefined,
      sharePublishStatus: {
        status: 'shared',
        target: action.target,
        remoteId: action.remoteId,
      },
      library: {
        ...state.library,
        exportedAudios: state.library.exportedAudios.map((audio) =>
          audio.id === action.target.id ? { ...audio, ...sharedFields } : audio,
        ),
      },
      selectedPlayerItem: selection,
      screenFlow:
        state.screenFlow.currentScreen === 'S17'
          ? transitionScreenFlow(state.screenFlow, { type: 'publishShareTarget' })
          : pushTarget(state.screenFlow, 'S20'),
    };
  }

  return {
    ...state,
    sharePreviewStatus: undefined,
    sharePublishStatus: {
      status: 'shared',
      target: action.target,
      remoteId: action.remoteId,
    },
    library: {
      ...state.library,
      practiceResults: state.library.practiceResults.map((result) =>
        result.id === action.target.id ? { ...result, ...sharedFields } : result,
      ),
    },
    selectedPlayerItem: selection,
    screenFlow:
      state.screenFlow.currentScreen === 'S17'
        ? transitionScreenFlow(state.screenFlow, { type: 'publishShareTarget' })
        : pushTarget(state.screenFlow, 'S20'),
  };
}

function shareTargetReferencesEqual(
  left: ShareTargetReference,
  right: ShareTargetReference,
): boolean {
  return left.kind === right.kind && left.id === right.id;
}

function hasShareTargetReference(
  state: GarakProductState,
  target: ShareTargetReference,
): boolean {
  if (target.kind === 'exportedAudio') {
    return state.library.exportedAudios.some(
      (audio) => audio.id === target.id && hasShareableExportSource(state, audio),
    );
  }

  return state.library.practiceResults.some((result) => result.id === target.id);
}

function hasShareableExportSource(state: GarakProductState, audio: ExportedAudio): boolean {
  return isPlayableExportedAudioForPlayback(state.library.works, audio);
}

function shareSelectedPlayerItem(state: GarakProductState): GarakProductState {
  const target = resolveShareTargetSelection(state);

  if (target === undefined) {
    return state;
  }

  return {
    ...state,
    selectedPlayerItem: target,
    sharePreviewStatus: undefined,
    screenFlow: pushTarget(state.screenFlow, 'S17'),
  };
}

function openSelectedPlayerEditor(state: GarakProductState): GarakProductState {
  const workId = resolveSelectedPlayerEditWorkId(state);

  if (workId === undefined) {
    return state;
  }

  return {
    ...state,
    currentWorkId: workId,
    workSaveStatus: 'idle',
    workSaveErrorMessage: undefined,
    workPlayheadBeat: 1,
    screenFlow: pushTarget(state.screenFlow, 'S07'),
  };
}

function deleteSelectedPlayerItem(state: GarakProductState): GarakProductState {
  const selected = state.selectedPlayerItem;

  if (selected?.kind === 'exportedAudio') {
    return {
      ...state,
      selectedPlayerItem: undefined,
      playingPlayerItem: undefined,
      sharePreviewStatus: undefined,
      library: {
        ...state.library,
        exportedAudios: state.library.exportedAudios.filter(
          (audio) => audio.id !== selected.exportedAudioId,
        ),
      },
      screenFlow: pushTarget(state.screenFlow, 'S18'),
    };
  }

  if (selected?.kind === 'practiceResult') {
    return {
      ...state,
      selectedPlayerItem: undefined,
      playingPlayerItem: undefined,
      sharePreviewStatus: undefined,
      library: {
        ...state.library,
        practiceResults: state.library.practiceResults.filter(
          (result) => result.id !== selected.practiceResultId,
        ),
      },
      screenFlow: pushTarget(state.screenFlow, 'S18'),
    };
  }

  return state;
}

function resolveSelectedPlayerEditWorkId(state: GarakProductState): string | undefined {
  const selected = state.selectedPlayerItem;

  if (selected?.kind === 'work') {
    return state.library.works.some((work) => work.id === selected.workId)
      ? selected.workId
      : undefined;
  }

  if (selected?.kind === 'exportedAudio') {
    return state.library.exportedAudios.find((audio) => audio.id === selected.exportedAudioId)?.workId;
  }

  return undefined;
}

function resolveShareTargetSelection(
  state: GarakProductState,
): Extract<ProductPlayerSelection, { kind: 'exportedAudio' | 'practiceResult' }> | undefined {
  const selected = state.selectedPlayerItem;

  if (selected?.kind === 'exportedAudio') {
    return state.library.exportedAudios.some(
      (audio) =>
        audio.id === selected.exportedAudioId &&
        hasShareableExportSource(state, audio),
    )
      ? selected
      : undefined;
  }

  if (selected?.kind === 'practiceResult') {
    return state.library.practiceResults.some((result) => result.id === selected.practiceResultId)
      ? selected
      : undefined;
  }

  if (selected !== undefined) {
    return undefined;
  }

  const newestExport = state.library.exportedAudios
    .filter((audio) => hasShareableExportSource(state, audio))
    .map((audio) => ({
      createdAt: audio.createdAt,
      selection: {
        kind: 'exportedAudio',
        exportedAudioId: audio.id,
      } as const,
    }));
  const newestPracticeResult = state.library.practiceResults.map((result) => ({
    createdAt: result.createdAt,
    selection: {
      kind: 'practiceResult',
      practiceResultId: result.id,
    } as const,
  }));

  return [...newestExport, ...newestPracticeResult].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  )[0]?.selection;
}

function selectionToShareTargetReference(
  selection: Extract<ProductPlayerSelection, { kind: 'exportedAudio' | 'practiceResult' }> | undefined,
): ShareTargetReference | undefined {
  if (selection?.kind === 'exportedAudio') {
    return {
      kind: 'exportedAudio',
      id: selection.exportedAudioId,
    };
  }

  if (selection?.kind === 'practiceResult') {
    return {
      kind: 'practiceResult',
      id: selection.practiceResultId,
    };
  }

  return undefined;
}

function shareTargetReferenceToSelection(
  target: ShareTargetReference,
): Extract<ProductPlayerSelection, { kind: 'exportedAudio' | 'practiceResult' }> {
  return target.kind === 'exportedAudio'
    ? {
        kind: 'exportedAudio',
        exportedAudioId: target.id,
      }
    : {
        kind: 'practiceResult',
        practiceResultId: target.id,
      };
}

function replaceCurrentWork(
  state: GarakProductState,
  work: Work,
  counters: GarakProductState['counters'],
  target: ImplementedScreenId | ScreenFlowState,
): GarakProductState {
  return {
    ...state,
    counters,
    workSaveStatus: 'idle',
    workSaveErrorMessage: undefined,
    library: {
      ...state.library,
      works: state.library.works.map((item) => (item.id === work.id ? work : item)),
    },
    screenFlow: typeof target === 'string' ? pushTarget(state.screenFlow, target) : target,
  };
}

function findCurrentWork(state: GarakProductState): Work | undefined {
  return state.library.works.find((work) => work.id === state.currentWorkId);
}

export function hasPendingRecordingCaptureFinalization(
  state: Pick<GarakProductState, 'currentWorkId' | 'library' | 'recordingCaptureStatus'>,
): boolean {
  if (
    state.recordingCaptureStatus.status === 'starting' ||
    state.recordingCaptureStatus.status === 'capturing' ||
    state.recordingCaptureStatus.status === 'discarding'
  ) {
    return true;
  }

  if (state.recordingCaptureStatus.status !== 'stopping') {
    return false;
  }

  return !latestCurrentInstrumentTakeHasRecordingUri(state);
}

function latestCurrentInstrumentTakeHasRecordingUri(
  state: Pick<GarakProductState, 'currentWorkId' | 'library'>,
): boolean {
  const work = state.library.works.find((item) => item.id === state.currentWorkId);
  if (work === undefined) {
    return false;
  }

  for (let trackIndex = work.tracks.length - 1; trackIndex >= 0; trackIndex -= 1) {
    const track = work.tracks[trackIndex];
    if (track.kind !== 'instrument') {
      continue;
    }

    for (let takeIndex = track.takes.length - 1; takeIndex >= 0; takeIndex -= 1) {
      if (normalizeOptionalText(track.takes[takeIndex].recordingUri) !== undefined) {
        return true;
      }

      return false;
    }
  }

  return false;
}

function pushTarget(screenFlow: ScreenFlowState, target: ImplementedScreenId): ScreenFlowState {
  return transitionScreenFlow(screenFlow, {
    type: 'navigate',
    target,
  });
}

function incrementCounters(
  counters: GarakProductState['counters'],
  fields: Array<keyof GarakProductState['counters']>,
): GarakProductState['counters'] {
  const next = { ...counters };

  for (const field of fields) {
    next[field] += 1;
  }

  return next;
}

function getInstrumentLabel(state: GarakProductState): string {
  return getInstrumentName(state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT);
}

function selectedSongLabel(state: GarakProductState): string {
  return state.selectedPracticeSongId === undefined
    ? '민요'
    : getPracticeSongTitle(state.selectedPracticeSongId);
}

function practiceSongSelectDescription(state: GarakProductState): string {
  if (state.previewingPracticeSongId !== undefined) {
    return `${getPracticeSongTitle(state.previewingPracticeSongId)} 샘플을 미리듣고 있어요. 가이드 준비 상태를 확인한 뒤 선택해요.`;
  }

  return '아리랑, 도라지, 뱃노래 중 연습할 곡을 선택해요.';
}

function practiceAttemptDescription(state: GarakProductState): string {
  switch (state.practiceAttempt?.status) {
    case 'playing':
      return '가이드 하이라이트에 맞춰 연주를 기록하고 있어요.';
    case 'paused':
      return '연습이 일시정지되었어요. 다시 시작하면 처음부터 기록합니다.';
    case 'completed':
      return '완주 기록이 준비되었어요. 결과 화면에서 피드백을 확인해요.';
    case 'ready':
    default:
      return '가이드 하이라이트에 맞춰 연주를 시작해요.';
  }
}

function currentWorkTitle(state: GarakProductState): string {
  return findCurrentWork(state)?.title ?? '새 작업';
}

function accountLabel(state: GarakProductState): string {
  return state.account.status === 'guest' ? '게스트' : '로그인';
}

function resolveSyncedAccount(account: AccountState): Extract<AccountState, { status: 'loggedIn' }> {
  if (account.status === 'loggedIn') {
    return account;
  }

  return {
    status: 'loggedIn',
    userId: 'demo-user',
    email: 'demo@garak.local',
  };
}

function summary(
  id: ImplementedScreenId,
  title: string,
  eyebrow: string,
  description: string,
  primaryCtas: string[],
): ScreenSummary {
  return {
    id,
    title,
    eyebrow,
    description,
    primaryCtas,
  };
}

import type { PerformanceEvent } from '../domain/performanceEvent';
import type {
  ExportedAudio,
  ExportRenderKind,
  InstrumentId,
  PracticeResult,
  ShareTargetReference,
  Take,
  Track,
  Work,
} from '../studio/studioTypes';
import { countWorkMixPlanInstrumentEvents, createWorkMixPlan } from '../studio/studioLibrary';
import type {
  GarakProductAction,
  GarakProductState,
} from './garakProductState';
import type { GarakProductServices, SharePublishInput } from './garakProductServices';
import { createAutoAccompanimentRequest } from './aiAutoAccompaniment';
import { DEFAULT_FREE_CREATION_INSTRUMENT, findSharedRecordingById } from './productFixtures';
import {
  createDemoLibraryAudioUri,
  createPracticeResultLibraryAudioUri,
  createSharedRecordingLibraryAudioUri,
  isPlayableCapturedAudioExport,
  isPlayableExportedAudioForPlayback,
  isPlayableExportedAudioUri,
} from './libraryPlaybackAudio';

export type RunGarakProductEffectInput = {
  state: GarakProductState;
  action: GarakProductAction;
  services: GarakProductServices;
};

const LIBRARY_PERSISTENCE_ACTION_TYPES = new Set<GarakProductAction['type']>([
  'completePerformance',
  'applyInstrumentTrack',
  'addAccompanimentTrack',
  'exportCurrentWork',
  'completeWorkAudioExport',
  'attachRecordingCaptureToTake',
  'savePracticeResult',
  'sharePracticeResult',
  'saveShareTargetOnly',
  'completeSharePublish',
  'remixSharedRecording',
  'saveSharedRecording',
  'deleteSelectedPlayerItem',
]);

export async function runGarakProductEffect({
  state,
  action,
  services,
}: RunGarakProductEffectInput): Promise<GarakProductAction[]> {
  const followUpActions: GarakProductAction[] = [];

  if (action.type === 'completeLoginSync') {
    const accountAction = await loadAccountLibrarySnapshot(services);
    if (accountAction !== undefined) {
      followUpActions.push(accountAction);
    }
  }

  if (shouldPrepareLivePerformanceAudio(state, action)) {
    followUpActions.push(await prepareLivePerformanceAudio(
      state.livePerformanceAudioStatus.instrument,
      state.livePerformanceAudioStatus.preparationAttemptId,
      services,
    ));
  }

  const recordingCaptureStartAction = await startRecordingCapture(state, action, services);
  if (recordingCaptureStartAction !== undefined) {
    followUpActions.push(recordingCaptureStartAction);
  }

  const recordingCaptureStopAction = await stopRecordingCapture(state, action, services);
  if (recordingCaptureStopAction !== undefined) {
    followUpActions.push(recordingCaptureStopAction);
  }

  const recordingCaptureDiscardAction = await discardRecordingCapture(state, action, services);
  if (recordingCaptureDiscardAction !== undefined) {
    followUpActions.push(recordingCaptureDiscardAction);
  }

  const warmupInstrument = getLivePerformanceWarmupInstrument(state, action);
  if (warmupInstrument !== undefined) {
    await warmUpLivePerformanceAudio(warmupInstrument, services);
  }

  if (action.type === 'chooseAccompanimentTrack') {
    const autoAccompanimentAction = await generateAutoAccompaniment(state, services);
    if (autoAccompanimentAction !== undefined) {
      followUpActions.push(autoAccompanimentAction);
      if (autoAccompanimentAction.type === 'completeAutoAccompanimentGeneration') {
        return followUpActions;
      }
    }

    const recommendationAction = await recommendAccompaniment(state, services);
    if (recommendationAction !== undefined) {
      followUpActions.push(recommendationAction);
    }
  }

  if (action.type === 'saveCurrentWork') {
    const saveErrorMessage = await saveLibrarySnapshot(state, services);
    followUpActions.push(
      saveErrorMessage === undefined
        ? { type: 'completeCurrentWorkSave' }
        : { type: 'failCurrentWorkSave', message: saveErrorMessage },
    );
    return followUpActions;
  }

  if (action.type === 'saveAndShareCurrentWork') {
    const saveErrorMessage = await saveLibrarySnapshot(state, services);
    if (saveErrorMessage !== undefined) {
      followUpActions.push({ type: 'failCurrentWorkSave', message: saveErrorMessage });
      if (state.workExportStatus.status === 'exporting') {
        followUpActions.push({
          type: 'failWorkAudioExport',
          workId: state.workExportStatus.workId,
          message: saveErrorMessage,
        });
      }
      return followUpActions;
    }

    followUpActions.push({ type: 'completeCurrentWorkSave' });
    const exportAction = await exportCurrentWorkAudio(state, services, 'share');
    if (exportAction !== undefined) {
      followUpActions.push(exportAction);
    }
    return followUpActions;
  }

  if (action.type === 'exportCurrentWork') {
    await saveLibrarySnapshot(state, services);
    const exportAction = await exportCurrentWorkAudio(state, services, 'player');
    if (exportAction !== undefined) {
      followUpActions.push(exportAction);
    }
    return followUpActions;
  }

  if (action.type === 'playCurrentWorkMix') {
    const playbackAction = await playCurrentWorkMix(state, services);
    if (playbackAction !== undefined) {
      followUpActions.push(playbackAction);
    }
    return followUpActions;
  }

  if (action.type === 'playSelectedPlayerItem' || action.type === 'playLibraryItemNow') {
    const playbackAction = await playSelectedPlayerAudio(state, services);
    if (playbackAction !== undefined) {
      followUpActions.push(playbackAction);
    }
    return followUpActions;
  }

  if (action.type === 'pauseSelectedPlayerItem') {
    const pauseAction = await pauseSelectedPlayerAudio(services);
    if (pauseAction !== undefined) {
      followUpActions.push(pauseAction);
    }
    return followUpActions;
  }

  if (action.type === 'playSelectedSharedRecording') {
    const playbackAction = await playSelectedSharedRecordingAudio(state, services);
    if (playbackAction !== undefined) {
      followUpActions.push(playbackAction);
    }
    return followUpActions;
  }

  if (action.type === 'pauseSelectedSharedRecording') {
    const pauseAction = await pauseSelectedPlayerAudio(services);
    if (pauseAction !== undefined) {
      followUpActions.push(pauseAction);
    }
    return followUpActions;
  }

  if (action.type === 'previewShareTarget') {
    const playbackAction = await previewSelectedShareTargetAudio(state, services);
    if (playbackAction !== undefined) {
      followUpActions.push(playbackAction);
    }
    return followUpActions;
  }

  if (action.type === 'publishShareTarget') {
    const publishAction = await publishSelectedShareTarget(state, services);
    if (publishAction !== undefined) {
      followUpActions.push(publishAction);
    }
    return followUpActions;
  }

  if (LIBRARY_PERSISTENCE_ACTION_TYPES.has(action.type)) {
    await saveLibrarySnapshot(state, services);
  }

  return followUpActions;
}

async function startRecordingCapture(
  state: GarakProductState,
  action: GarakProductAction,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  if (
    !['startPerformanceRecording', 'restartInstrumentTrackRecording'].includes(action.type) ||
    state.pendingFreePlayTake === undefined ||
    state.recordingCaptureStatus.status !== 'starting'
  ) {
    return undefined;
  }

  const instrument = state.recordingCaptureStatus.instrument;
  const captureAttemptId = state.recordingCaptureStatus.captureAttemptId;

  try {
    if (action.type === 'restartInstrumentTrackRecording') {
      const discardResult = await services.audio.discardRecordingCapture();
      if (discardResult.status === 'error') {
        return {
          type: 'failRecordingCaptureStart',
          instrument,
          captureAttemptId,
          message: discardResult.message,
        };
      }
    }

    const result = await services.audio.startRecordingCapture({
      instrument,
      recordingSetup: state.pendingFreePlayTake.recordingSetup,
    });

    if (result.status === 'ok') {
      return {
        type: 'completeRecordingCaptureStart',
        instrument,
        captureAttemptId,
      };
    }

    return {
      type: 'failRecordingCaptureStart',
      instrument,
      captureAttemptId,
      message:
        result.status === 'error'
          ? result.message
          : 'Recording capture service is unavailable.',
    };
  } catch (error) {
    return {
      type: 'failRecordingCaptureStart',
      instrument,
      captureAttemptId,
      message: error instanceof Error ? error.message : 'Recording capture failed to start.',
    };
  }
}

async function stopRecordingCapture(
  state: GarakProductState,
  action: GarakProductAction,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  if (
    !['completePerformance', 'applyInstrumentTrack'].includes(action.type) ||
    state.recordingCaptureStatus.status !== 'stopping'
  ) {
    return undefined;
  }

  const instrument = state.recordingCaptureStatus.instrument;
  const captureAttemptId = state.recordingCaptureStatus.captureAttemptId;
  const savedTake = findCurrentWorkLatestInstrumentTake(state);
  if (savedTake === undefined) {
    return {
      type: 'failRecordingCaptureStop',
      instrument,
      captureAttemptId,
      message: 'Saved take is not available for recording capture.',
    };
  }

  try {
    const result = await services.audio.stopRecordingCapture();

    if (result.status === 'ok') {
      const recordingUri = normalizeOptionalText(result.value.recordingUri);
      if (recordingUri === undefined) {
        return {
          type: 'failRecordingCaptureStop',
          instrument,
          captureAttemptId,
          message: 'Recording capture completed without a playable URI.',
        };
      }

      if (!isPositiveDurationSeconds(result.value.durationSeconds)) {
        return {
          type: 'failRecordingCaptureStop',
          instrument,
          captureAttemptId,
          message: 'Recording capture completed without a positive duration.',
        };
      }

      return {
        type: 'attachRecordingCaptureToTake',
        workId: savedTake.workId,
        trackId: savedTake.trackId,
        takeId: savedTake.takeId,
        recordingUri,
        durationSeconds: result.value.durationSeconds,
        captureAttemptId,
      };
    }

    return {
      type: 'failRecordingCaptureStop',
      instrument,
      captureAttemptId,
      message:
        result.status === 'error'
          ? result.message
          : 'Recording capture service is unavailable.',
    };
  } catch (error) {
    return {
      type: 'failRecordingCaptureStop',
      instrument,
      captureAttemptId,
      message: error instanceof Error ? error.message : 'Recording capture failed to stop.',
    };
  }
}

async function discardRecordingCapture(
  state: GarakProductState,
  action: GarakProductAction,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  if (action.type !== 'cancelInstrumentTrack') {
    return undefined;
  }

  if (state.recordingCaptureStatus.status !== 'discarding') {
    return undefined;
  }

  const captureAttemptId = state.recordingCaptureStatus.captureAttemptId;

  try {
    const result = await services.audio.discardRecordingCapture();
    if (result.status === 'error') {
      return {
        type: 'failRecordingCaptureStop',
        instrument: state.selectedInstrument,
        captureAttemptId,
        message: result.message,
      };
    }
  } catch (error) {
    return {
      type: 'failRecordingCaptureStop',
      instrument: state.selectedInstrument,
      captureAttemptId,
      message: error instanceof Error ? error.message : 'Recording capture failed to discard.',
    };
  }

  return { type: 'completeRecordingCaptureDiscard', captureAttemptId };
}

async function playSelectedPlayerAudio(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  const selection = state.playingPlayerItem ?? state.selectedPlayerItem;

  if (selection === undefined) {
    return undefined;
  }

  try {
    if (selection.kind === 'work') {
      const work = state.library.works.find((item) => item.id === selection.workId);
      if (work !== undefined) {
        const mixPlan = createWorkMixPlan(work);
        if (mixPlan.tracks.length === 0) {
          return {
            type: 'failPlayerPlayback',
            message: 'No audible tracks are available to play.',
          };
        }

        return toPlayerPlaybackFailureAction(
          await services.audio.playWorkMix(work, mixPlan),
        );
      }
      return {
        type: 'failPlayerPlayback',
        message: 'Selected work is unavailable.',
      };
    }

    if (selection.kind === 'exportedAudio') {
      const audio = state.library.exportedAudios.find(
        (item) => item.id === selection.exportedAudioId,
      );
      if (audio !== undefined) {
        if (audio.renderKind === 'event_replay') {
          if (!isPlayableExportedAudioUri(audio.audioUri)) {
            return {
              type: 'failPlayerPlayback',
              message: 'Selected audio is not a playable export artifact.',
            };
          }

          if (audio.workId === undefined) {
            return {
              type: 'failPlayerPlayback',
              message: 'Event replay source work is unavailable.',
            };
          }

          const sourceWork = state.library.works.find((work) => work.id === audio.workId);
          if (sourceWork !== undefined) {
            const sourceTakeId = normalizeOptionalText(audio.sourceTakeId);
            const sourceTake =
              sourceTakeId === undefined
                ? undefined
                : findInstrumentTakeById(sourceWork, sourceTakeId);
            if (sourceTake === undefined) {
              return {
                type: 'failPlayerPlayback',
                message: 'Event replay source take is unavailable.',
              };
            }

            if (sourceTake.take.events.length === 0) {
              return {
                type: 'failPlayerPlayback',
                message: 'Event replay source take has no recorded events.',
              };
            }

            const sourceEventCount = audio.sourceEventCount;
            if (
              typeof sourceEventCount !== 'number' ||
              !Number.isInteger(sourceEventCount) ||
              sourceEventCount <= 0
            ) {
              return {
                type: 'failPlayerPlayback',
                message: 'Event replay source event count is unavailable.',
              };
            }

            const mixPlan = createWorkMixPlan(sourceWork);
            if (mixPlan.tracks.length === 0) {
              return {
                type: 'failPlayerPlayback',
                message: 'No audible tracks are available to play.',
              };
            }

            const audibleTrackIds = new Set(mixPlan.tracks.map((track) => track.trackId));
            if (!audibleTrackIds.has(sourceTake.track.id)) {
              return {
                type: 'failPlayerPlayback',
                message: 'Event replay source take is not audible.',
              };
            }

            if (countWorkMixPlanInstrumentEvents(sourceWork, mixPlan) !== sourceEventCount) {
              return {
                type: 'failPlayerPlayback',
                message: 'Event replay source events changed after export.',
              };
            }

            return toPlayerPlaybackFailureAction(
              await services.audio.playWorkMix(sourceWork, mixPlan),
            );
          }

          return {
            type: 'failPlayerPlayback',
            message: 'Event replay source work is unavailable.',
          };
        }

        if (!isPlayableExportedAudioUri(audio.audioUri)) {
          return {
            type: 'failPlayerPlayback',
            message: 'Selected audio is not a playable export artifact.',
          };
        }

        if (
          audio.renderKind === 'audio_capture' &&
          !isPlayableCapturedAudioExport(state.library.works, audio)
        ) {
          return {
            type: 'failPlayerPlayback',
            message: 'Audio capture export is missing file-backed capture provenance.',
          };
        }

        return toPlayerPlaybackFailureAction(
          await services.audio.playLibraryAudio({
            audioUri: audio.audioUri,
            title: audio.title,
            sourceKind: 'exportedAudio',
          }),
        );
      }
      return {
        type: 'failPlayerPlayback',
        message: 'Selected audio is unavailable.',
      };
    }

    if (selection.kind === 'demo') {
      return toPlayerPlaybackFailureAction(
        await services.audio.playLibraryAudio({
          audioUri: createDemoLibraryAudioUri(selection.title),
          title: selection.title,
          sourceKind: 'demo',
        }),
      );
    }

    if (selection.kind === 'practiceResult') {
      const result = state.library.practiceResults.find(
        (item) => item.id === selection.practiceResultId,
      );
      if (result !== undefined) {
        return toPlayerPlaybackFailureAction(
          await services.audio.playLibraryAudio({
            audioUri: createPracticeResultLibraryAudioUri(result),
            title: formatPracticeResultPlaybackTitle(result),
            sourceKind: 'practiceResult',
          }),
        );
      }
      return {
        type: 'failPlayerPlayback',
        message: 'Selected practice result is unavailable.',
      };
    }
  } catch (error) {
    return {
      type: 'failPlayerPlayback',
      message: error instanceof Error ? error.message : 'Audio playback failed.',
    };
  }

  return undefined;
}

async function playSelectedSharedRecordingAudio(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  if (state.playingSharedRecordingId === undefined) {
    return undefined;
  }

  const recording = findSharedRecordingById(state.selectedSharedRecordingId);
  if (recording === undefined || recording.id !== state.playingSharedRecordingId) {
    return {
      type: 'failPlayerPlayback',
      message: 'Selected shared recording is unavailable.',
    };
  }

  try {
    return toPlayerPlaybackFailureAction(
      await services.audio.playLibraryAudio({
        audioUri: createSharedRecordingLibraryAudioUri(recording),
        title: recording.title,
        sourceKind: 'sharedRecording',
      }),
    );
  } catch (error) {
    return {
      type: 'failPlayerPlayback',
      message: error instanceof Error ? error.message : 'Audio playback failed.',
    };
  }
}

async function previewSelectedShareTargetAudio(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  const selection = resolveSharePreviewSelection(state);

  if (selection === undefined) {
    return {
      type: 'failPlayerPlayback',
      message: 'Selected share target is unavailable.',
    };
  }

  return playSelectedPlayerAudio(
    {
      ...state,
      selectedPlayerItem: selection,
      playingPlayerItem: selection,
    },
    services,
  );
}

function resolveSharePreviewSelection(
  state: GarakProductState,
): Extract<GarakProductState['selectedPlayerItem'], { kind: 'exportedAudio' | 'practiceResult' }> | undefined {
  const selected = state.selectedPlayerItem;

  if (
    selected?.kind === 'exportedAudio' &&
    state.library.exportedAudios.some(
      (audio) =>
        audio.id === selected.exportedAudioId &&
        isPlayableExportedAudioForPlayback(state.library.works, audio),
    )
  ) {
    return selected;
  }

  if (
    selected?.kind === 'practiceResult' &&
    state.library.practiceResults.some((result) => result.id === selected.practiceResultId)
  ) {
    return selected;
  }

  if (selected !== undefined) {
    return undefined;
  }

  const newestExport = state.library.exportedAudios
    .filter((audio) => isPlayableExportedAudioForPlayback(state.library.works, audio))
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

function formatPracticeResultPlaybackTitle(result: PracticeResult): string {
  return `${formatPracticeSongPlaybackTitle(result.songId)} practice - ${result.instrument}`;
}

function formatPracticeSongPlaybackTitle(songId: string): string {
  return songId.toLowerCase().includes('arirang') ? 'Arirang' : songId;
}

async function pauseSelectedPlayerAudio(services: GarakProductServices): Promise<GarakProductAction | undefined> {
  try {
    const result = await services.audio.pauseLibraryAudio();

    if (result.status === 'ok') {
      return undefined;
    }

    return {
      type: 'failPlayerPlayback',
      message:
        result.status === 'error'
          ? result.message
          : 'Audio pause service is unavailable.',
    };
  } catch (error) {
    return {
      type: 'failPlayerPlayback',
      message: error instanceof Error ? error.message : 'Audio pause failed.',
    };
  }
}

async function playCurrentWorkMix(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  const currentWork = findCurrentWork(state);

  if (currentWork === undefined) {
    return {
      type: 'failPlayerPlayback',
      message: 'Current work is unavailable.',
    };
  }

  try {
    const mixPlan = createWorkMixPlan(currentWork);
    if (mixPlan.tracks.length === 0) {
      return {
        type: 'failPlayerPlayback',
        message: 'No audible tracks are available to preview.',
      };
    }

    return toPlayerPlaybackFailureAction(
      await services.audio.playWorkMix(currentWork, mixPlan),
    );
  } catch (error) {
    return {
      type: 'failPlayerPlayback',
      message: error instanceof Error ? error.message : 'Audio playback failed.',
    };
  }
}

function toPlayerPlaybackFailureAction(
  result: Awaited<ReturnType<GarakProductServices['audio']['playLibraryAudio']>> | Awaited<ReturnType<GarakProductServices['audio']['playWorkMix']>>,
): GarakProductAction | undefined {
  if (result.status === 'ok') {
    return undefined;
  }

  return {
    type: 'failPlayerPlayback',
    message:
      result.status === 'error'
        ? result.message
        : 'Audio playback service is unavailable.',
  };
}

function shouldPrepareLivePerformanceAudio(
  state: GarakProductState,
  action: GarakProductAction,
): state is GarakProductState & {
  livePerformanceAudioStatus: {
    status: 'preparing';
    instrument: InstrumentId;
    preparationAttemptId: string;
  };
} {
  return (state.screenFlow.currentScreen === 'S05' || state.screenFlow.currentScreen === 'S09') &&
    state.livePerformanceAudioStatus.status === 'preparing' &&
    (
      action.type === 'next' ||
      action.type === 'startWithDefaults' ||
      action.type === 'startWithAdjustedSettings' ||
      action.type === 'retryLivePerformanceAudioPreparation' ||
      action.type === 'chooseInstrumentTrack' ||
      action.type === 'selectInstrument' ||
      action.type === 'applyLiveJangdanGuide' ||
      action.type === 'back'
    );
}

function getLivePerformanceWarmupInstrument(
  state: GarakProductState,
  action: GarakProductAction,
): InstrumentId | undefined {
  if (
    action.type === 'selectInstrument' &&
    state.screenFlow.currentScreen === 'S04' &&
    canWarmUpLivePerformanceInstrument(state, action.instrument)
  ) {
    return action.instrument;
  }

  if (action.type === 'next' && state.screenFlow.currentScreen === 'S04A') {
    const instrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
    return canWarmUpLivePerformanceInstrument(state, instrument) ? instrument : undefined;
  }

  return undefined;
}

function canWarmUpLivePerformanceInstrument(
  state: GarakProductState,
  instrument: InstrumentId,
): boolean {
  return state.instrumentSampleStatuses[instrument] !== 'downloadRequired';
}

async function warmUpLivePerformanceAudio(
  instrument: InstrumentId,
  services: GarakProductServices,
): Promise<void> {
  try {
    await services.audio.prepareLivePerformanceAudio({ instrument });
  } catch {
    return;
  }
}

async function prepareLivePerformanceAudio(
  instrument: InstrumentId,
  preparationAttemptId: string,
  services: GarakProductServices,
): Promise<GarakProductAction> {
  try {
    const result = await services.audio.prepareLivePerformanceAudio({ instrument });

    if (result.status === 'ok') {
      return {
        type: 'completeLivePerformanceAudioPreparation',
        instrument,
        preparationAttemptId,
        sampleSourceLabel: result.value.sampleSourceLabel,
        releaseReady: result.value.releaseReady,
      };
    }

    return {
      type: 'failLivePerformanceAudioPreparation',
      instrument,
      preparationAttemptId,
      message:
        result.status === 'error'
          ? result.message
          : 'Live performance audio service is unavailable.',
    };
  } catch (error) {
    return {
      type: 'failLivePerformanceAudioPreparation',
      instrument,
      preparationAttemptId,
      message: error instanceof Error ? error.message : 'Live performance audio failed.',
    };
  }
}

async function generateAutoAccompaniment(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  const currentWork = findCurrentWork(state);
  const request = createAutoAccompanimentRequest({
    requestId: `auto-accompaniment-${Date.parse(state.now()).toString(36)}`,
    work: currentWork,
  });

  if (request === undefined) {
    return {
      type: 'failAutoAccompanimentGeneration',
      code: 'insufficient_events',
      message: 'AI auto accompaniment needs a recorded instrument take.',
    };
  }

  try {
    const result = await services.ai.generateAutoAccompaniment(request);

    if (result.status === 'ok') {
      return {
        type: 'completeAutoAccompanimentGeneration',
        candidate: result.value,
      };
    }

    return {
      type: 'failAutoAccompanimentGeneration',
      code: 'model_unavailable',
      message:
        result.status === 'error'
          ? result.message
          : 'AI auto accompaniment service is unavailable.',
    };
  } catch {
    return {
      type: 'failAutoAccompanimentGeneration',
      code: 'model_unavailable',
      message: 'AI auto accompaniment service is unavailable.',
    };
  }
}

async function loadAccountLibrarySnapshot(
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  try {
    const result = await services.account.loginAndLoadLibrary();

    return result.status === 'ok'
      ? {
          type: 'replaceLibrarySnapshot',
          library: result.value,
        }
      : undefined;
  } catch {
    return undefined;
  }
}

async function recommendAccompaniment(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  try {
    const currentWork = findCurrentWork(state);
    const result = await services.ai.recommendAccompaniment({
      events: collectCurrentWorkEvents(currentWork),
      work: currentWork,
    });

    return result.status === 'ok'
      ? {
          type: 'previewJangdanPreset',
          mode: 'track',
          presetId: result.value.presetId,
          bpm: result.value.bpm,
          volume: result.value.volume,
        }
      : undefined;
  } catch {
    return undefined;
  }
}

async function saveLibrarySnapshot(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<string | undefined> {
  try {
    await services.library.saveSnapshot(state.library);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function exportCurrentWorkAudio(
  state: GarakProductState,
  services: GarakProductServices,
  completionTarget: 'player' | 'share',
): Promise<GarakProductAction | undefined> {
  const exportStatus = state.workExportStatus;
  if (exportStatus.status !== 'exporting') {
    return undefined;
  }

  const work = state.library.works.find((item) => item.id === exportStatus.workId);
  if (work === undefined) {
    return {
      type: 'failWorkAudioExport',
      workId: exportStatus.workId,
      message: 'Current work is not available for export.',
    };
  }

  try {
    const result = await services.audio.exportWorkAudio(work);

    if (result.status === 'ok') {
      const audioUri = normalizeOptionalText(result.value.audioUri);
      const durationSeconds = result.value.durationSeconds;
      const renderKind = result.value.renderKind;
      const sourceTakeId = normalizeOptionalText(result.value.sourceTakeId);
      const resultSourceEventCount = result.value.sourceEventCount;
      const sourceEventCount =
        typeof resultSourceEventCount === 'number' &&
        Number.isInteger(resultSourceEventCount) &&
        resultSourceEventCount > 0
          ? resultSourceEventCount
          : undefined;
      const sourceRecordingUri = normalizeOptionalText(result.value.sourceRecordingUri);
      if (audioUri === undefined) {
        return {
          type: 'failWorkAudioExport',
          workId: work.id,
          message: 'Audio export returned an empty audio URI.',
        };
      }

      if (!isPositiveDurationSeconds(durationSeconds)) {
        return {
          type: 'failWorkAudioExport',
          workId: work.id,
          message: 'Audio export returned a non-positive duration.',
        };
      }

      if (!isExportRenderKind(renderKind)) {
        return {
          type: 'failWorkAudioExport',
          workId: work.id,
          message: 'Audio export returned no render provenance.',
        };
      }

      if (renderKind === 'audio_capture' && sourceTakeId === undefined) {
        return {
          type: 'failWorkAudioExport',
          workId: work.id,
          message: 'Audio capture export returned no source take ID.',
        };
      }

      if (renderKind === 'audio_capture' && sourceRecordingUri === undefined) {
        return {
          type: 'failWorkAudioExport',
          workId: work.id,
          message: 'Audio capture export returned no source recording URI.',
        };
      }

      if (renderKind === 'audio_capture' && !isCaptureFileUri(audioUri)) {
        return {
          type: 'failWorkAudioExport',
          workId: work.id,
          message: 'Audio capture export returned no capture audio URI.',
        };
      }

      if (
        renderKind === 'audio_capture' &&
        sourceRecordingUri !== undefined &&
        !isCaptureFileUri(sourceRecordingUri)
      ) {
        return {
          type: 'failWorkAudioExport',
          workId: work.id,
          message: 'Audio capture export returned a non-file source recording URI.',
        };
      }

      const eventReplayProvenanceError =
        renderKind === 'event_replay'
          ? getEventReplayExportProvenanceError(work, sourceTakeId, sourceEventCount)
          : undefined;
      if (eventReplayProvenanceError !== undefined) {
        return {
          type: 'failWorkAudioExport',
          workId: work.id,
          message: eventReplayProvenanceError,
        };
      }

      const captureProvenanceError =
        renderKind === 'audio_capture'
          ? getAudioCaptureExportProvenanceError(work, sourceTakeId, sourceRecordingUri)
          : undefined;
      if (captureProvenanceError !== undefined) {
        return {
          type: 'failWorkAudioExport',
          workId: work.id,
          message: captureProvenanceError,
        };
      }

      return {
        type: 'completeWorkAudioExport',
        workId: work.id,
        audioUri,
        durationSeconds,
        renderKind,
        sourceTakeId,
        sourceEventCount,
        sourceRecordingUri,
        completionTarget,
      };
    }

    return {
      type: 'failWorkAudioExport',
      workId: work.id,
      message:
        result.status === 'error'
          ? result.message
          : 'Audio export service is unavailable.',
    };
  } catch {
    return {
      type: 'failWorkAudioExport',
      workId: work.id,
      message: 'Audio export failed.',
    };
  }
}

async function publishSelectedShareTarget(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  if (state.sharePublishStatus.status !== 'publishing') {
    return undefined;
  }

  const input = createSharePublishInput(state, state.sharePublishStatus.target);
  if (input === undefined) {
    return {
      type: 'failSharePublish',
      target: state.sharePublishStatus.target,
      message: 'Share target is not available.',
    };
  }

  try {
    const result = await services.share.publishShareTarget(input);

    if (result.status === 'ok') {
      return {
        type: 'completeSharePublish',
        target: state.sharePublishStatus.target,
        remoteId: result.value.remoteId,
        shareUrl: result.value.shareUrl,
        expiresAtMs: result.value.expiresAtMs,
        shareMethod: result.value.shareMethod,
      };
    }

    return {
      type: 'failSharePublish',
      target: state.sharePublishStatus.target,
      message:
        result.status === 'error'
          ? result.message
          : 'Share service is unavailable.',
    };
  } catch {
    return {
      type: 'failSharePublish',
      target: state.sharePublishStatus.target,
      message: 'Share publishing failed.',
    };
  }
}

function createSharePublishInput(
  state: GarakProductState,
  target: ShareTargetReference,
): SharePublishInput | undefined {
  if (target.kind === 'exportedAudio') {
    const audio = state.library.exportedAudios.find(
      (item) =>
        item.id === target.id &&
        isPlayableExportedAudioUri(item.audioUri) &&
        hasShareableExportSource(state, item),
    );
    return audio === undefined ? undefined : createExportedAudioShareInput(state, audio, target);
  }

  const result = state.library.practiceResults.find((item) => item.id === target.id);
  return result === undefined ? undefined : createPracticeResultShareInput(result, target);
}

function createExportedAudioShareInput(
  state: GarakProductState,
  audio: ExportedAudio,
  target: ShareTargetReference,
): SharePublishInput {
  const fileUri = shouldShareExportedAudioFile(state.library.works, audio)
    ? audio.audioUri
    : undefined;

  return {
    target,
    title: audio.title,
    message: `${audio.title} - GARAK`,
    ...(fileUri === undefined ? {} : { fileUri }),
    shareUrl: audio.shareUrl,
  };
}

function hasShareableExportSource(state: GarakProductState, audio: ExportedAudio): boolean {
  if (audio.renderKind === 'audio_capture') {
    return isPlayableCapturedAudioExport(state.library.works, audio);
  }

  if (audio.renderKind !== 'event_replay') {
    return true;
  }

  const workId = normalizeOptionalText(audio.workId);
  const sourceTakeId = normalizeOptionalText(audio.sourceTakeId);
  if (workId === undefined || sourceTakeId === undefined) {
    return false;
  }

  const sourceWork = state.library.works.find((work) => work.id === workId);
  if (sourceWork === undefined) {
    return false;
  }

  const sourceTake = findInstrumentTakeById(sourceWork, sourceTakeId);
  if (sourceTake === undefined) {
    return false;
  }

  if (sourceTake.take.events.length === 0) {
    return false;
  }

  const sourceEventCount = audio.sourceEventCount;
  if (
    typeof sourceEventCount !== 'number' ||
    !Number.isInteger(sourceEventCount) ||
    sourceEventCount <= 0
  ) {
    return false;
  }

  const mixPlan = createWorkMixPlan(sourceWork);
  if (countWorkMixPlanInstrumentEvents(sourceWork, mixPlan) !== sourceEventCount) {
    return false;
  }

  const audibleTrackIds = new Set(mixPlan.tracks.map((track) => track.trackId));
  return audibleTrackIds.has(sourceTake.track.id);
}

function shouldShareExportedAudioFile(
  works: readonly Work[],
  audio: ExportedAudio,
): boolean {
  if (!isPlayableExportedAudioUri(audio.audioUri)) {
    return false;
  }

  if (audio.renderKind === 'audio_capture') {
    return isPlayableCapturedAudioExport(works, audio);
  }

  if (audio.renderKind === 'event_replay' || audio.renderKind === 'demo_sample') {
    return false;
  }

  return audio.audioUri.trim().startsWith('file://');
}

function createPracticeResultShareInput(
  result: PracticeResult,
  target: ShareTargetReference,
): SharePublishInput {
  return {
    target,
    title: `Practice result ${result.id}`,
    message: `GARAK practice result: ${result.accuracyScore}% accuracy`,
    shareUrl: result.shareUrl,
  };
}

function findCurrentWork(state: GarakProductState): Work | undefined {
  return state.library.works.find((work) => work.id === state.currentWorkId);
}

function findCurrentWorkLatestInstrumentTake(
  state: GarakProductState,
): { workId: string; trackId: string; takeId: string } | undefined {
  const work = findCurrentWork(state);
  if (work === undefined) {
    return undefined;
  }

  for (const track of [...work.tracks].reverse()) {
    if (track.kind !== 'instrument') {
      continue;
    }

    const take = [...track.takes].reverse()[0];
    if (take !== undefined) {
      return {
        workId: work.id,
        trackId: track.id,
        takeId: take.id,
      };
    }
  }

  return undefined;
}

function collectCurrentWorkEvents(work: Work | undefined): PerformanceEvent[] {
  if (work === undefined) {
    return [];
  }

  return work.tracks.flatMap((track) =>
    track.kind === 'instrument' ? track.takes.flatMap((take) => take.events) : [],
  );
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function isPositiveDurationSeconds(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isExportRenderKind(value: unknown): value is ExportRenderKind {
  return value === 'audio_capture' || value === 'event_replay' || value === 'demo_sample';
}

function isCaptureFileUri(value: string): boolean {
  return /^(file|content):\/\/\S+/i.test(value.trim());
}

function getEventReplayExportProvenanceError(
  work: Work,
  sourceTakeId: string | undefined,
  sourceEventCount: number | undefined,
): string | undefined {
  if (sourceTakeId === undefined) {
    return 'Event replay export returned no source take ID.';
  }

  if (sourceEventCount === undefined) {
    return 'Event replay export returned no source event count.';
  }

  const sourceTake = findInstrumentTakeById(work, sourceTakeId);
  if (sourceTake === undefined) {
    return 'Event replay export source take is not available in the work.';
  }

  if (sourceTake.take.events.length === 0) {
    return 'Event replay export source take has no recorded events.';
  }

  if (countWorkMixPlanInstrumentEvents(work) !== sourceEventCount) {
    return 'Event replay export source events changed after export rendering.';
  }

  const audibleTrackIds = new Set(createWorkMixPlan(work).tracks.map((track) => track.trackId));
  if (!audibleTrackIds.has(sourceTake.track.id)) {
    return 'Event replay export source take is not audible in the exported work.';
  }

  return undefined;
}

function getAudioCaptureExportProvenanceError(
  work: Work,
  sourceTakeId: string | undefined,
  sourceRecordingUri: string | undefined,
): string | undefined {
  if (sourceTakeId === undefined) {
    return 'Audio capture export returned no source take ID.';
  }

  if (sourceRecordingUri === undefined) {
    return 'Audio capture export returned no source recording URI.';
  }

  const sourceTake = findInstrumentTakeById(work, sourceTakeId);
  if (sourceTake === undefined) {
    return 'Audio capture export source take is not available in the work.';
  }

  const audibleTrackIds = new Set(createWorkMixPlan(work).tracks.map((track) => track.trackId));
  if (!audibleTrackIds.has(sourceTake.track.id)) {
    return 'Audio capture export source take is not audible in the exported work.';
  }

  const takeRecordingUri = normalizeOptionalText(sourceTake.take.recordingUri);
  if (takeRecordingUri === undefined) {
    return 'Audio capture export source take has no recording URI.';
  }

  if (takeRecordingUri !== sourceRecordingUri) {
    return 'Audio capture export source recording URI does not match the source take.';
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

import type { PerformanceEvent } from '../domain/performanceEvent';
import type { ExportedAudio, PracticeResult, ShareTargetReference, Work } from '../studio/studioTypes';
import type {
  GarakProductAction,
  GarakProductState,
} from './garakProductState';
import type { GarakProductServices, SharePublishInput } from './garakProductServices';

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

  if (action.type === 'chooseAccompanimentTrack') {
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
    const exportAction = await exportCurrentWorkAudio(state, services);
    if (exportAction !== undefined) {
      followUpActions.push(exportAction);
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
      return {
        type: 'completeWorkAudioExport',
        workId: work.id,
        audioUri: result.value.audioUri,
        durationSeconds: result.value.durationSeconds,
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
    const audio = state.library.exportedAudios.find((item) => item.id === target.id);
    return audio === undefined ? undefined : createExportedAudioShareInput(audio, target);
  }

  const result = state.library.practiceResults.find((item) => item.id === target.id);
  return result === undefined ? undefined : createPracticeResultShareInput(result, target);
}

function createExportedAudioShareInput(
  audio: ExportedAudio,
  target: ShareTargetReference,
): SharePublishInput {
  return {
    target,
    title: audio.title,
    message: `${audio.title} - GARAK`,
    fileUri: audio.audioUri,
    shareUrl: audio.shareUrl,
  };
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

function collectCurrentWorkEvents(work: Work | undefined): PerformanceEvent[] {
  if (work === undefined) {
    return [];
  }

  return work.tracks.flatMap((track) =>
    track.kind === 'instrument' ? track.takes.flatMap((take) => take.events) : [],
  );
}

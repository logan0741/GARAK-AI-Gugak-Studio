import type { PerformanceEvent } from '../domain/performanceEvent';
import type { Work } from '../studio/studioTypes';
import type {
  GarakProductAction,
  ProductPlayerSelection,
  GarakProductState,
} from './garakProductState';
import type { GarakProductServices, ShareTargetReference } from './garakProductServices';
import { evaluatePracticeResult } from './practiceResultEvaluation';
import { getPracticeSongTitle } from './productFixtures';

export type RunGarakProductEffectInput = {
  state: GarakProductState;
  action: GarakProductAction;
  services: GarakProductServices;
};

const LIBRARY_PERSISTENCE_ACTION_TYPES = new Set<GarakProductAction['type']>([
  'completePerformance',
  'applyInstrumentTrack',
  'addAccompanimentTrack',
  'saveCurrentWork',
  'exportCurrentWork',
  'savePracticeResult',
  'sharePracticeResult',
  'saveShareTargetOnly',
  'publishShareTarget',
  'remixSharedRecording',
  'saveSharedRecording',
  'deleteSelectedPlayerItem',
  'receiveExportedAudioUri',
  'replaceLibrarySnapshot',
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
    const feedAction = await loadShareFeed(services);
    if (feedAction !== undefined) {
      followUpActions.push(feedAction);
    }
  }

  if (action.type === 'chooseAccompanimentTrack') {
    const recommendationAction = await recommendAccompaniment(state, services);
    if (recommendationAction !== undefined) {
      followUpActions.push(recommendationAction);
    }
  }

  if (action.type === 'finishPractice') {
    const feedbackAction = await requestPracticeFeedback(state, services);
    if (feedbackAction !== undefined) {
      followUpActions.push(feedbackAction);
    }
  }

  if (action.type === 'exportCurrentWork') {
    const exportAction = await exportCurrentWorkAudio(state, services);
    if (exportAction !== undefined) {
      followUpActions.push(exportAction);
    }
  }

  if (action.type === 'publishShareTarget') {
    await publishSelectedShareTarget(state, services);
  }

  if (LIBRARY_PERSISTENCE_ACTION_TYPES.has(action.type)) {
    await persistLibrarySnapshot(state, services);
  }

  return followUpActions;
}

async function loadShareFeed(
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  try {
    const result = await services.share.loadFeed();
    return result.status === 'ok' ? { type: 'receiveShareFeed', recordings: result.value } : undefined;
  } catch {
    return undefined;
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

async function requestPracticeFeedback(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  const events = state.practiceAttempt?.inputEvents ?? [];

  if (events.length === 0) {
    return undefined;
  }

  try {
    const evaluation = evaluatePracticeResult({
      practiceAttempt: state.practiceAttempt,
      selectedPracticeSongId: state.selectedPracticeSongId,
      selectedInstrument: state.selectedInstrument,
    });
    const result = await services.ai.requestPracticeFeedback({
      sessionId: buildPracticeFeedbackSessionId(evaluation.songId, state.practiceAttempt?.completedAt),
      accuracyScore: evaluation.accuracyScore,
      songName: getPracticeSongTitle(evaluation.songId),
      locale: state.language,
      events,
    });

    return result.status === 'ok'
      ? {
          type: 'receiveAiPracticeFeedback',
          feedbackText: result.value.feedbackText,
        }
      : {
          type: 'failAiPracticeFeedback',
        };
  } catch {
    return {
      type: 'failAiPracticeFeedback',
    };
  }
}

async function exportCurrentWorkAudio(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<GarakProductAction | undefined> {
  const selected = state.selectedPlayerItem;
  const currentWork = findCurrentWork(state);

  if (selected?.kind !== 'exportedAudio' || currentWork === undefined) {
    return undefined;
  }

  try {
    const result = await services.audio.exportWorkAudio(currentWork);

    return result.status === 'ok'
      ? {
          type: 'receiveExportedAudioUri',
          exportedAudioId: selected.exportedAudioId,
          audioUri: result.value.audioUri,
        }
      : undefined;
  } catch {
    return undefined;
  }
}

async function publishSelectedShareTarget(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<void> {
  const target = toShareTargetReference(state);

  if (target === undefined) {
    return;
  }

  try {
    await services.share.publishShareTarget(target);
  } catch {
    // The local share state is optimistic. Network failures should surface as
    // explicit share status later instead of interrupting navigation.
  }
}

async function persistLibrarySnapshot(
  state: GarakProductState,
  services: GarakProductServices,
): Promise<void> {
  try {
    await services.library.saveSnapshot(state.library);
  } catch {
    // The reducer already holds the optimistic local state. Backend/storage failures
    // should become explicit UI state in the real adapter, not crash the shell.
  }
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

function buildPracticeFeedbackSessionId(songId: string, completedAt: string | undefined): string {
  const suffix = completedAt === undefined ? Date.now() : Date.parse(completedAt);
  return `practice-${songId}-${Number.isFinite(suffix) ? suffix : Date.now()}`;
}

function toShareTargetReference(state: GarakProductState): ShareTargetReference | undefined {
  const selected: ProductPlayerSelection | undefined = state.selectedPlayerItem;

  if (selected?.kind === 'exportedAudio') {
    const audio = state.library.exportedAudios.find((item) => item.id === selected.exportedAudioId);

    return {
      kind: 'exportedAudio',
      id: selected.exportedAudioId,
      sessionId: audio?.workId ?? selected.exportedAudioId,
    };
  }

  if (selected?.kind === 'practiceResult') {
    return {
      kind: 'practiceResult',
      id: selected.practiceResultId,
      sessionId: selected.practiceResultId,
    };
  }

  return undefined;
}

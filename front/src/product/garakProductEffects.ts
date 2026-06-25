import type { PerformanceEvent } from '../domain/performanceEvent';
import type { Work } from '../studio/studioTypes';
import type {
  GarakProductAction,
  GarakProductState,
} from './garakProductState';
import type { GarakProductServices } from './garakProductServices';

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
  }

  if (action.type === 'chooseAccompanimentTrack') {
    const recommendationAction = await recommendAccompaniment(state, services);
    if (recommendationAction !== undefined) {
      followUpActions.push(recommendationAction);
    }
  }

  if (LIBRARY_PERSISTENCE_ACTION_TYPES.has(action.type)) {
    await persistLibrarySnapshot(state, services);
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

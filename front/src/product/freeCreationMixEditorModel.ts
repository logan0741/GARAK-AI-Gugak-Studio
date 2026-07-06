import type { GarakProductAction, GarakProductState } from './garakProductState';
import type { Track } from '../studio/studioTypes';
import { JANGDAN_PRESETS, getInstrumentName } from './productFixtures';

export type FreeCreationTrackControlModel = {
  trackId: string;
  label: string;
  volumeLabel: string;
  isMuted: boolean;
  isSoloed: boolean;
  canDelete: boolean;
  decreaseVolumeAction: GarakProductAction;
  increaseVolumeAction: GarakProductAction;
  toggleMuteAction: GarakProductAction;
  toggleSoloAction: GarakProductAction;
  deleteAction: GarakProductAction;
};

export type FreeCreationMixEditorModel = {
  playerTitle: string;
  playerAccessibilityLabel: string;
  playbackNotice?: string;
  trackControls: FreeCreationTrackControlModel[];
  playheadBeat: number;
  playheadBeatLabel: string;
  decreasePlayheadAction: GarakProductAction;
  increasePlayheadAction: GarakProductAction;
  saveAction?: GarakProductAction;
  saveStatusLabel: string;
};

export function getFreeCreationMixEditorModel(
  state: GarakProductState,
): FreeCreationMixEditorModel {
  const work = state.library.works.find((item) => item.id === state.currentWorkId);
  const isEn = state.language === 'en';
  const playerTitle = work?.title ?? (isEn ? 'Current Work' : '현재 작업');
  const playheadBeat = normalizePlayheadBeat(state.workPlayheadBeat);
  const saveStatusLabel =
    state.workSaveStatus === 'saving'
      ? (isEn ? 'Saving...' : 'Saving...')
      : state.workSaveStatus === 'failed'
        ? (isEn ? 'Save Failed' : 'Save Failed')
        : state.workSaveStatus === 'saved'
      ? (isEn ? 'Saved' : '저장됨')
      : (isEn ? 'Save Work' : '작업 저장');

  return {
    playerTitle,
    playerAccessibilityLabel: isEn ? `${playerTitle} Playback Preview` : `${playerTitle} 재생 미리보기`,
    playbackNotice: getMixEditorNotice(state),
    trackControls:
      work?.tracks.map((track, index) =>
        createTrackControlModel(track, index, work.tracks.length, state.language),
      ) ??
      [],
    playheadBeat,
    playheadBeatLabel: isEn ? `Beat ${playheadBeat}` : `${playheadBeat}박`,
    decreasePlayheadAction: {
      type: 'setWorkPlayheadBeat',
      beat: Math.max(1, playheadBeat - 1),
    },
    increasePlayheadAction: {
      type: 'setWorkPlayheadBeat',
      beat: playheadBeat + 1,
    },
    saveAction: work === undefined ? undefined : { type: 'saveCurrentWork' },
    saveStatusLabel,
  };
}

function getMixEditorNotice(state: GarakProductState): string | undefined {
  if (state.playerPlaybackStatus.status === 'failed') {
    return `Playback unavailable: ${state.playerPlaybackStatus.message}`;
  }

  if (
    state.workExportStatus.status === 'failed' &&
    state.workExportStatus.workId === state.currentWorkId
  ) {
    return `Export unavailable: ${state.workExportStatus.message}`;
  }

  return undefined;
}

function normalizePlayheadBeat(beat: number): number {
  return typeof beat === 'number' && Number.isFinite(beat) && beat > 0 ? Math.round(beat) : 1;
}

function createTrackControlModel(
  track: Track,
  index: number,
  trackCount: number,
  language: GarakProductState['language'],
): FreeCreationTrackControlModel {
  return {
    trackId: track.id,
    label: getTrackLabel(track, index, language),
    volumeLabel: `${Math.round(track.volume * 100)}%`,
    isMuted: track.mute,
    isSoloed: track.solo,
    canDelete: trackCount > 1,
    decreaseVolumeAction: { type: 'adjustWorkTrackVolume', trackId: track.id, delta: -0.1 },
    increaseVolumeAction: { type: 'adjustWorkTrackVolume', trackId: track.id, delta: 0.1 },
    toggleMuteAction: { type: 'toggleWorkTrackMute', trackId: track.id },
    toggleSoloAction: { type: 'toggleWorkTrackSolo', trackId: track.id },
    deleteAction: { type: 'deleteWorkTrack', trackId: track.id },
  };
}

function getTrackLabel(
  track: Track,
  index: number,
  language: GarakProductState['language'],
): string {
  const isEn = language === 'en';

  if (track.kind === 'instrument') {
    return `Track ${index + 1} : ${getInstrumentName(track.instrument)}`;
  }

  if (track.kind === 'accompaniment') {
    const preset = JANGDAN_PRESETS.find((item) => item.id === track.presetId);
    return isEn
      ? `AI Accompaniment: ${preset?.name ?? track.presetId}`
      : `AI 반주 : ${preset?.name ?? track.presetId}`;
  }

  return isEn ? `Reference: ${track.title}` : `참조 : ${track.title}`;
}

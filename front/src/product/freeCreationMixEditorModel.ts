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
  const playerTitle = work?.title ?? '현재 작업';
  const playheadBeat = normalizePlayheadBeat(state.workPlayheadBeat);

  return {
    playerTitle,
    playerAccessibilityLabel: `${playerTitle} 재생 미리보기`,
    trackControls:
      work?.tracks.map((track, index) => createTrackControlModel(track, index, work.tracks.length)) ??
      [],
    playheadBeat,
    playheadBeatLabel: `${playheadBeat}박`,
    decreasePlayheadAction: {
      type: 'setWorkPlayheadBeat',
      beat: Math.max(1, playheadBeat - 1),
    },
    increasePlayheadAction: {
      type: 'setWorkPlayheadBeat',
      beat: playheadBeat + 1,
    },
    saveAction: work === undefined ? undefined : { type: 'saveCurrentWork' },
    saveStatusLabel: state.workSaveStatus === 'saved' ? '저장됨' : '작업 저장',
  };
}

function normalizePlayheadBeat(beat: number): number {
  return typeof beat === 'number' && Number.isFinite(beat) && beat > 0 ? Math.round(beat) : 1;
}

function createTrackControlModel(
  track: Track,
  index: number,
  trackCount: number,
): FreeCreationTrackControlModel {
  return {
    trackId: track.id,
    label: getTrackLabel(track, index),
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

function getTrackLabel(track: Track, index: number): string {
  if (track.kind === 'instrument') {
    return `Track ${index + 1} : ${getInstrumentName(track.instrument)}`;
  }

  if (track.kind === 'accompaniment') {
    const preset = JANGDAN_PRESETS.find((item) => item.id === track.presetId);
    return `AI 반주 : ${preset?.name ?? track.presetId}`;
  }

  return `참조 : ${track.title}`;
}

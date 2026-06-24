import type { InstrumentId, Track } from '../studio/studioTypes';
import type { GarakProductAction, GarakProductState } from './garakProductState';
import {
  DEFAULT_FREE_CREATION_INSTRUMENT,
  JANGDAN_PRESETS,
  getInstrumentName,
} from './productFixtures';

const INSTRUMENT_CHIP_ORDER: InstrumentId[] = ['janggu', 'gayageum', 'daegeum'];

export type FreeCreationCompletedPreviewModel = {
  playerTitle: string;
  playerAccessibilityLabel: string;
  completionSubjectLabel: string;
  accompanimentTrackLabel: string;
  firstInstrumentTrackLabel: string;
  secondInstrumentTrackLabel: string;
  saveAction?: GarakProductAction;
  saveStatusLabel: string;
};

export function getFreeCreationCompletedPreviewModel(
  state: GarakProductState,
): FreeCreationCompletedPreviewModel {
  const work = state.library.works.find((item) => item.id === state.currentWorkId);
  const instrumentTracks = work?.tracks.filter(isInstrumentTrack) ?? [];
  const firstInstrument =
    instrumentTracks[0]?.instrument ?? state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
  const secondInstrument =
    instrumentTracks[1]?.instrument ?? getNextTrackInstrument([firstInstrument]);
  const accompanimentTrack = work?.tracks.find(isAccompanimentTrack);
  const accompanimentPreset =
    JANGDAN_PRESETS.find((preset) => preset.id === accompanimentTrack?.presetId) ?? JANGDAN_PRESETS[0];
  const playerTitle = work?.title ?? '나만의 가락';

  return {
    playerTitle,
    playerAccessibilityLabel: `${playerTitle} 재생 미리보기`,
    completionSubjectLabel: playerTitle,
    accompanimentTrackLabel: `AI 반주 : ${accompanimentPreset.name}`,
    firstInstrumentTrackLabel: `Track 1 : ${getInstrumentName(firstInstrument)}`,
    secondInstrumentTrackLabel: `Track 2 : ${getInstrumentName(secondInstrument)}`,
    saveAction: work === undefined ? undefined : { type: 'saveCurrentWork' },
    saveStatusLabel: state.workSaveStatus === 'saved' ? '저장됨' : '작업 저장',
  };
}

function isInstrumentTrack(track: Track): track is Extract<Track, { kind: 'instrument' }> {
  return track.kind === 'instrument';
}

function isAccompanimentTrack(track: Track): track is Extract<Track, { kind: 'accompaniment' }> {
  return track.kind === 'accompaniment';
}

function getNextTrackInstrument(existingInstruments: InstrumentId[]): InstrumentId {
  return (
    INSTRUMENT_CHIP_ORDER.find((instrument) => !existingInstruments.includes(instrument)) ??
    existingInstruments[0] ??
    DEFAULT_FREE_CREATION_INSTRUMENT
  );
}

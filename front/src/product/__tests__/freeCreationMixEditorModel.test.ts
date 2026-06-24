import { expect, test } from 'vitest';

import { addAccompanimentTrack, autoSaveTakeAsWork } from '../../studio/studioLibrary';
import { createInitialGarakProductState } from '../garakProductState';
import { getFreeCreationMixEditorModel } from '../freeCreationMixEditorModel';

test('uses the current work title in the S07 free-creation mix player', () => {
  const createdAt = '2026-06-24T12:00:00.000Z';
  const work = autoSaveTakeAsWork({
    workId: 'work-9',
    trackId: 'track-1',
    takeId: 'take-1',
    title: '대금 작업 9',
    instrument: 'daegeum',
    events: [],
    createdAt,
    startedAtBeat: 1,
    durationBeats: 4,
  });
  const state = {
    ...createInitialGarakProductState({ now: () => createdAt }),
    currentWorkId: work.id,
    library: {
      works: [work],
      exportedAudios: [],
      practiceResults: [],
    },
  };

  expect(getFreeCreationMixEditorModel(state)).toMatchObject({
    playerTitle: '대금 작업 9',
    playerAccessibilityLabel: '대금 작업 9 재생 미리보기',
  });
});

test('exposes a local work save action and status for the S07 mix player', () => {
  const createdAt = '2026-06-24T12:00:00.000Z';
  const work = autoSaveTakeAsWork({
    workId: 'work-save',
    trackId: 'track-1',
    takeId: 'take-1',
    title: '장구 작업',
    instrument: 'janggu',
    events: [],
    createdAt,
    startedAtBeat: 1,
    durationBeats: 4,
  });
  const state = {
    ...createInitialGarakProductState({ now: () => createdAt }),
    currentWorkId: work.id,
    library: {
      works: [work],
      exportedAudios: [],
      practiceResults: [],
    },
  };

  expect(getFreeCreationMixEditorModel(state)).toMatchObject({
    saveAction: { type: 'saveCurrentWork' },
    saveStatusLabel: '작업 저장',
  });
  expect(
    getFreeCreationMixEditorModel({
      ...state,
      workSaveStatus: 'saved',
    }).saveStatusLabel,
  ).toBe('저장됨');
});

test('models the S07 beat-grid playhead controls for track placement', () => {
  const createdAt = '2026-06-24T12:00:00.000Z';
  const work = autoSaveTakeAsWork({
    workId: 'work-playhead',
    trackId: 'track-1',
    takeId: 'take-1',
    title: '박자 편집 작업',
    instrument: 'janggu',
    events: [],
    createdAt,
    startedAtBeat: 1,
    durationBeats: 4,
  });
  const state = {
    ...createInitialGarakProductState({ now: () => createdAt }),
    currentWorkId: work.id,
    workPlayheadBeat: 5,
    library: {
      works: [work],
      exportedAudios: [],
      practiceResults: [],
    },
  };

  expect(getFreeCreationMixEditorModel(state)).toMatchObject({
    playheadBeatLabel: '5박',
    decreasePlayheadAction: { type: 'setWorkPlayheadBeat', beat: 4 },
    increasePlayheadAction: { type: 'setWorkPlayheadBeat', beat: 6 },
  });
});

test('models S07 track volume mute solo and delete controls', () => {
  const createdAt = '2026-06-24T12:00:00.000Z';
  const work = addAccompanimentTrack(
    autoSaveTakeAsWork({
      workId: 'work-tracks',
      trackId: 'track-1',
      takeId: 'take-1',
      title: '트랙 편집 작업',
      instrument: 'janggu',
      events: [],
      createdAt,
      startedAtBeat: 1,
      durationBeats: 4,
    }),
    {
      trackId: 'track-2',
      presetId: 'jungmori',
      bpm: 80,
      volume: 0.7,
      createdAt,
    },
  );
  const state = {
    ...createInitialGarakProductState({ now: () => createdAt }),
    currentWorkId: work.id,
    library: {
      works: [work],
      exportedAudios: [],
      practiceResults: [],
    },
  };

  expect(getFreeCreationMixEditorModel(state).trackControls).toMatchObject([
    {
      trackId: 'track-1',
      label: 'Track 1 : 장구',
      volumeLabel: '100%',
      isMuted: false,
      isSoloed: false,
      canDelete: true,
      decreaseVolumeAction: { type: 'adjustWorkTrackVolume', trackId: 'track-1', delta: -0.1 },
      increaseVolumeAction: { type: 'adjustWorkTrackVolume', trackId: 'track-1', delta: 0.1 },
      toggleMuteAction: { type: 'toggleWorkTrackMute', trackId: 'track-1' },
      toggleSoloAction: { type: 'toggleWorkTrackSolo', trackId: 'track-1' },
      deleteAction: { type: 'deleteWorkTrack', trackId: 'track-1' },
    },
    {
      trackId: 'track-2',
      label: 'AI 반주 : 중모리',
      volumeLabel: '70%',
      canDelete: true,
    },
  ]);
});

test('marks a single S07 track as not deletable', () => {
  const createdAt = '2026-06-24T12:00:00.000Z';
  const work = autoSaveTakeAsWork({
    workId: 'work-single-track',
    trackId: 'track-1',
    takeId: 'take-1',
    title: '단일 트랙 작업',
    instrument: 'janggu',
    events: [],
    createdAt,
    startedAtBeat: 1,
    durationBeats: 4,
  });
  const state = {
    ...createInitialGarakProductState({ now: () => createdAt }),
    currentWorkId: work.id,
    library: {
      works: [work],
      exportedAudios: [],
      practiceResults: [],
    },
  };

  expect(getFreeCreationMixEditorModel(state).trackControls[0]).toMatchObject({
    trackId: 'track-1',
    canDelete: false,
  });
});

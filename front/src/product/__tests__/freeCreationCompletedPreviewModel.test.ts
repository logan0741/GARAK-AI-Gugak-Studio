import { expect, test } from 'vitest';

import { addAccompanimentTrack, autoSaveTakeAsWork } from '../../studio/studioLibrary';
import { createInitialGarakProductState } from '../garakProductState';
import { getFreeCreationCompletedPreviewModel } from '../freeCreationCompletedPreviewModel';

test('uses current work title and accepted jangdan preset in the completed free-creation preview', () => {
  const createdAt = '2026-06-24T12:00:00.000Z';
  const work = addAccompanimentTrack(
    autoSaveTakeAsWork({
      workId: 'work-7',
      trackId: 'track-1',
      takeId: 'take-1',
      title: '장구 작업 7',
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
      volume: 70,
      createdAt,
    },
  );
  const state = {
    ...createInitialGarakProductState({ now: () => createdAt }),
    currentWorkId: work.id,
    selectedInstrument: 'janggu' as const,
    library: {
      works: [work],
      exportedAudios: [],
      practiceResults: [],
    },
  };

  expect(getFreeCreationCompletedPreviewModel(state)).toMatchObject({
    playerTitle: '장구 작업 7',
    playerAccessibilityLabel: '장구 작업 7 재생 미리보기',
    accompanimentTrackLabel: 'AI 반주 : 중모리',
    firstInstrumentTrackLabel: 'Track 1 : 장구',
    secondInstrumentTrackLabel: 'Track 2 : 가야금',
    saveAction: { type: 'saveCurrentWork' },
    saveStatusLabel: '작업 저장',
  });

  expect(
    getFreeCreationCompletedPreviewModel({
      ...state,
      workSaveStatus: 'saved',
    }).saveStatusLabel,
  ).toBe('저장됨');
});

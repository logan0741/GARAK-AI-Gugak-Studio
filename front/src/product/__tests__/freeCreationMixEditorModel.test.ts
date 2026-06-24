import { expect, test } from 'vitest';

import { autoSaveTakeAsWork } from '../../studio/studioLibrary';
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

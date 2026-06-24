import { expect, test } from 'vitest';
import { createInitialGarakProductState } from '../garakProductState';
import { getSettingsViewModel } from '../settingsScreenModel';

test('models S22 settings status rows and actions from local library state', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  const model = getSettingsViewModel({
    ...state,
    language: 'en',
    library: {
      ...state.library,
      works: [
        {
          id: 'work-1',
          title: '가야금 작업 1',
          createdAt: '2026-06-18T00:00:00.000Z',
          updatedAt: '2026-06-18T00:00:00.000Z',
          source: 'free_creation',
          syncState: 'local_only',
          tracks: [],
        },
      ],
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: '가야금 작업 1 내보내기',
          durationSeconds: 24,
          instrumentNames: ['가야금'],
          createdAt: '2026-06-18T00:00:00.000Z',
          audioUri: 'placeholder://export-1.wav',
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model.rows).toEqual([
    { label: '현재 상태', value: '게스트' },
    { label: '로컬 보관함 저장 상태', value: '작업 1개 · 내보낸 음원/결과 1개' },
    { label: '동기화 상태', value: '로컬 저장 · 작업 1개 · 내보낸 음원/결과 1개' },
    { label: '언어', value: 'English' },
    { label: '앱 정보', value: 'GARAK · AI GUGAK STUDIO' },
  ]);
  expect(model.actions).toEqual({
    changeLanguage: { type: 'navigate', target: 'S02' },
    manageLibrary: { type: 'navigate', target: 'S18' },
    loginAndLoadMySongs: { type: 'loginAndLoadMySongs' },
  });
});

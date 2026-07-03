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
    { label: 'Current Status', value: 'Guest' },
    { label: 'Local Library Storage', value: 'Works: 1 · Exported audio/results: 1' },
    { label: 'Sync Status', value: 'Local storage · Works: 1 · Exported audio/results: 1' },
    { label: 'Language', value: 'English' },
    { label: 'Audio Sources', value: 'National Gugak Center · KOGL Type 1 · Janggu/Daegeum' },
    { label: 'App Info', value: 'GARAK · AI GUGAK STUDIO' },
  ]);
  expect(model.audioSourceNotice).toEqual({
    title: 'Audio Source Attribution',
    body: 'Janggu and daegeum performance samples use National Gugak Center monotone assets under KOGL Type 1 attribution terms.',
    sourceUrl: 'https://www.gugak.go.kr/digitaleum/front/monotone/list.do',
    licenseUrl: 'http://www.kogl.or.kr/open/info/license_info/by.do',
  });
  expect(model.actions).toEqual({
    changeLanguage: { type: 'navigate', target: 'S02' },
    manageLibrary: { type: 'navigate', target: 'S18' },
    loginAndLoadMySongs: { type: 'loginAndLoadMySongs' },
  });
});

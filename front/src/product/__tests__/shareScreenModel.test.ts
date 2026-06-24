import { expect, test } from 'vitest';
import { createInitialGarakProductState } from '../garakProductState';
import { getShareFeedViewModel } from '../shareScreenModel';

test('builds the Figma share-feed defaults', () => {
  const model = getShareFeedViewModel(createInitialGarakProductState());

  expect(model.categories).toEqual([
    { label: 'Hot', active: true },
    { label: 'K-pop', active: false },
    { label: 'K-Drama OST', active: false },
    { label: 'K-Minyo', active: false },
    { label: 'Arirang', active: false },
  ]);
  expect(model.hero).toMatchObject({
    owner: 'Minsu_Kim',
    title: 'Minsu_Kim님을 위한 추천 가락',
    description: '케이팝 데몬 헌터스의 노래들을 가락과 함께 국악으로 연주해요.',
  });
  expect(model.player).toMatchObject({
    sourceKind: 'demo',
    title: 'My Arirang',
  });
  expect(model.recentCards.map((card) => card.title)).toEqual([
    'K-Drama OST',
    'K-pop Demon Hunters',
    'Korea Minyo',
  ]);
});

test('uses a saved export as the shareable player item', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  const model = getShareFeedViewModel({
    ...state,
    library: {
      ...state.library,
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: 'My Exported Garak',
          durationSeconds: 42,
          instrumentNames: ['가야금'],
          createdAt: '2026-06-18T00:00:00.000Z',
          audioUri: 'placeholder://export-1.wav',
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model.player).toMatchObject({
    exportedAudioId: 'export-1',
    sourceKind: 'exportedAudio',
    title: 'My Exported Garak',
  });
});

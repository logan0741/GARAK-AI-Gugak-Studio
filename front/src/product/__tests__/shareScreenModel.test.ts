import { expect, test } from 'vitest';
import { createInitialGarakProductState } from '../garakProductState';
import {
  getShareFeedViewModel,
  getSharePrepareAction,
  getSharePrepareViewModel,
} from '../shareScreenModel';

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

test('prepares the selected exported audio as the S17 share target', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  const model = getSharePrepareViewModel({
    ...state,
    selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
    library: {
      ...state.library,
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: '장구 작업 1 내보내기',
          durationSeconds: 42,
          instrumentNames: ['장구', '가야금'],
          createdAt: '2026-06-18T00:00:00.000Z',
          audioUri: 'placeholder://export-1.wav',
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model).toEqual({
    canShare: true,
    title: '장구 작업 1 내보내기',
    description: '42초 · 장구, 가야금 · 내보낸 음원',
  });
});

test('opens S17 share preparation only when a shareable target exists', () => {
  expect(getSharePrepareAction(createInitialGarakProductState())).toBeUndefined();

  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  expect(
    getSharePrepareAction({
      ...state,
      library: {
        ...state.library,
        exportedAudios: [
          {
            id: 'export-1',
            kind: 'exported_audio',
            workId: 'work-1',
            title: '장구 작업 1 내보내기',
            durationSeconds: 42,
            instrumentNames: ['장구'],
            createdAt: '2026-06-18T00:00:00.000Z',
            audioUri: 'placeholder://export-1.wav',
            shareState: 'ready',
          },
        ],
      },
    }),
  ).toEqual({ type: 'navigate', target: 'S17' });
});

test('prepares the latest practice result when S17 is opened from practice sharing', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  const model = getSharePrepareViewModel({
    ...state,
    library: {
      ...state.library,
      practiceResults: [
        {
          id: 'practice-1',
          kind: 'practice_result',
          songId: 'arirang',
          instrument: 'gayageum',
          accuracyScore: 82,
          timingScore: 78,
          feedback: '박자 흐름이 안정적이에요.',
          createdAt: '2026-06-18T00:00:00.000Z',
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model).toEqual({
    canShare: true,
    title: '아리랑 연습 결과',
    description: '가야금 · 정확도 82% · 따라하기 결과',
  });
});

test('prefers the newest shareable target when S17 has no explicit selected item', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  const model = getSharePrepareViewModel({
    ...state,
    library: {
      ...state.library,
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: '오래된 내보내기',
          durationSeconds: 24,
          instrumentNames: ['장구'],
          createdAt: '2026-06-17T00:00:00.000Z',
          audioUri: 'placeholder://export-1.wav',
          shareState: 'ready',
        },
      ],
      practiceResults: [
        {
          id: 'practice-1',
          kind: 'practice_result',
          songId: 'doraji',
          instrument: 'daegeum',
          accuracyScore: 91,
          timingScore: 88,
          feedback: '호흡이 안정적이에요.',
          createdAt: '2026-06-18T00:00:00.000Z',
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model).toMatchObject({
    title: '도라지 연습 결과',
    description: '대금 · 정확도 91% · 따라하기 결과',
  });
});

test('does not prepare an auto-saved work as a direct S17 share target', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  const model = getSharePrepareViewModel({
    ...state,
    selectedPlayerItem: { kind: 'work', workId: 'work-1' },
    library: {
      ...state.library,
      works: [
        {
          id: 'work-1',
          title: '자동 저장 작업',
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
          workId: 'other-work',
          title: '다른 내보내기',
          durationSeconds: 24,
          instrumentNames: ['장구'],
          createdAt: '2026-06-18T00:00:00.000Z',
          audioUri: 'placeholder://export-1.wav',
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model).toEqual({
    canShare: false,
    title: '공유 대상 없음',
    description: '작업을 내보내거나 따라하기 결과를 저장하면 공유할 수 있습니다.',
  });
});

test('does not fall back to another shareable when an explicit S17 selection is stale', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  const model = getSharePrepareViewModel({
    ...state,
    selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'missing-export' },
    library: {
      ...state.library,
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: '다른 내보내기',
          durationSeconds: 24,
          instrumentNames: ['장구'],
          createdAt: '2026-06-18T00:00:00.000Z',
          audioUri: 'placeholder://export-1.wav',
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model).toMatchObject({
    canShare: false,
    title: '공유 대상 없음',
  });
});

test('uses a readable fallback when exported audio has no instrument names', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  const model = getSharePrepareViewModel({
    ...state,
    selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
    library: {
      ...state.library,
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: '악기 정보 없는 내보내기',
          durationSeconds: 24,
          instrumentNames: [],
          createdAt: '2026-06-18T00:00:00.000Z',
          audioUri: 'placeholder://export-1.wav',
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model.description).toBe('24초 · 사용 악기 없음 · 내보낸 음원');
});

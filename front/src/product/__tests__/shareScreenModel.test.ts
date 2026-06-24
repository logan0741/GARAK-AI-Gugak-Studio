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
    recordingId: 'shared-morning-arirang',
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
  expect(model.recentCards.map((card) => card.recordingId)).toEqual([
    'recent-kdrama-ost',
    'recent-kpop-demon-hunters',
    'recent-korea-minyo',
  ]);
});

test('uses a shared export as the share-feed player item', () => {
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
          shareState: 'shared',
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

test('does not expose a share-ready export before it is published', () => {
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
          title: '공유 전 내보내기',
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
    sourceKind: 'demo',
    title: 'My Arirang',
  });
});

test('does not expose an auto-saved work as a share-feed player item', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  const model = getShareFeedViewModel({
    ...state,
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
    },
  });

  expect(model.player).toMatchObject({
    sourceKind: 'demo',
    title: 'My Arirang',
  });
});

test('prefers the selected shared practice result over an older shared export in the feed player', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  const model = getShareFeedViewModel({
    ...state,
    selectedPlayerItem: { kind: 'practiceResult', practiceResultId: 'practice-1' },
    library: {
      ...state.library,
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: '먼저 공유한 내보내기',
          durationSeconds: 42,
          instrumentNames: ['가야금'],
          createdAt: '2026-06-17T00:00:00.000Z',
          audioUri: 'placeholder://export-1.wav',
          shareState: 'shared',
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
          shareState: 'shared',
        },
      ],
    },
  });

  expect(model.player).toMatchObject({
    practiceResultId: 'practice-1',
    sourceKind: 'practiceResult',
    title: '도라지 연습 결과',
  });
});

test('prefers the selected newer shared export when older shared exports already exist', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  const model = getShareFeedViewModel({
    ...state,
    selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-2' },
    library: {
      ...state.library,
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: '먼저 공유한 내보내기',
          durationSeconds: 42,
          instrumentNames: ['가야금'],
          createdAt: '2026-06-17T00:00:00.000Z',
          audioUri: 'placeholder://export-1.wav',
          shareState: 'shared',
        },
        {
          id: 'export-2',
          kind: 'exported_audio',
          workId: 'work-2',
          title: '방금 공유한 내보내기',
          durationSeconds: 36,
          instrumentNames: ['장구'],
          createdAt: '2026-06-18T00:00:00.000Z',
          audioUri: 'placeholder://export-2.wav',
          shareState: 'shared',
        },
      ],
    },
  });

  expect(model.player).toMatchObject({
    exportedAudioId: 'export-2',
    sourceKind: 'exportedAudio',
    title: '방금 공유한 내보내기',
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
    durationLabel: '42초',
    instrumentLabel: '장구, 가야금',
    sourceLabel: '출처 작업',
    isPreviewing: false,
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
    durationLabel: '45초',
    instrumentLabel: '가야금',
    sourceLabel: '따라하기 결과',
    isPreviewing: false,
  });
});

test('marks S17 share target preview as playing', () => {
  const state = createInitialGarakProductState();

  const model = getSharePrepareViewModel({
    ...state,
    sharePreviewStatus: 'playing',
    selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
    library: {
      ...state.library,
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: '미리듣기 내보내기',
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
    canShare: true,
    isPreviewing: true,
    title: '미리듣기 내보내기',
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
    durationLabel: '준비 전',
    instrumentLabel: '사용 악기 없음',
    sourceLabel: '공유 대상 없음',
    isPreviewing: false,
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

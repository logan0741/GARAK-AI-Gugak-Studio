import { expect, test } from 'vitest';
import type { Work } from '../../studio/studioTypes';
import { createInitialGarakProductState } from '../garakProductState';
import {
  getSharedDetailViewModel,
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
    playAction: {
      type: 'playLibraryItemNow',
      item: { kind: 'demo', title: 'My Arirang' },
    },
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
  expect(model.sortLabel).toBe('인기순');
  expect(model.recentCards.map((card) => card.subtitle)).toEqual([
    'Drama_Garak · 대금 · 57초',
    'Kpop_Garak · 장구 · 64초',
    'Minyo_Archive · 가야금 · 52초',
  ]);
});

function createShareModelWork(id: string): Work {
  return {
    id,
    title: 'Share source work',
    createdAt: '2026-07-04T10:00:00.000Z',
    updatedAt: '2026-07-04T10:00:00.000Z',
    source: 'free_creation',
    syncState: 'local_only',
    tracks: [
      {
        id: 'track-1',
        kind: 'instrument',
        instrument: 'janggu',
        takes: [
          {
            id: 'take-1',
            events: [{ type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 }],
            startedAtBeat: 1,
            durationBeats: 4,
          },
        ],
        startedAtBeat: 1,
        volume: 1,
        mute: false,
        solo: false,
        createdAt: '2026-07-04T10:00:00.000Z',
      },
    ],
  };
}

test('exposes a share-feed player play action for shared exports', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-07-04T10:00:00.000Z',
  });

  const model = getShareFeedViewModel({
    ...state,
    library: {
      ...state.library,
      works: [createShareModelWork('work-1')],
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: 'Shared Export',
          durationSeconds: 42,
          instrumentNames: ['Gayageum'],
          createdAt: '2026-07-04T10:00:00.000Z',
          audioUri: 'file://garak/export-1.wav',
          shareState: 'shared',
        },
      ],
    },
  });

  expect(model.player).toMatchObject({
    sourceKind: 'exportedAudio',
    exportedAudioId: 'export-1',
    playAction: {
      type: 'playLibraryItemNow',
      item: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
    },
  });
});

test('does not fall back to another S20 player item when the explicit selection is stale', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-07-04T10:00:00.000Z',
  });

  const model = getShareFeedViewModel({
    ...state,
    selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'missing-export' },
    library: {
      ...state.library,
      works: [createShareModelWork('work-1')],
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: 'Shared Export',
          durationSeconds: 42,
          instrumentNames: ['Gayageum'],
          createdAt: '2026-07-04T10:00:00.000Z',
          audioUri: 'file://garak/export-1.wav',
          shareState: 'shared',
        },
      ],
    },
  });

  expect(model.player).toMatchObject({
    sourceKind: 'unavailable',
    title: 'Selected item unavailable',
  });
  expect(model.player.playAction).toBeUndefined();
});

test('models S21 shared detail remix availability and provenance', () => {
  const model = getSharedDetailViewModel({
    ...createInitialGarakProductState(),
    selectedSharedRecordingId: 'recent-korea-minyo',
  });

  expect(model).toEqual({
    title: 'Korea Minyo',
    instrument: 'gayageum',
    provenanceLabel: 'Minyo_Archive · 가야금 · 공유 피드 데모',
    durationLabel: '52초',
    remixStatusLabel: '저장만 가능',
    canRemix: false,
    isPlaying: false,
    actions: {
      play: { type: 'playSelectedSharedRecording' },
      pause: undefined,
      remix: undefined,
      save: { type: 'saveSharedRecording' },
    },
  });
});

test('marks the selected S21 shared recording as playing', () => {
  const model = getSharedDetailViewModel({
    ...createInitialGarakProductState(),
    selectedSharedRecordingId: 'recent-korea-minyo',
    playingSharedRecordingId: 'recent-korea-minyo',
  });

  expect(model).toMatchObject({
    title: 'Korea Minyo',
    isPlaying: true,
    actions: {
      play: undefined,
      pause: { type: 'pauseSelectedSharedRecording' },
    },
  });
});

test('shows a visible S21 shared recording playback notice when audio fails', () => {
  const model = getSharedDetailViewModel({
    ...createInitialGarakProductState(),
    selectedSharedRecordingId: 'recent-korea-minyo',
    playerPlaybackStatus: {
      status: 'failed',
      message: 'speaker route unavailable',
    },
  });

  expect(model).toMatchObject({
    isPlaying: false,
    playbackNotice: 'Playback unavailable: speaker route unavailable',
    actions: {
      play: { type: 'playSelectedSharedRecording' },
      pause: undefined,
    },
  });
});

test('does not expose S21 detail actions for a missing shared recording', () => {
  const model = getSharedDetailViewModel({
    ...createInitialGarakProductState(),
    selectedSharedRecordingId: 'missing-shared-recording',
  });

  expect(model).toMatchObject({
    title: 'Shared recording unavailable',
    canRemix: false,
    isPlaying: false,
    playbackNotice: 'Playback unavailable: Selected shared recording is unavailable.',
    actions: {
      play: undefined,
      pause: undefined,
      remix: undefined,
      save: undefined,
    },
  });
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
          audioUri: 'file://garak/export-1.wav',
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

test('does not expose a placeholder shared export as the share-feed player item', () => {
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
          title: 'Legacy Placeholder Export',
          durationSeconds: 42,
          instrumentNames: ['媛?쇨툑'],
          createdAt: '2026-06-18T00:00:00.000Z',
          audioUri: 'placeholder://export-1.wav',
          shareState: 'shared',
        },
      ],
    },
  });

  expect(model.player).toMatchObject({
    sourceKind: 'demo',
    title: 'My Arirang',
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
          audioUri: 'file://garak/export-1.wav',
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
          audioUri: 'file://garak/export-2.wav',
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
          audioUri: 'file://garak/export-1.wav',
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model).toEqual({
    canShare: true,
    title: '장구 작업 1 내보내기',
    description: '42초 / 장구, 가야금 / 내보낸 음원',
    durationLabel: '42초',
    instrumentLabel: '장구, 가야금',
    sourceLabel: '출처 작업',
    isPreviewing: false,
    isPublishing: false,
    publishButtonLabel: '공유하기',
  });
});

test('does not prepare a placeholder exported audio as the S17 share target', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  const model = getSharePrepareViewModel({
    ...state,
    selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
    library: {
      ...state.library,
      works: [createShareModelWork('work-1')],
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: 'Legacy Placeholder Export',
          durationSeconds: 42,
          instrumentNames: ['Janggu'],
          createdAt: '2026-06-18T00:00:00.000Z',
          audioUri: 'placeholder://export-1.wav',
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model).toMatchObject({
    canShare: false,
  });
});

test('does not prepare event replay export for sharing when source work is missing', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-07-04T10:00:00.000Z',
  });

  const model = getSharePrepareViewModel({
    ...state,
    selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
    library: {
      ...state.library,
      works: [],
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'missing-work',
          title: 'Event replay export',
          durationSeconds: 24,
          instrumentNames: ['Janggu'],
          createdAt: '2026-07-04T10:00:00.000Z',
          audioUri: 'garak://library-demo/export-fallback',
          renderKind: 'event_replay',
          sourceTakeId: 'take-1',
          sourceEventCount: 1,
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model).toMatchObject({
    canShare: false,
  });
});

test('does not prepare event replay export for sharing when source take is missing', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-07-04T10:00:00.000Z',
  });

  const model = getSharePrepareViewModel({
    ...state,
    selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
    library: {
      ...state.library,
      works: [createShareModelWork('work-1')],
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: 'Event replay export',
          durationSeconds: 24,
          instrumentNames: ['Janggu'],
          createdAt: '2026-07-04T10:00:00.000Z',
          audioUri: 'garak://library-demo/export-fallback',
          renderKind: 'event_replay',
          sourceTakeId: 'missing-take',
          sourceEventCount: 1,
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model).toMatchObject({
    canShare: false,
  });
});

test('includes exported audio render provenance in the S17 share target metadata', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-07-04T10:00:00.000Z',
  });

  const model = getSharePrepareViewModel({
    ...state,
    selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
    library: {
      ...state.library,
      works: [createShareModelWork('work-1')],
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: 'Event replay export',
          durationSeconds: 24,
          instrumentNames: ['Janggu'],
          createdAt: '2026-07-04T10:00:00.000Z',
          audioUri: 'garak://library-demo/export-fallback',
          renderKind: 'event_replay',
          sourceTakeId: 'take-1',
          sourceEventCount: 1,
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model.instrumentLabel).toBe('Janggu / 이벤트 녹음');
  expect(model.instrumentLabel).not.toContain('쨌');
  expect(model.instrumentLabel).not.toContain('夷?');
});

test('labels the S17 publish button from share publish state', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  const baseState = {
    ...state,
    selectedPlayerItem: { kind: 'exportedAudio' as const, exportedAudioId: 'export-1' },
    library: {
      ...state.library,
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio' as const,
          workId: 'work-1',
          title: '공유 상태 내보내기',
          durationSeconds: 30,
          instrumentNames: ['장구'],
          createdAt: '2026-06-18T00:00:00.000Z',
          audioUri: 'file://garak/export-1.wav',
          shareState: 'ready' as const,
        },
      ],
    },
  };

  expect(
    getSharePrepareViewModel({
      ...baseState,
      sharePublishStatus: {
        status: 'publishing',
        target: { kind: 'exportedAudio', id: 'export-1' },
      },
    }),
  ).toMatchObject({
    isPublishing: true,
    publishButtonLabel: 'Sharing...',
  });

  expect(
    getSharePrepareViewModel({
      ...baseState,
      sharePublishStatus: {
        status: 'failed',
        target: { kind: 'exportedAudio', id: 'export-1' },
        message: '공유 링크 생성에 실패했습니다.',
      },
    }),
  ).toMatchObject({
    isPublishing: false,
    publishButtonLabel: '공유하기',
    publishErrorMessage: '공유 링크 생성에 실패했습니다.',
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
  ).toBeUndefined();
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
          accuracyScore: 64,
          timingScore: 71,
          feedback: '기록된 연습 결과를 공유할 수 있어요.',
          createdAt: '2026-06-18T00:00:00.000Z',
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model).toEqual({
    canShare: true,
    title: '아리랑 연습 결과',
    description: '가야금 / 정확도 64% / 따라하기 결과',
    durationLabel: '45초',
    instrumentLabel: '가야금',
    sourceLabel: '따라하기 결과',
    isPreviewing: false,
    isPublishing: false,
    playbackNotice: undefined,
    publishButtonLabel: '공유하기',
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
          audioUri: 'file://garak/export-1.wav',
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

test('shows an S17 preview playback notice when preview audio fails', () => {
  const state = createInitialGarakProductState();

  const model = getSharePrepareViewModel({
    ...state,
    playerPlaybackStatus: {
      status: 'failed',
      message: 'preview asset missing',
    },
    selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
    library: {
      ...state.library,
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio',
          workId: 'work-1',
          title: 'Preview Export',
          durationSeconds: 24,
          instrumentNames: ['Janggu'],
          createdAt: '2026-07-04T10:00:00.000Z',
          audioUri: 'file://garak/missing.wav',
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model).toMatchObject({
    canShare: true,
    playbackNotice: 'Playback unavailable: preview asset missing',
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
    description: '대금 / 정확도 91% / 따라하기 결과',
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
    isPublishing: false,
    publishButtonLabel: '공유하기',
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
          audioUri: 'file://garak/export-1.wav',
          shareState: 'ready',
        },
      ],
    },
  });

  expect(model.description).toBe('24초 / 사용 악기 없음 / 내보낸 음원');
});

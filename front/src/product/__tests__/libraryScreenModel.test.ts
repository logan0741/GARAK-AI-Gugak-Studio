import { expect, test } from 'vitest';
import type { Work } from '../../studio/studioTypes';
import { applyProductAction, createInitialGarakProductState } from '../garakProductState';
import {
  getMyLibraryItemAction,
  getMyLibraryPlayerActions,
  getMyLibraryPlayerViewModel,
  getMyLibraryViewModel,
} from '../libraryScreenModel';

function completeRecordedFreePlay(state: ReturnType<typeof createInitialGarakProductState>) {
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  const captureAttemptId = requireRecordingCaptureAttemptId(state);
  state = applyProductAction(state, {
    type: 'appendFreePlayPerformanceEvents',
    events: [{ type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 }],
  });

  state = applyProductAction(state, { type: 'completePerformance' });

  return applyProductAction(state, {
    type: 'attachRecordingCaptureToTake',
    workId: 'work-1',
    trackId: 'track-1',
    takeId: 'take-1',
    recordingUri: 'file://garak/takes/take-1.m4a',
    durationSeconds: 8,
    captureAttemptId,
  });
}

function completeCurrentWorkExport(state: ReturnType<typeof createInitialGarakProductState>) {
  const workId = state.currentWorkId;
  if (workId === undefined) {
    throw new Error('Expected a current work before completing export.');
  }

  state = applyProductAction(state, { type: 'exportCurrentWork' });

  return applyProductAction(state, {
    type: 'completeWorkAudioExport',
    workId,
    audioUri: 'garak://library-demo/export-fallback',
    durationSeconds: 24,
    renderKind: 'event_replay',
    sourceTakeId: 'take-1',
    sourceEventCount: 1,
    completionTarget: 'player',
  });
}

function requireRecordingCaptureAttemptId(
  state: ReturnType<typeof createInitialGarakProductState>,
): string {
  if ('captureAttemptId' in state.recordingCaptureStatus) {
    return state.recordingCaptureStatus.captureAttemptId;
  }

  throw new Error('Expected an active recording capture attempt.');
}

test('uses the Figma my-screen demo library when there are no saved items', () => {
  const model = getMyLibraryViewModel(createInitialGarakProductState());

  expect(model.heroCards.map((card) => card.title)).toEqual([
    'K-Drama OST',
    'K-pop Demon Hunters',
    'Korea Minyo',
  ]);
  expect(model.heroCards[2]).toMatchObject({
    date: '2026.02.01',
    playable: true,
    tone: 'navy',
  });
  expect(model.playlistRows.map((row) => row.title)).toEqual([
    'My Arirang',
    'Falling water in a valley',
    'Forest Birds singing',
    'sea waves',
    'sea waves',
  ]);
  expect(model.playlistRows[0]).toMatchObject({
    active: true,
    kind: 'demo',
    playable: true,
  });
  expect(model.tabs).toEqual([
    { id: 'works', label: '작업', active: true, count: 0 },
    { id: 'shareables', label: '내보낸 음원/결과', active: false, count: 0 },
  ]);
  expect(model.syncLabel).toBe('로컬 저장 · 작업 0개 · 내보낸 음원/결과 0개');
  expect(model.emptyState).toEqual({
    title: '아직 만든 작업이 없어요.',
    description: '첫 연주를 시작하면 자동 저장된 작업이 여기에 표시됩니다.',
    ctaLabel: '첫 연주 시작하기',
    action: { type: 'navigate', target: 'S01' },
  });
});

test('shows saved works in the default work tab', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = completeCurrentWorkExport(state);

  const model = getMyLibraryViewModel(state);

  expect(model.heroCards[2]).toMatchObject({
    date: '2026.06.18',
    playable: true,
    tone: 'navy',
    workId: 'work-1',
  });
  expect(model.playlistRows[0]).toMatchObject({
    active: true,
    date: '2026.06.18',
    kind: 'work',
    playable: true,
    workId: 'work-1',
  });
  expect(model.playlistRows.map((row) => row.kind)).toEqual(['work']);
  expect(model.tabs).toEqual([
    { id: 'works', label: '작업', active: true, count: 1 },
    { id: 'shareables', label: '내보낸 음원/결과', active: false, count: 1 },
  ]);
  expect(model.emptyState).toBeUndefined();
});

test('keeps library row ids unique when persisted work ids are duplicated', () => {
  const createdAt = '2026-07-05T10:00:00.000Z';
  const state = createInitialGarakProductState({ now: () => createdAt });
  const model = getMyLibraryViewModel({
    ...state,
    library: {
      ...state.library,
      works: [
        {
          id: 'work-1',
          title: 'Duplicate A',
          createdAt,
          updatedAt: '2026-07-05T10:01:00.000Z',
          source: 'free_creation',
          syncState: 'local_only',
          tracks: [],
        },
        {
          id: 'work-1',
          title: 'Duplicate B',
          createdAt,
          updatedAt: '2026-07-05T10:02:00.000Z',
          source: 'free_creation',
          syncState: 'local_only',
          tracks: [],
        },
      ],
      exportedAudios: [],
      practiceResults: [],
    },
  });

  expect(new Set(model.playlistRows.map((row) => row.id)).size).toBe(model.playlistRows.length);
  expect(model.playlistRows.map((row) => row.workId)).toEqual(['work-1', 'work-1']);
});

test('filters the library to exported audio and practice results on the shareables tab', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = completeCurrentWorkExport(state);
  state = applyProductAction(state, { type: 'selectLibraryTab', tab: 'shareables' });

  const model = getMyLibraryViewModel(state);

  expect(model.playlistRows).toHaveLength(1);
  expect(model.playlistRows[0]).toMatchObject({
    exportedAudioId: 'export-1',
    kind: 'exportedAudio',
    playable: true,
  });
  expect(model.tabs[1]).toMatchObject({
    id: 'shareables',
    active: true,
    count: 1,
  });
});

test('keeps placeholder exported audio visible but not playable from the library', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-07-04T10:00:00.000Z',
  });
  const playerState = {
    ...state,
    libraryTab: 'shareables' as const,
    selectedPlayerItem: { kind: 'exportedAudio' as const, exportedAudioId: 'export-placeholder' },
    library: {
      ...state.library,
      exportedAudios: [
        {
          id: 'export-placeholder',
          kind: 'exported_audio' as const,
          title: 'Legacy Placeholder Export',
          durationSeconds: 24,
          instrumentNames: ['Janggu'],
          createdAt: '2026-07-04T10:00:00.000Z',
          audioUri: 'placeholder://export-1.wav',
          shareState: 'ready' as const,
        },
      ],
    },
  };
  const model = getMyLibraryViewModel(playerState);

  expect(model.playlistRows[0]).toMatchObject({
    exportedAudioId: 'export-placeholder',
    kind: 'exportedAudio',
    playable: false,
  });
  expect(getMyLibraryItemAction(model.playlistRows[0])).toBeUndefined();
  expect(getMyLibraryPlayerActions(playerState)).toMatchObject({
    playAction: undefined,
    shareAction: undefined,
    deleteAction: undefined,
  });
  expect(getMyLibraryPlayerViewModel(playerState)).toMatchObject({
    sourceKind: 'unavailable',
    title: 'Selected item unavailable',
  });
});

test('keeps stale event-replay exported audio visible but not playable from the library', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-07-04T10:00:00.000Z',
  });
  const playerState = {
    ...state,
    libraryTab: 'shareables' as const,
    selectedPlayerItem: { kind: 'exportedAudio' as const, exportedAudioId: 'export-stale' },
    library: {
      ...state.library,
      works: [],
      exportedAudios: [
        {
          id: 'export-stale',
          kind: 'exported_audio' as const,
          workId: 'missing-work',
          title: 'Stale Event Replay Export',
          durationSeconds: 24,
          instrumentNames: ['Janggu'],
          createdAt: '2026-07-04T10:00:00.000Z',
          audioUri: 'garak://library-demo/export-fallback',
          renderKind: 'event_replay' as const,
          sourceTakeId: 'take-1',
          shareState: 'ready' as const,
        },
      ],
    },
  };
  const model = getMyLibraryViewModel(playerState);

  expect(model.playlistRows[0]).toMatchObject({
    exportedAudioId: 'export-stale',
    kind: 'exportedAudio',
    playable: false,
  });
  expect(getMyLibraryItemAction(model.playlistRows[0])).toBeUndefined();
  expect(getMyLibraryPlayerActions(playerState)).toMatchObject({
    playAction: undefined,
    shareAction: undefined,
    deleteAction: undefined,
  });
  expect(getMyLibraryPlayerViewModel(playerState)).toMatchObject({
    sourceKind: 'unavailable',
    title: 'Selected item unavailable',
  });
});

test('keeps stale audio-capture exported audio visible but not playable from the library', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-07-04T10:00:00.000Z',
  });
  const playerState = {
    ...state,
    libraryTab: 'shareables' as const,
    selectedPlayerItem: { kind: 'exportedAudio' as const, exportedAudioId: 'export-stale-capture' },
    library: {
      ...state.library,
      exportedAudios: [
        {
          id: 'export-stale-capture',
          kind: 'exported_audio' as const,
          title: 'Stale Capture Export',
          durationSeconds: 24,
          instrumentNames: ['Janggu'],
          createdAt: '2026-07-04T10:00:00.000Z',
          audioUri: 'garak://library-demo/export-fallback',
          renderKind: 'audio_capture' as const,
          sourceTakeId: 'take-1',
          sourceRecordingUri: 'garak://library-demo/export-fallback',
          shareState: 'ready' as const,
        },
      ],
    },
  };
  const model = getMyLibraryViewModel(playerState);

  expect(model.playlistRows[0]).toMatchObject({
    exportedAudioId: 'export-stale-capture',
    kind: 'exportedAudio',
    playable: false,
  });
  expect(getMyLibraryItemAction(model.playlistRows[0])).toBeUndefined();
  expect(getMyLibraryPlayerActions(playerState)).toMatchObject({
    playAction: undefined,
    shareAction: undefined,
    deleteAction: undefined,
  });
});

test('keeps empty library work rows visible but not playable', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-07-04T10:00:00.000Z',
  });
  const playerState = {
    ...state,
    selectedPlayerItem: { kind: 'work' as const, workId: 'work-empty' },
    library: {
      ...state.library,
      works: [
        {
          id: 'work-empty',
          title: 'Empty Work',
          createdAt: '2026-07-04T10:00:00.000Z',
          updatedAt: '2026-07-04T10:00:00.000Z',
          source: 'free_creation' as const,
          syncState: 'local_only' as const,
          tracks: [],
        },
      ],
    },
  };
  const model = getMyLibraryViewModel(playerState);

  expect(model.playlistRows[0]).toMatchObject({
    workId: 'work-empty',
    kind: 'work',
    playable: false,
  });
  expect(getMyLibraryItemAction(model.playlistRows[0])).toBeUndefined();
  expect(getMyLibraryPlayerActions(playerState)).toMatchObject({
    playAction: undefined,
  });
});

test('shows exported audio provenance in library rows and player metadata', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-07-04T10:00:00.000Z',
  });
  const sourceWork = createCapturedLibraryWork('work-1', 'file://garak/takes/take-1.m4a');
  const exportedAudio = {
    id: 'export-1',
    kind: 'exported_audio' as const,
    workId: 'work-1',
    title: 'Captured export',
    durationSeconds: 8,
    instrumentNames: ['Janggu'],
    createdAt: '2026-07-04T10:00:00.000Z',
    authorDisplayName: 'Demo_Author',
    sourceLabel: 'shared feed demo',
    audioUri: 'file://garak/takes/take-1.m4a',
    renderKind: 'audio_capture' as const,
    sourceTakeId: 'take-1',
    sourceRecordingUri: 'file://garak/takes/take-1.m4a',
    shareState: 'ready' as const,
  };

  const libraryModel = getMyLibraryViewModel({
    ...state,
    libraryTab: 'shareables',
    selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
    library: {
      ...state.library,
      works: [sourceWork],
      exportedAudios: [exportedAudio],
    },
  });
  const playerModel = getMyLibraryPlayerViewModel({
    ...state,
    selectedPlayerItem: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
    library: {
      ...state.library,
      works: [sourceWork],
      exportedAudios: [exportedAudio],
    },
  });

  expect(libraryModel.playlistRows[0].subtitle).toContain('녹음 파일');
  expect(libraryModel.playlistRows[0].subtitle).toContain('Demo_Author / shared feed demo');
  expect(libraryModel.playlistRows[0].subtitle).not.toContain('쨌');
  expect(playerModel.meta).toContain('녹음 파일');
  expect(playerModel.meta).not.toContain('쨌');
});

function createCapturedLibraryWork(id: string, recordingUri: string): Work {
  return {
    id,
    title: 'Captured source work',
    createdAt: '2026-07-04T10:00:00.000Z',
    updatedAt: '2026-07-04T10:00:00.000Z',
    source: 'free_creation',
    syncState: 'local_only',
    tracks: [
      {
        id: 'track-1',
        kind: 'instrument',
        instrument: 'janggu',
        startedAtBeat: 1,
        volume: 1,
        mute: false,
        solo: false,
        createdAt: '2026-07-04T10:00:00.000Z',
        takes: [
          {
            id: 'take-1',
            events: [{ type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 }],
            recordingUri,
            startedAtBeat: 1,
            durationBeats: 4,
          },
        ],
      },
    ],
  };
}

test('shows each S18 work row storage and sync state', () => {
  const createdAt = '2026-06-18T00:00:00.000Z';
  const model = getMyLibraryViewModel({
    ...createInitialGarakProductState({ now: () => createdAt }),
    library: {
      works: [
        {
          id: 'work-local',
          title: '로컬 작업',
          createdAt,
          updatedAt: '2026-06-18T00:03:00.000Z',
          source: 'free_creation',
          syncState: 'local_only',
          tracks: [],
        },
        {
          id: 'work-synced',
          title: '동기화 작업',
          createdAt,
          updatedAt: '2026-06-18T00:02:00.000Z',
          source: 'synced',
          syncState: 'synced',
          tracks: [],
        },
        {
          id: 'work-account',
          title: '계정 작업',
          createdAt,
          updatedAt: '2026-06-18T00:01:00.000Z',
          source: 'synced',
          syncState: 'account_only',
          tracks: [],
        },
        {
          id: 'work-conflict',
          title: '확인 필요한 작업',
          createdAt,
          updatedAt: '2026-06-18T00:00:00.000Z',
          source: 'synced',
          syncState: 'conflict',
          tracks: [],
        },
      ],
      exportedAudios: [],
      practiceResults: [],
    },
  });

  expect(model.playlistRows.map((row) => [row.title, row.storageLabel])).toEqual([
    ['로컬 작업', '로컬 저장 · 서버 저장 대기'],
    ['동기화 작업', '계정 동기화 완료'],
    ['계정 작업', '계정 저장'],
    ['확인 필요한 작업', '동기화 확인 필요'],
  ]);
});

test('filters the active library tab by search query', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = applyProductAction(state, { type: 'updateLibrarySearchQuery', query: '없는 곡' });

  const model = getMyLibraryViewModel(state);

  expect(model.searchQuery).toBe('없는 곡');
  expect(model.playlistRows).toEqual([]);
  expect(model.emptyState).toMatchObject({
    title: '검색 결과가 없어요.',
    ctaLabel: '검색 지우기',
    action: { type: 'updateLibrarySearchQuery', query: '' },
  });
});

test('filters S18 work rows by visible storage status text', () => {
  const createdAt = '2026-06-18T00:00:00.000Z';
  const model = getMyLibraryViewModel({
    ...createInitialGarakProductState({ now: () => createdAt }),
    librarySearchQuery: '계정 동기화',
    library: {
      works: [
        {
          id: 'work-local',
          title: '로컬 작업',
          createdAt,
          updatedAt: '2026-06-18T00:01:00.000Z',
          source: 'free_creation',
          syncState: 'local_only',
          tracks: [],
        },
        {
          id: 'work-synced',
          title: '동기화 작업',
          createdAt,
          updatedAt: '2026-06-18T00:00:00.000Z',
          source: 'synced',
          syncState: 'synced',
          tracks: [],
        },
      ],
      exportedAudios: [],
      practiceResults: [],
    },
  });

  expect(model.playlistRows.map((row) => row.title)).toEqual(['동기화 작업']);
});

test('routes playable library rows to immediate playback', () => {
  expect(
    getMyLibraryItemAction({
      id: 'work-work-1',
      title: '가야금 작업 1',
      date: '2026.06.18',
      kind: 'work',
      playable: true,
      active: false,
      workId: 'work-1',
    }),
  ).toEqual({
    type: 'playLibraryItemNow',
    item: { kind: 'work', workId: 'work-1' },
  });

  expect(
    getMyLibraryItemAction({
      id: 'export-export-1',
      title: '가야금 작업 1 내보내기',
      date: '2026.06.18',
      kind: 'exportedAudio',
      playable: true,
      active: false,
      exportedAudioId: 'export-1',
    }),
  ).toEqual({
    type: 'playLibraryItemNow',
    item: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
  });

  expect(
    getMyLibraryItemAction({
      id: 'demo-my-arirang',
      title: 'My Arirang',
      date: '2026.06.01',
      kind: 'demo',
      playable: true,
      active: false,
    }),
  ).toEqual({
    type: 'playLibraryItemNow',
    item: { kind: 'demo', title: 'My Arirang', date: '2026.06.01' },
  });
});

test('builds the player detail from the selected my-library item', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = completeCurrentWorkExport(state);

  state = applyProductAction(state, {
    type: 'playLibraryItem',
    item: { kind: 'work', workId: 'work-1' },
  });
  expect(getMyLibraryPlayerViewModel(state)).toMatchObject({
    editWorkId: 'work-1',
    elapsedLabel: '0:13',
    remainingLabel: '-3:01',
    showsAirPlay: true,
    sourceKind: 'work',
    title: state.library.works[0].title,
  });

  state = applyProductAction(state, {
    type: 'playLibraryItem',
    item: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
  });
  expect(getMyLibraryPlayerViewModel(state)).toMatchObject({
    editWorkId: 'work-1',
    sourceKind: 'exportedAudio',
    isPlaying: false,
    title: state.library.exportedAudios[0].title,
  });
});

test('exposes S19 player actions without choosing their visual placement', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = completeCurrentWorkExport(state);

  const actions = getMyLibraryPlayerActions(state);

  expect(actions).toEqual({
    favoriteAction: { type: 'toggleSelectedPlayerFavorite' },
    previousAction: { type: 'playPreviousPlayerItem' },
    playAction: { type: 'playSelectedPlayerItem' },
    pauseAction: undefined,
    nextAction: { type: 'playNextPlayerItem' },
    editAction: { type: 'openSelectedPlayerEditor' },
    shareAction: { type: 'shareSelectedPlayerItem' },
    deleteAction: { type: 'deleteSelectedPlayerItem' },
    airPlayAction: { type: 'activateAirPlay' },
    backAction: { type: 'navigate', target: 'S18' },
  });
  expect(Object.keys(actions)).toEqual([
    'favoriteAction',
    'previousAction',
    'playAction',
    'pauseAction',
    'nextAction',
    'editAction',
    'shareAction',
    'deleteAction',
    'airPlayAction',
    'backAction',
  ]);

  state = applyProductAction(state, { type: 'playSelectedPlayerItem' });

  expect(getMyLibraryPlayerViewModel(state)).toMatchObject({
    isPlaying: true,
    sourceKind: 'exportedAudio',
  });
  expect(getMyLibraryPlayerActions(state)).toMatchObject({
    playAction: undefined,
    pauseAction: { type: 'pauseSelectedPlayerItem' },
  });
});

test('models S19 favorite and AirPlay button state', () => {
  let state = createInitialGarakProductState();

  state = applyProductAction(state, { type: 'navigate', target: 'S18' });
  state = applyProductAction(state, {
    type: 'playLibraryItem',
    item: { kind: 'demo', title: 'My Arirang', date: '2026.06.01' },
  });

  expect(getMyLibraryPlayerViewModel(state)).toMatchObject({
    isFavorite: false,
  });
  expect(getMyLibraryPlayerViewModel(state).airPlayLabel).toContain('AirPlay');

  state = applyProductAction(state, { type: 'toggleSelectedPlayerFavorite' });
  state = applyProductAction(state, { type: 'activateAirPlay' });

  expect(getMyLibraryPlayerViewModel(state)).toMatchObject({
    isFavorite: true,
  });
  expect(getMyLibraryPlayerViewModel(state).airPlayLabel).toContain('AirPlay');
});

test('shows a visible S19 player notice when audio playback fails', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = completeCurrentWorkExport(state);
  state = applyProductAction(state, { type: 'playSelectedPlayerItem' });
  state = applyProductAction(state, {
    type: 'failPlayerPlayback',
    message: 'speaker route unavailable',
  });

  expect(getMyLibraryPlayerViewModel(state)).toMatchObject({
    isPlaying: false,
    playbackNotice: 'Playback unavailable: speaker route unavailable',
  });
  expect(getMyLibraryPlayerActions(state)).toMatchObject({
    playAction: { type: 'playSelectedPlayerItem' },
    pauseAction: undefined,
  });
});

test('does not fall back to another S19 player item when the explicit selection is stale', () => {
  const state = createInitialGarakProductState({
    now: () => '2026-07-04T10:00:00.000Z',
  });
  const playerState = {
    ...state,
    selectedPlayerItem: { kind: 'exportedAudio' as const, exportedAudioId: 'missing-export' },
    library: {
      ...state.library,
      exportedAudios: [
        {
          id: 'export-1',
          kind: 'exported_audio' as const,
          title: 'Available Export',
          durationSeconds: 24,
          instrumentNames: ['Janggu'],
          createdAt: '2026-07-04T10:00:00.000Z',
          audioUri: 'file://garak/export-1.wav',
          shareState: 'ready' as const,
        },
      ],
    },
  };

  expect(getMyLibraryPlayerViewModel(playerState)).toMatchObject({
    title: 'Selected item unavailable',
    sourceKind: 'unavailable',
    isPlaying: false,
    playbackNotice: 'Playback unavailable: Selected audio is unavailable.',
  });
  expect(getMyLibraryPlayerActions(playerState)).toMatchObject({
    playAction: undefined,
    pauseAction: undefined,
    editAction: undefined,
    shareAction: undefined,
    deleteAction: undefined,
  });
});

test('keeps shared recording provenance visible after saving it to the library', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'navigate', target: 'S20' });
  state = applyProductAction(state, { type: 'navigate', target: 'S21' });
  state = applyProductAction(state, { type: 'saveSharedRecording' });
  state = applyProductAction(state, { type: 'selectLibraryTab', tab: 'shareables' });

  const library = getMyLibraryViewModel(state);

  expect(library.playlistRows[0]).toMatchObject({
    kind: 'exportedAudio',
    title: '아침의 아리랑',
    subtitle: 'Minsu_Kim / 공유 피드 데모 / 데모 샘플 / 가야금 / 0:48',
  });

  const player = getMyLibraryPlayerViewModel(state);

  expect(player).toMatchObject({
    sourceKind: 'exportedAudio',
    title: '아침의 아리랑',
    meta: 'Minsu_Kim / 공유 피드 데모 / 데모 샘플 / 사용 악기 가야금 / 0:48',
  });
  expect(player.editWorkId).toBeUndefined();
});

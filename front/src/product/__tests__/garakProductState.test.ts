import { expect, test } from 'vitest';
import {
  applyProductAction,
  createInitialGarakProductState,
  getCurrentScreenSummary,
} from '../garakProductState';

function completeRecordedFreePlay(state: ReturnType<typeof createInitialGarakProductState>) {
  state = applyProductAction(state, { type: 'startPerformanceRecording' });

  return applyProductAction(state, { type: 'completePerformance' });
}

test('starts on the GARAK home in guest free creation mode', () => {
  const state = createInitialGarakProductState();
  const summary = getCurrentScreenSummary(state);

  expect(state.screenFlow.currentScreen).toBe('S01');
  expect(state.account.status).toBe('guest');
  expect(state.selectedMode).toBe('freeCreation');
  expect(summary.title).toBe('GARAK');
  expect(summary.primaryCtas).toContain('Next');
});

test('moves through free creation selection to S05 with an MVP instrument', () => {
  let state = createInitialGarakProductState();

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });

  expect(state.screenFlow.currentScreen).toBe('S05');
  expect(state.selectedInstrument).toBe('janggu');
  expect(getCurrentScreenSummary(state).title).toBe('장구 자유연주');
});

test('uses the visible default free-creation instrument when starting with defaults', () => {
  let state = createInitialGarakProductState();

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });

  expect(state.screenFlow.currentScreen).toBe('S05');
  expect(state.selectedInstrument).toBe('janggu');
  expect(getCurrentScreenSummary(state).title).toBe('장구 자유연주');
});

test('keeps S05 in place and shows guidance when completing without a recorded take', () => {
  let state = createInitialGarakProductState();

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'completePerformance' });

  expect(state.screenFlow.currentScreen).toBe('S05');
  expect(state.library.works).toHaveLength(0);
  expect(state.currentWorkId).toBeUndefined();
  expect(getCurrentScreenSummary(state).description).toContain('저장할 테이크가 없어요');
});

test('completes S05 by auto-saving an editable work and opening S07', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);

  expect(state.screenFlow.currentScreen).toBe('S07');
  expect(state.library.works).toHaveLength(1);
  expect(state.currentWorkId).toBe('work-1');
  expect(state.library.works[0].tracks[0]).toMatchObject({
    kind: 'instrument',
    instrument: 'gayageum',
  });
  expect(state.library.works[0].tracks[0].kind === 'instrument' ? state.library.works[0].tracks[0].takes[0].events : []).toEqual([]);
});

test('keeps live jangdan guide separate from accompaniment track creation', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'openLiveJangdanGuide' });
  state = applyProductAction(state, {
    type: 'applyLiveJangdanGuide',
    presetId: 'semachi',
    bpm: 84,
    volume: 0.6,
  });
  state = completeRecordedFreePlay(state);

  const workAfterLiveGuide = state.library.works[0];
  expect(state.screenFlow.currentScreen).toBe('S07');
  expect(workAfterLiveGuide.tracks).toHaveLength(1);
  expect(workAfterLiveGuide.tracks[0].kind).toBe('instrument');
  expect(
    workAfterLiveGuide.tracks[0].kind === 'instrument'
      ? workAfterLiveGuide.tracks[0].takes[0].liveJangdanGuide
      : undefined,
  ).toEqual({
    presetId: 'semachi',
    bpm: 84,
    volume: 0.6,
    startedAtBeat: 1,
  });

  state = applyProductAction(state, { type: 'addTrack' });
  state = applyProductAction(state, { type: 'chooseAccompanimentTrack' });
  state = applyProductAction(state, {
    type: 'addAccompanimentTrack',
    presetId: 'semachi',
    bpm: 84,
    volume: 0.7,
  });

  expect(state.screenFlow.currentScreen).toBe('S07');
  expect(state.library.works[0].tracks).toHaveLength(2);
  expect(state.library.works[0].tracks[1]).toMatchObject({
    kind: 'accompaniment',
    presetId: 'semachi',
  });
});

test('adds new tracks at the provided playhead beat', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = applyProductAction(state, { type: 'addTrack' });
  state = applyProductAction(state, { type: 'chooseInstrumentTrack', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'applyInstrumentTrack', playheadBeat: 5 });
  state = applyProductAction(state, { type: 'addTrack' });
  state = applyProductAction(state, { type: 'chooseAccompanimentTrack' });
  state = applyProductAction(state, {
    type: 'addAccompanimentTrack',
    presetId: 'semachi',
    bpm: 84,
    volume: 0.7,
    playheadBeat: 9,
  });

  const [, instrumentTrack, accompanimentTrack] = state.library.works[0].tracks;
  expect(instrumentTrack).toMatchObject({
    kind: 'instrument',
    startedAtBeat: 5,
  });
  expect(accompanimentTrack).toMatchObject({
    kind: 'accompaniment',
    startedAtBeat: 9,
  });
});

test('opens a selected library work in S07 and sets it current', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = {
    ...state,
    currentWorkId: undefined,
    screenFlow: {
      currentScreen: 'S18',
      history: ['S01'],
      mode: 'freeCreation',
    },
  };
  state = applyProductAction(state, { type: 'openWork', workId: 'work-1' });

  expect(state.currentWorkId).toBe('work-1');
  expect(state.screenFlow.currentScreen).toBe('S07');
});

test('saves a practice result as a shareable library item without creating a work', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'practice' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectPracticeSong', songId: 'arirang' });
  state = applyProductAction(state, { type: 'selectPracticeInstrument', instrument: 'daegeum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'finishPractice' });
  state = applyProductAction(state, { type: 'savePracticeResult' });

  expect(state.screenFlow.currentScreen).toBe('S18');
  expect(state.library.works).toHaveLength(0);
  expect(state.library.practiceResults).toHaveLength(1);
  expect(state.library.practiceResults[0]).toMatchObject({
    songId: 'arirang',
    instrument: 'daegeum',
    shareState: 'ready',
  });
});

test('shares a practice result by creating a shareable target before opening S17', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'practice' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectPracticeSong', songId: 'doraji' });
  state = applyProductAction(state, { type: 'selectPracticeInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'finishPractice' });
  state = applyProductAction(state, { type: 'sharePracticeResult' });

  expect(state.screenFlow.currentScreen).toBe('S17');
  expect(state.library.works).toHaveLength(0);
  expect(state.library.practiceResults).toHaveLength(1);
  expect(state.library.practiceResults[0]).toMatchObject({
    songId: 'doraji',
    instrument: 'janggu',
    shareState: 'ready',
  });
  expect(state.selectedPlayerItem).toEqual({
    kind: 'practiceResult',
    practiceResultId: state.library.practiceResults[0].id,
  });
});

test('keeps S14 on instrument selection until Next starts practice performance', () => {
  let state = createInitialGarakProductState();

  state = applyProductAction(state, { type: 'selectMode', mode: 'practice' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectPracticeSong', songId: 'arirang' });
  state = applyProductAction(state, { type: 'selectPracticeInstrument', instrument: 'daegeum' });

  expect(state.selectedInstrument).toBe('daegeum');
  expect(state.screenFlow.currentScreen).toBe('S14');

  state = applyProductAction(state, { type: 'next' });

  expect(state.screenFlow.currentScreen).toBe('S15');
});

test('previews a practice song from S13 without choosing it', () => {
  let state = createInitialGarakProductState();

  state = applyProductAction(state, { type: 'selectMode', mode: 'practice' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'previewPracticeSong', songId: 'doraji' });

  expect(state.screenFlow.currentScreen).toBe('S13');
  expect(state.selectedPracticeSongId).toBeUndefined();
  expect(state.previewingPracticeSongId).toBe('doraji');
  expect(getCurrentScreenSummary(state).description).toContain('도라지 샘플');
});

test('starts S15 with a ready practice attempt for the selected song and instrument', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'practice' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectPracticeSong', songId: 'arirang' });
  state = applyProductAction(state, { type: 'selectPracticeInstrument', instrument: 'daegeum' });
  state = applyProductAction(state, { type: 'next' });

  expect(state.screenFlow.currentScreen).toBe('S15');
  expect(state.practiceAttempt).toEqual({
    songId: 'arirang',
    instrument: 'daegeum',
    status: 'ready',
    inputEvents: [],
    timingErrorsMs: [],
  });
});

test('records S15 practice start, pause, restart, and completion without creating a free-creation work', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'practice' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectPracticeSong', songId: 'doraji' });
  state = applyProductAction(state, { type: 'selectPracticeInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });

  state = applyProductAction(state, { type: 'startPractice' });
  expect(state.practiceAttempt).toMatchObject({
    songId: 'doraji',
    instrument: 'janggu',
    status: 'playing',
    startedAt: '2026-06-18T00:00:00.000Z',
  });
  expect(state.screenFlow.currentScreen).toBe('S15');

  state = applyProductAction(state, { type: 'pausePractice' });
  expect(state.practiceAttempt?.status).toBe('paused');
  expect(state.screenFlow.currentScreen).toBe('S15');

  state = applyProductAction(state, { type: 'restartPractice' });
  expect(state.practiceAttempt).toMatchObject({
    songId: 'doraji',
    instrument: 'janggu',
    status: 'playing',
    startedAt: '2026-06-18T00:00:00.000Z',
    inputEvents: [],
    timingErrorsMs: [],
  });

  state = applyProductAction(state, { type: 'finishPractice' });

  expect(state.screenFlow.currentScreen).toBe('S16');
  expect(state.practiceAttempt).toMatchObject({
    songId: 'doraji',
    instrument: 'janggu',
    status: 'completed',
    completedAt: '2026-06-18T00:00:00.000Z',
  });
  expect(state.library.works).toHaveLength(0);
});

test('routes settings login CTA to S23 while preserving local library state', () => {
  let state = createInitialGarakProductState();

  state = applyProductAction(state, { type: 'navigate', target: 'S22' });
  state = applyProductAction(state, { type: 'loginAndLoadMySongs' });

  expect(state.screenFlow.currentScreen).toBe('S23');
  expect(state.account.status).toBe('guest');
  expect(getCurrentScreenSummary(state).primaryCtas).toContain('로그인');
});

test('completes explicit login sync without dropping local library items', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = {
    ...state,
    screenFlow: {
      currentScreen: 'S22',
      history: ['S01'],
      mode: 'freeCreation',
    },
  };
  state = applyProductAction(state, { type: 'loginAndLoadMySongs' });
  state = applyProductAction(state, { type: 'completeLoginSync' });

  expect(state.account.status).toBe('loggedIn');
  expect(state.library.works).toHaveLength(1);
  expect(state.library.works[0].id).toBe('work-1');
  expect(state.screenFlow.currentScreen).toBe('S18');
});

test('remixes a shared demo recording into a new editable reference work', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'navigate', target: 'S20' });
  state = applyProductAction(state, { type: 'navigate', target: 'S21' });
  state = applyProductAction(state, { type: 'remixSharedRecording' });

  expect(state.screenFlow.currentScreen).toBe('S07');
  expect(state.currentWorkId).toBe('work-1');
  expect(state.library.works).toHaveLength(1);
  expect(state.library.works[0]).toMatchObject({
    id: 'work-1',
    title: '아침의 아리랑 리믹스',
    source: 'remix',
    syncState: 'local_only',
  });
  expect(state.library.works[0].tracks).toEqual([
    {
      id: 'track-1',
      kind: 'reference',
      sourceShareId: 'shared-morning-arirang',
      title: '아침의 아리랑',
      authorDisplayName: 'Minsu_Kim',
      sourceLabel: '공유 피드 데모',
      volume: 0.8,
      mute: false,
      solo: false,
      startedAtBeat: 1,
      createdAt: '2026-06-18T00:00:00.000Z',
    },
  ]);
});

test('saves a shared demo recording as a playable library audio item', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'navigate', target: 'S20' });
  state = applyProductAction(state, { type: 'navigate', target: 'S21' });
  state = applyProductAction(state, { type: 'saveSharedRecording' });

  expect(state.screenFlow.currentScreen).toBe('S18');
  expect(state.library.works).toHaveLength(0);
  expect(state.library.exportedAudios).toHaveLength(1);
  expect(state.library.exportedAudios[0]).toMatchObject({
    id: 'export-1',
    kind: 'exported_audio',
    title: '아침의 아리랑',
    durationSeconds: 48,
    instrumentNames: ['가야금'],
    sourceShareId: 'shared-morning-arirang',
    authorDisplayName: 'Minsu_Kim',
    sourceLabel: '공유 피드 데모',
    audioUri: 'placeholder://shared-morning-arirang.wav',
    shareState: 'ready',
  });
  expect(state.library.exportedAudios[0].workId).toBeUndefined();
  expect(state.selectedPlayerItem).toEqual({
    kind: 'exportedAudio',
    exportedAudioId: 'export-1',
  });
});

test('publishes the selected exported audio from S17 and marks it shared', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = applyProductAction(state, { type: 'exportCurrentWork' });
  state = applyProductAction(state, { type: 'navigate', target: 'S17' });
  state = applyProductAction(state, { type: 'publishShareTarget' });

  expect(state.screenFlow.currentScreen).toBe('S20');
  expect(state.library.exportedAudios[0]).toMatchObject({
    id: 'export-1',
    shareState: 'shared',
  });
  expect(state.selectedPlayerItem).toEqual({
    kind: 'exportedAudio',
    exportedAudioId: 'export-1',
  });
});

test('previews the selected S17 share target without publishing it', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = applyProductAction(state, { type: 'exportCurrentWork' });
  state = applyProductAction(state, { type: 'navigate', target: 'S17' });
  state = applyProductAction(state, { type: 'previewShareTarget' });

  expect(state.screenFlow.currentScreen).toBe('S17');
  expect(state.sharePreviewStatus).toBe('playing');
  expect(state.library.exportedAudios[0].shareState).toBe('ready');

  state = applyProductAction(state, { type: 'publishShareTarget' });

  expect(state.screenFlow.currentScreen).toBe('S20');
  expect(state.sharePreviewStatus).toBeUndefined();
});

test('opens S17 from the S19 player for the selected exported audio', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = applyProductAction(state, { type: 'exportCurrentWork' });
  state = applyProductAction(state, { type: 'shareSelectedPlayerItem' });

  expect(state.screenFlow.currentScreen).toBe('S17');
  expect(state.selectedPlayerItem).toEqual({
    kind: 'exportedAudio',
    exportedAudioId: 'export-1',
  });
});

test('opens the original work editor from the S19 player when the export has a work source', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'janggu' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = completeRecordedFreePlay(state);
  state = applyProductAction(state, { type: 'exportCurrentWork' });
  state = applyProductAction(state, { type: 'openSelectedPlayerEditor' });

  expect(state.screenFlow.currentScreen).toBe('S07');
  expect(state.currentWorkId).toBe('work-1');
});

test('publishes the selected practice result from S17 and marks it shared', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'practice' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectPracticeSong', songId: 'doraji' });
  state = applyProductAction(state, { type: 'selectPracticeInstrument', instrument: 'daegeum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'finishPractice' });
  state = applyProductAction(state, { type: 'sharePracticeResult' });
  state = applyProductAction(state, { type: 'publishShareTarget' });

  expect(state.screenFlow.currentScreen).toBe('S20');
  expect(state.library.practiceResults[0]).toMatchObject({
    id: 'practice-1',
    songId: 'doraji',
    instrument: 'daegeum',
    shareState: 'shared',
  });
  expect(state.selectedPlayerItem).toEqual({
    kind: 'practiceResult',
    practiceResultId: 'practice-1',
  });
});

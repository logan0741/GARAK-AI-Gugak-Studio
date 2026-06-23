import { expect, test } from 'vitest';
import {
  applyProductAction,
  createInitialGarakProductState,
  getCurrentScreenSummary,
} from '../garakProductState';

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

test('completes S05 by auto-saving an editable work and opening S07', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'completePerformance' });

  expect(state.screenFlow.currentScreen).toBe('S07');
  expect(state.library.works).toHaveLength(1);
  expect(state.currentWorkId).toBe('work-1');
  expect(state.library.works[0].tracks[0]).toMatchObject({
    kind: 'instrument',
    instrument: 'gayageum',
  });
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
  state = applyProductAction(state, { type: 'completePerformance' });

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
  state = applyProductAction(state, { type: 'completePerformance' });
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
  state = applyProductAction(state, { type: 'completePerformance' });
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
});

test('routes settings login CTA to S23 while preserving local library state', () => {
  let state = createInitialGarakProductState();

  state = applyProductAction(state, { type: 'navigate', target: 'S22' });
  state = applyProductAction(state, { type: 'loginAndLoadMySongs' });

  expect(state.screenFlow.currentScreen).toBe('S23');
  expect(state.account.status).toBe('guest');
  expect(getCurrentScreenSummary(state).primaryCtas).toContain('로그인');
});

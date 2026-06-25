import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import {
  EXCLUDED_SCREEN_IDS,
  IMPLEMENTED_SCREEN_IDS,
  directNavigationTargets,
  implementedScreenDefinitions,
  isDirectNavigationTarget,
} from '../screenDefinitions';
import { createInitialScreenFlowState, transitionScreenFlow } from '../screenFlowMachine';

test('defines the S01-S23 implementation boundary without standalone excluded screens', () => {
  const expectedImplementedScreens = new Set([
    'S01',
    'S02',
    'S03',
    'S04',
    'S04A',
    'S05',
    'S07',
    'S08',
    'S09',
    'S10A',
    'S10B',
    'S13',
    'S14',
    'S15',
    'S16',
    'S17',
    'S18',
    'S19',
    'S20',
    'S21',
    'S22',
    'S23',
  ]);

  expect(new Set(IMPLEMENTED_SCREEN_IDS)).toEqual(expectedImplementedScreens);
  expect(new Set(EXCLUDED_SCREEN_IDS)).toEqual(new Set(['S06', 'S11', 'S12']));
  expect(new Set(Object.keys(implementedScreenDefinitions))).toEqual(expectedImplementedScreens);
});

test('keeps excluded screens out of direct navigation targets', () => {
  expect(directNavigationTargets).not.toContain('S06');
  expect(directNavigationTargets).not.toContain('S11');
  expect(directNavigationTargets).not.toContain('S12');

  expect(isDirectNavigationTarget('S06')).toBe(false);
  expect(isDirectNavigationTarget('S11')).toBe(false);
  expect(isDirectNavigationTarget('S12')).toBe(false);
});

test('defines documented cancel and disable transitions for track and jangdan flows', () => {
  expect(implementedScreenDefinitions.S09.primaryCtas).toEqual(
    expect.arrayContaining(['record', 'apply', 'recordAgain', 'cancel']),
  );
  expect(implementedScreenDefinitions.S09.transitions).toContainEqual({
    action: 'cancel',
    target: 'S07',
  });

  expect(implementedScreenDefinitions.S10A.primaryCtas).toEqual(
    expect.arrayContaining(['preview', 'applyAndReturnToPerformance', 'turnOff']),
  );
  expect(implementedScreenDefinitions.S10A.transitions).toContainEqual({
    action: 'turnOff',
    target: 'S05',
  });

  expect(implementedScreenDefinitions.S10B.primaryCtas).toEqual(
    expect.arrayContaining(['preview', 'addAccompanimentTrack', 'cancel']),
  );
  expect(implementedScreenDefinitions.S10B.transitions).toContainEqual({
    action: 'cancel',
    target: 'S07',
  });
});

test('keeps settings and login sync primary CTAs aligned with the screen-flow document', () => {
  expect(implementedScreenDefinitions.S22.primaryCtas).toEqual(
    expect.arrayContaining(['loginAndLoadMySongs', 'changeLanguage', 'manageLibrary']),
  );
  expect(implementedScreenDefinitions.S23.primaryCtas).toEqual(
    expect.arrayContaining(['login', 'sync', 'importSelected', 'skip']),
  );
});

test('documents S23 skip as returning to the entry surface', () => {
  expect(implementedScreenDefinitions.S23.transitions).toContainEqual({
    action: 'skip',
    target: 'previous',
  });
});

test('defines S01 as the Figma hero entry that opens the S03 mode guide', () => {
  expect(implementedScreenDefinitions.S01.primaryCtas).toEqual([
    'playHero',
    'language',
    'library',
    'shareFeed',
    'settings',
  ]);
  expect(implementedScreenDefinitions.S01.transitions).toContainEqual({
    action: 'introGuide',
    target: 'S03',
  });
  expect(implementedScreenDefinitions.S01.transitions).not.toContainEqual({
    action: 'nextFreeCreation',
    target: 'S04',
  });
  expect(implementedScreenDefinitions.S01.transitions).not.toContainEqual({
    action: 'nextPractice',
    target: 'S13',
  });

  expect(implementedScreenDefinitions.S03.primaryCtas).toEqual([
    'selectFreeCreationMode',
    'selectPracticeMode',
    'next',
  ]);
  expect(implementedScreenDefinitions.S03.transitions).toContainEqual({
    action: 'nextFreeCreation',
    target: 'S04',
  });
  expect(implementedScreenDefinitions.S03.transitions).toContainEqual({
    action: 'nextPractice',
    target: 'S13',
  });
  expect(implementedScreenDefinitions.S03.transitions).not.toContainEqual({
    action: 'skip',
    target: 'S04',
  });
  expect(implementedScreenDefinitions.S03.transitions).not.toContainEqual({
    action: 'nextStep',
    target: 'S05',
  });
});

test('documents S01 hero entry and S03 mode selection as the current authority', () => {
  const screenFlowDoc = readFileSync(
    resolve(process.cwd(), 'docs/product/screen-flow/current-screen-flow.md'),
    'utf8',
  );
  const designDoc = readFileSync(resolve(process.cwd(), 'docs/design/DESIGN.md'), 'utf8');
  const changeDoc = readFileSync(
    resolve(process.cwd(), 'docs/product/screen-flow/changes/2026-06-25-s01-home-hero-entry.md'),
    'utf8',
  );

  expect(screenFlowDoc).toContain('S01 홈은 Figma의 단일 hero entry를 우선한다.');
  expect(screenFlowDoc).toContain('S03 `홈-자유창작모드`에서 `자유창작 모드 / 따라하기 모드`를 선택한다.');
  expect(screenFlowDoc).not.toContain('홈의 1차 선택은 `자유창작 모드 / 따라하기 모드`이다.');
  expect(screenFlowDoc).not.toContain('S01 홈의 따라하기 모드 선택 상태로 흡수한다.');
  expect(designDoc).toContain('홈의 1차 행동은 hero `PLAY` 진입이다.');
  expect(designDoc).not.toContain('홈의 1차 선택은 `자유창작 모드 / 따라하기 모드` segmented control이다.');
  expect(changeDoc).toContain('2026-06-25');
  expect(changeDoc).toContain('S01에서 모드 토글을 제거');
});

test('routes S01 hero entry to S03 mode selection', () => {
  const next = transitionScreenFlow(createInitialScreenFlowState(), {
    type: 'navigate',
    target: 'S03',
  });

  expect(next.currentScreen).toBe('S03');
  expect(next.history).toEqual(['S01']);
});

test('routes S03 Next to S04 when free creation mode is selected', () => {
  const state = transitionScreenFlow(createInitialScreenFlowState({
    currentScreen: 'S03',
    history: ['S01'],
  }), {
    type: 'selectMode',
    mode: 'freeCreation',
  });

  const next = transitionScreenFlow(state, { type: 'next' });

  expect(next.currentScreen).toBe('S04');
  expect(next.history).toEqual(['S01', 'S03']);
});

test('routes S03 Next to S13 when practice mode is selected', () => {
  const state = transitionScreenFlow(createInitialScreenFlowState({
    currentScreen: 'S03',
    history: ['S01'],
  }), {
    type: 'selectMode',
    mode: 'practice',
  });

  const next = transitionScreenFlow(state, { type: 'next' });

  expect(next.currentScreen).toBe('S13');
  expect(next.history).toEqual(['S01', 'S03']);
});

test('allows the S03 mode guide to enter the practice song flow', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S03',
    history: ['S01'],
  });

  const next = transitionScreenFlow(state, { type: 'navigate', target: 'S13' });

  expect(next.currentScreen).toBe('S13');
  expect(next.history).toEqual(['S01', 'S03']);
});

test('rejects S03 mode selection from other screens', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S13',
    history: ['S01'],
    mode: 'practice',
  });

  expect(() =>
    transitionScreenFlow(state, {
      type: 'selectMode',
      mode: 'freeCreation',
    }),
  ).toThrow('selectMode is only available from S03');
});

test('routes S05 completion directly to S07 without entering S06', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S05',
    history: ['S04A'],
  });

  const next = transitionScreenFlow(state, { type: 'completePerformance' });

  expect(next.currentScreen).toBe('S07');
  expect(next.history).toEqual(['S04A', 'S05']);
  expect(next.history).not.toContain('S06');
});

test('routes S10B accompaniment add directly to S07 without entering S11', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S10B',
    history: ['S07', 'S08'],
  });

  const next = transitionScreenFlow(state, { type: 'addAccompanimentTrack' });

  expect(next.currentScreen).toBe('S07');
  expect(next.history).toEqual(['S07', 'S08', 'S10B']);
  expect(next.history).not.toContain('S11');
});

test('routes S22 login CTA to S23', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S22',
    history: ['S01'],
  });

  const next = transitionScreenFlow(state, { type: 'loginCta' });

  expect(next.currentScreen).toBe('S23');
  expect(next.history).toEqual(['S01', 'S22']);
});

test('routes S18 library sync CTA to S23', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S18',
    history: ['S01'],
  });

  const next = transitionScreenFlow(state, { type: 'loginCta' });

  expect(next.currentScreen).toBe('S23');
  expect(next.history).toEqual(['S01', 'S18']);
});

test('supports a push history stack and back transition', () => {
  const state = createInitialScreenFlowState();
  const library = transitionScreenFlow(state, { type: 'navigate', target: 'S18' });
  const detail = transitionScreenFlow(library, { type: 'navigate', target: 'S19' });

  const backToLibrary = transitionScreenFlow(detail, { type: 'back' });
  const backToHome = transitionScreenFlow(backToLibrary, { type: 'back' });

  expect(detail.currentScreen).toBe('S19');
  expect(detail.history).toEqual(['S01', 'S18']);
  expect(backToLibrary.currentScreen).toBe('S18');
  expect(backToLibrary.history).toEqual(['S01']);
  expect(backToHome.currentScreen).toBe('S01');
  expect(backToHome.history).toEqual([]);
});

test('allows direct navigate only through current screen transitions', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S08',
    history: ['S07'],
  });

  const next = transitionScreenFlow(state, { type: 'navigate', target: 'S10B' });

  expect(next.currentScreen).toBe('S10B');
  expect(next.history).toEqual(['S07', 'S08']);
});

test('supports quick access navigation among home, library, share, and settings surfaces', () => {
  const libraryState = createInitialScreenFlowState({
    currentScreen: 'S18',
    history: ['S01'],
  });
  const shareState = createInitialScreenFlowState({
    currentScreen: 'S20',
    history: ['S01'],
  });
  const settingsState = createInitialScreenFlowState({
    currentScreen: 'S22',
    history: ['S01'],
  });

  expect(transitionScreenFlow(libraryState, { type: 'navigate', target: 'S20' }).currentScreen).toBe('S20');
  expect(transitionScreenFlow(libraryState, { type: 'navigate', target: 'S01' }).currentScreen).toBe('S01');
  expect(transitionScreenFlow(libraryState, { type: 'navigate', target: 'S18' })).toEqual(libraryState);

  expect(transitionScreenFlow(shareState, { type: 'navigate', target: 'S18' }).currentScreen).toBe('S18');
  expect(transitionScreenFlow(shareState, { type: 'navigate', target: 'S01' }).currentScreen).toBe('S01');
  expect(transitionScreenFlow(shareState, { type: 'navigate', target: 'S20' })).toEqual(shareState);

  expect(transitionScreenFlow(settingsState, { type: 'navigate', target: 'S18' }).currentScreen).toBe('S18');
  expect(transitionScreenFlow(settingsState, { type: 'navigate', target: 'S20' }).currentScreen).toBe('S20');
  expect(transitionScreenFlow(settingsState, { type: 'navigate', target: 'S01' }).currentScreen).toBe('S01');
});

test('rejects direct navigate to implemented screens that are not reachable from the current screen', () => {
  const state = createInitialScreenFlowState({
    currentScreen: 'S04',
    history: ['S01'],
  });

  expect(() => transitionScreenFlow(state, { type: 'navigate', target: 'S21' })).toThrow(
    'S21 is not reachable from S04',
  );
});

test('rejects direct navigation attempts to excluded screens', () => {
  const state = createInitialScreenFlowState();

  expect(() => transitionScreenFlow(state, { type: 'navigate', target: 'S06' })).toThrow(
    'S06 is excluded from standalone navigation',
  );
  expect(() => transitionScreenFlow(state, { type: 'navigate', target: 'S11' })).toThrow(
    'S11 is excluded from standalone navigation',
  );
  expect(() => transitionScreenFlow(state, { type: 'navigate', target: 'S12' })).toThrow(
    'S12 is excluded from standalone navigation',
  );
});

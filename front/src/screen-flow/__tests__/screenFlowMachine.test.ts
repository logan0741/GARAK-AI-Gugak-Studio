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
  expect(IMPLEMENTED_SCREEN_IDS).toEqual([
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
  expect(EXCLUDED_SCREEN_IDS).toEqual(['S06', 'S11', 'S12']);
  expect(Object.keys(implementedScreenDefinitions)).toEqual([...IMPLEMENTED_SCREEN_IDS]);
});

test('keeps excluded screens out of direct navigation targets', () => {
  expect(directNavigationTargets).not.toContain('S06');
  expect(directNavigationTargets).not.toContain('S11');
  expect(directNavigationTargets).not.toContain('S12');

  expect(isDirectNavigationTarget('S06')).toBe(false);
  expect(isDirectNavigationTarget('S11')).toBe(false);
  expect(isDirectNavigationTarget('S12')).toBe(false);
});

test('routes S01 Next to S04 when free creation mode is selected', () => {
  const state = transitionScreenFlow(createInitialScreenFlowState(), {
    type: 'selectMode',
    mode: 'freeCreation',
  });

  const next = transitionScreenFlow(state, { type: 'next' });

  expect(next.currentScreen).toBe('S04');
  expect(next.history).toEqual(['S01']);
});

test('routes S01 Next to S13 when practice mode is selected', () => {
  const state = transitionScreenFlow(createInitialScreenFlowState(), {
    type: 'selectMode',
    mode: 'practice',
  });

  const next = transitionScreenFlow(state, { type: 'next' });

  expect(next.currentScreen).toBe('S13');
  expect(next.history).toEqual(['S01']);
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

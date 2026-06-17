import {
  ImplementedScreenId,
  ScreenFlowMode,
  isExcludedScreenId,
  isImplementedScreenId,
} from './screenDefinitions';

export type ScreenFlowState = {
  currentScreen: ImplementedScreenId;
  history: ImplementedScreenId[];
  mode: ScreenFlowMode;
};

export type ScreenFlowEvent =
  | { type: 'selectMode'; mode: ScreenFlowMode }
  | { type: 'next' }
  | { type: 'completePerformance' }
  | { type: 'addAccompanimentTrack' }
  | { type: 'loginCta' }
  | { type: 'navigate'; target: string }
  | { type: 'back' };

export function createInitialScreenFlowState(input: Partial<ScreenFlowState> = {}): ScreenFlowState {
  const currentScreen = input.currentScreen ?? 'S01';
  const history = input.history ?? [];

  assertImplementedScreenId(currentScreen);
  history.forEach(assertImplementedScreenId);

  return {
    currentScreen,
    history: [...history],
    mode: input.mode ?? 'freeCreation',
  };
}

export function transitionScreenFlow(state: ScreenFlowState, event: ScreenFlowEvent): ScreenFlowState {
  switch (event.type) {
    case 'selectMode':
      return {
        ...state,
        mode: event.mode,
      };
    case 'next':
      return routeNext(state);
    case 'completePerformance':
      return routeFromScreen(state, 'S05', 'S07', event.type);
    case 'addAccompanimentTrack':
      return routeFromScreen(state, 'S10B', 'S07', event.type);
    case 'loginCta':
      return routeFromScreen(state, 'S22', 'S23', event.type);
    case 'navigate':
      return pushScreen(state, resolveStandaloneNavigationTarget(event.target));
    case 'back':
      return popScreen(state);
  }
}

function routeNext(state: ScreenFlowState): ScreenFlowState {
  if (state.currentScreen !== 'S01') {
    throw new Error(`next is not available from ${state.currentScreen}`);
  }

  return pushScreen(state, state.mode === 'freeCreation' ? 'S04' : 'S13');
}

function routeFromScreen(
  state: ScreenFlowState,
  expectedScreen: ImplementedScreenId,
  target: ImplementedScreenId,
  eventType: ScreenFlowEvent['type'],
): ScreenFlowState {
  if (state.currentScreen !== expectedScreen) {
    throw new Error(`${eventType} is not available from ${state.currentScreen}`);
  }

  return pushScreen(state, target);
}

function pushScreen(state: ScreenFlowState, target: ImplementedScreenId): ScreenFlowState {
  if (state.currentScreen === target) {
    return {
      ...state,
      history: [...state.history],
    };
  }

  return {
    ...state,
    currentScreen: target,
    history: [...state.history, state.currentScreen],
  };
}

function popScreen(state: ScreenFlowState): ScreenFlowState {
  if (state.history.length === 0) {
    return {
      ...state,
      history: [],
    };
  }

  const history = state.history.slice(0, -1);
  const currentScreen = state.history[state.history.length - 1];

  return {
    ...state,
    currentScreen,
    history,
  };
}

function resolveStandaloneNavigationTarget(screenId: string): ImplementedScreenId {
  if (isExcludedScreenId(screenId)) {
    throw new Error(`${screenId} is excluded from standalone navigation`);
  }

  assertImplementedScreenId(screenId);
  return screenId;
}

function assertImplementedScreenId(screenId: string): asserts screenId is ImplementedScreenId {
  if (!isImplementedScreenId(screenId)) {
    throw new Error(`${screenId} is not an implemented screen`);
  }
}

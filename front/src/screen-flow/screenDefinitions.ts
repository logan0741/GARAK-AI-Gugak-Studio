export const IMPLEMENTED_SCREEN_IDS = [
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
] as const;

export const EXCLUDED_SCREEN_IDS = ['S06', 'S11', 'S12'] as const;

export type ImplementedScreenId = (typeof IMPLEMENTED_SCREEN_IDS)[number];
export type ExcludedScreenId = (typeof EXCLUDED_SCREEN_IDS)[number];
export type ScreenId = ImplementedScreenId | ExcludedScreenId;
export type ScreenFlowMode = 'freeCreation' | 'practice';
export type ScreenMvpStatus = 'required' | 'recommended';

export type ScreenTransitionTarget = ImplementedScreenId | 'previous';

export type ScreenTransitionDefinition = {
  action: string;
  target: ScreenTransitionTarget;
};

export type ScreenDefinition = {
  id: ImplementedScreenId;
  name: string;
  mvpStatus: ScreenMvpStatus;
  primaryCtas: readonly string[];
  transitions: readonly ScreenTransitionDefinition[];
};

export type ExcludedScreenDefinition = {
  id: ExcludedScreenId;
  name: string;
  reason: string;
};

export const implementedScreenDefinitions: Record<ImplementedScreenId, ScreenDefinition> = {
  S01: {
    id: 'S01',
    name: 'Home',
    mvpStatus: 'required',
    primaryCtas: ['playHero', 'language', 'library', 'shareFeed', 'settings'],
    transitions: [
      { action: 'language', target: 'S02' },
      { action: 'introGuide', target: 'S03' },
      { action: 'library', target: 'S18' },
      { action: 'shareFeed', target: 'S20' },
      { action: 'settings', target: 'S22' },
    ],
  },
  S02: {
    id: 'S02',
    name: 'Language Switch State',
    mvpStatus: 'required',
    primaryCtas: ['english', 'korean'],
    transitions: [{ action: 'backHome', target: 'S01' }],
  },
  S03: {
    id: 'S03',
    name: 'Mode Guide',
    mvpStatus: 'recommended',
    primaryCtas: ['selectFreeCreationMode', 'selectPracticeMode', 'next'],
    transitions: [
      { action: 'nextFreeCreation', target: 'S04' },
      { action: 'nextPractice', target: 'S13' },
    ],
  },
  S04: {
    id: 'S04',
    name: 'Instrument Select',
    mvpStatus: 'required',
    primaryCtas: ['selectInstrument', 'next'],
    transitions: [{ action: 'next', target: 'S04A' }],
  },
  S04A: {
    id: 'S04A',
    name: 'Performance Defaults',
    mvpStatus: 'required',
    primaryCtas: ['next'],
    transitions: [{ action: 'next', target: 'S05' }],
  },
  S05: {
    id: 'S05',
    name: 'Free Instrument Performance',
    mvpStatus: 'required',
    primaryCtas: ['record', 'complete', 'jangdan', 'layerEdit'],
    transitions: [
      { action: 'completePerformance', target: 'S07' },
      { action: 'jangdan', target: 'S10A' },
      { action: 'layerEdit', target: 'S07' },
    ],
  },
  S07: {
    id: 'S07',
    name: 'Track And Layer Edit',
    mvpStatus: 'required',
    primaryCtas: ['saveWork', 'exportAudio', 'addTrack', 'recordAgain'],
    transitions: [
      { action: 'addTrack', target: 'S08' },
      { action: 'exportAudio', target: 'S19' },
      { action: 'library', target: 'S18' },
    ],
  },
  S08: {
    id: 'S08',
    name: 'Add Track',
    mvpStatus: 'required',
    primaryCtas: ['addInstrumentPerformance', 'addAccompaniment', 'showLockedImportTrackNotice', 'cancel'],
    transitions: [
      { action: 'addInstrumentPerformance', target: 'S09' },
      { action: 'addAccompaniment', target: 'S10B' },
      { action: 'cancel', target: 'S07' },
    ],
  },
  S09: {
    id: 'S09',
    name: 'Record Extra Instrument',
    mvpStatus: 'required',
    primaryCtas: ['record', 'apply', 'recordAgain', 'cancel'],
    transitions: [
      { action: 'apply', target: 'S07' },
      { action: 'cancel', target: 'S07' },
    ],
  },
  S10A: {
    id: 'S10A',
    name: 'Live Jangdan Guide',
    mvpStatus: 'required',
    primaryCtas: ['preview', 'applyAndReturnToPerformance', 'turnOff'],
    transitions: [
      { action: 'applyAndReturnToPerformance', target: 'S05' },
      { action: 'turnOff', target: 'S05' },
    ],
  },
  S10B: {
    id: 'S10B',
    name: 'Create Accompaniment Track',
    mvpStatus: 'required',
    primaryCtas: ['preview', 'addAccompanimentTrack', 'cancel'],
    transitions: [
      { action: 'addAccompanimentTrack', target: 'S07' },
      { action: 'cancel', target: 'S07' },
    ],
  },
  S13: {
    id: 'S13',
    name: 'Practice Song Select',
    mvpStatus: 'required',
    primaryCtas: ['selectArirang', 'selectDoraji', 'selectBoatSong', 'previewPracticeSong'],
    transitions: [{ action: 'selectSong', target: 'S14' }],
  },
  S14: {
    id: 'S14',
    name: 'Practice Instrument Select',
    mvpStatus: 'required',
    primaryCtas: ['selectGayageum', 'selectJanggu', 'selectDaegeum', 'next'],
    transitions: [{ action: 'next', target: 'S15' }],
  },
  S15: {
    id: 'S15',
    name: 'Practice Performance',
    mvpStatus: 'required',
    primaryCtas: ['start', 'pause', 'complete', 'stop', 'restart'],
    transitions: [{ action: 'finishPractice', target: 'S16' }],
  },
  S16: {
    id: 'S16',
    name: 'Practice Result And Feedback',
    mvpStatus: 'required',
    primaryCtas: ['share', 'practiceAgain', 'save', 'chooseAnotherSong'],
    transitions: [
      { action: 'practiceAgain', target: 'S15' },
      { action: 'share', target: 'S17' },
      { action: 'save', target: 'S18' },
      { action: 'chooseAnotherSong', target: 'S13' },
    ],
  },
  S17: {
    id: 'S17',
    name: 'Share Preparation',
    mvpStatus: 'required',
    primaryCtas: ['preview', 'share', 'saveOnly', 'cancel'],
    transitions: [
      { action: 'saveOnly', target: 'S18' },
      { action: 'share', target: 'S20' },
      { action: 'cancel', target: 'previous' },
    ],
  },
  S18: {
    id: 'S18',
    name: 'Library',
    mvpStatus: 'required',
    primaryCtas: ['openWork', 'listen', 'share', 'more', 'search', 'sync'],
    transitions: [
      { action: 'openWork', target: 'S07' },
      { action: 'listen', target: 'S19' },
      { action: 'share', target: 'S17' },
      { action: 'sync', target: 'S23' },
      { action: 'home', target: 'S01' },
      { action: 'shareFeed', target: 'S20' },
    ],
  },
  S19: {
    id: 'S19',
    name: 'Recording Detail Player',
    mvpStatus: 'required',
    primaryCtas: [
      'playSelectedPlayerItem',
      'pauseSelectedPlayerItem',
      'openSelectedPlayerEditor',
      'shareSelectedPlayerItem',
      'deleteSelectedPlayerItem',
    ],
    transitions: [
      { action: 'openSelectedPlayerEditor', target: 'S07' },
      { action: 'shareSelectedPlayerItem', target: 'S17' },
      { action: 'deleteSelectedPlayerItem', target: 'S18' },
      { action: 'backToLibrary', target: 'S18' },
    ],
  },
  S20: {
    id: 'S20',
    name: 'Share Feed',
    mvpStatus: 'recommended',
    primaryCtas: ['play', 'remix', 'save', 'detail'],
    transitions: [
      { action: 'detail', target: 'S21' },
      { action: 'remix', target: 'S07' },
      { action: 'home', target: 'S01' },
      { action: 'library', target: 'S18' },
    ],
  },
  S21: {
    id: 'S21',
    name: 'Shared Recording Detail',
    mvpStatus: 'recommended',
    primaryCtas: ['play', 'remix', 'save'],
    transitions: [
      { action: 'remix', target: 'S07' },
      { action: 'save', target: 'S18' },
      { action: 'backToShareFeed', target: 'S20' },
    ],
  },
  S22: {
    id: 'S22',
    name: 'My And Settings',
    mvpStatus: 'required',
    primaryCtas: ['loginAndLoadMySongs', 'changeLanguage', 'manageLibrary'],
    transitions: [
      { action: 'loginAndLoadMySongs', target: 'S23' },
      { action: 'changeLanguage', target: 'S02' },
      { action: 'manageLibrary', target: 'S18' },
      { action: 'home', target: 'S01' },
      { action: 'shareFeed', target: 'S20' },
    ],
  },
  S23: {
    id: 'S23',
    name: 'Login And Library Sync',
    mvpStatus: 'recommended',
    primaryCtas: ['login', 'sync', 'importSelected', 'skip'],
    transitions: [
      { action: 'sync', target: 'S18' },
      { action: 'importSelected', target: 'S18' },
      { action: 'skip', target: 'previous' },
    ],
  },
};

export const excludedScreenDefinitions: Record<ExcludedScreenId, ExcludedScreenDefinition> = {
  S06: {
    id: 'S06',
    name: 'Performance Completion Confirmation',
    reason: 'S05 completion auto-saves work and returns directly to S07.',
  },
  S11: {
    id: 'S11',
    name: 'Accompaniment Applied Track Edit',
    reason: 'S10B adds the accompaniment track and returns directly to S07.',
  },
  S12: {
    id: 'S12',
    name: 'Practice Mode State',
    reason: 'Practice mode is represented as S03 mode guide selection state.',
  },
};

const directNavigationTargetSet = new Set<ImplementedScreenId>(
  Object.values(implementedScreenDefinitions).flatMap((definition) =>
    definition.transitions.flatMap((transition) =>
      isImplementedScreenId(transition.target) ? [transition.target] : [],
    ),
  ),
);

export const directNavigationTargets = IMPLEMENTED_SCREEN_IDS.filter((screenId) =>
  directNavigationTargetSet.has(screenId),
);

export function isImplementedScreenId(screenId: string): screenId is ImplementedScreenId {
  return (IMPLEMENTED_SCREEN_IDS as readonly string[]).includes(screenId);
}

export function isExcludedScreenId(screenId: string): screenId is ExcludedScreenId {
  return (EXCLUDED_SCREEN_IDS as readonly string[]).includes(screenId);
}

export function isDirectNavigationTarget(screenId: string): screenId is ImplementedScreenId {
  return isImplementedScreenId(screenId) && directNavigationTargetSet.has(screenId);
}

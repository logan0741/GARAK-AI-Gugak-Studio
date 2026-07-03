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
    primaryCtas: [
      'openFreePlayRecordingSetup',
      'startPerformanceRecording',
      'cancelFreePlayRecordingSetup',
      'completePerformance',
      'openLiveJangdanGuide',
      'openLayerEditor',
    ],
    transitions: [
      { action: 'completePerformance', target: 'S07' },
      { action: 'openLiveJangdanGuide', target: 'S10A' },
      { action: 'openLayerEditor', target: 'S07' },
    ],
  },
  S07: {
    id: 'S07',
    name: 'Track And Layer Edit',
    mvpStatus: 'required',
    primaryCtas: ['saveCurrentWork', 'saveAndShareCurrentWork', 'exportCurrentWork', 'addTrack'],
    transitions: [
      { action: 'addTrack', target: 'S08' },
      { action: 'exportCurrentWork', target: 'S19' },
      { action: 'saveAndShareCurrentWork', target: 'S17' },
      { action: 'library', target: 'S18' },
    ],
  },
  S08: {
    id: 'S08',
    name: 'Add Track',
    mvpStatus: 'required',
    primaryCtas: [
      'openInstrumentTrackSelection',
      'chooseInstrumentTrack',
      'chooseAccompanimentTrack',
      'showLockedImportTrackNotice',
      'cancelTrackAdd',
    ],
    transitions: [
      { action: 'chooseInstrumentTrack', target: 'S09' },
      { action: 'chooseAccompanimentTrack', target: 'S10B' },
      { action: 'cancelTrackAdd', target: 'S07' },
    ],
  },
  S09: {
    id: 'S09',
    name: 'Record Extra Instrument',
    mvpStatus: 'required',
    primaryCtas: [
      'startPerformanceRecording',
      'applyInstrumentTrack',
      'restartInstrumentTrackRecording',
      'cancelInstrumentTrack',
    ],
    transitions: [
      { action: 'applyInstrumentTrack', target: 'S07' },
      { action: 'cancelInstrumentTrack', target: 'S07' },
    ],
  },
  S10A: {
    id: 'S10A',
    name: 'Live Jangdan Guide',
    mvpStatus: 'required',
    primaryCtas: ['previewJangdanPreset', 'applyLiveJangdanGuide', 'turnOffLiveJangdanGuide'],
    transitions: [
      { action: 'applyLiveJangdanGuide', target: 'S05' },
      { action: 'turnOffLiveJangdanGuide', target: 'S05' },
    ],
  },
  S10B: {
    id: 'S10B',
    name: 'Create Accompaniment Track',
    mvpStatus: 'required',
    primaryCtas: ['previewJangdanPreset', 'addAccompanimentTrack', 'cancelAccompanimentTrack'],
    transitions: [
      { action: 'addAccompanimentTrack', target: 'S07' },
      { action: 'cancelAccompanimentTrack', target: 'S07' },
    ],
  },
  S13: {
    id: 'S13',
    name: 'Practice Song Select',
    mvpStatus: 'required',
    primaryCtas: ['selectPracticeSong', 'previewPracticeSong'],
    transitions: [{ action: 'selectPracticeSong', target: 'S14' }],
  },
  S14: {
    id: 'S14',
    name: 'Practice Instrument Select',
    mvpStatus: 'required',
    primaryCtas: ['selectPracticeInstrument', 'next'],
    transitions: [{ action: 'next', target: 'S15' }],
  },
  S15: {
    id: 'S15',
    name: 'Practice Performance',
    mvpStatus: 'required',
    primaryCtas: ['startPractice', 'pausePractice', 'restartPractice', 'finishPractice'],
    transitions: [{ action: 'finishPractice', target: 'S16' }],
  },
  S16: {
    id: 'S16',
    name: 'Practice Result And Feedback',
    mvpStatus: 'required',
    primaryCtas: ['practiceAgain', 'savePracticeResult', 'sharePracticeResult', 'chooseAnotherSong'],
    transitions: [
      { action: 'practiceAgain', target: 'S15' },
      { action: 'sharePracticeResult', target: 'S17' },
      { action: 'savePracticeResult', target: 'S18' },
      { action: 'chooseAnotherSong', target: 'S13' },
    ],
  },
  S17: {
    id: 'S17',
    name: 'Share Preparation',
    mvpStatus: 'required',
    primaryCtas: [
      'previewShareTarget',
      'publishShareTarget',
      'saveShareTargetOnly',
      'cancelShareTarget',
    ],
    transitions: [
      { action: 'saveShareTargetOnly', target: 'S18' },
      { action: 'publishShareTarget', target: 'S20' },
      { action: 'cancelShareTarget', target: 'previous' },
    ],
  },
  S18: {
    id: 'S18',
    name: 'Library',
    mvpStatus: 'required',
    primaryCtas: [
      'openWork',
      'playLibraryItem',
      'selectLibraryTab',
      'updateLibrarySearchQuery',
      'loginAndLoadMySongs',
    ],
    transitions: [
      { action: 'openWork', target: 'S07' },
      { action: 'playLibraryItem', target: 'S19' },
      { action: 'loginAndLoadMySongs', target: 'S23' },
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
    primaryCtas: ['playLibraryItem', 'openSharedRecordingDetail'],
    transitions: [
      { action: 'playLibraryItem', target: 'S19' },
      { action: 'openSharedRecordingDetail', target: 'S21' },
      { action: 'home', target: 'S01' },
      { action: 'library', target: 'S18' },
      { action: 'settings', target: 'S22' },
    ],
  },
  S21: {
    id: 'S21',
    name: 'Shared Recording Detail',
    mvpStatus: 'recommended',
    primaryCtas: [
      'playSelectedSharedRecording',
      'pauseSelectedSharedRecording',
      'remixSharedRecording',
      'saveSharedRecording',
    ],
    transitions: [
      { action: 'remixSharedRecording', target: 'S07' },
      { action: 'saveSharedRecording', target: 'S18' },
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
    primaryCtas: ['completeLoginSync', 'skipLoginSync'],
    transitions: [
      { action: 'completeLoginSync', target: 'S18' },
      { action: 'skipLoginSync', target: 'previous' },
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

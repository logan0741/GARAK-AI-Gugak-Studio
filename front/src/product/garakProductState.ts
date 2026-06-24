import { PerformanceEvent } from '../domain/performanceEvent';
import {
  createInitialScreenFlowState,
  ScreenFlowState,
  transitionScreenFlow,
} from '../screen-flow/screenFlowMachine';
import { ImplementedScreenId, ScreenFlowMode } from '../screen-flow/screenDefinitions';
import {
  addAccompanimentTrack,
  addInstrumentTrack,
  autoSaveTakeAsWork,
  createPracticeResult,
  exportWorkAudioPlaceholder,
} from '../studio/studioLibrary';
import {
  ExportedAudio,
  InstrumentId,
  JangdanPresetId,
  PracticeResult,
  Work,
} from '../studio/studioTypes';
import {
  DEFAULT_FREE_CREATION_INSTRUMENT,
  FEATURED_SHARED_RECORDING,
  GARAK_BRAND,
  PRACTICE_SONGS,
  getInstrumentName,
  getPracticeSongTitle,
  PracticeSong,
} from './productFixtures';

export type AccountState = {
  status: 'guest' | 'loggedIn';
};

export type ProductPlayerSelection =
  | { kind: 'work'; workId: string }
  | { kind: 'exportedAudio'; exportedAudioId: string }
  | { kind: 'practiceResult'; practiceResultId: string }
  | { kind: 'demo'; title: string; date?: string };

export type ProductLibraryState = {
  works: Work[];
  exportedAudios: ExportedAudio[];
  practiceResults: PracticeResult[];
};

export type ProductLibraryTab = 'works' | 'shareables';

export type PendingFreePlayTake = {
  events: PerformanceEvent[];
};

export type FreePlayNotice = 'missingTake';

export type PracticeAttemptStatus = 'ready' | 'playing' | 'paused' | 'completed';

export type PracticeAttempt = {
  songId: PracticeSong['id'];
  instrument: InstrumentId;
  status: PracticeAttemptStatus;
  startedAt?: string;
  completedAt?: string;
  inputEvents: PerformanceEvent[];
  timingErrorsMs: number[];
};

export type GarakProductState = {
  screenFlow: ScreenFlowState;
  selectedMode: ScreenFlowMode;
  selectedInstrument?: InstrumentId;
  selectedPracticeSongId?: PracticeSong['id'];
  previewingPracticeSongId?: PracticeSong['id'];
  currentWorkId?: string;
  selectedPlayerItem?: ProductPlayerSelection;
  sharePreviewStatus?: 'playing';
  libraryTab: ProductLibraryTab;
  librarySearchQuery: string;
  pendingFreePlayTake?: PendingFreePlayTake;
  freePlayNotice?: FreePlayNotice;
  practiceAttempt?: PracticeAttempt;
  pendingLiveJangdanGuide?: {
    presetId: JangdanPresetId;
    bpm: number;
    volume: number;
  };
  library: ProductLibraryState;
  account: AccountState;
  counters: {
    work: number;
    track: number;
    take: number;
    export: number;
    practiceResult: number;
  };
  now: () => string;
};

export type GarakProductAction =
  | { type: 'selectMode'; mode: ScreenFlowMode }
  | { type: 'next' }
  | { type: 'selectInstrument'; instrument: InstrumentId }
  | { type: 'startWithDefaults' }
  | { type: 'startPerformanceRecording'; events?: PerformanceEvent[] }
  | { type: 'completePerformance'; events?: PerformanceEvent[] }
  | { type: 'openLiveJangdanGuide' }
  | { type: 'applyLiveJangdanGuide'; presetId: JangdanPresetId; bpm: number; volume: number }
  | { type: 'addTrack' }
  | { type: 'chooseInstrumentTrack'; instrument: InstrumentId }
  | { type: 'applyInstrumentTrack'; events?: PerformanceEvent[]; playheadBeat?: number }
  | { type: 'chooseAccompanimentTrack' }
  | { type: 'addAccompanimentTrack'; presetId: JangdanPresetId; bpm: number; volume: number; playheadBeat?: number }
  | { type: 'exportCurrentWork' }
  | { type: 'previewPracticeSong'; songId: PracticeSong['id'] }
  | { type: 'selectPracticeSong'; songId: PracticeSong['id'] }
  | { type: 'selectPracticeInstrument'; instrument: InstrumentId }
  | { type: 'startPractice' }
  | { type: 'pausePractice' }
  | { type: 'restartPractice' }
  | { type: 'finishPractice' }
  | { type: 'savePracticeResult' }
  | { type: 'sharePracticeResult' }
  | { type: 'shareSelectedPlayerItem' }
  | { type: 'previewShareTarget' }
  | { type: 'publishShareTarget' }
  | { type: 'remixSharedRecording' }
  | { type: 'saveSharedRecording' }
  | { type: 'loginAndLoadMySongs' }
  | { type: 'completeLoginSync' }
  | { type: 'selectLibraryTab'; tab: ProductLibraryTab }
  | { type: 'updateLibrarySearchQuery'; query: string }
  | { type: 'playLibraryItem'; item: ProductPlayerSelection }
  | { type: 'openSelectedPlayerEditor' }
  | { type: 'navigate'; target: ImplementedScreenId }
  | { type: 'back' }
  | { type: 'openWork'; workId: string };

export type ScreenSummary = {
  id: ImplementedScreenId;
  title: string;
  eyebrow: string;
  description: string;
  primaryCtas: string[];
};

export function createInitialGarakProductState(input: { now?: () => string } = {}): GarakProductState {
  return {
    screenFlow: createInitialScreenFlowState(),
    selectedMode: 'freeCreation',
    library: {
      works: [],
      exportedAudios: [],
      practiceResults: [],
    },
    account: {
      status: 'guest',
    },
    libraryTab: 'works',
    librarySearchQuery: '',
    counters: {
      work: 0,
      track: 0,
      take: 0,
      export: 0,
      practiceResult: 0,
    },
    now: input.now ?? (() => new Date().toISOString()),
  };
}

export function applyProductAction(
  state: GarakProductState,
  action: GarakProductAction,
): GarakProductState {
  switch (action.type) {
    case 'playLibraryItem':
      return {
        ...state,
        selectedPlayerItem: action.item,
        screenFlow: transitionScreenFlow(state.screenFlow, {
          type: 'navigate',
          target: 'S19',
        }),
      };
    case 'openSelectedPlayerEditor':
      return openSelectedPlayerEditor(state);
    case 'openWork':
      return {
        ...state,
        currentWorkId: action.workId,
        screenFlow: transitionScreenFlow(state.screenFlow, {
          type: 'navigate',
          target: 'S07',
        }),
      };
    case 'selectMode':
      return {
        ...state,
        selectedMode: action.mode,
        screenFlow: transitionScreenFlow(state.screenFlow, {
          type: 'selectMode',
          mode: action.mode,
        }),
      };
    case 'next':
      if (state.screenFlow.currentScreen === 'S14') {
        return startPracticePerformanceScreen(state);
      }

      return {
        ...state,
        screenFlow: routeProductNext(state),
      };
    case 'selectInstrument':
      return {
        ...state,
        selectedInstrument: action.instrument,
        practiceAttempt: undefined,
      };
    case 'startWithDefaults':
      return {
        ...state,
        selectedInstrument: state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT,
        pendingFreePlayTake: undefined,
        freePlayNotice: undefined,
        screenFlow: pushTarget(state.screenFlow, 'S05'),
      };
    case 'startPerformanceRecording':
      return {
        ...state,
        pendingFreePlayTake: {
          events: action.events ?? [],
        },
        freePlayNotice: undefined,
      };
    case 'completePerformance':
      return completePerformance(state, action.events);
    case 'openLiveJangdanGuide':
      return {
        ...state,
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'navigate', target: 'S10A' }),
      };
    case 'applyLiveJangdanGuide':
      return {
        ...state,
        pendingLiveJangdanGuide: {
          presetId: action.presetId,
          bpm: action.bpm,
          volume: action.volume,
        },
        screenFlow: pushTarget(state.screenFlow, 'S05'),
      };
    case 'addTrack':
      return {
        ...state,
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'navigate', target: 'S08' }),
      };
    case 'chooseInstrumentTrack':
      return {
        ...state,
        selectedInstrument: action.instrument,
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'navigate', target: 'S09' }),
      };
    case 'applyInstrumentTrack':
      return applyInstrumentTrack(state, action.events ?? [], action.playheadBeat);
    case 'chooseAccompanimentTrack':
      return {
        ...state,
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'navigate', target: 'S10B' }),
      };
    case 'addAccompanimentTrack':
      return applyAccompanimentTrack(state, action);
    case 'exportCurrentWork':
      return exportCurrentWork(state);
    case 'previewPracticeSong':
      return {
        ...state,
        previewingPracticeSongId: action.songId,
      };
    case 'selectPracticeSong':
      if (!canSelectPracticeSong(action.songId)) {
        return {
          ...state,
          previewingPracticeSongId: action.songId,
        };
      }

      return {
        ...state,
        selectedPracticeSongId: action.songId,
        previewingPracticeSongId: undefined,
        practiceAttempt: undefined,
        screenFlow: pushTarget(state.screenFlow, 'S14'),
      };
    case 'selectPracticeInstrument':
      return {
        ...state,
        selectedInstrument: action.instrument,
        practiceAttempt: undefined,
      };
    case 'startPractice':
      return startPracticeAttempt(state);
    case 'pausePractice':
      return pausePracticeAttempt(state);
    case 'restartPractice':
      return restartPracticeAttempt(state);
    case 'finishPractice':
      return finishPractice(state);
    case 'savePracticeResult':
      return savePracticeResult(state);
    case 'sharePracticeResult':
      return createPracticeResultAndRoute(state, 'S17');
    case 'shareSelectedPlayerItem':
      return shareSelectedPlayerItem(state);
    case 'previewShareTarget':
      return {
        ...state,
        sharePreviewStatus: 'playing',
      };
    case 'publishShareTarget':
      return publishShareTarget(state);
    case 'remixSharedRecording':
      return remixSharedRecording(state);
    case 'saveSharedRecording':
      return saveSharedRecording(state);
    case 'loginAndLoadMySongs':
      return {
        ...state,
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'loginCta' }),
      };
    case 'completeLoginSync':
      return {
        ...state,
        account: {
          status: 'loggedIn',
        },
        screenFlow: pushTarget(state.screenFlow, 'S18'),
      };
    case 'selectLibraryTab':
      return {
        ...state,
        libraryTab: action.tab,
      };
    case 'updateLibrarySearchQuery':
      return {
        ...state,
        librarySearchQuery: action.query,
      };
    case 'navigate':
      if (action.target === 'S15') {
        return {
          ...state,
          practiceAttempt: createReadyPracticeAttempt(state),
          sharePreviewStatus: undefined,
          screenFlow: transitionScreenFlow(state.screenFlow, {
            type: 'navigate',
            target: action.target,
          }),
        };
      }

      return {
        ...state,
        sharePreviewStatus: undefined,
        screenFlow: transitionScreenFlow(state.screenFlow, {
          type: 'navigate',
          target: action.target,
        }),
      };
    case 'back':
      return {
        ...state,
        sharePreviewStatus: undefined,
        screenFlow: transitionScreenFlow(state.screenFlow, { type: 'back' }),
      };
  }
}

export function getCurrentScreenSummary(state: GarakProductState): ScreenSummary {
  const screenId = state.screenFlow.currentScreen;

  switch (screenId) {
    case 'S01':
      return {
        id: screenId,
        title: GARAK_BRAND.serviceName,
        eyebrow: GARAK_BRAND.subtitle,
        description:
          state.selectedMode === 'freeCreation'
            ? '자유창작 모드에서 가야금, 장구, 대금을 골라 나만의 국악 작업을 시작해요.'
            : '따라하기 모드에서 민요를 고르고 악기별 가이드에 맞춰 연습해요.',
        primaryCtas: ['자유창작 모드', '따라하기 모드', 'Next'],
      };
    case 'S04':
      return summary(screenId, '악기 선택', '자유창작', '가야금, 장구, 대금 중 연주할 악기를 선택해요.', [
        'Next',
      ]);
    case 'S04A':
      return summary(screenId, '연주 기본 설정', getInstrumentLabel(state), '초보자는 기본값으로 바로 시작할 수 있어요.', [
        '기본값으로 시작',
        '직접 조정',
      ]);
    case 'S05':
      return summary(
        screenId,
        `${getInstrumentLabel(state)} 자유연주`,
        '녹음',
        state.freePlayNotice === 'missingTake'
          ? '저장할 테이크가 없어요. 먼저 녹음을 시작해 주세요.'
          : '악기를 직접 연주하고 완료하면 작업으로 자동 저장돼요.',
        ['녹음', '장단', '완료'],
      );
    case 'S07':
      return summary(screenId, '트랙/레이어 편집', currentWorkTitle(state), '작업 위에 악기와 반주 트랙을 레이어로 쌓아요.', [
        '트랙 추가',
        '작업 저장',
        '내보내기',
      ]);
    case 'S08':
      return summary(screenId, '트랙 추가', currentWorkTitle(state), '추가할 트랙 타입을 선택해요.', [
        '악기 연주 추가',
        '장단/반주 추가',
        '가져오기',
      ]);
    case 'S09':
      return summary(screenId, '추가 악기 녹음', getInstrumentLabel(state), '기존 작업을 들으며 새 악기를 덧녹음해요.', [
        '녹음',
        '적용',
        '취소',
      ]);
    case 'S10A':
      return summary(screenId, '라이브 장단 가이드', '연주 보조', '연주 중 들을 장단과 BPM을 정해요.', [
        '미리듣기',
        '적용하고 연주로 돌아가기',
      ]);
    case 'S10B':
      return summary(screenId, '반주 트랙 만들기', currentWorkTitle(state), '작업에 추가할 장단/반주 트랙을 만들어요.', [
        '미리듣기',
        '반주 트랙 추가',
      ]);
    case 'S13':
      return summary(screenId, '민요 선택', '따라하기', practiceSongSelectDescription(state), [
        '아리랑',
        '도라지',
        '뱃노래',
      ]);
    case 'S14':
      return summary(screenId, '따라하기 악기 선택', selectedSongLabel(state), '추천 악기는 배지로만 보여주고 선택은 열어둬요.', [
        '가야금',
        '장구',
        '대금',
      ]);
    case 'S15':
      return summary(
        screenId,
        '따라하기 연주',
        selectedSongLabel(state),
        practiceAttemptDescription(state),
        ['시작', '일시정지', '완주', '다시 시작'],
      );
    case 'S16':
      return summary(screenId, '결과 / AI 피드백', selectedSongLabel(state), '정확도와 로컬 피드백을 확인해요.', [
        '다시 연주',
        '저장',
        '공유',
      ]);
    case 'S17':
      return summary(screenId, '공유 준비', '내보낸 음원 / 결과', '공유할 제목과 미리보기를 확인해요.', [
        '공유하기',
        '저장만 하기',
      ]);
    case 'S18':
      return summary(screenId, '보관함', `${state.library.works.length}개 작업`, '작업과 내보낸 음원/결과를 나눠 관리해요.', [
        '작업 열기',
        '들어보기',
        '공유',
      ]);
    case 'S19':
      return summary(screenId, '연주 상세 / 플레이어', '내보낸 음원', '저장된 결과물을 듣고 공유하거나 편집으로 돌아가요.', [
        '재생',
        '편집으로 열기',
        '공유',
      ]);
    case 'S20':
      return summary(screenId, '쉐어 / 둘러보기', '데모 피드', '다른 GARAK을 듣고 리믹스할 수 있어요.', [
        '재생',
        '리믹스',
        '저장',
      ]);
    case 'S21':
      return summary(screenId, '공유 곡 상세', '쉐어', '공유 곡을 자세히 듣고 리믹스 여부를 결정해요.', [
        '재생',
        '리믹스',
        '저장',
      ]);
    case 'S22':
      return summary(screenId, '마이 / 설정', accountLabel(state), '로그인은 내 곡을 불러올 때만 사용해요.', [
        '로그인하고 내 곡 불러오기',
        '언어 변경',
      ]);
    case 'S23':
      return summary(screenId, '로그인 / 보관함 동기화', '선택 동기화', '로컬 작업을 유지한 채 계정 곡을 불러와요.', [
        '로그인',
        '동기화',
        '건너뛰기',
      ]);
    case 'S02':
      return summary(screenId, '언어 전환', '설정', '한국어와 영어 표시를 바꿔요.', ['한국어', 'English']);
    case 'S03':
      return summary(screenId, '입문 가이드', '연주법', '농현과 추성 같은 기본 제스처를 익혀요.', [
        '다음 단계로',
        '건너뛰기',
      ]);
  }
}

function completePerformance(state: GarakProductState, events?: PerformanceEvent[]): GarakProductState {
  if (state.pendingFreePlayTake === undefined) {
    return {
      ...state,
      freePlayNotice: 'missingTake',
    };
  }

  const nextCounters = incrementCounters(state.counters, ['work', 'track', 'take']);
  const now = state.now();
  const instrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
  const takeEvents = events ?? state.pendingFreePlayTake.events;
  const work = autoSaveTakeAsWork({
    workId: `work-${nextCounters.work}`,
    trackId: `track-${nextCounters.track}`,
    takeId: `take-${nextCounters.take}`,
    title: `${getInstrumentName(instrument)} 작업 ${nextCounters.work}`,
    instrument,
    events: takeEvents,
    createdAt: now,
    startedAtBeat: 1,
    durationBeats: 4,
    liveJangdanGuide: state.pendingLiveJangdanGuide
      ? {
          presetId: state.pendingLiveJangdanGuide.presetId,
          bpm: state.pendingLiveJangdanGuide.bpm,
          volume: state.pendingLiveJangdanGuide.volume,
          startedAtBeat: 1,
        }
      : undefined,
  });

  return {
    ...state,
    counters: nextCounters,
    currentWorkId: work.id,
    pendingFreePlayTake: undefined,
    freePlayNotice: undefined,
    pendingLiveJangdanGuide: undefined,
    library: {
      ...state.library,
      works: [...state.library.works, work],
    },
    screenFlow: transitionScreenFlow(
      state.screenFlow.currentScreen === 'S05'
        ? state.screenFlow
        : pushTarget(state.screenFlow, 'S05'),
      { type: 'completePerformance' },
    ),
  };
}

function routeProductNext(state: GarakProductState): ScreenFlowState {
  if (state.screenFlow.currentScreen === 'S01') {
    return transitionScreenFlow(state.screenFlow, { type: 'next' });
  }

  if (state.screenFlow.currentScreen === 'S04') {
    return pushTarget(state.screenFlow, 'S04A');
  }

  if (state.screenFlow.currentScreen === 'S14') {
    return pushTarget(state.screenFlow, 'S15');
  }

  return state.screenFlow;
}

function startPracticePerformanceScreen(state: GarakProductState): GarakProductState {
  return {
    ...state,
    practiceAttempt: createReadyPracticeAttempt(state),
    screenFlow: pushTarget(state.screenFlow, 'S15'),
  };
}

function createReadyPracticeAttempt(state: GarakProductState): PracticeAttempt {
  const songId = state.selectedPracticeSongId ?? 'arirang';
  const song = PRACTICE_SONGS.find((item) => item.id === songId) ?? PRACTICE_SONGS[0];

  return {
    songId,
    instrument: state.selectedInstrument ?? song.recommendedInstrument,
    status: 'ready',
    inputEvents: [],
    timingErrorsMs: [],
  };
}

function canSelectPracticeSong(songId: PracticeSong['id']): boolean {
  return PRACTICE_SONGS.find((song) => song.id === songId)?.guideReady === true;
}

function startPracticeAttempt(state: GarakProductState): GarakProductState {
  const attempt = state.practiceAttempt ?? createReadyPracticeAttempt(state);

  return {
    ...state,
    practiceAttempt: {
      ...attempt,
      status: 'playing',
      startedAt: attempt.startedAt ?? state.now(),
    },
  };
}

function pausePracticeAttempt(state: GarakProductState): GarakProductState {
  if (state.practiceAttempt?.status !== 'playing') {
    return state;
  }

  return {
    ...state,
    practiceAttempt: {
      ...state.practiceAttempt,
      status: 'paused',
    },
  };
}

function restartPracticeAttempt(state: GarakProductState): GarakProductState {
  return {
    ...state,
    practiceAttempt: {
      ...createReadyPracticeAttempt(state),
      status: 'playing',
      startedAt: state.now(),
    },
  };
}

function finishPractice(state: GarakProductState): GarakProductState {
  const attempt = state.practiceAttempt ?? createReadyPracticeAttempt(state);

  return {
    ...state,
    practiceAttempt: {
      ...attempt,
      status: 'completed',
      startedAt: attempt.startedAt ?? state.now(),
      completedAt: state.now(),
    },
    screenFlow: pushTarget(state.screenFlow, 'S16'),
  };
}

function applyInstrumentTrack(
  state: GarakProductState,
  events: PerformanceEvent[],
  playheadBeat?: number,
): GarakProductState {
  const currentWork = findCurrentWork(state);
  if (currentWork === undefined) {
    return state;
  }

  const nextCounters = incrementCounters(state.counters, ['track', 'take']);
  const now = state.now();
  const nextWork = addInstrumentTrack(currentWork, {
    trackId: `track-${nextCounters.track}`,
    takeId: `take-${nextCounters.take}`,
    instrument: state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT,
    events,
    createdAt: now,
    durationBeats: 4,
    playheadBeat,
  });

  return replaceCurrentWork(state, nextWork, nextCounters, 'S07');
}

function applyAccompanimentTrack(
  state: GarakProductState,
  action: Extract<GarakProductAction, { type: 'addAccompanimentTrack' }>,
): GarakProductState {
  const currentWork = findCurrentWork(state);
  if (currentWork === undefined) {
    return state;
  }

  const nextCounters = incrementCounters(state.counters, ['track']);
  const nextWork = addAccompanimentTrack(currentWork, {
    trackId: `track-${nextCounters.track}`,
    presetId: action.presetId,
    bpm: action.bpm,
    volume: action.volume,
    createdAt: state.now(),
    playheadBeat: action.playheadBeat,
  });

  return replaceCurrentWork(
    state,
    nextWork,
    nextCounters,
    transitionScreenFlow(
      state.screenFlow.currentScreen === 'S10B'
        ? state.screenFlow
        : pushTarget(state.screenFlow, 'S10B'),
      { type: 'addAccompanimentTrack' },
    ),
  );
}

function exportCurrentWork(state: GarakProductState): GarakProductState {
  const currentWork = findCurrentWork(state);
  if (currentWork === undefined) {
    return state;
  }

  const nextCounters = incrementCounters(state.counters, ['export']);
  const exported = exportWorkAudioPlaceholder({
    id: `export-${nextCounters.export}`,
    work: currentWork,
    title: `${currentWork.title} 내보내기`,
    audioUri: `placeholder://export-${nextCounters.export}.wav`,
    durationSeconds: 24,
    createdAt: state.now(),
  });

  return {
    ...state,
    counters: nextCounters,
    library: {
      ...state.library,
      exportedAudios: [...state.library.exportedAudios, exported],
    },
    selectedPlayerItem: {
      kind: 'exportedAudio',
      exportedAudioId: exported.id,
    },
    screenFlow: pushTarget(state.screenFlow, 'S19'),
  };
}

function savePracticeResult(state: GarakProductState): GarakProductState {
  return createPracticeResultAndRoute(state, 'S18');
}

function createPracticeResultAndRoute(
  state: GarakProductState,
  target: ImplementedScreenId,
): GarakProductState {
  const nextCounters = incrementCounters(state.counters, ['practiceResult']);
  const result = createPracticeResult({
    id: `practice-${nextCounters.practiceResult}`,
    songId: state.selectedPracticeSongId ?? 'arirang',
    instrument: state.selectedInstrument ?? 'gayageum',
    accuracyScore: 82,
    timingScore: 78,
    feedback: '박자 흐름이 안정적이에요.',
    createdAt: state.now(),
  });

  return {
    ...state,
    counters: nextCounters,
    library: {
      ...state.library,
      practiceResults: [...state.library.practiceResults, result],
    },
    selectedPlayerItem: {
      kind: 'practiceResult',
      practiceResultId: result.id,
    },
    sharePreviewStatus: undefined,
    screenFlow: pushTarget(state.screenFlow, target),
  };
}

function remixSharedRecording(state: GarakProductState): GarakProductState {
  const nextCounters = incrementCounters(state.counters, ['work', 'track']);
  const createdAt = state.now();
  const work: Work = {
    id: `work-${nextCounters.work}`,
    title: `${FEATURED_SHARED_RECORDING.title} 리믹스`,
    createdAt,
    updatedAt: createdAt,
    source: 'remix',
    syncState: 'local_only',
    tracks: [
      {
        id: `track-${nextCounters.track}`,
        kind: 'reference',
        sourceShareId: FEATURED_SHARED_RECORDING.id,
        title: FEATURED_SHARED_RECORDING.title,
        authorDisplayName: FEATURED_SHARED_RECORDING.authorDisplayName,
        sourceLabel: FEATURED_SHARED_RECORDING.sourceLabel,
        volume: 0.8,
        mute: false,
        solo: false,
        startedAtBeat: 1,
        createdAt,
      },
    ],
  };

  return {
    ...state,
    counters: nextCounters,
    currentWorkId: work.id,
    library: {
      ...state.library,
      works: [...state.library.works, work],
    },
    screenFlow: pushTarget(state.screenFlow, 'S07'),
  };
}

function saveSharedRecording(state: GarakProductState): GarakProductState {
  const nextCounters = incrementCounters(state.counters, ['export']);
  const exported: ExportedAudio = {
    id: `export-${nextCounters.export}`,
    kind: 'exported_audio',
    title: FEATURED_SHARED_RECORDING.title,
    durationSeconds: FEATURED_SHARED_RECORDING.durationSeconds,
    instrumentNames: [getInstrumentName(FEATURED_SHARED_RECORDING.instrument)],
    createdAt: state.now(),
    audioUri: FEATURED_SHARED_RECORDING.audioUri,
    shareState: 'ready',
    sourceShareId: FEATURED_SHARED_RECORDING.id,
    authorDisplayName: FEATURED_SHARED_RECORDING.authorDisplayName,
    sourceLabel: FEATURED_SHARED_RECORDING.sourceLabel,
  };

  return {
    ...state,
    counters: nextCounters,
    library: {
      ...state.library,
      exportedAudios: [...state.library.exportedAudios, exported],
    },
    selectedPlayerItem: {
      kind: 'exportedAudio',
      exportedAudioId: exported.id,
    },
    screenFlow: pushTarget(state.screenFlow, 'S18'),
  };
}

function publishShareTarget(state: GarakProductState): GarakProductState {
  const target = resolveShareTargetSelection(state);

  if (target === undefined) {
    return state;
  }

  if (target.kind === 'exportedAudio') {
    return {
      ...state,
      sharePreviewStatus: undefined,
      library: {
        ...state.library,
        exportedAudios: state.library.exportedAudios.map((audio) =>
          audio.id === target.exportedAudioId ? { ...audio, shareState: 'shared' } : audio,
        ),
      },
      selectedPlayerItem: target,
      screenFlow: pushTarget(state.screenFlow, 'S20'),
    };
  }

  return {
    ...state,
    sharePreviewStatus: undefined,
    library: {
      ...state.library,
      practiceResults: state.library.practiceResults.map((result) =>
        result.id === target.practiceResultId ? { ...result, shareState: 'shared' } : result,
      ),
    },
    selectedPlayerItem: target,
    screenFlow: pushTarget(state.screenFlow, 'S20'),
  };
}

function shareSelectedPlayerItem(state: GarakProductState): GarakProductState {
  const target = resolveShareTargetSelection(state);

  if (target === undefined) {
    return state;
  }

  return {
    ...state,
    selectedPlayerItem: target,
    sharePreviewStatus: undefined,
    screenFlow: pushTarget(state.screenFlow, 'S17'),
  };
}

function openSelectedPlayerEditor(state: GarakProductState): GarakProductState {
  const workId = resolveSelectedPlayerEditWorkId(state);

  if (workId === undefined) {
    return state;
  }

  return {
    ...state,
    currentWorkId: workId,
    screenFlow: pushTarget(state.screenFlow, 'S07'),
  };
}

function resolveSelectedPlayerEditWorkId(state: GarakProductState): string | undefined {
  const selected = state.selectedPlayerItem;

  if (selected?.kind === 'work') {
    return state.library.works.some((work) => work.id === selected.workId)
      ? selected.workId
      : undefined;
  }

  if (selected?.kind === 'exportedAudio') {
    return state.library.exportedAudios.find((audio) => audio.id === selected.exportedAudioId)?.workId;
  }

  return undefined;
}

function resolveShareTargetSelection(
  state: GarakProductState,
): Extract<ProductPlayerSelection, { kind: 'exportedAudio' | 'practiceResult' }> | undefined {
  const selected = state.selectedPlayerItem;

  if (selected?.kind === 'exportedAudio') {
    return state.library.exportedAudios.some((audio) => audio.id === selected.exportedAudioId)
      ? selected
      : undefined;
  }

  if (selected?.kind === 'practiceResult') {
    return state.library.practiceResults.some((result) => result.id === selected.practiceResultId)
      ? selected
      : undefined;
  }

  if (selected !== undefined) {
    return undefined;
  }

  const newestExport = state.library.exportedAudios.map((audio) => ({
    createdAt: audio.createdAt,
    selection: {
      kind: 'exportedAudio',
      exportedAudioId: audio.id,
    } as const,
  }));
  const newestPracticeResult = state.library.practiceResults.map((result) => ({
    createdAt: result.createdAt,
    selection: {
      kind: 'practiceResult',
      practiceResultId: result.id,
    } as const,
  }));

  return [...newestExport, ...newestPracticeResult].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  )[0]?.selection;
}

function replaceCurrentWork(
  state: GarakProductState,
  work: Work,
  counters: GarakProductState['counters'],
  target: ImplementedScreenId | ScreenFlowState,
): GarakProductState {
  return {
    ...state,
    counters,
    library: {
      ...state.library,
      works: state.library.works.map((item) => (item.id === work.id ? work : item)),
    },
    screenFlow: typeof target === 'string' ? pushTarget(state.screenFlow, target) : target,
  };
}

function findCurrentWork(state: GarakProductState): Work | undefined {
  return state.library.works.find((work) => work.id === state.currentWorkId);
}

function pushTarget(screenFlow: ScreenFlowState, target: ImplementedScreenId): ScreenFlowState {
  return transitionScreenFlow(screenFlow, {
    type: 'navigate',
    target,
  });
}

function incrementCounters(
  counters: GarakProductState['counters'],
  fields: Array<keyof GarakProductState['counters']>,
): GarakProductState['counters'] {
  const next = { ...counters };

  for (const field of fields) {
    next[field] += 1;
  }

  return next;
}

function getInstrumentLabel(state: GarakProductState): string {
  return getInstrumentName(state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT);
}

function selectedSongLabel(state: GarakProductState): string {
  return state.selectedPracticeSongId === undefined
    ? '민요'
    : getPracticeSongTitle(state.selectedPracticeSongId);
}

function practiceSongSelectDescription(state: GarakProductState): string {
  if (state.previewingPracticeSongId !== undefined) {
    return `${getPracticeSongTitle(state.previewingPracticeSongId)} 샘플을 미리듣고 있어요. 가이드 준비 상태를 확인한 뒤 선택해요.`;
  }

  return '아리랑, 도라지, 뱃노래 중 연습할 곡을 선택해요.';
}

function practiceAttemptDescription(state: GarakProductState): string {
  switch (state.practiceAttempt?.status) {
    case 'playing':
      return '가이드 하이라이트에 맞춰 연주를 기록하고 있어요.';
    case 'paused':
      return '연습이 일시정지되었어요. 다시 시작하면 처음부터 기록합니다.';
    case 'completed':
      return '완주 기록이 준비되었어요. 결과 화면에서 피드백을 확인해요.';
    case 'ready':
    default:
      return '가이드 하이라이트에 맞춰 연주를 시작해요.';
  }
}

function currentWorkTitle(state: GarakProductState): string {
  return findCurrentWork(state)?.title ?? '새 작업';
}

function accountLabel(state: GarakProductState): string {
  return state.account.status === 'guest' ? '게스트' : '로그인';
}

function summary(
  id: ImplementedScreenId,
  title: string,
  eyebrow: string,
  description: string,
  primaryCtas: string[],
): ScreenSummary {
  return {
    id,
    title,
    eyebrow,
    description,
    primaryCtas,
  };
}

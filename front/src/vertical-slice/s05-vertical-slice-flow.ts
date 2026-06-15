export type GarakMode = 'free-play' | 'practice';

export type GarakScreen =
  | 'home'
  | 'instrument-selection'
  | 'instrument-settings'
  | 'free-play'
  | 'completion-placeholder'
  | 'layer-edit-placeholder'
  | 'practice-placeholder';

export type InstrumentId = '12_string_gayageum' | 'janggu' | 'daegeum';

export type InstrumentSlot =
  | {
      status: 'available';
      instrumentId: InstrumentId;
      label: string;
      description: string;
      sampleStatus: 'ready' | 'bundled-fallback';
    }
  | {
      status: 'locked';
      slotId: 'future-1' | 'future-2';
    };

export type InstrumentSettingControl = {
  key: string;
  label: string;
  defaultValue: string;
};

export type InstrumentSettings = {
  instrumentId: InstrumentId;
  controls: InstrumentSettingControl[];
};

export type PlaySurfaceDescriptor =
  | {
      instrumentId: '12_string_gayageum';
      type: 'strings';
      stringCount: 12;
      gestures: string[];
    }
  | {
      instrumentId: 'janggu';
      type: 'percussion-surfaces';
      surfaces: ['북편', '채편'];
      feedback: string[];
    }
  | {
      instrumentId: 'daegeum';
      type: 'breath-and-fingering';
      includesBreathControl: true;
      feedback: string[];
    };

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'take-ready';

export type TakeDraft = {
  id: string;
  startedAtMs: number;
  stoppedAtMs?: number;
  durationMs: number;
  eventCount: number;
};

export type GarakFlowState = {
  guestMode: true;
  screen: GarakScreen;
  selectedMode: GarakMode;
  homeQuestion: '연주 모드를 선택해요.';
  selectedInstrumentId?: InstrumentId;
  appliedSettings?: InstrumentSettings;
  recordingStatus: RecordingStatus;
  currentTake?: TakeDraft;
  notice?: string;
  jangdanPanelOpen: boolean;
  processingOverlay?: string;
};

export type GarakFlowAction =
  | { type: 'select_mode'; mode: GarakMode }
  | { type: 'press_next' }
  | { type: 'select_instrument'; instrumentId: InstrumentId }
  | { type: 'press_locked_instrument'; slotId: 'future-1' | 'future-2' }
  | { type: 'start_with_defaults' }
  | { type: 'press_record'; nowMs: number }
  | { type: 'press_done'; nowMs: number }
  | { type: 'complete_processing' }
  | { type: 'open_jangdan_panel' }
  | { type: 'close_jangdan_panel' }
  | { type: 'open_layer_edit' }
  | { type: 'dismiss_notice' };

export function createInitialGarakFlowState(): GarakFlowState {
  return {
    guestMode: true,
    screen: 'home',
    selectedMode: 'free-play',
    homeQuestion: '연주 모드를 선택해요.',
    recordingStatus: 'idle',
    jangdanPanelOpen: false,
  };
}

export function getInstrumentSlots(): InstrumentSlot[] {
  return [
    {
      status: 'available',
      instrumentId: '12_string_gayageum',
      label: '가야금',
      description: '12현을 뜯고 쓸며 선율을 만든다.',
      sampleStatus: 'bundled-fallback',
    },
    {
      status: 'available',
      instrumentId: 'janggu',
      label: '장구',
      description: '북편과 채편으로 장단감을 만든다.',
      sampleStatus: 'bundled-fallback',
    },
    {
      status: 'available',
      instrumentId: 'daegeum',
      label: '대금',
      description: '운지와 호흡으로 긴 선율을 만든다.',
      sampleStatus: 'bundled-fallback',
    },
    { status: 'locked', slotId: 'future-1' },
    { status: 'locked', slotId: 'future-2' },
  ];
}

export function getInstrumentLabel(instrumentId: InstrumentId): string {
  switch (instrumentId) {
    case '12_string_gayageum':
      return '가야금';
    case 'janggu':
      return '장구';
    case 'daegeum':
      return '대금';
  }
}

export function getDefaultInstrumentSettings(instrumentId: InstrumentId): InstrumentSettings {
  switch (instrumentId) {
    case '12_string_gayageum':
      return {
        instrumentId,
        controls: [
          { key: 'tuning', label: '조율', defaultValue: '산조 기준' },
          { key: 'touchSensitivity', label: '터치 민감도', defaultValue: '보통' },
          { key: 'reverb', label: '잔향', defaultValue: '자연스럽게' },
        ],
      };
    case 'janggu':
      return {
        instrumentId,
        controls: [
          { key: 'strikeSensitivity', label: '타격 민감도', defaultValue: '보통' },
          { key: 'jangdanTempo', label: '장단 기준 속도', defaultValue: '보통' },
          { key: 'surfaceGuide', label: '타격면 표시', defaultValue: '켜짐' },
        ],
      };
    case 'daegeum':
      return {
        instrumentId,
        controls: [
          { key: 'fingeringMode', label: '운지 입력 방식', defaultValue: '기본' },
          { key: 'breathSensitivity', label: '호흡 입력 민감도', defaultValue: '보통' },
          { key: 'pitchAssist', label: '음정 안정 보조', defaultValue: '약하게' },
        ],
      };
  }
}

export function getPlaySurfaceDescriptor(instrumentId: InstrumentId): PlaySurfaceDescriptor {
  switch (instrumentId) {
    case '12_string_gayageum':
      return {
        instrumentId,
        type: 'strings',
        stringCount: 12,
        gestures: ['현 뜯기', '쓸기', '흔들기', '지음'],
      };
    case 'janggu':
      return {
        instrumentId,
        type: 'percussion-surfaces',
        surfaces: ['북편', '채편'],
        feedback: ['타격 세기', '장단감'],
      };
    case 'daegeum':
      return {
        instrumentId,
        type: 'breath-and-fingering',
        includesBreathControl: true,
        feedback: ['호흡 세기', '운지', '음정 변화', '지속음'],
      };
  }
}

export function advanceGarakFlow(state: GarakFlowState, action: GarakFlowAction): GarakFlowState {
  switch (action.type) {
    case 'select_mode':
      return {
        ...state,
        selectedMode: action.mode,
        notice: undefined,
      };
    case 'press_next':
      return advanceNext(state);
    case 'select_instrument':
      return {
        ...state,
        selectedInstrumentId: action.instrumentId,
        notice: undefined,
      };
    case 'press_locked_instrument':
      return {
        ...state,
        selectedInstrumentId: undefined,
        notice: '새로운 악기가 업데이트될 예정이에요.',
      };
    case 'start_with_defaults':
      return startWithDefaults(state);
    case 'press_record':
      return toggleRecording(state, action.nowMs);
    case 'press_done':
      return finishTake(state, action.nowMs);
    case 'complete_processing':
      if (state.recordingStatus !== 'processing') {
        return state;
      }
      return {
        ...state,
        screen: 'completion-placeholder',
        recordingStatus: 'take-ready',
        processingOverlay: undefined,
      };
    case 'open_jangdan_panel':
      return {
        ...state,
        jangdanPanelOpen: true,
        notice: undefined,
      };
    case 'close_jangdan_panel':
      return {
        ...state,
        jangdanPanelOpen: false,
      };
    case 'open_layer_edit':
      if (state.currentTake === undefined) {
        return {
          ...state,
          notice: '먼저 녹음한 뒤 레이어 편집을 할 수 있어요.',
        };
      }
      return {
        ...state,
        screen: 'layer-edit-placeholder',
        notice: undefined,
      };
    case 'dismiss_notice':
      return {
        ...state,
        notice: undefined,
      };
  }
}

function advanceNext(state: GarakFlowState): GarakFlowState {
  if (state.screen === 'home') {
    return {
      ...state,
      screen: state.selectedMode === 'free-play' ? 'instrument-selection' : 'practice-placeholder',
      notice: undefined,
    };
  }

  if (state.screen === 'instrument-selection') {
    if (state.selectedInstrumentId === undefined) {
      return {
        ...state,
        notice: '연주할 악기를 선택해요.',
      };
    }

    return {
      ...state,
      screen: 'instrument-settings',
      notice: undefined,
    };
  }

  return state;
}

function startWithDefaults(state: GarakFlowState): GarakFlowState {
  if (state.selectedInstrumentId === undefined) {
    return {
      ...state,
      notice: '연주할 악기를 선택해요.',
    };
  }

  return {
    ...state,
    screen: 'free-play',
    appliedSettings: getDefaultInstrumentSettings(state.selectedInstrumentId),
    recordingStatus: 'idle',
    notice: undefined,
  };
}

function toggleRecording(state: GarakFlowState, nowMs: number): GarakFlowState {
  if (state.recordingStatus === 'recording' && state.currentTake !== undefined) {
    return {
      ...state,
      recordingStatus: 'take-ready',
      currentTake: stopTake(state.currentTake, nowMs),
      notice: undefined,
    };
  }

  return {
    ...state,
    recordingStatus: 'recording',
    currentTake: {
      id: `take-${nowMs}`,
      startedAtMs: nowMs,
      durationMs: 0,
      eventCount: 0,
    },
    notice: undefined,
  };
}

function finishTake(state: GarakFlowState, nowMs: number): GarakFlowState {
  if (state.currentTake === undefined) {
    return {
      ...state,
      notice: '저장할 테이크가 없어요.',
    };
  }

  const currentTake =
    state.recordingStatus === 'recording' ? stopTake(state.currentTake, nowMs) : state.currentTake;

  return {
    ...state,
    currentTake,
    recordingStatus: 'processing',
    processingOverlay: '테이크 정리 중...',
    notice: undefined,
  };
}

function stopTake(take: TakeDraft, nowMs: number): TakeDraft {
  return {
    ...take,
    stoppedAtMs: nowMs,
    durationMs: Math.max(0, nowMs - take.startedAtMs),
  };
}

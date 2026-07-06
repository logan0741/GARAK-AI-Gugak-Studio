import type {
  GarakProductAction,
  GarakProductState,
  LivePerformanceAudioStatus,
} from './garakProductState';
import type { InstrumentId } from '../studio/studioTypes';
import { DEFAULT_FREE_CREATION_INSTRUMENT } from './productFixtures';

export type FreePlayPerformanceCaptureModel = {
  captureEnabled: boolean;
  isRecording: boolean;
  liveAudioPlaybackEvidenceLabel?: string;
  recordingCaptureNotice?: string;
  recordingProgressLabel?: string;
};

export type FreePlayLiveAudioStatusModel = {
  tone: 'preparing' | 'ready' | 'failed';
  label: string;
  detailLabel?: string;
  qaReadinessLabel?: string;
  retryAction?: Extract<GarakProductAction, { type: 'retryLivePerformanceAudioPreparation' }>;
  visible?: boolean;
};

export function getFreePlayPerformanceCaptureModel(
  state: GarakProductState,
): FreePlayPerformanceCaptureModel {
  return {
    captureEnabled: true,
    isRecording: state.pendingFreePlayTake !== undefined,
    liveAudioPlaybackEvidenceLabel: getLiveAudioPlaybackEvidenceLabel(state),
    recordingCaptureNotice: getRecordingCaptureNotice(state),
    recordingProgressLabel: getRecordingProgressLabel(state),
  };
}

export function canPlayLivePerformanceEvents(
  state: GarakProductState,
  instrument: InstrumentId = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT,
): boolean {
  const currentInstrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;

  return (
    (state.screenFlow.currentScreen === 'S05' || state.screenFlow.currentScreen === 'S09') &&
    currentInstrument === instrument &&
    state.livePerformanceAudioStatus.status === 'ready' &&
    state.livePerformanceAudioStatus.instrument === instrument
  );
}

export function getFreePlayLiveAudioStatusModel(
  status: LivePerformanceAudioStatus,
): FreePlayLiveAudioStatusModel | undefined {
  switch (status.status) {
    case 'idle':
      return undefined;
    case 'preparing':
      return {
        tone: 'preparing',
        label: '소리 준비 중',
      };
    case 'ready': {
      const playbackEventCount = status.totalPlaybackEventCount ?? status.lastPlaybackEventCount;

      return {
        tone: 'ready',
        label: playbackEventCount === undefined
          ? '소리 준비 완료'
          : `Live audio sent: ${playbackEventCount} events`,
        ...(playbackEventCount === undefined
          ? { qaReadinessLabel: 'Garak live audio ready', visible: false }
          : {}),
      };
    }
    case 'failed':
      return {
        tone: 'failed',
        label: '소리를 재생할 수 없음',
        detailLabel: status.message,
        retryAction: { type: 'retryLivePerformanceAudioPreparation' },
      };
  }
}

function getRecordingProgressLabel(state: GarakProductState): string | undefined {
  const pendingTake = state.pendingFreePlayTake;
  if (pendingTake === undefined) {
    return undefined;
  }

  const eventCount = pendingTake.events.length;
  const parts = ['녹음 중', `이벤트 ${eventCount}개`];

  if (eventCount > 0) {
    const lastEventTsMs = Math.max(...pendingTake.events.map((event) => event.tsMs));
    if (Number.isFinite(lastEventTsMs) && lastEventTsMs > 0) {
      parts.push(`약 ${Math.max(1, Math.ceil(lastEventTsMs / 1000))}초`);
    }
  }

  parts.push(`${pendingTake.recordingSetup.bpm} BPM`);
  return parts.join(' · ');
}

function getLiveAudioPlaybackEvidenceLabel(state: GarakProductState): string | undefined {
  const status = state.livePerformanceAudioStatus;
  const playbackEventCount = status.status === 'ready'
    ? status.totalPlaybackEventCount ?? status.lastPlaybackEventCount
    : undefined;
  if (
    status.status !== 'ready' ||
    playbackEventCount === undefined ||
    status.lastPlaybackAt === undefined
  ) {
    return undefined;
  }

  return `Live audio sent: ${playbackEventCount} events`;
}

function getRecordingCaptureNotice(state: GarakProductState): string | undefined {
  switch (state.recordingCaptureStatus.status) {
    case 'idle':
      return undefined;
    case 'starting':
      return '오디오 캡처 준비 중';
    case 'capturing':
      return '오디오 캡처 중';
    case 'stopping':
      return '오디오 캡처 저장 중';
    case 'failed':
      return `이벤트 녹음만 저장됨: ${state.recordingCaptureStatus.message}`;
  }
}

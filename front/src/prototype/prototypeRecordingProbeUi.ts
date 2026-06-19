import type {
  PrototypeRecordingProbePlaybackResult,
  PrototypeRecordingProbeStartResult,
  PrototypeRecordingProbeStopResult,
} from './prototypeRecordingProbeController';

export type RecordingProbeUiState =
  | { status: 'idle' }
  | PrototypeRecordingProbeStartResult
  | PrototypeRecordingProbeStopResult
  | PrototypeRecordingProbePlaybackResult;

type SelectPlayableRecordingUriInput = {
  recordingProbeState: RecordingProbeUiState;
  sessionRecordingUri?: string;
};

export function selectPlayableRecordingUri(input: SelectPlayableRecordingUriInput): string | null {
  const { recordingProbeState } = input;
  if (
    (recordingProbeState.status === 'captured' || recordingProbeState.status === 'playing') &&
    isNonEmptyString(recordingProbeState.recordingUri)
  ) {
    return recordingProbeState.recordingUri;
  }

  if (
    (recordingProbeState.status === 'captured' || recordingProbeState.status === 'playing') &&
    isNonEmptyString(input.sessionRecordingUri)
  ) {
    return input.sessionRecordingUri;
  }

  return null;
}

export function formatRecordingProbeState(state: RecordingProbeUiState): string {
  switch (state.status) {
    case 'idle':
      return 'idle';
    case 'recording':
      return `recording ${state.requestedDurationSeconds}s`;
    case 'captured':
      return `captured ${state.capturedSeconds}s ${state.recordingUri ?? 'no uri'}`;
    case 'playing':
      return `playing ${state.recordingUri}`;
    case 'unsupported':
      return state.reason;
    case 'failed':
      return `failed: ${state.errorMessage}`;
    default:
      return assertNever(state);
  }
}

export function getRecordingProbeFallbackReason(state: RecordingProbeUiState): string | null {
  if (state.status === 'unsupported') {
    return state.reason;
  }

  if (state.status === 'failed') {
    return state.errorMessage;
  }

  return null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled recording probe state: ${JSON.stringify(value)}`);
}

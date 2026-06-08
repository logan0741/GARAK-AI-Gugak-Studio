import { SamplerEngine } from '../audio/samplerEngine';

type RecordingProbeStartResponse =
  | { ok: true; requestedDurationSeconds: number }
  | { ok: false; reason: string };

type RecordingProbeStopResponse = {
  ok: true;
  capturedSeconds: number;
  recordingUri: string | null;
};

type RecordingProbePlaybackResponse =
  | { ok: true; recordingUri: string }
  | { ok: false; reason: string };

type RecordingProbeCapableEngine = SamplerEngine & {
  startRecordingProbe(durationSeconds: number): Promise<RecordingProbeStartResponse>;
  stopRecordingProbe(): Promise<RecordingProbeStopResponse>;
};

type RecordingProbePlaybackCapableEngine = SamplerEngine & {
  playRecordingProbe(recordingUri: string): Promise<RecordingProbePlaybackResponse>;
};

export type PrototypeRecordingProbeStartResult =
  | { status: 'recording'; requestedDurationSeconds: number }
  | { status: 'unsupported'; reason: 'recording_probe_not_supported' }
  | { status: 'failed'; errorMessage: string };

export type PrototypeRecordingProbeStopResult =
  | { status: 'captured'; capturedSeconds: number; recordingUri: string | null }
  | { status: 'unsupported'; reason: 'recording_probe_not_supported' }
  | { status: 'failed'; errorMessage: string };

export type PrototypeRecordingProbePlaybackResult =
  | { status: 'playing'; recordingUri: string }
  | { status: 'unsupported'; reason: 'recording_playback_probe_not_supported' }
  | { status: 'failed'; errorMessage: string };

export async function startPrototypeRecordingProbe(
  engine: SamplerEngine,
  durationSeconds: number,
): Promise<PrototypeRecordingProbeStartResult> {
  if (!isRecordingProbeCapableEngine(engine)) {
    return { status: 'unsupported', reason: 'recording_probe_not_supported' };
  }

  try {
    const result = await engine.startRecordingProbe(durationSeconds);

    if (!result.ok) {
      return { status: 'failed', errorMessage: result.reason };
    }

    return {
      status: 'recording',
      requestedDurationSeconds: result.requestedDurationSeconds,
    };
  } catch (error: unknown) {
    return { status: 'failed', errorMessage: getErrorMessage(error) };
  }
}

export async function stopPrototypeRecordingProbe(
  engine: SamplerEngine,
): Promise<PrototypeRecordingProbeStopResult> {
  if (!isRecordingProbeCapableEngine(engine)) {
    return { status: 'unsupported', reason: 'recording_probe_not_supported' };
  }

  try {
    const result = await engine.stopRecordingProbe();

    return {
      status: 'captured',
      capturedSeconds: result.capturedSeconds,
      recordingUri: result.recordingUri,
    };
  } catch (error: unknown) {
    return { status: 'failed', errorMessage: getErrorMessage(error) };
  }
}

export async function playCapturedPrototypeRecordingProbe(
  engine: SamplerEngine,
  recordingUri: string,
): Promise<PrototypeRecordingProbePlaybackResult> {
  if (recordingUri.trim().length === 0) {
    return { status: 'failed', errorMessage: 'recording_playback_uri_missing' };
  }

  if (!isRecordingProbePlaybackCapableEngine(engine)) {
    return { status: 'unsupported', reason: 'recording_playback_probe_not_supported' };
  }

  try {
    const result = await engine.playRecordingProbe(recordingUri);

    if (!result.ok) {
      return { status: 'failed', errorMessage: result.reason };
    }

    return {
      status: 'playing',
      recordingUri: result.recordingUri,
    };
  } catch (error: unknown) {
    return { status: 'failed', errorMessage: getErrorMessage(error) };
  }
}

function isRecordingProbeCapableEngine(engine: SamplerEngine): engine is RecordingProbeCapableEngine {
  const candidate = engine as Partial<RecordingProbeCapableEngine>;
  return (
    typeof candidate.startRecordingProbe === 'function' &&
    typeof candidate.stopRecordingProbe === 'function'
  );
}

function isRecordingProbePlaybackCapableEngine(
  engine: SamplerEngine,
): engine is RecordingProbePlaybackCapableEngine {
  const candidate = engine as Partial<RecordingProbePlaybackCapableEngine>;
  return typeof candidate.playRecordingProbe === 'function';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

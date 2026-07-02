export type AudioEngineCandidateId = 'expo-audio' | 'react-native-audio-api';

export type AudioEngineDecision = 'PASS' | 'PASS_WITH_LIMITS' | 'FAIL' | 'NO_GO';

export type AudioEngineEvidenceSource = 'physical-device' | 'emulator' | 'unit-test' | 'estimate';

export type AudioEngineFailedCriterion =
  | 'latency'
  | 'first_touch_latency'
  | 'steady_touch_latency'
  | 'polyphony'
  | 'pitch_bend'
  | 'glissando'
  | 'mute'
  | 'preload'
  | 'session_fallback'
  | 'recording';

export type AudioEngineProbe = {
  candidate: AudioEngineCandidateId;
  evidenceSource: AudioEngineEvidenceSource;
  deviceLabel: string;
  measuredAt: string;
  touchToSoundLatencyMs: number;
  firstTouchLatencyMs?: number;
  steadyTouchLatencyMs?: number;
  maxStableVoices: number;
  pitchBendSmooth: boolean;
  glissandoTriggeredStrings: number;
  muteReleaseClean: boolean;
  preloadStable: boolean;
  sessionFallbackPreserved: boolean;
  recordingCaptureSeconds: number;
};

export type AudioEngineEvaluation = {
  candidate: AudioEngineCandidateId;
  decision: AudioEngineDecision;
  failedCriteria: AudioEngineFailedCriterion[];
  passedCoreCriteria: number;
};

export type AudioEngineSelection = {
  selectedCandidate?: AudioEngineCandidateId;
  decision: AudioEngineDecision;
  reason: string;
};

const MIN_PASSING_STABLE_VOICES = 8;
const MAX_PASSING_TOUCH_LATENCY_MS = 50;
const MAX_PASSING_FIRST_TOUCH_LATENCY_MS = 80;
const REQUIRED_GLISSANDO_STRINGS = 12;
const MIN_RECORDING_SECONDS = 10;
const MIN_CORE_CRITERIA_FOR_CONTINUED_SPIKE = 2;

const DECISION_RANK: Record<AudioEngineDecision, number> = {
  NO_GO: 0,
  FAIL: 1,
  PASS_WITH_LIMITS: 2,
  PASS: 3,
};

const CANDIDATE_PRIORITY: Record<AudioEngineCandidateId, number> = {
  'expo-audio': 0,
  'react-native-audio-api': 1,
};

export function evaluateAudioEngineProbe(probe: AudioEngineProbe): AudioEngineEvaluation {
  const failedCriteria: AudioEngineFailedCriterion[] = [];

  const aggregateLatencyPasses =
    isNonNegativeFiniteNumber(probe.touchToSoundLatencyMs) &&
    probe.touchToSoundLatencyMs <= MAX_PASSING_TOUCH_LATENCY_MS;
  const firstTouchLatencyPasses =
    probe.firstTouchLatencyMs === undefined ||
    (
      isNonNegativeFiniteNumber(probe.firstTouchLatencyMs) &&
      probe.firstTouchLatencyMs <= MAX_PASSING_FIRST_TOUCH_LATENCY_MS
    );
  const steadyTouchLatencyPasses =
    probe.steadyTouchLatencyMs === undefined ||
    (
      isNonNegativeFiniteNumber(probe.steadyTouchLatencyMs) &&
      probe.steadyTouchLatencyMs <= MAX_PASSING_TOUCH_LATENCY_MS
    );
  const latencyPasses = aggregateLatencyPasses && firstTouchLatencyPasses && steadyTouchLatencyPasses;
  const polyphonyPasses =
    isNonNegativeInteger(probe.maxStableVoices) &&
    probe.maxStableVoices >= MIN_PASSING_STABLE_VOICES;
  const pitchBendPasses = probe.pitchBendSmooth === true;
  const glissandoPasses =
    isNonNegativeInteger(probe.glissandoTriggeredStrings) &&
    probe.glissandoTriggeredStrings === REQUIRED_GLISSANDO_STRINGS;
  const mutePasses = probe.muteReleaseClean === true;
  const preloadPasses = probe.preloadStable === true;
  const sessionFallbackPasses = probe.sessionFallbackPreserved === true;
  const recordingPasses =
    isNonNegativeFiniteNumber(probe.recordingCaptureSeconds) &&
    probe.recordingCaptureSeconds >= MIN_RECORDING_SECONDS;

  if (!aggregateLatencyPasses) {
    failedCriteria.push('latency');
  }
  if (!firstTouchLatencyPasses) {
    failedCriteria.push('first_touch_latency');
  }
  if (!steadyTouchLatencyPasses) {
    failedCriteria.push('steady_touch_latency');
  }
  if (!polyphonyPasses) {
    failedCriteria.push('polyphony');
  }
  if (!pitchBendPasses) {
    failedCriteria.push('pitch_bend');
  }
  if (!glissandoPasses) {
    failedCriteria.push('glissando');
  }
  if (!mutePasses) {
    failedCriteria.push('mute');
  }
  if (!preloadPasses) {
    failedCriteria.push('preload');
  }
  if (!sessionFallbackPasses) {
    failedCriteria.push('session_fallback');
  }
  if (!recordingPasses) {
    failedCriteria.push('recording');
  }

  const passedCoreCriteria = [
    latencyPasses,
    polyphonyPasses,
    pitchBendPasses,
    glissandoPasses,
    mutePasses,
  ].filter(Boolean).length;

  return {
    candidate: probe.candidate,
    decision: decide(failedCriteria, passedCoreCriteria),
    failedCriteria,
    passedCoreCriteria,
  };
}

export function selectAudioEngineCandidate(evaluations: AudioEngineEvaluation[]): AudioEngineSelection {
  if (evaluations.length === 0) {
    return {
      decision: 'NO_GO',
      reason: 'no audio engine candidates were evaluated',
    };
  }

  const sorted = [...evaluations].sort((left, right) => {
    const rankDelta = DECISION_RANK[right.decision] - DECISION_RANK[left.decision];
    if (rankDelta !== 0) return rankDelta;
    return CANDIDATE_PRIORITY[right.candidate] - CANDIDATE_PRIORITY[left.candidate];
  });
  const selected = sorted[0];

  if (selected.decision === 'NO_GO') {
    return {
      decision: 'NO_GO',
      reason: 'no candidate met enough core audio criteria to continue the spike',
    };
  }

  if (selected.decision === 'FAIL') {
    return {
      decision: 'FAIL',
      reason: 'no candidate passed the Day 5 engine gate',
    };
  }

  return {
    selectedCandidate: selected.candidate,
    decision: selected.decision,
    reason: `${selected.candidate} has the strongest Day 5 result`,
  };
}

function decide(
  failedCriteria: AudioEngineFailedCriterion[],
  passedCoreCriteria: number,
): AudioEngineDecision {
  if (passedCoreCriteria < MIN_CORE_CRITERIA_FOR_CONTINUED_SPIKE) {
    return 'NO_GO';
  }

  if (failedCriteria.length === 0) {
    return 'PASS';
  }

  if (failedCriteria.length === 1 && failedCriteria[0] === 'recording') {
    return 'PASS_WITH_LIMITS';
  }

  return 'FAIL';
}

function isNonNegativeFiniteNumber(input: number): boolean {
  return Number.isFinite(input) && input >= 0;
}

function isNonNegativeInteger(input: number): boolean {
  return Number.isInteger(input) && input >= 0;
}

import {
  AudioEngineCandidateId,
  AudioEngineProbe,
} from '../audio/audioEngineEvaluation';
import {
  createAudioEngineProbeDraft,
  type PhysicalDeviceAudioEngineProbeMeasurements,
} from '../audio/audioEngineProbeDraft';
import { VoiceState } from '../audio/samplerEngine';
import { PerformanceEvent } from '../domain/performanceEvent';
import { isPhysicalDeviceLabel } from '../qa/physicalDeviceLabel';

export type PrototypeQaSnapshot = {
  candidate: AudioEngineCandidateId;
  deviceLabel: string;
  measuredAt: string;
  eventCount: number;
  eventDispatchLatency: PrototypeEventDispatchLatency;
  maxStableVoices: number;
  glissandoTriggeredStrings: number[];
  pitchBendObserved: boolean;
  muteObserved: boolean;
  audioDispatchFailures: number;
  sessionFallbackPreserved: boolean;
  recordingCaptureSeconds: number | null;
  recordingFallbackReason: string | null;
  recordingPlaybackConfirmed: boolean;
  recordingUriAvailable: boolean;
};

export type PrototypeEventDispatchLatency = {
  sampleCount: number;
  latestMs: number | null;
  maxMs: number | null;
  averageMs: number | null;
};

export type PrototypeProbeDraftInspectorModel = {
  note: string;
  measuredCandidateEvidence: false;
  runtimeUnderTest: 'fake-sampler-engine';
  observedRuntime?: PrototypeRuntimeObservation;
  observedFakeCounters: {
    audioDispatchFailures: number;
    eventDispatchLatency: PrototypeEventDispatchLatency;
    eventCount: number;
    glissandoTriggeredStrings: number;
    maxActiveVoices: number;
    muteObserved: boolean;
    pitchBendObserved: boolean;
    sessionFallbackPreserved: boolean;
  };
  observedPrototypeRecording: {
    capturedSeconds: number | null;
    fallbackReason: string | null;
    playbackConfirmed: boolean;
    uriAvailable: boolean;
  };
  probeTemplate: {
    candidate: AudioEngineCandidateId;
    evidenceSource: 'estimate';
    deviceLabel: string;
    measuredAt: string;
    touchToSoundLatencyMs: null;
    maxStableVoices: null;
    pitchBendSmooth: null;
    glissandoTriggeredStrings: null;
    muteReleaseClean: null;
    preloadStable: null;
    sessionFallbackPreserved: null;
    recordingCaptureSeconds: null;
  };
};

export type PrototypeProbeHandoffMeasurementTemplate = {
  [Field in keyof PhysicalDeviceAudioEngineProbeMeasurements]: null;
};

export type PrototypeProbeHandoffTemplateModel = {
  generatedAt: string;
  entries: [
    {
      inspectorDraft: PrototypeProbeDraftInspectorModel;
      measuredAt: string;
      deviceLabel: string;
      measurements: PrototypeProbeHandoffMeasurementTemplate;
    },
  ];
};

export type PrototypeRuntimeObservation = {
  requestedCandidate: AudioEngineCandidateId;
  activeRuntime: 'fake-prototype' | AudioEngineCandidateId;
  unexpectedStringIndexes?: number[];
  runtimeStatus:
    | 'missing_sample_manifest'
    | 'duplicate_sample_manifest'
    | 'invalid_sample_manifest'
    | 'native_candidate_preloading'
    | 'native_candidate_failed'
    | 'native_candidate_ready';
  nativePreloadStatus: 'not_started' | 'preloading' | 'failed' | 'ready';
  sampleManifestVersion: string | null;
  preloadErrorMessage?: string;
};

const PROTOTYPE_DRAFT_NOTE =
  'Estimate draft from fake prototype engine counters. Replace with physical-device candidate measurements before Day 5 handoff.';
export const PROTOTYPE_DEVICE_LABEL_PLACEHOLDER = 'replace-with-physical-device-model';
const EMPTY_EVENT_DISPATCH_LATENCY: PrototypeEventDispatchLatency = {
  sampleCount: 0,
  latestMs: null,
  maxMs: null,
  averageMs: null,
};

export function createInitialPrototypeQaSnapshot(input: {
  candidate: AudioEngineCandidateId;
  deviceLabel: string;
  measuredAt: string;
}): PrototypeQaSnapshot {
  return {
    candidate: input.candidate,
    deviceLabel: input.deviceLabel,
    measuredAt: input.measuredAt,
    eventCount: 0,
    eventDispatchLatency: EMPTY_EVENT_DISPATCH_LATENCY,
    maxStableVoices: 0,
    glissandoTriggeredStrings: [],
    pitchBendObserved: false,
    muteObserved: false,
    audioDispatchFailures: 0,
    sessionFallbackPreserved: false,
    recordingCaptureSeconds: null,
    recordingFallbackReason: null,
    recordingPlaybackConfirmed: false,
    recordingUriAvailable: false,
  };
}

export function createPrototypeQaSnapshotForCandidateChange(input: {
  candidate: AudioEngineCandidateId;
  deviceLabel: string;
  measuredAt: string;
}): PrototypeQaSnapshot {
  return createInitialPrototypeQaSnapshot({
    candidate: input.candidate,
    deviceLabel: normalizePrototypeQaDeviceLabel(input.deviceLabel),
    measuredAt: input.measuredAt,
  });
}

export function updatePrototypeQaSnapshot(
  snapshot: PrototypeQaSnapshot,
  input: {
    events: PerformanceEvent[];
    activeVoiceCount: number;
    audioDispatchOk: boolean;
    dispatchedAtMs?: number;
    measuredAt: string;
  },
): PrototypeQaSnapshot {
  return {
    ...snapshot,
    measuredAt: input.measuredAt,
    eventCount: snapshot.eventCount + input.events.length,
    eventDispatchLatency: updateEventDispatchLatency(snapshot.eventDispatchLatency, input),
    maxStableVoices: updateMaxStableVoices(snapshot.maxStableVoices, input.activeVoiceCount),
    glissandoTriggeredStrings: collectGlissandoStringIndexes(
      snapshot.glissandoTriggeredStrings,
      input.events,
    ),
    pitchBendObserved:
      snapshot.pitchBendObserved || input.events.some((event) => event.type === 'string_bend'),
    muteObserved:
      snapshot.muteObserved || input.events.some((event) => event.type === 'string_mute'),
    audioDispatchFailures: snapshot.audioDispatchFailures + (input.audioDispatchOk ? 0 : 1),
    sessionFallbackPreserved:
      snapshot.sessionFallbackPreserved || (!input.audioDispatchOk && input.events.length > 0),
  };
}

export function updatePrototypeQaDeviceLabel(
  snapshot: PrototypeQaSnapshot,
  input: {
    deviceLabel: string;
    measuredAt: string;
  },
): PrototypeQaSnapshot {
  return {
    ...snapshot,
    deviceLabel: normalizePrototypeQaDeviceLabel(input.deviceLabel),
    measuredAt: input.measuredAt,
  };
}

export function buildPrototypeProbeDraft(snapshot: PrototypeQaSnapshot): AudioEngineProbe {
  return createAudioEngineProbeDraft({
    candidate: snapshot.candidate,
    deviceLabel: snapshot.deviceLabel,
    measuredAt: snapshot.measuredAt,
    maxStableVoices: snapshot.maxStableVoices,
    glissandoTriggeredStrings: snapshot.glissandoTriggeredStrings.length,
    sessionFallbackPreserved: snapshot.sessionFallbackPreserved,
  });
}

export function recordPrototypeRecordingCapture(
  snapshot: PrototypeQaSnapshot,
  input: {
    capturedSeconds: number;
    measuredAt: string;
    recordingUri: string | null;
  },
): PrototypeQaSnapshot {
  const recordingUriAvailable = isNonEmptyString(input.recordingUri);
  const capturedSeconds = normalizeCapturedSeconds(input.capturedSeconds);

  return {
    ...snapshot,
    measuredAt: input.measuredAt,
    recordingCaptureSeconds: capturedSeconds,
    recordingFallbackReason: getRecordingCaptureFallbackReason({
      capturedSeconds,
      recordingUriAvailable,
    }),
    recordingPlaybackConfirmed: false,
    recordingUriAvailable,
  };
}

export function recordPrototypeRecordingStart(
  snapshot: PrototypeQaSnapshot,
  input: {
    measuredAt: string;
  },
): PrototypeQaSnapshot {
  return {
    ...snapshot,
    measuredAt: input.measuredAt,
    recordingCaptureSeconds: null,
    recordingFallbackReason: null,
    recordingPlaybackConfirmed: false,
    recordingUriAvailable: false,
  };
}

export function recordPrototypeRecordingFallback(
  snapshot: PrototypeQaSnapshot,
  input: {
    fallbackReason: string;
    measuredAt: string;
  },
): PrototypeQaSnapshot {
  return {
    ...snapshot,
    measuredAt: input.measuredAt,
    recordingCaptureSeconds: null,
    recordingFallbackReason: normalizeRecordingFallbackReason(input.fallbackReason),
    recordingPlaybackConfirmed: false,
    recordingUriAvailable: false,
  };
}

export function recordPrototypeRecordingPlayback(
  snapshot: PrototypeQaSnapshot,
  input: {
    measuredAt: string;
    playbackConfirmed: boolean;
  },
): PrototypeQaSnapshot {
  const hasCurrentPlayableCapture =
    snapshot.recordingCaptureSeconds !== null &&
    snapshot.recordingUriAvailable &&
    snapshot.recordingFallbackReason === null;

  return {
    ...snapshot,
    measuredAt: input.measuredAt,
    recordingPlaybackConfirmed:
      hasCurrentPlayableCapture &&
      (snapshot.recordingPlaybackConfirmed || input.playbackConfirmed),
  };
}

export function formatPrototypeProbeDraftForInspector(
  snapshot: PrototypeQaSnapshot,
  runtimeObservation?: PrototypeRuntimeObservation,
): string {
  return JSON.stringify(createPrototypeProbeDraftInspectorModel(snapshot, runtimeObservation), null, 2);
}

export function formatPrototypeProbeHandoffTemplateForInspector(
  snapshot: PrototypeQaSnapshot,
  runtimeObservation?: PrototypeRuntimeObservation,
): string {
  return JSON.stringify(
    createPrototypeProbeHandoffTemplateModel(snapshot, runtimeObservation),
    null,
    2,
  );
}

export function countPrototypeAudibleVoices(voices: VoiceState[]): number {
  return voices.filter((voice) => voice.envelopeState === 'attack' || voice.envelopeState === 'sustain').length;
}

function createPrototypeProbeHandoffTemplateModel(
  snapshot: PrototypeQaSnapshot,
  runtimeObservation?: PrototypeRuntimeObservation,
): PrototypeProbeHandoffTemplateModel {
  return {
    generatedAt: snapshot.measuredAt,
    entries: [
      {
        inspectorDraft: createPrototypeProbeDraftInspectorModel(snapshot, runtimeObservation),
        measuredAt: snapshot.measuredAt,
        deviceLabel: snapshot.deviceLabel,
        measurements: createEmptyPhysicalMeasurementTemplate(),
      },
    ],
  };
}

function createPrototypeProbeDraftInspectorModel(
  snapshot: PrototypeQaSnapshot,
  runtimeObservation?: PrototypeRuntimeObservation,
): PrototypeProbeDraftInspectorModel {
  return {
    note: PROTOTYPE_DRAFT_NOTE,
    measuredCandidateEvidence: false,
    runtimeUnderTest: 'fake-sampler-engine',
    ...(runtimeObservation ? { observedRuntime: runtimeObservation } : {}),
    observedFakeCounters: {
      audioDispatchFailures: snapshot.audioDispatchFailures,
      eventDispatchLatency: snapshot.eventDispatchLatency,
      eventCount: snapshot.eventCount,
      glissandoTriggeredStrings: snapshot.glissandoTriggeredStrings.length,
      maxActiveVoices: snapshot.maxStableVoices,
      muteObserved: snapshot.muteObserved,
      pitchBendObserved: snapshot.pitchBendObserved,
      sessionFallbackPreserved: snapshot.sessionFallbackPreserved,
    },
    observedPrototypeRecording: {
      capturedSeconds: snapshot.recordingCaptureSeconds,
      fallbackReason: snapshot.recordingFallbackReason,
      playbackConfirmed: snapshot.recordingPlaybackConfirmed,
      uriAvailable: snapshot.recordingUriAvailable,
    },
    probeTemplate: {
      candidate: snapshot.candidate,
      evidenceSource: 'estimate',
      deviceLabel: snapshot.deviceLabel,
      measuredAt: snapshot.measuredAt,
      touchToSoundLatencyMs: null,
      maxStableVoices: null,
      pitchBendSmooth: null,
      glissandoTriggeredStrings: null,
      muteReleaseClean: null,
      preloadStable: null,
      sessionFallbackPreserved: null,
      recordingCaptureSeconds: null,
    },
  };
}

function createEmptyPhysicalMeasurementTemplate(): PrototypeProbeHandoffMeasurementTemplate {
  return {
    touchToSoundLatencyMs: null,
    maxStableVoices: null,
    pitchBendSmooth: null,
    glissandoTriggeredStrings: null,
    muteReleaseClean: null,
    preloadStable: null,
    sessionFallbackPreserved: null,
    recordingCaptureSeconds: null,
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizePrototypeQaDeviceLabel(deviceLabel: string): string {
  const trimmed = deviceLabel.trim();

  return isPhysicalDeviceLabel(trimmed) ? trimmed : PROTOTYPE_DEVICE_LABEL_PLACEHOLDER;
}

function normalizeCapturedSeconds(capturedSeconds: number): number {
  if (!Number.isFinite(capturedSeconds) || capturedSeconds < 0) {
    return 0;
  }

  return capturedSeconds;
}

function getRecordingCaptureFallbackReason(input: {
  capturedSeconds: number;
  recordingUriAvailable: boolean;
}): string | null {
  if (input.capturedSeconds === 0) {
    return 'recording_capture_duration_invalid';
  }

  if (!input.recordingUriAvailable) {
    return 'recording_playback_uri_missing';
  }

  return null;
}

function normalizeRecordingFallbackReason(fallbackReason: string): string {
  const trimmed = fallbackReason.trim();

  return trimmed.length > 0 ? trimmed : 'recording_probe_failed';
}

function updateEventDispatchLatency(
  current: PrototypeEventDispatchLatency,
  input: {
    events: PerformanceEvent[];
    dispatchedAtMs?: number;
  },
): PrototypeEventDispatchLatency {
  if (
    input.dispatchedAtMs === undefined ||
    !Number.isFinite(input.dispatchedAtMs) ||
    input.events.length === 0
  ) {
    return current;
  }

  const firstEventTsMs = Math.min(...input.events.map((event) => event.tsMs));
  if (!Number.isFinite(firstEventTsMs)) {
    return current;
  }

  const latestMs = roundLatencyMs(Math.max(0, input.dispatchedAtMs - firstEventTsMs));
  const sampleCount = current.sampleCount + 1;
  const previousTotalMs = (current.averageMs ?? 0) * current.sampleCount;
  const averageMs = roundLatencyMs((previousTotalMs + latestMs) / sampleCount);

  return {
    sampleCount,
    latestMs,
    maxMs: current.maxMs === null ? latestMs : Math.max(current.maxMs, latestMs),
    averageMs,
  };
}

function updateMaxStableVoices(current: number, activeVoiceCount: number): number {
  if (!Number.isInteger(activeVoiceCount) || activeVoiceCount < 0) {
    return current;
  }

  return Math.max(current, activeVoiceCount);
}

function roundLatencyMs(value: number): number {
  return Math.round(value * 100) / 100;
}

function collectGlissandoStringIndexes(
  current: number[],
  events: PerformanceEvent[],
): number[] {
  const next = new Set(current);

  for (const event of events) {
    if (event.type === 'glissando_step') {
      next.add(event.stringIndex);
    }
  }

  return [...next].sort((left, right) => left - right);
}

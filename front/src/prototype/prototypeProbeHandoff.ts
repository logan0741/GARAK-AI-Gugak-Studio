import { AudioEngineProbe } from '../audio/audioEngineEvaluation';
import {
  PhysicalDeviceAudioEngineProbeMeasurements,
  promoteAudioEngineProbeDraftToPhysicalDevice,
} from '../audio/audioEngineProbeDraft';
import { AudioEngineProbeRecord } from '../audio/audioEngineProbeRecord';
import {
  isPhysicalDeviceLabel,
  normalizePhysicalDeviceLabelForReport,
} from '../qa/physicalDeviceLabel';
import { PrototypeProbeDraftInspectorModel } from './prototypeQaSnapshot';
import { PROTOTYPE_GAYAGEUM_SAMPLE_MANIFEST_VERSION } from './prototypeSampleManifest';

export type PhysicalDevicePrototypeProbeHandoffInput = {
  inspectorDraft: PrototypeProbeDraftInspectorModel;
  measurements: PhysicalDeviceAudioEngineProbeMeasurements;
  measuredAt?: string;
  deviceLabel?: string;
};

export function buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts(input: {
  generatedAt: string;
  entries: PhysicalDevicePrototypeProbeHandoffInput[];
}): AudioEngineProbeRecord {
  return {
    generatedAt: input.generatedAt,
    probes: input.entries.map(buildPhysicalDeviceProbeFromPrototypeInspectorDraft),
  };
}

export function buildPhysicalDeviceProbeFromPrototypeInspectorDraft(
  input: PhysicalDevicePrototypeProbeHandoffInput,
): AudioEngineProbe {
  assertInspectorDraftEstimateGuard(input.inspectorDraft);
  assertObservedRuntimeReady(input.inspectorDraft);
  assertPrototypeHandoffDeviceLabel(input);
  assertPrototypeRecordingEvidenceConsistency(input);

  const draft = input.inspectorDraft.probeTemplate;

  return promoteAudioEngineProbeDraftToPhysicalDevice({
    draft: {
      candidate: draft.candidate,
      evidenceSource: draft.evidenceSource,
      deviceLabel: draft.deviceLabel,
      measuredAt: draft.measuredAt,
      touchToSoundLatencyMs: 0,
      maxStableVoices: 0,
      pitchBendSmooth: false,
      glissandoTriggeredStrings: 0,
      muteReleaseClean: false,
      preloadStable: false,
      sessionFallbackPreserved: false,
      recordingCaptureSeconds: 0,
    },
    deviceLabel: input.deviceLabel,
    measuredAt: input.measuredAt,
    measurements: input.measurements,
  });
}

export function isPrototypeObservedRuntimeReady(
  inspectorDraft: PrototypeProbeDraftInspectorModel,
): boolean {
  const { observedRuntime, probeTemplate } = inspectorDraft;

  return (
    !!observedRuntime &&
    observedRuntime.requestedCandidate === probeTemplate.candidate &&
    observedRuntime.activeRuntime === probeTemplate.candidate &&
    observedRuntime.runtimeStatus === 'native_candidate_ready' &&
    observedRuntime.nativePreloadStatus === 'ready'
  );
}

export function isPrototypeRecordingMeasurementBackedByPlayback(input: {
  inspectorDraft: PrototypeProbeDraftInspectorModel;
  recordingCaptureSeconds: unknown;
}): boolean {
  const observedRecording = input.inspectorDraft.observedPrototypeRecording as
    | PrototypeProbeDraftInspectorModel['observedPrototypeRecording']
    | undefined;

  if (input.recordingCaptureSeconds === 0) {
    return isNonEmptyString(observedRecording?.fallbackReason);
  }

  if (!isPositiveRecordingCaptureSeconds(input.recordingCaptureSeconds)) {
    return true;
  }

  const recordingCaptureSeconds = input.recordingCaptureSeconds;
  const observedCapturedSeconds = observedRecording?.capturedSeconds;

  return (
    observedRecording !== undefined &&
    isNonNegativeFiniteNumber(observedCapturedSeconds) &&
    observedCapturedSeconds >= recordingCaptureSeconds &&
    observedRecording.uriAvailable === true &&
    observedRecording.playbackConfirmed === true &&
    observedRecording.fallbackReason === null
  );
}

function assertInspectorDraftEstimateGuard(
  inspectorDraft: PrototypeProbeDraftInspectorModel,
): void {
  const draft = inspectorDraft as {
    measuredCandidateEvidence?: unknown;
    runtimeUnderTest?: unknown;
    probeTemplate?: {
      evidenceSource?: unknown;
    };
  };

  if (draft.measuredCandidateEvidence !== false) {
    throw new Error(
      'prototype inspector draft measuredCandidateEvidence must be false before physical-device promotion',
    );
  }

  if (draft.runtimeUnderTest !== 'fake-sampler-engine') {
    throw new Error(
      'prototype inspector draft runtimeUnderTest must be fake-sampler-engine before physical-device promotion',
    );
  }

  if (draft.probeTemplate?.evidenceSource !== 'estimate') {
    throw new Error(
      'prototype inspector draft probeTemplate.evidenceSource must be estimate before physical-device promotion',
    );
  }
}

function assertPrototypeHandoffDeviceLabel(
  input: PhysicalDevicePrototypeProbeHandoffInput,
): void {
  const draftDeviceLabel = input.inspectorDraft.probeTemplate.deviceLabel;

  if (!isPhysicalDeviceLabel(draftDeviceLabel)) {
    throw new Error(
      'prototype inspector draft deviceLabel must name the physical device before physical-device promotion',
    );
  }

  if (input.deviceLabel === undefined) {
    return;
  }

  if (!isPhysicalDeviceLabel(input.deviceLabel)) {
    throw new Error(
      'prototype handoff deviceLabel must name the physical device before physical-device promotion',
    );
  }

  if (
    normalizePhysicalDeviceLabelForReport(input.deviceLabel) !==
    normalizePhysicalDeviceLabelForReport(draftDeviceLabel)
  ) {
    throw new Error(
      `prototype handoff deviceLabel must match inspector draft device label ${draftDeviceLabel}`,
    );
  }
}

function assertPrototypeRecordingEvidenceConsistency(
  input: PhysicalDevicePrototypeProbeHandoffInput,
): void {
  if (
    !isPrototypeRecordingMeasurementBackedByPlayback({
      inspectorDraft: input.inspectorDraft,
      recordingCaptureSeconds: input.measurements.recordingCaptureSeconds,
    })
  ) {
    throw new Error(
      'prototype recordingCaptureSeconds must be backed by captured recording playback before physical-device promotion',
    );
  }
}

function assertObservedRuntimeReady(inspectorDraft: PrototypeProbeDraftInspectorModel): void {
  if (!inspectorDraft.observedRuntime) {
    throw new Error('prototype runtime observation is required before physical-device promotion');
  }

  if (
    inspectorDraft.observedRuntime.sampleManifestVersion !==
    PROTOTYPE_GAYAGEUM_SAMPLE_MANIFEST_VERSION
  ) {
    throw new Error(
      `prototype runtime must use sample manifest ${PROTOTYPE_GAYAGEUM_SAMPLE_MANIFEST_VERSION} before physical-device promotion`,
    );
  }

  if (hasUnexpectedStringIndexesField(inspectorDraft.observedRuntime)) {
    throw new Error(
      'prototype runtime must not report unexpected sample string indexes before physical-device promotion',
    );
  }

  if (!isPrototypeObservedRuntimeReady(inspectorDraft)) {
    throw new Error(
      `prototype runtime must be ready for ${inspectorDraft.probeTemplate.candidate} before physical-device promotion`,
    );
  }
}

function isPositiveRecordingCaptureSeconds(input: unknown): input is number {
  return typeof input === 'number' && Number.isFinite(input) && input > 0;
}

function isNonNegativeFiniteNumber(input: unknown): input is number {
  return typeof input === 'number' && Number.isFinite(input) && input >= 0;
}

function isNonEmptyString(input: unknown): input is string {
  return typeof input === 'string' && input.trim().length > 0;
}

function hasUnexpectedStringIndexesField(input: object): boolean {
  return Object.prototype.hasOwnProperty.call(input, 'unexpectedStringIndexes');
}

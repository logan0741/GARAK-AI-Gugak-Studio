import { AudioEngineProbe } from '../audio/audioEngineEvaluation';
import {
  PhysicalDeviceAudioEngineProbeMeasurements,
  promoteAudioEngineProbeDraftToPhysicalDevice,
} from '../audio/audioEngineProbeDraft';
import { AudioEngineProbeRecord } from '../audio/audioEngineProbeRecord';
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

  if (!isPrototypeObservedRuntimeReady(inspectorDraft)) {
    throw new Error(
      `prototype runtime must be ready for ${inspectorDraft.probeTemplate.candidate} before physical-device promotion`,
    );
  }
}

import { AudioEngineProbe } from '../audio/audioEngineEvaluation';
import {
  PhysicalDeviceAudioEngineProbeMeasurements,
  promoteAudioEngineProbeDraftToPhysicalDevice,
} from '../audio/audioEngineProbeDraft';
import { AudioEngineProbeRecord } from '../audio/audioEngineProbeRecord';
import { PrototypeProbeDraftInspectorModel } from './prototypeQaSnapshot';

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

function assertObservedRuntimeReady(inspectorDraft: PrototypeProbeDraftInspectorModel): void {
  if (!inspectorDraft.observedRuntime) {
    throw new Error('prototype runtime observation is required before physical-device promotion');
  }

  if (!isPrototypeObservedRuntimeReady(inspectorDraft)) {
    throw new Error(
      `prototype runtime must be ready for ${inspectorDraft.probeTemplate.candidate} before physical-device promotion`,
    );
  }
}

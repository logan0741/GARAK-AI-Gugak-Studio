import { AudioEngineProbe } from '../audio/audioEngineEvaluation';
import {
  PhysicalDeviceAudioEngineProbeMeasurements,
  promoteAudioEngineProbeDraftToPhysicalDevice,
} from '../audio/audioEngineProbeDraft';
import { PrototypeProbeDraftInspectorModel } from './prototypeQaSnapshot';

export function buildPhysicalDeviceProbeFromPrototypeInspectorDraft(input: {
  inspectorDraft: PrototypeProbeDraftInspectorModel;
  measurements: PhysicalDeviceAudioEngineProbeMeasurements;
  measuredAt?: string;
  deviceLabel?: string;
}): AudioEngineProbe {
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

function assertObservedRuntimeReady(inspectorDraft: PrototypeProbeDraftInspectorModel): void {
  const { observedRuntime, probeTemplate } = inspectorDraft;

  if (!observedRuntime) {
    throw new Error('prototype runtime observation is required before physical-device promotion');
  }

  if (
    observedRuntime.requestedCandidate !== probeTemplate.candidate ||
    observedRuntime.activeRuntime !== probeTemplate.candidate ||
    observedRuntime.runtimeStatus !== 'native_candidate_ready' ||
    observedRuntime.nativePreloadStatus !== 'ready'
  ) {
    throw new Error(
      `prototype runtime must be ready for ${probeTemplate.candidate} before physical-device promotion`,
    );
  }
}

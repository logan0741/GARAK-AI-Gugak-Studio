import { PerformanceEvent } from '../domain/performanceEvent';
import {
  AudioEngineCandidateId,
  AudioEngineProbe,
} from './audioEngineEvaluation';
import { AudioEngineProbeRecord } from './audioEngineProbeRecord';

export type AudioEngineProbeDraftInput = {
  candidate: AudioEngineCandidateId;
  deviceLabel: string;
  measuredAt: string;
  touchToSoundLatencyMs?: number;
  maxStableVoices?: number;
  pitchBendSmooth?: boolean;
  glissandoEvents?: PerformanceEvent[];
  glissandoTriggeredStrings?: number;
  muteReleaseClean?: boolean;
  preloadStable?: boolean;
  sessionFallbackPreserved?: boolean;
  recordingCaptureSeconds?: number;
};

export type PhysicalDeviceAudioEngineProbeMeasurements = Pick<
  AudioEngineProbe,
  | 'touchToSoundLatencyMs'
  | 'maxStableVoices'
  | 'pitchBendSmooth'
  | 'glissandoTriggeredStrings'
  | 'muteReleaseClean'
  | 'preloadStable'
  | 'sessionFallbackPreserved'
  | 'recordingCaptureSeconds'
>;

const PHYSICAL_DEVICE_MEASUREMENT_FIELDS = [
  'touchToSoundLatencyMs',
  'maxStableVoices',
  'pitchBendSmooth',
  'glissandoTriggeredStrings',
  'muteReleaseClean',
  'preloadStable',
  'sessionFallbackPreserved',
  'recordingCaptureSeconds',
] as const satisfies ReadonlyArray<keyof PhysicalDeviceAudioEngineProbeMeasurements>;

export function createAudioEngineProbeDraft(input: AudioEngineProbeDraftInput): AudioEngineProbe {
  return {
    candidate: input.candidate,
    evidenceSource: 'estimate',
    deviceLabel: input.deviceLabel,
    measuredAt: input.measuredAt,
    touchToSoundLatencyMs: input.touchToSoundLatencyMs ?? 0,
    maxStableVoices: input.maxStableVoices ?? 0,
    pitchBendSmooth: input.pitchBendSmooth ?? false,
    glissandoTriggeredStrings:
      input.glissandoTriggeredStrings ??
      countTriggeredGlissandoStrings(input.glissandoEvents ?? []),
    muteReleaseClean: input.muteReleaseClean ?? false,
    preloadStable: input.preloadStable ?? false,
    sessionFallbackPreserved: input.sessionFallbackPreserved ?? false,
    recordingCaptureSeconds: input.recordingCaptureSeconds ?? 0,
  };
}

export function promoteAudioEngineProbeDraftToPhysicalDevice(input: {
  draft: AudioEngineProbe;
  deviceLabel?: string;
  measuredAt?: string;
  measurements: PhysicalDeviceAudioEngineProbeMeasurements;
}): AudioEngineProbe {
  if (input.draft.evidenceSource !== 'estimate') {
    throw new Error('only estimate probe drafts can be promoted to physical-device evidence');
  }

  const missingFields = PHYSICAL_DEVICE_MEASUREMENT_FIELDS.filter(
    (field) => input.measurements[field] === undefined,
  );
  if (missingFields.length > 0) {
    throw new Error(`physical-device measurements missing: ${missingFields.join(', ')}`);
  }

  return {
    ...input.draft,
    ...input.measurements,
    evidenceSource: 'physical-device',
    deviceLabel: input.deviceLabel?.trim() || input.draft.deviceLabel,
    measuredAt: input.measuredAt ?? input.draft.measuredAt,
  };
}

export function createAudioEngineProbeRecordDraft(input: {
  generatedAt: string;
  probes: AudioEngineProbeDraftInput[];
}): AudioEngineProbeRecord {
  return {
    generatedAt: input.generatedAt,
    probes: input.probes.map(createAudioEngineProbeDraft),
  };
}

function countTriggeredGlissandoStrings(events: PerformanceEvent[]): number {
  return new Set(
    events
      .filter((event) => event.type === 'glissando_step')
      .map((event) => event.stringIndex),
  ).size;
}

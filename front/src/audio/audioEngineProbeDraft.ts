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

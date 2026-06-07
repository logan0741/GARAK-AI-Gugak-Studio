import { AudioEngineProbe } from '../audio/audioEngineEvaluation';
import { createAudioEngineProbeDraft } from '../audio/audioEngineProbeDraft';
import { AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import { VoiceState } from '../audio/samplerEngine';
import { PerformanceEvent } from '../domain/performanceEvent';

export type PrototypeQaSnapshot = {
  candidate: AudioEngineCandidateId;
  deviceLabel: string;
  measuredAt: string;
  eventCount: number;
  maxStableVoices: number;
  glissandoTriggeredStrings: number[];
  pitchBendObserved: boolean;
  muteObserved: boolean;
  audioDispatchFailures: number;
  sessionFallbackPreserved: boolean;
};

export type PrototypeProbeDraftInspectorModel = {
  note: string;
  measuredCandidateEvidence: false;
  runtimeUnderTest: 'fake-sampler-engine';
  observedFakeCounters: {
    audioDispatchFailures: number;
    eventCount: number;
    glissandoTriggeredStrings: number;
    maxActiveVoices: number;
    muteObserved: boolean;
    pitchBendObserved: boolean;
    sessionFallbackPreserved: boolean;
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

const PROTOTYPE_DRAFT_NOTE =
  'Estimate draft from fake prototype engine counters. Replace with physical-device candidate measurements before Day 5 handoff.';

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
    maxStableVoices: 0,
    glissandoTriggeredStrings: [],
    pitchBendObserved: false,
    muteObserved: false,
    audioDispatchFailures: 0,
    sessionFallbackPreserved: false,
  };
}

export function updatePrototypeQaSnapshot(
  snapshot: PrototypeQaSnapshot,
  input: {
    events: PerformanceEvent[];
    activeVoiceCount: number;
    audioDispatchOk: boolean;
    measuredAt: string;
  },
): PrototypeQaSnapshot {
  return {
    ...snapshot,
    measuredAt: input.measuredAt,
    eventCount: snapshot.eventCount + input.events.length,
    maxStableVoices: Math.max(snapshot.maxStableVoices, input.activeVoiceCount),
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

export function formatPrototypeProbeDraftForInspector(snapshot: PrototypeQaSnapshot): string {
  return JSON.stringify(createPrototypeProbeDraftInspectorModel(snapshot), null, 2);
}

export function countPrototypeAudibleVoices(voices: VoiceState[]): number {
  return voices.filter((voice) => voice.envelopeState === 'attack' || voice.envelopeState === 'sustain').length;
}

function createPrototypeProbeDraftInspectorModel(
  snapshot: PrototypeQaSnapshot,
): PrototypeProbeDraftInspectorModel {
  return {
    note: PROTOTYPE_DRAFT_NOTE,
    measuredCandidateEvidence: false,
    runtimeUnderTest: 'fake-sampler-engine',
    observedFakeCounters: {
      audioDispatchFailures: snapshot.audioDispatchFailures,
      eventCount: snapshot.eventCount,
      glissandoTriggeredStrings: snapshot.glissandoTriggeredStrings.length,
      maxActiveVoices: snapshot.maxStableVoices,
      muteObserved: snapshot.muteObserved,
      pitchBendObserved: snapshot.pitchBendObserved,
      sessionFallbackPreserved: snapshot.sessionFallbackPreserved,
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

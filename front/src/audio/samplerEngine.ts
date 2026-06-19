import {
  PerformanceEvent,
  assertPerformanceEvent,
} from '../domain/performanceEvent';

export type EnvelopeState = 'attack' | 'sustain' | 'release' | 'ended';

export type VoiceState = {
  voiceId: string;
  stringIndex: number;
  startedAtMs: number;
  pitchBendCents: number;
  gain: number;
  envelopeState: EnvelopeState;
};

export interface SamplerEngine {
  handleEvent(event: PerformanceEvent): void;
}

export function assertSamplerEventIdentity(event: PerformanceEvent): void {
  assertPerformanceEvent(event);
}

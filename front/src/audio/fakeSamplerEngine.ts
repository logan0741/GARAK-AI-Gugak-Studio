import { PerformanceEvent } from '../domain/performanceEvent';
import { SamplerEngine, VoiceState } from './samplerEngine';

function assertNever(value: never): never {
  throw new Error(`Unhandled performance event: ${JSON.stringify(value)}`);
}

export class FakeSamplerEngine implements SamplerEngine {
  private readonly commandLog: string[] = [];
  private readonly voices: VoiceState[] = [];
  private readonly maxVoices: number;
  private nextVoiceNumber = 1;

  constructor(input: { maxVoices?: number } = {}) {
    this.maxVoices = input.maxVoices ?? 8;
  }

  get commands(): string[] {
    return [...this.commandLog];
  }

  get activeVoices(): VoiceState[] {
    return this.voices.map((voice) => ({ ...voice }));
  }

  handleEvent(event: PerformanceEvent): void {
    switch (event.type) {
      case 'string_pluck':
      case 'glissando_step':
        this.allocateVoice(event.stringIndex, event.tsMs);
        this.commandLog.push(`pluck:string=${event.stringIndex}:velocity=${event.velocity}`);
        return;
      case 'string_bend':
        this.updateVoicesForString(event.stringIndex, { pitchBendCents: event.cents });
        this.commandLog.push(`bend:string=${event.stringIndex}:cents=${event.cents}`);
        return;
      case 'string_mute': {
        const gain = Number((1 - event.strength).toFixed(3));
        this.updateVoicesForString(event.stringIndex, { envelopeState: 'release', gain });
        this.commandLog.push(`mute:string=${event.stringIndex}:strength=${event.strength}`);
        return;
      }
      case 'string_release':
        this.updateVoicesForString(event.stringIndex, { envelopeState: 'release' });
        this.commandLog.push(`release:string=${event.stringIndex}`);
        return;
      default:
        assertNever(event);
    }
  }

  private allocateVoice(stringIndex: number, startedAtMs: number): void {
    if (this.voices.length >= this.maxVoices) {
      const stolen = this.voices.shift();
      if (stolen) {
        this.commandLog.push(`steal:voice=${stolen.voiceId}`);
      }
    }

    this.voices.push({
      voiceId: `voice-${this.nextVoiceNumber++}`,
      stringIndex,
      startedAtMs,
      pitchBendCents: 0,
      gain: 1,
      envelopeState: 'attack',
    });
  }

  private updateVoicesForString(stringIndex: number, patch: Partial<VoiceState>): void {
    for (const voice of this.voices) {
      if (voice.stringIndex === stringIndex) {
        Object.assign(voice, patch);
      }
    }
  }
}

import { PerformanceEvent } from '../domain/performanceEvent';
import { SampleAssetManifest } from '../domain/sampleManifest';
import { SamplerEngine } from './samplerEngine';

export type ReactNativeAudioApiParamPort = {
  value: number;
  setTargetAtTime(target: number, startTime: number, timeConstant: number): ReactNativeAudioApiParamPort;
};

export type ReactNativeAudioApiNodePort = {
  connect(destination: ReactNativeAudioApiNodePort | ReactNativeAudioApiParamPort): unknown;
  disconnect(destination?: ReactNativeAudioApiNodePort | ReactNativeAudioApiParamPort): void;
};

export type ReactNativeAudioApiBufferSourcePort = ReactNativeAudioApiNodePort & {
  buffer: unknown | null;
  detune: ReactNativeAudioApiParamPort;
  onEnded?: ((event: never) => void) | null;
  playbackRate: ReactNativeAudioApiParamPort;
  start(when?: number): void;
  stop(when?: number): void;
};

export type ReactNativeAudioApiGainPort = ReactNativeAudioApiNodePort & {
  gain: ReactNativeAudioApiParamPort;
};

export type ReactNativeAudioApiFilterPort = ReactNativeAudioApiNodePort & {
  type: 'lowpass' | 'highpass' | 'bandpass' | 'lowshelf' | 'highshelf' | 'peaking' | 'notch' | 'allpass';
  frequency: ReactNativeAudioApiParamPort;
  Q: ReactNativeAudioApiParamPort;
};

export type ReactNativeAudioApiContextPort = {
  readonly currentTime: number;
  readonly destination: ReactNativeAudioApiNodePort;
  decodeAudioData(input: string): Promise<unknown>;
  createBufferSource(options?: { pitchCorrection: boolean }): ReactNativeAudioApiBufferSourcePort;
  createGain(): ReactNativeAudioApiGainPort;
  createBiquadFilter(): ReactNativeAudioApiFilterPort;
};

export type ReactNativeAudioApiRuntimePort = {
  createAudioContext(): ReactNativeAudioApiContextPort;
};

export type ReactNativeAudioApiPreloadResult = {
  candidate: 'react-native-audio-api';
  filterEnabled: boolean;
  loadedStringIndexes: number[];
  preloadStable: boolean;
};

type ActiveVoice = {
  source: ReactNativeAudioApiBufferSourcePort;
  gain: ReactNativeAudioApiGainPort;
  filter: ReactNativeAudioApiFilterPort;
  destination: ReactNativeAudioApiNodePort;
  stringIndex: number;
};

const DEFAULT_MAX_VOICES = 8;
const DEFAULT_FILTER_FREQUENCY_HZ = 12_000;
const DEFAULT_FILTER_Q = 0.707;
const BEND_TIME_CONSTANT_SECONDS = 0.015;
const MUTE_TIME_CONSTANT_SECONDS = 0.035;
const RELEASE_TIME_CONSTANT_SECONDS = 0.05;
const RELEASE_STOP_DELAY_SECONDS = 0.12;

export class ReactNativeAudioApiSamplerEngine implements SamplerEngine {
  private readonly manifest: SampleAssetManifest;
  private readonly runtime: ReactNativeAudioApiRuntimePort;
  private readonly maxVoices: number;
  private readonly buffersByString = new Map<number, unknown>();
  private readonly activeVoices: ActiveVoice[] = [];
  private context: ReactNativeAudioApiContextPort | undefined;

  constructor(input: {
    manifest: SampleAssetManifest;
    runtime: ReactNativeAudioApiRuntimePort;
    maxVoices?: number;
  }) {
    this.manifest = input.manifest;
    this.runtime = input.runtime;
    this.maxVoices = input.maxVoices ?? DEFAULT_MAX_VOICES;
  }

  async preload(): Promise<ReactNativeAudioApiPreloadResult> {
    this.context = this.runtime.createAudioContext();

    for (const asset of this.manifest.assets) {
      const buffer = await this.context.decodeAudioData(asset.fileUri);
      this.buffersByString.set(asset.stringIndex, buffer);
    }

    return {
      candidate: 'react-native-audio-api',
      filterEnabled: true,
      loadedStringIndexes: this.manifest.assets.map((asset) => asset.stringIndex),
      preloadStable: true,
    };
  }

  handleEvent(event: PerformanceEvent): void {
    switch (event.type) {
      case 'string_pluck':
      case 'glissando_step':
        this.startVoice(event.stringIndex, event.velocity);
        return;
      case 'string_bend':
        this.bendString(event.stringIndex, event.cents);
        return;
      case 'string_mute':
        this.muteString(event.stringIndex, event.strength);
        return;
      case 'string_release':
        this.releaseString(event.stringIndex);
        return;
      default:
        assertNever(event);
    }
  }

  private startVoice(stringIndex: number, velocity: number): void {
    const context = this.requireContext();
    const buffer = this.requireBuffer(stringIndex);
    const source = context.createBufferSource({ pitchCorrection: true });
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = DEFAULT_FILTER_FREQUENCY_HZ;
    filter.Q.value = DEFAULT_FILTER_Q;
    gain.gain.value = clamp01(velocity);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(context.currentTime);

    const voice: ActiveVoice = {
      source,
      gain,
      filter,
      destination: context.destination,
      stringIndex,
    };
    source.onEnded = () => this.cleanupVoice(voice);
    this.activeVoices.push(voice);
    this.enforceVoiceBudget();
  }

  private bendString(stringIndex: number, cents: number): void {
    const currentTime = this.requireContext().currentTime;
    for (const voice of this.activeVoicesForString(stringIndex)) {
      voice.source.detune.setTargetAtTime(cents, currentTime, BEND_TIME_CONSTANT_SECONDS);
    }
  }

  private muteString(stringIndex: number, strength: number): void {
    const currentTime = this.requireContext().currentTime;
    for (const voice of this.activeVoicesForString(stringIndex)) {
      voice.gain.gain.setTargetAtTime(1 - clamp01(strength), currentTime, MUTE_TIME_CONSTANT_SECONDS);
    }
  }

  private releaseString(stringIndex: number): void {
    const currentTime = this.requireContext().currentTime;
    const stopAt = Number((currentTime + RELEASE_STOP_DELAY_SECONDS).toFixed(3));
    const voicesToRelease = this.activeVoicesForString(stringIndex);

    for (const voice of voicesToRelease) {
      voice.gain.gain.setTargetAtTime(0, currentTime, RELEASE_TIME_CONSTANT_SECONDS);
      voice.source.stop(stopAt);
      removeMatching(this.activeVoices, (candidate) => candidate === voice);
    }
  }

  private enforceVoiceBudget(): void {
    while (this.activeVoices.length > this.maxVoices) {
      const stolen = this.activeVoices.shift();
      if (stolen) {
        stolen.source.onEnded = null;
        stolen.source.stop(this.requireContext().currentTime);
        this.disconnectVoice(stolen);
      }
    }
  }

  private activeVoicesForString(stringIndex: number): ActiveVoice[] {
    return this.activeVoices.filter((voice) => voice.stringIndex === stringIndex);
  }

  private requireContext(): ReactNativeAudioApiContextPort {
    if (!this.context) {
      throw new Error('react-native-audio-api engine must be preloaded before handling events');
    }

    return this.context;
  }

  private requireBuffer(stringIndex: number): unknown {
    const buffer = this.buffersByString.get(stringIndex);
    if (!buffer) {
      throw new Error(`No decoded react-native-audio-api buffer for string ${stringIndex}`);
    }

    return buffer;
  }

  private cleanupVoice(voice: ActiveVoice): void {
    removeMatching(this.activeVoices, (candidate) => candidate === voice);
    this.disconnectVoice(voice);
  }

  private disconnectVoice(voice: ActiveVoice): void {
    voice.source.disconnect(voice.filter);
    voice.filter.disconnect(voice.gain);
    voice.gain.disconnect(voice.destination);
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function removeMatching<T>(items: T[], predicate: (item: T) => boolean): void {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      items.splice(index, 1);
    }
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled performance event: ${JSON.stringify(value)}`);
}

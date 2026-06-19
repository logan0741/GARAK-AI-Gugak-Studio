import { PerformanceEvent } from '../domain/performanceEvent';
import { SampleAssetManifest } from '../domain/sampleManifest';
import { SamplerEngine, assertSamplerEventIdentity } from './samplerEngine';

export type ExpoAudioMode = {
  playsInSilentMode: boolean;
  interruptionMode: 'mixWithOthers' | 'doNotMix' | 'duckOthers';
  allowsRecording: boolean;
  shouldPlayInBackground: boolean;
  shouldRouteThroughEarpiece: boolean;
  allowsBackgroundRecording: boolean;
};

export type ExpoAudioPlayerOptions = {
  downloadFirst: boolean;
  keepAudioSessionActive: boolean;
  updateInterval: number;
};

export type ExpoAudioPlayerPort = {
  volume: number;
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
  setPlaybackRate(rate: number): void;
};

export type ExpoAudioRecorderPort = {
  prepareToRecordAsync(): Promise<void>;
  record(options: { forDuration: number }): void;
  stop(): Promise<void>;
  getStatus(): {
    durationMillis: number;
    url: string | null;
  };
};

export type ExpoAudioRuntimePort = {
  setAudioModeAsync(mode: ExpoAudioMode): Promise<void>;
  downloadAudioSource(source: { uri: string }): Promise<{ uri: string }>;
  createAudioPlayer(source: { uri: string }, options: ExpoAudioPlayerOptions): ExpoAudioPlayerPort;
  requestRecordingPermissionsAsync(): Promise<{ granted: boolean }>;
  createAudioRecorder(): ExpoAudioRecorderPort;
};

export type ExpoAudioPreloadResult = {
  candidate: 'expo-audio';
  loadedStringIndexes: number[];
  preloadStable: boolean;
};

export type ExpoAudioRecordingProbeResult =
  | { ok: true; requestedDurationSeconds: number }
  | {
      ok: false;
      reason:
        | 'recording_already_active'
        | 'recording_duration_invalid'
        | 'recording_permission_denied'
        | 'recording_start_failed';
    };

export type ExpoAudioRecordingStopResult = {
  ok: true;
  capturedSeconds: number;
  recordingUri: string | null;
};

export type ExpoAudioRecordingPlaybackResult =
  | { ok: true; recordingUri: string }
  | { ok: false; reason: 'recording_playback_failed' | 'recording_playback_uri_missing' };

const PLAYBACK_MODE: ExpoAudioMode = {
  playsInSilentMode: true,
  interruptionMode: 'mixWithOthers',
  allowsRecording: false,
  shouldPlayInBackground: false,
  shouldRouteThroughEarpiece: false,
  allowsBackgroundRecording: false,
};

const RECORDING_MODE: ExpoAudioMode = {
  ...PLAYBACK_MODE,
  allowsRecording: true,
};

const PLAYER_OPTIONS: ExpoAudioPlayerOptions = {
  downloadFirst: false,
  keepAudioSessionActive: true,
  updateInterval: 50,
};

export class ExpoAudioSamplerEngine implements SamplerEngine {
  private readonly manifest: SampleAssetManifest;
  private readonly runtime: ExpoAudioRuntimePort;
  private readonly playersByString = new Map<number, ExpoAudioPlayerPort>();
  private readonly playbackGenerationsByString = new Map<number, number>();
  private readonly playbackQueuesByString = new Map<number, Promise<void>>();
  private playbackQueueFailure: unknown;
  private activeRecorder: ExpoAudioRecorderPort | undefined;
  private recordingProbePlayer: ExpoAudioPlayerPort | undefined;

  constructor(input: { manifest: SampleAssetManifest; runtime: ExpoAudioRuntimePort }) {
    this.manifest = input.manifest;
    this.runtime = input.runtime;
  }

  async preload(): Promise<ExpoAudioPreloadResult> {
    this.playersByString.clear();
    this.playbackGenerationsByString.clear();
    this.playbackQueuesByString.clear();
    this.playbackQueueFailure = undefined;
    await this.runtime.setAudioModeAsync(PLAYBACK_MODE);

    const sourcesByString: Array<{ stringIndex: number; source: { uri: string } }> = [];
    for (const asset of this.manifest.assets) {
      const source = normalizeDownloadedAudioSource(
        await this.runtime.downloadAudioSource({ uri: asset.fileUri }),
        asset.stringIndex,
      );
      sourcesByString.push({ stringIndex: asset.stringIndex, source });
    }

    for (const { stringIndex, source } of sourcesByString) {
      const player = this.runtime.createAudioPlayer(source, PLAYER_OPTIONS);
      this.playersByString.set(stringIndex, player);
    }

    return {
      candidate: 'expo-audio',
      loadedStringIndexes: this.manifest.assets.map((asset) => asset.stringIndex),
      preloadStable: true,
    };
  }

  async waitForIdle(): Promise<void> {
    await Promise.all(this.playbackQueuesByString.values());
    if (this.playbackQueueFailure) {
      const failure = this.playbackQueueFailure;
      this.playbackQueueFailure = undefined;
      throw failure;
    }
  }

  handleEvent(event: PerformanceEvent): void {
    assertSamplerEventIdentity(event);

    switch (event.type) {
      case 'string_pluck':
      case 'glissando_step':
        this.playString(event.stringIndex, event.velocity);
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

  async startRecordingProbe(durationSeconds: number): Promise<ExpoAudioRecordingProbeResult> {
    if (!isPositiveFiniteNumber(durationSeconds)) {
      return { ok: false, reason: 'recording_duration_invalid' };
    }

    if (this.activeRecorder) {
      return { ok: false, reason: 'recording_already_active' };
    }

    const permission = await this.runtime.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, reason: 'recording_permission_denied' };
    }

    try {
      await this.runtime.setAudioModeAsync(RECORDING_MODE);
      const recorder = this.runtime.createAudioRecorder();
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: durationSeconds });
      this.activeRecorder = recorder;
    } catch {
      this.activeRecorder = undefined;
      await this.runtime.setAudioModeAsync(PLAYBACK_MODE);
      return { ok: false, reason: 'recording_start_failed' };
    }

    return { ok: true, requestedDurationSeconds: durationSeconds };
  }

  async stopRecordingProbe(): Promise<ExpoAudioRecordingStopResult> {
    if (!this.activeRecorder) {
      throw new Error('No active expo-audio recording probe');
    }

    const recorder = this.activeRecorder;
    let status: ReturnType<ExpoAudioRecorderPort['getStatus']> | undefined;

    try {
      await recorder.stop();
      status = recorder.getStatus();
    } finally {
      this.activeRecorder = undefined;
      await this.runtime.setAudioModeAsync(PLAYBACK_MODE);
    }

    if (!status) {
      throw new Error('Expo audio recorder stopped without status');
    }

    return {
      ok: true,
      capturedSeconds: normalizeCapturedSeconds(status.durationMillis),
      recordingUri: normalizeRecordingUri(status.url),
    };
  }

  async playRecordingProbe(recordingUri: string): Promise<ExpoAudioRecordingPlaybackResult> {
    const normalizedRecordingUri = normalizeRecordingUri(recordingUri);
    if (normalizedRecordingUri === null) {
      return { ok: false, reason: 'recording_playback_uri_missing' };
    }

    try {
      await this.runtime.setAudioModeAsync(PLAYBACK_MODE);
      const player = this.runtime.createAudioPlayer({ uri: normalizedRecordingUri }, PLAYER_OPTIONS);
      this.recordingProbePlayer = player;
      player.volume = 1;
      await player.seekTo(0);
      player.play();
      return { ok: true, recordingUri: normalizedRecordingUri };
    } catch {
      return { ok: false, reason: 'recording_playback_failed' };
    }
  }

  private playString(stringIndex: number, velocity: number): void {
    const clampedVelocity = clamp01(velocity, 'velocity');
    const player = this.requirePlayer(stringIndex);
    const playbackGeneration = this.advancePlaybackGeneration(stringIndex);
    player.volume = clampedVelocity;
    this.queuePlayback(stringIndex, async () => {
      await player.seekTo(0);
      if (this.playbackGenerationsByString.get(stringIndex) !== playbackGeneration) {
        return;
      }
      player.play();
    });
  }

  private bendString(stringIndex: number, cents: number): void {
    assertFiniteControlValue(cents, 'cents');
    const player = this.requirePlayer(stringIndex);
    player.setPlaybackRate(clampPlaybackRate(Math.pow(2, cents / 1200)));
  }

  private muteString(stringIndex: number, strength: number): void {
    const clampedStrength = clamp01(strength, 'strength');
    const player = this.requirePlayer(stringIndex);
    player.volume = Number((1 - clampedStrength).toFixed(3));
  }

  private releaseString(stringIndex: number): void {
    const player = this.requirePlayer(stringIndex);
    this.advancePlaybackGeneration(stringIndex);
    if (this.playbackQueuesByString.has(stringIndex)) {
      this.queuePlayback(stringIndex, async () => {
        player.pause();
      });
      return;
    }

    player.pause();
  }

  private advancePlaybackGeneration(stringIndex: number): number {
    const nextGeneration = (this.playbackGenerationsByString.get(stringIndex) ?? 0) + 1;
    this.playbackGenerationsByString.set(stringIndex, nextGeneration);
    return nextGeneration;
  }

  private requirePlayer(stringIndex: number): ExpoAudioPlayerPort {
    const player = this.playersByString.get(stringIndex);
    if (!player) {
      throw new Error(`No preloaded expo-audio player for string ${stringIndex}`);
    }

    return player;
  }

  private queuePlayback(stringIndex: number, operation: () => Promise<void>): void {
    const previous = this.playbackQueuesByString.get(stringIndex) ?? Promise.resolve();
    const next = previous
      .then(operation)
      .catch((error: unknown) => {
        this.playbackQueueFailure = error;
      })
      .finally(() => {
        if (this.playbackQueuesByString.get(stringIndex) === next) {
          this.playbackQueuesByString.delete(stringIndex);
        }
      });
    this.playbackQueuesByString.set(stringIndex, next);
  }
}

function clamp01(value: number, fieldName: string): number {
  assertFiniteControlValue(value, fieldName);
  return Math.max(0, Math.min(1, value));
}

function clampPlaybackRate(value: number): number {
  return Math.max(0.1, Math.min(2, value));
}

function assertFiniteControlValue(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be finite`);
  }
}

function normalizeRecordingUri(recordingUri: string | null): string | null {
  const normalizedRecordingUri = recordingUri?.trim() ?? '';
  if (normalizedRecordingUri.length === 0) {
    return null;
  }

  return normalizedRecordingUri;
}

function normalizeDownloadedAudioSource(
  source: { uri: string },
  stringIndex: number,
): { uri: string } {
  const uri = source.uri.trim();
  if (uri.length === 0) {
    throw new Error(`Downloaded expo-audio source URI missing for string ${stringIndex}`);
  }

  return { uri };
}

function normalizeCapturedSeconds(durationMillis: number): number {
  if (!Number.isFinite(durationMillis) || durationMillis < 0) {
    return 0;
  }

  return durationMillis / 1000;
}

function isPositiveFiniteNumber(input: number): boolean {
  return Number.isFinite(input) && input > 0;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled performance event: ${JSON.stringify(value)}`);
}

import { expect, test } from 'vitest';
import { ExpoAudioSamplerEngine, ExpoAudioRuntimePort } from '../expoAudioSamplerEngine';
import { SampleAssetManifest } from '../../domain/sampleManifest';

const manifest: SampleAssetManifest = {
  version: 'test-gayageum-samples',
  assets: [
    {
      id: 'string-1',
      instrument: 'gayageum_12',
      stringIndex: 1,
      pitchHz: 196,
      fileUri: 'asset://gayageum/01.wav',
      sourceLayer: 'public_asset',
      sourceName: 'test fixture',
      licenseNote: 'test only',
    },
    {
      id: 'string-2',
      instrument: 'gayageum_12',
      stringIndex: 2,
      pitchHz: 220,
      fileUri: 'asset://gayageum/02.wav',
      sourceLayer: 'public_asset',
      sourceName: 'test fixture',
      licenseNote: 'test only',
    },
  ],
};

test('preloads manifest assets with Expo Audio download-first players', async () => {
  const runtime = createRuntimePort();
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });

  const result = await engine.preload();

  expect(result).toEqual({
    candidate: 'expo-audio',
    loadedStringIndexes: [1, 2],
    preloadStable: true,
  });
  expect(runtime.downloadedSources).toEqual([{ uri: 'asset://gayageum/01.wav' }, { uri: 'asset://gayageum/02.wav' }]);
  expect(runtime.createdPlayers).toEqual([
    {
      source: { uri: 'file://cached/gayageum/01.wav' },
      options: { downloadFirst: false, keepAudioSessionActive: true, updateInterval: 50 },
    },
    {
      source: { uri: 'file://cached/gayageum/02.wav' },
      options: { downloadFirst: false, keepAudioSessionActive: true, updateInterval: 50 },
    },
  ]);
  expect(runtime.modeCalls[0]).toMatchObject({
    allowsRecording: false,
    interruptionMode: 'mixWithOthers',
    playsInSilentMode: true,
  });
});

test('plays a preloaded string immediately when a pluck event arrives', async () => {
  const runtime = createRuntimePort();
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });
  await engine.preload();

  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 0.72 });
  await engine.waitForIdle();

  expect(runtime.players[0].volume).toBe(0.72);
  expect(runtime.players[0].seekCalls).toEqual([0]);
  expect(runtime.players[0].playCalls).toBe(1);
});

test('surfaces queued playback failures during idle checks', async () => {
  const runtime = createRuntimePort({ seekFails: true });
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });
  await engine.preload();

  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 });

  await expect(engine.waitForIdle()).rejects.toThrow('seek failed');
});

test('maps bend, mute, and release events onto Expo Audio player controls', async () => {
  const runtime = createRuntimePort();
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });
  await engine.preload();

  engine.handleEvent({ type: 'string_bend', tsMs: 120, stringIndex: 2, cents: 120 });
  engine.handleEvent({ type: 'string_mute', tsMs: 130, stringIndex: 2, strength: 0.8 });
  engine.handleEvent({ type: 'string_release', tsMs: 150, stringIndex: 2 });

  expect(runtime.players[1].playbackRates[0]).toBeCloseTo(1.072, 3);
  expect(runtime.players[1].volume).toBe(0.2);
  expect(runtime.players[1].pauseCalls).toBe(1);
});

test('prepares a 10 second recording probe when permission is granted', async () => {
  const runtime = createRuntimePort();
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });

  const result = await engine.startRecordingProbe(10);

  expect(result).toEqual({ ok: true, requestedDurationSeconds: 10 });
  expect(runtime.permissionRequests).toBe(1);
  expect(runtime.modeCalls[0]).toMatchObject({ allowsRecording: true });
  expect(runtime.recorders[0].prepared).toBe(true);
  expect(runtime.recorders[0].recordCalls).toEqual([{ forDuration: 10 }]);
});

test('does not overwrite an active recording probe', async () => {
  const runtime = createRuntimePort();
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });
  await engine.startRecordingProbe(10);

  await expect(engine.startRecordingProbe(10)).resolves.toEqual({
    ok: false,
    reason: 'recording_already_active',
  });
  expect(runtime.recorders).toHaveLength(1);
});

test('stops a recording probe and reports captured duration and uri', async () => {
  const runtime = createRuntimePort();
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });
  await engine.startRecordingProbe(10);

  await expect(engine.stopRecordingProbe()).resolves.toEqual({
    ok: true,
    capturedSeconds: 10,
    recordingUri: 'file://recording.m4a',
  });
  expect(runtime.recorders[0].stopCalls).toBe(1);
  expect(runtime.modeCalls.at(-1)).toMatchObject({ allowsRecording: false });
});

test('plays back a captured recording probe from its uri', async () => {
  const runtime = createRuntimePort();
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });

  await expect(engine.playRecordingProbe('file://recording.m4a')).resolves.toEqual({
    ok: true,
    recordingUri: 'file://recording.m4a',
  });

  expect(runtime.createdPlayers.at(-1)).toEqual({
    source: { uri: 'file://recording.m4a' },
    options: { downloadFirst: false, keepAudioSessionActive: true, updateInterval: 50 },
  });
  expect(runtime.players.at(-1)?.seekCalls).toEqual([0]);
  expect(runtime.players.at(-1)?.playCalls).toBe(1);
  expect(runtime.modeCalls.at(-1)).toMatchObject({ allowsRecording: false });
});

test('reports recording playback probe failure without throwing', async () => {
  const runtime = createRuntimePort({ seekFails: true });
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });

  await expect(engine.playRecordingProbe('file://recording.m4a')).resolves.toEqual({
    ok: false,
    reason: 'recording_playback_failed',
  });
});

test('restores playback mode even when recording stop fails', async () => {
  const runtime = createRuntimePort({ stopFails: true });
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });
  await engine.startRecordingProbe(10);

  await expect(engine.stopRecordingProbe()).rejects.toThrow('stop failed');
  expect(runtime.modeCalls.at(-1)).toMatchObject({ allowsRecording: false });
});

test('returns a recording fallback result when permission is denied', async () => {
  const runtime = createRuntimePort({ permissionGranted: false });
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });

  await expect(engine.startRecordingProbe(10)).resolves.toEqual({
    ok: false,
    reason: 'recording_permission_denied',
  });
  expect(runtime.recorders).toHaveLength(0);
});

function createRuntimePort(input: { permissionGranted?: boolean; seekFails?: boolean; stopFails?: boolean } = {}) {
  const players: FakeExpoAudioPlayer[] = [];
  const recorders: FakeExpoAudioRecorder[] = [];
  const runtime = {
    createdPlayers: [] as Array<{ source: unknown; options: unknown }>,
    downloadedSources: [] as unknown[],
    modeCalls: [] as unknown[],
    permissionRequests: 0,
    players,
    recorders,
    async setAudioModeAsync(mode: unknown) {
      this.modeCalls.push(mode);
    },
    createAudioPlayer(source: unknown, options: unknown) {
      this.createdPlayers.push({ source, options });
      const player = new FakeExpoAudioPlayer({ seekFails: input.seekFails ?? false });
      this.players.push(player);
      return player;
    },
    async downloadAudioSource(source: { uri: string }) {
      this.downloadedSources.push(source);
      return { uri: source.uri.replace('asset://', 'file://cached/') };
    },
    async requestRecordingPermissionsAsync() {
      this.permissionRequests += 1;
      return { granted: input.permissionGranted ?? true };
    },
    createAudioRecorder() {
      const recorder = new FakeExpoAudioRecorder({ stopFails: input.stopFails ?? false });
      this.recorders.push(recorder);
      return recorder;
    },
  } satisfies ExpoAudioRuntimePort & {
    createdPlayers: Array<{ source: unknown; options: unknown }>;
    downloadedSources: unknown[];
    modeCalls: unknown[];
    permissionRequests: number;
    players: FakeExpoAudioPlayer[];
    recorders: FakeExpoAudioRecorder[];
  };

  return runtime;
}

class FakeExpoAudioPlayer {
  volume = 1;
  seekCalls: number[] = [];
  playCalls = 0;
  pauseCalls = 0;
  playbackRates: number[] = [];

  constructor(private readonly input: { seekFails: boolean } = { seekFails: false }) {}

  play(): void {
    this.playCalls += 1;
  }

  pause(): void {
    this.pauseCalls += 1;
  }

  async seekTo(seconds: number): Promise<void> {
    this.seekCalls.push(seconds);
    if (this.input.seekFails) {
      throw new Error('seek failed');
    }
  }

  setPlaybackRate(rate: number): void {
    this.playbackRates.push(rate);
  }
}

class FakeExpoAudioRecorder {
  prepared = false;
  recordCalls: Array<{ forDuration: number }> = [];
  stopCalls = 0;
  uri = 'file://recording.m4a';

  constructor(private readonly input: { stopFails: boolean } = { stopFails: false }) {}

  async prepareToRecordAsync(): Promise<void> {
    this.prepared = true;
  }

  record(options: { forDuration: number }): void {
    this.recordCalls.push(options);
  }

  async stop(): Promise<void> {
    this.stopCalls += 1;
    if (this.input.stopFails) {
      throw new Error('stop failed');
    }
  }

  getStatus() {
    return {
      canRecord: false,
      durationMillis: 10_000,
      isRecording: false,
      mediaServicesDidReset: false,
      url: this.uri,
    };
  }
}

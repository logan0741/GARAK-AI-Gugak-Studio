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

test('rejects preload when a downloaded Expo Audio source URI is missing', async () => {
  const runtime = createRuntimePort({ blankDownloadedSources: new Set(['asset://gayageum/02.wav']) });
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });

  await expect(engine.preload()).rejects.toThrow(
    'Downloaded expo-audio source URI missing for string 2',
  );
  expect(runtime.downloadedSources).toEqual([
    { uri: 'asset://gayageum/01.wav' },
    { uri: 'asset://gayageum/02.wav' },
  ]);
  expect(runtime.createdPlayers).toHaveLength(1);
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

test('rejects non-finite Expo Audio playback control values before touching native players', async () => {
  const runtime = createRuntimePort();
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });
  await engine.preload();

  expect(() =>
    engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: Number.NaN }),
  ).toThrow('velocity must be finite');
  expect(runtime.players[0].playCalls).toBe(0);

  expect(() =>
    engine.handleEvent({ type: 'string_bend', tsMs: 120, stringIndex: 1, cents: Number.POSITIVE_INFINITY }),
  ).toThrow('cents must be finite');
  expect(runtime.players[0].playbackRates).toEqual([]);

  expect(() =>
    engine.handleEvent({ type: 'string_mute', tsMs: 130, stringIndex: 1, strength: Number.NaN }),
  ).toThrow('strength must be finite');
  expect(runtime.players[0].volume).toBe(1);
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

test('cancels pending Expo Audio play when release arrives before seek finishes', async () => {
  const runtime = createRuntimePort({ deferSeek: true });
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });
  await engine.preload();

  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 0.72 });
  engine.handleEvent({ type: 'string_release', tsMs: 105, stringIndex: 1 });

  await Promise.resolve();
  expect(runtime.players[0].pauseCalls).toBe(0);
  runtime.players[0].resolveNextSeek();
  await engine.waitForIdle();

  expect(runtime.players[0].seekCalls).toEqual([0]);
  expect(runtime.players[0].playCalls).toBe(0);
  expect(runtime.players[0].pauseCalls).toBe(1);
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

test('rejects invalid recording probe duration before touching native recording APIs', async () => {
  for (const durationSeconds of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const runtime = createRuntimePort();
    const engine = new ExpoAudioSamplerEngine({ manifest, runtime });

    await expect(engine.startRecordingProbe(durationSeconds)).resolves.toEqual({
      ok: false,
      reason: 'recording_duration_invalid',
    });

    expect(runtime.permissionRequests).toBe(0);
    expect(runtime.modeCalls).toEqual([]);
    expect(runtime.recorders).toEqual([]);
  }
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

test('normalizes whitespace recording uri to null when stopping a probe', async () => {
  const runtime = createRuntimePort();
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });
  await engine.startRecordingProbe(10);
  runtime.recorders[0].uri = '   ';

  await expect(engine.stopRecordingProbe()).resolves.toEqual({
    ok: true,
    capturedSeconds: 10,
    recordingUri: null,
  });
});

test('trims captured recording uri when stopping a probe', async () => {
  const runtime = createRuntimePort();
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });
  await engine.startRecordingProbe(10);
  runtime.recorders[0].uri = '  file://recording.m4a  ';

  await expect(engine.stopRecordingProbe()).resolves.toEqual({
    ok: true,
    capturedSeconds: 10,
    recordingUri: 'file://recording.m4a',
  });
});

test('normalizes invalid recorder duration to zero when stopping a probe', async () => {
  const runtime = createRuntimePort();
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });
  await engine.startRecordingProbe(10);
  runtime.recorders[0].durationMillis = Number.NaN;

  await expect(engine.stopRecordingProbe()).resolves.toEqual({
    ok: true,
    capturedSeconds: 0,
    recordingUri: 'file://recording.m4a',
  });
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

test('trims captured recording uri before creating a playback player', async () => {
  const runtime = createRuntimePort();
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });

  await expect(engine.playRecordingProbe('  file://recording.m4a  ')).resolves.toEqual({
    ok: true,
    recordingUri: 'file://recording.m4a',
  });

  expect(runtime.createdPlayers.at(-1)).toEqual({
    source: { uri: 'file://recording.m4a' },
    options: { downloadFirst: false, keepAudioSessionActive: true, updateInterval: 50 },
  });
});

test('rejects whitespace captured recording uri before creating a playback player', async () => {
  const runtime = createRuntimePort();
  const engine = new ExpoAudioSamplerEngine({ manifest, runtime });

  await expect(engine.playRecordingProbe('   ')).resolves.toEqual({
    ok: false,
    reason: 'recording_playback_uri_missing',
  });

  expect(runtime.createdPlayers).toEqual([]);
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

function createRuntimePort(input: {
  blankDownloadedSources?: Set<string>;
  deferSeek?: boolean;
  permissionGranted?: boolean;
  seekFails?: boolean;
  stopFails?: boolean;
} = {}) {
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
      const player = new FakeExpoAudioPlayer({
        deferSeek: input.deferSeek ?? false,
        seekFails: input.seekFails ?? false,
      });
      this.players.push(player);
      return player;
    },
    async downloadAudioSource(source: { uri: string }) {
      this.downloadedSources.push(source);
      if (input.blankDownloadedSources?.has(source.uri)) {
        return { uri: '   ' };
      }

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
  private readonly pendingSeekResolvers: Array<() => void> = [];

  constructor(
    private readonly input: { deferSeek: boolean; seekFails: boolean } = {
      deferSeek: false,
      seekFails: false,
    },
  ) {}

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

    if (this.input.deferSeek) {
      await new Promise<void>((resolve) => {
        this.pendingSeekResolvers.push(resolve);
      });
    }
  }

  setPlaybackRate(rate: number): void {
    this.playbackRates.push(rate);
  }

  resolveNextSeek(): void {
    this.pendingSeekResolvers.shift()?.();
  }
}

class FakeExpoAudioRecorder {
  prepared = false;
  recordCalls: Array<{ forDuration: number }> = [];
  stopCalls = 0;
  durationMillis = 10_000;
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
      durationMillis: this.durationMillis,
      isRecording: false,
      mediaServicesDidReset: false,
      url: this.uri,
    };
  }
}

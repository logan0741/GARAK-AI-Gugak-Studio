import { expect, test } from 'vitest';
import {
  ReactNativeAudioApiFilterPort,
  ReactNativeAudioApiRuntimePort,
  ReactNativeAudioApiSamplerEngine,
} from '../reactNativeAudioApiSamplerEngine';
import { SampleAssetManifest } from '../../domain/sampleManifest';

const manifest: SampleAssetManifest = {
  version: 'test-gayageum-samples',
  assets: Array.from({ length: 8 }, (_, index) => ({
    id: `string-${index + 1}`,
    instrument: 'gayageum_12',
    stringIndex: index + 1,
    pitchHz: 196 + index * 12,
    fileUri: `asset://gayageum/${String(index + 1).padStart(2, '0')}.wav`,
    sourceLayer: 'public_asset',
    sourceName: 'test fixture',
    licenseNote: 'test only',
  })),
};

const mixedInstrumentManifest: SampleAssetManifest = {
  version: 'test-mixed-instrument-samples',
  assets: [
    manifest.assets[0],
    {
      id: 'janggu-gungpyeon',
      instrument: 'janggu',
      surface: 'gungpyeon',
      fileUri: 'asset://janggu/gungpyeon.wav',
      sourceLayer: 'public_asset',
      sourceName: 'test fixture',
      licenseNote: 'test only',
    },
    {
      id: 'daegeum-open',
      instrument: 'daegeum',
      fingering: 'open',
      pitchHz: 392,
      fileUri: 'asset://daegeum/open.wav',
      sourceLayer: 'public_asset',
      sourceName: 'test fixture',
      licenseNote: 'test only',
    },
  ],
};

test('preloads manifest assets into decoded audio buffers', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime });

  const result = await engine.preload();

  expect(result).toEqual({
    candidate: 'react-native-audio-api',
    filterEnabled: true,
    loadedStringIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
    preloadStable: true,
  });
  expect(runtime.context.decodeInputs).toEqual(manifest.assets.map((asset) => asset.fileUri));
});

test('rejects preload when a decoded buffer is missing', async () => {
  const runtime = createRuntimePort({ missingDecodedBuffers: new Set(['asset://gayageum/02.wav']) });
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime });

  await expect(engine.preload()).rejects.toThrow(
    'Decoded react-native-audio-api buffer missing for string 2',
  );
  expect(runtime.context.decodeInputs).toEqual([
    'asset://gayageum/01.wav',
    'asset://gayageum/02.wav',
  ]);
  expect(() =>
    engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 0.8 }),
  ).toThrow('react-native-audio-api engine must be preloaded before handling events');
  expect(runtime.context.sources).toEqual([]);
});

test('rejects invalid voice budgets before creating native graph nodes', () => {
  for (const maxVoices of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
    expect(
      () => new ReactNativeAudioApiSamplerEngine({ manifest, runtime: createRuntimePort(), maxVoices }),
    ).toThrow('maxVoices must be a positive integer');
  }
});

test('creates independent source nodes for at least 8 simultaneous voices', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime, maxVoices: 8 });
  await engine.preload();

  for (let stringIndex = 1; stringIndex <= 8; stringIndex += 1) {
    engine.handleEvent({ type: 'string_pluck', tsMs: 100 + stringIndex, stringIndex, velocity: 0.8 });
  }

  expect(runtime.context.sources).toHaveLength(8);
  expect(runtime.context.sources.map((source) => source.startedAt)).toEqual(Array(8).fill(12.5));
  expect(runtime.context.sources.every((source, index) => source.buffer === runtime.context.buffers[index])).toBe(true);
  expect(runtime.context.gains.map((gain) => gain.gain.value)).toEqual(Array(8).fill(0.8));
  expect(runtime.context.sources.some((source) => source.stopCalls.length > 0)).toBe(false);
});

test('starts native voices for preloaded janggu and daegeum samples', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({
    manifest: mixedInstrumentManifest,
    runtime,
  });
  const result = await engine.preload();

  expect(result.loadedStringIndexes).toEqual([1]);

  engine.handleEvent({ type: 'janggu_hit', tsMs: 100, surface: 'gungpyeon', velocity: 0.6 });
  engine.handleEvent({ type: 'daegeum_note', tsMs: 120, fingering: 'open', breath: 0.9 });

  expect(runtime.context.decodeInputs).toEqual([
    'asset://gayageum/01.wav',
    'asset://janggu/gungpyeon.wav',
    'asset://daegeum/open.wav',
  ]);
  expect(runtime.context.sources).toHaveLength(2);
  expect(runtime.context.sources[0].buffer).toBe(runtime.context.buffers[1]);
  expect(runtime.context.sources[1].buffer).toBe(runtime.context.buffers[2]);
  expect(runtime.context.gains.map((gain) => gain.gain.value)).toEqual([0.6, 0.9]);
});

test('rejects non-finite React Native Audio API control values before touching native nodes', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime });
  await engine.preload();

  expect(() =>
    engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: Number.NaN }),
  ).toThrow('velocity must be finite');
  expect(runtime.context.sources).toHaveLength(0);

  engine.handleEvent({ type: 'string_pluck', tsMs: 110, stringIndex: 1, velocity: 0.8 });

  expect(() =>
    engine.handleEvent({ type: 'string_bend', tsMs: 120, stringIndex: 1, cents: Number.POSITIVE_INFINITY }),
  ).toThrow('cents must be finite');
  expect(runtime.context.sources[0].detune.automation).toEqual([]);

  expect(() =>
    engine.handleEvent({ type: 'string_mute', tsMs: 130, stringIndex: 1, strength: Number.NaN }),
  ).toThrow('strength must be finite');
  expect(runtime.context.gains[0].gain.automation).toEqual([]);
});

test('rejects invalid React Native Audio API performance event identity before touching native nodes', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime });
  await engine.preload();

  expect(() =>
    engine.handleEvent({ type: 'string_pluck', tsMs: Number.NaN, stringIndex: 1, velocity: 0.8 }),
  ).toThrow('tsMs must be finite');
  expect(runtime.context.sources).toHaveLength(0);

  expect(() =>
    engine.handleEvent({ type: 'string_mute', tsMs: 130, stringIndex: 13, strength: 0.8 }),
  ).toThrow('stringIndex must be an integer from 1 to 12. Received: 13');
  expect(runtime.context.gains).toEqual([]);
});

test('connects each voice through a lowpass filter and gain before destination', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime });
  await engine.preload();

  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 0.65 });

  expect(runtime.context.filters[0]).toMatchObject({
    type: 'lowpass',
  });
  expect(runtime.context.filters[0].frequency.value).toBe(12_000);
  expect(runtime.context.filters[0].Q.value).toBe(0.707);
  expect(runtime.context.sources[0].connections).toEqual([runtime.context.filters[0]]);
  expect(runtime.context.filters[0].connections).toEqual([runtime.context.gains[0]]);
  expect(runtime.context.gains[0].connections).toEqual([runtime.context.destination]);
});

test('applies pitch bend to active voices through detune automation', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime });
  await engine.preload();
  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 });

  engine.handleEvent({ type: 'string_bend', tsMs: 130, stringIndex: 3, cents: 85 });

  expect(runtime.context.sources[0].detune.automation).toEqual([
    { type: 'setTargetAtTime', target: 85, startTime: 12.5, timeConstant: 0.015 },
  ]);
});

test('does not apply a new same-string bend to an already released voice', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime });
  await engine.preload();
  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.8 });
  engine.handleEvent({ type: 'string_release', tsMs: 120, stringIndex: 3 });
  engine.handleEvent({ type: 'string_pluck', tsMs: 140, stringIndex: 3, velocity: 0.8 });

  engine.handleEvent({ type: 'string_bend', tsMs: 160, stringIndex: 3, cents: 85 });

  expect(runtime.context.sources[0].detune.automation).toEqual([]);
  expect(runtime.context.sources[1].detune.automation).toEqual([
    { type: 'setTargetAtTime', target: 85, startTime: 12.5, timeConstant: 0.015 },
  ]);
});

test('maps mute and release onto gain envelope and source stop', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime });
  await engine.preload();
  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 4, velocity: 0.8 });

  engine.handleEvent({ type: 'string_mute', tsMs: 140, stringIndex: 4, strength: 0.75 });
  engine.handleEvent({ type: 'string_release', tsMs: 180, stringIndex: 4 });

  expect(runtime.context.gains[0].gain.automation).toEqual([
    { type: 'setTargetAtTime', target: 0.25, startTime: 12.5, timeConstant: 0.035 },
    { type: 'setTargetAtTime', target: 0, startTime: 12.5, timeConstant: 0.05 },
  ]);
  expect(runtime.context.sources[0].stopCalls).toEqual([12.62]);
});

test('does not schedule duplicate source stops for repeated release events', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime });
  await engine.preload();
  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 4, velocity: 0.8 });

  engine.handleEvent({ type: 'string_release', tsMs: 180, stringIndex: 4 });
  engine.handleEvent({ type: 'string_release', tsMs: 181, stringIndex: 4 });

  expect(runtime.context.gains[0].gain.automation).toEqual([
    { type: 'setTargetAtTime', target: 0, startTime: 12.5, timeConstant: 0.05 },
  ]);
  expect(runtime.context.sources[0].stopCalls).toEqual([12.62]);
});

test('does not stop an already released voice again when enforcing the voice budget', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime, maxVoices: 1 });
  await engine.preload();
  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 0.8 });
  engine.handleEvent({ type: 'string_release', tsMs: 150, stringIndex: 1 });

  engine.handleEvent({ type: 'string_pluck', tsMs: 160, stringIndex: 2, velocity: 0.8 });

  expect(runtime.context.sources[0].stopCalls).toEqual([12.62]);
  expect(runtime.context.sources[0].disconnectCalls).toEqual([]);
  expect(runtime.context.sources[1].stopCalls).toEqual([]);
});

test('steals the oldest voice only after the configured voice budget is exceeded', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime, maxVoices: 2 });
  await engine.preload();

  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 0.8 });
  engine.handleEvent({ type: 'string_pluck', tsMs: 110, stringIndex: 2, velocity: 0.8 });
  engine.handleEvent({ type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 });

  expect(runtime.context.sources[0].stopCalls).toEqual([12.5]);
  expect(runtime.context.sources[0].onEnded).toBeNull();
  expect(runtime.context.sources[1].stopCalls).toEqual([]);
  expect(runtime.context.sources[2].stopCalls).toEqual([]);
});

test('does not disconnect a stolen voice twice when the native end event arrives later', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime, maxVoices: 1 });
  await engine.preload();

  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 0.8 });
  engine.handleEvent({ type: 'string_pluck', tsMs: 110, stringIndex: 2, velocity: 0.8 });

  runtime.context.sources[0].onEnded?.(undefined as never);

  expect(runtime.context.sources[0].disconnectCalls).toEqual([runtime.context.filters[0]]);
  expect(runtime.context.filters[0].disconnectCalls).toEqual([runtime.context.gains[0]]);
  expect(runtime.context.gains[0].disconnectCalls).toEqual([runtime.context.destination]);
});

test('cleans up a voice graph when the native source ends', async () => {
  const runtime = createRuntimePort();
  const engine = new ReactNativeAudioApiSamplerEngine({ manifest, runtime, maxVoices: 2 });
  await engine.preload();
  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 0.8 });
  engine.handleEvent({ type: 'string_pluck', tsMs: 110, stringIndex: 2, velocity: 0.8 });

  expect(runtime.context.sources[0].onEnded).toEqual(expect.any(Function));
  runtime.context.sources[0].onEnded?.(undefined as never);
  engine.handleEvent({ type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 });

  expect(runtime.context.sources[0].disconnectCalls).toEqual([runtime.context.filters[0]]);
  expect(runtime.context.filters[0].disconnectCalls).toEqual([runtime.context.gains[0]]);
  expect(runtime.context.gains[0].disconnectCalls).toEqual([runtime.context.destination]);
  expect(runtime.context.sources[1].stopCalls).toEqual([]);
  expect(runtime.context.sources[2].stopCalls).toEqual([]);
});

function createRuntimePort(input: { missingDecodedBuffers?: Set<string> } = {}) {
  const context = new FakeAudioContext(input);
  const runtime = {
    context,
    createAudioContext() {
      return context;
    },
  } satisfies ReactNativeAudioApiRuntimePort & { context: FakeAudioContext };

  return runtime;
}

class FakeAudioContext {
  currentTime = 12.5;
  destination = new FakeAudioNode();
  decodeInputs: string[] = [];
  buffers: FakeAudioBuffer[] = [];
  sources: FakeAudioBufferSourceNode[] = [];
  gains: FakeGainNode[] = [];
  filters: FakeBiquadFilterNode[] = [];

  constructor(private readonly input: { missingDecodedBuffers?: Set<string> } = {}) {}

  async decodeAudioData(input: string): Promise<FakeAudioBuffer | null> {
    this.decodeInputs.push(input);
    if (this.input.missingDecodedBuffers?.has(input)) {
      return null;
    }

    const buffer = new FakeAudioBuffer(input);
    this.buffers.push(buffer);
    return buffer;
  }

  createBufferSource(): FakeAudioBufferSourceNode {
    const source = new FakeAudioBufferSourceNode();
    this.sources.push(source);
    return source;
  }

  createGain(): FakeGainNode {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain;
  }

  createBiquadFilter(): FakeBiquadFilterNode {
    const filter = new FakeBiquadFilterNode();
    this.filters.push(filter);
    return filter;
  }
}

class FakeAudioBuffer {
  constructor(readonly input: string) {}
}

class FakeAudioNode {
  connections: unknown[] = [];
  disconnectCalls: unknown[] = [];

  connect(destination: unknown): FakeAudioNode {
    this.connections.push(destination);
    return this;
  }

  disconnect(destination?: unknown): void {
    this.disconnectCalls.push(destination);
  }
}

class FakeAudioParam {
  value = 0;
  automation: Array<{ type: 'setTargetAtTime'; target: number; startTime: number; timeConstant: number }> = [];

  setTargetAtTime(target: number, startTime: number, timeConstant: number): FakeAudioParam {
    this.automation.push({ type: 'setTargetAtTime', target, startTime, timeConstant });
    this.value = target;
    return this;
  }
}

class FakeAudioBufferSourceNode extends FakeAudioNode {
  buffer: FakeAudioBuffer | null = null;
  detune = new FakeAudioParam();
  playbackRate = new FakeAudioParam();
  onEnded: ((event: never) => void) | null | undefined;
  startedAt: number | undefined;
  stopCalls: number[] = [];

  start(when?: number): void {
    this.startedAt = when;
  }

  stop(when?: number): void {
    this.stopCalls.push(when ?? 0);
  }
}

class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam();
}

class FakeBiquadFilterNode extends FakeAudioNode {
  type: ReactNativeAudioApiFilterPort['type'] = 'lowpass';
  frequency = new FakeAudioParam();
  Q = new FakeAudioParam();
}

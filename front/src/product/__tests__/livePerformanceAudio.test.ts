import { expect, test } from 'vitest';
import type { PerformanceEvent } from '../../domain/performanceEvent';
import type { SampleAssetManifest } from '../../domain/sampleManifest';
import type { SamplerEngine } from '../../audio/samplerEngine';
import type { InstrumentId } from '../../studio/studioTypes';
import { createLivePerformanceAudioPort } from '../livePerformanceAudio';

test('prepares and caches live samplers by instrument', async () => {
  const createdInstruments: InstrumentId[] = [];
  const port = createLivePerformanceAudioPort({
    createSampler: async ({ instrument }) => {
      createdInstruments.push(instrument);
      return {
        engine: createRecordingSamplerEngine(),
        sampleSourceLabel: `${instrument} sampler`,
        releaseReady: false,
      };
    },
  });

  await expect(port.prepareLivePerformanceAudio({ instrument: 'janggu' })).resolves.toMatchObject({
    status: 'ok',
    value: { instrument: 'janggu' },
  });
  await expect(port.prepareLivePerformanceAudio({ instrument: 'daegeum' })).resolves.toMatchObject({
    status: 'ok',
    value: { instrument: 'daegeum' },
  });
  await expect(port.prepareLivePerformanceAudio({ instrument: 'janggu' })).resolves.toMatchObject({
    status: 'ok',
    value: { instrument: 'janggu' },
  });

  expect(createdInstruments).toEqual(['janggu', 'daegeum']);
});

test('plays live performance events through the requested instrument sampler', async () => {
  const event: PerformanceEvent = {
    type: 'string_pluck',
    tsMs: 120,
    stringIndex: 3,
    velocity: 0.7,
  };
  const createdInstruments: InstrumentId[] = [];
  const handledEventsByInstrument = new Map<InstrumentId, PerformanceEvent[]>();
  const port = createLivePerformanceAudioPort({
    createSampler: async ({ instrument }) => {
      createdInstruments.push(instrument);
      return {
        engine: createRecordingSamplerEngine((handledEvent) => {
          handledEventsByInstrument.set(instrument, [
            ...(handledEventsByInstrument.get(instrument) ?? []),
            handledEvent,
          ]);
        }),
        sampleSourceLabel: `${instrument} sampler`,
        releaseReady: false,
      };
    },
  });

  await expect(port.prepareLivePerformanceAudio({ instrument: 'janggu' })).resolves.toMatchObject({
    status: 'ok',
  });
  await expect(
    port.playPerformanceEvents({ instrument: 'daegeum', events: [event] }),
  ).resolves.toEqual({
    status: 'ok',
    value: { handledEvents: 1 },
  });

  expect(createdInstruments).toEqual(['janggu', 'daegeum']);
  expect(handledEventsByInstrument.get('janggu')).toBeUndefined();
  expect(handledEventsByInstrument.get('daegeum')).toEqual([event]);
});

test('passes loaded instrument sample manifests into sampler preparation', async () => {
  const loadedInstruments: InstrumentId[] = [];
  const samplerInputs: Array<{ instrument: InstrumentId; manifest?: SampleAssetManifest }> = [];
  const manifest: SampleAssetManifest = {
    version: '2026.07.janggu',
    assets: [
      {
        id: 'janggu-left-hit',
        instrument: 'janggu',
        stringIndex: 3,
        pitchHz: 110,
        fileUri: 'assets/audio/janggu/left-hit.wav',
        sourceLayer: 'public_asset',
        sourceName: 'National Gugak Center monotone candidate',
        licenseNote: 'KOGL type 1 attribution required',
      },
    ],
  };
  const port = createLivePerformanceAudioPort({
    loadSampleManifest: async ({ instrument }) => {
      loadedInstruments.push(instrument);
      return {
        status: 'ok',
        value: manifest,
      };
    },
    createSampler: async (input) => {
      samplerInputs.push(input);
      return {
        engine: createRecordingSamplerEngine(),
        sampleSourceLabel: `${input.instrument} sampler`,
        releaseReady: true,
      };
    },
  });

  await expect(port.prepareLivePerformanceAudio({ instrument: 'janggu' })).resolves.toMatchObject({
    status: 'ok',
    value: { instrument: 'janggu' },
  });

  expect(loadedInstruments).toEqual(['janggu']);
  expect(samplerInputs).toEqual([
    {
      instrument: 'janggu',
      manifest,
    },
  ]);
});

test('falls back to bundled sampler preparation when a loaded manifest cannot preload', async () => {
  const samplerInputs: Array<{ instrument: InstrumentId; manifest?: SampleAssetManifest }> = [];
  const manifest: SampleAssetManifest = {
    version: '2026.07.remote-janggu',
    assets: [
      {
        id: 'remote-janggu-left-hit',
        instrument: 'janggu',
        stringIndex: 3,
        pitchHz: 110,
        fileUri: 'https://cdn.example.com/janggu/left-hit.wav',
        sourceLayer: 'public_asset',
        sourceName: 'National Gugak Center monotone candidate',
        licenseNote: 'KOGL type 1 attribution required',
      },
    ],
  };
  const port = createLivePerformanceAudioPort({
    loadSampleManifest: async () => ({
      status: 'ok',
      value: manifest,
    }),
    createSampler: async (input) => {
      samplerInputs.push(input);
      if (input.manifest !== undefined) {
        throw new Error('native sampler cannot preload remote sample yet');
      }

      return {
        engine: createRecordingSamplerEngine(),
        sampleSourceLabel: `${input.instrument} bundled sampler`,
        releaseReady: false,
      };
    },
  });

  await expect(port.prepareLivePerformanceAudio({ instrument: 'janggu' })).resolves.toEqual({
    status: 'ok',
    value: {
      instrument: 'janggu',
      sampleSourceLabel: 'janggu bundled sampler',
      releaseReady: false,
    },
  });

  expect(samplerInputs).toEqual([
    {
      instrument: 'janggu',
      manifest,
    },
    {
      instrument: 'janggu',
      manifest: undefined,
    },
  ]);
});

function createRecordingSamplerEngine(
  onEvent: (event: PerformanceEvent) => void = () => undefined,
): SamplerEngine {
  const events: PerformanceEvent[] = [];

  return {
    handleEvent(event) {
      events.push(event);
      onEvent(event);
    },
  };
}

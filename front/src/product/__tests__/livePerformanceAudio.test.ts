import { expect, test } from 'vitest';
import type { PerformanceEvent } from '../../domain/performanceEvent';
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

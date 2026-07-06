import { expect, test } from 'vitest';
import type { PerformanceEvent } from '../../domain/performanceEvent';
import type { InstrumentId } from '../../studio/studioTypes';
import { createNoopGarakProductServices } from '../garakProductServices';
import type { GarakProductAction } from '../garakProductState';
import { playLivePerformanceEventsWithFailureDispatch } from '../livePerformanceEventPlayback';

test('surfaces live performance event playback service failures to product state', async () => {
  const events: PerformanceEvent[] = [
    { type: 'string_pluck', tsMs: 120, stringIndex: 2, velocity: 0.7 },
  ];
  const dispatched: GarakProductAction[] = [];
  const noopServices = createNoopGarakProductServices();
  const services = {
    ...noopServices,
    audio: {
      ...noopServices.audio,
      playPerformanceEvents: async (input: { instrument: InstrumentId; events: readonly PerformanceEvent[] }) => {
        expect(input).toEqual({
          instrument: 'janggu',
          events,
        });
        return {
          status: 'error' as const,
          message: 'speaker route unavailable',
        };
      },
    },
  };

  await playLivePerformanceEventsWithFailureDispatch({
    services,
    instrument: 'janggu',
    events,
    dispatch: (action) => dispatched.push(action),
  });

  expect(dispatched).toEqual([
    {
      type: 'failLivePerformanceEventPlayback',
      instrument: 'janggu',
      message: 'speaker route unavailable',
    },
  ]);
});

test('records successful live performance event playback evidence', async () => {
  const events: PerformanceEvent[] = [
    { type: 'string_pluck', tsMs: 120, stringIndex: 2, velocity: 0.7 },
    { type: 'string_release', tsMs: 260, stringIndex: 2 },
  ];
  const dispatched: GarakProductAction[] = [];
  const noopServices = createNoopGarakProductServices();
  const services = {
    ...noopServices,
    audio: {
      ...noopServices.audio,
      playPerformanceEvents: async (input: { instrument: InstrumentId; events: readonly PerformanceEvent[] }) => {
        expect(input).toEqual({
          instrument: 'janggu',
          events,
        });
        return {
          status: 'ok' as const,
          value: { handledEvents: input.events.length },
        };
      },
    },
  };

  await playLivePerformanceEventsWithFailureDispatch({
    services,
    instrument: 'janggu',
    events,
    dispatch: (action) => dispatched.push(action),
  });

  expect(dispatched).toEqual([
    {
      type: 'completeLivePerformanceEventPlayback',
      instrument: 'janggu',
      eventCount: 2,
    },
  ]);
});

test('surfaces thrown live performance event playback errors to product state', async () => {
  const dispatched: GarakProductAction[] = [];
  const noopServices = createNoopGarakProductServices();
  const services = {
    ...noopServices,
    audio: {
      ...noopServices.audio,
      playPerformanceEvents: async () => {
        throw new Error('audio runtime crashed');
      },
    },
  };

  await playLivePerformanceEventsWithFailureDispatch({
    services,
    instrument: 'daegeum',
    events: [],
    dispatch: (action) => dispatched.push(action),
  });

  expect(dispatched).toEqual([
    {
      type: 'failLivePerformanceEventPlayback',
      instrument: 'daegeum',
      message: 'audio runtime crashed',
    },
  ]);
});

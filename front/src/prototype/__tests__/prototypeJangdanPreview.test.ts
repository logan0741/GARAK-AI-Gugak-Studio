import { expect, test } from 'vitest';
import { PerformanceEvent } from '../../domain/performanceEvent';
import {
  createPrototypeJangdanPreview,
  formatPrototypeJangdanPreview,
} from '../prototypeJangdanPreview';

function plucks(tsValues: number[]): PerformanceEvent[] {
  return tsValues.map((tsMs, index) => ({
    type: 'string_pluck',
    tsMs,
    stringIndex: (index % 12) + 1,
    velocity: 1,
  }));
}

test('waits for enough pluck-like events before previewing a jangdan recommendation', () => {
  const preview = createPrototypeJangdanPreview([
    ...plucks([0, 900, 1800]),
    { type: 'string_bend', tsMs: 2100, stringIndex: 1, cents: 30 },
  ]);

  expect(preview).toEqual({
    minimumEvents: 4,
    observedEvents: 3,
    status: 'insufficient_events',
  });
  expect(formatPrototypeJangdanPreview(preview)).toBe('waiting for event context');
});

test('formats a local jangdan recommendation preview without auto-starting accompaniment', () => {
  const preview = createPrototypeJangdanPreview([
    ...plucks([0, 900, 1800]),
    { type: 'glissando_step', tsMs: 2700, stringIndex: 4, velocity: 1 },
  ]);

  expect(preview).toEqual({
    observedEvents: 4,
    recommendation: {
      bpmEstimate: 67,
      density: 'low',
      jangdan: 'jungmori',
      reason: 'slow tempo and low density suggest jungmori',
      score: 0.8,
    },
    status: 'ready',
  });
  expect(formatPrototypeJangdanPreview(preview)).toBe(
    'jungmori | score 0.8 | 67 BPM | low | slow tempo and low density suggest jungmori',
  );
});

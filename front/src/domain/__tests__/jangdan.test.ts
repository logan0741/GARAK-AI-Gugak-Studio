import { expect, test } from 'vitest';
import { recommendJangdan } from '../jangdan';
import { PerformanceEvent } from '../performanceEvent';

function plucks(tsValues: number[]): PerformanceEvent[] {
  return tsValues.map((tsMs, index) => ({
    type: 'string_pluck',
    tsMs,
    stringIndex: (index % 12) + 1,
    velocity: 1,
  }));
}

test('recommends jungmori for slow sparse playing', () => {
  const result = recommendJangdan(plucks([0, 900, 1800, 2700]));

  expect(result.jangdan).toBe('jungmori');
  expect(result.reason).toContain('slow tempo');
});

test('recommends gutgeori for medium tempo playing', () => {
  const result = recommendJangdan(plucks([0, 650, 1300, 1950, 2600]));

  expect(result.jangdan).toBe('gutgeori');
});

test('recommends jajinmori for fast dense playing', () => {
  const result = recommendJangdan(plucks([0, 300, 600, 900, 1200, 1500, 1800]));

  expect(result.jangdan).toBe('jajinmori');
});

import { expect, test } from 'vitest';
import { createTouchModel } from '../touchModel';

const layout = {
  topY: 0,
  height: 120,
  stringCount: 12,
} as const;

test('fires a pluck immediately on touch start for the string under the finger', () => {
  const model = createTouchModel({ layout });

  expect(
    model.handleFrame({
      phase: 'start',
      pointerId: 'p1',
      tsMs: 100,
      x: 40,
      y: 25,
      force: 0.72,
    }),
  ).toEqual([{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 0.72 }]);
});

test('emits glissando steps for every newly crossed string during a swipe', () => {
  const model = createTouchModel({ layout });
  model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 15 });

  expect(model.handleFrame({ phase: 'move', pointerId: 'p1', tsMs: 120, x: 42, y: 45 })).toEqual([
    { type: 'glissando_step', tsMs: 120, stringIndex: 3, velocity: 1 },
    { type: 'glissando_step', tsMs: 136, stringIndex: 4, velocity: 1 },
    { type: 'glissando_step', tsMs: 152, stringIndex: 5, velocity: 1 },
  ]);
});

test('emits reverse glissando steps in crossed-string order', () => {
  const model = createTouchModel({ layout });
  model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 45 });

  expect(model.handleFrame({ phase: 'move', pointerId: 'p1', tsMs: 120, x: 38, y: 15 })).toEqual([
    { type: 'glissando_step', tsMs: 120, stringIndex: 4, velocity: 1 },
    { type: 'glissando_step', tsMs: 136, stringIndex: 3, velocity: 1 },
    { type: 'glissando_step', tsMs: 152, stringIndex: 2, velocity: 1 },
  ]);
});

test('does not switch a swipe pointer into bend mode after crossing strings', () => {
  const model = createTouchModel({ layout, holdThresholdMs: 120, bendRangePx: 80 });
  model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 15 });
  model.handleFrame({ phase: 'move', pointerId: 'p1', tsMs: 130, x: 42, y: 45 });

  expect(model.handleFrame({ phase: 'move', pointerId: 'p1', tsMs: 260, x: 140, y: 45 })).toEqual([]);
});

test('maps same-string hold drag into pitch bend after the hold threshold', () => {
  const model = createTouchModel({ layout, holdThresholdMs: 120, bendRangePx: 80 });
  model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 35 });

  expect(model.handleFrame({ phase: 'move', pointerId: 'p1', tsMs: 240, x: 120, y: 36 })).toEqual([
    { type: 'string_bend', tsMs: 240, stringIndex: 4, cents: 60 },
  ]);
});

test('does not emit bend events before the hold threshold', () => {
  const model = createTouchModel({ layout, holdThresholdMs: 120, bendRangePx: 80 });
  model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 35 });

  expect(model.handleFrame({ phase: 'move', pointerId: 'p1', tsMs: 180, x: 120, y: 35 })).toEqual([]);
});

test('maps a broad contact area to ji-eum mute', () => {
  const model = createTouchModel({ layout, muteAreaThreshold: 0.65 });
  model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 55 });

  expect(model.handleFrame({ phase: 'move', pointerId: 'p1', tsMs: 150, x: 42, y: 55, contactArea: 0.8 })).toEqual([
    { type: 'string_mute', tsMs: 150, stringIndex: 6, strength: 0.8 },
  ]);
});

test('falls back to the first string before layout height is measured', () => {
  const model = createTouchModel({
    layout: {
      topY: 0,
      height: 0,
      stringCount: 12,
    },
  });

  expect(model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 55 })).toEqual([
    { type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 },
  ]);
});

test('emits release on touch end and ignores later frames for that pointer', () => {
  const model = createTouchModel({ layout });
  model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 55 });

  expect(model.handleFrame({ phase: 'end', pointerId: 'p1', tsMs: 180, x: 42, y: 55 })).toEqual([
    { type: 'string_release', tsMs: 180, stringIndex: 6 },
  ]);
  expect(model.handleFrame({ phase: 'move', pointerId: 'p1', tsMs: 200, x: 42, y: 65 })).toEqual([]);
});

import { expect, test } from 'vitest';
import { createTouchModel } from '../touchModel';

const layout = {
  topY: 0,
  height: 120,
  stringCount: 12,
} as const;

test('rejects invalid touch layouts before creating session evidence', () => {
  expect(() => createTouchModel({ layout: { ...layout, topY: Number.NaN } })).toThrow(
    'touch layout topY must be finite',
  );
  expect(() => createTouchModel({ layout: { ...layout, height: 0 } })).toThrow(
    'touch layout height must be finite and > 0',
  );
  expect(() => createTouchModel({ layout: { ...layout, height: Number.POSITIVE_INFINITY } })).toThrow(
    'touch layout height must be finite and > 0',
  );
});

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

test('does not retain a pointer when touch start rejects a non-finite velocity', () => {
  const model = createTouchModel({ layout });

  expect(() =>
    model.handleFrame({
      phase: 'start',
      pointerId: 'p1',
      tsMs: 100,
      x: 40,
      y: 25,
      force: Number.NaN,
    }),
  ).toThrow('velocity must be finite');

  expect(model.handleFrame({ phase: 'end', pointerId: 'p1', tsMs: 120, x: 40, y: 25 })).toEqual([]);
});

test('does not retain a pointer when touch start rejects a non-finite x coordinate', () => {
  const model = createTouchModel({ layout });

  expect(() =>
    model.handleFrame({
      phase: 'start',
      pointerId: 'p1',
      tsMs: 100,
      x: Number.NaN,
      y: 25,
      force: 0.72,
    }),
  ).toThrow('touch x must be finite');

  expect(model.handleFrame({ phase: 'end', pointerId: 'p1', tsMs: 120, x: 40, y: 25 })).toEqual([]);
});

test('does not treat non-finite contact area as a tap or mute gesture', () => {
  const model = createTouchModel({ layout, muteAreaThreshold: 0.65 });

  expect(() =>
    model.handleFrame({
      phase: 'start',
      pointerId: 'p1',
      tsMs: 100,
      x: 40,
      y: 55,
      contactArea: Number.POSITIVE_INFINITY,
    }),
  ).toThrow('touch contactArea must be finite');

  expect(model.handleFrame({ phase: 'end', pointerId: 'p1', tsMs: 120, x: 40, y: 55 })).toEqual([]);
});

test('does not advance swipe state when a crossed-string move rejects a non-finite timestamp', () => {
  const model = createTouchModel({ layout });
  model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 15 });

  expect(() =>
    model.handleFrame({
      phase: 'move',
      pointerId: 'p1',
      tsMs: Number.NaN,
      x: 42,
      y: 45,
    }),
  ).toThrow('tsMs must be finite');

  expect(model.handleFrame({ phase: 'move', pointerId: 'p1', tsMs: 120, x: 42, y: 45 })).toEqual([
    { type: 'glissando_step', tsMs: 120, stringIndex: 3, velocity: 1 },
    { type: 'glissando_step', tsMs: 136, stringIndex: 4, velocity: 1 },
    { type: 'glissando_step', tsMs: 152, stringIndex: 5, velocity: 1 },
  ]);
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

test('does not mark a ji-eum string muted when the mute frame rejects a non-finite timestamp', () => {
  const model = createTouchModel({ layout, muteAreaThreshold: 0.65 });
  model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 55 });

  expect(() =>
    model.handleFrame({
      phase: 'move',
      pointerId: 'p1',
      tsMs: Number.NaN,
      x: 42,
      y: 55,
      contactArea: 0.8,
    }),
  ).toThrow('tsMs must be finite');

  expect(model.handleFrame({ phase: 'move', pointerId: 'p1', tsMs: 150, x: 42, y: 55, contactArea: 0.8 })).toEqual([
    { type: 'string_mute', tsMs: 150, stringIndex: 6, strength: 0.8 },
  ]);
});

test('does not turn a ji-eum mute pointer into glissando before release', () => {
  const model = createTouchModel({ layout, muteAreaThreshold: 0.65 });
  model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 55 });
  model.handleFrame({ phase: 'move', pointerId: 'p1', tsMs: 150, x: 42, y: 55, contactArea: 0.8 });

  expect(model.handleFrame({ phase: 'move', pointerId: 'p1', tsMs: 180, x: 42, y: 85 })).toEqual([]);
});

test('emits release on touch end and ignores later frames for that pointer', () => {
  const model = createTouchModel({ layout });
  model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 55 });

  expect(model.handleFrame({ phase: 'end', pointerId: 'p1', tsMs: 180, x: 42, y: 55 })).toEqual([
    { type: 'string_release', tsMs: 180, stringIndex: 6 },
  ]);
  expect(model.handleFrame({ phase: 'move', pointerId: 'p1', tsMs: 200, x: 42, y: 65 })).toEqual([]);
});

test('does not clear the active pointer when release rejects a non-finite timestamp', () => {
  const model = createTouchModel({ layout });
  model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 55 });

  expect(() =>
    model.handleFrame({
      phase: 'end',
      pointerId: 'p1',
      tsMs: Number.NaN,
      x: 42,
      y: 55,
    }),
  ).toThrow('tsMs must be finite');

  expect(model.handleFrame({ phase: 'end', pointerId: 'p1', tsMs: 180, x: 42, y: 55 })).toEqual([
    { type: 'string_release', tsMs: 180, stringIndex: 6 },
  ]);
});

test('does not clear the active pointer when release rejects a non-finite y coordinate', () => {
  const model = createTouchModel({ layout });
  model.handleFrame({ phase: 'start', pointerId: 'p1', tsMs: 100, x: 40, y: 55 });

  expect(() =>
    model.handleFrame({
      phase: 'end',
      pointerId: 'p1',
      tsMs: 180,
      x: 42,
      y: Number.NaN,
    }),
  ).toThrow('touch y must be finite');

  expect(model.handleFrame({ phase: 'end', pointerId: 'p1', tsMs: 190, x: 42, y: 55 })).toEqual([
    { type: 'string_release', tsMs: 190, stringIndex: 6 },
  ]);
});

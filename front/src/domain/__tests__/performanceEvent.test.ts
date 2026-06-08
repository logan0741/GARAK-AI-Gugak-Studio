import { expect, test } from 'vitest';
import { clampBendCents, createStringBend, createStringPluck } from '../performanceEvent';

test('creates string pluck events with timestamp and string index', () => {
  const event = createStringPluck({ tsMs: 120, stringIndex: 4, velocity: 0.8 });

  expect(event).toEqual({
    type: 'string_pluck',
    tsMs: 120,
    stringIndex: 4,
    velocity: 0.8,
  });
});

test('clamps bend cents to the MVP safe range', () => {
  expect(clampBendCents(180)).toBe(120);
  expect(clampBendCents(-180)).toBe(-120);
  expect(clampBendCents(35)).toBe(35);
});

test('rejects non-finite bend cents before creating pitch events', () => {
  expect(() => clampBendCents(Number.NaN)).toThrow('cents must be finite');
  expect(() =>
    createStringBend({ tsMs: 240, stringIndex: 7, cents: Number.POSITIVE_INFINITY }),
  ).toThrow('cents must be finite');
});

test('creates string bend events with clamped cents', () => {
  const event = createStringBend({ tsMs: 240, stringIndex: 7, cents: 160 });

  expect(event).toEqual({
    type: 'string_bend',
    tsMs: 240,
    stringIndex: 7,
    cents: 120,
  });
});

test('rejects non-finite timestamps when creating performance events', () => {
  expect(() =>
    createStringPluck({ tsMs: Number.NaN, stringIndex: 4, velocity: 0.8 }),
  ).toThrow('tsMs must be finite');
  expect(() =>
    createStringBend({ tsMs: Number.POSITIVE_INFINITY, stringIndex: 7, cents: 60 }),
  ).toThrow('tsMs must be finite');
});

import { expect, test } from 'vitest';
import {
  assertPerformanceEvent,
  clampBendCents,
  createDaegeumNote,
  createJangguHit,
  createStringBend,
  createStringMute,
  createStringPluck,
} from '../performanceEvent';

test('creates string pluck events with timestamp and string index', () => {
  const event = createStringPluck({ tsMs: 120, stringIndex: 4, velocity: 0.8 });

  expect(event).toEqual({
    type: 'string_pluck',
    tsMs: 120,
    stringIndex: 4,
    velocity: 0.8,
  });
});

test('rejects non-finite pluck velocity before creating audio gain events', () => {
  expect(() =>
    createStringPluck({ tsMs: 120, stringIndex: 4, velocity: Number.NaN }),
  ).toThrow('velocity must be finite');
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

test('creates string mute events with clamped strength', () => {
  expect(createStringMute({ tsMs: 300, stringIndex: 2, strength: 1.4 })).toEqual({
    type: 'string_mute',
    tsMs: 300,
    stringIndex: 2,
    strength: 1,
  });
  expect(createStringMute({ tsMs: 320, stringIndex: 2, strength: -0.4 })).toEqual({
    type: 'string_mute',
    tsMs: 320,
    stringIndex: 2,
    strength: 0,
  });
});

test('creates janggu hit events with a surface and clamped velocity', () => {
  expect(createJangguHit({ tsMs: 420, surface: 'gungpyeon', velocity: 1.4 })).toEqual({
    type: 'janggu_hit',
    tsMs: 420,
    surface: 'gungpyeon',
    velocity: 1,
  });
});

test('creates daegeum note events with fingering and clamped breath', () => {
  expect(createDaegeumNote({ tsMs: 520, fingering: 'open', breath: 1.2 })).toEqual({
    type: 'daegeum_note',
    tsMs: 520,
    fingering: 'open',
    breath: 1,
  });
});

test('rejects non-finite mute strength before creating gain events', () => {
  expect(() =>
    createStringMute({ tsMs: 300, stringIndex: 2, strength: Number.NaN }),
  ).toThrow('strength must be finite');
});

test('rejects non-finite timestamps when creating performance events', () => {
  expect(() =>
    createStringPluck({ tsMs: Number.NaN, stringIndex: 4, velocity: 0.8 }),
  ).toThrow('tsMs must be finite');
  expect(() =>
    createStringBend({ tsMs: Number.POSITIVE_INFINITY, stringIndex: 7, cents: 60 }),
  ).toThrow('tsMs must be finite');
});

test('rejects invalid literal performance events before session storage', () => {
  expect(() =>
    assertPerformanceEvent({
      type: 'string_pluck',
      tsMs: Number.NaN,
      stringIndex: 1,
      velocity: 1,
    }),
  ).toThrow('tsMs must be finite');

  expect(() =>
    assertPerformanceEvent({
      type: 'string_bend',
      tsMs: 100,
      stringIndex: 13,
      cents: 20,
    }),
  ).toThrow('stringIndex must be an integer from 1 to 12. Received: 13');

  expect(() =>
    assertPerformanceEvent({
      type: 'string_mute',
      tsMs: 100,
      stringIndex: 1,
      strength: Number.NaN,
    }),
  ).toThrow('strength must be finite');

  expect(() =>
    assertPerformanceEvent({
      type: 'glissando_step',
      tsMs: 100,
      stringIndex: 1,
      velocity: Number.POSITIVE_INFINITY,
    }),
  ).toThrow('velocity must be finite');
});

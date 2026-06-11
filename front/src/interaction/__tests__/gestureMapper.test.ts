import { expect, test } from 'vitest';
import { mapCover, mapHoldDrag, mapRelease, mapSwipeAcrossStrings, mapTap } from '../gestureMapper';

test('maps a tap to string_pluck', () => {
  expect(mapTap({ tsMs: 100, stringIndex: 3 })).toEqual({
    type: 'string_pluck',
    tsMs: 100,
    stringIndex: 3,
    velocity: 1,
  });
});

test('maps hold drag distance to clamped string_bend cents', () => {
  expect(mapHoldDrag({ tsMs: 200, stringIndex: 3, normalizedDelta: 2 })).toEqual({
    type: 'string_bend',
    tsMs: 200,
    stringIndex: 3,
    cents: 120,
  });
});

test('maps a swipe path to ordered glissando steps', () => {
  expect(mapSwipeAcrossStrings({ tsMs: 300, stringIndexes: [2, 3, 3, 4] })).toEqual([
    { type: 'glissando_step', tsMs: 300, stringIndex: 2, velocity: 1 },
    { type: 'glissando_step', tsMs: 316, stringIndex: 3, velocity: 1 },
    { type: 'glissando_step', tsMs: 332, stringIndex: 4, velocity: 1 },
  ]);
});

test('maps cover to string_mute with clamped strength', () => {
  expect(mapCover({ tsMs: 400, stringIndex: 5, area: 1.4 })).toEqual({
    type: 'string_mute',
    tsMs: 400,
    stringIndex: 5,
    strength: 1,
  });
});

test('maps release to string_release', () => {
  expect(mapRelease({ tsMs: 500, stringIndex: 5 })).toEqual({
    type: 'string_release',
    tsMs: 500,
    stringIndex: 5,
  });
});

test('rejects non-finite gesture values at the mapping boundary', () => {
  expect(() => mapTap({ tsMs: 100, stringIndex: 1, velocity: Number.NaN })).toThrow('velocity must be finite');
  expect(() => mapHoldDrag({ tsMs: 100, stringIndex: 1, normalizedDelta: Number.NaN })).toThrow(
    'normalizedDelta must be finite',
  );
  expect(() => mapCover({ tsMs: 100, stringIndex: 1, area: Number.NaN })).toThrow('area must be finite');
});

import { describe, expect, test } from 'vitest';
import { createFreePlayInstrumentTouchModel } from '../freePlayInstrumentTouchModel';

const layout = {
  width: 300,
  height: 180,
};

describe('free-play instrument touch model', () => {
  test('keeps gayageum input as a vertical 12-string surface', () => {
    const model = createFreePlayInstrumentTouchModel({ instrument: 'gayageum', layout });

    expect(
      model.handleFrame({ phase: 'start', pointerId: 'top', tsMs: 0, x: 150, y: 1, force: 0.6 }),
    ).toEqual([{ type: 'string_pluck', tsMs: 0, stringIndex: 1, velocity: 0.6 }]);
    expect(
      model.handleFrame({ phase: 'start', pointerId: 'bottom', tsMs: 10, x: 150, y: 179, force: 0.6 }),
    ).toEqual([{ type: 'string_pluck', tsMs: 10, stringIndex: 12, velocity: 0.6 }]);
  });

  test('maps janggu hits by drum zone instead of vertical string rows', () => {
    const model = createFreePlayInstrumentTouchModel({ instrument: 'janggu', layout });

    expect(
      model.handleFrame({ phase: 'start', pointerId: 'left', tsMs: 0, x: 24, y: 12, force: 0.7 }),
    ).toEqual([{ type: 'string_pluck', tsMs: 0, stringIndex: 3, velocity: 0.7 }]);
    expect(
      model.handleFrame({ phase: 'start', pointerId: 'center', tsMs: 8, x: 150, y: 12, force: 0.7 }),
    ).toEqual([{ type: 'string_pluck', tsMs: 8, stringIndex: 6, velocity: 0.7 }]);
    expect(
      model.handleFrame({ phase: 'start', pointerId: 'right', tsMs: 16, x: 276, y: 12, force: 0.7 }),
    ).toEqual([{ type: 'string_pluck', tsMs: 16, stringIndex: 10, velocity: 0.7 }]);
  });

  test('maps daegeum pitch by horizontal fingering and bends by breath movement', () => {
    const model = createFreePlayInstrumentTouchModel({ instrument: 'daegeum', layout });

    expect(
      model.handleFrame({ phase: 'start', pointerId: 'breath', tsMs: 0, x: 0, y: 90, force: 0.8 }),
    ).toEqual([{ type: 'string_pluck', tsMs: 0, stringIndex: 1, velocity: 0.8 }]);
    expect(
      model.handleFrame({ phase: 'move', pointerId: 'breath', tsMs: 80, x: 299, y: 90, force: 0.8 }),
    ).toEqual([{ type: 'glissando_step', tsMs: 80, stringIndex: 12, velocity: 0.8 }]);
    expect(
      model.handleFrame({ phase: 'move', pointerId: 'breath', tsMs: 180, x: 299, y: 30, force: 0.8 }),
    ).toEqual([{ type: 'string_bend', tsMs: 180, stringIndex: 12, cents: 40 }]);
  });

  test('smooths daegeum bend jitter and resets pitch when breath returns to neutral', () => {
    const model = createFreePlayInstrumentTouchModel({ instrument: 'daegeum', layout });

    model.handleFrame({ phase: 'start', pointerId: 'breath', tsMs: 0, x: 150, y: 90, force: 0.8 });

    expect(
      model.handleFrame({ phase: 'move', pointerId: 'breath', tsMs: 16, x: 150, y: 87, force: 0.8 }),
    ).toEqual([]);
    expect(
      model.handleFrame({ phase: 'move', pointerId: 'breath', tsMs: 80, x: 150, y: 30, force: 0.8 }),
    ).toEqual([{ type: 'string_bend', tsMs: 80, stringIndex: 7, cents: 40 }]);
    expect(
      model.handleFrame({ phase: 'move', pointerId: 'breath', tsMs: 96, x: 150, y: 30, force: 0.8 }),
    ).toEqual([]);
    expect(
      model.handleFrame({ phase: 'move', pointerId: 'breath', tsMs: 160, x: 150, y: 90, force: 0.8 }),
    ).toEqual([{ type: 'string_bend', tsMs: 160, stringIndex: 7, cents: 0 }]);
  });
});

import type { PerformanceEvent } from '../domain/performanceEvent';
import { clampBendCents } from '../domain/performanceEvent';
import { createTouchModel, type TouchFrame, type TouchModel } from '../interaction/touchModel';
import type { InstrumentId } from '../studio/studioTypes';

export type FreePlayTouchLayout = {
  width: number;
  height: number;
};

export function createFreePlayInstrumentTouchModel(input: {
  instrument: InstrumentId;
  layout: FreePlayTouchLayout;
}): TouchModel {
  const layout = normalizeLayout(input.layout);

  if (input.instrument === 'gayageum') {
    return createTouchModel({
      layout: {
        topY: 0,
        height: layout.height,
        stringCount: 12,
      },
    });
  }

  if (input.instrument === 'janggu') {
    return createJangguTouchModel(layout);
  }

  return createDaegeumTouchModel(layout);
}

function createJangguTouchModel(layout: FreePlayTouchLayout): TouchModel {
  const activeZones = new Map<string, number>();

  return {
    handleFrame(frame) {
      assertFiniteFrame(frame);

      switch (frame.phase) {
        case 'start': {
          const stringIndex = jangguStringIndexForX(layout, frame.x);
          activeZones.set(frame.pointerId, stringIndex);
          return [createPluckEvent(frame, stringIndex)];
        }
        case 'move': {
          const stringIndex = jangguStringIndexForX(layout, frame.x);
          const previousStringIndex = activeZones.get(frame.pointerId);
          if (previousStringIndex === undefined || previousStringIndex === stringIndex) {
            return [];
          }
          activeZones.set(frame.pointerId, stringIndex);
          return [createPluckEvent(frame, stringIndex)];
        }
        case 'end':
        case 'cancel': {
          const stringIndex = activeZones.get(frame.pointerId);
          activeZones.delete(frame.pointerId);
          return stringIndex === undefined ? [] : [createReleaseEvent(frame, stringIndex)];
        }
        default:
          return assertNever(frame.phase);
      }
    },
  };
}

function createDaegeumTouchModel(layout: FreePlayTouchLayout): TouchModel {
  const activePointers = new Map<
    string,
    {
      startY: number;
      stringIndex: number;
    }
  >();

  return {
    handleFrame(frame) {
      assertFiniteFrame(frame);

      switch (frame.phase) {
        case 'start': {
          const stringIndex = melodicStringIndexForX(layout, frame.x);
          activePointers.set(frame.pointerId, {
            startY: frame.y,
            stringIndex,
          });
          return [createPluckEvent(frame, stringIndex)];
        }
        case 'move': {
          const pointer = activePointers.get(frame.pointerId);
          if (pointer === undefined) {
            return [];
          }

          const stringIndex = melodicStringIndexForX(layout, frame.x);
          if (stringIndex !== pointer.stringIndex) {
            pointer.stringIndex = stringIndex;
            return [
              {
                type: 'glissando_step',
                tsMs: frame.tsMs,
                stringIndex,
                velocity: normalizeVelocity(frame.force),
              },
            ];
          }

          const cents = clampBendCents(Math.round(((pointer.startY - frame.y) / layout.height) * 120));
          return cents === 0
            ? []
            : [
                {
                  type: 'string_bend',
                  tsMs: frame.tsMs,
                  stringIndex,
                  cents,
                },
              ];
        }
        case 'end':
        case 'cancel': {
          const pointer = activePointers.get(frame.pointerId);
          activePointers.delete(frame.pointerId);
          return pointer === undefined ? [] : [createReleaseEvent(frame, pointer.stringIndex)];
        }
        default:
          return assertNever(frame.phase);
      }
    },
  };
}

function normalizeLayout(layout: FreePlayTouchLayout): FreePlayTouchLayout {
  const width = Number.isFinite(layout.width) && layout.width > 0 ? layout.width : 1;
  const height = Number.isFinite(layout.height) && layout.height > 0 ? layout.height : 1;

  return {
    width,
    height,
  };
}

function jangguStringIndexForX(layout: FreePlayTouchLayout, x: number): number {
  const normalizedX = clamp01(x / layout.width);
  if (normalizedX < 0.38) {
    return 3;
  }
  if (normalizedX > 0.62) {
    return 10;
  }

  return 6;
}

function melodicStringIndexForX(layout: FreePlayTouchLayout, x: number): number {
  return Math.max(1, Math.min(12, Math.floor(clamp01(x / layout.width) * 12) + 1));
}

function createPluckEvent(frame: TouchFrame, stringIndex: number): PerformanceEvent {
  return {
    type: 'string_pluck',
    tsMs: frame.tsMs,
    stringIndex,
    velocity: normalizeVelocity(frame.force),
  };
}

function createReleaseEvent(frame: TouchFrame, stringIndex: number): PerformanceEvent {
  return {
    type: 'string_release',
    tsMs: frame.tsMs,
    stringIndex,
  };
}

function normalizeVelocity(force: number | undefined): number {
  return typeof force === 'number' && Number.isFinite(force) ? clamp01(force) : 1;
}

function assertFiniteFrame(frame: TouchFrame): void {
  if (!Number.isFinite(frame.x)) {
    throw new Error('touch x must be finite');
  }
  if (!Number.isFinite(frame.y)) {
    throw new Error('touch y must be finite');
  }
  if (!Number.isFinite(frame.tsMs)) {
    throw new Error('touch tsMs must be finite');
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('value must be finite');
  }

  return Math.max(0, Math.min(1, value));
}

function assertNever(value: never): never {
  throw new Error(`Unhandled touch phase: ${String(value)}`);
}

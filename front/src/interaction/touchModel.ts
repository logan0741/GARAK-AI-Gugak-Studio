import { PerformanceEvent } from '../domain/performanceEvent';
import { mapCover, mapHoldDrag, mapRelease, mapSwipeAcrossStrings, mapTap } from './gestureMapper';

export type TouchPhase = 'start' | 'move' | 'end' | 'cancel';

export type TouchFrame = {
  phase: TouchPhase;
  pointerId: string;
  tsMs: number;
  x: number;
  y: number;
  contactArea?: number;
  force?: number;
};

export type TouchStringLayout = {
  topY: number;
  height: number;
  stringCount: 12;
};

export type TouchModelOptions = {
  layout: TouchStringLayout;
  bendRangePx?: number;
  holdThresholdMs?: number;
  muteAreaThreshold?: number;
};

export type TouchModel = {
  handleFrame(frame: TouchFrame): PerformanceEvent[];
};

type ActivePointer = {
  pointerId: string;
  mode: 'pending' | 'swipe' | 'bend' | 'mute';
  startedAtMs: number;
  startX: number;
  lastStringIndex: number;
  mutedStringIndexes: Set<number>;
};

const DEFAULT_BEND_RANGE_PX = 80;
const DEFAULT_HOLD_THRESHOLD_MS = 120;
const DEFAULT_MUTE_AREA_THRESHOLD = 0.72;

export function createTouchModel(input: TouchModelOptions): TouchModel {
  assertValidTouchLayout(input.layout);
  const activePointers = new Map<string, ActivePointer>();
  const bendRangePx = input.bendRangePx ?? DEFAULT_BEND_RANGE_PX;
  const holdThresholdMs = input.holdThresholdMs ?? DEFAULT_HOLD_THRESHOLD_MS;
  const muteAreaThreshold = input.muteAreaThreshold ?? DEFAULT_MUTE_AREA_THRESHOLD;

  return {
    handleFrame(frame) {
      assertFiniteTouchCoordinate(frame.x, 'x');
      switch (frame.phase) {
        case 'start':
          return handleStart(frame);
        case 'move':
          return handleMove(frame);
        case 'end':
        case 'cancel':
          return handleEnd(frame);
        default:
          return assertNever(frame.phase);
      }
    },
  };

  function handleStart(frame: TouchFrame): PerformanceEvent[] {
    const stringIndex = stringIndexForY(input.layout, frame.y);
    const isMuteStart = isMuteContact(frame.contactArea, muteAreaThreshold);
    const event = isMuteStart
      ? mapCover({ tsMs: frame.tsMs, stringIndex, area: frame.contactArea ?? 1 })
      : mapTap({ tsMs: frame.tsMs, stringIndex, velocity: frame.force ?? 1 });

    activePointers.set(frame.pointerId, {
      pointerId: frame.pointerId,
      mode: isMuteStart ? 'mute' : 'pending',
      startedAtMs: frame.tsMs,
      startX: frame.x,
      lastStringIndex: stringIndex,
      mutedStringIndexes: new Set(isMuteStart ? [stringIndex] : []),
    });

    return [event];
  }

  function handleMove(frame: TouchFrame): PerformanceEvent[] {
    const pointer = activePointers.get(frame.pointerId);
    if (!pointer) {
      return [];
    }

    const stringIndex = stringIndexForY(input.layout, frame.y);
    const muteEvents = mapMuteIfNeeded(pointer, frame, stringIndex);
    if (muteEvents.length > 0) {
      pointer.mode = 'mute';
      pointer.lastStringIndex = stringIndex;
      return muteEvents;
    }

    if (pointer.mode === 'mute') {
      return [];
    }

    if (stringIndex !== pointer.lastStringIndex) {
      const crossed = crossedStringIndexes(pointer.lastStringIndex, stringIndex);
      const events = mapSwipeAcrossStrings({ tsMs: frame.tsMs, stringIndexes: crossed });
      pointer.mode = 'swipe';
      pointer.lastStringIndex = stringIndex;
      return events;
    }

    if (pointer.mode === 'swipe') {
      return [];
    }

    if (frame.tsMs - pointer.startedAtMs < holdThresholdMs) {
      return [];
    }

    const event = mapHoldDrag({
      tsMs: frame.tsMs,
      stringIndex,
      normalizedDelta: (frame.x - pointer.startX) / bendRangePx,
    });
    pointer.mode = 'bend';
    return [event];
  }

  function handleEnd(frame: TouchFrame): PerformanceEvent[] {
    const pointer = activePointers.get(frame.pointerId);
    if (!pointer) {
      return [];
    }

    const event = mapRelease({ tsMs: frame.tsMs, stringIndex: pointer.lastStringIndex });
    activePointers.delete(frame.pointerId);
    return [event];
  }

  function mapMuteIfNeeded(
    pointer: ActivePointer,
    frame: TouchFrame,
    stringIndex: number,
  ): PerformanceEvent[] {
    if (!isMuteContact(frame.contactArea, muteAreaThreshold) || pointer.mutedStringIndexes.has(stringIndex)) {
      return [];
    }

    const event = mapCover({ tsMs: frame.tsMs, stringIndex, area: frame.contactArea ?? 1 });
    pointer.mutedStringIndexes.add(stringIndex);
    return [event];
  }
}

function stringIndexForY(layout: TouchStringLayout, y: number): number {
  assertFiniteTouchCoordinate(y, 'y');

  const rowHeight = layout.height / layout.stringCount;
  const rawIndex = Math.floor((y - layout.topY) / rowHeight) + 1;
  return Math.max(1, Math.min(layout.stringCount, rawIndex));
}

function assertValidTouchLayout(layout: TouchStringLayout): void {
  if (!Number.isFinite(layout.topY)) {
    throw new Error('touch layout topY must be finite');
  }

  if (!Number.isFinite(layout.height) || layout.height <= 0) {
    throw new Error('touch layout height must be finite and > 0');
  }

  if (layout.stringCount !== 12) {
    throw new Error('touch layout stringCount must be 12');
  }
}

function assertFiniteTouchCoordinate(value: number, axis: 'x' | 'y'): void {
  if (!Number.isFinite(value)) {
    throw new Error(`touch ${axis} must be finite`);
  }
}

function crossedStringIndexes(from: number, to: number): number[] {
  const direction = from < to ? 1 : -1;
  const crossed: number[] = [];

  for (let stringIndex = from + direction; direction > 0 ? stringIndex <= to : stringIndex >= to; stringIndex += direction) {
    crossed.push(stringIndex);
  }

  return crossed;
}

function isMuteContact(contactArea: number | undefined, threshold: number): boolean {
  return typeof contactArea === 'number' && Number.isFinite(contactArea) && contactArea >= threshold;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled touch phase: ${String(value)}`);
}

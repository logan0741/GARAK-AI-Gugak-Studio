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
  const activePointers = new Map<string, ActivePointer>();
  const bendRangePx = input.bendRangePx ?? DEFAULT_BEND_RANGE_PX;
  const holdThresholdMs = input.holdThresholdMs ?? DEFAULT_HOLD_THRESHOLD_MS;
  const muteAreaThreshold = input.muteAreaThreshold ?? DEFAULT_MUTE_AREA_THRESHOLD;

  return {
    handleFrame(frame) {
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
    activePointers.set(frame.pointerId, {
      pointerId: frame.pointerId,
      mode: isMuteContact(frame.contactArea, muteAreaThreshold) ? 'mute' : 'pending',
      startedAtMs: frame.tsMs,
      startX: frame.x,
      lastStringIndex: stringIndex,
      mutedStringIndexes: new Set(),
    });

    if (isMuteContact(frame.contactArea, muteAreaThreshold)) {
      activePointers.get(frame.pointerId)?.mutedStringIndexes.add(stringIndex);
      return [mapCover({ tsMs: frame.tsMs, stringIndex, area: frame.contactArea ?? 1 })];
    }

    return [mapTap({ tsMs: frame.tsMs, stringIndex, velocity: frame.force ?? 1 })];
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
      pointer.mode = 'swipe';
      pointer.lastStringIndex = stringIndex;
      return mapSwipeAcrossStrings({ tsMs: frame.tsMs, stringIndexes: crossed });
    }

    if (pointer.mode === 'swipe') {
      return [];
    }

    if (frame.tsMs - pointer.startedAtMs < holdThresholdMs) {
      return [];
    }

    pointer.mode = 'bend';
    return [
      mapHoldDrag({
        tsMs: frame.tsMs,
        stringIndex,
        normalizedDelta: (frame.x - pointer.startX) / bendRangePx,
      }),
    ];
  }

  function handleEnd(frame: TouchFrame): PerformanceEvent[] {
    const pointer = activePointers.get(frame.pointerId);
    if (!pointer) {
      return [];
    }

    activePointers.delete(frame.pointerId);
    return [mapRelease({ tsMs: frame.tsMs, stringIndex: pointer.lastStringIndex })];
  }

  function mapMuteIfNeeded(
    pointer: ActivePointer,
    frame: TouchFrame,
    stringIndex: number,
  ): PerformanceEvent[] {
    if (!isMuteContact(frame.contactArea, muteAreaThreshold) || pointer.mutedStringIndexes.has(stringIndex)) {
      return [];
    }

    pointer.mutedStringIndexes.add(stringIndex);
    return [mapCover({ tsMs: frame.tsMs, stringIndex, area: frame.contactArea ?? 1 })];
  }
}

function stringIndexForY(layout: TouchStringLayout, y: number): number {
  if (!Number.isFinite(y)) {
    throw new Error('touch y must be finite');
  }
  if (!Number.isFinite(layout.height) || layout.height <= 0) {
    return 1;
  }

  const rowHeight = layout.height / layout.stringCount;
  const rawIndex = Math.floor((y - layout.topY) / rowHeight) + 1;
  return Math.max(1, Math.min(layout.stringCount, rawIndex));
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

import {
  PerformanceEvent,
  assertEventTimestamp,
  assertStringIndex,
  clampBendCents,
  createStringPluck,
} from '../domain/performanceEvent';

const GLISSANDO_STEP_MS = 16;

function requireFinite(value: number, fieldName: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be finite`);
  }

  return value;
}

function clampUnit(value: number, fieldName: string): number {
  requireFinite(value, fieldName);
  return Math.max(0, Math.min(1, value));
}

function dedupeConsecutiveStringIndexes(stringIndexes: number[]): number[] {
  return stringIndexes.filter((stringIndex, index) => index === 0 || stringIndex !== stringIndexes[index - 1]);
}

export function mapTap(input: { tsMs: number; stringIndex: number; velocity?: number }): PerformanceEvent {
  return createStringPluck({
    tsMs: input.tsMs,
    stringIndex: input.stringIndex,
    velocity: clampUnit(input.velocity ?? 1, 'velocity'),
  });
}

export function mapHoldDrag(input: {
  tsMs: number;
  stringIndex: number;
  normalizedDelta: number;
}): PerformanceEvent {
  assertEventTimestamp(input.tsMs);
  assertStringIndex(input.stringIndex);
  requireFinite(input.normalizedDelta, 'normalizedDelta');

  return {
    type: 'string_bend',
    tsMs: input.tsMs,
    stringIndex: input.stringIndex,
    cents: clampBendCents(input.normalizedDelta * 60),
  };
}

export function mapSwipeAcrossStrings(input: {
  tsMs: number;
  stringIndexes: number[];
  velocity?: number;
}): PerformanceEvent[] {
  assertEventTimestamp(input.tsMs);
  return dedupeConsecutiveStringIndexes(input.stringIndexes).map((stringIndex, index) => {
    assertStringIndex(stringIndex);

    return {
      type: 'glissando_step',
      tsMs: input.tsMs + index * GLISSANDO_STEP_MS,
      stringIndex,
      velocity: clampUnit(input.velocity ?? 1, 'velocity'),
    };
  });
}

export function mapCover(input: { tsMs: number; stringIndex: number; area: number }): PerformanceEvent {
  assertEventTimestamp(input.tsMs);
  assertStringIndex(input.stringIndex);

  return {
    type: 'string_mute',
    tsMs: input.tsMs,
    stringIndex: input.stringIndex,
    strength: clampUnit(input.area, 'area'),
  };
}

export function mapRelease(input: { tsMs: number; stringIndex: number }): PerformanceEvent {
  assertEventTimestamp(input.tsMs);
  assertStringIndex(input.stringIndex);

  return {
    type: 'string_release',
    tsMs: input.tsMs,
    stringIndex: input.stringIndex,
  };
}

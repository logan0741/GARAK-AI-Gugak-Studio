export type PerformanceEvent =
  | { type: 'string_pluck'; tsMs: number; stringIndex: number; velocity: number }
  | { type: 'string_bend'; tsMs: number; stringIndex: number; cents: number }
  | { type: 'string_mute'; tsMs: number; stringIndex: number; strength: number }
  | { type: 'glissando_step'; tsMs: number; stringIndex: number; velocity: number }
  | { type: 'string_release'; tsMs: number; stringIndex: number };

export const MIN_STRING_INDEX = 1;
export const MAX_STRING_INDEX = 12;
export const MAX_BEND_CENTS = 120;

export function assertStringIndex(stringIndex: number): void {
  if (!Number.isInteger(stringIndex) || stringIndex < MIN_STRING_INDEX || stringIndex > MAX_STRING_INDEX) {
    throw new Error(`stringIndex must be an integer from 1 to 12. Received: ${stringIndex}`);
  }
}

export function assertEventTimestamp(tsMs: number): void {
  if (!Number.isFinite(tsMs)) {
    throw new Error('tsMs must be finite');
  }
}

export function clampBendCents(cents: number): number {
  return Math.max(-MAX_BEND_CENTS, Math.min(MAX_BEND_CENTS, cents));
}

export function createStringPluck(input: {
  tsMs: number;
  stringIndex: number;
  velocity: number;
}): PerformanceEvent {
  assertEventTimestamp(input.tsMs);
  assertStringIndex(input.stringIndex);

  return {
    type: 'string_pluck',
    tsMs: input.tsMs,
    stringIndex: input.stringIndex,
    velocity: Math.max(0, Math.min(1, input.velocity)),
  };
}

export function createStringBend(input: {
  tsMs: number;
  stringIndex: number;
  cents: number;
}): PerformanceEvent {
  assertEventTimestamp(input.tsMs);
  assertStringIndex(input.stringIndex);

  return {
    type: 'string_bend',
    tsMs: input.tsMs,
    stringIndex: input.stringIndex,
    cents: clampBendCents(input.cents),
  };
}

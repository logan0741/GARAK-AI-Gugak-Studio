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
  if (!Number.isFinite(cents)) {
    throw new Error('cents must be finite');
  }

  return Math.max(-MAX_BEND_CENTS, Math.min(MAX_BEND_CENTS, cents));
}

export function assertPerformanceEvent(event: PerformanceEvent): void {
  assertEventTimestamp(event.tsMs);
  assertStringIndex(event.stringIndex);

  if (event.type === 'string_pluck' || event.type === 'glissando_step') {
    if (!Number.isFinite(event.velocity)) {
      throw new Error('velocity must be finite');
    }
    return;
  }

  if (event.type === 'string_bend') {
    if (!Number.isFinite(event.cents)) {
      throw new Error('cents must be finite');
    }
    return;
  }

  if (event.type === 'string_mute') {
    if (!Number.isFinite(event.strength)) {
      throw new Error('strength must be finite');
    }
  }
}

function clampVelocity(velocity: number): number {
  if (!Number.isFinite(velocity)) {
    throw new Error('velocity must be finite');
  }

  return Math.max(0, Math.min(1, velocity));
}

function clampMuteStrength(strength: number): number {
  if (!Number.isFinite(strength)) {
    throw new Error('strength must be finite');
  }

  return Math.max(0, Math.min(1, strength));
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
    velocity: clampVelocity(input.velocity),
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

export function createStringMute(input: {
  tsMs: number;
  stringIndex: number;
  strength: number;
}): PerformanceEvent {
  assertEventTimestamp(input.tsMs);
  assertStringIndex(input.stringIndex);

  return {
    type: 'string_mute',
    tsMs: input.tsMs,
    stringIndex: input.stringIndex,
    strength: clampMuteStrength(input.strength),
  };
}

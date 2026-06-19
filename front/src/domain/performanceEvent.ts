export type PerformanceEvent =
  | { type: 'string_pluck'; tsMs: number; stringIndex: number; velocity: number }
  | { type: 'string_bend'; tsMs: number; stringIndex: number; cents: number }
  | { type: 'string_mute'; tsMs: number; stringIndex: number; strength: number }
  | { type: 'glissando_step'; tsMs: number; stringIndex: number; velocity: number }
  | { type: 'string_release'; tsMs: number; stringIndex: number }
  | { type: 'janggu_hit'; tsMs: number; surface: JangguSurface; velocity: number }
  | { type: 'daegeum_note'; tsMs: number; fingering: DaegeumFingering; breath: number };

export type JangguSurface = 'gungpyeon' | 'chaepyeon';
export type DaegeumFingering = 'open' | 'half_open' | 'closed';

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

  if (event.type === 'string_pluck' || event.type === 'glissando_step') {
    assertStringIndex(event.stringIndex);
    if (!Number.isFinite(event.velocity)) {
      throw new Error('velocity must be finite');
    }
    return;
  }

  if (event.type === 'string_bend') {
    assertStringIndex(event.stringIndex);
    if (!Number.isFinite(event.cents)) {
      throw new Error('cents must be finite');
    }
    return;
  }

  if (event.type === 'string_mute') {
    assertStringIndex(event.stringIndex);
    if (!Number.isFinite(event.strength)) {
      throw new Error('strength must be finite');
    }
    return;
  }

  if (event.type === 'string_release') {
    assertStringIndex(event.stringIndex);
    return;
  }

  if (event.type === 'janggu_hit') {
    assertJangguSurface(event.surface);
    if (!Number.isFinite(event.velocity)) {
      throw new Error('velocity must be finite');
    }
    return;
  }

  if (event.type === 'daegeum_note') {
    assertDaegeumFingering(event.fingering);
    if (!Number.isFinite(event.breath)) {
      throw new Error('breath must be finite');
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

function clampBreath(breath: number): number {
  if (!Number.isFinite(breath)) {
    throw new Error('breath must be finite');
  }

  return Math.max(0, Math.min(1, breath));
}

export function assertJangguSurface(surface: JangguSurface): void {
  if (surface !== 'gungpyeon' && surface !== 'chaepyeon') {
    throw new Error(`surface must be gungpyeon or chaepyeon. Received: ${String(surface)}`);
  }
}

export function assertDaegeumFingering(fingering: DaegeumFingering): void {
  if (fingering !== 'open' && fingering !== 'half_open' && fingering !== 'closed') {
    throw new Error(`fingering must be open, half_open, or closed. Received: ${String(fingering)}`);
  }
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

export function createJangguHit(input: {
  tsMs: number;
  surface: JangguSurface;
  velocity: number;
}): PerformanceEvent {
  assertEventTimestamp(input.tsMs);
  assertJangguSurface(input.surface);

  return {
    type: 'janggu_hit',
    tsMs: input.tsMs,
    surface: input.surface,
    velocity: clampVelocity(input.velocity),
  };
}

export function createDaegeumNote(input: {
  tsMs: number;
  fingering: DaegeumFingering;
  breath: number;
}): PerformanceEvent {
  assertEventTimestamp(input.tsMs);
  assertDaegeumFingering(input.fingering);

  return {
    type: 'daegeum_note',
    tsMs: input.tsMs,
    fingering: input.fingering,
    breath: clampBreath(input.breath),
  };
}

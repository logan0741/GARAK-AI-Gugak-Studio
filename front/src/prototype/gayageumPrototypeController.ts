import { SamplerEngine } from '../audio/samplerEngine';
import { PerformanceEvent } from '../domain/performanceEvent';
import { Session, appendPerformanceEvent } from '../domain/session';
import {
  mapCover,
  mapHoldDrag,
  mapRelease,
  mapSwipeAcrossStrings,
  mapTap,
} from '../interaction/gestureMapper';

export function planStringPlay(input: { nowMs: number; stringIndex: number }): PerformanceEvent[] {
  return [
    mapTap({
      tsMs: input.nowMs,
      stringIndex: input.stringIndex,
    }),
  ];
}

export function planGlissando(input: { nowMs: number; stringIndexes: number[] }): PerformanceEvent[] {
  return mapSwipeAcrossStrings({
    tsMs: input.nowMs,
    stringIndexes: input.stringIndexes,
  });
}

export function planPolyphonyBurst(input: { nowMs: number; stringIndexes: number[] }): PerformanceEvent[] {
  return input.stringIndexes.map((stringIndex) =>
    mapTap({
      tsMs: input.nowMs,
      stringIndex,
    }),
  );
}

export function planPitchBendProbe(input: { nowMs: number; stringIndex: number }): PerformanceEvent[] {
  return [
    mapTap({ tsMs: input.nowMs, stringIndex: input.stringIndex }),
    mapHoldDrag({ tsMs: input.nowMs + 160, stringIndex: input.stringIndex, normalizedDelta: 2 }),
    mapHoldDrag({ tsMs: input.nowMs + 240, stringIndex: input.stringIndex, normalizedDelta: -2 }),
    mapRelease({ tsMs: input.nowMs + 320, stringIndex: input.stringIndex }),
  ];
}

export function planMuteProbe(input: { nowMs: number; stringIndex: number }): PerformanceEvent[] {
  return [
    mapTap({ tsMs: input.nowMs, stringIndex: input.stringIndex }),
    mapCover({ tsMs: input.nowMs + 120, stringIndex: input.stringIndex, area: 1 }),
    mapRelease({ tsMs: input.nowMs + 200, stringIndex: input.stringIndex }),
  ];
}

export function dispatchEventsToEngine(engine: SamplerEngine, events: PerformanceEvent[]): void {
  for (const event of events) {
    engine.handleEvent(event);
  }
}

export type EngineDispatchResult = { ok: true } | { ok: false; errorMessage: string };

export function safelyDispatchEventsToEngine(engine: SamplerEngine, events: PerformanceEvent[]): EngineDispatchResult {
  try {
    dispatchEventsToEngine(engine, events);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown audio engine failure',
    };
  }
}

export function safelyDispatchEventsToCurrentEngine(
  engineRef: { current: SamplerEngine },
  events: PerformanceEvent[],
): EngineDispatchResult {
  return safelyDispatchEventsToEngine(engineRef.current, events);
}

export function appendEventsToSession(session: Session, events: PerformanceEvent[]): Session {
  return events.reduce((current, event) => appendPerformanceEvent(current, event), session);
}

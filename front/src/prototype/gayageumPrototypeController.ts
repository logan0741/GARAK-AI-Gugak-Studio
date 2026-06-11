import { SamplerEngine } from '../audio/samplerEngine';
import { PerformanceEvent } from '../domain/performanceEvent';
import { Session, appendPerformanceEvent } from '../domain/session';
import { mapSwipeAcrossStrings, mapTap } from '../interaction/gestureMapper';

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

export function appendEventsToSession(session: Session, events: PerformanceEvent[]): Session {
  return events.reduce((current, event) => appendPerformanceEvent(current, event), session);
}

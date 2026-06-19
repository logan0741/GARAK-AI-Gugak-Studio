import { SamplerEngine } from '../audio/samplerEngine';
import { PerformanceEvent } from '../domain/performanceEvent';
import { SampleAssetManifest } from '../domain/sampleManifest';
import { ReplaySchedule, planSessionReplay } from '../domain/replayPlanner';
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

export function dispatchEventsToEngine(
  engine: SamplerEngine,
  events: PerformanceEvent[],
): EngineDispatchSuccess {
  for (const event of events) {
    engine.handleEvent(event);
  }

  return {
    handledEvents: events.length,
    ok: true,
    totalEvents: events.length,
  };
}

export type EngineDispatchSuccess = {
  handledEvents: number;
  ok: true;
  totalEvents: number;
};

export type EngineDispatchFailure = {
  errorMessage: string;
  failedEvent: PerformanceEvent;
  failedEventIndex: number;
  handledEvents: number;
  ok: false;
  totalEvents: number;
};

export type EngineDispatchResult = EngineDispatchSuccess | EngineDispatchFailure;

export type SessionReplayDispatchResult =
  | {
      dispatch: EngineDispatchSuccess;
      events: PerformanceEvent[];
      ok: true;
      schedule: ReplaySchedule;
      status: 'dispatched';
    }
  | {
      dispatch: EngineDispatchFailure;
      errorMessage: string;
      events: PerformanceEvent[];
      ok: false;
      schedule: ReplaySchedule;
      status: 'dispatch_failed';
    }
  | {
      errorMessage: string;
      events: [];
      ok: false;
      status: 'planning_failed';
    };

export function safelyDispatchEventsToEngine(engine: SamplerEngine, events: PerformanceEvent[]): EngineDispatchResult {
  let handledEvents = 0;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    try {
      engine.handleEvent(event);
      handledEvents += 1;
    } catch (error) {
      return {
        errorMessage: error instanceof Error ? error.message : 'Unknown audio engine failure',
        failedEvent: event,
        failedEventIndex: index,
        handledEvents,
        ok: false,
        totalEvents: events.length,
      };
    }
  }

  return {
    handledEvents,
    ok: true,
    totalEvents: events.length,
  };
}

export function safelyDispatchEventsToCurrentEngine(
  engineRef: { current: SamplerEngine },
  events: PerformanceEvent[],
): EngineDispatchResult {
  return safelyDispatchEventsToEngine(engineRef.current, events);
}

export function dispatchReplayScheduleToEngine(
  engine: SamplerEngine,
  schedule: ReplaySchedule,
): EngineDispatchResult {
  return safelyDispatchEventsToEngine(
    engine,
    schedule.items.map((item) => item.event),
  );
}

export function safelyDispatchReplayScheduleToCurrentEngine(
  engineRef: { current: SamplerEngine },
  schedule: ReplaySchedule,
): EngineDispatchResult {
  return dispatchReplayScheduleToEngine(engineRef.current, schedule);
}

export function planAndDispatchSessionReplayToCurrentEngine(input: {
  engineRef: { current: SamplerEngine };
  sampleAssetManifest: SampleAssetManifest;
  session: Session;
}): SessionReplayDispatchResult {
  let schedule: ReplaySchedule;

  try {
    schedule = planSessionReplay(input.session, input.sampleAssetManifest);
  } catch (error: unknown) {
    return {
      errorMessage: error instanceof Error ? error.message : String(error),
      events: [],
      ok: false,
      status: 'planning_failed',
    };
  }

  const events = schedule.items.map((item) => item.event);
  const dispatch = safelyDispatchReplayScheduleToCurrentEngine(input.engineRef, schedule);

  if (!dispatch.ok) {
    return {
      dispatch,
      errorMessage: dispatch.errorMessage,
      events,
      ok: false,
      schedule,
      status: 'dispatch_failed',
    };
  }

  return {
    dispatch,
    events,
    ok: true,
    schedule,
    status: 'dispatched',
  };
}

export function appendEventsToSession(session: Session, events: PerformanceEvent[]): Session {
  return events.reduce((current, event) => appendPerformanceEvent(current, event), session);
}

export function formatEngineDispatchFailure(failure: EngineDispatchFailure): string {
  return [
    `failed after ${failure.handledEvents}/${failure.totalEvents} events at index ${failure.failedEventIndex}`,
    `${failure.errorMessage}; event=${JSON.stringify(failure.failedEvent)}`,
  ].join(': ');
}

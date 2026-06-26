import { expect, test } from 'vitest';
import { FakeSamplerEngine } from '../../audio/fakeSamplerEngine';
import { SampleAssetManifest } from '../../domain/sampleManifest';
import { ReplaySchedule } from '../../domain/replayPlanner';
import { appendPerformanceEvent, createEmptySession } from '../../domain/session';
import {
  appendEventsToSession,
  dispatchEventsToEngine,
  dispatchReplayScheduleToEngine,
  formatEngineDispatchFailure,
  planAndDispatchSessionReplayToCurrentEngine,
  safelyDispatchEventsToCurrentEngine,
  safelyDispatchEventsToEngine,
  safelyDispatchReplayScheduleToCurrentEngine,
  planGlissando,
  planMuteProbe,
  planPitchBendProbe,
  planPolyphonyBurst,
  planStringPlay,
} from '../gayageumPrototypeController';

function createSession() {
  return createEmptySession({
    id: 'test-session',
    createdAt: '2026-06-08T00:00:00.000Z',
    sampleAssetManifestVersion: 'prototype-empty-manifest',
  });
}

test('plans a string play without mutating engine or session state', () => {
  const session = createSession();

  const events = planStringPlay({
    nowMs: 100,
    stringIndex: 3,
  });

  expect(session.events).toEqual([]);
  expect(events).toEqual([{ type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 1 }]);
});

test('dispatches planned events to the sampler once outside session updates', () => {
  const engine = new FakeSamplerEngine();
  const events = planStringPlay({ nowMs: 100, stringIndex: 3 });

  const result = dispatchEventsToEngine(engine, events);

  expect(result).toEqual({ handledEvents: 1, ok: true, totalEvents: 1 });
  expect(engine.commands).toEqual(['pluck:string=3:velocity=1']);
});

test('returns an audio failure without preventing session event fallback', () => {
  const events = planStringPlay({ nowMs: 100, stringIndex: 3 });
  const failingEngine = {
    handleEvent: () => {
      throw new Error('native audio failed');
    },
  };

  const result = safelyDispatchEventsToEngine(failingEngine, events);
  const next = appendEventsToSession(createSession(), events);

  expect(result).toEqual({
    errorMessage: 'native audio failed',
    failedEvent: { type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 1 },
    failedEventIndex: 0,
    handledEvents: 0,
    ok: false,
    totalEvents: 1,
  });
  expect(next.events).toEqual(events);
});

test('reports the failed event index when a batch dispatch fails after partial handling', () => {
  const events = planGlissando({
    nowMs: 200,
    stringIndexes: [1, 2, 3],
  });
  const handledStringIndexes: number[] = [];
  const partiallyFailingEngine = {
    handleEvent: (event: (typeof events)[number]) => {
      handledStringIndexes.push(event.stringIndex);
      if (event.stringIndex === 2) {
        throw new Error('voice allocation failed');
      }
    },
  };

  const result = safelyDispatchEventsToEngine(partiallyFailingEngine, events);

  expect(result).toEqual({
    errorMessage: 'voice allocation failed',
    failedEvent: { type: 'glissando_step', tsMs: 216, stringIndex: 2, velocity: 1 },
    failedEventIndex: 1,
    handledEvents: 1,
    ok: false,
    totalEvents: 3,
  });
  expect(handledStringIndexes).toEqual([1, 2]);
});

test('formats partial dispatch failures for the prototype inspector', () => {
  expect(
    formatEngineDispatchFailure({
      errorMessage: 'voice allocation failed',
      failedEvent: { type: 'glissando_step', tsMs: 200, stringIndex: 2, velocity: 1 },
      failedEventIndex: 1,
      handledEvents: 1,
      ok: false,
      totalEvents: 3,
    }),
  ).toBe(
    'failed after 1/3 events at index 1: voice allocation failed; event={"type":"glissando_step","tsMs":200,"stringIndex":2,"velocity":1}',
  );
});

test('dispatches to the current engine reference after the engine changes', () => {
  const staleEngine = new FakeSamplerEngine();
  const currentEngine = new FakeSamplerEngine();
  const engineRef = { current: staleEngine };
  const events = planStringPlay({ nowMs: 100, stringIndex: 3 });

  engineRef.current = currentEngine;

  expect(safelyDispatchEventsToCurrentEngine(engineRef, events)).toEqual({
    handledEvents: 1,
    ok: true,
    totalEvents: 1,
  });
  expect(staleEngine.commands).toEqual([]);
  expect(currentEngine.commands).toEqual(['pluck:string=3:velocity=1']);
});

test('dispatches replay schedule items to the sampler in planned order', () => {
  const engine = new FakeSamplerEngine();
  const schedule = createReplaySchedule([
    {
      delayMs: 0,
      event: { type: 'string_bend', tsMs: 250, stringIndex: 2, cents: 40 },
      originalIndex: 1,
    },
    {
      delayMs: 50,
      event: { type: 'string_pluck', tsMs: 300, stringIndex: 2, velocity: 0.8 },
      originalIndex: 0,
      sampleAssetId: 'gayageum-02',
      sampleFileUri: 'asset://gayageum/02.wav',
    },
    {
      delayMs: 50,
      event: { type: 'glissando_step', tsMs: 300, stringIndex: 1, velocity: 1 },
      originalIndex: 2,
      sampleAssetId: 'gayageum-01',
      sampleFileUri: 'asset://gayageum/01.wav',
    },
  ]);

  expect(dispatchReplayScheduleToEngine(engine, schedule)).toEqual({
    handledEvents: 3,
    ok: true,
    totalEvents: 3,
  });
  expect(engine.commands).toEqual([
    'bend:string=2:cents=40',
    'pluck:string=2:velocity=0.8',
    'pluck:string=1:velocity=1',
  ]);
});

test('reports replay dispatch failure without mutating the replay schedule', () => {
  const schedule = createReplaySchedule([
    {
      delayMs: 0,
      event: { type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 },
      originalIndex: 0,
    },
    {
      delayMs: 80,
      event: { type: 'string_mute', tsMs: 180, stringIndex: 1, strength: 1 },
      originalIndex: 1,
    },
  ]);
  const handledEvents: string[] = [];
  const failingEngine = {
    handleEvent: (event: ReplaySchedule['items'][number]['event']) => {
      handledEvents.push(event.type);
      if (event.type === 'string_mute') {
        throw new Error('replay mute failed');
      }
    },
  };

  const result = dispatchReplayScheduleToEngine(failingEngine, schedule);

  expect(result).toEqual({
    errorMessage: 'replay mute failed',
    failedEvent: { type: 'string_mute', tsMs: 180, stringIndex: 1, strength: 1 },
    failedEventIndex: 1,
    handledEvents: 1,
    ok: false,
    totalEvents: 2,
  });
  expect(handledEvents).toEqual(['string_pluck', 'string_mute']);
  expect(schedule.items.map((item) => item.originalIndex)).toEqual([0, 1]);
});

test('replays against the current engine reference after the engine changes', () => {
  const staleEngine = new FakeSamplerEngine();
  const currentEngine = new FakeSamplerEngine();
  const engineRef = { current: staleEngine };
  const schedule = createReplaySchedule([
    {
      delayMs: 0,
      event: { type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 1 },
      originalIndex: 0,
    },
  ]);

  engineRef.current = currentEngine;

  expect(safelyDispatchReplayScheduleToCurrentEngine(engineRef, schedule)).toEqual({
    handledEvents: 1,
    ok: true,
    totalEvents: 1,
  });
  expect(staleEngine.commands).toEqual([]);
  expect(currentEngine.commands).toEqual(['pluck:string=3:velocity=1']);
});

test('plans the current session replay and dispatches it to the current engine', () => {
  const staleEngine = new FakeSamplerEngine();
  const currentEngine = new FakeSamplerEngine();
  const engineRef = { current: staleEngine };
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'session-1',
      createdAt: '2026-06-08T00:00:00.000Z',
      sampleAssetManifestVersion: 'manifest-v1',
    }),
    { type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 },
  );

  engineRef.current = currentEngine;

  const result = planAndDispatchSessionReplayToCurrentEngine({
    engineRef,
    sampleAssetManifest: createSampleManifest(),
    session,
  });

  expect(result).toEqual({
    dispatch: {
      handledEvents: 1,
      ok: true,
      totalEvents: 1,
    },
    events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 }],
    ok: true,
    schedule: {
      durationMs: 0,
      items: [
        {
          delayMs: 0,
          event: { type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 },
          originalIndex: 0,
          sampleAssetId: 'gayageum-01',
          sampleFileUri: 'asset://gayageum/01.wav',
        },
      ],
      sampleAssetManifestVersion: 'manifest-v1',
      sessionId: 'session-1',
    },
    status: 'dispatched',
  });
  expect(staleEngine.commands).toEqual([]);
  expect(currentEngine.commands).toEqual(['pluck:string=1:velocity=1']);
});

test('reports session replay planning failure before dispatching audio', () => {
  const engine = new FakeSamplerEngine();
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'session-1',
      createdAt: '2026-06-08T00:00:00.000Z',
      sampleAssetManifestVersion: 'manifest-v2',
    }),
    { type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 },
  );

  const result = planAndDispatchSessionReplayToCurrentEngine({
    engineRef: { current: engine },
    sampleAssetManifest: createSampleManifest(),
    session,
  });

  expect(result).toEqual({
    errorMessage:
      'SampleAssetManifest version manifest-v1 does not match session replay version manifest-v2',
    events: [],
    ok: false,
    status: 'planning_failed',
  });
  expect(engine.commands).toEqual([]);
});

test('appends planned events to session in order', () => {
  const engine = new FakeSamplerEngine();
  const events = planGlissando({
    nowMs: 200,
    stringIndexes: [1, 2, 3],
  });

  expect(dispatchEventsToEngine(engine, events)).toEqual({
    handledEvents: 3,
    ok: true,
    totalEvents: 3,
  });
  const next = appendEventsToSession(createSession(), events);

  expect(next.events).toHaveLength(3);
  expect(next.events.map((event) => event.type)).toEqual(['glissando_step', 'glissando_step', 'glissando_step']);
  expect(engine.commands).toEqual([
    'pluck:string=1:velocity=1',
    'pluck:string=2:velocity=1',
    'pluck:string=3:velocity=1',
  ]);
});

test('plans an 8 voice polyphony burst at the same timestamp', () => {
  const events = planPolyphonyBurst({
    nowMs: 300,
    stringIndexes: [1, 2, 3, 4, 5, 6, 7, 8],
  });

  expect(events).toHaveLength(8);
  expect(events).toEqual([
    { type: 'string_pluck', tsMs: 300, stringIndex: 1, velocity: 1 },
    { type: 'string_pluck', tsMs: 300, stringIndex: 2, velocity: 1 },
    { type: 'string_pluck', tsMs: 300, stringIndex: 3, velocity: 1 },
    { type: 'string_pluck', tsMs: 300, stringIndex: 4, velocity: 1 },
    { type: 'string_pluck', tsMs: 300, stringIndex: 5, velocity: 1 },
    { type: 'string_pluck', tsMs: 300, stringIndex: 6, velocity: 1 },
    { type: 'string_pluck', tsMs: 300, stringIndex: 7, velocity: 1 },
    { type: 'string_pluck', tsMs: 300, stringIndex: 8, velocity: 1 },
  ]);
});

test('plans a pitch bend probe with an active pluck, bend range, and release', () => {
  const events = planPitchBendProbe({
    nowMs: 400,
    stringIndex: 6,
  });

  expect(events).toEqual([
    { type: 'string_pluck', tsMs: 400, stringIndex: 6, velocity: 1 },
    { type: 'string_bend', tsMs: 560, stringIndex: 6, cents: 120 },
    { type: 'string_bend', tsMs: 640, stringIndex: 6, cents: -120 },
    { type: 'string_release', tsMs: 720, stringIndex: 6 },
  ]);
});

test('plans a mute probe with an active pluck, clean mute, and release', () => {
  const events = planMuteProbe({
    nowMs: 500,
    stringIndex: 6,
  });

  expect(events).toEqual([
    { type: 'string_pluck', tsMs: 500, stringIndex: 6, velocity: 1 },
    { type: 'string_mute', tsMs: 620, stringIndex: 6, strength: 1 },
    { type: 'string_release', tsMs: 700, stringIndex: 6 },
  ]);
});

function createReplaySchedule(items: ReplaySchedule['items']): ReplaySchedule {
  return {
    durationMs: items.length === 0 ? 0 : Math.max(...items.map((item) => item.delayMs)),
    items,
    sampleAssetManifestVersion: 'manifest-v1',
    sessionId: 'session-1',
  };
}

function createSampleManifest(): SampleAssetManifest {
  return {
    version: 'manifest-v1',
    assets: [
      {
        fileUri: 'asset://gayageum/01.wav',
        id: 'gayageum-01',
        instrument: 'gayageum_12',
        licenseNote: 'technical fixture',
        pitchHz: 196,
        sourceLayer: 'own_asset',
        sourceName: 'dev fixture',
        stringIndex: 1,
      },
    ],
  };
}

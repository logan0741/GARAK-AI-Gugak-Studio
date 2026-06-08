import { expect, test } from 'vitest';
import { FakeSamplerEngine } from '../../audio/fakeSamplerEngine';
import { createEmptySession } from '../../domain/session';
import {
  appendEventsToSession,
  dispatchEventsToEngine,
  safelyDispatchEventsToCurrentEngine,
  safelyDispatchEventsToEngine,
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

  dispatchEventsToEngine(engine, events);

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

  expect(result).toEqual({ ok: false, errorMessage: 'native audio failed' });
  expect(next.events).toEqual(events);
});

test('dispatches to the current engine reference after the engine changes', () => {
  const staleEngine = new FakeSamplerEngine();
  const currentEngine = new FakeSamplerEngine();
  const engineRef = { current: staleEngine };
  const events = planStringPlay({ nowMs: 100, stringIndex: 3 });

  engineRef.current = currentEngine;

  expect(safelyDispatchEventsToCurrentEngine(engineRef, events)).toEqual({ ok: true });
  expect(staleEngine.commands).toEqual([]);
  expect(currentEngine.commands).toEqual(['pluck:string=3:velocity=1']);
});

test('appends planned events to session in order', () => {
  const engine = new FakeSamplerEngine();
  const events = planGlissando({
    nowMs: 200,
    stringIndexes: [1, 2, 3],
  });

  dispatchEventsToEngine(engine, events);
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

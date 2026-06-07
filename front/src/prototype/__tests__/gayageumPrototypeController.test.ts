import { expect, test } from 'vitest';
import { FakeSamplerEngine } from '../../audio/fakeSamplerEngine';
import { createEmptySession } from '../../domain/session';
import {
  appendEventsToSession,
  dispatchEventsToEngine,
  safelyDispatchEventsToCurrentEngine,
  safelyDispatchEventsToEngine,
  planGlissando,
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

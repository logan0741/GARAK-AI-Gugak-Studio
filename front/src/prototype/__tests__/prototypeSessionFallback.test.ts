import { expect, test } from 'vitest';
import { createEmptySession, appendPerformanceEvent } from '../../domain/session';
import { buildPrototypeSessionFallback, formatPrototypeSessionFallbackForInspector } from '../prototypeSessionFallback';

test('formats a copyable replayable session fallback with event data', () => {
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'local-prototype-session',
      createdAt: '2026-06-08T00:00:00.000Z',
      sampleAssetManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
    }),
    {
      type: 'glissando_step',
      tsMs: 100,
      stringIndex: 1,
      velocity: 1,
    },
  );

  expect(buildPrototypeSessionFallback(session)).toEqual({
    format: 'gukak-studio-session-fallback-v1',
    canReplay: true,
    eventCount: 1,
    note: 'Copy this JSON as the event-session fallback if audio capture fails.',
    session,
  });
  expect(JSON.parse(formatPrototypeSessionFallbackForInspector(session))).toMatchObject({
    format: 'gukak-studio-session-fallback-v1',
    canReplay: true,
    eventCount: 1,
    session: {
      id: 'local-prototype-session',
      sampleAssetManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
      events: [{ type: 'glissando_step', stringIndex: 1 }],
    },
  });
});

test('marks empty sessions as not replayable yet', () => {
  const session = createEmptySession({
    id: 'empty-session',
    createdAt: '2026-06-08T00:00:00.000Z',
    sampleAssetManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
  });

  expect(buildPrototypeSessionFallback(session)).toMatchObject({
    canReplay: false,
    eventCount: 0,
  });
});

import { expect, test } from 'vitest';
import { appendPerformanceEvent, createEmptySession } from '../session';

test('creates a session with manifest version and no recording requirement', () => {
  const session = createEmptySession({
    id: 'session-1',
    createdAt: '2026-06-02T00:00:00.000Z',
    sampleAssetManifestVersion: '2026-06-02-dev',
  });

  expect(session.recordingUri).toBeUndefined();
  expect(session.events).toEqual([]);
});

test('appends performance events without requiring audio capture', () => {
  const session = createEmptySession({
    id: 'session-1',
    createdAt: '2026-06-02T00:00:00.000Z',
    sampleAssetManifestVersion: '2026-06-02-dev',
  });

  const next = appendPerformanceEvent(session, {
    type: 'string_pluck',
    tsMs: 100,
    stringIndex: 1,
    velocity: 1,
  });

  expect(next.events).toHaveLength(1);
  expect(next.recordingUri).toBeUndefined();
});

test('clears derived session projections after appending an event', () => {
  const session = {
    ...createEmptySession({
      id: 'session-1',
      createdAt: '2026-06-02T00:00:00.000Z',
      sampleAssetManifestVersion: '2026-06-02-dev',
    }),
    bpmEstimate: 72,
    densityEstimate: 'low' as const,
    jangdanRecommendation: 'jungmori' as const,
  };

  const next = appendPerformanceEvent(session, {
    type: 'string_pluck',
    tsMs: 100,
    stringIndex: 1,
    velocity: 1,
  });

  expect(next.bpmEstimate).toBeUndefined();
  expect(next.densityEstimate).toBeUndefined();
  expect(next.jangdanRecommendation).toBeUndefined();
});

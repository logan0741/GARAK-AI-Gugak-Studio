import { expect, test } from 'vitest';
import { appendPerformanceEvent, attachRecordingUriToSession, createEmptySession } from '../session';

test('creates a session with manifest version and no recording requirement', () => {
  const session = createEmptySession({
    id: 'session-1',
    createdAt: '2026-06-02T00:00:00.000Z',
    sampleAssetManifestVersion: '2026-06-02-dev',
  });

  expect(session.recordingUri).toBeUndefined();
  expect(session.recordings).toEqual([]);
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
  expect(next.recordings).toEqual([]);
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

test('attaches a captured recording uri without dropping event fallback data', () => {
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'session-1',
      createdAt: '2026-06-02T00:00:00.000Z',
      sampleAssetManifestVersion: '2026-06-02-dev',
    }),
    {
      type: 'string_pluck',
      tsMs: 100,
      stringIndex: 1,
      velocity: 1,
    },
  );

  const next = attachRecordingUriToSession(session, 'file://recording.m4a');

  expect(next.recordingUri).toBe('file://recording.m4a');
  expect(next.recordings).toEqual([
    {
      id: 'recording-1',
      kind: 'live_capture',
      uri: 'file://recording.m4a',
    },
  ]);
  expect(next.events).toEqual(session.events);
});

test('trims captured recording uri before storing it on session fallback data', () => {
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'session-1',
      createdAt: '2026-06-02T00:00:00.000Z',
      sampleAssetManifestVersion: '2026-06-02-dev',
    }),
    {
      type: 'string_pluck',
      tsMs: 100,
      stringIndex: 1,
      velocity: 1,
    },
  );

  const next = attachRecordingUriToSession(session, '  file://recording.m4a  ');

  expect(next.recordingUri).toBe('file://recording.m4a');
  expect(next.recordings).toEqual([
    {
      id: 'recording-1',
      kind: 'live_capture',
      uri: 'file://recording.m4a',
    },
  ]);
  expect(next.events).toEqual(session.events);
});

test('does not attach whitespace recording uri to session fallback data', () => {
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'session-1',
      createdAt: '2026-06-02T00:00:00.000Z',
      sampleAssetManifestVersion: '2026-06-02-dev',
    }),
    {
      type: 'string_pluck',
      tsMs: 100,
      stringIndex: 1,
      velocity: 1,
    },
  );

  const next = attachRecordingUriToSession(session, '   ');

  expect(next.recordingUri).toBeUndefined();
  expect(next.recordings).toEqual([]);
  expect(next.events).toEqual(session.events);
});

test('preserves existing recording outputs when appending later performance events', () => {
  const session = attachRecordingUriToSession(
    createEmptySession({
      id: 'session-1',
      createdAt: '2026-06-02T00:00:00.000Z',
      sampleAssetManifestVersion: '2026-06-02-dev',
    }),
    'file://recording.m4a',
  );

  const next = appendPerformanceEvent(session, {
    type: 'string_pluck',
    tsMs: 100,
    stringIndex: 1,
    velocity: 1,
  });

  expect(next.recordings).toEqual(session.recordings);
  expect(next.recordingUri).toBe('file://recording.m4a');
  expect(next.events).toHaveLength(1);
});

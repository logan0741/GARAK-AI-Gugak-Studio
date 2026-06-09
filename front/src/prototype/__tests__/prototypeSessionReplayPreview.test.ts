import { expect, test } from 'vitest';
import { SampleAssetManifest } from '../../domain/sampleManifest';
import { appendPerformanceEvent, createEmptySession } from '../../domain/session';
import {
  createPrototypeSessionReplayPreview,
  formatPrototypeSessionReplayPreview,
} from '../prototypeSessionReplayPreview';

test('reports waiting status when the session has no replayable events', () => {
  const session = createEmptySession({
    id: 'empty-session',
    createdAt: '2026-06-08T00:00:00.000Z',
    sampleAssetManifestVersion: 'manifest-v1',
  });

  const preview = createPrototypeSessionReplayPreview(session, createManifest());

  expect(preview).toEqual({
    durationMs: 0,
    eventCount: 0,
    status: 'waiting',
    text: 'Replay waiting: 0 events',
  });
  expect(formatPrototypeSessionReplayPreview(preview)).toBe('Replay waiting: 0 events');
});

test('reports ready status when the current manifest can schedule the session replay', () => {
  const session = [
    { type: 'string_pluck' as const, tsMs: 120, stringIndex: 1, velocity: 1 },
    { type: 'string_bend' as const, tsMs: 240, stringIndex: 1, cents: 35 },
  ].reduce(
    (current, event) => appendPerformanceEvent(current, event),
    createEmptySession({
      id: 'session-1',
      createdAt: '2026-06-08T00:00:00.000Z',
      sampleAssetManifestVersion: 'manifest-v1',
    }),
  );

  const preview = createPrototypeSessionReplayPreview(session, createManifest());

  expect(preview).toEqual({
    durationMs: 120,
    eventCount: 2,
    status: 'ready',
    text: 'Replay ready: 2 events, 120 ms',
  });
  expect(formatPrototypeSessionReplayPreview(preview)).toBe('Replay ready: 2 events, 120 ms');
});

test('reports blocked status when the current manifest cannot reproduce the session', () => {
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'session-1',
      createdAt: '2026-06-08T00:00:00.000Z',
      sampleAssetManifestVersion: 'manifest-v2',
    }),
    { type: 'string_pluck', tsMs: 120, stringIndex: 1, velocity: 1 },
  );

  const preview = createPrototypeSessionReplayPreview(session, createManifest());

  expect(preview).toEqual({
    durationMs: 0,
    errorMessage:
      'SampleAssetManifest version manifest-v1 does not match session replay version manifest-v2',
    eventCount: 1,
    status: 'blocked',
    text: 'Replay blocked: SampleAssetManifest version manifest-v1 does not match session replay version manifest-v2',
  });
  expect(formatPrototypeSessionReplayPreview(preview)).toBe(
    'Replay blocked: SampleAssetManifest version manifest-v1 does not match session replay version manifest-v2',
  );
});

function createManifest(): SampleAssetManifest {
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

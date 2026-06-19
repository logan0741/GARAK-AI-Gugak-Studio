import { expect, test } from 'vitest';
import { SampleAssetManifest } from '../sampleManifest';
import { appendPerformanceEvent, createEmptySession } from '../session';
import { planSessionReplay } from '../replayPlanner';

test('plans a deterministic replay schedule from session events and sample assets', () => {
  const session = [
    { type: 'string_pluck' as const, tsMs: 300, stringIndex: 2, velocity: 0.8 },
    { type: 'string_bend' as const, tsMs: 250, stringIndex: 2, cents: 40 },
    { type: 'glissando_step' as const, tsMs: 300, stringIndex: 1, velocity: 1 },
  ].reduce(
    (current, event) => appendPerformanceEvent(current, event),
    createEmptySession({
      id: 'session-1',
      createdAt: '2026-06-08T00:00:00.000Z',
      sampleAssetManifestVersion: 'manifest-v1',
    }),
  );

  expect(planSessionReplay(session, createManifest())).toEqual({
    durationMs: 50,
    items: [
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
    ],
    sampleAssetManifestVersion: 'manifest-v1',
    sessionId: 'session-1',
  });
});

test('plans an empty replay schedule for a session without events', () => {
  const session = createEmptySession({
    id: 'empty-session',
    createdAt: '2026-06-08T00:00:00.000Z',
    sampleAssetManifestVersion: 'manifest-v1',
  });

  expect(planSessionReplay(session, createManifest())).toEqual({
    durationMs: 0,
    items: [],
    sampleAssetManifestVersion: 'manifest-v1',
    sessionId: 'empty-session',
  });
});

test('plans janggu hit replay items with surface sample assets', () => {
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'janggu-session',
      createdAt: '2026-06-19T00:00:00.000Z',
      sampleAssetManifestVersion: 'janggu-manifest-v1',
    }),
    { type: 'janggu_hit', tsMs: 640, surface: 'gungpyeon', velocity: 0.75 },
  );

  expect(planSessionReplay(session, createJangguManifest())).toEqual({
    durationMs: 0,
    items: [
      {
        delayMs: 0,
        event: { type: 'janggu_hit', tsMs: 640, surface: 'gungpyeon', velocity: 0.75 },
        originalIndex: 0,
        sampleAssetId: 'janggu-gungpyeon',
        sampleFileUri: 'asset://janggu/gungpyeon.wav',
      },
    ],
    sampleAssetManifestVersion: 'janggu-manifest-v1',
    sessionId: 'janggu-session',
  });
});

test('plans daegeum note replay items with fingering sample assets', () => {
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'daegeum-session',
      createdAt: '2026-06-19T00:00:00.000Z',
      sampleAssetManifestVersion: 'daegeum-manifest-v1',
    }),
    { type: 'daegeum_note', tsMs: 720, fingering: 'open', breath: 0.9 },
  );

  expect(planSessionReplay(session, createDaegeumManifest())).toEqual({
    durationMs: 0,
    items: [
      {
        delayMs: 0,
        event: { type: 'daegeum_note', tsMs: 720, fingering: 'open', breath: 0.9 },
        originalIndex: 0,
        sampleAssetId: 'daegeum-open',
        sampleFileUri: 'asset://daegeum/open.wav',
      },
    ],
    sampleAssetManifestVersion: 'daegeum-manifest-v1',
    sessionId: 'daegeum-session',
  });
});

test('rejects replay when the session and sample manifest versions differ', () => {
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'session-1',
      createdAt: '2026-06-08T00:00:00.000Z',
      sampleAssetManifestVersion: 'manifest-v2',
    }),
    { type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 },
  );

  expect(() => planSessionReplay(session, createManifest())).toThrow(
    'SampleAssetManifest version manifest-v1 does not match session replay version manifest-v2',
  );
});

test('rejects replay when a pluck-like event has no matching sample asset', () => {
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'session-1',
      createdAt: '2026-06-08T00:00:00.000Z',
      sampleAssetManifestVersion: 'manifest-v1',
    }),
    { type: 'string_pluck', tsMs: 100, stringIndex: 3, velocity: 1 },
  );

  expect(() => planSessionReplay(session, createManifest({ stringIndexes: [1, 2] }))).toThrow(
    'No sample asset for stringIndex 3 in manifest version manifest-v1',
  );
});

test('rejects replay when sample assets make a string schedule ambiguous', () => {
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'session-1',
      createdAt: '2026-06-08T00:00:00.000Z',
      sampleAssetManifestVersion: 'manifest-v1',
    }),
    { type: 'glissando_step', tsMs: 100, stringIndex: 1, velocity: 1 },
  );
  const manifest = createManifest({ stringIndexes: [1, 1] });

  expect(() => planSessionReplay(session, manifest)).toThrow(
    'SampleAssetManifest contains duplicate assets for stringIndex 1',
  );
});

function createManifest(input: { stringIndexes?: number[] } = {}): SampleAssetManifest {
  const stringIndexes = input.stringIndexes ?? [1, 2];

  return {
    version: 'manifest-v1',
    assets: stringIndexes.map((stringIndex, index) => {
      const duplicateOrdinal = stringIndexes
        .slice(0, index)
        .filter((value) => value === stringIndex).length;

      return {
        fileUri: `asset://gayageum/${String(stringIndex).padStart(2, '0')}.wav`,
        id: `gayageum-${String(stringIndex).padStart(2, '0')}${
          duplicateOrdinal > 0 ? `-${duplicateOrdinal}` : ''
        }`,
        instrument: 'gayageum_12',
        licenseNote: 'technical fixture',
        pitchHz: 196 + stringIndex,
        sourceLayer: 'own_asset',
        sourceName: 'dev fixture',
        stringIndex,
      };
    }),
  };
}

function createJangguManifest(): SampleAssetManifest {
  return {
    version: 'janggu-manifest-v1',
    assets: [
      {
        fileUri: 'asset://janggu/gungpyeon.wav',
        id: 'janggu-gungpyeon',
        instrument: 'janggu',
        licenseNote: 'technical fixture',
        sourceLayer: 'own_asset',
        sourceName: 'dev fixture',
        surface: 'gungpyeon',
      },
    ],
  };
}

function createDaegeumManifest(): SampleAssetManifest {
  return {
    version: 'daegeum-manifest-v1',
    assets: [
      {
        fileUri: 'asset://daegeum/open.wav',
        fingering: 'open',
        id: 'daegeum-open',
        instrument: 'daegeum',
        licenseNote: 'technical fixture',
        pitchHz: 392,
        sourceLayer: 'own_asset',
        sourceName: 'dev fixture',
      },
    ],
  };
}

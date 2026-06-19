import { expect, test } from 'vitest';
import { appendPerformanceEvent, createEmptySession } from '../../domain/session';
import { buildPrototypeSessionFallback } from '../prototypeSessionFallback';
import { runPrototypeSessionFallbackCommand } from '../prototypeSessionFallbackCommand';

test('returns usage when no session fallback path is provided', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeSessionFallbackCommand({
      argv: [],
      readTextFile: () => '{}',
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Usage: npm run qa:session-fallback -- <session-fallback.json> [sample-manifest.json]',
  ]);
});

test('reports a replayable copied session fallback file', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
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

  expect(
    runPrototypeSessionFallbackCommand({
      argv: ['session-fallback.json'],
      readTextFile: () => JSON.stringify(buildPrototypeSessionFallback(session)),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  expect(stdout).toEqual([
    [
      '# Session Fallback Summary',
      '',
      '- Status: REPLAYABLE_SESSION_FALLBACK',
      '- Session: local-prototype-session',
      '- Event count: 1',
      '- Sample manifest: dev-synthetic-gayageum-2026-06-08',
    ].join('\n'),
  ]);
});

test('reports replay schedule readiness when a sample manifest is provided', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'local-prototype-session',
      createdAt: '2026-06-08T00:00:00.000Z',
      sampleAssetManifestVersion: 'manifest-v1',
    }),
    {
      type: 'string_pluck',
      tsMs: 100,
      stringIndex: 1,
      velocity: 1,
    },
  );

  expect(
    runPrototypeSessionFallbackCommand({
      argv: ['session-fallback.json', 'sample-manifest.json'],
      readTextFile: (path) =>
        path === 'sample-manifest.json'
          ? JSON.stringify(createSampleManifest())
          : JSON.stringify(buildPrototypeSessionFallback(session)),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  expect(stdout).toEqual([
    [
      '# Session Fallback Summary',
      '',
      '- Status: REPLAYABLE_SESSION_FALLBACK',
      '- Session: local-prototype-session',
      '- Event count: 1',
      '- Sample manifest: manifest-v1',
      '- Replay schedule: 1 items, 0 ms',
    ].join('\n'),
  ]);
});

test('rejects session fallback replay when the provided sample manifest cannot reproduce it', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const session = appendPerformanceEvent(
    createEmptySession({
      id: 'local-prototype-session',
      createdAt: '2026-06-08T00:00:00.000Z',
      sampleAssetManifestVersion: 'manifest-v1',
    }),
    {
      type: 'string_pluck',
      tsMs: 100,
      stringIndex: 1,
      velocity: 1,
    },
  );

  expect(
    runPrototypeSessionFallbackCommand({
      argv: ['session-fallback.json', 'sample-manifest.json'],
      readTextFile: (path) =>
        path === 'sample-manifest.json'
          ? JSON.stringify({ ...createSampleManifest(), version: 'manifest-v2' })
          : JSON.stringify(buildPrototypeSessionFallback(session)),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Could not plan session fallback replay: SampleAssetManifest version manifest-v2 does not match session replay version manifest-v1',
  ]);
});

test('rejects a copied session fallback file that cannot be replayed yet', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const fallback = buildPrototypeSessionFallback(
    createEmptySession({
      id: 'empty-session',
      createdAt: '2026-06-08T00:00:00.000Z',
      sampleAssetManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
    }),
  );

  expect(
    runPrototypeSessionFallbackCommand({
      argv: ['empty-session-fallback.json'],
      readTextFile: () => JSON.stringify(fallback),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout).toEqual([
    [
      '# Session Fallback Summary',
      '',
      '- Status: NOT_REPLAYABLE_SESSION_FALLBACK',
      '- Session: empty-session',
      '- Event count: 0',
      '- Sample manifest: dev-synthetic-gayageum-2026-06-08',
    ].join('\n'),
  ]);
});

test('returns parser errors for contaminated copied session fallback files', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeSessionFallbackCommand({
      argv: ['bad-session-fallback.json'],
      readTextFile: () =>
        JSON.stringify({
          format: 'wrong-format',
          canReplay: true,
          eventCount: 0,
          session: {
            id: 'local-prototype-session',
            createdAt: '2026-06-08T00:00:00.000Z',
            sampleAssetManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
            events: [],
            recordings: [],
          },
        }),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Could not parse session fallback: format must be gukak-studio-session-fallback-v1; note must be a non-empty string; canReplay must match whether session has events',
  ]);
});

function createSampleManifest() {
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

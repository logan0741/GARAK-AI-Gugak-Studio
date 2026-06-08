import { expect, test } from 'vitest';
import { runPrototypeHandoffMergeCommand } from '../prototypeHandoffMergeCommand';
import { PrototypeProbeDraftInspectorModel } from '../prototypeQaSnapshot';

const nullMeasurements = {
  touchToSoundLatencyMs: null,
  maxStableVoices: null,
  pitchBendSmooth: null,
  glissandoTriggeredStrings: null,
  muteReleaseClean: null,
  preloadStable: null,
  sessionFallbackPreserved: null,
  recordingCaptureSeconds: null,
};

test('returns usage when output path or input handoff paths are missing', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffMergeCommand({
      argv: ['merged.json'],
      getGeneratedAt: () => '2026-06-08T05:00:00.000Z',
      readTextFile: () => '{}',
      writeTextFile: () => undefined,
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Usage: npm run qa:prototype-handoff-merge -- <output-handoff.json> <prototype-handoff.json...>',
  ]);
});

test('merges prototype handoff entries from separate candidate files', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writtenFiles = new Map<string, string>();
  const inputFiles = new Map([
    [
      'expo-handoff.json',
      JSON.stringify(createPrototypeHandoffForCandidate('expo-audio')),
    ],
    [
      'rn-handoff.json',
      JSON.stringify(createPrototypeHandoffForCandidate('react-native-audio-api')),
    ],
  ]);

  expect(
    runPrototypeHandoffMergeCommand({
      argv: ['merged.json', 'expo-handoff.json', 'rn-handoff.json'],
      getGeneratedAt: () => '2026-06-08T05:00:00.000Z',
      readTextFile: (path) => inputFiles.get(path) ?? '',
      writeTextFile: (path, value) => writtenFiles.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  expect(stdout).toEqual(['Wrote merged prototype handoff: merged.json (2 entries)']);
  expect(JSON.parse(writtenFiles.get('merged.json') ?? '')).toMatchObject({
    generatedAt: '2026-06-08T05:00:00.000Z',
    entries: [
      {
        inspectorDraft: {
          probeTemplate: {
            candidate: 'expo-audio',
          },
        },
        measurements: nullMeasurements,
      },
      {
        inspectorDraft: {
          probeTemplate: {
            candidate: 'react-native-audio-api',
          },
        },
        measurements: nullMeasurements,
      },
    ],
  });
});

test('rejects duplicate candidate entries across handoff files', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffMergeCommand({
      argv: ['merged.json', 'first.json', 'second.json'],
      getGeneratedAt: () => '2026-06-08T05:00:00.000Z',
      readTextFile: () => JSON.stringify(createPrototypeHandoffForCandidate('expo-audio')),
      writeTextFile: () => undefined,
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Could not merge prototype handoffs: duplicate candidate entries: expo-audio',
  ]);
});

test('allows slash spacing differences for the same physical device label', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writtenFiles = new Map<string, string>();
  const inputFiles = new Map([
    [
      'expo-handoff.json',
      JSON.stringify(createPrototypeHandoffForCandidate('expo-audio', 'Pixel 8/Android 15')),
    ],
    [
      'rn-handoff.json',
      JSON.stringify(
        createPrototypeHandoffForCandidate('react-native-audio-api', 'Pixel 8 /Android 15'),
      ),
    ],
  ]);

  expect(
    runPrototypeHandoffMergeCommand({
      argv: ['merged.json', 'expo-handoff.json', 'rn-handoff.json'],
      getGeneratedAt: () => '2026-06-08T05:00:00.000Z',
      readTextFile: (path) => inputFiles.get(path) ?? '',
      writeTextFile: (path, value) => writtenFiles.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  expect(stdout).toEqual(['Wrote merged prototype handoff: merged.json (2 entries)']);
});

test('rejects handoffs copied from different physical device labels', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const inputFiles = new Map([
    [
      'expo-handoff.json',
      JSON.stringify(createPrototypeHandoffForCandidate('expo-audio', 'Pixel 8 / Android 15')),
    ],
    [
      'rn-handoff.json',
      JSON.stringify(
        createPrototypeHandoffForCandidate(
          'react-native-audio-api',
          'Galaxy S24 / Android 15',
        ),
      ),
    ],
  ]);

  expect(
    runPrototypeHandoffMergeCommand({
      argv: ['merged.json', 'expo-handoff.json', 'rn-handoff.json'],
      getGeneratedAt: () => '2026-06-08T05:00:00.000Z',
      readTextFile: (path) => inputFiles.get(path) ?? '',
      writeTextFile: () => undefined,
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Could not merge prototype handoffs: device labels must match: Pixel 8 / Android 15, Galaxy S24 / Android 15',
  ]);
});

test('returns invalid json errors without exposing a stack trace', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffMergeCommand({
      argv: ['merged.json', 'bad.json'],
      getGeneratedAt: () => '2026-06-08T05:00:00.000Z',
      readTextFile: () => '{',
      writeTextFile: () => undefined,
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual(['Invalid JSON in prototype handoff: bad.json']);
});

test('returns readable errors for malformed handoff files', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffMergeCommand({
      argv: ['merged.json', 'bad-shape.json'],
      getGeneratedAt: () => '2026-06-08T05:00:00.000Z',
      readTextFile: () => JSON.stringify({ generatedAt: '2026-06-08T04:00:00.000Z' }),
      writeTextFile: () => undefined,
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Could not merge prototype handoffs: bad-shape.json entries must be an array',
  ]);
});

test('rejects handoff entries without a measurements object', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffMergeCommand({
      argv: ['merged.json', 'missing-measurements.json'],
      getGeneratedAt: () => '2026-06-08T05:00:00.000Z',
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T04:00:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
            },
          ],
        }),
      writeTextFile: () => undefined,
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Could not merge prototype handoffs: missing-measurements.json entries[0].measurements must be an object',
  ]);
});

function createPrototypeHandoffForCandidate(
  candidate: 'expo-audio' | 'react-native-audio-api',
  deviceLabel = 'Pixel 8 / Android 15',
) {
  return {
    generatedAt: '2026-06-08T04:00:00.000Z',
    entries: [
      {
        inspectorDraft: createInspectorDraftForCandidate(candidate),
        measuredAt: '2026-06-08T04:00:00.000Z',
        deviceLabel,
        measurements: nullMeasurements,
      },
    ],
  };
}

function createInspectorDraftForCandidate(
  candidate: 'expo-audio' | 'react-native-audio-api',
  deviceLabel = 'Pixel 8 / Android 15',
): PrototypeProbeDraftInspectorModel {
  return {
    note: 'Estimate draft from fake prototype engine counters. Replace with physical-device candidate measurements before Day 5 handoff.',
    measuredCandidateEvidence: false,
    runtimeUnderTest: 'fake-sampler-engine',
    observedRuntime: {
      activeRuntime: candidate,
      nativePreloadStatus: 'ready',
      requestedCandidate: candidate,
      runtimeStatus: 'native_candidate_ready',
      sampleManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
    },
    observedFakeCounters: {
      audioDispatchFailures: 0,
      eventCount: 12,
      eventDispatchLatency: {
        averageMs: 4,
        latestMs: 3,
        maxMs: 5,
        sampleCount: 2,
      },
      glissandoTriggeredStrings: 12,
      maxActiveVoices: 8,
      muteObserved: true,
      pitchBendObserved: true,
      sessionFallbackPreserved: true,
    },
    observedPrototypeRecording: {
      capturedSeconds: null,
      fallbackReason: null,
      playbackConfirmed: false,
      uriAvailable: false,
    },
    probeTemplate: {
      candidate,
      deviceLabel,
      evidenceSource: 'estimate',
      glissandoTriggeredStrings: null,
      maxStableVoices: null,
      measuredAt: '2026-06-08T04:00:00.000Z',
      muteReleaseClean: null,
      pitchBendSmooth: null,
      preloadStable: null,
      recordingCaptureSeconds: null,
      sessionFallbackPreserved: null,
      touchToSoundLatencyMs: null,
    },
  };
}

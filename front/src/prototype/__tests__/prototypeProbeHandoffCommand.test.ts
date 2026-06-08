import { expect, test } from 'vitest';
import { parseAudioEngineProbeRecord } from '../../audio/audioEngineProbeRecord';
import { runPrototypeProbeHandoffCommand } from '../prototypeProbeHandoffCommand';
import { PrototypeProbeDraftInspectorModel } from '../prototypeQaSnapshot';

const measurements = {
  touchToSoundLatencyMs: 38,
  maxStableVoices: 9,
  pitchBendSmooth: true,
  glissandoTriggeredStrings: 12,
  muteReleaseClean: true,
  preloadStable: true,
  sessionFallbackPreserved: true,
  recordingCaptureSeconds: 0,
};

test('returns usage when no prototype handoff path is provided', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeProbeHandoffCommand({
      argv: [],
      readTextFile: () => '{}',
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);
  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Usage: npm run qa:prototype-probe-record -- <prototype-handoff.json> <probe-record.json>',
  ]);
});

test('returns usage when no probe record output path is provided', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeProbeHandoffCommand({
      argv: ['prototype-handoff.json'],
      readTextFile: () => '{}',
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Usage: npm run qa:prototype-probe-record -- <prototype-handoff.json> <probe-record.json>',
  ]);
});

test('writes a parseable Day 5 probe record from prototype inspector drafts', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writtenFiles = new Map<string, string>();

  expect(
    runPrototypeProbeHandoffCommand({
      argv: ['prototype-handoff.json', 'probe-record.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T03:10:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
              measuredAt: '2026-06-08T03:00:00.000Z',
              measurements: {
                ...measurements,
                recordingCaptureSeconds: 10,
                touchToSoundLatencyMs: 45,
              },
            },
            {
              inspectorDraft: createInspectorDraftForCandidate('react-native-audio-api'),
              measuredAt: '2026-06-08T03:05:00.000Z',
              measurements,
            },
          ],
        }),
      writeTextFile: (path, value) => writtenFiles.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  expect(stdout).toEqual(['Wrote Day 5 probe record: probe-record.json']);
  const record = JSON.parse(writtenFiles.get('probe-record.json') ?? '');
  expect(parseAudioEngineProbeRecord(record)).toEqual({ ok: true, record });
  expect(record).toMatchObject({
    generatedAt: '2026-06-08T03:10:00.000Z',
    probes: [
      {
        candidate: 'expo-audio',
        evidenceSource: 'physical-device',
        recordingCaptureSeconds: 10,
        touchToSoundLatencyMs: 45,
      },
      {
        candidate: 'react-native-audio-api',
        evidenceSource: 'physical-device',
        recordingCaptureSeconds: 0,
        touchToSoundLatencyMs: 38,
      },
    ],
  });
});

test('writes a Day 5 probe record to an explicit output file path', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writtenFiles = new Map<string, string>();

  expect(
    runPrototypeProbeHandoffCommand({
      argv: ['prototype-handoff.json', 'probe-record.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T03:10:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
              measurements,
            },
            {
              inspectorDraft: createInspectorDraftForCandidate('react-native-audio-api'),
              measurements,
            },
          ],
        }),
      writeTextFile: (path, value) => writtenFiles.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  expect(stdout).toEqual(['Wrote Day 5 probe record: probe-record.json']);
  const writtenRecord = JSON.parse(writtenFiles.get('probe-record.json') ?? '');
  expect(parseAudioEngineProbeRecord(writtenRecord)).toEqual({
    ok: true,
    record: writtenRecord,
  });
});

test('rejects prototype handoffs that are not ready for probe record generation', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writtenFiles = new Map<string, string>();

  expect(
    runPrototypeProbeHandoffCommand({
      argv: ['incomplete-handoff.json', 'probe-record.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T03:10:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('react-native-audio-api'),
              measurements,
            },
          ],
        }),
      writeTextFile: (path, value) => writtenFiles.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect([...writtenFiles.entries()]).toEqual([]);
  expect(stderr).toEqual([
    'Could not build prototype probe record: prototype handoff is not ready for probe record: missing candidates: expo-audio',
  ]);
});

test('rejects generated probe records that do not pass Day 5 parser validation', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeProbeHandoffCommand({
      argv: ['prototype-handoff.json', 'probe-record.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: 'not-an-iso-timestamp',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
              measurements,
            },
            {
              inspectorDraft: createInspectorDraftForCandidate('react-native-audio-api'),
              measurements,
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
    'Could not build prototype probe record: prototype handoff is not ready for probe record: timestamp issues: generatedAt must be a UTC ISO timestamp',
  ]);
});

test('rejects malformed prototype handoff files before building a probe record', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeProbeHandoffCommand({
      argv: ['bad-shape.json', 'probe-record.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T03:10:00.000Z',
          entries: 'not-an-array',
        }),
      writeTextFile: () => undefined,
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Could not build prototype probe record: handoff entries must be an array',
  ]);
});

test('returns readable errors when the output probe record cannot be written', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeProbeHandoffCommand({
      argv: ['prototype-handoff.json', 'probe-record.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T03:10:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
              measurements,
            },
            {
              inspectorDraft: createInspectorDraftForCandidate('react-native-audio-api'),
              measurements,
            },
          ],
        }),
      writeTextFile: () => {
        throw new Error('permission denied');
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual(['Could not write probe record: probe-record.json']);
});

test('returns readable errors when prototype runtime is not ready', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeProbeHandoffCommand({
      argv: ['prototype-handoff.json', 'probe-record.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T03:10:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
              measurements,
            },
            {
              inspectorDraft: createInspectorDraftForCandidate('react-native-audio-api', {
                activeRuntime: 'fake-prototype',
                nativePreloadStatus: 'preloading',
                runtimeStatus: 'native_candidate_preloading',
              }),
              measurements,
            },
          ],
        }),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Could not build prototype probe record: prototype handoff is not ready for probe record: runtime issues: react-native-audio-api runtime is not ready',
  ]);
});

test('returns inspector draft issues when the handoff guard fields are contaminated', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const contaminatedDraft = createInspectorDraftForCandidate('expo-audio');

  expect(
    runPrototypeProbeHandoffCommand({
      argv: ['prototype-handoff.json', 'probe-record.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T03:10:00.000Z',
          entries: [
            {
              inspectorDraft: {
                ...contaminatedDraft,
                measuredCandidateEvidence: true,
                runtimeUnderTest: 'candidate-sampler-engine',
                probeTemplate: {
                  ...contaminatedDraft.probeTemplate,
                  evidenceSource: 'physical-device',
                },
              },
              measurements,
            },
            {
              inspectorDraft: createInspectorDraftForCandidate('react-native-audio-api'),
              measurements,
            },
          ],
        }),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Could not build prototype probe record: prototype handoff is not ready for probe record: inspector draft issues: expo-audio.inspectorDraft.measuredCandidateEvidence must be false, expo-audio.inspectorDraft.runtimeUnderTest must be fake-sampler-engine, expo-audio.inspectorDraft.probeTemplate.evidenceSource must be estimate',
  ]);
});

test('returns invalid json errors without exposing a stack trace', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeProbeHandoffCommand({
      argv: ['bad.json', 'probe-record.json'],
      readTextFile: () => '{',
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);
  expect(stdout).toEqual([]);
  expect(stderr).toEqual(['Invalid JSON in prototype handoff: bad.json']);
});

function createInspectorDraftForCandidate(
  candidate: 'expo-audio' | 'react-native-audio-api',
  runtimeOverride: Partial<PrototypeProbeDraftInspectorModel['observedRuntime']> = {},
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
      ...runtimeOverride,
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
      fallbackReason: 'recording_probe_not_supported',
      playbackConfirmed: false,
      uriAvailable: false,
    },
    probeTemplate: {
      candidate,
      deviceLabel: 'Pixel 8 / Android 15',
      evidenceSource: 'estimate',
      glissandoTriggeredStrings: null,
      maxStableVoices: null,
      measuredAt: '2026-06-08T02:55:00.000Z',
      muteReleaseClean: null,
      pitchBendSmooth: null,
      preloadStable: null,
      recordingCaptureSeconds: null,
      sessionFallbackPreserved: null,
      touchToSoundLatencyMs: null,
    },
  };
}

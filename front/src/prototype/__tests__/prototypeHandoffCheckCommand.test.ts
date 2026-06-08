import { expect, test } from 'vitest';
import { runPrototypeHandoffCheckCommand } from '../prototypeHandoffCheckCommand';
import { PrototypeProbeDraftInspectorModel } from '../prototypeQaSnapshot';

const measurements = {
  touchToSoundLatencyMs: 38,
  maxStableVoices: 9,
  pitchBendSmooth: true,
  glissandoTriggeredStrings: 12,
  muteReleaseClean: true,
  preloadStable: true,
  sessionFallbackPreserved: true,
  recordingCaptureSeconds: 10,
};

test('returns usage when no prototype handoff path is provided', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: [],
      readTextFile: () => '{}',
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual(['Usage: npm run qa:prototype-handoff-check -- <prototype-handoff.json>']);
});

test('reports ready handoffs without producing a Day 5 decision', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['ready-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T06:00:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
              measuredAt: '2026-06-08T06:00:00.000Z',
              measurements,
            },
            {
              inspectorDraft: createInspectorDraftForCandidate('react-native-audio-api'),
              measuredAt: '2026-06-08T06:05:00.000Z',
              measurements,
            },
          ],
        }),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain('# Prototype Handoff Readiness');
  expect(stdout.join('\n')).toContain('- Status: READY_FOR_PROBE_RECORD');
  expect(stdout.join('\n')).toContain('- Missing candidates: none');
  expect(stdout.join('\n')).toContain('- Duplicate candidates: none');
  expect(stdout.join('\n')).toContain('- Missing measurement fields: none');
  expect(stdout.join('\n')).toContain('- Runtime issues: none');
  expect(stdout.join('\n')).toContain('- Probe record issues: none');
  expect(stdout.join('\n')).not.toContain('FINAL_ENGINE_SELECTED');
});

test('reports incomplete handoffs with missing values and runtime issues', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['incomplete-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T06:00:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio', {
                activeRuntime: 'fake-prototype',
                nativePreloadStatus: 'preloading',
                runtimeStatus: 'native_candidate_preloading',
              }),
              measurements: {
                ...measurements,
                pitchBendSmooth: null,
                recordingCaptureSeconds: null,
              },
            },
          ],
        }),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_PROBE_RECORD');
  expect(output).toContain('- Missing candidates: react-native-audio-api');
  expect(output).toContain('- Missing measurement fields: expo-audio.pitchBendSmooth, expo-audio.recordingCaptureSeconds');
  expect(output).toContain('- Runtime issues: expo-audio runtime is not ready');
});

test('reports duplicate candidate entries before probe record generation', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['duplicate-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T06:00:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
              measurements,
            },
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
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain('- Duplicate candidates: expo-audio');
});

test('reports generated probe record validation issues before declaring readiness', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['malformed-values-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T06:00:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
              measurements: {
                ...measurements,
                touchToSoundLatencyMs: 'fast',
              },
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

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_PROBE_RECORD');
  expect(output).toContain('- Probe record issues: generated probe record is invalid:');
  expect(output).not.toContain('- Status: READY_FOR_PROBE_RECORD');
});

test('returns invalid json errors without exposing a stack trace', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['bad.json'],
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
      fallbackReason: null,
      playbackConfirmed: false,
      uriAvailable: false,
    },
    probeTemplate: {
      candidate,
      deviceLabel: 'Pixel 8 / Android 15',
      evidenceSource: 'estimate',
      glissandoTriggeredStrings: null,
      maxStableVoices: null,
      measuredAt: '2026-06-08T05:55:00.000Z',
      muteReleaseClean: null,
      pitchBendSmooth: null,
      preloadStable: null,
      recordingCaptureSeconds: null,
      sessionFallbackPreserved: null,
      touchToSoundLatencyMs: null,
    },
  };
}

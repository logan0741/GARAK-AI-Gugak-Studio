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
  recordingCaptureSeconds: 0,
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
  expect(stdout.join('\n')).toContain('- Device label issues: none');
  expect(stdout.join('\n')).toContain('- Timestamp issues: none');
  expect(stdout.join('\n')).toContain('- Manifest issues: none');
  expect(stdout.join('\n')).toContain('- Missing measurement fields: none');
  expect(stdout.join('\n')).toContain('- Invalid measurement fields: none');
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

test('reports placeholder inspector draft device labels before probe record generation', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['placeholder-device-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T06:00:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio', {}, {
                deviceLabel: 'replace-with-physical-device-model',
              }),
              deviceLabel: 'Pixel 8 / Android 15',
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
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_PROBE_RECORD');
  expect(output).toContain(
    '- Device label issues: expo-audio.inspectorDraft.probeTemplate.deviceLabel must name the physical device',
  );
  expect(output).not.toContain('- Status: READY_FOR_PROBE_RECORD');
});

test('reports mismatched device labels across candidate handoff entries', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['mismatched-device-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T06:00:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
              measurements,
            },
            {
              inspectorDraft: createInspectorDraftForCandidate('react-native-audio-api', {}, {
                deviceLabel: 'Galaxy S24 / Android 15',
              }),
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
  expect(output).toContain(
    '- Device label issues: prototype handoff must use one device label: Pixel 8 / Android 15, Galaxy S24 / Android 15',
  );
  expect(output).not.toContain('- Status: READY_FOR_PROBE_RECORD');
});

test('treats slash spacing differences as the same prototype handoff device label', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['slash-spacing-device-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T06:00:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
              deviceLabel: 'Pixel 8/Android 15',
              measurements,
            },
            {
              inspectorDraft: createInspectorDraftForCandidate('react-native-audio-api', {}, {
                deviceLabel: 'Pixel 8 /Android 15',
              }),
              measurements,
            },
          ],
        }),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: READY_FOR_PROBE_RECORD');
  expect(output).toContain('- Device label issues: none');
});

test('reports handoff timestamp issues before probe record generation', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['bad-timestamp-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: 'June 8, 2026 15:00',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio', {}, {
                measuredAt: '2026/06/08 15:05',
              }),
              measuredAt: 'June 8, 2026 15:10',
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
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_PROBE_RECORD');
  expect(output).toContain(
    '- Timestamp issues: generatedAt must be a UTC ISO timestamp, expo-audio.measuredAt must be a UTC ISO timestamp, expo-audio.inspectorDraft.probeTemplate.measuredAt must be a UTC ISO timestamp',
  );
  expect(output).not.toContain('- Status: READY_FOR_PROBE_RECORD');
});

test('reports impossible calendar dates as handoff timestamp issues', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['impossible-date-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-02-31T06:00:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio', {}, {
                measuredAt: '2026-04-31T06:00:00.000Z',
              }),
              measuredAt: '2026-06-31T06:00:00.000Z',
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
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_PROBE_RECORD');
  expect(output).toContain(
    '- Timestamp issues: generatedAt must be a UTC ISO timestamp, expo-audio.measuredAt must be a UTC ISO timestamp, expo-audio.inspectorDraft.probeTemplate.measuredAt must be a UTC ISO timestamp',
  );
  expect(output).not.toContain('- Status: READY_FOR_PROBE_RECORD');
});

test('reports unexpected sample manifest versions before probe record generation', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['wrong-manifest-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T06:00:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio', {
                sampleManifestVersion: 'release-gayageum-samples-v1',
              }),
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
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_PROBE_RECORD');
  expect(output).toContain(
    '- Manifest issues: expo-audio sampleManifestVersion must be dev-synthetic-gayageum-2026-06-08',
  );
  expect(output).not.toContain('- Status: READY_FOR_PROBE_RECORD');
});

test('reports contaminated inspector drafts before probe record generation', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const contaminatedDraft = createInspectorDraftForCandidate('expo-audio');

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['contaminated-inspector-draft-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T06:00:00.000Z',
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

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_PROBE_RECORD');
  expect(output).toContain(
    '- Inspector draft issues: expo-audio.inspectorDraft.measuredCandidateEvidence must be false, expo-audio.inspectorDraft.runtimeUnderTest must be fake-sampler-engine, expo-audio.inspectorDraft.probeTemplate.evidenceSource must be estimate',
  );
  expect(output).toContain('- Probe record issues: none');
  expect(output).not.toContain('- Status: READY_FOR_PROBE_RECORD');
});

test('reports invalid measurement fields before probe record generation', () => {
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
  expect(output).toContain('- Invalid measurement fields: expo-audio.touchToSoundLatencyMs');
  expect(output).toContain('- Probe record issues: none');
  expect(output).not.toContain('- Status: READY_FOR_PROBE_RECORD');
});

test('rejects a passing recording measurement without inspector capture playback confirmation', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['stale-recording-evidence-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T06:00:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
              measurements: {
                ...measurements,
                recordingCaptureSeconds: 10,
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
  expect(output).toContain('- Invalid measurement fields: expo-audio.recordingCaptureSeconds');
  expect(output).toContain('- Probe record issues: none');
  expect(output).not.toContain('- Status: READY_FOR_PROBE_RECORD');
});

test('rejects a recording measurement that exceeds the inspector captured seconds', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const inspectorDraft = createInspectorDraftForCandidate('expo-audio');

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['inflated-recording-evidence-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T06:00:00.000Z',
          entries: [
            {
              inspectorDraft: {
                ...inspectorDraft,
                observedPrototypeRecording: {
                  capturedSeconds: 10,
                  fallbackReason: null,
                  playbackConfirmed: true,
                  uriAvailable: true,
                },
              },
              measurements: {
                ...measurements,
                recordingCaptureSeconds: 12,
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
  expect(output).toContain('- Invalid measurement fields: expo-audio.recordingCaptureSeconds');
  expect(output).toContain('- Probe record issues: none');
  expect(output).not.toContain('- Status: READY_FOR_PROBE_RECORD');
});

test('rejects an under-ten recording measurement without inspector capture playback confirmation', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runPrototypeHandoffCheckCommand({
      argv: ['under-ten-recording-evidence-handoff.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T06:00:00.000Z',
          entries: [
            {
              inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
              measurements: {
                ...measurements,
                recordingCaptureSeconds: 4,
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
  expect(output).toContain('- Invalid measurement fields: expo-audio.recordingCaptureSeconds');
  expect(output).toContain('- Probe record issues: none');
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
  probeTemplateOverride: Partial<PrototypeProbeDraftInspectorModel['probeTemplate']> = {},
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
      ...probeTemplateOverride,
    },
  };
}

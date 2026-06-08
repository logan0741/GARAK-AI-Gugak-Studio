import { expect, test } from 'vitest';
import { buildDay5AudioEngineDecisionRecord } from '../audioEngineDecisionRecord';
import { AudioEngineProbe } from '../audioEngineEvaluation';

const passingAudioApiProbe: AudioEngineProbe = {
  candidate: 'react-native-audio-api',
  evidenceSource: 'physical-device',
  deviceLabel: 'Pixel physical device',
  measuredAt: '2026-06-08T00:00:00.000Z',
  touchToSoundLatencyMs: 42,
  maxStableVoices: 8,
  pitchBendSmooth: true,
  glissandoTriggeredStrings: 12,
  muteReleaseClean: true,
  preloadStable: true,
  sessionFallbackPreserved: true,
  recordingCaptureSeconds: 10,
};

const passingExpoProbe: AudioEngineProbe = {
  ...passingAudioApiProbe,
  candidate: 'expo-audio',
  measuredAt: '2026-06-08T00:03:00.000Z',
};

test('does not select an engine until all required candidates have physical-device probes', () => {
  expect(
    buildDay5AudioEngineDecisionRecord({
      generatedAt: '2026-06-08T01:00:00.000Z',
      probes: [passingAudioApiProbe],
    }),
  ).toEqual({
    generatedAt: '2026-06-08T01:00:00.000Z',
    status: 'INCOMPLETE_DEVICE_EVIDENCE',
    missingCandidates: ['expo-audio'],
    duplicateCandidates: [],
    deviceLabelIssues: [],
    evaluations: [
      {
        candidate: 'react-native-audio-api',
        decision: 'PASS',
        failedCriteria: [],
        passedCoreCriteria: 5,
      },
    ],
    selection: {
      decision: 'NO_GO',
      reason: 'missing required physical-device probes: expo-audio',
    },
  });
});

test('does not allow callers to bypass the Week 1 required candidate gate', () => {
  const unsafeInput = {
    generatedAt: '2026-06-08T01:00:00.000Z',
    probes: [passingAudioApiProbe],
    requiredCandidates: ['react-native-audio-api'],
  };

  expect(buildDay5AudioEngineDecisionRecord(unsafeInput)).toMatchObject({
    status: 'INCOMPLETE_DEVICE_EVIDENCE',
    missingCandidates: ['expo-audio'],
    selection: {
      decision: 'NO_GO',
      reason: 'missing required physical-device probes: expo-audio',
    },
  });
});

test('ignores non-physical evidence when deciding whether required candidates were measured', () => {
  const nonPhysicalProbes = [
    {
      ...passingExpoProbe,
      evidenceSource: 'emulator' as const,
    },
    {
      ...passingAudioApiProbe,
      evidenceSource: 'unit-test' as const,
    },
  ];

  expect(
    buildDay5AudioEngineDecisionRecord({
      generatedAt: '2026-06-08T01:00:00.000Z',
      probes: nonPhysicalProbes,
    }),
  ).toMatchObject({
    status: 'INCOMPLETE_DEVICE_EVIDENCE',
    missingCandidates: ['expo-audio', 'react-native-audio-api'],
    evaluations: [],
    selection: {
      decision: 'NO_GO',
      reason: 'missing required physical-device probes: expo-audio, react-native-audio-api',
    },
  });
});

test('does not select an engine when a required candidate has duplicate physical-device probes', () => {
  const record = buildDay5AudioEngineDecisionRecord({
    generatedAt: '2026-06-08T01:00:00.000Z',
    probes: [
      passingExpoProbe,
      {
        ...passingExpoProbe,
        measuredAt: '2026-06-08T00:04:00.000Z',
        maxStableVoices: 4,
      },
      passingAudioApiProbe,
    ],
  });

  expect(record).toMatchObject({
    status: 'INCOMPLETE_DEVICE_EVIDENCE',
    missingCandidates: [],
    duplicateCandidates: ['expo-audio'],
    selection: {
      decision: 'NO_GO',
      reason: 'duplicate physical-device probes for candidates: expo-audio',
    },
  });
});

test('does not select an engine when physical-device probes use different device labels', () => {
  const record = buildDay5AudioEngineDecisionRecord({
    generatedAt: '2026-06-08T01:00:00.000Z',
    probes: [
      {
        ...passingExpoProbe,
        deviceLabel: 'Pixel 8 / Android 15',
      },
      {
        ...passingAudioApiProbe,
        deviceLabel: 'Galaxy S24 / Android 15',
      },
    ],
  });

  expect(record).toMatchObject({
    status: 'INCOMPLETE_DEVICE_EVIDENCE',
    missingCandidates: [],
    duplicateCandidates: [],
    deviceLabelIssues: [
      'physical-device probes must use one device label: Pixel 8 / Android 15, Galaxy S24 / Android 15',
    ],
    selection: {
      decision: 'NO_GO',
      reason:
        'physical-device probes must use one device label: Pixel 8 / Android 15, Galaxy S24 / Android 15',
    },
  });
});

test('selects the strongest candidate when both required candidates have probes', () => {
  const record = buildDay5AudioEngineDecisionRecord({
    generatedAt: '2026-06-08T01:00:00.000Z',
    probes: [
      {
        ...passingExpoProbe,
        recordingCaptureSeconds: 4,
      },
      passingAudioApiProbe,
    ],
  });

  expect(record.status).toBe('FINAL_ENGINE_SELECTED');
  expect(record.missingCandidates).toEqual([]);
  expect(record.selection).toEqual({
    selectedCandidate: 'react-native-audio-api',
    decision: 'PASS',
    reason: 'react-native-audio-api has the strongest Day 5 result',
  });
});

test('keeps the decision record open when all candidates still fail', () => {
  const record = buildDay5AudioEngineDecisionRecord({
    generatedAt: '2026-06-08T01:00:00.000Z',
    probes: [
      {
        ...passingExpoProbe,
        maxStableVoices: 4,
      },
      {
        ...passingAudioApiProbe,
        pitchBendSmooth: false,
      },
    ],
  });

  expect(record.status).toBe('NO_FINAL_ENGINE');
  expect(record.missingCandidates).toEqual([]);
  expect(record.selection).toEqual({
    decision: 'FAIL',
    reason: 'no candidate passed the Day 5 engine gate',
  });
});

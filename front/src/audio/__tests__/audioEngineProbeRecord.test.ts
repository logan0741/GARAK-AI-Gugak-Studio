import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildDay5AudioEngineDecisionRecordFromProbeRecord,
  parseAudioEngineProbeRecord,
} from '../audioEngineProbeRecord';

const physicalProbeRecord = {
  generatedAt: '2026-06-08T01:00:00.000Z',
  probes: [
    {
      candidate: 'expo-audio',
      evidenceSource: 'physical-device',
      deviceLabel: 'Pixel physical device',
      measuredAt: '2026-06-08T00:00:00.000Z',
      touchToSoundLatencyMs: 45,
      maxStableVoices: 8,
      pitchBendSmooth: true,
      glissandoTriggeredStrings: 12,
      muteReleaseClean: true,
      preloadStable: true,
      sessionFallbackPreserved: true,
      recordingCaptureSeconds: 4,
    },
    {
      candidate: 'react-native-audio-api',
      evidenceSource: 'physical-device',
      deviceLabel: 'Pixel physical device',
      measuredAt: '2026-06-08T00:05:00.000Z',
      touchToSoundLatencyMs: 39,
      maxStableVoices: 10,
      pitchBendSmooth: true,
      glissandoTriggeredStrings: 12,
      muteReleaseClean: true,
      preloadStable: true,
      sessionFallbackPreserved: true,
      recordingCaptureSeconds: 10,
    },
  ],
};

test('parses a manual probe record and builds the Day 5 decision record from it', () => {
  const result = parseAudioEngineProbeRecord(physicalProbeRecord);

  expect(result).toEqual({
    ok: true,
    record: physicalProbeRecord,
  });

  if (!result.ok) throw new Error('expected probe record to parse');

  expect(buildDay5AudioEngineDecisionRecordFromProbeRecord(result.record)).toMatchObject({
    status: 'FINAL_ENGINE_SELECTED',
    missingCandidates: [],
    duplicateCandidates: [],
    selection: {
      selectedCandidate: 'react-native-audio-api',
      decision: 'PASS',
    },
  });
});

test('reports field-level errors for invalid probe records', () => {
  expect(
    parseAudioEngineProbeRecord({
      generatedAt: '',
      probes: [
        {
          candidate: 'unknown-engine',
          evidenceSource: 'physical-device',
          deviceLabel: '',
          measuredAt: '',
          touchToSoundLatencyMs: -1,
          maxStableVoices: 8,
          pitchBendSmooth: 'yes',
          glissandoTriggeredStrings: 12,
          muteReleaseClean: true,
          preloadStable: true,
          sessionFallbackPreserved: true,
          recordingCaptureSeconds: 10,
        },
      ],
    }),
  ).toEqual({
    ok: false,
    errors: [
      'generatedAt must be a non-empty string',
      'probes[0].candidate must be expo-audio or react-native-audio-api',
      'probes[0].deviceLabel must be a non-empty string',
      'probes[0].measuredAt must be a non-empty string',
      'probes[0].touchToSoundLatencyMs must be a finite number >= 0',
      'probes[0].pitchBendSmooth must be a boolean',
    ],
  });
});

test('requires voice and string count fields to be integers', () => {
  expect(
    parseAudioEngineProbeRecord({
      ...physicalProbeRecord,
      probes: [
        {
          ...physicalProbeRecord.probes[0],
          maxStableVoices: 8.5,
          glissandoTriggeredStrings: 12.2,
        },
      ],
    }),
  ).toEqual({
    ok: false,
    errors: [
      'probes[0].maxStableVoices must be an integer >= 0',
      'probes[0].glissandoTriggeredStrings must be an integer >= 0',
    ],
  });
});

test('keeps estimate records from satisfying the physical-device Day 5 gate', () => {
  const result = parseAudioEngineProbeRecord({
    ...physicalProbeRecord,
    probes: physicalProbeRecord.probes.map((probe) => ({
      ...probe,
      evidenceSource: 'estimate',
    })),
  });

  if (!result.ok) throw new Error('expected estimate probe record to parse');

  expect(buildDay5AudioEngineDecisionRecordFromProbeRecord(result.record)).toMatchObject({
    status: 'INCOMPLETE_DEVICE_EVIDENCE',
    missingCandidates: ['expo-audio', 'react-native-audio-api'],
    selection: {
      decision: 'NO_GO',
      reason: 'missing required physical-device probes: expo-audio, react-native-audio-api',
    },
  });
});

test('rejects physical-device probes that still use the placeholder device label', () => {
  expect(
    parseAudioEngineProbeRecord({
      ...physicalProbeRecord,
      probes: [
        {
          ...physicalProbeRecord.probes[0],
          deviceLabel: 'replace-with-physical-device-model',
        },
      ],
    }),
  ).toEqual({
    ok: false,
    errors: [
      'probes[0].deviceLabel must name the physical device when evidenceSource is physical-device',
    ],
  });
});

test('requires UTC ISO timestamps for generated and measured probe times', () => {
  expect(
    parseAudioEngineProbeRecord({
      ...physicalProbeRecord,
      generatedAt: 'June 8, 2026 10:00',
      probes: [
        {
          ...physicalProbeRecord.probes[0],
          measuredAt: '2026/06/08 10:05',
        },
      ],
    }),
  ).toEqual({
    ok: false,
    errors: [
      'generatedAt must be a UTC ISO timestamp',
      'probes[0].measuredAt must be a UTC ISO timestamp',
    ],
  });
});

test('parses the documented probe handoff example without satisfying the final gate', () => {
  const example = JSON.parse(
    readFileSync('docs/qa/day-5-audio-engine-probes.example.json', 'utf8'),
  );
  const result = parseAudioEngineProbeRecord(example);

  if (!result.ok) throw new Error(`expected example probe record to parse: ${result.errors.join(', ')}`);

  expect(buildDay5AudioEngineDecisionRecordFromProbeRecord(result.record)).toMatchObject({
    status: 'INCOMPLETE_DEVICE_EVIDENCE',
    missingCandidates: ['expo-audio', 'react-native-audio-api'],
    selection: {
      decision: 'NO_GO',
    },
  });
});

import { expect, test } from 'vitest';
import {
  createAudioEngineProbeDraft,
  createAudioEngineProbeRecordDraft,
} from '../audioEngineProbeDraft';
import {
  buildDay5AudioEngineDecisionRecordFromProbeRecord,
  parseAudioEngineProbeRecord,
} from '../audioEngineProbeRecord';

test('creates an estimate probe draft from observed QA values', () => {
  expect(
    createAudioEngineProbeDraft({
      candidate: 'react-native-audio-api',
      deviceLabel: 'Pixel 8 physical device',
      measuredAt: '2026-06-08T02:00:00.000Z',
      touchToSoundLatencyMs: 42,
      maxStableVoices: 9,
      pitchBendSmooth: true,
      glissandoEvents: [
        { type: 'glissando_step', tsMs: 100, stringIndex: 1, velocity: 1 },
        { type: 'glissando_step', tsMs: 116, stringIndex: 2, velocity: 1 },
        { type: 'glissando_step', tsMs: 132, stringIndex: 2, velocity: 1 },
        { type: 'glissando_step', tsMs: 148, stringIndex: 3, velocity: 1 },
      ],
      muteReleaseClean: true,
      preloadStable: true,
      sessionFallbackPreserved: true,
      recordingCaptureSeconds: 10,
    }),
  ).toEqual({
    candidate: 'react-native-audio-api',
    evidenceSource: 'estimate',
    deviceLabel: 'Pixel 8 physical device',
    measuredAt: '2026-06-08T02:00:00.000Z',
    touchToSoundLatencyMs: 42,
    maxStableVoices: 9,
    pitchBendSmooth: true,
    glissandoTriggeredStrings: 3,
    muteReleaseClean: true,
    preloadStable: true,
    sessionFallbackPreserved: true,
    recordingCaptureSeconds: 10,
  });
});

test('defaults unknown observation values to the documented estimate shape', () => {
  expect(
    createAudioEngineProbeDraft({
      candidate: 'expo-audio',
      deviceLabel: 'Pixel 8 physical device',
      measuredAt: '2026-06-08T02:10:00.000Z',
    }),
  ).toEqual({
    candidate: 'expo-audio',
    evidenceSource: 'estimate',
    deviceLabel: 'Pixel 8 physical device',
    measuredAt: '2026-06-08T02:10:00.000Z',
    touchToSoundLatencyMs: 0,
    maxStableVoices: 0,
    pitchBendSmooth: false,
    glissandoTriggeredStrings: 0,
    muteReleaseClean: false,
    preloadStable: false,
    sessionFallbackPreserved: false,
    recordingCaptureSeconds: 0,
  });
});

test('wraps candidate drafts in a parseable probe record without satisfying the final gate', () => {
  const record = createAudioEngineProbeRecordDraft({
    generatedAt: '2026-06-08T03:00:00.000Z',
    probes: [
      {
        candidate: 'expo-audio',
        deviceLabel: 'Pixel 8 physical device',
        measuredAt: '2026-06-08T02:10:00.000Z',
      },
      {
        candidate: 'react-native-audio-api',
        deviceLabel: 'Pixel 8 physical device',
        measuredAt: '2026-06-08T02:20:00.000Z',
        maxStableVoices: 8,
      },
    ],
  });

  expect(record).toEqual({
    generatedAt: '2026-06-08T03:00:00.000Z',
    probes: expect.arrayContaining([
      expect.objectContaining({ candidate: 'expo-audio', evidenceSource: 'estimate' }),
      expect.objectContaining({ candidate: 'react-native-audio-api', evidenceSource: 'estimate' }),
    ]),
  });

  const parseResult = parseAudioEngineProbeRecord(record);
  if (!parseResult.ok) throw new Error(`expected draft record to parse: ${parseResult.errors.join(', ')}`);

  expect(buildDay5AudioEngineDecisionRecordFromProbeRecord(parseResult.record).status).toBe(
    'INCOMPLETE_DEVICE_EVIDENCE',
  );
});

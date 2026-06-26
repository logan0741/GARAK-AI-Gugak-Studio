import { expect, test } from 'vitest';
import {
  createAudioEngineProbeDraft,
  createAudioEngineProbeRecordDraft,
  promoteAudioEngineProbeDraftToPhysicalDevice,
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

test('promotes an estimate draft only with explicit physical-device measurements', () => {
  const draft = createAudioEngineProbeDraft({
    candidate: 'react-native-audio-api',
    deviceLabel: 'Pixel 8 / Android 15',
    measuredAt: '2026-06-08T02:20:00.000Z',
  });

  const physicalProbe = promoteAudioEngineProbeDraftToPhysicalDevice({
    draft,
    measuredAt: '2026-06-08T02:30:00.000Z',
    measurements: {
      touchToSoundLatencyMs: 38,
      maxStableVoices: 9,
      pitchBendSmooth: true,
      glissandoTriggeredStrings: 12,
      muteReleaseClean: true,
      preloadStable: true,
      sessionFallbackPreserved: true,
      recordingCaptureSeconds: 0,
    },
  });

  expect(physicalProbe).toEqual({
    candidate: 'react-native-audio-api',
    evidenceSource: 'physical-device',
    deviceLabel: 'Pixel 8 / Android 15',
    measuredAt: '2026-06-08T02:30:00.000Z',
    touchToSoundLatencyMs: 38,
    maxStableVoices: 9,
    pitchBendSmooth: true,
    glissandoTriggeredStrings: 12,
    muteReleaseClean: true,
    preloadStable: true,
    sessionFallbackPreserved: true,
    recordingCaptureSeconds: 0,
  });

  expect(
    parseAudioEngineProbeRecord({
      generatedAt: '2026-06-08T02:40:00.000Z',
      probes: [physicalProbe],
    }),
  ).toEqual({
    ok: true,
    record: {
      generatedAt: '2026-06-08T02:40:00.000Z',
      probes: [physicalProbe],
    },
  });
});

test('rejects physical promotion when required manual measurements are missing', () => {
  const draft = createAudioEngineProbeDraft({
    candidate: 'expo-audio',
    deviceLabel: 'Pixel 8 / Android 15',
    measuredAt: '2026-06-08T02:10:00.000Z',
  });

  expect(() =>
    promoteAudioEngineProbeDraftToPhysicalDevice({
      draft,
      measurements: {
        touchToSoundLatencyMs: 45,
        maxStableVoices: 8,
      } as never,
    }),
  ).toThrow(
    'physical-device measurements missing: pitchBendSmooth, glissandoTriggeredStrings, muteReleaseClean, preloadStable, sessionFallbackPreserved, recordingCaptureSeconds',
  );
});

test('rejects physical promotion when required manual measurements are still null', () => {
  const draft = createAudioEngineProbeDraft({
    candidate: 'expo-audio',
    deviceLabel: 'Pixel 8 / Android 15',
    measuredAt: '2026-06-08T02:10:00.000Z',
  });

  expect(() =>
    promoteAudioEngineProbeDraftToPhysicalDevice({
      draft,
      measurements: {
        touchToSoundLatencyMs: 45,
        maxStableVoices: 8,
        pitchBendSmooth: null,
        glissandoTriggeredStrings: 12,
        muteReleaseClean: null,
        preloadStable: true,
        sessionFallbackPreserved: true,
        recordingCaptureSeconds: 10,
      } as never,
    }),
  ).toThrow('physical-device measurements missing: pitchBendSmooth, muteReleaseClean');
});

test('rejects physical promotion when manual measurements have invalid shapes', () => {
  const draft = createAudioEngineProbeDraft({
    candidate: 'expo-audio',
    deviceLabel: 'Pixel 8 / Android 15',
    measuredAt: '2026-06-08T02:10:00.000Z',
  });

  expect(() =>
    promoteAudioEngineProbeDraftToPhysicalDevice({
      draft,
      measurements: {
        touchToSoundLatencyMs: Number.NEGATIVE_INFINITY,
        maxStableVoices: 8.5,
        pitchBendSmooth: 'yes',
        glissandoTriggeredStrings: 13,
        muteReleaseClean: 'yes',
        preloadStable: 'yes',
        sessionFallbackPreserved: 'yes',
        recordingCaptureSeconds: Number.POSITIVE_INFINITY,
      } as never,
    }),
  ).toThrow(
    'physical-device measurements invalid: touchToSoundLatencyMs, maxStableVoices, pitchBendSmooth, glissandoTriggeredStrings, muteReleaseClean, preloadStable, sessionFallbackPreserved, recordingCaptureSeconds',
  );
});

test('rejects physical promotion when manual measurements include fields outside the Day 5 schema', () => {
  const draft = createAudioEngineProbeDraft({
    candidate: 'expo-audio',
    deviceLabel: 'Pixel 8 / Android 15',
    measuredAt: '2026-06-08T02:10:00.000Z',
  });

  expect(() =>
    promoteAudioEngineProbeDraftToPhysicalDevice({
      draft,
      measurements: {
        touchToSoundLatencyMs: 45,
        maxStableVoices: 8,
        pitchBendSmooth: true,
        glissandoTriggeredStrings: 12,
        muteReleaseClean: true,
        preloadStable: true,
        sessionFallbackPreserved: true,
        recordingCaptureSeconds: 10,
        selectedEngine: 'expo-audio',
      } as never,
    }),
  ).toThrow('physical-device measurements invalid: selectedEngine');
});

test('rejects promotion from non-estimate probe evidence', () => {
  const draft = createAudioEngineProbeDraft({
    candidate: 'expo-audio',
    deviceLabel: 'Pixel 8 / Android 15',
    measuredAt: '2026-06-08T02:10:00.000Z',
  });

  expect(() =>
    promoteAudioEngineProbeDraftToPhysicalDevice({
      draft: {
        ...draft,
        evidenceSource: 'unit-test',
      },
      measurements: {
        touchToSoundLatencyMs: 45,
        maxStableVoices: 8,
        pitchBendSmooth: true,
        glissandoTriggeredStrings: 12,
        muteReleaseClean: true,
        preloadStable: true,
        sessionFallbackPreserved: true,
        recordingCaptureSeconds: 10,
      },
    }),
  ).toThrow('only estimate probe drafts can be promoted to physical-device evidence');
});

test('rejects physical promotion when the resolved device label is still a placeholder', () => {
  const draft = createAudioEngineProbeDraft({
    candidate: 'expo-audio',
    deviceLabel: 'replace-with-physical-device-model',
    measuredAt: '2026-06-08T02:10:00.000Z',
  });

  expect(() =>
    promoteAudioEngineProbeDraftToPhysicalDevice({
      draft,
      measurements: {
        touchToSoundLatencyMs: 45,
        maxStableVoices: 8,
        pitchBendSmooth: true,
        glissandoTriggeredStrings: 12,
        muteReleaseClean: true,
        preloadStable: true,
        sessionFallbackPreserved: true,
        recordingCaptureSeconds: 10,
      },
    }),
  ).toThrow('physical-device probe deviceLabel must name the tested physical device');

  expect(() =>
    promoteAudioEngineProbeDraftToPhysicalDevice({
      draft: {
        ...draft,
        deviceLabel: 'Pixel 8 / Android 15',
      },
      deviceLabel: 'Device / OS',
      measurements: {
        touchToSoundLatencyMs: 45,
        maxStableVoices: 8,
        pitchBendSmooth: true,
        glissandoTriggeredStrings: 12,
        muteReleaseClean: true,
        preloadStable: true,
        sessionFallbackPreserved: true,
        recordingCaptureSeconds: 10,
      },
    }),
  ).toThrow('physical-device probe deviceLabel must name the tested physical device');
});

import { expect, test } from 'vitest';
import {
  buildPrototypeProbeDraft,
  countPrototypeAudibleVoices,
  createInitialPrototypeQaSnapshot,
  formatPrototypeProbeDraftForInspector,
  updatePrototypeQaSnapshot,
} from '../prototypeQaSnapshot';

test('tracks observable device QA counters without claiming audible quality', () => {
  const initial = createInitialPrototypeQaSnapshot({
    candidate: 'react-native-audio-api',
    deviceLabel: 'Pixel 8 physical device',
    measuredAt: '2026-06-08T04:00:00.000Z',
  });

  const afterPlaying = updatePrototypeQaSnapshot(initial, {
    activeVoiceCount: 5,
    audioDispatchOk: true,
    measuredAt: '2026-06-08T04:00:05.000Z',
    events: [
      { type: 'glissando_step', tsMs: 100, stringIndex: 1, velocity: 1 },
      { type: 'glissando_step', tsMs: 116, stringIndex: 2, velocity: 1 },
      { type: 'glissando_step', tsMs: 132, stringIndex: 2, velocity: 1 },
      { type: 'string_bend', tsMs: 180, stringIndex: 2, cents: 60 },
      { type: 'string_mute', tsMs: 240, stringIndex: 2, strength: 0.8 },
    ],
  });

  const afterFallback = updatePrototypeQaSnapshot(afterPlaying, {
    activeVoiceCount: 4,
    audioDispatchOk: false,
    measuredAt: '2026-06-08T04:00:10.000Z',
    events: [{ type: 'string_pluck', tsMs: 300, stringIndex: 3, velocity: 1 }],
  });

  expect(afterFallback).toMatchObject({
    eventCount: 6,
    maxStableVoices: 5,
    glissandoTriggeredStrings: [1, 2],
    pitchBendObserved: true,
    muteObserved: true,
    audioDispatchFailures: 1,
    sessionFallbackPreserved: true,
    measuredAt: '2026-06-08T04:00:10.000Z',
  });
  expect(buildPrototypeProbeDraft(afterFallback)).toMatchObject({
    candidate: 'react-native-audio-api',
    evidenceSource: 'estimate',
    maxStableVoices: 5,
    pitchBendSmooth: false,
    glissandoTriggeredStrings: 2,
    muteReleaseClean: false,
    sessionFallbackPreserved: true,
  });
});

test('formats a copyable estimate probe draft for the inspector', () => {
  const snapshot = updatePrototypeQaSnapshot(
    createInitialPrototypeQaSnapshot({
      candidate: 'expo-audio',
      deviceLabel: 'replace-with-physical-device-model',
      measuredAt: '2026-06-08T04:10:00.000Z',
    }),
    {
      activeVoiceCount: 8,
      audioDispatchOk: true,
      measuredAt: '2026-06-08T04:10:03.000Z',
      events: [
        { type: 'glissando_step', tsMs: 100, stringIndex: 1, velocity: 1 },
        { type: 'glissando_step', tsMs: 116, stringIndex: 12, velocity: 1 },
      ],
    },
  );

  expect(JSON.parse(formatPrototypeProbeDraftForInspector(snapshot))).toEqual({
    note: 'Estimate draft from fake prototype engine counters. Replace with physical-device candidate measurements before Day 5 handoff.',
    measuredCandidateEvidence: false,
    runtimeUnderTest: 'fake-sampler-engine',
    observedFakeCounters: {
      audioDispatchFailures: 0,
      eventCount: 2,
      glissandoTriggeredStrings: 2,
      maxActiveVoices: 8,
      muteObserved: false,
      pitchBendObserved: false,
      sessionFallbackPreserved: false,
    },
    probeTemplate: {
      candidate: 'expo-audio',
      evidenceSource: 'estimate',
      deviceLabel: 'replace-with-physical-device-model',
      measuredAt: '2026-06-08T04:10:03.000Z',
      touchToSoundLatencyMs: null,
      maxStableVoices: null,
      pitchBendSmooth: null,
      glissandoTriggeredStrings: null,
      muteReleaseClean: null,
      preloadStable: null,
      sessionFallbackPreserved: null,
      recordingCaptureSeconds: null,
    },
  });
});

test('counts only non-released fake voices as audible prototype voices', () => {
  expect(
    countPrototypeAudibleVoices([
      {
        voiceId: 'voice-1',
        stringIndex: 1,
        startedAtMs: 0,
        pitchBendCents: 0,
        gain: 1,
        envelopeState: 'attack',
      },
      {
        voiceId: 'voice-2',
        stringIndex: 2,
        startedAtMs: 10,
        pitchBendCents: 0,
        gain: 0,
        envelopeState: 'release',
      },
    ]),
  ).toBe(1);
});

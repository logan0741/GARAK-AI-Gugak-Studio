import { expect, test } from 'vitest';
import {
  buildPrototypeProbeDraft,
  countPrototypeAudibleVoices,
  createInitialPrototypeQaSnapshot,
  formatPrototypeProbeDraftForInspector,
  recordPrototypeRecordingCapture,
  recordPrototypeRecordingPlayback,
  updatePrototypeQaDeviceLabel,
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
      eventDispatchLatency: {
        sampleCount: 0,
        latestMs: null,
        maxMs: null,
        averageMs: null,
      },
      eventCount: 2,
      glissandoTriggeredStrings: 2,
      maxActiveVoices: 8,
      muteObserved: false,
      pitchBendObserved: false,
      sessionFallbackPreserved: false,
    },
    observedPrototypeRecording: {
      capturedSeconds: null,
      playbackConfirmed: false,
      uriAvailable: false,
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

test('includes runtime observation in the copyable estimate probe draft', () => {
  const snapshot = createInitialPrototypeQaSnapshot({
    candidate: 'expo-audio',
    deviceLabel: 'Pixel 8 / Android 15',
    measuredAt: '2026-06-08T04:15:00.000Z',
  });

  expect(
    JSON.parse(
      formatPrototypeProbeDraftForInspector(snapshot, {
        activeRuntime: 'fake-prototype',
        nativePreloadStatus: 'failed',
        preloadErrorMessage: 'native audio candidate requires Expo dev build on iOS or Android',
        requestedCandidate: 'expo-audio',
        runtimeStatus: 'native_candidate_failed',
        sampleManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
      }),
    ),
  ).toMatchObject({
    measuredCandidateEvidence: false,
    observedRuntime: {
      activeRuntime: 'fake-prototype',
      nativePreloadStatus: 'failed',
      preloadErrorMessage: 'native audio candidate requires Expo dev build on iOS or Android',
      requestedCandidate: 'expo-audio',
      runtimeStatus: 'native_candidate_failed',
      sampleManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
    },
    probeTemplate: {
      candidate: 'expo-audio',
      evidenceSource: 'estimate',
    },
  });
});

test('tracks event batch dispatch latency as debug-only evidence', () => {
  const snapshot = updatePrototypeQaSnapshot(
    createInitialPrototypeQaSnapshot({
      candidate: 'react-native-audio-api',
      deviceLabel: 'Pixel 8 physical device',
      measuredAt: '2026-06-08T04:20:00.000Z',
    }),
    {
      activeVoiceCount: 1,
      audioDispatchOk: true,
      dispatchedAtMs: 125,
      measuredAt: '2026-06-08T04:20:01.000Z',
      events: [
        { type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 },
        { type: 'string_release', tsMs: 120, stringIndex: 1 },
      ],
    },
  );

  const next = updatePrototypeQaSnapshot(snapshot, {
    activeVoiceCount: 1,
    audioDispatchOk: true,
    dispatchedAtMs: 145,
    measuredAt: '2026-06-08T04:20:02.000Z',
    events: [{ type: 'string_pluck', tsMs: 140, stringIndex: 2, velocity: 1 }],
  });

  expect(next.eventDispatchLatency).toEqual({
    sampleCount: 2,
    latestMs: 5,
    maxMs: 25,
    averageMs: 15,
  });
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(next))).toMatchObject({
    observedFakeCounters: {
      eventDispatchLatency: {
        sampleCount: 2,
        latestMs: 5,
        maxMs: 25,
        averageMs: 15,
      },
    },
    probeTemplate: {
      touchToSoundLatencyMs: null,
    },
  });
});

test('records prototype recording capture and playback observations without claiming final evidence', () => {
  const captured = recordPrototypeRecordingCapture(
    createInitialPrototypeQaSnapshot({
      candidate: 'expo-audio',
      deviceLabel: 'Pixel 8 physical device',
      measuredAt: '2026-06-08T04:30:00.000Z',
    }),
    {
      capturedSeconds: 10.4,
      measuredAt: '2026-06-08T04:30:12.000Z',
      recordingUri: 'file://recording.m4a',
    },
  );
  const played = recordPrototypeRecordingPlayback(captured, {
    measuredAt: '2026-06-08T04:30:15.000Z',
    playbackConfirmed: true,
  });

  expect(played).toMatchObject({
    measuredAt: '2026-06-08T04:30:15.000Z',
    recordingCaptureSeconds: 10.4,
    recordingPlaybackConfirmed: true,
    recordingUriAvailable: true,
  });
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(played))).toMatchObject({
    measuredCandidateEvidence: false,
    observedPrototypeRecording: {
      capturedSeconds: 10.4,
      playbackConfirmed: true,
      uriAvailable: true,
    },
    probeTemplate: {
      evidenceSource: 'estimate',
      recordingCaptureSeconds: null,
    },
  });
});

test('updates the prototype QA device label used by the probe draft', () => {
  const snapshot = updatePrototypeQaDeviceLabel(
    createInitialPrototypeQaSnapshot({
      candidate: 'react-native-audio-api',
      deviceLabel: 'replace-with-physical-device-model',
      measuredAt: '2026-06-08T04:40:00.000Z',
    }),
    {
      deviceLabel: '  Pixel 8 / Android 15  ',
      measuredAt: '2026-06-08T04:40:10.000Z',
    },
  );

  expect(snapshot).toMatchObject({
    deviceLabel: 'Pixel 8 / Android 15',
    measuredAt: '2026-06-08T04:40:10.000Z',
  });
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(snapshot))).toMatchObject({
    probeTemplate: {
      deviceLabel: 'Pixel 8 / Android 15',
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

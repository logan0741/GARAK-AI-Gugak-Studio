import { expect, test } from 'vitest';
import {
  buildPrototypeProbeDraft,
  countPrototypeAudibleVoices,
  createInitialPrototypeQaSnapshot,
  formatPrototypeProbeHandoffTemplateForInspector,
  formatPrototypeProbeDraftForInspector,
  recordPrototypeRecordingCapture,
  recordPrototypeRecordingFallback,
  recordPrototypeRecordingPlayback,
  recordPrototypeRecordingStart,
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

test('ignores non-finite active voice counts when tracking prototype counters', () => {
  const snapshot = updatePrototypeQaSnapshot(
    createInitialPrototypeQaSnapshot({
      candidate: 'react-native-audio-api',
      deviceLabel: 'Pixel 8 physical device',
      measuredAt: '2026-06-08T04:05:00.000Z',
    }),
    {
      activeVoiceCount: 4,
      audioDispatchOk: true,
      measuredAt: '2026-06-08T04:05:01.000Z',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 }],
    },
  );

  const next = updatePrototypeQaSnapshot(snapshot, {
    activeVoiceCount: Number.POSITIVE_INFINITY,
    audioDispatchOk: true,
    measuredAt: '2026-06-08T04:05:02.000Z',
    events: [{ type: 'string_pluck', tsMs: 110, stringIndex: 2, velocity: 1 }],
  });

  expect(next.maxStableVoices).toBe(4);
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(next))).toMatchObject({
    observedFakeCounters: {
      maxActiveVoices: 4,
    },
    probeTemplate: {
      maxStableVoices: null,
    },
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
      fallbackReason: null,
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

test('formats a copyable prototype handoff JSON template with null manual measurements', () => {
  const snapshot = updatePrototypeQaSnapshot(
    createInitialPrototypeQaSnapshot({
      candidate: 'react-native-audio-api',
      deviceLabel: 'Pixel 8 / Android 15',
      measuredAt: '2026-06-08T04:18:00.000Z',
    }),
    {
      activeVoiceCount: 8,
      audioDispatchOk: true,
      measuredAt: '2026-06-08T04:18:05.000Z',
      events: [
        { type: 'glissando_step', tsMs: 100, stringIndex: 1, velocity: 1 },
        { type: 'string_bend', tsMs: 160, stringIndex: 1, cents: 40 },
        { type: 'string_mute', tsMs: 220, stringIndex: 1, strength: 1 },
      ],
    },
  );

  expect(
    JSON.parse(
      formatPrototypeProbeHandoffTemplateForInspector(snapshot, {
        activeRuntime: 'react-native-audio-api',
        nativePreloadStatus: 'ready',
        requestedCandidate: 'react-native-audio-api',
        runtimeStatus: 'native_candidate_ready',
        sampleManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
      }),
    ),
  ).toEqual({
    generatedAt: '2026-06-08T04:18:05.000Z',
    entries: [
      {
        inspectorDraft: {
          note: 'Estimate draft from fake prototype engine counters. Replace with physical-device candidate measurements before Day 5 handoff.',
          measuredCandidateEvidence: false,
          runtimeUnderTest: 'fake-sampler-engine',
          observedRuntime: {
            activeRuntime: 'react-native-audio-api',
            nativePreloadStatus: 'ready',
            requestedCandidate: 'react-native-audio-api',
            runtimeStatus: 'native_candidate_ready',
            sampleManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
          },
          observedFakeCounters: {
            audioDispatchFailures: 0,
            eventDispatchLatency: {
              sampleCount: 0,
              latestMs: null,
              maxMs: null,
              averageMs: null,
            },
            eventCount: 3,
            glissandoTriggeredStrings: 1,
            maxActiveVoices: 8,
            muteObserved: true,
            pitchBendObserved: true,
            sessionFallbackPreserved: false,
          },
          observedPrototypeRecording: {
            capturedSeconds: null,
            fallbackReason: null,
            playbackConfirmed: false,
            uriAvailable: false,
          },
          probeTemplate: {
            candidate: 'react-native-audio-api',
            evidenceSource: 'estimate',
            deviceLabel: 'Pixel 8 / Android 15',
            measuredAt: '2026-06-08T04:18:05.000Z',
            touchToSoundLatencyMs: null,
            maxStableVoices: null,
            pitchBendSmooth: null,
            glissandoTriggeredStrings: null,
            muteReleaseClean: null,
            preloadStable: null,
            sessionFallbackPreserved: null,
            recordingCaptureSeconds: null,
          },
        },
        measuredAt: '2026-06-08T04:18:05.000Z',
        deviceLabel: 'Pixel 8 / Android 15',
        measurements: {
          touchToSoundLatencyMs: null,
          maxStableVoices: null,
          pitchBendSmooth: null,
          glissandoTriggeredStrings: null,
          muteReleaseClean: null,
          preloadStable: null,
          sessionFallbackPreserved: null,
          recordingCaptureSeconds: null,
        },
      },
    ],
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

test('ignores non-finite dispatch timestamps when tracking debug latency', () => {
  const snapshot = updatePrototypeQaSnapshot(
    createInitialPrototypeQaSnapshot({
      candidate: 'react-native-audio-api',
      deviceLabel: 'Pixel 8 physical device',
      measuredAt: '2026-06-08T04:20:30.000Z',
    }),
    {
      activeVoiceCount: 1,
      audioDispatchOk: true,
      dispatchedAtMs: Number.NaN,
      measuredAt: '2026-06-08T04:20:31.000Z',
      events: [{ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 }],
    },
  );

  expect(snapshot.eventDispatchLatency).toEqual({
    sampleCount: 0,
    latestMs: null,
    maxMs: null,
    averageMs: null,
  });
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(snapshot))).toMatchObject({
    observedFakeCounters: {
      eventDispatchLatency: {
        sampleCount: 0,
        latestMs: null,
        maxMs: null,
        averageMs: null,
      },
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

test('clears stale recording playback confirmation when a later capture has no playable uri', () => {
  const firstCapture = recordPrototypeRecordingCapture(
    createInitialPrototypeQaSnapshot({
      candidate: 'expo-audio',
      deviceLabel: 'Pixel 8 physical device',
      measuredAt: '2026-06-08T04:31:00.000Z',
    }),
    {
      capturedSeconds: 10,
      measuredAt: '2026-06-08T04:31:12.000Z',
      recordingUri: 'file://first.m4a',
    },
  );
  const firstPlayback = recordPrototypeRecordingPlayback(firstCapture, {
    measuredAt: '2026-06-08T04:31:15.000Z',
    playbackConfirmed: true,
  });

  const secondCapture = recordPrototypeRecordingCapture(firstPlayback, {
    capturedSeconds: 10,
    measuredAt: '2026-06-08T04:31:30.000Z',
    recordingUri: null,
  });

  expect(secondCapture).toMatchObject({
    measuredAt: '2026-06-08T04:31:30.000Z',
    recordingCaptureSeconds: 10,
    recordingFallbackReason: 'recording_playback_uri_missing',
    recordingPlaybackConfirmed: false,
    recordingUriAvailable: false,
  });
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(secondCapture))).toMatchObject({
    observedPrototypeRecording: {
      capturedSeconds: 10,
      fallbackReason: 'recording_playback_uri_missing',
      playbackConfirmed: false,
      uriAvailable: false,
    },
  });
});

test('does not confirm recording playback without a current playable capture', () => {
  const initial = createInitialPrototypeQaSnapshot({
    candidate: 'expo-audio',
    deviceLabel: 'Pixel 8 physical device',
    measuredAt: '2026-06-08T04:31:45.000Z',
  });

  const noCapturePlayback = recordPrototypeRecordingPlayback(initial, {
    measuredAt: '2026-06-08T04:31:46.000Z',
    playbackConfirmed: true,
  });

  const missingUriCapture = recordPrototypeRecordingCapture(noCapturePlayback, {
    capturedSeconds: 10,
    measuredAt: '2026-06-08T04:31:50.000Z',
    recordingUri: null,
  });

  const missingUriPlayback = recordPrototypeRecordingPlayback(missingUriCapture, {
    measuredAt: '2026-06-08T04:31:55.000Z',
    playbackConfirmed: true,
  });

  expect(noCapturePlayback).toMatchObject({
    recordingCaptureSeconds: null,
    recordingPlaybackConfirmed: false,
    recordingUriAvailable: false,
  });
  expect(missingUriPlayback).toMatchObject({
    recordingCaptureSeconds: 10,
    recordingFallbackReason: 'recording_playback_uri_missing',
    recordingPlaybackConfirmed: false,
    recordingUriAvailable: false,
  });
});

test('clears stale recording observations when a new recording probe starts', () => {
  const firstCapture = recordPrototypeRecordingCapture(
    createInitialPrototypeQaSnapshot({
      candidate: 'expo-audio',
      deviceLabel: 'Pixel 8 physical device',
      measuredAt: '2026-06-08T04:32:00.000Z',
    }),
    {
      capturedSeconds: 10,
      measuredAt: '2026-06-08T04:32:12.000Z',
      recordingUri: 'file://first.m4a',
    },
  );
  const firstPlayback = recordPrototypeRecordingPlayback(firstCapture, {
    measuredAt: '2026-06-08T04:32:15.000Z',
    playbackConfirmed: true,
  });

  const recordingStarted = recordPrototypeRecordingStart(firstPlayback, {
    measuredAt: '2026-06-08T04:32:30.000Z',
  });

  expect(recordingStarted).toMatchObject({
    measuredAt: '2026-06-08T04:32:30.000Z',
    recordingCaptureSeconds: null,
    recordingFallbackReason: null,
    recordingPlaybackConfirmed: false,
    recordingUriAvailable: false,
  });
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(recordingStarted))).toMatchObject({
    observedPrototypeRecording: {
      capturedSeconds: null,
      fallbackReason: null,
      playbackConfirmed: false,
      uriAvailable: false,
    },
  });
});

test('records prototype recording fallback reason without claiming final evidence', () => {
  const snapshot = recordPrototypeRecordingFallback(
    createInitialPrototypeQaSnapshot({
      candidate: 'react-native-audio-api',
      deviceLabel: 'Pixel 8 / Android 15',
      measuredAt: '2026-06-08T04:35:00.000Z',
    }),
    {
      fallbackReason: 'recording_probe_not_supported',
      measuredAt: '2026-06-08T04:35:03.000Z',
    },
  );

  expect(snapshot).toMatchObject({
    measuredAt: '2026-06-08T04:35:03.000Z',
    recordingFallbackReason: 'recording_probe_not_supported',
  });
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(snapshot))).toMatchObject({
    measuredCandidateEvidence: false,
    observedPrototypeRecording: {
      capturedSeconds: null,
      fallbackReason: 'recording_probe_not_supported',
      playbackConfirmed: false,
      uriAvailable: false,
    },
    probeTemplate: {
      evidenceSource: 'estimate',
      recordingCaptureSeconds: null,
    },
  });
});

test('normalizes blank prototype recording fallback reasons before inspector handoff', () => {
  const snapshot = recordPrototypeRecordingFallback(
    createInitialPrototypeQaSnapshot({
      candidate: 'react-native-audio-api',
      deviceLabel: 'Pixel 8 / Android 15',
      measuredAt: '2026-06-08T04:35:30.000Z',
    }),
    {
      fallbackReason: '   ',
      measuredAt: '2026-06-08T04:35:33.000Z',
    },
  );

  expect(snapshot).toMatchObject({
    measuredAt: '2026-06-08T04:35:33.000Z',
    recordingFallbackReason: 'recording_probe_failed',
    recordingPlaybackConfirmed: false,
    recordingUriAvailable: false,
  });
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(snapshot))).toMatchObject({
    observedPrototypeRecording: {
      fallbackReason: 'recording_probe_failed',
      playbackConfirmed: false,
      uriAvailable: false,
    },
  });
});

test('clears stale recording playback confirmation when a later fallback is recorded', () => {
  const firstCapture = recordPrototypeRecordingCapture(
    createInitialPrototypeQaSnapshot({
      candidate: 'expo-audio',
      deviceLabel: 'Pixel 8 physical device',
      measuredAt: '2026-06-08T04:36:00.000Z',
    }),
    {
      capturedSeconds: 10,
      measuredAt: '2026-06-08T04:36:12.000Z',
      recordingUri: 'file://first.m4a',
    },
  );
  const firstPlayback = recordPrototypeRecordingPlayback(firstCapture, {
    measuredAt: '2026-06-08T04:36:15.000Z',
    playbackConfirmed: true,
  });

  const fallback = recordPrototypeRecordingFallback(firstPlayback, {
    fallbackReason: 'recording_permission_denied',
    measuredAt: '2026-06-08T04:36:20.000Z',
  });

  expect(fallback).toMatchObject({
    measuredAt: '2026-06-08T04:36:20.000Z',
    recordingCaptureSeconds: null,
    recordingFallbackReason: 'recording_permission_denied',
    recordingPlaybackConfirmed: false,
    recordingUriAvailable: false,
  });
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(fallback))).toMatchObject({
    observedPrototypeRecording: {
      capturedSeconds: null,
      fallbackReason: 'recording_permission_denied',
      playbackConfirmed: false,
      uriAvailable: false,
    },
  });
});

test('records missing captured recording uri as playback fallback context', () => {
  const snapshot = recordPrototypeRecordingCapture(
    createInitialPrototypeQaSnapshot({
      candidate: 'expo-audio',
      deviceLabel: 'Pixel 8 / Android 15',
      measuredAt: '2026-06-08T04:37:00.000Z',
    }),
    {
      capturedSeconds: 10,
      measuredAt: '2026-06-08T04:37:12.000Z',
      recordingUri: null,
    },
  );

  expect(snapshot).toMatchObject({
    recordingCaptureSeconds: 10,
    recordingFallbackReason: 'recording_playback_uri_missing',
    recordingUriAvailable: false,
  });
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(snapshot))).toMatchObject({
    observedPrototypeRecording: {
      capturedSeconds: 10,
      fallbackReason: 'recording_playback_uri_missing',
      uriAvailable: false,
    },
    probeTemplate: {
      evidenceSource: 'estimate',
      recordingCaptureSeconds: null,
    },
  });
});

test('treats whitespace captured recording uri as missing playback context', () => {
  const snapshot = recordPrototypeRecordingCapture(
    createInitialPrototypeQaSnapshot({
      candidate: 'expo-audio',
      deviceLabel: 'Pixel 8 / Android 15',
      measuredAt: '2026-06-08T04:38:00.000Z',
    }),
    {
      capturedSeconds: 10,
      measuredAt: '2026-06-08T04:38:12.000Z',
      recordingUri: '   ',
    },
  );

  expect(snapshot).toMatchObject({
    recordingCaptureSeconds: 10,
    recordingFallbackReason: 'recording_playback_uri_missing',
    recordingUriAvailable: false,
  });
});

test('normalizes invalid captured recording durations before inspector handoff', () => {
  for (const capturedSeconds of [Number.NaN, Number.NEGATIVE_INFINITY, -1]) {
    const snapshot = recordPrototypeRecordingCapture(
      createInitialPrototypeQaSnapshot({
        candidate: 'expo-audio',
        deviceLabel: 'Pixel 8 / Android 15',
        measuredAt: '2026-06-08T04:39:00.000Z',
      }),
      {
        capturedSeconds,
        measuredAt: '2026-06-08T04:39:12.000Z',
        recordingUri: 'file://recording.m4a',
      },
    );

    expect(snapshot.recordingCaptureSeconds).toBe(0);
    expect(JSON.parse(formatPrototypeProbeDraftForInspector(snapshot))).toMatchObject({
      observedPrototypeRecording: {
        capturedSeconds: 0,
      },
    });
  }
});

test('records zero captured recording duration as fallback context before inspector handoff', () => {
  const captured = recordPrototypeRecordingCapture(
    createInitialPrototypeQaSnapshot({
      candidate: 'expo-audio',
      deviceLabel: 'Pixel 8 / Android 15',
      measuredAt: '2026-06-08T04:39:30.000Z',
    }),
    {
      capturedSeconds: 0,
      measuredAt: '2026-06-08T04:39:42.000Z',
      recordingUri: 'file://empty-recording.m4a',
    },
  );
  const played = recordPrototypeRecordingPlayback(captured, {
    measuredAt: '2026-06-08T04:39:45.000Z',
    playbackConfirmed: true,
  });

  expect(played).toMatchObject({
    recordingCaptureSeconds: 0,
    recordingFallbackReason: 'recording_capture_duration_invalid',
    recordingPlaybackConfirmed: false,
    recordingUriAvailable: true,
  });
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(played))).toMatchObject({
    observedPrototypeRecording: {
      capturedSeconds: 0,
      fallbackReason: 'recording_capture_duration_invalid',
      playbackConfirmed: false,
      uriAvailable: true,
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

test('resets the prototype QA device label to the placeholder when input is cleared', () => {
  const snapshot = updatePrototypeQaDeviceLabel(
    createInitialPrototypeQaSnapshot({
      candidate: 'react-native-audio-api',
      deviceLabel: 'Pixel 8 / Android 15',
      measuredAt: '2026-06-08T04:41:00.000Z',
    }),
    {
      deviceLabel: '   ',
      measuredAt: '2026-06-08T04:41:10.000Z',
    },
  );

  expect(snapshot).toMatchObject({
    deviceLabel: 'replace-with-physical-device-model',
    measuredAt: '2026-06-08T04:41:10.000Z',
  });
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(snapshot))).toMatchObject({
    probeTemplate: {
      deviceLabel: 'replace-with-physical-device-model',
    },
  });
});

test('keeps placeholder-like prototype QA device labels out of probe drafts', () => {
  const snapshot = updatePrototypeQaDeviceLabel(
    createInitialPrototypeQaSnapshot({
      candidate: 'react-native-audio-api',
      deviceLabel: 'Pixel 8 / Android 15',
      measuredAt: '2026-06-08T04:42:00.000Z',
    }),
    {
      deviceLabel: 'Device / OS',
      measuredAt: '2026-06-08T04:42:10.000Z',
    },
  );

  expect(snapshot).toMatchObject({
    deviceLabel: 'replace-with-physical-device-model',
    measuredAt: '2026-06-08T04:42:10.000Z',
  });
  expect(JSON.parse(formatPrototypeProbeDraftForInspector(snapshot))).toMatchObject({
    probeTemplate: {
      deviceLabel: 'replace-with-physical-device-model',
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

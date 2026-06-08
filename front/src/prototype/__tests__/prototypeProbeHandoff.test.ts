import { expect, test } from 'vitest';
import { buildPhysicalDeviceProbeFromPrototypeInspectorDraft } from '../prototypeProbeHandoff';
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

test('builds a physical-device probe only when the requested native runtime is ready', () => {
  expect(
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft: createInspectorDraft(),
      measuredAt: '2026-06-08T03:00:00.000Z',
      measurements,
    }),
  ).toEqual({
    candidate: 'react-native-audio-api',
    evidenceSource: 'physical-device',
    deviceLabel: 'Pixel 8 / Android 15',
    measuredAt: '2026-06-08T03:00:00.000Z',
    ...measurements,
  });
});

test('rejects physical-device promotion when observed runtime is still fake fallback', () => {
  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft: createInspectorDraft({
        observedRuntime: {
          activeRuntime: 'fake-prototype',
          nativePreloadStatus: 'preloading',
          requestedCandidate: 'react-native-audio-api',
          runtimeStatus: 'native_candidate_preloading',
          sampleManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
        },
      }),
      measurements,
    }),
  ).toThrow('prototype runtime must be ready for react-native-audio-api before physical-device promotion');
});

test('rejects physical-device promotion when observed runtime preload failed', () => {
  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft: createInspectorDraft({
        observedRuntime: {
          activeRuntime: 'fake-prototype',
          nativePreloadStatus: 'failed',
          preloadErrorMessage: 'decode failed',
          requestedCandidate: 'react-native-audio-api',
          runtimeStatus: 'native_candidate_failed',
          sampleManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
        },
      }),
      measurements,
    }),
  ).toThrow('prototype runtime must be ready for react-native-audio-api before physical-device promotion');
});

test('rejects physical-device promotion when active runtime does not match the probe candidate', () => {
  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft: createInspectorDraft({
        observedRuntime: {
          activeRuntime: 'expo-audio',
          nativePreloadStatus: 'ready',
          requestedCandidate: 'react-native-audio-api',
          runtimeStatus: 'native_candidate_ready',
          sampleManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
        },
      }),
      measurements,
    }),
  ).toThrow('prototype runtime must be ready for react-native-audio-api before physical-device promotion');
});

test('rejects physical-device promotion when runtime status is not ready even if active runtime matches', () => {
  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft: createInspectorDraft({
        observedRuntime: {
          activeRuntime: 'react-native-audio-api',
          nativePreloadStatus: 'preloading',
          requestedCandidate: 'react-native-audio-api',
          runtimeStatus: 'native_candidate_preloading',
          sampleManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
        },
      }),
      measurements,
    }),
  ).toThrow('prototype runtime must be ready for react-native-audio-api before physical-device promotion');
});

test('rejects physical-device promotion without runtime observation context', () => {
  const { observedRuntime: _observedRuntime, ...inspectorDraft } = createInspectorDraft();

  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft,
      measurements,
    }),
  ).toThrow('prototype runtime observation is required before physical-device promotion');
});

function createInspectorDraft(
  override: Partial<PrototypeProbeDraftInspectorModel> = {},
): PrototypeProbeDraftInspectorModel {
  return {
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
      candidate: 'react-native-audio-api',
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
    ...override,
  };
}

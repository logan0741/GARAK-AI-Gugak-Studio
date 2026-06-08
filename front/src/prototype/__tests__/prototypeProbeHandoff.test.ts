import { expect, test } from 'vitest';
import { parseAudioEngineProbeRecord } from '../../audio/audioEngineProbeRecord';
import {
  buildPhysicalDeviceProbeFromPrototypeInspectorDraft,
  buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts,
} from '../prototypeProbeHandoff';
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

test('wraps promoted prototype inspector drafts in a parseable Day 5 probe record', () => {
  const record = buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts({
    generatedAt: '2026-06-08T03:10:00.000Z',
    entries: [
      {
        inspectorDraft: {
          ...createInspectorDraftForCandidate('expo-audio'),
          observedPrototypeRecording: {
            capturedSeconds: 10,
            fallbackReason: null,
            playbackConfirmed: true,
            uriAvailable: true,
          },
        },
        measuredAt: '2026-06-08T03:00:00.000Z',
        measurements: {
          ...measurements,
          recordingCaptureSeconds: 10,
          touchToSoundLatencyMs: 45,
        },
      },
      {
        inspectorDraft: createInspectorDraftForCandidate('react-native-audio-api'),
        measuredAt: '2026-06-08T03:05:00.000Z',
        measurements,
      },
    ],
  });

  expect(record).toEqual({
    generatedAt: '2026-06-08T03:10:00.000Z',
    probes: [
      expect.objectContaining({
        candidate: 'expo-audio',
        evidenceSource: 'physical-device',
        maxStableVoices: 9,
        measuredAt: '2026-06-08T03:00:00.000Z',
        recordingCaptureSeconds: 10,
        touchToSoundLatencyMs: 45,
      }),
      expect.objectContaining({
        candidate: 'react-native-audio-api',
        evidenceSource: 'physical-device',
        maxStableVoices: 9,
        measuredAt: '2026-06-08T03:05:00.000Z',
        recordingCaptureSeconds: 0,
        touchToSoundLatencyMs: 38,
      }),
    ],
  });
  expect(parseAudioEngineProbeRecord(record)).toEqual({ ok: true, record });
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

test('rejects physical-device promotion when observed runtime used an unexpected sample manifest', () => {
  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft: createInspectorDraft({
        observedRuntime: {
          activeRuntime: 'react-native-audio-api',
          nativePreloadStatus: 'ready',
          requestedCandidate: 'react-native-audio-api',
          runtimeStatus: 'native_candidate_ready',
          sampleManifestVersion: 'release-gayageum-samples-v1',
        },
      }),
      measurements,
    }),
  ).toThrow(
    'prototype runtime must use sample manifest dev-synthetic-gayageum-2026-06-08 before physical-device promotion',
  );
});

test('rejects physical-device promotion when observed runtime reports unexpected sample string indexes', () => {
  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft: createInspectorDraft({
        observedRuntime: {
          activeRuntime: 'react-native-audio-api',
          nativePreloadStatus: 'ready',
          requestedCandidate: 'react-native-audio-api',
          runtimeStatus: 'native_candidate_ready',
          sampleManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
          unexpectedStringIndexes: [13],
        },
      }),
      measurements,
    }),
  ).toThrow(
    'prototype runtime must not report unexpected sample string indexes before physical-device promotion',
  );
});

test('rejects physical-device promotion when unexpected sample string index field is present', () => {
  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft: createInspectorDraft({
        observedRuntime: {
          activeRuntime: 'react-native-audio-api',
          nativePreloadStatus: 'ready',
          requestedCandidate: 'react-native-audio-api',
          runtimeStatus: 'native_candidate_ready',
          sampleManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
          unexpectedStringIndexes: [],
        },
      }),
      measurements,
    }),
  ).toThrow(
    'prototype runtime must not report unexpected sample string indexes before physical-device promotion',
  );
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

test('rejects ten-second recording promotion without inspector playback confirmation', () => {
  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
      measurements: {
        ...measurements,
        recordingCaptureSeconds: 10,
      },
    }),
  ).toThrow(
    'prototype recordingCaptureSeconds must be backed by captured recording playback before physical-device promotion',
  );
});

test('rejects recording promotion when measurements exceed inspector captured seconds', () => {
  const inspectorDraft = createInspectorDraftForCandidate('expo-audio');

  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
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
    }),
  ).toThrow(
    'prototype recordingCaptureSeconds must be backed by captured recording playback before physical-device promotion',
  );
});

test('rejects under-ten recording promotion without inspector playback confirmation', () => {
  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft: createInspectorDraftForCandidate('expo-audio'),
      measurements: {
        ...measurements,
        recordingCaptureSeconds: 4,
      },
    }),
  ).toThrow(
    'prototype recordingCaptureSeconds must be backed by captured recording playback before physical-device promotion',
  );
});

test.each([
  [
    'measured candidate evidence',
    { measuredCandidateEvidence: true },
    'prototype inspector draft measuredCandidateEvidence must be false before physical-device promotion',
  ],
  [
    'runtime under test',
    { runtimeUnderTest: 'candidate-sampler-engine' },
    'prototype inspector draft runtimeUnderTest must be fake-sampler-engine before physical-device promotion',
  ],
  [
    'probe template evidence source',
    {
      probeTemplate: {
        ...createInspectorDraft().probeTemplate,
        evidenceSource: 'physical-device',
      },
    },
    'prototype inspector draft probeTemplate.evidenceSource must be estimate before physical-device promotion',
  ],
] as const)(
  'rejects physical-device promotion when inspector draft has contaminated %s',
  (_label, override, expectedMessage) => {
    expect(() =>
      buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
        inspectorDraft: {
          ...createInspectorDraft(),
          ...override,
        } as unknown as PrototypeProbeDraftInspectorModel,
        measurements,
      }),
    ).toThrow(expectedMessage);
  },
);

test('rejects physical-device promotion when inspector draft device label is still a placeholder', () => {
  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft: createInspectorDraft({
        probeTemplate: {
          ...createInspectorDraft().probeTemplate,
          deviceLabel: 'replace-with-physical-device-model',
        },
      }),
      measurements,
    }),
  ).toThrow('prototype inspector draft deviceLabel must name the physical device before physical-device promotion');
});

test('rejects physical-device promotion when handoff device label is still a placeholder', () => {
  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft: createInspectorDraft(),
      deviceLabel: 'replace-with-physical-device-model',
      measurements,
    }),
  ).toThrow('prototype handoff deviceLabel must name the physical device before physical-device promotion');
});

test('rejects physical-device promotion when handoff device label does not match inspector draft', () => {
  expect(() =>
    buildPhysicalDeviceProbeFromPrototypeInspectorDraft({
      inspectorDraft: createInspectorDraft(),
      deviceLabel: 'Galaxy S24 / Android 15',
      measurements,
    }),
  ).toThrow('prototype handoff deviceLabel must match inspector draft device label Pixel 8 / Android 15');
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

function createInspectorDraftForCandidate(
  candidate: 'expo-audio' | 'react-native-audio-api',
): PrototypeProbeDraftInspectorModel {
  return createInspectorDraft({
    observedRuntime: {
      activeRuntime: candidate,
      nativePreloadStatus: 'ready',
      requestedCandidate: candidate,
      runtimeStatus: 'native_candidate_ready',
      sampleManifestVersion: 'dev-synthetic-gayageum-2026-06-08',
    },
    probeTemplate: {
      candidate,
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
  });
}

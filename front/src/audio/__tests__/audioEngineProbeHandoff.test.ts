import { expect, test } from 'vitest';
import { formatDay5AudioEngineProbeHandoff } from '../audioEngineProbeHandoff';

test('formats parse errors without generating a decision summary', () => {
  expect(
    formatDay5AudioEngineProbeHandoff({
      generatedAt: '',
      probes: [
        {
          candidate: 'unknown-engine',
          evidenceSource: 'physical-device',
        },
      ],
    }),
  ).toBe(
    [
      '# Day 5 Audio Engine Probe Handoff',
      '',
      '- Status: INVALID_PROBE_RECORD',
      '- Decision summary: not generated',
      '',
      '## Errors',
      '',
      '- generatedAt must be a non-empty string',
      '- probes[0].candidate must be expo-audio or react-native-audio-api',
      '- probes[0].deviceLabel must be a non-empty string',
      '- probes[0].measuredAt must be a non-empty string',
      '- probes[0].touchToSoundLatencyMs must be a finite number >= 0',
      '- probes[0].recordingCaptureSeconds must be a finite number >= 0',
      '- probes[0].maxStableVoices must be an integer >= 0',
      '- probes[0].glissandoTriggeredStrings must be an integer >= 0',
      '- probes[0].pitchBendSmooth must be a boolean',
      '- probes[0].muteReleaseClean must be a boolean',
      '- probes[0].preloadStable must be a boolean',
      '- probes[0].sessionFallbackPreserved must be a boolean',
    ].join('\n'),
  );
});

test('formats a valid physical-device handoff as a Day 5 decision summary', () => {
  expect(
    formatDay5AudioEngineProbeHandoff({
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
    }),
  ).toBe(
    [
      '# Day 5 Audio Engine Decision Summary',
      '',
      '- Generated at: 2026-06-08T01:00:00.000Z',
      '- Status: FINAL_ENGINE_SELECTED',
      '- Selected engine: react-native-audio-api',
      '- Decision: PASS',
      '- Reason: react-native-audio-api has the strongest Day 5 result',
      '- Missing candidates: none',
      '- Duplicate candidates: none',
      '',
      '| Candidate | Decision | Passed core criteria | Failed criteria |',
      '| --- | --- | --- | --- |',
      '| expo-audio | PASS_WITH_LIMITS | 5/5 | recording |',
      '| react-native-audio-api | PASS | 5/5 | none |',
    ].join('\n'),
  );
});

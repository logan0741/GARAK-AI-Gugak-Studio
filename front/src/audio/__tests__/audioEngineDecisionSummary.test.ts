import { expect, test } from 'vitest';
import { formatDay5AudioEngineDecisionSummary } from '../audioEngineDecisionSummary';
import { buildDay5AudioEngineDecisionRecord } from '../audioEngineDecisionRecord';
import { AudioEngineProbe } from '../audioEngineEvaluation';

const passingAudioApiProbe: AudioEngineProbe = {
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
};

const limitedExpoProbe: AudioEngineProbe = {
  ...passingAudioApiProbe,
  candidate: 'expo-audio',
  measuredAt: '2026-06-08T00:00:00.000Z',
  recordingCaptureSeconds: 4,
};

test('formats a selected Day 5 decision record for QA handoff', () => {
  const record = buildDay5AudioEngineDecisionRecord({
    generatedAt: '2026-06-08T01:00:00.000Z',
    probes: [limitedExpoProbe, passingAudioApiProbe],
  });

  expect(formatDay5AudioEngineDecisionSummary(record)).toBe(
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

test('formats incomplete evidence without implying an engine has been selected', () => {
  const record = buildDay5AudioEngineDecisionRecord({
    generatedAt: '2026-06-08T01:00:00.000Z',
    probes: [passingAudioApiProbe],
  });

  expect(formatDay5AudioEngineDecisionSummary(record)).toContain('- Selected engine: none');
  expect(formatDay5AudioEngineDecisionSummary(record)).toContain('- Missing candidates: expo-audio');
});

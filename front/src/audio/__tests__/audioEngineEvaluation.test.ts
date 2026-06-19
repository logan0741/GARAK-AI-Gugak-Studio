import { expect, test } from 'vitest';
import { evaluateAudioEngineProbe, selectAudioEngineCandidate } from '../audioEngineEvaluation';

const passingProbe = {
  candidate: 'react-native-audio-api' as const,
  deviceLabel: 'Pixel physical device',
  measuredAt: '2026-06-08T00:00:00.000Z',
  touchToSoundLatencyMs: 42,
  maxStableVoices: 8,
  pitchBendSmooth: true,
  glissandoTriggeredStrings: 12,
  muteReleaseClean: true,
  preloadStable: true,
  sessionFallbackPreserved: true,
  recordingCaptureSeconds: 10,
};

test('passes a candidate only when all Day 5 hard criteria pass', () => {
  expect(evaluateAudioEngineProbe(passingProbe)).toEqual({
    candidate: 'react-native-audio-api',
    decision: 'PASS',
    failedCriteria: [],
    passedCoreCriteria: 5,
  });
});

test('keeps the core loop moving with limits when only recording is unstable', () => {
  const result = evaluateAudioEngineProbe({
    ...passingProbe,
    candidate: 'expo-audio',
    recordingCaptureSeconds: 4,
  });

  expect(result.decision).toBe('PASS_WITH_LIMITS');
  expect(result.failedCriteria).toEqual(['recording']);
});

test('fails a candidate when a core audio gesture criterion misses the gate', () => {
  const result = evaluateAudioEngineProbe({
    ...passingProbe,
    touchToSoundLatencyMs: 72,
    pitchBendSmooth: false,
  });

  expect(result.decision).toBe('FAIL');
  expect(result.failedCriteria).toEqual(['latency', 'pitch_bend']);
});

test('fails a candidate when samples are not preloaded for normal play', () => {
  const result = evaluateAudioEngineProbe({
    ...passingProbe,
    preloadStable: false,
  });

  expect(result.decision).toBe('FAIL');
  expect(result.failedCriteria).toEqual(['preload']);
});

test('marks a candidate no-go when fewer than two core criteria pass', () => {
  const result = evaluateAudioEngineProbe({
    ...passingProbe,
    touchToSoundLatencyMs: 90,
    maxStableVoices: 2,
    pitchBendSmooth: false,
    glissandoTriggeredStrings: 1,
    muteReleaseClean: true,
  });

  expect(result.decision).toBe('NO_GO');
  expect(result.passedCoreCriteria).toBe(1);
});

test('selects the strongest candidate by Day 5 decision rank', () => {
  const expoResult = evaluateAudioEngineProbe({
    ...passingProbe,
    candidate: 'expo-audio',
    recordingCaptureSeconds: 3,
  });
  const audioApiResult = evaluateAudioEngineProbe(passingProbe);

  expect(selectAudioEngineCandidate([expoResult, audioApiResult])).toEqual({
    selectedCandidate: 'react-native-audio-api',
    decision: 'PASS',
    reason: 'react-native-audio-api has the strongest Day 5 result',
  });
});

test('uses react-native-audio-api as the tie breaker when candidates have the same decision', () => {
  const expoResult = evaluateAudioEngineProbe({
    ...passingProbe,
    candidate: 'expo-audio',
  });
  const audioApiResult = evaluateAudioEngineProbe(passingProbe);

  expect(selectAudioEngineCandidate([expoResult, audioApiResult])).toEqual({
    selectedCandidate: 'react-native-audio-api',
    decision: 'PASS',
    reason: 'react-native-audio-api has the strongest Day 5 result',
  });
});

test('does not select a final engine when the strongest result still fails', () => {
  const expoResult = evaluateAudioEngineProbe({
    ...passingProbe,
    candidate: 'expo-audio',
    maxStableVoices: 4,
  });
  const audioApiResult = evaluateAudioEngineProbe({
    ...passingProbe,
    pitchBendSmooth: false,
  });

  expect(selectAudioEngineCandidate([expoResult, audioApiResult])).toEqual({
    decision: 'FAIL',
    reason: 'no candidate passed the Day 5 engine gate',
  });
});

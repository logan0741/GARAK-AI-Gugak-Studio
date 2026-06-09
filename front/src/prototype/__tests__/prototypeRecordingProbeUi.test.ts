import { expect, test } from 'vitest';
import {
  canStartRecordingProbe,
  canStopRecordingProbe,
  formatRecordingProbeState,
  getRecordingProbeFallbackReason,
  selectPlayableRecordingUri,
} from '../prototypeRecordingProbeUi';

test('formats recording playback state for the prototype inspector', () => {
  expect(formatRecordingProbeState({ status: 'playing', recordingUri: 'file://probe.m4a' })).toBe(
    'playing file://probe.m4a',
  );
});

test('enables recording controls only for the valid current probe state', () => {
  expect(canStartRecordingProbe({ recordingProbeState: { status: 'idle' } })).toBe(true);
  expect(canStartRecordingProbe({
    recordingProbeState: { status: 'recording', requestedDurationSeconds: 10 },
  })).toBe(false);

  expect(canStopRecordingProbe({
    recordingProbeState: { status: 'recording', requestedDurationSeconds: 10 },
  })).toBe(true);
  expect(canStopRecordingProbe({ recordingProbeState: { status: 'idle' } })).toBe(false);
  expect(canStopRecordingProbe({
    recordingProbeState: {
      status: 'captured',
      capturedSeconds: 10,
      recordingUri: 'file://captured.m4a',
    },
  })).toBe(false);
});

test('selects a captured recording uri that the prototype can play back', () => {
  expect(
    selectPlayableRecordingUri({
      recordingProbeState: {
        status: 'captured',
        capturedSeconds: 10,
        recordingUri: 'file://captured.m4a',
      },
    }),
  ).toBe('file://captured.m4a');
  expect(selectPlayableRecordingUri({ recordingProbeState: { status: 'idle' } })).toBeNull();
});

test('does not fall back to a session recording uri when the current capture has no uri', () => {
  expect(
    selectPlayableRecordingUri({
      recordingProbeState: { status: 'captured', capturedSeconds: 10, recordingUri: null },
    }),
  ).toBeNull();
});

test('does not expose a playable uri while the recording probe is idle', () => {
  expect(selectPlayableRecordingUri({ recordingProbeState: { status: 'idle' } })).toBeNull();
});

test('ignores whitespace-only recording uris when selecting captured playback', () => {
  expect(
    selectPlayableRecordingUri({
      recordingProbeState: {
        status: 'captured',
        capturedSeconds: 10,
        recordingUri: '   ',
      },
    }),
  ).toBeNull();
  expect(
    selectPlayableRecordingUri({
      recordingProbeState: {
        status: 'captured',
        capturedSeconds: 10,
        recordingUri: 'file://captured.m4a',
      },
    }),
  ).toBe('file://captured.m4a');
});

test('does not expose a playable uri when captured duration is zero', () => {
  expect(
    selectPlayableRecordingUri({
      recordingProbeState: {
        status: 'captured',
        capturedSeconds: 0,
        recordingUri: 'file://empty-recording.m4a',
      },
    }),
  ).toBeNull();
});

test('extracts recording fallback reason for handoff observations', () => {
  expect(
    getRecordingProbeFallbackReason({
      status: 'unsupported',
      reason: 'recording_probe_not_supported',
    }),
  ).toBe('recording_probe_not_supported');
  expect(
    getRecordingProbeFallbackReason({
      status: 'failed',
      errorMessage: 'recording_permission_denied',
    }),
  ).toBe('recording_permission_denied');
  expect(
    getRecordingProbeFallbackReason({
      status: 'captured',
      capturedSeconds: 10,
      recordingUri: 'file://probe.m4a',
    }),
  ).toBeNull();
});

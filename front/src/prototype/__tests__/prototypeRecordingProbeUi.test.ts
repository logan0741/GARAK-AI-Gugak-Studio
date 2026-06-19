import { expect, test } from 'vitest';
import { formatRecordingProbeState, selectPlayableRecordingUri } from '../prototypeRecordingProbeUi';

test('formats recording playback state for the prototype inspector', () => {
  expect(formatRecordingProbeState({ status: 'playing', recordingUri: 'file://probe.m4a' })).toBe(
    'playing file://probe.m4a',
  );
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
  expect(
    selectPlayableRecordingUri({
      recordingProbeState: { status: 'captured', capturedSeconds: 10, recordingUri: null },
      sessionRecordingUri: 'file://session.m4a',
    }),
  ).toBe('file://session.m4a');
  expect(selectPlayableRecordingUri({ recordingProbeState: { status: 'idle' } })).toBeNull();
});

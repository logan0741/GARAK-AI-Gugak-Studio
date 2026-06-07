import { expect, test } from 'vitest';
import {
  startPrototypeRecordingProbe,
  stopPrototypeRecordingProbe,
} from '../prototypeRecordingProbeController';

test('reports unsupported recording when the active engine has no recording probe methods', async () => {
  const engine = { handleEvent: () => undefined };

  await expect(startPrototypeRecordingProbe(engine, 10)).resolves.toEqual({
    status: 'unsupported',
    reason: 'recording_probe_not_supported',
  });
  await expect(stopPrototypeRecordingProbe(engine)).resolves.toEqual({
    status: 'unsupported',
    reason: 'recording_probe_not_supported',
  });
});

test('starts a supported recording probe for the requested duration', async () => {
  const engine = {
    handleEvent: () => undefined,
    startRecordingProbe: async (durationSeconds: number) => ({
      ok: true as const,
      requestedDurationSeconds: durationSeconds,
    }),
    stopRecordingProbe: async () => ({
      ok: true as const,
      capturedSeconds: 10,
      recordingUri: 'file://recording.m4a',
    }),
  };

  await expect(startPrototypeRecordingProbe(engine, 10)).resolves.toEqual({
    status: 'recording',
    requestedDurationSeconds: 10,
  });
});

test('surfaces recording start failures without throwing away the session fallback', async () => {
  const engine = {
    handleEvent: () => undefined,
    startRecordingProbe: async () => ({
      ok: false as const,
      reason: 'recording_permission_denied',
    }),
    stopRecordingProbe: async () => ({
      ok: true as const,
      capturedSeconds: 0,
      recordingUri: null,
    }),
  };

  await expect(startPrototypeRecordingProbe(engine, 10)).resolves.toEqual({
    status: 'failed',
    errorMessage: 'recording_permission_denied',
  });
});

test('returns captured recording metadata from a supported engine', async () => {
  const engine = {
    handleEvent: () => undefined,
    startRecordingProbe: async () => ({
      ok: true as const,
      requestedDurationSeconds: 10,
    }),
    stopRecordingProbe: async () => ({
      ok: true as const,
      capturedSeconds: 10.2,
      recordingUri: 'file://probe.m4a',
    }),
  };

  await expect(stopPrototypeRecordingProbe(engine)).resolves.toEqual({
    status: 'captured',
    capturedSeconds: 10.2,
    recordingUri: 'file://probe.m4a',
  });
});

test('turns thrown recording probe errors into failed probe state', async () => {
  const engine = {
    handleEvent: () => undefined,
    startRecordingProbe: async () => {
      throw new Error('native recorder crashed');
    },
    stopRecordingProbe: async () => {
      throw new Error('no active recording');
    },
  };

  await expect(startPrototypeRecordingProbe(engine, 10)).resolves.toEqual({
    status: 'failed',
    errorMessage: 'native recorder crashed',
  });
  await expect(stopPrototypeRecordingProbe(engine)).resolves.toEqual({
    status: 'failed',
    errorMessage: 'no active recording',
  });
});

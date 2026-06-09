import { expect, test } from 'vitest';
import {
  playCapturedPrototypeRecordingProbe,
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
  await expect(playCapturedPrototypeRecordingProbe(engine, 'file://recording.m4a')).resolves.toEqual({
    status: 'unsupported',
    reason: 'recording_playback_probe_not_supported',
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

test('rejects invalid recording duration before calling the active engine', async () => {
  const requestedDurations: number[] = [];
  const engine = {
    handleEvent: () => undefined,
    startRecordingProbe: async (durationSeconds: number) => {
      requestedDurations.push(durationSeconds);
      return {
        ok: true as const,
        requestedDurationSeconds: durationSeconds,
      };
    },
    stopRecordingProbe: async () => ({
      ok: true as const,
      capturedSeconds: 10,
      recordingUri: 'file://recording.m4a',
    }),
  };

  for (const durationSeconds of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    await expect(startPrototypeRecordingProbe(engine, durationSeconds)).resolves.toEqual({
      status: 'failed',
      errorMessage: 'recording_duration_invalid',
    });
  }
  expect(requestedDurations).toEqual([]);
});

test('rejects invalid native recording start durations before entering recording state', async () => {
  for (const requestedDurationSeconds of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const engine = {
      handleEvent: () => undefined,
      startRecordingProbe: async () => ({
        ok: true as const,
        requestedDurationSeconds,
      }),
      stopRecordingProbe: async () => ({
        ok: true as const,
        capturedSeconds: 10,
        recordingUri: 'file://recording.m4a',
      }),
    };

    await expect(startPrototypeRecordingProbe(engine, 10)).resolves.toEqual({
      status: 'failed',
      errorMessage: 'recording_duration_invalid',
    });
  }
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

test('normalizes whitespace captured recording uri to null at the prototype stop boundary', async () => {
  const engine = {
    handleEvent: () => undefined,
    startRecordingProbe: async () => ({
      ok: true as const,
      requestedDurationSeconds: 10,
    }),
    stopRecordingProbe: async () => ({
      ok: true as const,
      capturedSeconds: 10,
      recordingUri: '   ',
    }),
  };

  await expect(stopPrototypeRecordingProbe(engine)).resolves.toEqual({
    status: 'captured',
    capturedSeconds: 10,
    recordingUri: null,
  });
});

test('normalizes invalid captured recording durations to zero at the prototype stop boundary', async () => {
  for (const capturedSeconds of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const engine = {
      handleEvent: () => undefined,
      startRecordingProbe: async () => ({
        ok: true as const,
        requestedDurationSeconds: 10,
      }),
      stopRecordingProbe: async () => ({
        ok: true as const,
        capturedSeconds,
        recordingUri: 'file://probe.m4a',
      }),
    };

    await expect(stopPrototypeRecordingProbe(engine)).resolves.toEqual({
      status: 'captured',
      capturedSeconds: 0,
      recordingUri: 'file://probe.m4a',
    });
  }
});

test('trims captured recording uri at the prototype stop boundary', async () => {
  const engine = {
    handleEvent: () => undefined,
    startRecordingProbe: async () => ({
      ok: true as const,
      requestedDurationSeconds: 10,
    }),
    stopRecordingProbe: async () => ({
      ok: true as const,
      capturedSeconds: 10,
      recordingUri: '  file://probe.m4a  ',
    }),
  };

  await expect(stopPrototypeRecordingProbe(engine)).resolves.toEqual({
    status: 'captured',
    capturedSeconds: 10,
    recordingUri: 'file://probe.m4a',
  });
});

test('plays a captured recording probe through a supported engine', async () => {
  const playbackUris: string[] = [];
  const engine = {
    handleEvent: () => undefined,
    playRecordingProbe: async (recordingUri: string) => {
      playbackUris.push(recordingUri);
      return {
        ok: true as const,
        recordingUri,
      };
    },
  };

  await expect(playCapturedPrototypeRecordingProbe(engine, 'file://probe.m4a')).resolves.toEqual({
    status: 'playing',
    recordingUri: 'file://probe.m4a',
  });
  expect(playbackUris).toEqual(['file://probe.m4a']);
});

test('trims captured recording uri before playback probe', async () => {
  const playbackUris: string[] = [];
  const engine = {
    handleEvent: () => undefined,
    playRecordingProbe: async (recordingUri: string) => {
      playbackUris.push(recordingUri);
      return {
        ok: true as const,
        recordingUri,
      };
    },
  };

  await expect(playCapturedPrototypeRecordingProbe(engine, '  file://probe.m4a  ')).resolves.toEqual({
    status: 'playing',
    recordingUri: 'file://probe.m4a',
  });
  expect(playbackUris).toEqual(['file://probe.m4a']);
});

test('does not pass whitespace recording uri into captured playback engine', async () => {
  const playbackUris: string[] = [];
  const engine = {
    handleEvent: () => undefined,
    playRecordingProbe: async (recordingUri: string) => {
      playbackUris.push(recordingUri);
      return {
        ok: true as const,
        recordingUri,
      };
    },
  };

  await expect(playCapturedPrototypeRecordingProbe(engine, '   ')).resolves.toEqual({
    status: 'failed',
    errorMessage: 'recording_playback_uri_missing',
  });
  expect(playbackUris).toEqual([]);
});

test('turns recording playback probe failures into failed probe state', async () => {
  const engine = {
    handleEvent: () => undefined,
    playRecordingProbe: async () => ({
      ok: false as const,
      reason: 'recording_playback_failed',
    }),
  };

  await expect(playCapturedPrototypeRecordingProbe(engine, 'file://probe.m4a')).resolves.toEqual({
    status: 'failed',
    errorMessage: 'recording_playback_failed',
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

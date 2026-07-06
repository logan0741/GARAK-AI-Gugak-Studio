import { expect, test } from 'vitest';
import { parseAudioEngineProbeRecord } from '../audioEngineProbeRecord';
import { runD2ExpoAudioProbeRecordCommand } from '../d2ExpoAudioProbeRecordCommand';

test('returns usage when required D-2 expo-audio probe arguments are missing', () => {
  const output = createProbeRecordHarness();

  expect(output.run([])).toBe(1);

  expect(output.stderr).toEqual([
    'Usage: npm run qa:d2-expo-audio-probe-record -- --output <probe-record.json> --device-label <device/OS> --measured-at <ISO> --touch-latency-ms <number> --max-stable-voices <integer> --pitch-bend-smooth <true|false> --glissando-triggered-strings <0-12> --mute-release-clean <true|false> --preload-stable <true|false> --session-fallback-preserved <true|false> --recording-capture-seconds <number> --measurement-notes <text> [--first-touch-latency-ms <number>] [--steady-touch-latency-ms <number>]',
  ]);
  expect([...output.textFiles]).toEqual([]);
});

test('writes a parser-valid D-2 scoped expo-audio physical probe record from explicit measurements', () => {
  const output = createProbeRecordHarness();

  expect(
    output.run([
      '--output',
      'docs/qa/day-5-audio-engine-probes.real-device.json',
      '--device-label',
      'SM-S928N / Android 15',
      '--measured-at',
      '2026-07-06T02:00:00.000Z',
      '--touch-latency-ms',
      '38',
      '--first-touch-latency-ms',
      '64',
      '--steady-touch-latency-ms',
      '32',
      '--max-stable-voices',
      '9',
      '--pitch-bend-smooth',
      'true',
      '--glissando-triggered-strings',
      '12',
      '--mute-release-clean',
      'true',
      '--preload-stable',
      'true',
      '--session-fallback-preserved',
      'true',
      '--recording-capture-seconds',
      '0',
      '--measurement-notes',
      'D-2 scoped physical-device probe on SM-S928N / Android 15 from S05 tap latency smoke and qa:day5-audio handoff.',
    ]),
  ).toBe(0);

  expect(output.stderr).toEqual([]);
  expect(output.stdout).toEqual([
    'Wrote D-2 expo-audio probe record: docs/qa/day-5-audio-engine-probes.real-device.json (PASS_WITH_LIMITS)',
  ]);
  const record = JSON.parse(
    output.textFiles.get('docs/qa/day-5-audio-engine-probes.real-device.json') ?? '',
  );
  expect(parseAudioEngineProbeRecord(record)).toEqual({ ok: true, record });
  expect(record).toMatchObject({
    generatedAt: '2026-07-06T02:05:00.000Z',
    probes: [
      {
        candidate: 'expo-audio',
        evidenceSource: 'physical-device',
        deviceLabel: 'SM-S928N / Android 15',
        measuredAt: '2026-07-06T02:00:00.000Z',
        touchToSoundLatencyMs: 38,
        firstTouchLatencyMs: 64,
        steadyTouchLatencyMs: 32,
        maxStableVoices: 9,
        pitchBendSmooth: true,
        glissandoTriggeredStrings: 12,
        muteReleaseClean: true,
        preloadStable: true,
        sessionFallbackPreserved: true,
        recordingCaptureSeconds: 0,
      },
    ],
  });
});

test('does not write a D-2 expo-audio probe record when measurements fail core criteria', () => {
  const output = createProbeRecordHarness();

  expect(
    output.run([
      '--output',
      'probe-record.json',
      '--device-label',
      'SM-S928N / Android 15',
      '--measured-at',
      '2026-07-06T02:00:00.000Z',
      '--touch-latency-ms',
      '120',
      '--max-stable-voices',
      '1',
      '--pitch-bend-smooth',
      'false',
      '--glissando-triggered-strings',
      '4',
      '--mute-release-clean',
      'false',
      '--preload-stable',
      'true',
      '--session-fallback-preserved',
      'true',
      '--recording-capture-seconds',
      '0',
      '--measurement-notes',
      'physical-device probe failed during D-2 smoke.',
    ]),
  ).toBe(1);

  expect(output.stderr).toEqual([
    'Could not write D-2 expo-audio probe record: expo-audio evaluated to NO_GO; failed criteria: latency, polyphony, pitch_bend, glissando, mute, recording',
  ]);
  expect([...output.textFiles]).toEqual([]);
});

function createProbeRecordHarness() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const textFiles = new Map<string, string>();

  return {
    stdout,
    stderr,
    textFiles,
    run: (argv: string[]) =>
      runD2ExpoAudioProbeRecordCommand({
        argv,
        getGeneratedAt: () => '2026-07-06T02:05:00.000Z',
        writeTextFile: (path, value) => textFiles.set(path, value),
        writeStdout: (value) => stdout.push(value),
        writeStderr: (value) => stderr.push(value),
      }),
  };
}

import { expect, test } from 'vitest';
import { runDay5AudioEngineProbeHandoffCommand } from '../audioEngineProbeHandoffCommand';

test('returns usage when no probe record path is provided', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5AudioEngineProbeHandoffCommand({
      argv: [],
      readTextFile: () => '{}',
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);
  expect(stdout).toEqual([]);
  expect(stderr).toEqual(['Usage: npm run qa:day5-audio -- <probe-record.json>']);
});

test('returns invalid json errors without generating a handoff summary', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5AudioEngineProbeHandoffCommand({
      argv: ['bad.json'],
      readTextFile: () => '{',
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);
  expect(stdout).toEqual([]);
  expect(stderr).toEqual(['Invalid JSON in probe record: bad.json']);
});

test('returns readable file errors without exposing a stack trace', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5AudioEngineProbeHandoffCommand({
      argv: ['missing.json'],
      readTextFile: () => {
        throw new Error('ENOENT: missing file');
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);
  expect(stdout).toEqual([]);
  expect(stderr).toEqual(['Could not read probe record: missing.json']);
});

test('returns a failing exit code for invalid probe schema handoffs', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5AudioEngineProbeHandoffCommand({
      argv: ['invalid-schema.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '',
          probes: [],
        }),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);
  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain('- Status: INVALID_PROBE_RECORD');
  expect(stdout.join('\n')).toContain('- Decision summary: not generated');
});

test('writes a handoff summary for a readable probe record path', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5AudioEngineProbeHandoffCommand({
      argv: ['day-5.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T01:00:00.000Z',
          probes: [
            {
              candidate: 'expo-audio',
              evidenceSource: 'estimate',
              deviceLabel: 'Pixel physical device',
              measuredAt: '2026-06-08T00:00:00.000Z',
              touchToSoundLatencyMs: 0,
              maxStableVoices: 0,
              pitchBendSmooth: false,
              glissandoTriggeredStrings: 0,
              muteReleaseClean: false,
              preloadStable: false,
              sessionFallbackPreserved: false,
              recordingCaptureSeconds: 0,
            },
          ],
        }),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);
  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain('# Day 5 Audio Engine Decision Summary');
  expect(stdout.join('\n')).toContain('- Status: INCOMPLETE_DEVICE_EVIDENCE');
});

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

test('returns a failing exit code when the readable probe record is not ready for a Day 5 decision', () => {
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
  ).toBe(1);
  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain('# Day 5 Audio Engine Decision Summary');
  expect(stdout.join('\n')).toContain('- Status: INCOMPLETE_DEVICE_EVIDENCE');
});

test('keeps expo-audio-only physical-device evidence from selecting a final engine', () => {
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
              evidenceSource: 'physical-device',
              deviceLabel: 'Galaxy S24 / Android 15',
              measuredAt: '2026-06-08T00:00:00.000Z',
              touchToSoundLatencyMs: 45,
              maxStableVoices: 8,
              pitchBendSmooth: true,
              glissandoTriggeredStrings: 12,
              muteReleaseClean: true,
              preloadStable: true,
              sessionFallbackPreserved: true,
              recordingCaptureSeconds: 10,
            },
          ],
        }),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);
  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: INCOMPLETE_DEVICE_EVIDENCE');
  expect(output).toContain('- Selected engine: none');
  expect(output).toContain('- Missing candidates: react-native-audio-api');
  expect(output).toContain('missing required physical-device probes: react-native-audio-api');
});

test('returns success only when the probe record selects a final engine', () => {
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
              evidenceSource: 'physical-device',
              deviceLabel: 'Pixel 8 / Android 15',
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
              deviceLabel: 'Pixel 8 / Android 15',
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
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);
  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain('- Status: FINAL_ENGINE_SELECTED');
  expect(stdout.join('\n')).toContain('- Selected engine: react-native-audio-api');
});

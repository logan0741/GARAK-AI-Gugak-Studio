import { expect, test } from 'vitest';
import { runWeek1SmokeReportCommand } from '../week1SmokeReportCommand';
import { runWeek1SmokeTemplateCommand } from '../week1SmokeTemplateCommand';

test('returns usage when template output, tester, or device label is missing', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writes = new Map<string, string>();

  expect(
    runWeek1SmokeTemplateCommand({
      argv: [],
      getGeneratedAt: () => '2026-06-08T07:00:00.000Z',
      writeTextFile: (path, value) => writes.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect([...writes]).toEqual([]);
  expect(stderr).toEqual([
    'Usage: npm run qa:week1-smoke-template -- <output-json> <tester> <device-label>',
  ]);
});

test('writes a blocked Week 1 smoke report template for every required smoke area', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writes = new Map<string, string>();

  expect(
    runWeek1SmokeTemplateCommand({
      argv: ['week1-smoke.json', 'CJH', 'Pixel 8 / Android 15'],
      getGeneratedAt: () => '2026-06-08T07:00:00.000Z',
      writeTextFile: (path, value) => writes.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  expect(stdout).toEqual(['Wrote Week 1 smoke report template: week1-smoke.json']);
  const written = writes.get('week1-smoke.json');
  if (!written) {
    throw new Error('expected template command to write a file');
  }

  const report = JSON.parse(written);
  expect(report.generatedAt).toBe('2026-06-08T07:00:00.000Z');
  expect(report.runs.map((run: { area: string }) => run.area)).toEqual([
    'day-2-expo-audio',
    'day-3-react-native-audio-api',
    'day-4-touch-model',
  ]);
  expect(report.runs[0]).toMatchObject({
    testedAt: '2026-06-08T07:00:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Pixel 8 / Android 15',
  });
  expect(report.runs[0].checks.map((check: { id: string }) => check.id)).toEqual([
    'preload',
    'tap-playback',
    'playback-queue-failure',
    'glissando-playback',
    'bend-approximation',
    'mute-release',
    'recording-permission',
    'ten-second-capture',
    'captured-playback',
    'inspector-recording-observation',
  ]);
  expect(report.runs[2].checks.map((check: { id: string }) => check.id)).toEqual([
    'tap',
    'glissando',
    'hold-drag',
    'ji-eum',
    'bend-button',
    'mute-button',
    'fallback',
  ]);
  expect(
    report.runs.flatMap((run: { checks: Array<{ result: string }> }) =>
      run.checks.map((check) => check.result),
    ),
  ).toEqual(new Array(24).fill('blocked'));
});

test('generated templates are parseable by the smoke report command before results are filled', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writes = new Map<string, string>();

  expect(
    runWeek1SmokeTemplateCommand({
      argv: ['week1-smoke.json', 'CJH', 'Pixel 8 / Android 15'],
      getGeneratedAt: () => '2026-06-08T07:00:00.000Z',
      writeTextFile: (path, value) => writes.set(path, value),
      writeStdout: () => undefined,
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  const written = writes.get('week1-smoke.json');
  if (!written) {
    throw new Error('expected template command to write a file');
  }

  expect(
    runWeek1SmokeReportCommand({
      argv: ['week1-smoke.json'],
      readTextFile: () => written,
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_COMPLETE_FOR_DAY5_REVIEW');
  expect(output).toContain('- Missing areas: none');
  expect(output).toContain('- Duplicate checks: none');
  expect(output).toContain('- Blocked checks: day-2-expo-audio.preload');
});

test('rejects placeholder device labels before writing a template', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writes = new Map<string, string>();

  expect(
    runWeek1SmokeTemplateCommand({
      argv: ['week1-smoke.json', 'CJH', 'Device / OS'],
      getGeneratedAt: () => '2026-06-08T07:00:00.000Z',
      writeTextFile: (path, value) => writes.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect([...writes]).toEqual([]);
  expect(stderr).toEqual(['Could not write Week 1 smoke report template: device label must name the physical device']);
});

test('rejects blank tester names before writing a template', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writes = new Map<string, string>();

  expect(
    runWeek1SmokeTemplateCommand({
      argv: ['week1-smoke.json', '   ', 'Pixel 8 / Android 15'],
      getGeneratedAt: () => '2026-06-08T07:00:00.000Z',
      writeTextFile: (path, value) => writes.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect([...writes]).toEqual([]);
  expect(stderr).toEqual([
    'Could not write Week 1 smoke report template: tester must be a non-empty name',
  ]);
});

test('rejects invalid generated timestamps before writing a template', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writes = new Map<string, string>();

  expect(
    runWeek1SmokeTemplateCommand({
      argv: ['week1-smoke.json', 'CJH', 'Pixel 8 / Android 15'],
      getGeneratedAt: () => 'June 8, 2026 16:00',
      writeTextFile: (path, value) => writes.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect([...writes]).toEqual([]);
  expect(stderr).toEqual([
    'Could not write Week 1 smoke report template: generatedAt must be an ISO timestamp',
  ]);
});

test('trims tester and device label values before writing a template', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writes = new Map<string, string>();

  expect(
    runWeek1SmokeTemplateCommand({
      argv: ['week1-smoke.json', ' CJH ', ' Pixel 8 / Android 15 '],
      getGeneratedAt: () => '2026-06-08T07:00:00.000Z',
      writeTextFile: (path, value) => writes.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  expect(stdout).toEqual(['Wrote Week 1 smoke report template: week1-smoke.json']);
  const report = JSON.parse(writes.get('week1-smoke.json') ?? '');
  expect(report.runs[0]).toMatchObject({
    tester: 'CJH',
    deviceLabel: 'Pixel 8 / Android 15',
  });
});

test('returns write errors without exposing a stack trace', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runWeek1SmokeTemplateCommand({
      argv: ['week1-smoke.json', 'CJH', 'Pixel 8 / Android 15'],
      getGeneratedAt: () => '2026-06-08T07:00:00.000Z',
      writeTextFile: () => {
        throw new Error('disk full');
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual(['Could not write Week 1 smoke report template: week1-smoke.json']);
});

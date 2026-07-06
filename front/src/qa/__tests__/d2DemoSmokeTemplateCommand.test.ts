import { expect, test } from 'vitest';
import { runD2DemoSmokeTemplateCommand } from '../d2DemoSmokeTemplateCommand';

test('returns usage when D-2 demo smoke template arguments are missing', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writes = new Map<string, string>();

  expect(
    runD2DemoSmokeTemplateCommand({
      argv: [],
      getGeneratedAt: () => '2026-07-04T11:00:00.000Z',
      writeTextFile: (path, value) => writes.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect([...writes]).toEqual([]);
  expect(stderr).toEqual([
    'Usage: npm run qa:d2-demo-smoke-template -- <output-json> <tester> <device-label> <apk-path>',
  ]);
});

test('writes a blocked D-2 demo smoke template for the MVP demo spine', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writes = new Map<string, string>();

  expect(
    runD2DemoSmokeTemplateCommand({
      argv: [
        'd2-demo-smoke.json',
        'CJH',
        'Galaxy S24 / Android 15',
        'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
      ],
      getGeneratedAt: () => '2026-07-04T11:00:00.000Z',
      writeTextFile: (path, value) => writes.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  expect(stdout).toEqual([
    'Wrote D-2 demo smoke template: d2-demo-smoke.json',
  ]);
  const report = JSON.parse(writes.get('d2-demo-smoke.json') ?? '');

  expect(report).toMatchObject({
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:00:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
  });
  expect(report.checks.map((check: { id: string }) => check.id)).toEqual([
    'short-ascii-android-build',
    'adb-device-detected',
    'apk-installed-and-launched',
    'home-browse-demo-playback',
    's05-instrument-touch-sound',
    'recording-event-take-saved',
    'library-export-playback',
    'day5-expo-audio-probe-updated',
  ]);
  expect(report.checks.map((check: { result: string }) => check.result)).toEqual(
    new Array(8).fill('blocked'),
  );
});

test('rejects placeholder device labels before writing a D-2 demo template', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writes = new Map<string, string>();

  expect(
    runD2DemoSmokeTemplateCommand({
      argv: ['d2-demo-smoke.json', 'CJH', 'Device / OS', 'C:\\gsb\\app-debug.apk'],
      getGeneratedAt: () => '2026-07-04T11:00:00.000Z',
      writeTextFile: (path, value) => writes.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect([...writes]).toEqual([]);
  expect(stderr).toEqual([
    'Could not write D-2 demo smoke template: device label must name the physical device',
  ]);
});

test('rejects blank APK paths before writing a D-2 demo template', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const writes = new Map<string, string>();

  expect(
    runD2DemoSmokeTemplateCommand({
      argv: ['d2-demo-smoke.json', 'CJH', 'Galaxy S24 / Android 15', '   '],
      getGeneratedAt: () => '2026-07-04T11:00:00.000Z',
      writeTextFile: (path, value) => writes.set(path, value),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect([...writes]).toEqual([]);
  expect(stderr).toEqual([
    'Could not write D-2 demo smoke template: apk path must be non-empty',
  ]);
});

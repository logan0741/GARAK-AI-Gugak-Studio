import { expect, test } from 'vitest';
import { runWeek1SmokeReportCommand } from '../week1SmokeReportCommand';

test('returns usage when no Week 1 smoke report path is provided', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runWeek1SmokeReportCommand({
      argv: [],
      readTextFile: () => '{}',
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual(['Usage: npm run qa:week1-smoke-report -- <week1-smoke-report.json>']);
});

test('reports complete smoke evidence without selecting a final engine', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runWeek1SmokeReportCommand({
      argv: ['complete-smoke.json'],
      readTextFile: () =>
        JSON.stringify(
          createSmokeReport({
            overrides: {
              'day-3-react-native-audio-api': {
                'pitch-bend': 'fail',
              },
            },
          }),
        ),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('# Week 1 Smoke Report Summary');
  expect(output).toContain('- Status: COMPLETE_FOR_DAY5_REVIEW');
  expect(output).toContain('- Missing areas: none');
  expect(output).toContain('- Duplicate areas: none');
  expect(output).toContain('- Missing checks: none');
  expect(output).toContain('- Duplicate checks: none');
  expect(output).toContain('- Timestamp issues: none');
  expect(output).toContain('- Blocked checks: none');
  expect(output).toContain('- Failed checks: day-3-react-native-audio-api.pitch-bend');
  expect(output).not.toContain('FINAL_ENGINE_SELECTED');
});

test('reports smoke reports generated before run timestamps as not complete', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const report = createSmokeReport();
  report.generatedAt = '2026-06-08T07:00:30.000Z';
  report.runs[1].testedAt = '2026-06-08T07:05:00.000Z';

  expect(
    runWeek1SmokeReportCommand({
      argv: ['out-of-order-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_COMPLETE_FOR_DAY5_REVIEW');
  expect(output).toContain(
    '- Timestamp issues: generatedAt must be at or after every smoke run testedAt timestamp',
  );
});

test('reports missing areas and missing checks as not complete', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runWeek1SmokeReportCommand({
      argv: ['incomplete-smoke.json'],
      readTextFile: () =>
        JSON.stringify(
          createSmokeReport({
            areas: ['day-2-expo-audio', 'day-3-react-native-audio-api'],
            omitChecks: {
              'day-3-react-native-audio-api': ['pitch-bend'],
            },
          }),
        ),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_COMPLETE_FOR_DAY5_REVIEW');
  expect(output).toContain('- Missing areas: day-4-touch-model');
  expect(output).toContain('- Missing checks: day-3-react-native-audio-api.pitch-bend');
});

test('reports every required check as missing when a smoke run has an empty checks array', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const report = createSmokeReport();
  const touchRun = report.runs.find((run) => run.area === 'day-4-touch-model');
  if (!touchRun) {
    throw new Error('test fixture must include day-4-touch-model');
  }
  touchRun.checks = [];

  expect(
    runWeek1SmokeReportCommand({
      argv: ['empty-checks-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_COMPLETE_FOR_DAY5_REVIEW');
  expect(output).toContain(
    '- Missing checks: day-4-touch-model.tap, day-4-touch-model.glissando, day-4-touch-model.hold-drag, day-4-touch-model.ji-eum, day-4-touch-model.bend-button, day-4-touch-model.mute-button, day-4-touch-model.session-replay-ready, day-4-touch-model.session-replay-dispatch, day-4-touch-model.fallback',
  );
});

test('reports duplicate areas and blocked checks as not complete', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const duplicateReport = createSmokeReport({
    overrides: {
      'day-2-expo-audio': {
        'ten-second-capture': 'blocked',
      },
    },
  });

  expect(
    runWeek1SmokeReportCommand({
      argv: ['duplicate-smoke.json'],
      readTextFile: () =>
        JSON.stringify({
          ...duplicateReport,
          runs: [...duplicateReport.runs, duplicateReport.runs[0]],
        }),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_COMPLETE_FOR_DAY5_REVIEW');
  expect(output).toContain('- Duplicate areas: day-2-expo-audio');
  expect(output).toContain('- Blocked checks: day-2-expo-audio.ten-second-capture');
});

test('reports duplicate checks as not complete', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const report = createSmokeReport();
  const touchRun = report.runs.find((run) => run.area === 'day-4-touch-model');
  if (!touchRun) {
    throw new Error('test fixture must include day-4-touch-model');
  }
  touchRun.checks.push({ id: 'tap', result: 'pass', notes: '' });

  expect(
    runWeek1SmokeReportCommand({
      argv: ['duplicate-check-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_COMPLETE_FOR_DAY5_REVIEW');
  expect(output).toContain('- Duplicate checks: day-4-touch-model.tap');
});

test('requires notes for failed smoke checks before Day 5 review', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const report = createSmokeReport({
    overrides: {
      'day-3-react-native-audio-api': {
        'pitch-bend': 'fail',
      },
    },
  });
  const rnRun = report.runs.find((run) => run.area === 'day-3-react-native-audio-api');
  const pitchBendCheck = rnRun?.checks.find((check) => check.id === 'pitch-bend');
  if (!pitchBendCheck) {
    throw new Error('test fixture must include day-3 pitch-bend check');
  }
  pitchBendCheck.notes = '   ';

  expect(
    runWeek1SmokeReportCommand({
      argv: ['failed-without-notes-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_COMPLETE_FOR_DAY5_REVIEW');
  expect(output).toContain(
    '- Failed check note issues: day-3-react-native-audio-api.pitch-bend',
  );
});

test('returns parse errors for invalid smoke report check results', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runWeek1SmokeReportCommand({
      argv: ['bad-smoke.json'],
      readTextFile: () =>
        JSON.stringify({
          generatedAt: '2026-06-08T07:00:00.000Z',
          runs: [
            {
              area: 'day-2-expo-audio',
              testedAt: '2026-06-08T07:01:00.000Z',
              tester: 'CJH',
              deviceLabel: 'Pixel 8 / Android 15',
              checks: [
                {
                  id: 'preload',
                  result: 'unknown',
                },
              ],
            },
          ],
        }),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Could not parse Week 1 smoke report: runs[0].checks[0].result must be pass, fail, or blocked',
  ]);
});

test('rejects placeholder device labels for physical-device smoke evidence', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const report = createSmokeReport();
  report.runs[0].deviceLabel = 'Device / OS';

  expect(
    runWeek1SmokeReportCommand({
      argv: ['placeholder-device-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Could not parse Week 1 smoke report: runs[0].deviceLabel must name the physical device',
  ]);
});

test('rejects placeholder-like device labels for physical-device smoke evidence', () => {
  for (const deviceLabel of [
    'Device/OS',
    'Device /OS',
    'Device/ OS',
    'replace with physical device model',
  ]) {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const report = createSmokeReport();
    report.runs[0].deviceLabel = deviceLabel;

    expect(
      runWeek1SmokeReportCommand({
        argv: ['placeholder-like-device-smoke.json'],
        readTextFile: () => JSON.stringify(report),
        writeStdout: (value) => stdout.push(value),
        writeStderr: (value) => stderr.push(value),
      }),
    ).toBe(1);

    expect(stdout).toEqual([]);
    expect(stderr).toEqual([
      'Could not parse Week 1 smoke report: runs[0].deviceLabel must name the physical device',
    ]);
  }
});

test('reports different smoke run device labels as not complete', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const report = createSmokeReport();
  report.runs[1].deviceLabel = 'Galaxy S24 / Android 15';

  expect(
    runWeek1SmokeReportCommand({
      argv: ['mixed-device-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_COMPLETE_FOR_DAY5_REVIEW');
  expect(output).toContain(
    '- Device label issues: smoke report must use one device label: Pixel 8 / Android 15, Galaxy S24 / Android 15',
  );
});

test('treats slash spacing differences as the same smoke report device label', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const report = createSmokeReport();
  report.runs[1].deviceLabel = 'Pixel 8/Android 15';
  report.runs[2].deviceLabel = 'Pixel 8 /Android 15';

  expect(
    runWeek1SmokeReportCommand({
      argv: ['slash-spacing-device-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: COMPLETE_FOR_DAY5_REVIEW');
  expect(output).toContain('- Device label issues: none');
});

test('returns invalid json errors without exposing a stack trace', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runWeek1SmokeReportCommand({
      argv: ['bad.json'],
      readTextFile: () => '{',
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual(['Invalid JSON in Week 1 smoke report: bad.json']);
});

type SmokeAreaId = 'day-2-expo-audio' | 'day-3-react-native-audio-api' | 'day-4-touch-model';
type SmokeCheckResult = 'pass' | 'fail' | 'blocked';

const requiredChecksByArea = {
  'day-2-expo-audio': [
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
  ],
  'day-3-react-native-audio-api': [
    'preload',
    'tap-playback',
    'polyphony',
    'pitch-bend',
    'filter-path',
    'mute-release',
    'recording-fallback',
  ],
  'day-4-touch-model': [
    'tap',
    'glissando',
    'hold-drag',
    'ji-eum',
    'bend-button',
    'mute-button',
    'session-replay-ready',
    'session-replay-dispatch',
    'fallback',
  ],
} as const satisfies Record<SmokeAreaId, readonly string[]>;

function createSmokeReport(input: {
  areas?: SmokeAreaId[];
  omitChecks?: Partial<Record<SmokeAreaId, string[]>>;
  overrides?: Partial<Record<SmokeAreaId, Record<string, SmokeCheckResult>>>;
} = {}) {
  const areas = input.areas ?? [
    'day-2-expo-audio',
    'day-3-react-native-audio-api',
    'day-4-touch-model',
  ];

  return {
    generatedAt: '2026-06-08T07:05:00.000Z',
    runs: areas.map((area, index) => ({
      area,
      testedAt: `2026-06-08T07:0${index + 1}:00.000Z`,
      tester: 'CJH',
      deviceLabel: 'Pixel 8 / Android 15',
      checks: requiredChecksByArea[area]
        .filter((id) => !(input.omitChecks?.[area] ?? []).includes(id))
        .map((id) => {
          const result = input.overrides?.[area]?.[id] ?? 'pass';
          return {
            id,
            result,
            notes: result === 'fail' ? 'Observed failure during physical-device smoke run.' : '',
          };
        }),
    })),
  };
}

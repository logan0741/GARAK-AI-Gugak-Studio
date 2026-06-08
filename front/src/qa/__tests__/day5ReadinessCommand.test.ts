import { expect, test } from 'vitest';
import {
  REQUIRED_AREAS,
  REQUIRED_CHECKS_BY_AREA,
  type Week1SmokeAreaId,
  type Week1SmokeCheckResult,
} from '../week1SmokeReportCommand';
import { runDay5ReadinessCommand } from '../day5ReadinessCommand';

test('returns usage when smoke report or probe record paths are missing', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5ReadinessCommand({
      argv: ['week1-smoke.json'],
      readTextFile: () => '{}',
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Usage: npm run qa:day5-readiness -- <week1-smoke-report.json> <probe-record.json>',
  ]);
});

test('reports readiness when Week 1 smoke and Day 5 probes are complete on the same physical device', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5ReadinessCommand({
      argv: ['week1-smoke.json', 'day5-probes.json'],
      readTextFile: (path) => {
        if (path === 'week1-smoke.json') {
          return JSON.stringify(createSmokeReport());
        }

        return JSON.stringify(createProbeRecord());
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('# Day 5 Readiness Summary');
  expect(output).toContain('- Status: READY_FOR_DAY5_DECISION');
  expect(output).toContain('- Smoke report issues: none');
  expect(output).toContain('- Probe record issues: none');
  expect(output).toContain('- Device alignment issues: none');
  expect(output).toContain('- Failed smoke checks: none');
  expect(output).not.toContain('FINAL_ENGINE_SELECTED');
});

test('keeps failed smoke checks visible without blocking readiness', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5ReadinessCommand({
      argv: ['week1-smoke.json', 'day5-probes.json'],
      readTextFile: (path) => {
        if (path === 'week1-smoke.json') {
          return JSON.stringify(
            createSmokeReport({
              overrides: {
                'day-3-react-native-audio-api': {
                  'pitch-bend': 'fail',
                },
              },
            }),
          );
        }

        return JSON.stringify(createProbeRecord());
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain(
    '- Failed smoke checks: day-3-react-native-audio-api.pitch-bend',
  );
});

test('blocks readiness when failed smoke checks do not include review notes', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const smokeReport = createSmokeReport({
    overrides: {
      'day-3-react-native-audio-api': {
        'pitch-bend': 'fail',
      },
    },
  });
  const rnRun = smokeReport.runs.find((run) => run.area === 'day-3-react-native-audio-api');
  const pitchBendCheck = rnRun?.checks.find((check) => check.id === 'pitch-bend');
  if (!pitchBendCheck) {
    throw new Error('test fixture must include day-3 pitch-bend check');
  }
  pitchBendCheck.notes = '';

  expect(
    runDay5ReadinessCommand({
      argv: ['week1-smoke.json', 'day5-probes.json'],
      readTextFile: (path) => {
        if (path === 'week1-smoke.json') {
          return JSON.stringify(smokeReport);
        }

        return JSON.stringify(createProbeRecord());
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_DAY5_DECISION');
  expect(output).toContain(
    '- Smoke report issues: smoke report is not complete for Day 5 review, failed checks require notes: day-3-react-native-audio-api.pitch-bend',
  );
});

test('blocks Day 5 readiness when Week 1 smoke report still has blocked checks', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5ReadinessCommand({
      argv: ['week1-smoke.json', 'day5-probes.json'],
      readTextFile: (path) => {
        if (path === 'week1-smoke.json') {
          return JSON.stringify(
            createSmokeReport({
              overrides: {
                'day-2-expo-audio': {
                  'ten-second-capture': 'blocked',
                },
              },
            }),
          );
        }

        return JSON.stringify(createProbeRecord());
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_DAY5_DECISION');
  expect(output).toContain(
    '- Smoke report issues: smoke report is not complete for Day 5 review',
  );
  expect(output).toContain('- Blocked smoke checks: day-2-expo-audio.ten-second-capture');
});

test('reports smoke report device label issues in the readiness summary', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5ReadinessCommand({
      argv: ['week1-smoke.json', 'day5-probes.json'],
      readTextFile: (path) => {
        if (path === 'week1-smoke.json') {
          return JSON.stringify(
            createSmokeReport({
              deviceLabels: {
                'day-3-react-native-audio-api': 'Galaxy S24 / Android 15',
              },
            }),
          );
        }

        return JSON.stringify(createProbeRecord());
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_DAY5_DECISION');
  expect(output).toContain(
    '- Smoke report issues: smoke report is not complete for Day 5 review, device label issues: smoke report must use one device label: Pixel 8 / Android 15, Galaxy S24 / Android 15',
  );
});

test('blocks readiness when a required candidate has no physical-device probe', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5ReadinessCommand({
      argv: ['week1-smoke.json', 'day5-probes.json'],
      readTextFile: (path) => {
        if (path === 'week1-smoke.json') {
          return JSON.stringify(createSmokeReport());
        }

        return JSON.stringify(
          createProbeRecord({
            candidates: ['expo-audio'],
          }),
        );
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_DAY5_DECISION');
  expect(output).toContain(
    '- Probe record issues: missing physical-device probes: react-native-audio-api',
  );
});

test('blocks readiness when probe device labels differ from the smoke report device label', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5ReadinessCommand({
      argv: ['week1-smoke.json', 'day5-probes.json'],
      readTextFile: (path) => {
        if (path === 'week1-smoke.json') {
          return JSON.stringify(createSmokeReport());
        }

        return JSON.stringify(
          createProbeRecord({
            deviceLabel: 'Galaxy S24 / Android 15',
          }),
        );
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_DAY5_DECISION');
  expect(output).toContain(
    '- Device alignment issues: probe device labels must match smoke report device label Pixel 8 / Android 15',
  );
});

test('treats surrounding whitespace in device labels as the same physical device', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5ReadinessCommand({
      argv: ['week1-smoke.json', 'day5-probes.json'],
      readTextFile: (path) => {
        if (path === 'week1-smoke.json') {
          return JSON.stringify(
            createSmokeReport({
              deviceLabels: {
                'day-2-expo-audio': ' Pixel 8 / Android 15 ',
              },
            }),
          );
        }

        return JSON.stringify(
          createProbeRecord({
            deviceLabel: 'Pixel 8 / Android 15',
          }),
        );
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: READY_FOR_DAY5_DECISION');
  expect(output).toContain('- Device alignment issues: none');
});

test('treats slash spacing differences as the same Day 5 physical device label', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5ReadinessCommand({
      argv: ['week1-smoke.json', 'day5-probes.json'],
      readTextFile: (path) => {
        if (path === 'week1-smoke.json') {
          return JSON.stringify(
            createSmokeReport({
              deviceLabels: {
                'day-2-expo-audio': 'Pixel 8/Android 15',
                'day-3-react-native-audio-api': 'Pixel 8 /Android 15',
              },
            }),
          );
        }

        return JSON.stringify(
          createProbeRecord({
            deviceLabel: 'Pixel 8 / Android 15',
          }),
        );
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: READY_FOR_DAY5_DECISION');
  expect(output).toContain('- Device alignment issues: none');
});

test('returns parse errors for malformed inputs without exposing a stack trace', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runDay5ReadinessCommand({
      argv: ['week1-smoke.json', 'day5-probes.json'],
      readTextFile: (path) => {
        if (path === 'week1-smoke.json') {
          return '{';
        }

        return JSON.stringify(createProbeRecord());
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual(['Invalid JSON in Week 1 smoke report: week1-smoke.json']);
});

type ProbeCandidate = 'expo-audio' | 'react-native-audio-api';

function createSmokeReport(input: {
  deviceLabels?: Partial<Record<Week1SmokeAreaId, string>>;
  overrides?: Partial<Record<Week1SmokeAreaId, Record<string, Week1SmokeCheckResult>>>;
} = {}) {
  return {
    generatedAt: '2026-06-08T07:00:00.000Z',
    runs: REQUIRED_AREAS.map((area, index) => ({
      area,
      testedAt: `2026-06-08T07:0${index + 1}:00.000Z`,
      tester: 'CJH',
      deviceLabel: input.deviceLabels?.[area] ?? 'Pixel 8 / Android 15',
      checks: REQUIRED_CHECKS_BY_AREA[area].map((id) => {
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

function createProbeRecord(input: {
  candidates?: ProbeCandidate[];
  deviceLabel?: string;
} = {}) {
  const candidates = input.candidates ?? ['expo-audio', 'react-native-audio-api'];
  return {
    generatedAt: '2026-06-08T08:00:00.000Z',
    probes: candidates.map((candidate, index) => ({
      candidate,
      evidenceSource: 'physical-device',
      deviceLabel: input.deviceLabel ?? 'Pixel 8 / Android 15',
      measuredAt: `2026-06-08T08:0${index + 1}:00.000Z`,
      touchToSoundLatencyMs: 38,
      maxStableVoices: 9,
      pitchBendSmooth: true,
      glissandoTriggeredStrings: 12,
      muteReleaseClean: true,
      preloadStable: true,
      sessionFallbackPreserved: true,
      recordingCaptureSeconds: 10,
    })),
  };
}

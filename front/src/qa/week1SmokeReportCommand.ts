export type Week1SmokeAreaId =
  | 'day-2-expo-audio'
  | 'day-3-react-native-audio-api'
  | 'day-4-touch-model';

export type Week1SmokeCheckResult = 'pass' | 'fail' | 'blocked';

export type Week1SmokeCheck = {
  id: string;
  result: Week1SmokeCheckResult;
  notes?: string;
};

export type Week1SmokeRun = {
  area: Week1SmokeAreaId;
  testedAt: string;
  tester: string;
  deviceLabel: string;
  checks: Week1SmokeCheck[];
};

export type Week1SmokeReport = {
  generatedAt: string;
  runs: Week1SmokeRun[];
};

export type Week1SmokeReportStatus =
  | 'COMPLETE_FOR_DAY5_REVIEW'
  | 'NOT_COMPLETE_FOR_DAY5_REVIEW';

export type Week1SmokeReportSummary = {
  status: Week1SmokeReportStatus;
  missingAreas: Week1SmokeAreaId[];
  duplicateAreas: Week1SmokeAreaId[];
  missingChecks: string[];
  duplicateChecks: string[];
  deviceLabelIssues: string[];
  blockedChecks: string[];
  failedChecks: string[];
};

export type Week1SmokeReportCommandInput = {
  argv: string[];
  readTextFile: (path: string) => string;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export const REQUIRED_CHECKS_BY_AREA = {
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
    'fallback',
  ],
} as const satisfies Record<Week1SmokeAreaId, readonly string[]>;

export const REQUIRED_AREAS = Object.keys(REQUIRED_CHECKS_BY_AREA) as Week1SmokeAreaId[];

export function runWeek1SmokeReportCommand(input: Week1SmokeReportCommandInput): number {
  const [smokeReportPath] = input.argv;

  if (!smokeReportPath) {
    input.writeStderr('Usage: npm run qa:week1-smoke-report -- <week1-smoke-report.json>');
    return 1;
  }

  let reportText: string;

  try {
    reportText = input.readTextFile(smokeReportPath);
  } catch {
    input.writeStderr(`Could not read Week 1 smoke report: ${smokeReportPath}`);
    return 1;
  }

  let reportInput: unknown;

  try {
    reportInput = JSON.parse(reportText);
  } catch {
    input.writeStderr(`Invalid JSON in Week 1 smoke report: ${smokeReportPath}`);
    return 1;
  }

  const parseResult = parseWeek1SmokeReport(reportInput);
  if (!parseResult.ok) {
    input.writeStderr(`Could not parse Week 1 smoke report: ${parseResult.error}`);
    return 1;
  }

  const summary = summarizeWeek1SmokeReport(parseResult.report);
  input.writeStdout(formatWeek1SmokeReportSummary(summary));
  return summary.status === 'COMPLETE_FOR_DAY5_REVIEW' ? 0 : 1;
}

export function parseWeek1SmokeReport(
  input: unknown,
): { ok: true; report: Week1SmokeReport } | { ok: false; error: string } {
  if (!isObject(input)) {
    return { ok: false, error: 'report must be an object' };
  }

  if (!isIsoTimestamp(input.generatedAt)) {
    return { ok: false, error: 'generatedAt must be an ISO timestamp' };
  }

  if (!Array.isArray(input.runs)) {
    return { ok: false, error: 'runs must be an array' };
  }

  for (const [runIndex, run] of input.runs.entries()) {
    if (!isObject(run)) {
      return { ok: false, error: `runs[${runIndex}] must be an object` };
    }

    if (!isWeek1SmokeArea(run.area)) {
      return {
        ok: false,
        error: `runs[${runIndex}].area must be day-2-expo-audio, day-3-react-native-audio-api, or day-4-touch-model`,
      };
    }

    if (!isIsoTimestamp(run.testedAt)) {
      return { ok: false, error: `runs[${runIndex}].testedAt must be an ISO timestamp` };
    }

    if (!isNonEmptyString(run.tester)) {
      return { ok: false, error: `runs[${runIndex}].tester must be a non-empty string` };
    }

    if (!isPhysicalDeviceLabel(run.deviceLabel)) {
      return { ok: false, error: `runs[${runIndex}].deviceLabel must name the physical device` };
    }

    if (!Array.isArray(run.checks)) {
      return { ok: false, error: `runs[${runIndex}].checks must be an array` };
    }

    for (const [checkIndex, check] of run.checks.entries()) {
      if (!isObject(check)) {
        return {
          ok: false,
          error: `runs[${runIndex}].checks[${checkIndex}] must be an object`,
        };
      }

      if (!isKnownCheckIdForArea(run.area, check.id)) {
        return {
          ok: false,
          error: `runs[${runIndex}].checks[${checkIndex}].id must be a known check for ${run.area}`,
        };
      }

      if (!isWeek1SmokeCheckResult(check.result)) {
        return {
          ok: false,
          error: `runs[${runIndex}].checks[${checkIndex}].result must be pass, fail, or blocked`,
        };
      }

      if (check.notes !== undefined && typeof check.notes !== 'string') {
        return {
          ok: false,
          error: `runs[${runIndex}].checks[${checkIndex}].notes must be a string when provided`,
        };
      }
    }
  }

  return {
    ok: true,
    report: input as Week1SmokeReport,
  };
}

export function summarizeWeek1SmokeReport(report: Week1SmokeReport): Week1SmokeReportSummary {
  const areaCounts = countAreas(report.runs);
  const missingAreas = REQUIRED_AREAS.filter((area) => (areaCounts.get(area) ?? 0) === 0);
  const duplicateAreas = REQUIRED_AREAS.filter((area) => (areaCounts.get(area) ?? 0) > 1);
  const missingChecks = collectMissingChecks(report.runs);
  const duplicateChecks = collectDuplicateChecks(report.runs);
  const deviceLabelIssues = collectDeviceLabelIssues(report.runs);
  const blockedChecks = collectChecksByResult(report.runs, 'blocked');
  const failedChecks = collectChecksByResult(report.runs, 'fail');
  const status =
    missingAreas.length === 0 &&
    duplicateAreas.length === 0 &&
    missingChecks.length === 0 &&
    duplicateChecks.length === 0 &&
    deviceLabelIssues.length === 0 &&
    blockedChecks.length === 0
      ? 'COMPLETE_FOR_DAY5_REVIEW'
      : 'NOT_COMPLETE_FOR_DAY5_REVIEW';

  return {
    status,
    missingAreas,
    duplicateAreas,
    missingChecks,
    duplicateChecks,
    deviceLabelIssues,
    blockedChecks,
    failedChecks,
  };
}

function countAreas(runs: Week1SmokeRun[]): Map<Week1SmokeAreaId, number> {
  const counts = new Map<Week1SmokeAreaId, number>();

  for (const run of runs) {
    counts.set(run.area, (counts.get(run.area) ?? 0) + 1);
  }

  return counts;
}

function collectMissingChecks(runs: Week1SmokeRun[]): string[] {
  const missingChecks: string[] = [];

  for (const area of REQUIRED_AREAS) {
    const presentCheckIds = new Set(
      runs
        .filter((run) => run.area === area)
        .flatMap((run) => run.checks.map((check) => check.id)),
    );

    if (presentCheckIds.size === 0) {
      continue;
    }

    for (const requiredCheck of REQUIRED_CHECKS_BY_AREA[area]) {
      if (!presentCheckIds.has(requiredCheck)) {
        missingChecks.push(`${area}.${requiredCheck}`);
      }
    }
  }

  return missingChecks;
}

function collectDuplicateChecks(runs: Week1SmokeRun[]): string[] {
  const duplicateChecks = new Set<string>();

  for (const run of runs) {
    const seen = new Set<string>();
    for (const check of run.checks) {
      if (seen.has(check.id)) {
        duplicateChecks.add(`${run.area}.${check.id}`);
      }
      seen.add(check.id);
    }
  }

  return orderCheckReferences([...duplicateChecks]);
}

function collectDeviceLabelIssues(runs: Week1SmokeRun[]): string[] {
  const deviceLabels = unique(runs.map((run) => normalizeDeviceLabelForReport(run.deviceLabel)));
  if (deviceLabels.length <= 1) {
    return [];
  }

  return [`smoke report must use one device label: ${formatList(deviceLabels)}`];
}

function collectChecksByResult(
  runs: Week1SmokeRun[],
  result: Exclude<Week1SmokeCheckResult, 'pass'>,
): string[] {
  const checks = new Set<string>();

  for (const area of REQUIRED_AREAS) {
    for (const requiredCheck of REQUIRED_CHECKS_BY_AREA[area]) {
      if (
        runs.some((run) =>
          run.area === area &&
          run.checks.some((check) => check.id === requiredCheck && check.result === result),
        )
      ) {
        checks.add(`${area}.${requiredCheck}`);
      }
    }
  }

  return [...checks];
}

function orderCheckReferences(checks: string[]): string[] {
  const order = new Map<string, number>();
  let index = 0;

  for (const area of REQUIRED_AREAS) {
    for (const check of REQUIRED_CHECKS_BY_AREA[area]) {
      order.set(`${area}.${check}`, index);
      index += 1;
    }
  }

  return [...checks].sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
}

function formatWeek1SmokeReportSummary(summary: Week1SmokeReportSummary): string {
  return [
    '# Week 1 Smoke Report Summary',
    '',
    `- Status: ${summary.status}`,
    `- Missing areas: ${formatList(summary.missingAreas)}`,
    `- Duplicate areas: ${formatList(summary.duplicateAreas)}`,
    `- Missing checks: ${formatList(summary.missingChecks)}`,
    `- Duplicate checks: ${formatList(summary.duplicateChecks)}`,
    `- Device label issues: ${formatList(summary.deviceLabelIssues)}`,
    `- Blocked checks: ${formatList(summary.blockedChecks)}`,
    `- Failed checks: ${formatList(summary.failedChecks)}`,
  ].join('\n');
}

function formatList(values: string[]): string {
  return values.length === 0 ? 'none' : values.join(', ');
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function isWeek1SmokeArea(input: unknown): input is Week1SmokeAreaId {
  return (
    input === 'day-2-expo-audio' ||
    input === 'day-3-react-native-audio-api' ||
    input === 'day-4-touch-model'
  );
}

function isKnownCheckIdForArea(area: Week1SmokeAreaId, input: unknown): input is string {
  return (
    typeof input === 'string' &&
    (REQUIRED_CHECKS_BY_AREA[area] as readonly string[]).includes(input)
  );
}

function isWeek1SmokeCheckResult(input: unknown): input is Week1SmokeCheckResult {
  return input === 'pass' || input === 'fail' || input === 'blocked';
}

function isIsoTimestamp(input: unknown): input is string {
  if (typeof input !== 'string') {
    return false;
  }

  const parsed = Date.parse(input);
  return !Number.isNaN(parsed) && new Date(parsed).toISOString() === input;
}

function isNonEmptyString(input: unknown): input is string {
  return typeof input === 'string' && input.trim().length > 0;
}

export function isPhysicalDeviceLabel(input: unknown): input is string {
  if (!isNonEmptyString(input)) {
    return false;
  }

  const normalized = normalizePhysicalDeviceLabel(input);
  return ![
    'replace-with-physical-device-model',
    'replace with physical device model',
    'device os',
    'device/os',
    'physical device',
  ].includes(normalized);
}

function normalizePhysicalDeviceLabel(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ');
}

function normalizeDeviceLabelForReport(input: string): string {
  return input
    .trim()
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ');
}

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

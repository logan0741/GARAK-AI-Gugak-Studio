import {
  REQUIRED_D2_DEMO_SMOKE_CHECKS,
  type D2DemoSmokeCheck,
  type D2DemoSmokeCheckId,
  type D2DemoSmokeCheckResult,
  type D2DemoSmokeReport,
} from './d2DemoSmokeTemplateCommand';
import {
  validateD2DemoSmokeDay5ProbeEvidence,
  validateD2DemoSmokeDeviceEvidence,
  validateD2DemoSmokeManualCheckEvidence,
  validateD2DemoSmokeRecordingEvidence,
} from './d2DemoSmokeReportCommand';
import { isIsoTimestamp } from './week1SmokeReportCommand';

export type D2DemoSmokeCheckUpdateCommandInput = {
  argv: string[];
  getTestedAt: () => string;
  readTextFile: (path: string) => string;
  writeTextFile: (path: string, value: string) => void;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

const USAGE =
  'Usage: npm run qa:d2-demo-smoke-check-update -- --report <d2-demo-smoke.json> --check <check-id> --result <pass|fail|blocked> --notes <text> [--tested-at <ISO>] [--evidence <device-evidence.json>] [--recording-evidence <recording-evidence.json>] [--day5-probe <probe-record.json>]';

type ParsedArgs = {
  reportPath: string;
  checkId: D2DemoSmokeCheckId;
  result: D2DemoSmokeCheckResult;
  notes: string;
  testedAt?: string;
  evidencePath?: string;
  recordingEvidencePath?: string;
  day5ProbePath?: string;
};

export function runD2DemoSmokeCheckUpdateCommand(
  input: D2DemoSmokeCheckUpdateCommandInput,
): number {
  const args = parseArgs(input.argv);
  if (!args.ok) {
    input.writeStderr(args.message ?? USAGE);
    return 1;
  }

  let reportInput: unknown;
  try {
    reportInput = JSON.parse(input.readTextFile(args.value.reportPath));
  } catch {
    input.writeStderr(`Could not update D-2 smoke check: could not read ${args.value.reportPath}`);
    return 1;
  }

  const reportResult = parseReportForUpdate(reportInput);
  if (!reportResult.ok) {
    input.writeStderr(`Could not update D-2 smoke check: ${reportResult.errors.join('; ')}`);
    return 1;
  }

  const testedAt = args.value.testedAt ?? reportResult.report.testedAt;
  if (!isIsoTimestamp(testedAt)) {
    input.writeStderr('Could not update D-2 smoke check: testedAt must be an ISO timestamp');
    return 1;
  }

  const updatedCheck: D2DemoSmokeCheck = {
    id: args.value.checkId,
    result: args.value.result,
    notes: args.value.notes,
  };
  const evidenceIssues = validateD2DemoSmokeManualCheckEvidence(
    updatedCheck,
    reportResult.report.deviceLabel,
  );
  if (evidenceIssues.length > 0) {
    input.writeStderr(`Could not update D-2 smoke check: ${evidenceIssues.join('; ')}`);
    return 1;
  }

  const checkFound = reportResult.report.checks.some((check) => check.id === args.value.checkId);
  const updatedReport: D2DemoSmokeReport = {
    ...reportResult.report,
    testedAt,
    checks: checkFound
      ? reportResult.report.checks.map((check) =>
          check.id === args.value.checkId ? updatedCheck : check,
        )
      : [...reportResult.report.checks, updatedCheck],
  };

  if (updatedCheck.id === 'day5-expo-audio-probe-updated' && updatedCheck.result === 'pass') {
    const day5ProbeResult = readDay5ProbeForUpdate(input, args.value.day5ProbePath);
    if (!day5ProbeResult.ok) {
      input.writeStderr(`Could not update D-2 smoke check: ${day5ProbeResult.message}`);
      return 1;
    }

    const day5ProbeIssues = validateD2DemoSmokeDay5ProbeEvidence(
      updatedReport,
      day5ProbeResult.probe,
      args.value.day5ProbePath,
    );
    if (day5ProbeIssues.length > 0) {
      input.writeStderr(`Could not update D-2 smoke check: ${day5ProbeIssues.join('; ')}`);
      return 1;
    }
  }

  const deviceEvidenceForPass = requiresPhysicalDeviceSidecarForPass(updatedCheck)
    ? readJsonSidecarForUpdate(input, args.value.evidencePath, 'device evidence')
    : undefined;
  if (deviceEvidenceForPass?.ok === false) {
    input.writeStderr(`Could not update D-2 smoke check: ${deviceEvidenceForPass.message}`);
    return 1;
  }
  if (deviceEvidenceForPass?.ok === true) {
    const deviceSmokePrerequisiteIssues = collectPhysicalDeviceSmokePrerequisiteIssues(
      updatedReport,
    );
    if (deviceSmokePrerequisiteIssues.length > 0) {
      input.writeStderr(
        `Could not update D-2 smoke check: ${deviceSmokePrerequisiteIssues.join('; ')}`,
      );
      return 1;
    }

    const deviceEvidenceIssues = validateD2DemoSmokeDeviceEvidence(
      updatedReport,
      deviceEvidenceForPass.value,
    );
    if (deviceEvidenceIssues.length > 0) {
      input.writeStderr(`Could not update D-2 smoke check: ${deviceEvidenceIssues.join('; ')}`);
      return 1;
    }
  }

  if (updatedCheck.id === 'recording-event-take-saved' && updatedCheck.result === 'pass') {
    const recordingEvidenceResult = readJsonSidecarForUpdate(
      input,
      args.value.recordingEvidencePath,
      'recording evidence',
    );
    if (!recordingEvidenceResult.ok) {
      input.writeStderr(`Could not update D-2 smoke check: ${recordingEvidenceResult.message}`);
      return 1;
    }

    const recordingEvidenceIssues = validateD2DemoSmokeRecordingEvidence(
      updatedReport,
      deviceEvidenceForPass?.value,
      recordingEvidenceResult.value,
    );
    if (recordingEvidenceIssues.length > 0) {
      input.writeStderr(`Could not update D-2 smoke check: ${recordingEvidenceIssues.join('; ')}`);
      return 1;
    }
  }

  try {
    input.writeTextFile(args.value.reportPath, JSON.stringify(updatedReport, null, 2));
  } catch {
    input.writeStderr(`Could not update D-2 smoke check: could not write ${args.value.reportPath}`);
    return 1;
  }

  input.writeStdout(
    `Updated D-2 smoke check ${args.value.checkId} in ${args.value.reportPath}`,
  );
  return 0;
}

function collectPhysicalDeviceSmokePrerequisiteIssues(report: D2DemoSmokeReport): string[] {
  const issues: string[] = [];

  if (!hasPassingCheck(report, 'adb-device-detected')) {
    issues.push(
      'physical pass update requires adb-device-detected pass from qa:d2-demo-android-device-smoke',
    );
  }

  if (!hasPassingCheck(report, 'apk-installed-and-launched')) {
    issues.push(
      'physical pass update requires apk-installed-and-launched pass from qa:d2-demo-android-device-smoke',
    );
  }

  return issues;
}

function hasPassingCheck(report: D2DemoSmokeReport, checkId: D2DemoSmokeCheckId): boolean {
  return report.checks.some((check) => check.id === checkId && check.result === 'pass');
}

function requiresPhysicalDeviceSidecarForPass(check: D2DemoSmokeCheck): boolean {
  return check.result === 'pass' && (
    check.id === 'home-browse-demo-playback' ||
    check.id === 's05-instrument-touch-sound' ||
    check.id === 'recording-event-take-saved' ||
    check.id === 'library-export-playback'
  );
}

function readJsonSidecarForUpdate(
  input: D2DemoSmokeCheckUpdateCommandInput,
  sidecarPath: string | undefined,
  label: string,
): { ok: true; value: unknown } | { ok: false; message: string } {
  if (sidecarPath === undefined) {
    return { ok: false, message: `${label} sidecar path is required` };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(input.readTextFile(sidecarPath)),
    };
  } catch {
    return {
      ok: false,
      message: `Could not read ${label} sidecar: ${sidecarPath}`,
    };
  }
}

function readDay5ProbeForUpdate(
  input: D2DemoSmokeCheckUpdateCommandInput,
  day5ProbePath: string | undefined,
): { ok: true; probe?: unknown } | { ok: false; message: string } {
  if (day5ProbePath === undefined) {
    return { ok: true, probe: undefined };
  }

  try {
    return {
      ok: true,
      probe: JSON.parse(input.readTextFile(day5ProbePath)),
    };
  } catch {
    return {
      ok: false,
      message: `Could not read Day-5 audio probe sidecar: ${day5ProbePath}`,
    };
  }
}

function parseArgs(argv: string[]):
  | { ok: true; value: ParsedArgs }
  | { ok: false; message?: string } {
  const flags = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      return { ok: false };
    }
    flags.set(flag, value);
  }

  const reportPath = flags.get('--report')?.trim();
  const checkId = flags.get('--check')?.trim();
  const result = flags.get('--result')?.trim();
  const notes = flags.get('--notes')?.trim();
  const testedAt = flags.get('--tested-at')?.trim();
  const evidencePath = flags.get('--evidence')?.trim();
  const recordingEvidencePath = flags.get('--recording-evidence')?.trim();
  const day5ProbePath = flags.get('--day5-probe')?.trim();

  if (!reportPath || !checkId || !result || !notes) {
    return { ok: false };
  }

  if (!isD2DemoSmokeCheckId(checkId)) {
    return { ok: false, message: `Could not update D-2 smoke check: unknown check id ${checkId}` };
  }

  if (!isD2DemoSmokeCheckResult(result)) {
    return { ok: false, message: `Could not update D-2 smoke check: invalid result ${result}` };
  }

  return {
    ok: true,
    value: {
      reportPath,
      checkId,
      result,
      notes,
      testedAt,
      evidencePath,
      recordingEvidencePath,
      day5ProbePath,
    },
  };
}

function parseReportForUpdate(input: unknown):
  | { ok: true; report: D2DemoSmokeReport }
  | { ok: false; errors: string[] } {
  if (!isRecord(input)) {
    return { ok: false, errors: ['report must be an object'] };
  }

  const errors: string[] = [];
  if (typeof input.generatedAt !== 'string' || !isIsoTimestamp(input.generatedAt)) {
    errors.push('generatedAt must be an ISO timestamp');
  }
  if (typeof input.testedAt !== 'string' || !isIsoTimestamp(input.testedAt)) {
    errors.push('testedAt must be an ISO timestamp');
  }
  if (typeof input.tester !== 'string' || input.tester.trim().length === 0) {
    errors.push('tester must be a non-empty name');
  }
  if (typeof input.deviceLabel !== 'string' || input.deviceLabel.trim().length === 0) {
    errors.push('deviceLabel must be non-empty');
  }
  if (typeof input.apkPath !== 'string' || input.apkPath.trim().length === 0) {
    errors.push('apkPath must be non-empty');
  }
  if (!Array.isArray(input.checks)) {
    errors.push('checks must be an array');
  }

  const checksInput = Array.isArray(input.checks) ? input.checks : [];
  const checks: D2DemoSmokeCheck[] = [];
  checksInput.forEach((check, index) => {
    if (!isRecord(check)) {
      errors.push(`checks[${index}] must be an object`);
      return;
    }
    if (!isD2DemoSmokeCheckId(check.id)) {
      errors.push(`checks[${index}].id must be a required D-2 smoke check id`);
    }
    if (!isD2DemoSmokeCheckResult(check.result)) {
      errors.push(`checks[${index}].result must be pass, fail, or blocked`);
    }
    if (typeof check.notes !== 'string') {
      errors.push(`checks[${index}].notes must be a string`);
    }

    if (
      isD2DemoSmokeCheckId(check.id) &&
      isD2DemoSmokeCheckResult(check.result) &&
      typeof check.notes === 'string'
    ) {
      checks.push({
        id: check.id,
        result: check.result,
        notes: check.notes,
      });
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    report: {
      generatedAt: input.generatedAt as string,
      testedAt: input.testedAt as string,
      tester: input.tester as string,
      deviceLabel: input.deviceLabel as string,
      apkPath: input.apkPath as string,
      checks,
    },
  };
}

function isD2DemoSmokeCheckId(input: unknown): input is D2DemoSmokeCheckId {
  return (
    typeof input === 'string' &&
    REQUIRED_D2_DEMO_SMOKE_CHECKS.includes(input as D2DemoSmokeCheckId)
  );
}

function isD2DemoSmokeCheckResult(input: unknown): input is D2DemoSmokeCheckResult {
  return input === 'pass' || input === 'fail' || input === 'blocked';
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

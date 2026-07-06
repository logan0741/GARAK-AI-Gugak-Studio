import {
  isEmulatorDeviceLabel,
  isPhysicalDeviceLabel,
  normalizePhysicalDeviceLabelForReport,
} from './physicalDeviceLabel';
import {
  buildDay5AudioEngineDecisionRecordFromProbeRecord,
  parseAudioEngineProbeRecord,
} from '../audio/audioEngineProbeRecord';
import { evaluateAudioEngineProbe } from '../audio/audioEngineEvaluation';
import {
  REQUIRED_D2_DEMO_SMOKE_CHECKS,
  type D2DemoSmokeCheck,
  type D2DemoSmokeCheckId,
  type D2DemoSmokeReport,
} from './d2DemoSmokeTemplateCommand';
import { isIsoTimestamp } from './week1SmokeReportCommand';

type D2DemoSmokeReadinessStatus = 'READY_FOR_D2_DEMO' | 'NOT_READY_FOR_D2_DEMO';

type D2DemoSmokeSummary = {
  status: D2DemoSmokeReadinessStatus;
  reportIssues: string[];
  missingChecks: D2DemoSmokeCheckId[];
  duplicateChecks: D2DemoSmokeCheckId[];
  blockedChecks: D2DemoSmokeCheckId[];
  blockedChecksWithoutNotes: D2DemoSmokeCheckId[];
  failedChecks: D2DemoSmokeCheckId[];
  failedChecksWithoutNotes: D2DemoSmokeCheckId[];
  evidenceStillNeeded: string[];
};

export type D2DemoSmokeReportCommandInput = {
  argv: string[];
  readTextFile: (path: string) => string;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export function runD2DemoSmokeReportCommand(
  input: D2DemoSmokeReportCommandInput,
): number {
  const args = parseD2DemoSmokeReportArgs(input.argv);

  if (!args.ok) {
    input.writeStderr('Usage: npm run qa:d2-demo-smoke-report -- <d2-demo-smoke-report.json> [--evidence <device-evidence.json>] [--recording-evidence <recording-evidence.json>] [--day5-probe <probe-record.json>]');
    return 1;
  }

  let reportInput: unknown;
  try {
    reportInput = JSON.parse(input.readTextFile(args.reportPath));
  } catch {
    input.writeStderr(`Could not read D-2 demo smoke report: ${args.reportPath}`);
    return 1;
  }

  const deviceEvidenceResult = readDeviceEvidenceInput(input, args.evidencePath);
  const recordingEvidenceResult = readRecordingEvidenceInput(input, args.recordingEvidencePath);
  const parseResult = parseD2DemoSmokeReport(reportInput);
  if (!parseResult.ok) {
    input.writeStdout(formatD2DemoSmokeSummary({
      status: 'NOT_READY_FOR_D2_DEMO',
      reportIssues: [
        ...parseResult.errors,
        ...deviceEvidenceResult.reportIssues,
        ...recordingEvidenceResult.reportIssues,
      ],
      missingChecks: [...REQUIRED_D2_DEMO_SMOKE_CHECKS],
      duplicateChecks: [],
      blockedChecks: [],
      blockedChecksWithoutNotes: [],
      failedChecks: [],
      failedChecksWithoutNotes: [],
      evidenceStillNeeded: [],
    }));
    return 1;
  }

  const day5ProbeResult = shouldReadDay5ProbeSidecar(parseResult.report, args.day5ProbePath)
    ? readDay5ProbeInput(input, args.day5ProbePath)
    : { reportIssues: [] };
  const summary = summarizeD2DemoSmokeReport(
    parseResult.report,
    [
      ...parseResult.reportIssues,
      ...deviceEvidenceResult.reportIssues,
      ...recordingEvidenceResult.reportIssues,
      ...day5ProbeResult.reportIssues,
    ],
    deviceEvidenceResult.evidence,
    recordingEvidenceResult.evidence,
    day5ProbeResult.probe,
    args.day5ProbePath,
  );
  input.writeStdout(formatD2DemoSmokeSummary(summary));
  return summary.status === 'READY_FOR_D2_DEMO' ? 0 : 1;
}

function shouldReadDay5ProbeSidecar(
  report: D2DemoSmokeReport,
  day5ProbePath: string | undefined,
): day5ProbePath is string {
  return day5ProbePath !== undefined && (report.checks as unknown[]).some((check) =>
    readRequiredCheckId(check) === 'day5-expo-audio-probe-updated' &&
    readCheckResult(check) === 'pass'
  );
}

function parseD2DemoSmokeReportArgs(
  argv: string[],
): {
  ok: true;
  reportPath: string;
  evidencePath?: string;
  recordingEvidencePath?: string;
  day5ProbePath?: string;
} | { ok: false } {
  const [reportPath, ...rest] = argv;

  if (!reportPath) {
    return { ok: false };
  }

  let evidencePath: string | undefined;
  let recordingEvidencePath: string | undefined;
  let day5ProbePath: string | undefined;
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value !== '--evidence' && value !== '--recording-evidence' && value !== '--day5-probe') {
      return { ok: false };
    }

    const nextValue = rest[index + 1];
    if (!nextValue || nextValue.startsWith('--')) {
      return { ok: false };
    }
    if (value === '--evidence') {
      evidencePath = nextValue;
    } else if (value === '--recording-evidence') {
      recordingEvidencePath = nextValue;
    } else {
      day5ProbePath = nextValue;
    }
    index += 1;
  }

  return { ok: true, reportPath, evidencePath, recordingEvidencePath, day5ProbePath };
}

function readDeviceEvidenceInput(
  input: D2DemoSmokeReportCommandInput,
  evidencePath: string | undefined,
): { evidence?: unknown; reportIssues: string[] } {
  if (!evidencePath) {
    return { reportIssues: [] };
  }

  try {
    return {
      evidence: JSON.parse(input.readTextFile(evidencePath)),
      reportIssues: [],
    };
  } catch {
    return {
      reportIssues: [`Could not read D-2 device evidence sidecar: ${evidencePath}`],
    };
  }
}

function readRecordingEvidenceInput(
  input: D2DemoSmokeReportCommandInput,
  recordingEvidencePath: string | undefined,
): { evidence?: unknown; reportIssues: string[] } {
  if (!recordingEvidencePath) {
    return { reportIssues: [] };
  }

  try {
    return {
      evidence: JSON.parse(input.readTextFile(recordingEvidencePath)),
      reportIssues: [],
    };
  } catch {
    return {
      reportIssues: [`Could not read D-2 recording evidence sidecar: ${recordingEvidencePath}`],
    };
  }
}

function readDay5ProbeInput(
  input: D2DemoSmokeReportCommandInput,
  day5ProbePath: string | undefined,
): { probe?: unknown; reportIssues: string[] } {
  if (!day5ProbePath) {
    return { reportIssues: [] };
  }

  try {
    return {
      probe: JSON.parse(input.readTextFile(day5ProbePath)),
      reportIssues: [],
    };
  } catch {
    return {
      reportIssues: [`Could not read Day-5 audio probe sidecar: ${day5ProbePath}`],
    };
  }
}

function parseD2DemoSmokeReport(
  input: unknown,
):
  | { ok: true; report: D2DemoSmokeReport; reportIssues: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, errors: ['report must be an object'] };
  }

  if (!isIsoTimestamp(input.generatedAt)) {
    errors.push('generatedAt must be an ISO timestamp');
  }

  if (!isIsoTimestamp(input.testedAt)) {
    errors.push('testedAt must be an ISO timestamp');
  }

  if (typeof input.tester !== 'string' || input.tester.trim().length === 0) {
    errors.push('tester must be a non-empty name');
  }

  if (!isPhysicalDeviceLabel(input.deviceLabel)) {
    errors.push('deviceLabel must name the physical device');
  }

  if (typeof input.apkPath !== 'string' || input.apkPath.trim().length === 0) {
    errors.push('apkPath must be non-empty');
  }

  if (!Array.isArray(input.checks)) {
    return { ok: false, errors: [...errors, 'checks must be an array'] };
  }

  return { ok: true, report: input as D2DemoSmokeReport, reportIssues: errors };
}

function summarizeD2DemoSmokeReport(
  report: D2DemoSmokeReport,
  preflightReportIssues: string[] = [],
  deviceEvidence?: unknown,
  recordingEvidence?: unknown,
  day5Probe?: unknown,
  day5ProbePath?: string,
): D2DemoSmokeSummary {
  const checks = report.checks as unknown[];
  const reportIssues = [
    ...preflightReportIssues,
    ...collectCheckShapeIssues(checks),
    ...collectAutomatedEvidenceIssues(checks),
    ...collectDeviceSidecarEvidenceIssues(report, deviceEvidence),
    ...collectRecordingSidecarEvidenceIssues(report, deviceEvidence, recordingEvidence),
    ...collectDay5ProbeSidecarEvidenceIssues(report, day5Probe, day5ProbePath),
    ...collectManualPassEvidenceIssues(checks, report.deviceLabel),
  ];
  const checkIds = checks
    .map(readRequiredCheckId)
    .filter(isRequiredD2DemoSmokeCheckId);
  const missingChecks = REQUIRED_D2_DEMO_SMOKE_CHECKS.filter((id) => !checkIds.includes(id));
  const duplicateChecks = collectDuplicateChecks(checkIds);
  const blockedChecks = checks
    .filter((check) => readCheckResult(check) === 'blocked')
    .map(readRequiredCheckId)
    .filter(isRequiredD2DemoSmokeCheckId);
  const blockedChecksWithoutNotes = checks
    .filter((check) => readCheckResult(check) === 'blocked' && readCheckNotes(check).trim().length === 0)
    .map(readRequiredCheckId)
    .filter(isRequiredD2DemoSmokeCheckId);
  const failedChecks = checks
    .filter((check) => readCheckResult(check) === 'fail')
    .map(readRequiredCheckId)
    .filter(isRequiredD2DemoSmokeCheckId);
  const failedChecksWithoutNotes = checks
    .filter((check) => readCheckResult(check) === 'fail' && readCheckNotes(check).trim().length === 0)
    .map(readRequiredCheckId)
    .filter(isRequiredD2DemoSmokeCheckId);
  const evidenceStillNeeded = collectEvidenceStillNeeded(blockedChecks, reportIssues);
  const status =
    reportIssues.length === 0 &&
    missingChecks.length === 0 &&
    duplicateChecks.length === 0 &&
    blockedChecks.length === 0 &&
    failedChecks.length === 0
      ? 'READY_FOR_D2_DEMO'
      : 'NOT_READY_FOR_D2_DEMO';

  return {
    status,
    reportIssues,
    missingChecks,
    duplicateChecks,
    blockedChecks,
    blockedChecksWithoutNotes,
    failedChecks,
    failedChecksWithoutNotes,
    evidenceStillNeeded,
  };
}

function collectEvidenceStillNeeded(
  blockedChecks: D2DemoSmokeCheckId[],
  reportIssues: string[],
): string[] {
  return [
    ...blockedChecks.map(formatEvidencePromptForBlockedCheck),
    ...collectEvidencePromptsForReportIssues(reportIssues),
  ];
}

function collectEvidencePromptsForReportIssues(reportIssues: string[]): string[] {
  const prompts = new Set<string>();

  for (const issue of reportIssues) {
    if (
      issue.includes('apk-installed-and-launched pass requires --evidence') ||
      issue.includes('device evidence sidecar testedAt must be at or after') ||
      issue.includes('device evidence sidecar must confirm GARAK app UI loaded')
    ) {
      prompts.add(
        'device-evidence: rerun qa:d2-demo-android-device-smoke on the physical device with --report and --evidence after Metro/dev-client is running',
      );
    }

    if (
      issue.includes('recording-event-take-saved pass with event-only fallback requires --recording-evidence') ||
      issue.includes('recording-event-take-saved pass with capture URI requires --recording-evidence') ||
      issue.includes('recording evidence sidecar collectedAt must be at or after')
    ) {
      prompts.add(
        'recording-evidence: rerun qa:d2-demo-android-recording-evidence after S05/S09 recording playback using the current device sidecar',
      );
    }

    if (
      issue.includes('day5-expo-audio-probe-updated pass requires --day5-probe') ||
      issue.includes('Day-5 probe sidecar expo-audio physical-device measuredAt must be at or after')
    ) {
      prompts.add(
        'day5-probe: regenerate expo-audio physical-device probe evidence with qa:d2-expo-audio-probe-record or prototype probe record',
      );
    }
  }

  return [...prompts];
}

function formatEvidencePromptForBlockedCheck(checkId: D2DemoSmokeCheckId): string {
  switch (checkId) {
    case 'short-ascii-android-build':
      return 'short-ascii-android-build: rebuild with npm run qa:d2-demo-android-build -- C:\\gsb and record APK path/size';
    case 'adb-device-detected':
      return 'adb-device-detected: connect the presentation device with USB debugging and rerun device smoke';
    case 'apk-installed-and-launched':
      return 'apk-installed-and-launched: install/launch the APK with device smoke and collect --evidence sidecar';
    case 'home-browse-demo-playback':
      return 'home-browse-demo-playback: human must confirm Home/S20/S19 bundled playback is audible on the device speaker';
    case 's05-instrument-touch-sound':
      return 's05-instrument-touch-sound: human must confirm at least three S05 selected-instrument taps are audible and no taps are silent';
    case 'recording-event-take-saved':
      return 'recording-event-take-saved: confirm saved S05/S09 work/take and capture URI sidecar or visible event-only fallback';
    case 'library-export-playback':
      return 'library-export-playback: human must confirm S18/S19 exported item playback is audible on the device speaker and note event replay/이벤트 녹음 provenance plus a positive source event count for the instrument-only export path';
    case 'day5-expo-audio-probe-updated':
      return 'day5-expo-audio-probe-updated: generate or copy expo-audio physical-device probe evidence and validate it with --day5-probe; direct path: qa:d2-expo-audio-probe-record -- --output docs/qa/day-5-audio-engine-probes.real-device.json';
  }
}

function collectAutomatedEvidenceIssues(checks: unknown[]): string[] {
  return checks.flatMap((check) => {
    if (readCheckResult(check) !== 'pass') {
      return [];
    }

    const checkId = readRequiredCheckId(check);
    const checkNotes = readCheckNotes(check).trim();

    if (
      checkId === 'adb-device-detected' &&
      !/^ADB device \S+ .+/.test(checkNotes)
    ) {
      return ['adb-device-detected pass must be written by the adb device smoke command'];
    }

    if (
      checkId === 'apk-installed-and-launched' &&
      !/^Installed .+ and launched .+\/.+; confirmed process pid \d+(?:\s+\d+)*$/.test(checkNotes)
    ) {
      return [
        'apk-installed-and-launched pass must include confirmed app process pid from the adb device smoke command',
      ];
    }

    return [];
  });
}

function collectDeviceSidecarEvidenceIssues(
  report: D2DemoSmokeReport,
  deviceEvidence: unknown,
): string[] {
  const launchCheck = (report.checks as unknown[]).find((check) =>
    readRequiredCheckId(check) === 'apk-installed-and-launched' &&
    readCheckResult(check) === 'pass'
  );
  const adbDeviceCheck = (report.checks as unknown[]).find((check) =>
    readRequiredCheckId(check) === 'adb-device-detected' &&
    readCheckResult(check) === 'pass'
  );

  if (!launchCheck) {
    return [];
  }

  const launchNotes = readCheckNotes(launchCheck).trim();
  const launchEvidence = readLaunchPassEvidence(launchNotes);
  const adbDeviceEvidence = readAdbDevicePassEvidence(
    readCheckNotes(adbDeviceCheck).trim(),
  );

  if (deviceEvidence === undefined) {
    return [
      'apk-installed-and-launched pass requires --evidence device sidecar with foreground and logcat evidence',
    ];
  }

  if (!isRecord(deviceEvidence)) {
    return ['device evidence sidecar must be an object'];
  }

  const issues: string[] = [];
  const automatedEvidence = isRecord(deviceEvidence.automatedEvidence)
    ? deviceEvidence.automatedEvidence
    : {};
  const logcatScan = isRecord(deviceEvidence.logcatRuntimeErrorScan)
    ? deviceEvidence.logcatRuntimeErrorScan
    : {};

  if (deviceEvidence.targetKind !== 'physical') {
    issues.push('device evidence sidecar targetKind must be physical');
  }

  if (
    deviceEvidence.targetKind === 'emulator' ||
    isEmulatorDeviceLabel(readStringField(deviceEvidence, 'adbSerial')) ||
    isEmulatorDeviceLabel(readStringField(deviceEvidence, 'adbDetails'))
  ) {
    issues.push(
      'device evidence sidecar must be from a physical Android presentation device, not an emulator',
    );
    return issues;
  }

  if (
    adbDeviceEvidence &&
    readStringField(deviceEvidence, 'adbSerial') !== adbDeviceEvidence.adbSerial
  ) {
    issues.push('device evidence sidecar adbSerial must match adb-device-detected notes');
  }

  if (
    adbDeviceEvidence &&
    readNormalizedSpaceStringField(deviceEvidence, 'adbDetails') !== adbDeviceEvidence.adbDetails
  ) {
    issues.push('device evidence sidecar adbDetails must match adb-device-detected notes');
  }

  const deviceEvidenceTestedAt = readStringField(deviceEvidence, 'testedAt');
  if (!isIsoTimestamp(deviceEvidenceTestedAt)) {
    issues.push('device evidence sidecar testedAt must be an ISO timestamp');
  } else if (
    isIsoTimestamp(report.testedAt) &&
    Date.parse(deviceEvidenceTestedAt) < Date.parse(report.testedAt)
  ) {
    issues.push('device evidence sidecar testedAt must be at or after the smoke report testedAt');
  }

  if (readStringField(deviceEvidence, 'apkPath') !== report.apkPath) {
    issues.push('device evidence sidecar apkPath must match the smoke report apkPath');
  }

  if (
    launchEvidence &&
    launchEvidence.installedApkPath !== report.apkPath
  ) {
    issues.push('apk-installed-and-launched pass installed APK path must match the smoke report apkPath');
  }

  if (
    launchEvidence &&
    readNormalizedSpaceStringField(deviceEvidence, 'processPid') !== launchEvidence.processPid
  ) {
    issues.push('device evidence sidecar processPid must match the smoke report process pid');
  }

  if (
    launchEvidence &&
    readStringField(deviceEvidence, 'launchTarget') !== launchEvidence.launchTarget
  ) {
    issues.push('device evidence sidecar launchTarget must match the smoke report launch target');
  }

  if (!readStringField(deviceEvidence, 'packagePath').startsWith('package:')) {
    issues.push('device evidence sidecar must include resolved pm path');
  }

  if (readStringField(deviceEvidence, 'foregroundWindow').length === 0) {
    issues.push('device evidence sidecar must include foreground activity/window evidence');
  }

  if (![
    'adbDeviceDetected',
    'apkInstallCommandSucceeded',
    'launchCommandSucceeded',
    'appProcessRunning',
    'packagePathResolved',
    'foregroundWindowMentionsPackage',
    'logcatRuntimeErrorWindowClean',
  ].every((field) => automatedEvidence[field] === true)) {
    issues.push(
      'device evidence sidecar automated evidence must confirm adb, install, launch, process, package path, foreground package, and clean runtime logcat',
    );
  }

  if (automatedEvidence.appUiLoaded !== true) {
    issues.push(
      'device evidence sidecar must confirm GARAK app UI loaded instead of Expo Dev Launcher; rerun qa:d2-demo-android-device-smoke with --dev-client-url http://127.0.0.1:8081 after Metro is running',
    );
  }

  if (
    logcatScan.clearedBeforeLaunch !== true ||
    logcatScan.matchingLineCount !== 0 ||
    !Array.isArray(logcatScan.matchingLines) ||
    logcatScan.matchingLines.length !== 0
  ) {
    issues.push('device evidence sidecar logcat runtime error scan must be clean');
  }

  return issues;
}

export function validateD2DemoSmokeDeviceEvidence(
  report: D2DemoSmokeReport,
  deviceEvidence: unknown,
): string[] {
  return collectDeviceSidecarEvidenceIssues(report, deviceEvidence);
}

function collectRecordingSidecarEvidenceIssues(
  report: D2DemoSmokeReport,
  deviceEvidence: unknown,
  recordingEvidence: unknown,
): string[] {
  const recordingCheck = (report.checks as unknown[]).find((check) =>
    readRequiredCheckId(check) === 'recording-event-take-saved' &&
    readCheckResult(check) === 'pass'
  );

  if (!recordingCheck) {
    return [];
  }

  const recordingNotes = readCheckNotes(recordingCheck);
  const captureUri = readCaptureUriFromRecordingNotes(recordingNotes);
  if (captureUri === undefined) {
    if (!hasEventOnlyFallbackEvidence(recordingNotes)) {
      return [];
    }

    if (recordingEvidence === undefined) {
      return [
        'recording-event-take-saved pass with event-only fallback requires --recording-evidence sidecar with event-only metadata',
      ];
    }

    if (!isRecord(recordingEvidence)) {
      return ['recording evidence sidecar must be an object'];
    }

    return [
      ...collectRecordingSidecarFreshnessIssues(report, recordingEvidence),
      ...collectEventOnlyRecordingSidecarEvidenceIssues(recordingEvidence, deviceEvidence),
    ];
  }

  if (recordingEvidence === undefined) {
    return [
      'recording-event-take-saved pass with capture URI requires --recording-evidence sidecar with matching URI, package, file existence, and size',
    ];
  }

  if (!isRecord(recordingEvidence)) {
    return ['recording evidence sidecar must be an object'];
  }

  const issues: string[] = collectRecordingSidecarFreshnessIssues(report, recordingEvidence);
  const evidenceRecordingUri = readStringField(recordingEvidence, 'recordingUri');
  const evidencePackageName = readStringField(recordingEvidence, 'packageName');
  const devicePackageName = isRecord(deviceEvidence)
    ? readStringField(deviceEvidence, 'packageName')
    : '';

  if (evidenceRecordingUri !== captureUri) {
    issues.push(
      'recording evidence sidecar recordingUri must match the capture URI in recording-event-take-saved notes',
    );
  }

  if (evidencePackageName.length === 0) {
    issues.push('recording evidence sidecar packageName must be non-empty');
  } else if (devicePackageName.length > 0 && evidencePackageName !== devicePackageName) {
    issues.push('recording evidence sidecar packageName must match device evidence packageName');
  }

  if (recordingEvidence.exists !== true) {
    issues.push('recording evidence sidecar must confirm the captured file exists');
  }

  if (!isPositiveFiniteNumber(recordingEvidence.sizeBytes)) {
    issues.push('recording evidence sidecar must report a captured file size greater than 0 bytes');
  }

  return issues;
}

export function validateD2DemoSmokeRecordingEvidence(
  report: D2DemoSmokeReport,
  deviceEvidence: unknown,
  recordingEvidence: unknown,
): string[] {
  return collectRecordingSidecarEvidenceIssues(report, deviceEvidence, recordingEvidence);
}

function collectRecordingSidecarFreshnessIssues(
  report: D2DemoSmokeReport,
  recordingEvidence: Record<string, unknown>,
): string[] {
  const collectedAt = readStringField(recordingEvidence, 'collectedAt');

  if (!isIsoTimestamp(collectedAt)) {
    return ['recording evidence sidecar collectedAt must be an ISO timestamp'];
  }

  return isIsoTimestamp(report.testedAt) &&
    Date.parse(collectedAt) < Date.parse(report.testedAt)
    ? ['recording evidence sidecar collectedAt must be at or after the smoke report testedAt']
    : [];
}

function collectEventOnlyRecordingSidecarEvidenceIssues(
  recordingEvidence: Record<string, unknown>,
  deviceEvidence: unknown,
): string[] {
  const issues: string[] = [];
  const evidencePackageName = readStringField(recordingEvidence, 'packageName');
  const devicePackageName = isRecord(deviceEvidence)
    ? readStringField(deviceEvidence, 'packageName')
    : '';

  if (evidencePackageName.length === 0) {
    issues.push('event-only recording evidence sidecar packageName must be non-empty');
  } else if (devicePackageName.length > 0 && evidencePackageName !== devicePackageName) {
    issues.push(
      'event-only recording evidence sidecar packageName must match device evidence packageName',
    );
  }

  if (readStringField(recordingEvidence, 'recordingMode') !== 'event-only') {
    issues.push('event-only recording evidence sidecar recordingMode must be event-only');
  }

  const evidenceStatus = readStringField(recordingEvidence, 'status');
  if (evidenceStatus.length > 0 && evidenceStatus !== 'pass') {
    issues.push('event-only recording evidence sidecar status must be pass when present');
  }

  if (readStringField(recordingEvidence, 'recordingUri').length > 0) {
    issues.push(
      'recording evidence sidecar must not claim captured audio when recording-event-take-saved notes use event-only fallback',
    );
  }

  if (recordingEvidence.exists !== false) {
    issues.push('event-only recording evidence sidecar must not confirm a captured file exists');
  }

  if (recordingEvidence.sizeBytes !== 0) {
    issues.push('event-only recording evidence sidecar sizeBytes must be 0');
  }

  issues.push(...collectEventOnlyRecordingAudioEvidenceIssues(recordingEvidence, deviceEvidence));

  return issues;
}

function collectEventOnlyRecordingAudioEvidenceIssues(
  recordingEvidence: Record<string, unknown>,
  deviceEvidence: unknown,
): string[] {
  const audioEvidence = recordingEvidence.audioEvidence;
  if (!isRecord(audioEvidence)) {
    return ['event-only recording evidence sidecar audioEvidence must be an object'];
  }

  const issues: string[] = [];
  const appProcessPid = readNormalizedSpaceStringField(audioEvidence, 'appProcessPid');
  const deviceProcessPid = isRecord(deviceEvidence)
    ? readNormalizedSpaceStringField(deviceEvidence, 'processPid')
    : '';

  if (appProcessPid.length === 0) {
    issues.push('event-only recording evidence sidecar audioEvidence.appProcessPid must be non-empty');
  } else if (
    deviceProcessPid.length > 0 &&
    !areProcessPidsCoveredByDeviceEvidence(appProcessPid, deviceProcessPid)
  ) {
    issues.push(
      'event-only recording evidence sidecar audioEvidence.appProcessPid must match device evidence processPid',
    );
  }

  if (!isPositiveFiniteNumber(audioEvidence.appAudioTrackStartedCount)) {
    issues.push('event-only recording evidence sidecar must show app AudioTrack playback output');
  }

  if (!isPositiveFiniteNumber(audioEvidence.appRecordingActiveFalseCount)) {
    issues.push(
      'event-only recording evidence sidecar must show playback stayed non-recording for the app process',
    );
  }

  if (audioEvidence.appAudioInputStartedCount !== 0) {
    issues.push('event-only recording evidence sidecar must show zero app audio input starts');
  }

  if (audioEvidence.recordAudioAppOpsRefreshedDuringRun !== false) {
    issues.push(
      'event-only recording evidence sidecar must show RECORD_AUDIO appops did not refresh during the run',
    );
  }

  return issues;
}

function areProcessPidsCoveredByDeviceEvidence(
  appProcessPid: string,
  deviceProcessPid: string,
): boolean {
  const appPids = appProcessPid.split(' ').filter((pid) => pid.length > 0);
  const devicePids = new Set(deviceProcessPid.split(' ').filter((pid) => pid.length > 0));

  return appPids.length > 0 && appPids.every((pid) => devicePids.has(pid));
}

function collectDay5ProbeSidecarEvidenceIssues(
  report: D2DemoSmokeReport,
  day5Probe: unknown,
  day5ProbePath: string | undefined,
): string[] {
  const day5Check = (report.checks as unknown[]).find((check) =>
    readRequiredCheckId(check) === 'day5-expo-audio-probe-updated' &&
    readCheckResult(check) === 'pass'
  );

  if (!day5Check) {
    return [];
  }

  if (day5Probe === undefined) {
    if (day5ProbePath !== undefined) {
      return [];
    }

    return [
      'day5-expo-audio-probe-updated pass requires --day5-probe probe record with matching physical-device expo-audio evidence',
    ];
  }

  const parseResult = parseAudioEngineProbeRecord(day5Probe);
  if (!parseResult.ok) {
    return parseResult.errors.map((error) => `Day-5 probe sidecar invalid: ${error}`);
  }

  const issues: string[] = [];
  const reportDeviceLabel = normalizePhysicalDeviceLabelForReport(report.deviceLabel);
  const matchingExpoProbe = parseResult.record.probes.find((probe) =>
    probe.candidate === 'expo-audio' &&
    probe.evidenceSource === 'physical-device' &&
    normalizePhysicalDeviceLabelForReport(probe.deviceLabel) === reportDeviceLabel
  );

  if (!matchingExpoProbe) {
    issues.push(
      `Day-5 probe sidecar must include an expo-audio physical-device probe for ${report.deviceLabel}`,
    );
  } else {
    const expoEvaluation = evaluateAudioEngineProbe(matchingExpoProbe);
    if (expoEvaluation.decision !== 'PASS' && expoEvaluation.decision !== 'PASS_WITH_LIMITS') {
      issues.push(
        'Day-5 probe sidecar expo-audio physical-device probe must evaluate to PASS or PASS_WITH_LIMITS for D-2 scoped evidence',
      );
    }

    if (!hasPhysicalDeviceMeasurementContext(matchingExpoProbe.measurementNotes, report.deviceLabel)) {
      issues.push(
        'Day-5 probe sidecar expo-audio physical-device probe must include measurementNotes with physical-device measurement context',
      );
    }

    if (
      isIsoTimestamp(report.testedAt) &&
      Date.parse(matchingExpoProbe.measuredAt) < Date.parse(report.testedAt)
    ) {
      issues.push(
        'Day-5 probe sidecar expo-audio physical-device measuredAt must be at or after the smoke report testedAt',
      );
    }
  }

  const day5Notes = readCheckNotes(day5Check);
  const decisionRecord = buildDay5AudioEngineDecisionRecordFromProbeRecord(parseResult.record);
  if (hasFinalDay5AudioEvidence(day5Notes) && decisionRecord.status !== 'FINAL_ENGINE_SELECTED') {
    issues.push(
      'day5-expo-audio-probe-updated final Day-5 notes must match --day5-probe status FINAL_ENGINE_SELECTED',
    );
  }
  if (
    hasD2ScopedExpoAudioEvidence(day5Notes) &&
    (
      decisionRecord.status !== 'INCOMPLETE_DEVICE_EVIDENCE' ||
      !decisionRecord.missingCandidates.includes('react-native-audio-api')
    )
  ) {
    issues.push(
      'day5-expo-audio-probe-updated D-2 scoped notes must match --day5-probe status INCOMPLETE_DEVICE_EVIDENCE with missing react-native-audio-api',
    );
  }
  if (
    day5ProbePath !== undefined &&
    !normalizePhysicalDeviceLabelForReport(day5Notes).includes(
      normalizePhysicalDeviceLabelForReport(day5ProbePath),
    )
  ) {
    issues.push('day5-expo-audio-probe-updated pass notes must name the --day5-probe file path');
  }

  return issues;
}

export function validateD2DemoSmokeDay5ProbeEvidence(
  report: D2DemoSmokeReport,
  day5Probe: unknown,
  day5ProbePath: string | undefined,
): string[] {
  return collectDay5ProbeSidecarEvidenceIssues(report, day5Probe, day5ProbePath);
}

function hasPhysicalDeviceMeasurementContext(
  measurementNotes: string | undefined,
  reportDeviceLabel: string,
): boolean {
  if (measurementNotes === undefined || measurementNotes.trim().length === 0) {
    return false;
  }

  return normalizedNotesIncludeDeviceLabel(measurementNotes, reportDeviceLabel) &&
    hasAnyEvidence(measurementNotes, [/\b(real-device|physical-device)\b/i]) &&
    hasAnyEvidence(measurementNotes, [
      /\b(AudioTrack|latency|tap|touch|probe|smoke|qa:day5-audio)\b/i,
    ]);
}

function readLaunchPassEvidence(
  notes: string,
): { installedApkPath: string; launchTarget: string; processPid: string } | undefined {
  const match = notes.match(
    /^Installed (.+) and launched (.+\/.+); confirmed process pid (\d+(?:\s+\d+)*)$/,
  );

  return match
    ? {
        installedApkPath: match[1].trim(),
        launchTarget: match[2],
        processPid: normalizeWhitespace(match[3]),
      }
    : undefined;
}

function readAdbDevicePassEvidence(
  notes: string,
): { adbSerial: string; adbDetails: string } | undefined {
  const match = notes.match(/^ADB device (\S+) (.+)$/);

  return match
    ? {
        adbSerial: match[1],
        adbDetails: normalizeWhitespace(match[2]),
      }
    : undefined;
}

function readStringField(input: Record<string, unknown>, field: string): string {
  const value = input[field];
  return typeof value === 'string' ? value.trim() : '';
}

function readNormalizedSpaceStringField(input: Record<string, unknown>, field: string): string {
  return normalizeWhitespace(readStringField(input, field));
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function readCaptureUriFromRecordingNotes(notes: string): string | undefined {
  const match = notes.match(/\b(?:file|content):\/\/\S+/i);
  return match ? trimTrailingUriPunctuation(match[0]) : undefined;
}

function trimTrailingUriPunctuation(uri: string): string {
  return uri.replace(/[),.;]+$/g, '');
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function collectManualPassEvidenceIssues(checks: unknown[], reportDeviceLabel: string): string[] {
  return checks.flatMap((check) => {
    if (readCheckResult(check) !== 'pass') {
      return [];
    }

    const checkId = readRequiredCheckId(check);
    const checkNotes = readCheckNotes(check).trim();

    switch (checkId) {
      case 'home-browse-demo-playback':
        if (!hasAllEvidence(checkNotes, [/\b(Home|S20|Share|Browse|S19)\b/i, /\b(device|speaker|Galaxy|Android)\b/i])) {
          return ['home-browse-demo-playback pass must name the screen path and audible device result'];
        }

        if (!hasHomeBrowseDemoPlayerPathEvidence(checkNotes)) {
          return [
            'home-browse-demo-playback pass must name the Home/Browse to S20/S19 demo or bundled player path',
          ];
        }

        return hasPositiveAudibleEvidence(checkNotes)
          ? []
          : ['home-browse-demo-playback pass must name a positive audible device result'];
      case 's05-instrument-touch-sound':
        if (!hasAllEvidence(checkNotes, [/\bS05\b/i, /\b(tap|tapped|touch|instrument|zone)\b/i])) {
          return ['s05-instrument-touch-sound pass must name S05, the instrument tap, and audible result'];
        }

        if (!hasPositiveS05AudibleEvidence(checkNotes)) {
          return ['s05-instrument-touch-sound pass must name a positive audible result'];
        }

        if (!hasAtLeastThreeTapOrZoneEvidence(checkNotes)) {
          return [
            's05-instrument-touch-sound pass must confirm at least three audible taps or zones',
          ];
        }

        return hasPerTapAudibleEvidence(checkNotes)
          ? []
          : [
              's05-instrument-touch-sound pass must confirm each tap was audible or no taps were silent',
            ];
      case 'recording-event-take-saved':
        if (!hasAllEvidence(checkNotes, [/\b(work|track|take)-?\w*/i, /\b(saved|created|recorded)\b/i])) {
          return ['recording-event-take-saved pass must name the saved work/take evidence'];
        }

        return hasAllEvidence(checkNotes, [/\b(S05|S09)\b/i]) &&
          (hasRecordingCaptureUriEvidence(checkNotes) || hasEventOnlyFallbackEvidence(checkNotes))
          ? []
          : [
              'recording-event-take-saved pass must name S05/S09, saved work/take evidence, and capture URI or event-only fallback',
            ];
      case 'library-export-playback':
        if (!hasAllEvidence(checkNotes, [/\b(S18|S19|library|export)/i, /\b(device|speaker|Galaxy|Android)\b/i])) {
          return ['library-export-playback pass must name the S18/S19 library playback path and audible result'];
        }

        if (!hasPositiveAudibleEvidence(checkNotes)) {
          return ['library-export-playback pass must name a positive audible device result'];
        }

        if (!hasEventReplayExportPlaybackProvenanceEvidence(checkNotes)) {
          return [
            'library-export-playback pass must name event replay/이벤트 녹음 provenance for the instrument-only export playback path',
          ];
        }

        return hasPositiveEventReplaySourceEventCountEvidence(checkNotes)
          ? []
          : [
              'library-export-playback pass must name a positive event replay source event count for the instrument-only export playback path',
            ];
      case 'day5-expo-audio-probe-updated':
        return hasDay5ExpoAudioEvidence(checkNotes, reportDeviceLabel)
          ? []
          : [
              'day5-expo-audio-probe-updated pass must include probe file, smoke device label, qa:day5-audio exit/status, and D-2 or final Day-5 scope',
            ];
      default:
        return [];
    }
  });
}

export function validateD2DemoSmokeManualCheckEvidence(
  check: D2DemoSmokeCheck,
  reportDeviceLabel: string,
): string[] {
  return collectManualPassEvidenceIssues([check], reportDeviceLabel);
}

function hasAllEvidence(notes: string, patterns: RegExp[]): boolean {
  return patterns.every((pattern) => pattern.test(notes));
}

function hasAnyEvidence(notes: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(notes));
}

function hasHomeBrowseDemoPlayerPathEvidence(notes: string): boolean {
  return hasAllEvidence(notes, [
    /\b(Home|Browse)\b/i,
    /\b(S20|S19|share player|shared? feed|demo player|My Arirang)\b/i,
    /\b(demo|bundled|My Arirang)\b/i,
  ]);
}

function hasRecordingCaptureUriEvidence(notes: string): boolean {
  return (
    hasAnyEvidence(notes, [/\b(recordingUri|recording uri|capture URI|captured audio|audio capture)\b/i]) &&
    /\b(file|content):\/\/\S+/i.test(notes)
  );
}

function hasEventOnlyFallbackEvidence(notes: string): boolean {
  return (
    /\bevent[- ]only\b/i.test(notes) &&
    hasAnyEvidence(notes, [/\bfallback\b/i, /\blabel\b/i, /\bvisible\b/i, /\bUI\b/])
  );
}

function hasAtLeastThreeTapOrZoneEvidence(notes: string): boolean {
  return hasAnyEvidence(notes, [
    /\b(3|[4-9]|\d{2,}|three|four|five|six|seven|eight|nine|ten)\b.{0,32}\b(taps?|tapped|touches|zones?|pads?|strings?)\b/i,
    /\b(taps?|tapped|touches|zones?|pads?|strings?)\b.{0,32}\b(3|[4-9]|\d{2,}|three|four|five|six|seven|eight|nine|ten)\b/i,
  ]);
}

function hasPerTapAudibleEvidence(notes: string): boolean {
  return hasAnyEvidence(notes, [
    /\b(each|every|all)\b.{0,32}\b(taps?|touches|zones?|pads?|strings?)\b.{0,32}\baudible\b/i,
    /\b(taps?|touches|zones?|pads?|strings?)\b.{0,32}\b(each|every|all)\b.{0,32}\baudible\b/i,
  ]) || hasNoSilentTapEvidence(notes);
}

function hasDay5ExpoAudioEvidence(notes: string, reportDeviceLabel: string): boolean {
  return hasAllEvidence(notes, [
    /expo-audio/i,
    /\b(real-device|physical-device)\b/i,
    /\b(probe|\.json)\b/i,
    /qa:day5-audio/i,
  ]) &&
    normalizedNotesIncludeDeviceLabel(notes, reportDeviceLabel) &&
    (hasFinalDay5AudioEvidence(notes) || hasD2ScopedExpoAudioEvidence(notes));
}

function normalizedNotesIncludeDeviceLabel(notes: string, reportDeviceLabel: string): boolean {
  return normalizePhysicalDeviceLabelForReport(notes).includes(
    normalizePhysicalDeviceLabelForReport(reportDeviceLabel),
  );
}

function hasFinalDay5AudioEvidence(notes: string): boolean {
  return hasAllEvidence(notes, [
    /\b(exit|exited|exit code)\s*0\b/i,
    /\bFINAL_ENGINE_SELECTED\b/i,
  ]);
}

function hasD2ScopedExpoAudioEvidence(notes: string): boolean {
  return hasAllEvidence(notes, [
    /\b(exit|exited|exit code)\s*[1-9]\d*\b|\bnon[- ]?zero\b/i,
    /\bINCOMPLETE_DEVICE_EVIDENCE\b/i,
    /\b(missing\s+(required\s+)?physical-device\s+probes?:\s*)?react-native-audio-api\b/i,
  ]) &&
    hasAnyEvidence(notes, [/\bD-2 scoped\b/i, /\bnot final engine selection\b/i]);
}

function hasPositiveS05AudibleEvidence(notes: string): boolean {
  return hasPositiveAudibleEvidence(notes) || hasNoSilentTapEvidence(notes);
}

function hasEventReplayExportPlaybackProvenanceEvidence(notes: string): boolean {
  return /\bevent[- ]?replay\b/i.test(notes) || /이벤트\s*녹음/.test(notes);
}

function hasPositiveEventReplaySourceEventCountEvidence(notes: string): boolean {
  return hasAnyEvidence(notes, [
    /\bsourceEventCount\s*[:=]\s*[1-9]\d*\b/i,
    /\brecordingEvents\s*[:=]\s*[1-9]\d*\b/i,
    /\bsource\s+events?\s*(?:count)?\s*[:=]?\s*[1-9]\d*\b/i,
    /\bevents?\s+count\s*[:=]?\s*[1-9]\d*\b/i,
    /\b[1-9]\d*\s+(?:source\s+)?events?\b/i,
    /(?:소스\s*)?이벤트(?:\s*(?:개수|수))?\s*[:=]?\s*[1-9]\d*\s*개?/,
    /[1-9]\d*\s*개\s*(?:소스\s*)?이벤트/,
  ]);
}

function hasNoSilentTapEvidence(notes: string): boolean {
  return /\bno\b.{0,24}\b(taps?|touches|zones?|pads?|strings?)\b.{0,24}\b(silent|inaudible)\b/i.test(notes) ||
    /\bno\b.{0,24}\b(silent|inaudible)\b.{0,24}\b(taps?|touches|zones?|pads?|strings?)\b/i.test(notes);
}

function hasPositiveAudibleEvidence(notes: string): boolean {
  return /\baudible\b/i.test(notes) && !hasNegativeAudioEvidence(notes);
}

function hasNegativeAudioEvidence(notes: string): boolean {
  return [
    /\bnot\s+(audible|heard|playing)\b/i,
    /\bno\s+(audible\s+)?(audio|sound|playback)\b/i,
    /\bwithout\s+(audio|sound|playback)\b/i,
    /\b(inaudible|silent|silence|muted)\b/i,
    /\b(audio|sound|playback)\s+(failed|failure|missing|unavailable|absent)\b/i,
  ].some((pattern) => pattern.test(notes));
}

function collectCheckShapeIssues(checks: unknown[]): string[] {
  return checks.flatMap((check, index) => {
    const issues: string[] = [];

    if (!isRecord(check)) {
      return [`checks[${index}] must be an object`];
    }

    if (!isRequiredD2DemoSmokeCheckId(check.id)) {
      issues.push(`checks[${index}].id must be a required D-2 demo smoke check`);
    }

    if (check.result !== 'pass' && check.result !== 'fail' && check.result !== 'blocked') {
      issues.push(`checks[${index}].result must be pass, fail, or blocked`);
    }

    if (typeof check.notes !== 'string') {
      issues.push(`checks[${index}].notes must be a string`);
    }

    return issues;
  });
}

function readRequiredCheckId(check: unknown): D2DemoSmokeCheckId | undefined {
  if (!isRecord(check)) {
    return undefined;
  }

  return isRequiredD2DemoSmokeCheckId(check.id) ? check.id : undefined;
}

function readCheckResult(check: unknown): unknown {
  return isRecord(check) ? check.result : undefined;
}

function readCheckNotes(check: unknown): string {
  return isRecord(check) && typeof check.notes === 'string' ? check.notes : '';
}

function collectDuplicateChecks(checkIds: D2DemoSmokeCheckId[]): D2DemoSmokeCheckId[] {
  const seen = new Set<D2DemoSmokeCheckId>();
  const duplicates = new Set<D2DemoSmokeCheckId>();

  for (const checkId of checkIds) {
    if (seen.has(checkId)) {
      duplicates.add(checkId);
    }
    seen.add(checkId);
  }

  return [...duplicates];
}

function formatD2DemoSmokeSummary(summary: D2DemoSmokeSummary): string {
  return [
    '# D-2 Demo Smoke Summary',
    '',
    `- Status: ${summary.status}`,
    `- Report issues: ${formatList(summary.reportIssues)}`,
    `- Missing checks: ${formatList(summary.missingChecks)}`,
    `- Duplicate checks: ${formatList(summary.duplicateChecks)}`,
    `- Blocked checks: ${formatList(summary.blockedChecks)}`,
    `- Blocked checks without notes: ${formatList(summary.blockedChecksWithoutNotes)}`,
    `- Failed checks: ${formatList(summary.failedChecks)}`,
    `- Failed checks without notes: ${formatList(summary.failedChecksWithoutNotes)}`,
    `- Evidence still needed: ${formatList(summary.evidenceStillNeeded)}`,
  ].join('\n');
}

function isRequiredD2DemoSmokeCheckId(input: unknown): input is D2DemoSmokeCheckId {
  return (
    typeof input === 'string' &&
    REQUIRED_D2_DEMO_SMOKE_CHECKS.includes(input as D2DemoSmokeCheckId)
  );
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function formatList(values: string[]): string {
  return values.length === 0 ? 'none' : values.join(', ');
}

import { isIsoTimestamp } from './week1SmokeReportCommand';

export type D2DemoAndroidRecordingEvidenceCommandInput = {
  argv: string[];
  workingDirectory: string;
  getCollectedAt: () => string;
  readTextFile: (path: string) => string;
  writeTextFile: (path: string, value: string) => void;
  runCommand: (
    command: string,
    args: string[],
    options: D2DemoAndroidRecordingEvidenceCommandRunOptions,
  ) => D2DemoAndroidRecordingEvidenceCommandRunResult;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export type D2DemoAndroidRecordingEvidenceCommandRunOptions = {
  cwd: string;
};

export type D2DemoAndroidRecordingEvidenceCommandRunResult = {
  exitCode: number;
  stdout?: string;
  stderr?: string;
};

type D2DemoAndroidRecordingEvidenceOptions = {
  adbPath: string;
  evidencePath: string;
  runStartedAt: string;
  deviceEvidencePath?: string;
  serial?: string;
  packageName: string;
  allowEmulator: boolean;
};

type AdbDevice = {
  serial: string;
  details: string;
};

type DeviceEvidence = {
  targetKind?: string;
  adbSerial?: string;
  packageName?: string;
  processPid?: string;
};

const DEFAULT_ANDROID_PACKAGE = 'com.gukakstudio.prototype';
const USAGE =
  'Usage: npm run qa:d2-demo-android-recording-evidence -- --evidence <recording-evidence.json> --run-started-at <ISO> [--device-evidence <device-evidence.json>] [--serial <adb-serial>] [--package <android-package>] [--adb <adb-path>] [--allow-emulator]';

export function runD2DemoAndroidRecordingEvidenceCommand(
  input: D2DemoAndroidRecordingEvidenceCommandInput,
): number {
  const parseResult = parseOptions(input.argv);
  if (!parseResult.ok) {
    input.writeStderr(parseResult.message);
    return 1;
  }

  const options = parseResult.options;
  const collectedAt = input.getCollectedAt();
  if (!isIsoTimestamp(collectedAt)) {
    input.writeStderr('Could not collect D-2 recording evidence: collectedAt must be an ISO timestamp');
    return 1;
  }
  if (Date.parse(options.runStartedAt) > Date.parse(collectedAt)) {
    input.writeStderr('Could not collect D-2 recording evidence: --run-started-at must be at or before collectedAt');
    return 1;
  }

  const deviceEvidenceResult = readDeviceEvidence(input, options.deviceEvidencePath);
  if (!deviceEvidenceResult.ok) {
    input.writeStderr(deviceEvidenceResult.message);
    return 1;
  }
  const deviceEvidence = deviceEvidenceResult.evidence;

  const devicesResult = input.runCommand(options.adbPath, ['devices', '-l'], {
    cwd: input.workingDirectory,
  });
  if (devicesResult.exitCode !== 0) {
    input.writeStderr(`Could not list adb devices: adb exit ${devicesResult.exitCode}`);
    return getCommandFailureExitCode(devicesResult);
  }

  const selectedDevice = selectDevice({
    devices: parseAdbDevices(devicesResult.stdout ?? ''),
    serial: options.serial ?? deviceEvidence?.adbSerial,
  });
  if (!selectedDevice.ok) {
    input.writeStderr(selectedDevice.message);
    return 1;
  }
  if (isEmulatorDevice(selectedDevice.device) && !options.allowEmulator) {
    input.writeStderr(
      `Could not collect D-2 recording evidence: adb target ${selectedDevice.device.serial} is an emulator; use the physical presentation device or pass --allow-emulator for dry-run evidence`,
    );
    return 1;
  }

  const packageName = deviceEvidence?.packageName ?? options.packageName;
  const processPidResult =
    normalizeOptionalText(deviceEvidence?.processPid) ??
    readProcessPid({
      input,
      options,
      packageName,
      serial: selectedDevice.device.serial,
    });
  if (processPidResult === undefined) {
    input.writeStderr(`Could not collect D-2 recording evidence: app process not running for ${packageName}`);
    return 1;
  }

  const logcatResult = input.runCommand(options.adbPath, ['-s', selectedDevice.device.serial, 'logcat', '-d'], {
    cwd: input.workingDirectory,
  });
  if (logcatResult.exitCode !== 0) {
    input.writeStderr(`Could not collect D-2 recording evidence: logcat exit ${logcatResult.exitCode}`);
    return getCommandFailureExitCode(logcatResult);
  }

  const appOpsResult = input.runCommand(
    options.adbPath,
    ['-s', selectedDevice.device.serial, 'shell', 'cmd', 'appops', 'get', packageName, 'RECORD_AUDIO'],
    { cwd: input.workingDirectory },
  );
  if (appOpsResult.exitCode !== 0) {
    input.writeStderr(`Could not collect D-2 recording evidence: appops exit ${appOpsResult.exitCode}`);
    return getCommandFailureExitCode(appOpsResult);
  }

  const audioEvidence = collectEventOnlyAudioEvidence({
    logcatText: logcatResult.stdout ?? '',
    appOpsText: collectCommandOutputLines(appOpsResult).join('\n'),
    packageName,
    processPid: processPidResult,
    runStartedAt: options.runStartedAt,
    collectedAt,
  });
  const blockingIssues = collectEventOnlyBlockingIssues(audioEvidence);
  const evidence = {
    collectedAt,
    packageName,
    status: blockingIssues.length === 0 ? 'pass' : 'fail',
    recordingMode: 'event-only',
    recordingUri: null,
    exists: false,
    sizeBytes: 0,
    audioEvidence,
    blockingIssues,
    notes: createEventOnlyRecordingEvidenceNotes(blockingIssues),
  };

  try {
    input.writeTextFile(options.evidencePath, JSON.stringify(evidence, null, 2));
  } catch {
    input.writeStderr(`Could not write D-2 recording evidence: ${options.evidencePath}`);
    return 1;
  }

  if (blockingIssues.length > 0) {
    input.writeStderr(`Could not write passing event-only recording evidence: ${blockingIssues.join('; ')}`);
    return 1;
  }

  input.writeStdout(`Wrote D-2 event-only recording evidence: ${options.evidencePath}`);
  return 0;
}

function parseOptions(
  argv: string[],
): { ok: true; options: D2DemoAndroidRecordingEvidenceOptions } | { ok: false; message: string } {
  const options: D2DemoAndroidRecordingEvidenceOptions = {
    adbPath: 'adb',
    evidencePath: '',
    runStartedAt: '',
    packageName: DEFAULT_ANDROID_PACKAGE,
    allowEmulator: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--evidence':
        options.evidencePath = argv[index + 1] ?? '';
        index += 1;
        break;
      case '--run-started-at':
        options.runStartedAt = argv[index + 1] ?? '';
        index += 1;
        break;
      case '--device-evidence':
        options.deviceEvidencePath = argv[index + 1];
        index += 1;
        break;
      case '--serial':
        options.serial = argv[index + 1];
        index += 1;
        break;
      case '--package':
        options.packageName = argv[index + 1] ?? DEFAULT_ANDROID_PACKAGE;
        index += 1;
        break;
      case '--adb':
        options.adbPath = argv[index + 1] ?? 'adb';
        index += 1;
        break;
      case '--allow-emulator':
        options.allowEmulator = true;
        break;
      default:
        return { ok: false, message: USAGE };
    }
  }

  if (
    options.evidencePath.trim().length === 0 ||
    !isIsoTimestamp(options.runStartedAt)
  ) {
    return { ok: false, message: USAGE };
  }

  return {
    ok: true,
    options: {
      ...options,
      evidencePath: options.evidencePath.trim(),
      packageName: options.packageName.trim() || DEFAULT_ANDROID_PACKAGE,
    },
  };
}

function readDeviceEvidence(
  input: D2DemoAndroidRecordingEvidenceCommandInput,
  path: string | undefined,
): { ok: true; evidence?: DeviceEvidence } | { ok: false; message: string } {
  if (path === undefined) {
    return { ok: true };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.readTextFile(path));
  } catch {
    return { ok: false, message: `Could not read D-2 device evidence sidecar: ${path}` };
  }

  if (!isRecord(parsed)) {
    return { ok: false, message: 'Could not read D-2 device evidence sidecar: sidecar must be an object' };
  }

  return {
    ok: true,
    evidence: {
      targetKind: readString(parsed.targetKind),
      adbSerial: readString(parsed.adbSerial),
      packageName: readString(parsed.packageName),
      processPid: readString(parsed.processPid),
    },
  };
}

function parseAdbDevices(input: string): AdbDevice[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('List of devices attached'))
    .flatMap((line) => {
      const match = line.match(/^(\S+)\s+device\b(.*)$/);
      return match === null
        ? []
        : [{ serial: match[1], details: match[2]?.trim() ?? '' }];
    });
}

function selectDevice(input: {
  devices: AdbDevice[];
  serial: string | undefined;
}): { ok: true; device: AdbDevice } | { ok: false; message: string } {
  if (input.serial !== undefined) {
    const device = input.devices.find((candidate) => candidate.serial === input.serial);
    return device === undefined
      ? { ok: false, message: `Could not collect D-2 recording evidence: adb serial not connected: ${input.serial}` }
      : { ok: true, device };
  }

  if (input.devices.length === 1) {
    return { ok: true, device: input.devices[0] };
  }
  if (input.devices.length === 0) {
    return { ok: false, message: 'Could not collect D-2 recording evidence: no connected adb device' };
  }

  return {
    ok: false,
    message: 'Could not collect D-2 recording evidence: multiple connected adb devices; pass --serial <adb-serial>',
  };
}

function isEmulatorDevice(device: AdbDevice): boolean {
  return (
    device.serial.startsWith('emulator-') ||
    /\bmodel:sdk_|google_sdk|qemu|emu/i.test(device.details)
  );
}

function readProcessPid(input: {
  input: D2DemoAndroidRecordingEvidenceCommandInput;
  options: D2DemoAndroidRecordingEvidenceOptions;
  serial: string;
  packageName: string;
}): string | undefined {
  const result = input.input.runCommand(
    input.options.adbPath,
    ['-s', input.serial, 'shell', 'pidof', input.packageName],
    { cwd: input.input.workingDirectory },
  );
  if (result.exitCode !== 0) {
    return undefined;
  }

  return normalizeOptionalText((result.stdout ?? '').trim().split(/\s+/)[0]);
}

function collectEventOnlyAudioEvidence(input: {
  logcatText: string;
  appOpsText: string;
  packageName: string;
  processPid: string;
  runStartedAt: string;
  collectedAt: string;
}) {
  const lines = input.logcatText.split(/\r?\n/);
  const appLines = lines.filter((line) => isAppProcessLine({
    line,
    packageName: input.packageName,
    processPid: input.processPid,
  }));
  const appAudioTrackStartedCount = appLines.filter((line) =>
    /\bAudioTrack\b/i.test(line) && /\b(state[:=]?started|event:started|started)\b/i.test(line),
  ).length;
  const appRecordingActiveFalseCount = appLines.filter((line) =>
    /\bmRecordingActive=false\b/i.test(line),
  ).length;
  const appAudioInputStartedCount = appLines.filter((line) =>
    /\b(AudioRecord|startInput|createRecord|MediaRecorder|src:MIC)\b/i.test(line),
  ).length;

  return {
    appProcessPid: input.processPid,
    appAudioTrackStartedCount,
    appRecordingActiveFalseCount,
    appAudioInputStartedCount,
    recordAudioAppOpsRefreshedDuringRun: didRecordAudioAppOpsRefreshDuringRun(input),
  };
}

function isAppProcessLine(input: {
  line: string;
  packageName: string;
  processPid: string;
}): boolean {
  const processPattern = new RegExp(`(?:^|\\s)\\d+\\s+${escapeRegExp(input.processPid)}(?:\\s|$)`);
  return processPattern.test(input.line) || input.line.includes(input.packageName);
}

function didRecordAudioAppOpsRefreshDuringRun(input: {
  appOpsText: string;
  runStartedAt: string;
  collectedAt: string;
}): boolean {
  const latestAgoMs = readSmallestRelativeAgoMs(input.appOpsText);
  if (latestAgoMs === undefined) {
    return false;
  }

  const lastRecordAudioAt = Date.parse(input.collectedAt) - latestAgoMs;
  return lastRecordAudioAt >= Date.parse(input.runStartedAt);
}

function readSmallestRelativeAgoMs(input: string): number | undefined {
  const values = [...input.matchAll(/time=\+([^;\n]+?)\s+ago/gi)]
    .map((match) => parseRelativeDurationMs(match[1] ?? ''))
    .filter((value): value is number => value !== undefined);

  if (values.length === 0) {
    return undefined;
  }

  return Math.min(...values);
}

function parseRelativeDurationMs(input: string): number | undefined {
  const normalized = input.replace(/\s+/g, '');
  const pattern = /(\d+(?:\.\d+)?)(d|h|m(?!s)|s|ms)/gi;
  let totalMs = 0;
  let matched = false;

  for (const match of normalized.matchAll(pattern)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) {
      return undefined;
    }

    matched = true;
    switch (match[2]) {
      case 'd':
        totalMs += value * 24 * 60 * 60 * 1000;
        break;
      case 'h':
        totalMs += value * 60 * 60 * 1000;
        break;
      case 'm':
        totalMs += value * 60 * 1000;
        break;
      case 's':
        totalMs += value * 1000;
        break;
      case 'ms':
        totalMs += value;
        break;
    }
  }

  return matched ? totalMs : undefined;
}

function collectEventOnlyBlockingIssues(evidence: {
  appAudioTrackStartedCount: number;
  appRecordingActiveFalseCount: number;
  appAudioInputStartedCount: number;
  recordAudioAppOpsRefreshedDuringRun: boolean;
}): string[] {
  const issues: string[] = [];
  if (evidence.appAudioTrackStartedCount <= 0) {
    issues.push('app playback AudioTrack output was not detected');
  }
  if (evidence.appAudioInputStartedCount > 0) {
    issues.push('app microphone input was detected');
  }
  if (evidence.recordAudioAppOpsRefreshedDuringRun) {
    issues.push('RECORD_AUDIO appops refreshed during the recording run');
  }
  if (evidence.appRecordingActiveFalseCount <= 0) {
    issues.push('app playback did not report mRecordingActive=false');
  }

  return issues;
}

function createEventOnlyRecordingEvidenceNotes(blockingIssues: string[]): string {
  if (blockingIssues.length === 0) {
    return 'Generated by qa:d2-demo-android-recording-evidence after the S05/S09 event-only recording flow. App logcat shows playback AudioTrack output for the app process, no app microphone input starts, and RECORD_AUDIO appops did not refresh during the run.';
  }

  return `Generated by qa:d2-demo-android-recording-evidence, but this sidecar is not passing evidence yet: ${blockingIssues.join('; ')}. Rerun immediately after the S05/S09 event-only recording flow using the current device sidecar and a run-started-at timestamp from before the rehearsal.`;
}

function collectCommandOutputLines(result: D2DemoAndroidRecordingEvidenceCommandRunResult): string[] {
  return [result.stdout, result.stderr]
    .filter((value): value is string => value !== undefined)
    .flatMap((value) => value.split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function getCommandFailureExitCode(result: D2DemoAndroidRecordingEvidenceCommandRunResult): number {
  return result.exitCode === 0 ? 1 : result.exitCode;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function readString(input: unknown): string | undefined {
  return typeof input === 'string' ? input : undefined;
}

function normalizeOptionalText(input: string | undefined): string | undefined {
  const normalized = input?.trim();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

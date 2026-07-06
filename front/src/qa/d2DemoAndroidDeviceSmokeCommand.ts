import {
  REQUIRED_D2_DEMO_SMOKE_CHECKS,
  type D2DemoSmokeCheck,
} from './d2DemoSmokeTemplateCommand';
import {
  isEmulatorDeviceLabel,
  isPhysicalDeviceLabel,
  normalizePhysicalDeviceLabelForReport,
} from './physicalDeviceLabel';
import { isIsoTimestamp } from './week1SmokeReportCommand';

export type D2DemoAndroidDeviceSmokeCommandInput = {
  argv: string[];
  workingDirectory: string;
  getTestedAt: () => string;
  pathExists: (path: string) => boolean;
  readTextFile: (path: string) => string;
  writeTextFile: (path: string, value: string) => void;
  runCommand: (
    command: string,
    args: string[],
    options: D2DemoAndroidDeviceSmokeCommandRunOptions,
  ) => D2DemoAndroidDeviceSmokeCommandRunResult;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export type D2DemoAndroidDeviceSmokeCommandRunOptions = {
  cwd: string;
};

export type D2DemoAndroidDeviceSmokeCommandRunResult = {
  exitCode: number;
  stdout?: string;
  stderr?: string;
};

type D2DemoAndroidDeviceSmokeOptions = {
  adbPath: string;
  apkPath: string;
  serial?: string;
  packageName: string;
  activity: string;
  reportPath?: string;
  evidencePath?: string;
  devClientUrl?: string;
  allowEmulator: boolean;
};

type AdbDevice = {
  serial: string;
  details: string;
  model?: string;
  androidVersion?: string;
};

type D2DemoAndroidTargetKind = 'physical' | 'emulator';

const DEFAULT_ANDROID_PACKAGE = 'com.gukakstudio.prototype';
const DEFAULT_ANDROID_ACTIVITY = '.MainActivity';
const DEFAULT_EXPO_DEV_CLIENT_SCHEME = 'gukakstudio';
const USAGE =
  'Usage: npm run qa:d2-demo-android-device-smoke -- <apk-path> [--serial <adb-serial>] [--package <android-package>] [--activity <activity>] [--adb <adb-path>] [--report <d2-demo-smoke-report.json>] [--evidence <device-evidence.json>] [--dev-client-url <metro-url>] [--allow-emulator]';

const AUTOMATED_D2_DEMO_CHECKS = [
  'adb-device-detected',
  'apk-installed-and-launched',
] as const;

export function runD2DemoAndroidDeviceSmokeCommand(
  input: D2DemoAndroidDeviceSmokeCommandInput,
): number {
  const parseResult = parseD2DemoAndroidDeviceSmokeOptions(input.argv);
  if (!parseResult.ok) {
    input.writeStderr(parseResult.message);
    return 1;
  }

  const options = parseResult.options;
  if (!input.pathExists(options.apkPath)) {
    input.writeStderr(`Could not run D-2 Android device smoke: APK not found: ${options.apkPath}`);
    return 1;
  }

  const devicesResult = input.runCommand(options.adbPath, ['devices', '-l'], {
    cwd: input.workingDirectory,
  });
  if (devicesResult.exitCode !== 0) {
    input.writeStderr(`Could not list adb devices: adb exit ${devicesResult.exitCode}`);
    return devicesResult.exitCode;
  }

  const selectedDevice = selectAdbDevice(parseAdbDevices(devicesResult.stdout ?? ''), options.serial);
  if (!selectedDevice.ok) {
    if (options.reportPath !== undefined) {
      const updateResult = updateD2DemoSmokeReportBlocked({
        reportPath: options.reportPath,
        testedAt: input.getTestedAt(),
        deviceNotes: createBlockedDeviceNotes(selectedDevice.message),
        launchNotes: createBlockedLaunchNotes(selectedDevice.message),
        readTextFile: input.readTextFile,
        writeTextFile: input.writeTextFile,
      });

      if (!updateResult.ok) {
        input.writeStderr(updateResult.message);
        return 1;
      }
    }

    input.writeStderr(selectedDevice.message);
    return 1;
  }

  const targetKind = readAdbTargetKind(selectedDevice.device);
  if (targetKind === 'emulator' && !options.allowEmulator) {
    input.writeStderr(createEmulatorTargetRejectedMessage(selectedDevice.device.serial));
    return 1;
  }
  if (targetKind === 'emulator' && options.reportPath !== undefined) {
    input.writeStderr(
      'Could not run D-2 Android device smoke: emulator smoke must not update the physical D-2 smoke report; omit --report and write a separate emulator evidence sidecar',
    );
    return 1;
  }

  const launchPlan = createLaunchPlan(options);
  if (!launchPlan.ok) {
    input.writeStderr(launchPlan.message);
    return 1;
  }
  const launchTarget = launchPlan.launchTarget;
  const logcatClearResult = options.evidencePath === undefined
    ? undefined
    : input.runCommand(
        options.adbPath,
        ['-s', selectedDevice.device.serial, 'logcat', '-c'],
        { cwd: input.workingDirectory },
      );
  const installResult = input.runCommand(
    options.adbPath,
    ['-s', selectedDevice.device.serial, 'install', '-r', options.apkPath],
    { cwd: input.workingDirectory },
  );
  if (isAdbInstallFailure(installResult)) {
    if (options.reportPath !== undefined) {
      const reportDevice = readAdbDeviceIdentity({
        adbPath: options.adbPath,
        device: selectedDevice.device,
        runCommand: input.runCommand,
        workingDirectory: input.workingDirectory,
      });
      const updateResult = updateD2DemoSmokeReport({
        apkPath: options.apkPath,
        device: reportDevice,
        launchTarget,
        reportPath: options.reportPath,
        testedAt: input.getTestedAt(),
        installLaunchResult: {
          result: 'fail',
          notes: `Install failed on ${selectedDevice.device.serial}: adb install exit ${installResult.exitCode}${formatCommandFailureDetails(installResult)}`,
        },
        readTextFile: input.readTextFile,
        writeTextFile: input.writeTextFile,
      });

      if (!updateResult.ok) {
        input.writeStderr(updateResult.message);
        return 1;
      }
    }

    input.writeStderr(
      `Could not install APK on ${selectedDevice.device.serial}: adb install exit ${installResult.exitCode}`,
    );
    return getAdbCommandFailureExitCode(installResult);
  }

  if (launchPlan.reversePort !== undefined) {
    const reverseResult = input.runCommand(
      options.adbPath,
      [
        '-s',
        selectedDevice.device.serial,
        'reverse',
        `tcp:${launchPlan.reversePort}`,
        `tcp:${launchPlan.reversePort}`,
      ],
      { cwd: input.workingDirectory },
    );
    if (reverseResult.exitCode !== 0) {
      if (options.reportPath !== undefined) {
        const reportDevice = readAdbDeviceIdentity({
          adbPath: options.adbPath,
          device: selectedDevice.device,
          runCommand: input.runCommand,
          workingDirectory: input.workingDirectory,
        });
        const updateResult = updateD2DemoSmokeReport({
          apkPath: options.apkPath,
          device: reportDevice,
          launchTarget,
          reportPath: options.reportPath,
          testedAt: input.getTestedAt(),
          installLaunchResult: {
            result: 'fail',
            notes: `Installed ${options.apkPath}, but dev-client reverse tcp:${launchPlan.reversePort} failed on ${selectedDevice.device.serial}: adb reverse exit ${reverseResult.exitCode}${formatCommandFailureDetails(reverseResult)}`,
          },
          readTextFile: input.readTextFile,
          writeTextFile: input.writeTextFile,
        });

        if (!updateResult.ok) {
          input.writeStderr(updateResult.message);
          return 1;
        }
      }

      input.writeStderr(
        `Could not configure dev-client Metro port reverse on ${selectedDevice.device.serial}: adb reverse exit ${reverseResult.exitCode}`,
      );
      return getAdbCommandFailureExitCode(reverseResult);
    }
  }

  const launchResult = input.runCommand(
    options.adbPath,
    ['-s', selectedDevice.device.serial, ...launchPlan.startArgs],
    { cwd: input.workingDirectory },
  );
  if (isAdbLaunchFailure(launchResult)) {
    if (options.reportPath !== undefined) {
      const reportDevice = readAdbDeviceIdentity({
        adbPath: options.adbPath,
        device: selectedDevice.device,
        runCommand: input.runCommand,
        workingDirectory: input.workingDirectory,
      });
      const updateResult = updateD2DemoSmokeReport({
        apkPath: options.apkPath,
        device: reportDevice,
        launchTarget,
        reportPath: options.reportPath,
        testedAt: input.getTestedAt(),
        installLaunchResult: {
          result: 'fail',
          notes: `Installed ${options.apkPath}, but launch ${launchTarget} failed on ${selectedDevice.device.serial}: adb shell am start exit ${launchResult.exitCode}${formatCommandFailureDetails(launchResult)}`,
        },
        readTextFile: input.readTextFile,
        writeTextFile: input.writeTextFile,
      });

      if (!updateResult.ok) {
        input.writeStderr(updateResult.message);
        return 1;
      }
    }

    input.writeStderr(
      `Could not launch app on ${selectedDevice.device.serial}: adb shell am start exit ${launchResult.exitCode}`,
    );
    return getAdbCommandFailureExitCode(launchResult);
  }

  if (launchPlan.requiresAppLoadWait) {
    input.runCommand(
      options.adbPath,
      ['-s', selectedDevice.device.serial, 'shell', 'sleep', '6'],
      { cwd: input.workingDirectory },
    );
    dismissExpoDevClientFirstRunMenu({
      adbPath: options.adbPath,
      input,
      serial: selectedDevice.device.serial,
    });
  }

  const processResult = input.runCommand(
    options.adbPath,
    ['-s', selectedDevice.device.serial, 'shell', 'pidof', options.packageName],
    { cwd: input.workingDirectory },
  );
  const retryProcessResult =
    readAdbProcessId(processResult) === undefined
      ? input.runCommand(
          options.adbPath,
          [
            '-s',
            selectedDevice.device.serial,
            'shell',
            createPidofRetryScript(options.packageName),
          ],
          { cwd: input.workingDirectory },
        )
      : undefined;
  const finalProcessResult = retryProcessResult ?? processResult;
  const processPid = readAdbProcessId(finalProcessResult);
  if (processPid === undefined) {
    if (options.reportPath !== undefined) {
      const reportDevice = readAdbDeviceIdentity({
        adbPath: options.adbPath,
        device: selectedDevice.device,
        runCommand: input.runCommand,
        workingDirectory: input.workingDirectory,
      });
      const updateResult = updateD2DemoSmokeReport({
        apkPath: options.apkPath,
        device: reportDevice,
        launchTarget,
        reportPath: options.reportPath,
        testedAt: input.getTestedAt(),
        installLaunchResult: {
          result: 'fail',
          notes: `Installed ${options.apkPath} and launched ${launchTarget}, but process ${options.packageName} was not running: adb pidof exit ${finalProcessResult.exitCode}${formatCommandFailureDetails(finalProcessResult)}`,
        },
        readTextFile: input.readTextFile,
        writeTextFile: input.writeTextFile,
      });

      if (!updateResult.ok) {
        input.writeStderr(updateResult.message);
        return 1;
      }
    }

    input.writeStderr(
      `Could not confirm app process ${options.packageName}: adb pidof exit ${finalProcessResult.exitCode}`,
    );
    return getAdbCommandFailureExitCode(finalProcessResult);
  }

  input.writeStdout(`ADB device: ${selectedDevice.device.serial} ${selectedDevice.device.details}`.trim());
  if (targetKind === 'emulator') {
    input.writeStdout('ADB target kind: emulator');
  }
  input.writeStdout(`APK installed: ${options.apkPath}`);
  input.writeStdout(`App launched: ${launchTarget}`);
  input.writeStdout(`App process: ${options.packageName} pid ${processPid}`);
  input.writeStdout(`Automated D-2 checks passed: ${AUTOMATED_D2_DEMO_CHECKS.join(', ')}`);
  input.writeStdout(
    `D-2 checks not covered by device smoke automation: ${collectManualD2DemoChecks().join(', ')}`,
  );

  if (options.evidencePath !== undefined) {
    const packagePathResult = input.runCommand(
      options.adbPath,
      ['-s', selectedDevice.device.serial, 'shell', 'pm', 'path', options.packageName],
      { cwd: input.workingDirectory },
    );
    const packagePath = readFirstCommandOutputLine(packagePathResult);
    const foregroundResult = input.runCommand(
      options.adbPath,
      ['-s', selectedDevice.device.serial, 'shell', 'dumpsys', 'activity', 'activities'],
      { cwd: input.workingDirectory },
    );
    const foregroundWindow = readFocusedWindowLine(foregroundResult);
    const logcatRuntimeErrorResult = input.runCommand(
      options.adbPath,
      [
        '-s',
        selectedDevice.device.serial,
        'logcat',
        '-d',
        '-v',
        'time',
        'AndroidRuntime:E',
        'ReactNativeJS:E',
        'ExpoModulesCore:E',
        '*:S',
      ],
      { cwd: input.workingDirectory },
    );
    const logcatRuntimeErrorLines = readLogcatRuntimeErrorLines(logcatRuntimeErrorResult);
    const recordAudioAppOpsResult = input.runCommand(
      options.adbPath,
      [
        '-s',
        selectedDevice.device.serial,
        'shell',
        'appops',
        'get',
        options.packageName,
        'RECORD_AUDIO',
      ],
      { cwd: input.workingDirectory },
    );
    const audioServiceResult = input.runCommand(
      options.adbPath,
      ['-s', selectedDevice.device.serial, 'shell', 'dumpsys', 'audio'],
      { cwd: input.workingDirectory },
    );
    const uiHierarchyResult = readUiHierarchyEvidence({
      adbPath: options.adbPath,
      input,
      serial: selectedDevice.device.serial,
      waitForDevClientAppUi: launchPlan.requiresAppLoadWait,
    });
    const supplementalEvidence = createSupplementalDeviceEvidence({
      audioServiceResult,
      recordAudioAppOpsResult,
      uiHierarchyResult,
      packageName: options.packageName,
      processPid,
    });
    const writeResult = writeD2DemoDeviceEvidence({
      activity: options.activity,
      adbDetails: selectedDevice.device.details,
      adbSerial: selectedDevice.device.serial,
      apkPath: options.apkPath,
      evidencePath: options.evidencePath,
      foregroundWindow,
      launchTarget,
      logcatRuntimeErrorScan: {
        clearedBeforeLaunch: logcatClearResult?.exitCode === 0,
        exitCode: logcatRuntimeErrorResult.exitCode,
        matchingLines: logcatRuntimeErrorLines,
      },
      packageName: options.packageName,
      packagePath,
      processPid,
      supplementalEvidence,
      targetKind,
      testedAt: input.getTestedAt(),
      writeTextFile: input.writeTextFile,
    });

    if (!writeResult.ok) {
      input.writeStderr(writeResult.message);
      return 1;
    }

    input.writeStdout(`Wrote D-2 device evidence: ${options.evidencePath}`);
  }

  if (options.reportPath !== undefined) {
    const reportDevice = readAdbDeviceIdentity({
      adbPath: options.adbPath,
      device: selectedDevice.device,
      runCommand: input.runCommand,
      workingDirectory: input.workingDirectory,
    });
    const updateResult = updateD2DemoSmokeReport({
      apkPath: options.apkPath,
      device: reportDevice,
      launchTarget,
      processPid,
      reportPath: options.reportPath,
      testedAt: input.getTestedAt(),
      readTextFile: input.readTextFile,
      writeTextFile: input.writeTextFile,
    });

    if (!updateResult.ok) {
      input.writeStderr(updateResult.message);
      return 1;
    }

    if (updateResult.deviceLabel !== undefined) {
      input.writeStdout(`D-2 smoke report deviceLabel: ${updateResult.deviceLabel}`);
    }
    input.writeStdout(`Updated D-2 smoke report automated checks: ${options.reportPath}`);
  }

  return 0;
}

function parseD2DemoAndroidDeviceSmokeOptions(
  argv: string[],
): { ok: true; options: D2DemoAndroidDeviceSmokeOptions } | { ok: false; message: string } {
  const [apkPath, ...rest] = argv;
  if (apkPath === undefined || apkPath.trim().length === 0) {
    return { ok: false, message: USAGE };
  }

  const options: D2DemoAndroidDeviceSmokeOptions = {
    adbPath: 'adb',
    apkPath: apkPath.trim(),
    packageName: DEFAULT_ANDROID_PACKAGE,
    activity: DEFAULT_ANDROID_ACTIVITY,
    allowEmulator: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];
    const value = rest[index + 1];

    if (flag === '--allow-emulator') {
      options.allowEmulator = true;
      continue;
    }

    if (
      ![
        '--serial',
        '--package',
        '--activity',
        '--adb',
        '--report',
        '--evidence',
        '--dev-client-url',
      ].includes(flag)
    ) {
      return { ok: false, message: `Unknown D-2 Android device smoke option: ${flag}` };
    }

    if (value === undefined || value.trim().length === 0) {
      return { ok: false, message: `Missing value for D-2 Android device smoke option: ${flag}` };
    }

    if (flag === '--serial') {
      options.serial = value.trim();
    } else if (flag === '--package') {
      options.packageName = value.trim();
    } else if (flag === '--activity') {
      options.activity = value.trim();
    } else if (flag === '--report') {
      options.reportPath = value.trim();
    } else if (flag === '--evidence') {
      options.evidencePath = value.trim();
    } else if (flag === '--dev-client-url') {
      options.devClientUrl = value.trim();
    } else {
      options.adbPath = value.trim();
    }

    index += 1;
  }

  return { ok: true, options };
}

type D2DemoLaunchPlan = {
  launchTarget: string;
  startArgs: string[];
  reversePort?: number;
  requiresAppLoadWait: boolean;
};

function createLaunchPlan(
  options: D2DemoAndroidDeviceSmokeOptions,
): { ok: true; launchTarget: string; startArgs: string[]; reversePort?: number; requiresAppLoadWait: boolean } | { ok: false; message: string } {
  if (options.devClientUrl === undefined) {
    const launchTarget = `${options.packageName}/${options.activity}`;
    return {
      ok: true,
      launchTarget,
      startArgs: ['shell', 'am', 'start', '-n', launchTarget],
      requiresAppLoadWait: false,
    };
  }

  const port = readDevClientUrlPort(options.devClientUrl);
  if (port === undefined) {
    return {
      ok: false,
      message:
        'Could not run D-2 Android device smoke: --dev-client-url must be an http(s) Metro URL with an explicit port, for example http://127.0.0.1:8081',
    };
  }

  const launchTarget = createExpoDevClientLaunchUrl(options.devClientUrl);
  return {
    ok: true,
    launchTarget,
    startArgs: [
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      launchTarget,
      options.packageName,
    ],
    reversePort: port,
    requiresAppLoadWait: true,
  };
}

function createExpoDevClientLaunchUrl(metroUrl: string): string {
  return `${DEFAULT_EXPO_DEV_CLIENT_SCHEME}://expo-development-client/?url=${encodeURIComponent(metroUrl)}`;
}

function readDevClientUrlPort(input: string): number | undefined {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return undefined;
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.port.length === 0) {
    return undefined;
  }

  const port = Number(parsed.port);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : undefined;
}

function parseAdbDevices(output: string): AdbDevice[] {
  return output
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('List of devices attached'))
    .flatMap((line) => {
      const [serial, state, ...detailParts] = line.split(/\s+/g);
      if (serial === undefined || state !== 'device') {
        return [];
      }

      return [
        {
          serial,
          details: detailParts.join(' '),
        },
      ];
    });
}

function selectAdbDevice(
  devices: AdbDevice[],
  requestedSerial: string | undefined,
): { ok: true; device: AdbDevice } | { ok: false; message: string } {
  if (requestedSerial !== undefined) {
    const device = devices.find((item) => item.serial === requestedSerial);
    return device === undefined
      ? {
          ok: false,
          message: `Could not run D-2 Android device smoke: requested adb serial is not connected: ${requestedSerial}`,
        }
      : { ok: true, device };
  }

  if (devices.length === 0) {
    return {
      ok: false,
      message: 'Could not run D-2 Android device smoke: no connected adb device',
    };
  }

  if (devices.length > 1) {
    return {
      ok: false,
      message: 'Could not run D-2 Android device smoke: multiple connected adb devices; pass --serial <adb-serial>',
    };
  }

  return { ok: true, device: devices[0] };
}

function updateD2DemoSmokeReportBlocked(input: {
  reportPath: string;
  testedAt: string;
  deviceNotes: string;
  launchNotes: string;
  readTextFile: (path: string) => string;
  writeTextFile: (path: string, value: string) => void;
}): { ok: true } | { ok: false; message: string } {
  if (!isIsoTimestamp(input.testedAt)) {
    return {
      ok: false,
      message: 'Could not update D-2 smoke report: testedAt must be an ISO timestamp',
    };
  }

  let report: unknown;
  try {
    report = JSON.parse(input.readTextFile(input.reportPath));
  } catch {
    return {
      ok: false,
      message: `Could not update D-2 smoke report: ${input.reportPath}`,
    };
  }

  if (!isRecord(report) || !Array.isArray(report.checks)) {
    return {
      ok: false,
      message: 'Could not update D-2 smoke report: report must contain a checks array',
    };
  }

  const nextReport = {
    ...report,
    testedAt: input.testedAt,
    checks: report.checks.map((check) =>
      updateBlockedAutomatedCheck(check, {
        deviceNotes: input.deviceNotes,
        launchNotes: input.launchNotes,
      }),
    ),
  };

  try {
    input.writeTextFile(input.reportPath, JSON.stringify(nextReport, null, 2));
  } catch {
    return {
      ok: false,
      message: `Could not update D-2 smoke report: ${input.reportPath}`,
    };
  }

  return { ok: true };
}

function updateD2DemoSmokeReport(input: {
  apkPath: string;
  device: AdbDevice;
  installLaunchResult?: {
    result: Extract<D2DemoSmokeCheck['result'], 'pass' | 'fail'>;
    notes: string;
  };
  launchTarget: string;
  processPid?: string;
  reportPath: string;
  testedAt: string;
  readTextFile: (path: string) => string;
  writeTextFile: (path: string, value: string) => void;
}): { ok: true; deviceLabel?: string } | { ok: false; message: string } {
  if (!isIsoTimestamp(input.testedAt)) {
    return {
      ok: false,
      message: 'Could not update D-2 smoke report: testedAt must be an ISO timestamp',
    };
  }

  let report: unknown;
  try {
    report = JSON.parse(input.readTextFile(input.reportPath));
  } catch {
    return {
      ok: false,
      message: `Could not update D-2 smoke report: ${input.reportPath}`,
    };
  }

  if (!isRecord(report) || !Array.isArray(report.checks)) {
    return {
      ok: false,
      message: 'Could not update D-2 smoke report: report must contain a checks array',
    };
  }

  const deviceLabel = createAdbPhysicalDeviceLabel(input.device);
  const nextReport = {
    ...report,
    testedAt: input.testedAt,
    apkPath: input.apkPath,
    ...(deviceLabel === undefined ? {} : { deviceLabel }),
    checks: report.checks.map((check) =>
      updateAutomatedCheck(check, {
        apkPath: input.apkPath,
        device: input.device,
        installLaunchResult: input.installLaunchResult,
        launchTarget: input.launchTarget,
        processPid: input.processPid,
      }),
    ),
  };

  try {
    input.writeTextFile(input.reportPath, JSON.stringify(nextReport, null, 2));
  } catch {
    return {
      ok: false,
      message: `Could not update D-2 smoke report: ${input.reportPath}`,
    };
  }

  return { ok: true, deviceLabel };
}

function readAdbDeviceIdentity(input: {
  adbPath: string;
  device: AdbDevice;
  workingDirectory: string;
  runCommand: D2DemoAndroidDeviceSmokeCommandInput['runCommand'];
}): AdbDevice {
  return {
    ...input.device,
    model: readAdbDeviceProperty(input, 'ro.product.model'),
    androidVersion: readAdbDeviceProperty(input, 'ro.build.version.release'),
  };
}

function readAdbDeviceProperty(
  input: {
    adbPath: string;
    device: AdbDevice;
    workingDirectory: string;
    runCommand: D2DemoAndroidDeviceSmokeCommandInput['runCommand'];
  },
  propertyName: string,
): string | undefined {
  const result = input.runCommand(
    input.adbPath,
    ['-s', input.device.serial, 'shell', 'getprop', propertyName],
    { cwd: input.workingDirectory },
  );

  if (result.exitCode !== 0) {
    return undefined;
  }

  return normalizeAdbPropertyValue(result.stdout ?? '');
}

function createAdbPhysicalDeviceLabel(device: AdbDevice): string | undefined {
  const model = normalizeAdbDeviceModel(device.model);
  const androidVersion = normalizeAndroidVersion(device.androidVersion);
  if (model === undefined || androidVersion === undefined) {
    return undefined;
  }

  const label = normalizePhysicalDeviceLabelForReport(`${model} / Android ${androidVersion}`);
  return isPhysicalDeviceLabel(label) ? label : undefined;
}

function readAdbTargetKind(device: AdbDevice): D2DemoAndroidTargetKind {
  return [device.serial, device.details, device.model]
    .some((value) => isEmulatorDeviceLabel(value))
    ? 'emulator'
    : 'physical';
}

function createEmulatorTargetRejectedMessage(serial: string): string {
  return `Could not run D-2 Android device smoke: adb target ${serial} is an emulator; use a physical presentation device, or pass --allow-emulator without --report for emulator regression evidence`;
}

function normalizeAdbPropertyValue(input: string): string | undefined {
  return input
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function normalizeAdbDeviceModel(input: string | undefined): string | undefined {
  const normalized = input?.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function normalizeAndroidVersion(input: string | undefined): string | undefined {
  const normalized = input?.replace(/^Android\s+/i, '').replace(/\s+/g, ' ').trim();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function updateBlockedAutomatedCheck(
  check: unknown,
  input: {
    deviceNotes: string;
    launchNotes: string;
  },
): unknown {
  if (!isRecord(check)) {
    return check;
  }

  if (check.id === 'adb-device-detected') {
    return {
      ...check,
      result: 'blocked' satisfies D2DemoSmokeCheck['result'],
      notes: input.deviceNotes,
    };
  }

  if (check.id === 'apk-installed-and-launched') {
    return {
      ...check,
      result: 'blocked' satisfies D2DemoSmokeCheck['result'],
      notes: input.launchNotes,
    };
  }

  return check;
}

function updateAutomatedCheck(
  check: unknown,
  input: {
    apkPath: string;
    device: AdbDevice;
    installLaunchResult?: {
      result: Extract<D2DemoSmokeCheck['result'], 'pass' | 'fail'>;
      notes: string;
    };
    launchTarget: string;
    processPid?: string;
  },
): unknown {
  if (!isRecord(check)) {
    return check;
  }

  if (check.id === 'adb-device-detected') {
    return {
      ...check,
      result: 'pass' satisfies D2DemoSmokeCheck['result'],
      notes: `ADB device ${input.device.serial} ${input.device.details}`.trim(),
    };
  }

  if (check.id === 'apk-installed-and-launched') {
    return {
      ...check,
      result: input.installLaunchResult?.result ?? ('pass' satisfies D2DemoSmokeCheck['result']),
      notes:
        input.installLaunchResult?.notes ??
        formatSuccessfulInstallLaunchNotes(input.apkPath, input.launchTarget, input.processPid),
    };
  }

  return check;
}

function createBlockedDeviceNotes(message: string): string {
  if (message.includes('no connected adb device')) {
    return 'No connected adb device. Connect the presentation Android device with USB debugging enabled.';
  }

  return message;
}

function formatCommandFailureDetails(result: D2DemoAndroidDeviceSmokeCommandRunResult): string {
  const details = collectCommandOutputLines(result).join(' ');
  return details.length === 0 ? '' : `. ${details}`;
}

function formatSuccessfulInstallLaunchNotes(
  apkPath: string,
  launchTarget: string,
  processPid: string | undefined,
): string {
  return processPid === undefined
    ? `Installed ${apkPath} and launched ${launchTarget}`
    : `Installed ${apkPath} and launched ${launchTarget}; confirmed process pid ${processPid}`;
}

function readAdbProcessId(result: D2DemoAndroidDeviceSmokeCommandRunResult): string | undefined {
  if (result.exitCode !== 0) {
    return undefined;
  }

  const pid = collectCommandOutputLines(result).join(' ').replace(/\s+/g, ' ').trim();
  return pid.length === 0 ? undefined : pid;
}

function readFirstCommandOutputLine(
  result: D2DemoAndroidDeviceSmokeCommandRunResult,
): string | undefined {
  if (result.exitCode !== 0) {
    return undefined;
  }

  return collectCommandOutputLines(result)[0];
}

function readFocusedWindowLine(
  result: D2DemoAndroidDeviceSmokeCommandRunResult,
): string | undefined {
  if (result.exitCode !== 0) {
    return undefined;
  }

  return collectCommandOutputLines(result).find((line) =>
    /\b(mCurrentFocus|mFocusedApp|topResumedActivity|mResumedActivity|ResumedActivity)\b/.test(line),
  );
}

function readLogcatRuntimeErrorLines(
  result: D2DemoAndroidDeviceSmokeCommandRunResult,
): string[] {
  if (result.exitCode !== 0) {
    return [];
  }

  return collectCommandOutputLines(result).slice(0, 20);
}

function writeD2DemoDeviceEvidence(input: {
  activity: string;
  adbDetails: string;
  adbSerial: string;
  apkPath: string;
  evidencePath: string;
  foregroundWindow: string | undefined;
  launchTarget: string;
  logcatRuntimeErrorScan: {
    clearedBeforeLaunch: boolean;
    exitCode: number;
    matchingLines: string[];
  };
  packageName: string;
  packagePath: string | undefined;
  processPid: string;
  supplementalEvidence: D2DemoSupplementalDeviceEvidence;
  targetKind: D2DemoAndroidTargetKind;
  testedAt: string;
  writeTextFile: (path: string, value: string) => void;
}): { ok: true } | { ok: false; message: string } {
  if (!isIsoTimestamp(input.testedAt)) {
    return {
      ok: false,
      message: 'Could not write D-2 device evidence: testedAt must be an ISO timestamp',
    };
  }

  try {
    input.writeTextFile(
      input.evidencePath,
      JSON.stringify({
        testedAt: input.testedAt,
        apkPath: input.apkPath,
        targetKind: input.targetKind,
        adbSerial: input.adbSerial,
        adbDetails: input.adbDetails,
        packageName: input.packageName,
        activity: input.activity,
        launchTarget: input.launchTarget,
        processPid: input.processPid,
        packagePath: input.packagePath ?? null,
        foregroundWindow: input.foregroundWindow ?? null,
        logcatRuntimeErrorScan: {
          clearedBeforeLaunch: input.logcatRuntimeErrorScan.clearedBeforeLaunch,
          exitCode: input.logcatRuntimeErrorScan.exitCode,
          matchingLineCount: input.logcatRuntimeErrorScan.matchingLines.length,
          matchingLines: input.logcatRuntimeErrorScan.matchingLines,
        },
        supplementalEvidence: input.supplementalEvidence,
        automatedEvidence: {
          adbDeviceDetected: true,
          apkInstallCommandSucceeded: true,
          launchCommandSucceeded: true,
          appProcessRunning: true,
          packagePathResolved: input.packagePath !== undefined,
          foregroundWindowMentionsPackage: input.foregroundWindow?.includes(input.packageName) ?? false,
          logcatRuntimeErrorWindowClean:
            input.logcatRuntimeErrorScan.clearedBeforeLaunch &&
            input.logcatRuntimeErrorScan.exitCode === 0 &&
            input.logcatRuntimeErrorScan.matchingLines.length === 0,
          appUiLoaded: input.supplementalEvidence.uiHierarchySnapshot.garakAppUiVisible,
        },
        nonAutomatedChecksNotCoveredByDeviceSmoke: collectManualD2DemoChecks(),
      },
      null,
      2),
    );
  } catch {
    return {
      ok: false,
      message: `Could not write D-2 device evidence: ${input.evidencePath}`,
    };
  }

  return { ok: true };
}

type D2DemoSupplementalDeviceEvidence = {
  recordAudioAppOps: {
    exitCode: number;
    outputLines: string[];
  };
  audioServiceScan: {
    exitCode: number;
    matchingLineCount: number;
    matchingLines: string[];
  };
  uiHierarchySnapshot: {
    exitCode: number;
    rotation: string | null;
    visibleTexts: string[];
    contentDescriptions: string[];
    developmentLauncherVisible: boolean;
    garakAppUiVisible: boolean;
  };
};

function createSupplementalDeviceEvidence(input: {
  audioServiceResult: D2DemoAndroidDeviceSmokeCommandRunResult;
  recordAudioAppOpsResult: D2DemoAndroidDeviceSmokeCommandRunResult;
  uiHierarchyResult: D2DemoAndroidDeviceSmokeCommandRunResult;
  packageName: string;
  processPid: string;
}): D2DemoSupplementalDeviceEvidence {
  const audioServiceLines = readAudioServiceEvidenceLines({
    result: input.audioServiceResult,
    packageName: input.packageName,
    processPid: input.processPid,
  });
  const uiHierarchyText = input.uiHierarchyResult.stdout ?? '';
  const visibleTexts = readUiHierarchyVisibleTexts(uiHierarchyText);
  const contentDescriptions = readUiHierarchyContentDescriptions(uiHierarchyText);
  const developmentLauncherVisible = hasDevelopmentLauncherUiEvidence({
    visibleTexts,
    contentDescriptions,
  });

  return {
    recordAudioAppOps: {
      exitCode: input.recordAudioAppOpsResult.exitCode,
      outputLines: collectCommandOutputLines(input.recordAudioAppOpsResult).slice(0, 20),
    },
    audioServiceScan: {
      exitCode: input.audioServiceResult.exitCode,
      matchingLineCount: audioServiceLines.length,
      matchingLines: audioServiceLines,
    },
    uiHierarchySnapshot: {
      exitCode: input.uiHierarchyResult.exitCode,
      rotation: readUiHierarchyRotation(uiHierarchyText),
      visibleTexts,
      contentDescriptions,
      developmentLauncherVisible,
      garakAppUiVisible:
        !developmentLauncherVisible &&
        hasGarakAppUiEvidence({
          visibleTexts,
          contentDescriptions,
        }),
    },
  };
}

function readAudioServiceEvidenceLines(input: {
  result: D2DemoAndroidDeviceSmokeCommandRunResult;
  packageName: string;
  processPid: string;
}): string[] {
  if (input.result.exitCode !== 0) {
    return [];
  }

  const packagePattern = new RegExp(escapeRegExp(input.packageName), 'i');
  const processPattern = new RegExp(`(?:\\bpid[:=]?|\\bu/pid:|/)\\s*\\d*/?${escapeRegExp(input.processPid)}\\b`, 'i');
  return collectCommandOutputLines(input.result)
    .filter((line) => {
      const hasAudioEvidenceKeyword =
        /\b(AudioPlaybackConfiguration|AudioTrack|event:started|event:paused|event:stopped|requestAudioFocus|abandonAudioFocus)\b/i.test(line);
      const hasLineProcessContext = processPattern.test(line);
      const hasPackageWithoutHistoricPid =
        packagePattern.test(line) && !/\b(?:uid\/pid|u\/pid:|rec update|rec stop|src:MIC)\b/i.test(line);

      return hasAudioEvidenceKeyword && (hasLineProcessContext || hasPackageWithoutHistoricPid);
    })
    .slice(0, 80);
}

function readUiHierarchyRotation(input: string): string | null {
  const match = input.match(/<hierarchy\b[^>]*\brotation="([^"]+)"/i);
  return match?.[1] ?? null;
}

function readUiHierarchyContentDescriptions(input: string): string[] {
  return readUiHierarchyAttributeValues(input, 'content-desc');
}

function readUiHierarchyVisibleTexts(input: string): string[] {
  return readUiHierarchyAttributeValues(input, 'text');
}

function readUiHierarchyAttributeValues(input: string, attribute: string): string[] {
  const pattern = new RegExp(`\\b${escapeRegExp(attribute)}="([^"]*)"`, 'gi');
  return [...input.matchAll(pattern)]
    .map((match) => decodeXmlAttribute(match[1]?.trim() ?? ''))
    .filter((value) => value.length > 0)
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 20);
}

function dismissExpoDevClientFirstRunMenu(input: {
  adbPath: string;
  input: D2DemoAndroidDeviceSmokeCommandInput;
  serial: string;
}): void {
  const uiHierarchyResult = input.input.runCommand(
    input.adbPath,
    ['-s', input.serial, 'exec-out', 'uiautomator', 'dump', '/dev/tty'],
    { cwd: input.input.workingDirectory },
  );
  if (uiHierarchyResult.exitCode !== 0) {
    return;
  }

  const tapPoint = readUiHierarchyTapCenterForText(uiHierarchyResult.stdout ?? '', 'Continue');
  if (tapPoint !== undefined) {
    tapExpoDevClientFirstRunMenuContinue({ ...input, tapPoint });
  }
}

function readUiHierarchyEvidence(input: {
  adbPath: string;
  input: D2DemoAndroidDeviceSmokeCommandInput;
  serial: string;
  waitForDevClientAppUi: boolean;
}): D2DemoAndroidDeviceSmokeCommandRunResult {
  let result = readUiHierarchyOnce(input);
  if (!input.waitForDevClientAppUi) {
    return result;
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const uiHierarchyText = result.stdout ?? '';
    const visibleTexts = readUiHierarchyVisibleTexts(uiHierarchyText);
    const contentDescriptions = readUiHierarchyContentDescriptions(uiHierarchyText);
    const dismissed = dismissExpoDevClientFirstRunMenuFromHierarchy({
      adbPath: input.adbPath,
      input: input.input,
      serial: input.serial,
      uiHierarchyText,
    });
    const closedDevMenu =
      dismissed
        ? false
        : closeExpoDevMenuFromHierarchy({
            adbPath: input.adbPath,
            input: input.input,
            serial: input.serial,
            uiHierarchyText,
          });
    if (dismissed || closedDevMenu) {
      input.input.runCommand(
        input.adbPath,
        ['-s', input.serial, 'shell', 'sleep', '3'],
        { cwd: input.input.workingDirectory },
      );
      result = readUiHierarchyOnce(input);
      continue;
    }

    if (
      hasGarakAppUiEvidence({ visibleTexts, contentDescriptions }) &&
      !hasDevelopmentLauncherUiEvidence({ visibleTexts, contentDescriptions })
    ) {
      return result;
    }

    input.input.runCommand(
      input.adbPath,
      ['-s', input.serial, 'shell', 'sleep', '2'],
      { cwd: input.input.workingDirectory },
    );
    result = readUiHierarchyOnce(input);
  }

  return result;
}

function readUiHierarchyOnce(input: {
  adbPath: string;
  input: D2DemoAndroidDeviceSmokeCommandInput;
  serial: string;
}): D2DemoAndroidDeviceSmokeCommandRunResult {
  return input.input.runCommand(
    input.adbPath,
    ['-s', input.serial, 'exec-out', 'uiautomator', 'dump', '/dev/tty'],
    { cwd: input.input.workingDirectory },
  );
}

function dismissExpoDevClientFirstRunMenuFromHierarchy(input: {
  adbPath: string;
  input: D2DemoAndroidDeviceSmokeCommandInput;
  serial: string;
  uiHierarchyText: string;
}): boolean {
  const tapPoint = readUiHierarchyTapCenterForText(input.uiHierarchyText, 'Continue');
  if (tapPoint === undefined) {
    return false;
  }

  tapExpoDevClientFirstRunMenuContinue({ ...input, tapPoint });
  return true;
}

function closeExpoDevMenuFromHierarchy(input: {
  adbPath: string;
  input: D2DemoAndroidDeviceSmokeCommandInput;
  serial: string;
  uiHierarchyText: string;
}): boolean {
  const visibleTexts = readUiHierarchyVisibleTexts(input.uiHierarchyText);
  const contentDescriptions = readUiHierarchyContentDescriptions(input.uiHierarchyText);
  const looksLikeDevMenu =
    visibleTexts.includes('Connected to:') &&
    visibleTexts.includes('TOOLS') &&
    contentDescriptions.includes('Close');
  if (!looksLikeDevMenu) {
    return false;
  }

  const tapPoint = readUiHierarchyTapCenterForAttribute(
    input.uiHierarchyText,
    'content-desc',
    'Close',
  );
  if (tapPoint === undefined) {
    return false;
  }

  tapExpoDevClientFirstRunMenuContinue({ ...input, tapPoint });
  return true;
}

function tapExpoDevClientFirstRunMenuContinue(input: {
  adbPath: string;
  input: D2DemoAndroidDeviceSmokeCommandInput;
  serial: string;
  tapPoint: { x: number; y: number };
}): void {
  input.input.runCommand(
    input.adbPath,
    ['-s', input.serial, 'shell', 'input', 'tap', String(input.tapPoint.x), String(input.tapPoint.y)],
    { cwd: input.input.workingDirectory },
  );
}

function readUiHierarchyTapCenterForText(
  input: string,
  targetText: string,
): { x: number; y: number } | undefined {
  return readUiHierarchyTapCenterForAttribute(input, 'text', targetText);
}

function readUiHierarchyTapCenterForAttribute(
  input: string,
  attribute: string,
  targetValue: string,
): { x: number; y: number } | undefined {
  const nodeTags = input.match(/<node\b[^>]*>/gi) ?? [];
  for (const tag of nodeTags) {
    const value = readXmlTagAttribute(tag, attribute);
    if (value === undefined || decodeXmlAttribute(value) !== targetValue) {
      continue;
    }

    const bounds = readXmlTagAttribute(tag, 'bounds');
    const center = bounds === undefined ? undefined : readUiBoundsCenter(bounds);
    if (center !== undefined) {
      return center;
    }
  }

  return undefined;
}

function readXmlTagAttribute(input: string, attribute: string): string | undefined {
  const match = new RegExp(`\\b${escapeRegExp(attribute)}="([^"]*)"`).exec(input);
  return match?.[1];
}

function readUiBoundsCenter(input: string): { x: number; y: number } | undefined {
  const match = input.match(/\[(\d+),(\d+)]\[(\d+),(\d+)]/);
  if (match === null) {
    return undefined;
  }

  const [, left, top, right, bottom] = match.map(Number);
  if (
    left === undefined ||
    top === undefined ||
    right === undefined ||
    bottom === undefined ||
    [left, top, right, bottom].some((value) => !Number.isFinite(value))
  ) {
    return undefined;
  }

  return {
    x: Math.floor((left + right) / 2),
    y: Math.floor((top + bottom) / 2),
  };
}

function decodeXmlAttribute(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function hasDevelopmentLauncherUiEvidence(input: {
  visibleTexts: string[];
  contentDescriptions: string[];
}): boolean {
  const values = [...input.visibleTexts, ...input.contentDescriptions];
  return values.some((value) =>
    /^(Development Build|DEVELOPMENT SERVERS|New development server|RECENTLY OPENED|Updates)$/.test(value),
  );
}

function hasGarakAppUiEvidence(input: {
  visibleTexts: string[];
  contentDescriptions: string[];
}): boolean {
  const values = [...input.visibleTexts, ...input.contentDescriptions];
  if (
    values.some((value) =>
      /^(Guest Mode|PLAY)$/.test(value) || /(My Arirang|Garak live audio ready|Live audio sent|Track 1)/.test(value),
    )
  ) {
    return true;
  }

  return values.some((value) =>
    /(국악|가락|자유 연주|Garak live audio ready|Live audio sent|마이 및 설정|새 작업 시작|언어 변경|보관함|공유|녹음|연주|장구|대금|가야금)/.test(value),
  );
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createPidofRetryScript(packageName: string): string {
  const quotedPackageName = quoteAndroidShellArg(packageName);
  return `for i in 1 2 3 4 5 6 7 8 9 10; do pidof ${quotedPackageName} && exit 0; sleep 1; done; exit 1`;
}

function quoteAndroidShellArg(input: string): string {
  return `'${input.replace(/'/g, `'\"'\"'`)}'`;
}

function getAdbCommandFailureExitCode(result: D2DemoAndroidDeviceSmokeCommandRunResult): number {
  return result.exitCode === 0 ? 1 : result.exitCode;
}

function isAdbInstallFailure(result: D2DemoAndroidDeviceSmokeCommandRunResult): boolean {
  if (result.exitCode !== 0) {
    return true;
  }

  const output = collectCommandOutputLines(result).join('\n');
  return /\bFailure\s*\[/i.test(output) || /\bINSTALL_FAILED[A-Z0-9_-]*/i.test(output);
}

function isAdbLaunchFailure(result: D2DemoAndroidDeviceSmokeCommandRunResult): boolean {
  if (result.exitCode !== 0) {
    return true;
  }

  const output = collectCommandOutputLines(result).join('\n');
  return (
    /(^|\n)\s*Error type \d+\b/i.test(output) ||
    /\bActivity class\b.*\bdoes not exist\b/i.test(output) ||
    /(^|\n)\s*Error:\s+Activity not started\b/i.test(output) ||
    /\bunable to resolve Intent\b/i.test(output)
  );
}

function collectCommandOutputLines(result: D2DemoAndroidDeviceSmokeCommandRunResult): string[] {
  return [result.stderr, result.stdout]
    .flatMap((value) => (value ?? '').split(/\r?\n/g))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function createBlockedLaunchNotes(message: string): string {
  if (message.includes('no connected adb device')) {
    return 'Skipped because no connected adb device was available.';
  }

  return 'Skipped because adb device selection did not resolve to one install target.';
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function collectManualD2DemoChecks(): string[] {
  return REQUIRED_D2_DEMO_SMOKE_CHECKS.filter(
    (check) => !AUTOMATED_D2_DEMO_CHECKS.includes(check as (typeof AUTOMATED_D2_DEMO_CHECKS)[number]),
  );
}

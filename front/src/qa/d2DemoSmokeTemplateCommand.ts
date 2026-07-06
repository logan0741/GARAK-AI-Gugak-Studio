import { isPhysicalDeviceLabel } from './physicalDeviceLabel';
import { isIsoTimestamp } from './week1SmokeReportCommand';

export type D2DemoSmokeCheckId =
  | 'short-ascii-android-build'
  | 'adb-device-detected'
  | 'apk-installed-and-launched'
  | 'home-browse-demo-playback'
  | 's05-instrument-touch-sound'
  | 'recording-event-take-saved'
  | 'library-export-playback'
  | 'day5-expo-audio-probe-updated';

export type D2DemoSmokeCheckResult = 'pass' | 'fail' | 'blocked';

export type D2DemoSmokeCheck = {
  id: D2DemoSmokeCheckId;
  result: D2DemoSmokeCheckResult;
  notes: string;
};

export type D2DemoSmokeReport = {
  generatedAt: string;
  testedAt: string;
  tester: string;
  deviceLabel: string;
  apkPath: string;
  checks: D2DemoSmokeCheck[];
};

export type D2DemoSmokeTemplateCommandInput = {
  argv: string[];
  getGeneratedAt: () => string;
  writeTextFile: (path: string, value: string) => void;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export const REQUIRED_D2_DEMO_SMOKE_CHECKS: D2DemoSmokeCheckId[] = [
  'short-ascii-android-build',
  'adb-device-detected',
  'apk-installed-and-launched',
  'home-browse-demo-playback',
  's05-instrument-touch-sound',
  'recording-event-take-saved',
  'library-export-playback',
  'day5-expo-audio-probe-updated',
];

export function runD2DemoSmokeTemplateCommand(
  input: D2DemoSmokeTemplateCommandInput,
): number {
  const [outputPath, tester, deviceLabel, apkPath] = input.argv;

  if (!outputPath || !tester || !deviceLabel || !apkPath) {
    input.writeStderr(
      'Usage: npm run qa:d2-demo-smoke-template -- <output-json> <tester> <device-label> <apk-path>',
    );
    return 1;
  }

  const normalizedTester = tester.trim();
  if (normalizedTester.length === 0) {
    input.writeStderr(
      'Could not write D-2 demo smoke template: tester must be a non-empty name',
    );
    return 1;
  }

  const normalizedDeviceLabel = deviceLabel.trim();
  if (!isPhysicalDeviceLabel(normalizedDeviceLabel)) {
    input.writeStderr(
      'Could not write D-2 demo smoke template: device label must name the physical device',
    );
    return 1;
  }

  const normalizedApkPath = apkPath.trim();
  if (normalizedApkPath.length === 0) {
    input.writeStderr('Could not write D-2 demo smoke template: apk path must be non-empty');
    return 1;
  }

  const generatedAt = input.getGeneratedAt();
  if (!isIsoTimestamp(generatedAt)) {
    input.writeStderr(
      'Could not write D-2 demo smoke template: generatedAt must be an ISO timestamp',
    );
    return 1;
  }

  const report = createD2DemoSmokeReportTemplate({
    generatedAt,
    testedAt: generatedAt,
    tester: normalizedTester,
    deviceLabel: normalizedDeviceLabel,
    apkPath: normalizedApkPath,
  });

  try {
    input.writeTextFile(outputPath, JSON.stringify(report, null, 2));
  } catch {
    input.writeStderr(`Could not write D-2 demo smoke template: ${outputPath}`);
    return 1;
  }

  input.writeStdout(`Wrote D-2 demo smoke template: ${outputPath}`);
  return 0;
}

function createD2DemoSmokeReportTemplate(input: {
  generatedAt: string;
  testedAt: string;
  tester: string;
  deviceLabel: string;
  apkPath: string;
}): D2DemoSmokeReport {
  return {
    generatedAt: input.generatedAt,
    testedAt: input.testedAt,
    tester: input.tester,
    deviceLabel: input.deviceLabel,
    apkPath: input.apkPath,
    checks: REQUIRED_D2_DEMO_SMOKE_CHECKS.map((id) => ({
      id,
      result: 'blocked',
      notes: '',
    })),
  };
}

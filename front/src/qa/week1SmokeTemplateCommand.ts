import {
  isIsoTimestamp,
  isPhysicalDeviceLabel,
  REQUIRED_AREAS,
  REQUIRED_CHECKS_BY_AREA,
  type Week1SmokeReport,
} from './week1SmokeReportCommand';

export type Week1SmokeTemplateCommandInput = {
  argv: string[];
  getGeneratedAt: () => string;
  writeTextFile: (path: string, value: string) => void;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export function runWeek1SmokeTemplateCommand(
  input: Week1SmokeTemplateCommandInput,
): number {
  const [outputPath, tester, deviceLabel] = input.argv;

  if (!outputPath || !tester || !deviceLabel) {
    input.writeStderr(
      'Usage: npm run qa:week1-smoke-template -- <output-json> <tester> <device-label>',
    );
    return 1;
  }

  const normalizedTester = tester.trim();
  if (normalizedTester.length === 0) {
    input.writeStderr(
      'Could not write Week 1 smoke report template: tester must be a non-empty name',
    );
    return 1;
  }

  const normalizedDeviceLabel = deviceLabel.trim();
  if (!isPhysicalDeviceLabel(normalizedDeviceLabel)) {
    input.writeStderr(
      'Could not write Week 1 smoke report template: device label must name the physical device',
    );
    return 1;
  }

  const generatedAt = input.getGeneratedAt();
  if (!isIsoTimestamp(generatedAt)) {
    input.writeStderr(
      'Could not write Week 1 smoke report template: generatedAt must be an ISO timestamp',
    );
    return 1;
  }

  const report = createWeek1SmokeReportTemplate({
    generatedAt,
    testedAt: generatedAt,
    tester: normalizedTester,
    deviceLabel: normalizedDeviceLabel,
  });

  try {
    input.writeTextFile(outputPath, JSON.stringify(report, null, 2));
  } catch {
    input.writeStderr(`Could not write Week 1 smoke report template: ${outputPath}`);
    return 1;
  }

  input.writeStdout(`Wrote Week 1 smoke report template: ${outputPath}`);
  return 0;
}

function createWeek1SmokeReportTemplate(input: {
  generatedAt: string;
  testedAt: string;
  tester: string;
  deviceLabel: string;
}): Week1SmokeReport {
  return {
    generatedAt: input.generatedAt,
    runs: REQUIRED_AREAS.map((area) => ({
      area,
      testedAt: input.testedAt,
      tester: input.tester,
      deviceLabel: input.deviceLabel,
      checks: REQUIRED_CHECKS_BY_AREA[area].map((id) => ({
        id,
        result: 'blocked',
        notes: '',
      })),
    })),
  };
}

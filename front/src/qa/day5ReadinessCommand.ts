import {
  buildDay5AudioEngineDecisionRecordFromProbeRecord,
  parseAudioEngineProbeRecord,
  type AudioEngineProbeRecord,
} from '../audio/audioEngineProbeRecord';
import { type AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import {
  parseWeek1SmokeReport,
  summarizeWeek1SmokeReport,
  type Week1SmokeReport,
  type Week1SmokeReportSummary,
} from './week1SmokeReportCommand';

type Day5ReadinessStatus = 'READY_FOR_DAY5_DECISION' | 'NOT_READY_FOR_DAY5_DECISION';

type Day5ReadinessReport = {
  status: Day5ReadinessStatus;
  smokeReportIssues: string[];
  probeRecordIssues: string[];
  deviceAlignmentIssues: string[];
  blockedSmokeChecks: string[];
  failedSmokeChecks: string[];
};

export type Day5ReadinessCommandInput = {
  argv: string[];
  readTextFile: (path: string) => string;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

const REQUIRED_CANDIDATES: AudioEngineCandidateId[] = [
  'expo-audio',
  'react-native-audio-api',
];

export function runDay5ReadinessCommand(input: Day5ReadinessCommandInput): number {
  const [smokeReportPath, probeRecordPath] = input.argv;

  if (!smokeReportPath || !probeRecordPath) {
    input.writeStderr(
      'Usage: npm run qa:day5-readiness -- <week1-smoke-report.json> <probe-record.json>',
    );
    return 1;
  }

  const smokeReportInput = readJson({
    path: smokeReportPath,
    label: 'Week 1 smoke report',
    input,
  });
  if (!smokeReportInput.ok) {
    return 1;
  }

  const smokeParseResult = parseWeek1SmokeReport(smokeReportInput.value);
  if (!smokeParseResult.ok) {
    input.writeStderr(`Could not parse Week 1 smoke report: ${smokeParseResult.error}`);
    return 1;
  }

  const probeRecordInput = readJson({
    path: probeRecordPath,
    label: 'probe record',
    input,
  });
  if (!probeRecordInput.ok) {
    return 1;
  }

  const smokeSummary = summarizeWeek1SmokeReport(smokeParseResult.report);
  const probeParseResult = parseAudioEngineProbeRecord(probeRecordInput.value);
  if (!probeParseResult.ok) {
    input.writeStdout(
      formatDay5ReadinessReport({
        status: 'NOT_READY_FOR_DAY5_DECISION',
        smokeReportIssues: collectSmokeReportIssues(smokeSummary),
        probeRecordIssues: probeParseResult.errors,
        deviceAlignmentIssues: [],
        blockedSmokeChecks: smokeSummary.blockedChecks,
        failedSmokeChecks: smokeSummary.failedChecks,
      }),
    );
    return 1;
  }

  const report = buildDay5ReadinessReport({
    smokeReport: smokeParseResult.report,
    smokeSummary,
    probeRecord: probeParseResult.record,
  });

  input.writeStdout(formatDay5ReadinessReport(report));
  return report.status === 'READY_FOR_DAY5_DECISION' ? 0 : 1;
}

function readJson(input: {
  path: string;
  label: 'Week 1 smoke report' | 'probe record';
  input: Day5ReadinessCommandInput;
}): { ok: true; value: unknown } | { ok: false } {
  let text: string;

  try {
    text = input.input.readTextFile(input.path);
  } catch {
    input.input.writeStderr(`Could not read ${input.label}: ${input.path}`);
    return { ok: false };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    input.input.writeStderr(`Invalid JSON in ${input.label}: ${input.path}`);
    return { ok: false };
  }
}

function buildDay5ReadinessReport(input: {
  smokeReport: Week1SmokeReport;
  smokeSummary: Week1SmokeReportSummary;
  probeRecord: AudioEngineProbeRecord;
}): Day5ReadinessReport {
  const smokeReportIssues = collectSmokeReportIssues(input.smokeSummary);
  const probeRecordIssues = collectProbeRecordIssues(input.probeRecord);
  const deviceAlignmentIssues = collectDeviceAlignmentIssues({
    smokeReport: input.smokeReport,
    probeRecord: input.probeRecord,
  });
  const status =
    smokeReportIssues.length === 0 &&
    probeRecordIssues.length === 0 &&
    deviceAlignmentIssues.length === 0
      ? 'READY_FOR_DAY5_DECISION'
      : 'NOT_READY_FOR_DAY5_DECISION';

  return {
    status,
    smokeReportIssues,
    probeRecordIssues,
    deviceAlignmentIssues,
    blockedSmokeChecks: input.smokeSummary.blockedChecks,
    failedSmokeChecks: input.smokeSummary.failedChecks,
  };
}

function collectSmokeReportIssues(summary: Week1SmokeReportSummary): string[] {
  return summary.status === 'COMPLETE_FOR_DAY5_REVIEW'
    ? []
    : ['smoke report is not complete for Day 5 review'];
}

function collectProbeRecordIssues(probeRecord: AudioEngineProbeRecord): string[] {
  const decisionRecord = buildDay5AudioEngineDecisionRecordFromProbeRecord(probeRecord);
  const issues: string[] = [];

  if (decisionRecord.missingCandidates.length > 0) {
    issues.push(
      `missing physical-device probes: ${formatList(decisionRecord.missingCandidates)}`,
    );
  }

  if (decisionRecord.duplicateCandidates.length > 0) {
    issues.push(
      `duplicate physical-device probes: ${formatList(decisionRecord.duplicateCandidates)}`,
    );
  }

  return issues;
}

function collectDeviceAlignmentIssues(input: {
  smokeReport: Week1SmokeReport;
  probeRecord: AudioEngineProbeRecord;
}): string[] {
  const issues: string[] = [];
  const smokeDeviceLabels = unique(
    input.smokeReport.runs.map((run) => normalizeDeviceLabel(run.deviceLabel)),
  );
  const physicalProbeDeviceLabels = unique(
    input.probeRecord.probes
      .filter((probe) => probe.evidenceSource === 'physical-device')
      .map((probe) => normalizeDeviceLabel(probe.deviceLabel)),
  );

  if (smokeDeviceLabels.length !== 1) {
    issues.push(`smoke report must use one device label: ${formatList(smokeDeviceLabels)}`);
    return issues;
  }

  if (
    physicalProbeDeviceLabels.length > 0 &&
    !physicalProbeDeviceLabels.every((label) => label === smokeDeviceLabels[0])
  ) {
    issues.push(
      `probe device labels must match smoke report device label ${smokeDeviceLabels[0]}`,
    );
  }

  for (const candidate of REQUIRED_CANDIDATES) {
    const candidateLabels = unique(
      input.probeRecord.probes
        .filter(
          (probe) =>
            probe.evidenceSource === 'physical-device' && probe.candidate === candidate,
        )
        .map((probe) => normalizeDeviceLabel(probe.deviceLabel)),
    );

    if (candidateLabels.length > 1) {
      issues.push(
        `${candidate} physical-device probes must use one device label: ${formatList(candidateLabels)}`,
      );
    }
  }

  return issues;
}

function formatDay5ReadinessReport(report: Day5ReadinessReport): string {
  return [
    '# Day 5 Readiness Summary',
    '',
    `- Status: ${report.status}`,
    `- Smoke report issues: ${formatList(report.smokeReportIssues)}`,
    `- Probe record issues: ${formatList(report.probeRecordIssues)}`,
    `- Device alignment issues: ${formatList(report.deviceAlignmentIssues)}`,
    `- Blocked smoke checks: ${formatList(report.blockedSmokeChecks)}`,
    `- Failed smoke checks: ${formatList(report.failedSmokeChecks)}`,
  ].join('\n');
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeDeviceLabel(input: string): string {
  return input.trim();
}

function formatList(values: string[]): string {
  return values.length === 0 ? 'none' : values.join(', ');
}

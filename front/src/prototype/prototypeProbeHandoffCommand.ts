import { parseAudioEngineProbeRecord } from '../audio/audioEngineProbeRecord';
import {
  buildPrototypeHandoffReadinessReport,
  getD2ExpoOnlyPrototypeHandoffReadinessOptions,
  type PrototypeHandoffReadinessReport,
  type PrototypeHandoffReadinessOptions,
} from './prototypeHandoffCheckCommand';
import { parsePrototypeHandoffFile } from './prototypeHandoffFile';
import { buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts } from './prototypeProbeHandoff';

export type PrototypeProbeHandoffCommandInput = {
  argv: string[];
  readTextFile: (path: string) => string;
  writeTextFile?: (path: string, value: string) => void;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

const PROTOTYPE_PROBE_RECORD_USAGE =
  'Usage: npm run qa:prototype-probe-record -- [--d2-expo-only] <prototype-handoff.json> <probe-record.json>';

export function runPrototypeProbeHandoffCommand(
  input: PrototypeProbeHandoffCommandInput,
): number {
  const args = parsePrototypeProbeHandoffArgs(input.argv);

  if (!args.prototypeHandoffPath || !args.probeRecordOutputPath) {
    input.writeStderr(PROTOTYPE_PROBE_RECORD_USAGE);
    return 1;
  }

  let handoffText: string;

  try {
    handoffText = input.readTextFile(args.prototypeHandoffPath);
  } catch {
    input.writeStderr(`Could not read prototype handoff: ${args.prototypeHandoffPath}`);
    return 1;
  }

  let handoffInput: unknown;

  try {
    handoffInput = JSON.parse(handoffText);
  } catch {
    input.writeStderr(`Invalid JSON in prototype handoff: ${args.prototypeHandoffPath}`);
    return 1;
  }

  const parseHandoffResult = parsePrototypeHandoffFile(handoffInput);
  if (!parseHandoffResult.ok) {
    input.writeStderr(`Could not build prototype probe record: ${parseHandoffResult.error}`);
    return 1;
  }

  const readinessReport = buildPrototypeHandoffReadinessReport(
    parseHandoffResult.handoff,
    args.readinessOptions,
  );
  if (readinessReport.status !== 'READY_FOR_PROBE_RECORD') {
    input.writeStderr(
      `Could not build prototype probe record: prototype handoff is not ready for probe record: ${formatReadinessIssues(readinessReport)}`,
    );
    return 1;
  }

  let record: ReturnType<typeof buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts>;

  try {
    record = buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts(
      parseHandoffResult.handoff,
    );
  } catch (error) {
    input.writeStderr(`Could not build prototype probe record: ${getErrorMessage(error)}`);
    return 1;
  }

  const parseResult = parseAudioEngineProbeRecord(record);
  if (!parseResult.ok) {
    input.writeStderr(
      `Could not build prototype probe record: generated probe record is invalid: ${parseResult.errors.join('; ')}`,
    );
    return 1;
  }

  const recordText = JSON.stringify(parseResult.record, null, 2);
  if (!input.writeTextFile) {
    input.writeStderr('Could not write probe record: output file writer is unavailable');
    return 1;
  }

  try {
    input.writeTextFile(args.probeRecordOutputPath, recordText);
  } catch {
    input.writeStderr(`Could not write probe record: ${args.probeRecordOutputPath}`);
    return 1;
  }

  input.writeStdout(
    `${args.d2ExpoOnly ? 'Wrote D-2 expo-only' : 'Wrote Day 5'} probe record: ${args.probeRecordOutputPath}`,
  );
  return 0;
}

function parsePrototypeProbeHandoffArgs(argv: string[]): {
  prototypeHandoffPath?: string;
  probeRecordOutputPath?: string;
  readinessOptions: PrototypeHandoffReadinessOptions;
  d2ExpoOnly: boolean;
} {
  if (argv[0] === '--d2-expo-only') {
    return {
      prototypeHandoffPath: argv[1],
      probeRecordOutputPath: argv[2],
      readinessOptions: getD2ExpoOnlyPrototypeHandoffReadinessOptions(),
      d2ExpoOnly: true,
    };
  }

  return {
    prototypeHandoffPath: argv[0],
    probeRecordOutputPath: argv[1],
    readinessOptions: {},
    d2ExpoOnly: false,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function formatReadinessIssues(report: PrototypeHandoffReadinessReport): string {
  const issueGroups: Array<[string, string[]]> = [
    ['missing candidates', report.missingCandidates],
    ['duplicate candidates', report.duplicateCandidates],
    ['device label issues', report.deviceLabelIssues],
    ['timestamp issues', report.timestampIssues],
    ['manifest issues', report.manifestIssues],
    ['inspector draft issues', report.inspectorDraftIssues],
    ['missing measurement fields', report.missingMeasurementFields],
    ['invalid measurement fields', report.invalidMeasurementFields],
    ['runtime issues', report.runtimeIssues],
    ['probe record issues', report.probeRecordIssues],
  ];
  const formattedIssues = issueGroups
    .filter(([, issues]) => issues.length > 0)
    .map(([label, issues]) => `${label}: ${issues.join(', ')}`);

  return formattedIssues.length > 0 ? formattedIssues.join('; ') : 'unknown readiness issue';
}

import { type AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import { type PhysicalDeviceAudioEngineProbeMeasurements } from '../audio/audioEngineProbeDraft';
import { parseAudioEngineProbeRecord } from '../audio/audioEngineProbeRecord';
import { isPhysicalDeviceLabel } from '../qa/week1SmokeReportCommand';
import {
  buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts,
  isPrototypeObservedRuntimeReady,
  type PhysicalDevicePrototypeProbeHandoffInput,
} from './prototypeProbeHandoff';

type PrototypeHandoffReadinessStatus =
  | 'READY_FOR_PROBE_RECORD'
  | 'NOT_READY_FOR_PROBE_RECORD';

type PrototypeHandoffReadinessReport = {
  status: PrototypeHandoffReadinessStatus;
  missingCandidates: AudioEngineCandidateId[];
  duplicateCandidates: AudioEngineCandidateId[];
  deviceLabelIssues: string[];
  timestampIssues: string[];
  missingMeasurementFields: string[];
  runtimeIssues: string[];
  probeRecordIssues: string[];
};

type PrototypeHandoffFile = {
  generatedAt: string;
  entries: PhysicalDevicePrototypeProbeHandoffInput[];
};

const REQUIRED_CANDIDATES: AudioEngineCandidateId[] = [
  'expo-audio',
  'react-native-audio-api',
];

const MEASUREMENT_FIELDS = [
  'touchToSoundLatencyMs',
  'maxStableVoices',
  'pitchBendSmooth',
  'glissandoTriggeredStrings',
  'muteReleaseClean',
  'preloadStable',
  'sessionFallbackPreserved',
  'recordingCaptureSeconds',
] as const satisfies ReadonlyArray<keyof PhysicalDeviceAudioEngineProbeMeasurements>;

export type PrototypeHandoffCheckCommandInput = {
  argv: string[];
  readTextFile: (path: string) => string;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export function runPrototypeHandoffCheckCommand(
  input: PrototypeHandoffCheckCommandInput,
): number {
  const [prototypeHandoffPath] = input.argv;

  if (!prototypeHandoffPath) {
    input.writeStderr('Usage: npm run qa:prototype-handoff-check -- <prototype-handoff.json>');
    return 1;
  }

  let handoffText: string;

  try {
    handoffText = input.readTextFile(prototypeHandoffPath);
  } catch {
    input.writeStderr(`Could not read prototype handoff: ${prototypeHandoffPath}`);
    return 1;
  }

  let handoffInput: unknown;

  try {
    handoffInput = JSON.parse(handoffText);
  } catch {
    input.writeStderr(`Invalid JSON in prototype handoff: ${prototypeHandoffPath}`);
    return 1;
  }

  const parseResult = parsePrototypeHandoffFile(handoffInput);
  if (!parseResult.ok) {
    input.writeStderr(`Could not check prototype handoff: ${parseResult.error}`);
    return 1;
  }

  const report = buildPrototypeHandoffReadinessReport(parseResult.handoff);
  input.writeStdout(formatPrototypeHandoffReadinessReport(report));
  return report.status === 'READY_FOR_PROBE_RECORD' ? 0 : 1;
}

function parsePrototypeHandoffFile(
  input: unknown,
): { ok: true; handoff: PrototypeHandoffFile } | { ok: false; error: string } {
  if (!isObject(input)) {
    return { ok: false, error: 'handoff must be an object' };
  }

  if (!Array.isArray(input.entries)) {
    return { ok: false, error: 'handoff entries must be an array' };
  }

  for (const [index, entry] of input.entries.entries()) {
    if (!isObject(entry)) {
      return { ok: false, error: `entries[${index}] must be an object` };
    }

    const candidate = getEntryCandidate(entry);
    if (!isAudioEngineCandidate(candidate)) {
      return {
        ok: false,
        error: `entries[${index}].inspectorDraft.probeTemplate.candidate must be expo-audio or react-native-audio-api`,
      };
    }

    if (!isObject(entry.measurements)) {
      return { ok: false, error: `entries[${index}].measurements must be an object` };
    }
  }

  return {
    ok: true,
    handoff: {
      generatedAt: typeof input.generatedAt === 'string' ? input.generatedAt : '',
      entries: input.entries as PhysicalDevicePrototypeProbeHandoffInput[],
    },
  };
}

function buildPrototypeHandoffReadinessReport(
  handoff: PrototypeHandoffFile,
): PrototypeHandoffReadinessReport {
  const candidateCounts = countCandidates(handoff.entries);
  const missingCandidates = REQUIRED_CANDIDATES.filter(
    (candidate) => (candidateCounts.get(candidate) ?? 0) === 0,
  );
  const duplicateCandidates = REQUIRED_CANDIDATES.filter(
    (candidate) => (candidateCounts.get(candidate) ?? 0) > 1,
  );
  const deviceLabelIssues = collectDeviceLabelIssues(handoff.entries);
  const timestampIssues = collectTimestampIssues(handoff);
  const missingMeasurementFields = collectMissingMeasurementFields(handoff.entries);
  const runtimeIssues = collectRuntimeIssues(handoff.entries);
  const probeRecordIssues = collectProbeRecordIssues({
    handoff,
    missingCandidates,
    duplicateCandidates,
    deviceLabelIssues,
    timestampIssues,
    missingMeasurementFields,
    runtimeIssues,
  });
  const status =
    missingCandidates.length === 0 &&
    duplicateCandidates.length === 0 &&
    deviceLabelIssues.length === 0 &&
    timestampIssues.length === 0 &&
    missingMeasurementFields.length === 0 &&
    runtimeIssues.length === 0 &&
    probeRecordIssues.length === 0
      ? 'READY_FOR_PROBE_RECORD'
      : 'NOT_READY_FOR_PROBE_RECORD';

  return {
    status,
    missingCandidates,
    duplicateCandidates,
    deviceLabelIssues,
    timestampIssues,
    missingMeasurementFields,
    runtimeIssues,
    probeRecordIssues,
  };
}

function countCandidates(
  entries: PhysicalDevicePrototypeProbeHandoffInput[],
): Map<AudioEngineCandidateId, number> {
  const counts = new Map<AudioEngineCandidateId, number>();

  for (const entry of entries) {
    const candidate = entry.inspectorDraft.probeTemplate.candidate;
    counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
  }

  return counts;
}

function collectDeviceLabelIssues(entries: PhysicalDevicePrototypeProbeHandoffInput[]): string[] {
  const issues: string[] = [];

  for (const entry of entries) {
    const candidate = entry.inspectorDraft.probeTemplate.candidate;
    const draftDeviceLabel = entry.inspectorDraft.probeTemplate.deviceLabel;

    if (!isPhysicalDeviceLabel(draftDeviceLabel)) {
      issues.push(
        `${candidate}.inspectorDraft.probeTemplate.deviceLabel must name the physical device`,
      );
      continue;
    }

    if (entry.deviceLabel !== undefined && !isPhysicalDeviceLabel(entry.deviceLabel)) {
      issues.push(`${candidate}.deviceLabel must name the physical device`);
      continue;
    }

    if (
      entry.deviceLabel !== undefined &&
      entry.deviceLabel.trim() !== draftDeviceLabel.trim()
    ) {
      issues.push(
        `${candidate}.deviceLabel must match inspector draft device label ${draftDeviceLabel}`,
      );
    }
  }

  return issues;
}

function collectTimestampIssues(handoff: PrototypeHandoffFile): string[] {
  const issues: string[] = [];

  if (!isUtcIsoTimestamp(handoff.generatedAt)) {
    issues.push('generatedAt must be a UTC ISO timestamp');
  }

  for (const entry of handoff.entries) {
    const candidate = entry.inspectorDraft.probeTemplate.candidate;
    const effectiveMeasuredAt = entry.measuredAt ?? entry.inspectorDraft.probeTemplate.measuredAt;

    if (!isUtcIsoTimestamp(effectiveMeasuredAt)) {
      issues.push(`${candidate}.measuredAt must be a UTC ISO timestamp`);
    }

    if (!isUtcIsoTimestamp(entry.inspectorDraft.probeTemplate.measuredAt)) {
      issues.push(
        `${candidate}.inspectorDraft.probeTemplate.measuredAt must be a UTC ISO timestamp`,
      );
    }
  }

  return issues;
}

function collectMissingMeasurementFields(
  entries: PhysicalDevicePrototypeProbeHandoffInput[],
): string[] {
  const missingFields: string[] = [];

  for (const entry of entries) {
    const candidate = entry.inspectorDraft.probeTemplate.candidate;
    for (const field of MEASUREMENT_FIELDS) {
      if (entry.measurements[field] === null || entry.measurements[field] === undefined) {
        missingFields.push(`${candidate}.${field}`);
      }
    }
  }

  return missingFields;
}

function collectRuntimeIssues(entries: PhysicalDevicePrototypeProbeHandoffInput[]): string[] {
  const issues: string[] = [];

  for (const entry of entries) {
    const candidate = entry.inspectorDraft.probeTemplate.candidate;

    if (!isPrototypeObservedRuntimeReady(entry.inspectorDraft)) {
      issues.push(`${candidate} runtime is not ready`);
    }
  }

  return issues;
}

function collectProbeRecordIssues(input: {
  handoff: PrototypeHandoffFile;
  missingCandidates: AudioEngineCandidateId[];
  duplicateCandidates: AudioEngineCandidateId[];
  deviceLabelIssues: string[];
  timestampIssues: string[];
  missingMeasurementFields: string[];
  runtimeIssues: string[];
}): string[] {
  if (
    input.missingCandidates.length > 0 ||
    input.duplicateCandidates.length > 0 ||
    input.deviceLabelIssues.length > 0 ||
    input.timestampIssues.length > 0 ||
    input.missingMeasurementFields.length > 0 ||
    input.runtimeIssues.length > 0
  ) {
    return [];
  }

  let probeRecord: ReturnType<typeof buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts>;

  try {
    probeRecord = buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts(input.handoff);
  } catch (error) {
    return [`could not build generated probe record: ${getErrorMessage(error)}`];
  }

  const parseResult = parseAudioEngineProbeRecord(probeRecord);
  if (!parseResult.ok) {
    return [`generated probe record is invalid: ${parseResult.errors.join('; ')}`];
  }

  return [];
}

function formatPrototypeHandoffReadinessReport(report: PrototypeHandoffReadinessReport): string {
  return [
    '# Prototype Handoff Readiness',
    '',
    `- Status: ${report.status}`,
    `- Missing candidates: ${formatList(report.missingCandidates)}`,
    `- Duplicate candidates: ${formatList(report.duplicateCandidates)}`,
    `- Device label issues: ${formatList(report.deviceLabelIssues)}`,
    `- Timestamp issues: ${formatList(report.timestampIssues)}`,
    `- Missing measurement fields: ${formatList(report.missingMeasurementFields)}`,
    `- Runtime issues: ${formatList(report.runtimeIssues)}`,
    `- Probe record issues: ${formatList(report.probeRecordIssues)}`,
  ].join('\n');
}

function formatList(values: string[]): string {
  return values.length === 0 ? 'none' : values.join(', ');
}

function getEntryCandidate(entry: Record<string, unknown>): unknown {
  const inspectorDraft = entry.inspectorDraft;
  if (!isObject(inspectorDraft)) {
    return undefined;
  }

  const probeTemplate = inspectorDraft.probeTemplate;
  if (!isObject(probeTemplate)) {
    return undefined;
  }

  return probeTemplate.candidate;
}

function isAudioEngineCandidate(input: unknown): input is AudioEngineCandidateId {
  return input === 'expo-audio' || input === 'react-native-audio-api';
}

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function isUtcIsoTimestamp(input: unknown): input is string {
  return (
    typeof input === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(input) &&
    Number.isFinite(Date.parse(input))
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

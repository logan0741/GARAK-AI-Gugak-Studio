import { type AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import { type PhysicalDeviceAudioEngineProbeMeasurements } from '../audio/audioEngineProbeDraft';
import { parseAudioEngineProbeRecord } from '../audio/audioEngineProbeRecord';
import {
  isPhysicalDeviceLabel,
  normalizePhysicalDeviceLabelForReport,
} from '../qa/physicalDeviceLabel';
import {
  parsePrototypeHandoffFile,
  type PrototypeHandoffFile,
} from './prototypeHandoffFile';
import {
  buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts,
  isPrototypeRecordingMeasurementBackedByPlayback,
  isPrototypeObservedRuntimeReady,
  type PhysicalDevicePrototypeProbeHandoffInput,
} from './prototypeProbeHandoff';
import { PROTOTYPE_GAYAGEUM_SAMPLE_MANIFEST_VERSION } from './prototypeSampleManifest';

export type PrototypeHandoffReadinessStatus =
  | 'READY_FOR_PROBE_RECORD'
  | 'NOT_READY_FOR_PROBE_RECORD';

export type PrototypeHandoffReadinessReport = {
  status: PrototypeHandoffReadinessStatus;
  missingCandidates: AudioEngineCandidateId[];
  duplicateCandidates: AudioEngineCandidateId[];
  deviceLabelIssues: string[];
  timestampIssues: string[];
  manifestIssues: string[];
  inspectorDraftIssues: string[];
  missingMeasurementFields: string[];
  invalidMeasurementFields: string[];
  runtimeIssues: string[];
  probeRecordIssues: string[];
};

export type PrototypeHandoffReadinessOptions = {
  requiredCandidates?: readonly AudioEngineCandidateId[];
};

const FINAL_DAY5_REQUIRED_CANDIDATES: readonly AudioEngineCandidateId[] = [
  'expo-audio',
  'react-native-audio-api',
];
const D2_EXPO_ONLY_REQUIRED_CANDIDATES: readonly AudioEngineCandidateId[] = ['expo-audio'];
const PROTOTYPE_HANDOFF_CHECK_USAGE =
  'Usage: npm run qa:prototype-handoff-check -- [--d2-expo-only] <prototype-handoff.json>';
const UTC_ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

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
const OPTIONAL_MEASUREMENT_FIELDS = [
  'firstTouchLatencyMs',
  'steadyTouchLatencyMs',
] as const satisfies ReadonlyArray<keyof PhysicalDeviceAudioEngineProbeMeasurements>;
const ALL_MEASUREMENT_FIELDS = [
  ...MEASUREMENT_FIELDS,
  ...OPTIONAL_MEASUREMENT_FIELDS,
] as const;
const DURATION_MEASUREMENT_FIELDS = [
  'touchToSoundLatencyMs',
  'recordingCaptureSeconds',
] as const satisfies ReadonlyArray<keyof PhysicalDeviceAudioEngineProbeMeasurements>;
const OPTIONAL_DURATION_MEASUREMENT_FIELDS = [
  'firstTouchLatencyMs',
  'steadyTouchLatencyMs',
] as const satisfies ReadonlyArray<keyof PhysicalDeviceAudioEngineProbeMeasurements>;
const COUNT_MEASUREMENT_FIELDS = [
  'maxStableVoices',
  'glissandoTriggeredStrings',
] as const satisfies ReadonlyArray<keyof PhysicalDeviceAudioEngineProbeMeasurements>;
const BOOLEAN_MEASUREMENT_FIELDS = [
  'pitchBendSmooth',
  'muteReleaseClean',
  'preloadStable',
  'sessionFallbackPreserved',
] as const satisfies ReadonlyArray<keyof PhysicalDeviceAudioEngineProbeMeasurements>;
const MAX_GAYAGEUM_STRING_COUNT = 12;

export type PrototypeHandoffCheckCommandInput = {
  argv: string[];
  readTextFile: (path: string) => string;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export function runPrototypeHandoffCheckCommand(
  input: PrototypeHandoffCheckCommandInput,
): number {
  const args = parsePrototypeHandoffCheckArgs(input.argv);

  if (!args.prototypeHandoffPath) {
    input.writeStderr(PROTOTYPE_HANDOFF_CHECK_USAGE);
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

  const parseResult = parsePrototypeHandoffFile(handoffInput);
  if (!parseResult.ok) {
    input.writeStderr(`Could not check prototype handoff: ${parseResult.error}`);
    return 1;
  }

  const report = buildPrototypeHandoffReadinessReport(parseResult.handoff, {
    requiredCandidates: args.requiredCandidates,
  });
  input.writeStdout(formatPrototypeHandoffReadinessReport(report));
  return report.status === 'READY_FOR_PROBE_RECORD' ? 0 : 1;
}

export function buildPrototypeHandoffReadinessReport(
  handoff: PrototypeHandoffFile,
  options: PrototypeHandoffReadinessOptions = {},
): PrototypeHandoffReadinessReport {
  const requiredCandidates =
    options.requiredCandidates ?? FINAL_DAY5_REQUIRED_CANDIDATES;
  const candidateCounts = countCandidates(handoff.entries);
  const missingCandidates = requiredCandidates.filter(
    (candidate) => (candidateCounts.get(candidate) ?? 0) === 0,
  );
  const duplicateCandidates = requiredCandidates.filter(
    (candidate) => (candidateCounts.get(candidate) ?? 0) > 1,
  );
  const deviceLabelIssues = collectDeviceLabelIssues(handoff.entries);
  const timestampIssues = collectTimestampIssues(handoff);
  const manifestIssues = collectManifestIssues(handoff.entries);
  const inspectorDraftIssues = collectInspectorDraftIssues(handoff.entries);
  const missingMeasurementFields = collectMissingMeasurementFields(handoff.entries);
  const invalidMeasurementFields = collectInvalidMeasurementFields(handoff.entries);
  const runtimeIssues = collectRuntimeIssues(handoff.entries);
  const probeRecordIssues = collectProbeRecordIssues({
    handoff,
    missingCandidates,
    duplicateCandidates,
    deviceLabelIssues,
    timestampIssues,
    manifestIssues,
    inspectorDraftIssues,
    missingMeasurementFields,
    invalidMeasurementFields,
    runtimeIssues,
  });
  const status =
    missingCandidates.length === 0 &&
    duplicateCandidates.length === 0 &&
    deviceLabelIssues.length === 0 &&
    timestampIssues.length === 0 &&
    manifestIssues.length === 0 &&
    inspectorDraftIssues.length === 0 &&
    missingMeasurementFields.length === 0 &&
    invalidMeasurementFields.length === 0 &&
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
    manifestIssues,
    inspectorDraftIssues,
    missingMeasurementFields,
    invalidMeasurementFields,
    runtimeIssues,
    probeRecordIssues,
  };
}

export function getD2ExpoOnlyPrototypeHandoffReadinessOptions(): PrototypeHandoffReadinessOptions {
  return {
    requiredCandidates: D2_EXPO_ONLY_REQUIRED_CANDIDATES,
  };
}

function parsePrototypeHandoffCheckArgs(argv: string[]): {
  prototypeHandoffPath?: string;
  requiredCandidates: readonly AudioEngineCandidateId[];
} {
  if (argv[0] === '--d2-expo-only') {
    return {
      prototypeHandoffPath: argv[1],
      requiredCandidates: D2_EXPO_ONLY_REQUIRED_CANDIDATES,
    };
  }

  return {
    prototypeHandoffPath: argv[0],
    requiredCandidates: FINAL_DAY5_REQUIRED_CANDIDATES,
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
  const physicalDeviceLabels: string[] = [];

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
      normalizePhysicalDeviceLabelForReport(entry.deviceLabel) !==
        normalizePhysicalDeviceLabelForReport(draftDeviceLabel)
    ) {
      issues.push(
        `${candidate}.deviceLabel must match inspector draft device label ${draftDeviceLabel}`,
      );
    }

    physicalDeviceLabels.push(normalizePhysicalDeviceLabelForReport(draftDeviceLabel));
  }

  const uniquePhysicalDeviceLabels = [...new Set(physicalDeviceLabels)];
  if (uniquePhysicalDeviceLabels.length > 1) {
    issues.push(
      `prototype handoff must use one device label: ${formatList(uniquePhysicalDeviceLabels)}`,
    );
  }

  return issues;
}

function collectTimestampIssues(handoff: PrototypeHandoffFile): string[] {
  const issues: string[] = [];
  const generatedAtIsValid = isUtcIsoTimestamp(handoff.generatedAt);

  if (!generatedAtIsValid) {
    issues.push('generatedAt must be a UTC ISO timestamp');
  }

  let generatedBeforeMeasurement = false;

  for (const entry of handoff.entries) {
    const candidate = entry.inspectorDraft.probeTemplate.candidate;
    const effectiveMeasuredAt = entry.measuredAt ?? entry.inspectorDraft.probeTemplate.measuredAt;

    if (!isUtcIsoTimestamp(effectiveMeasuredAt)) {
      issues.push(`${candidate}.measuredAt must be a UTC ISO timestamp`);
    } else if (
      generatedAtIsValid &&
      Date.parse(effectiveMeasuredAt) > Date.parse(handoff.generatedAt)
    ) {
      generatedBeforeMeasurement = true;
    }

    if (!isUtcIsoTimestamp(entry.inspectorDraft.probeTemplate.measuredAt)) {
      issues.push(
        `${candidate}.inspectorDraft.probeTemplate.measuredAt must be a UTC ISO timestamp`,
      );
    }
  }

  if (generatedBeforeMeasurement) {
    issues.push('generatedAt must be at or after every handoff measuredAt timestamp');
  }

  return issues;
}

function collectManifestIssues(entries: PhysicalDevicePrototypeProbeHandoffInput[]): string[] {
  const issues: string[] = [];

  for (const entry of entries) {
    const candidate = entry.inspectorDraft.probeTemplate.candidate;
    const manifestVersion = entry.inspectorDraft.observedRuntime?.sampleManifestVersion;

    if (manifestVersion !== PROTOTYPE_GAYAGEUM_SAMPLE_MANIFEST_VERSION) {
      issues.push(
        `${candidate} sampleManifestVersion must be ${PROTOTYPE_GAYAGEUM_SAMPLE_MANIFEST_VERSION}`,
      );
    }

    const observedRuntime = entry.inspectorDraft.observedRuntime;
    if (observedRuntime && hasUnexpectedStringIndexesField(observedRuntime)) {
      const unexpectedStringIndexes = observedRuntime.unexpectedStringIndexes;
      if (Array.isArray(unexpectedStringIndexes) && unexpectedStringIndexes.length > 0) {
        issues.push(
          `${candidate} unexpected sample string indexes: ${unexpectedStringIndexes.join(', ')}`,
        );
      } else {
        issues.push(`${candidate} unexpectedStringIndexes must be absent`);
      }
    }
  }

  return issues;
}

function collectInspectorDraftIssues(entries: PhysicalDevicePrototypeProbeHandoffInput[]): string[] {
  const issues: string[] = [];

  for (const entry of entries) {
    const candidate = entry.inspectorDraft.probeTemplate.candidate;

    if (entry.inspectorDraft.measuredCandidateEvidence !== false) {
      issues.push(`${candidate}.inspectorDraft.measuredCandidateEvidence must be false`);
    }

    if (entry.inspectorDraft.runtimeUnderTest !== 'fake-sampler-engine') {
      issues.push(`${candidate}.inspectorDraft.runtimeUnderTest must be fake-sampler-engine`);
    }

    if (entry.inspectorDraft.probeTemplate.evidenceSource !== 'estimate') {
      issues.push(`${candidate}.inspectorDraft.probeTemplate.evidenceSource must be estimate`);
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

function collectInvalidMeasurementFields(
  entries: PhysicalDevicePrototypeProbeHandoffInput[],
): string[] {
  const invalidFields: string[] = [];

  for (const entry of entries) {
    const candidate = entry.inspectorDraft.probeTemplate.candidate;
    for (const field of getInvalidMeasurementFields(entry)) {
      invalidFields.push(`${candidate}.${field}`);
    }
  }

  return invalidFields;
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
  manifestIssues: string[];
  inspectorDraftIssues: string[];
  missingMeasurementFields: string[];
  invalidMeasurementFields: string[];
  runtimeIssues: string[];
}): string[] {
  if (
    input.missingCandidates.length > 0 ||
    input.duplicateCandidates.length > 0 ||
    input.deviceLabelIssues.length > 0 ||
    input.timestampIssues.length > 0 ||
    input.manifestIssues.length > 0 ||
    input.inspectorDraftIssues.length > 0 ||
    input.missingMeasurementFields.length > 0 ||
    input.invalidMeasurementFields.length > 0 ||
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
    `- Manifest issues: ${formatList(report.manifestIssues)}`,
    `- Inspector draft issues: ${formatList(report.inspectorDraftIssues)}`,
    `- Missing measurement fields: ${formatList(report.missingMeasurementFields)}`,
    `- Invalid measurement fields: ${formatList(report.invalidMeasurementFields)}`,
    `- Runtime issues: ${formatList(report.runtimeIssues)}`,
    `- Probe record issues: ${formatList(report.probeRecordIssues)}`,
  ].join('\n');
}

function formatList(values: string[]): string {
  return values.length === 0 ? 'none' : values.join(', ');
}

function isUtcIsoTimestamp(input: unknown): input is string {
  if (typeof input !== 'string' || !UTC_ISO_TIMESTAMP_PATTERN.test(input)) {
    return false;
  }

  const parsed = new Date(input);
  if (!Number.isFinite(parsed.getTime())) {
    return false;
  }

  const canonicalInput = input.includes('.') ? input : input.replace('Z', '.000Z');
  return parsed.toISOString() === canonicalInput;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getInvalidMeasurementFields(entry: PhysicalDevicePrototypeProbeHandoffInput): string[] {
  const invalidFields = getUnexpectedMeasurementFields(entry.measurements);
  const { measurements } = entry;

  for (const field of DURATION_MEASUREMENT_FIELDS) {
    const value = measurements[field];
    if (value !== null && value !== undefined && !isNonNegativeFiniteNumber(value)) {
      invalidFields.push(field);
    }
  }

  for (const field of OPTIONAL_DURATION_MEASUREMENT_FIELDS) {
    const value = measurements[field];
    if (value !== null && value !== undefined && !isNonNegativeFiniteNumber(value)) {
      invalidFields.push(field);
    }
  }

  for (const field of COUNT_MEASUREMENT_FIELDS) {
    const value = measurements[field];
    if (value !== null && value !== undefined && !isNonNegativeInteger(value)) {
      invalidFields.push(field);
    }
  }

  if (
    isNonNegativeInteger(measurements.glissandoTriggeredStrings) &&
    measurements.glissandoTriggeredStrings > MAX_GAYAGEUM_STRING_COUNT
  ) {
    invalidFields.push('glissandoTriggeredStrings');
  }

  for (const field of BOOLEAN_MEASUREMENT_FIELDS) {
    const value = measurements[field];
    if (value !== null && value !== undefined && typeof value !== 'boolean') {
      invalidFields.push(field);
    }
  }

  if (
    !isPrototypeRecordingMeasurementBackedByPlayback({
      inspectorDraft: entry.inspectorDraft,
      recordingCaptureSeconds: measurements.recordingCaptureSeconds,
    })
  ) {
    invalidFields.push('recordingCaptureSeconds');
  }

  return orderMeasurementFields([...new Set(invalidFields)]);
}

function getUnexpectedMeasurementFields(
  measurements: PhysicalDeviceAudioEngineProbeMeasurements,
): string[] {
  return Object.keys(measurements)
    .filter((field) => !isKnownMeasurementField(field))
    .sort();
}

function orderMeasurementFields(fields: string[]): string[] {
  const order = new Map<string, number>(
    ALL_MEASUREMENT_FIELDS.map((field, index) => [field, index]),
  );

  return [...fields].sort((left, right) => {
    const leftOrder = order.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right) ?? Number.MAX_SAFE_INTEGER;

    return leftOrder === rightOrder ? left.localeCompare(right) : leftOrder - rightOrder;
  });
}

function isKnownMeasurementField(field: string): boolean {
  return (ALL_MEASUREMENT_FIELDS as readonly string[]).includes(field);
}

function isNonNegativeFiniteNumber(input: unknown): input is number {
  return typeof input === 'number' && Number.isFinite(input) && input >= 0;
}

function isNonNegativeInteger(input: unknown): input is number {
  return Number.isInteger(input) && typeof input === 'number' && input >= 0;
}

function hasUnexpectedStringIndexesField(input: object): boolean {
  return Object.prototype.hasOwnProperty.call(input, 'unexpectedStringIndexes');
}

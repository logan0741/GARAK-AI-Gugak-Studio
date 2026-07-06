import { isIsoTimestamp } from './week1SmokeReportCommand';

export type D2DemoAndroidAppFlowEvidenceCheckCommandInput = {
  argv: string[];
  readTextFile: (path: string) => string;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

type AppFlowEvidenceStatus = 'APP_FLOW_EVIDENCE_READY' | 'APP_FLOW_EVIDENCE_NOT_READY';

const USAGE =
  'Usage: npm run qa:d2-demo-app-flow-evidence-check -- --evidence <app-flow-evidence.json> [--after <ISO>]';

const REQUIRED_STEP_IDS = [
  'home-loaded',
  'share-feed-loaded',
  'share-demo-player-loaded',
  'library-after-share-demo-player',
  'home-returned-after-share-demo-player',
  'mode-select-loaded',
  'instrument-select-loaded',
  'instrument-preview-loaded',
  'performance-loaded',
  'live-audio-events-visible',
  'recording-events-visible',
  'editor-loaded',
  'work-saved',
  'export-provenance-visible',
  'library-loaded',
  'export-library-loaded',
  'player-loaded',
];

const REQUIRED_RESIDUAL_PHYSICAL_CHECKS = [
  'audible physical speaker playback',
  'physical-device expo-audio probe',
];

export function runD2DemoAndroidAppFlowEvidenceCheckCommand(
  input: D2DemoAndroidAppFlowEvidenceCheckCommandInput,
): number {
  const args = parseArgs(input.argv);
  if (!args.ok) {
    input.writeStderr(args.message ?? USAGE);
    return 1;
  }

  let evidence: unknown;
  try {
    evidence = JSON.parse(input.readTextFile(args.evidencePath));
  } catch {
    input.writeStderr(`Could not read D-2 app-flow evidence: ${args.evidencePath}`);
    return 1;
  }

  const issues = collectAppFlowEvidenceIssues(evidence, args.after);
  const status: AppFlowEvidenceStatus =
    issues.length === 0 ? 'APP_FLOW_EVIDENCE_READY' : 'APP_FLOW_EVIDENCE_NOT_READY';
  input.writeStdout(formatAppFlowEvidenceSummary(status, issues, evidence));
  return status === 'APP_FLOW_EVIDENCE_READY' ? 0 : 1;
}

function parseArgs(
  argv: string[],
): { ok: true; evidencePath: string; after?: string } | { ok: false; message?: string } {
  const flags = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      return { ok: false };
    }
    flags.set(flag, value);
  }

  const evidencePath = flags.get('--evidence')?.trim();
  const after = flags.get('--after')?.trim();
  if (!evidencePath) {
    return { ok: false };
  }

  if (after !== undefined && !isIsoTimestamp(after)) {
    return {
      ok: false,
      message: 'Could not check D-2 app-flow evidence: --after must be an ISO timestamp',
    };
  }

  return { ok: true, evidencePath, after };
}

function collectAppFlowEvidenceIssues(evidence: unknown, after: string | undefined): string[] {
  if (!isRecord(evidence)) {
    return ['app-flow evidence must be an object'];
  }

  const issues: string[] = [];
  const generatedAt = readStringField(evidence, 'generatedAt');
  if (!isIsoTimestamp(generatedAt)) {
    issues.push('generatedAt must be an ISO timestamp');
  } else if (after !== undefined && Date.parse(generatedAt) < Date.parse(after)) {
    issues.push('generatedAt must be at or after --after');
  }

  if (evidence.status !== 'pass') {
    issues.push('app-flow evidence status must be pass');
  }

  if (evidence.targetKind !== 'emulator') {
    issues.push('app-flow evidence targetKind must be emulator');
  }

  const adbSerial = readStringField(evidence, 'adbSerial');
  if (!adbSerial.startsWith('emulator-')) {
    issues.push('app-flow evidence adbSerial must name an emulator target');
  }

  issues.push(...collectRequiredStepIssues(evidence.steps));
  issues.push(...collectObservationIssues(evidence.observations));
  issues.push(...collectResidualPhysicalCheckIssues(evidence.residualPhysicalDeviceChecks));

  return issues;
}

function collectRequiredStepIssues(stepsInput: unknown): string[] {
  if (!Array.isArray(stepsInput)) {
    return ['steps must be an array'];
  }

  const passedStepIds = new Set(
    stepsInput
      .filter(isRecord)
      .filter((step) => step.result === 'pass')
      .map((step) => readStringField(step, 'id'))
      .filter((id) => id.length > 0),
  );
  const missingStepIds = REQUIRED_STEP_IDS.filter((stepId) => !passedStepIds.has(stepId));

  return missingStepIds.length === 0
    ? []
    : [`required app-flow steps must pass: ${missingStepIds.join(', ')}`];
}

function collectObservationIssues(observationsInput: unknown): string[] {
  if (!isRecord(observationsInput)) {
    return ['observations must be an object'];
  }

  const issues: string[] = [];
  if (observationsInput.shareDemoPlayerPlayingUiVisible !== true) {
    issues.push('observations must confirm Home/Browse demo player playing UI');
  }
  if (observationsInput.liveAudioReadyBeforeTap !== true) {
    issues.push('observations must confirm S05 live audio readiness before touch input');
  }
  if (observationsInput.liveAudioReadinessLabel !== 'ready') {
    issues.push('observations must include the hidden live audio readiness label');
  }
  if (!isPositiveFiniteNumber(observationsInput.liveAudioSentEvents)) {
    issues.push('observations must show live audio events were sent');
  }
  if (observationsInput.recordingMode !== 'event-only') {
    issues.push('observations must confirm event-only recording mode');
  }
  if (readStringField(observationsInput, 'recordingFallbackReason').length === 0) {
    issues.push('observations must include recording fallback reason');
  }
  if (observationsInput.microphoneCaptureSuppressed !== true) {
    issues.push('observations must confirm microphone capture is suppressed for event-only recording');
  }
  if (readStringField(observationsInput, 'microphoneIsolationEvidence').length === 0) {
    issues.push('observations must include microphone isolation evidence');
  }
  if (!isPositiveFiniteNumber(observationsInput.recordingEvents)) {
    issues.push('observations must show recorded performance events');
  }
  if (observationsInput.exportRenderKind !== 'event_replay') {
    issues.push('observations must confirm event_replay export render kind');
  }
  if (!readStringField(observationsInput, 'exportProvenanceLabel').toLowerCase().includes('event replay')) {
    issues.push('observations must include visible event replay export provenance');
  }
  if (
    !isPositiveFiniteNumber(observationsInput.exportSourceEventCount) ||
    observationsInput.exportSourceEventCount !== observationsInput.recordingEvents
  ) {
    issues.push('observations must tie event_replay export provenance to the recorded event count');
  }
  if (observationsInput.exportedAudioVisible !== true) {
    issues.push('observations must confirm exported audio is visible in the library');
  }
  if (!readStringField(observationsInput, 'libraryExportProvenanceLabel').toLowerCase().includes('event replay')) {
    issues.push('observations must include visible library event replay provenance');
  }
  if (
    !isPositiveFiniteNumber(observationsInput.libraryExportSourceEventCount) ||
    observationsInput.libraryExportSourceEventCount !== observationsInput.exportSourceEventCount ||
    observationsInput.libraryExportSourceEventCount !== observationsInput.recordingEvents
  ) {
    issues.push('observations must tie library event_replay playback provenance to the recorded event count');
  }
  if (observationsInput.playerPlayingUiVisible !== true) {
    issues.push('observations must confirm player playing UI');
  }
  if (observationsInput.exportedPlayerPlayingUiVisible !== true) {
    issues.push('observations must confirm exported player playing UI');
  }

  return issues;
}

function collectResidualPhysicalCheckIssues(residualInput: unknown): string[] {
  if (!Array.isArray(residualInput)) {
    return ['residualPhysicalDeviceChecks must be an array'];
  }

  const residualChecks = new Set(
    residualInput.filter((value): value is string => typeof value === 'string'),
  );
  const missingChecks = REQUIRED_RESIDUAL_PHYSICAL_CHECKS.filter((check) => !residualChecks.has(check));

  return missingChecks.length === 0
    ? []
    : [`residualPhysicalDeviceChecks must keep physical-only checks visible: ${missingChecks.join(', ')}`];
}

function formatAppFlowEvidenceSummary(
  status: AppFlowEvidenceStatus,
  issues: string[],
  evidence: unknown,
): string {
  const residualChecks = isRecord(evidence) && Array.isArray(evidence.residualPhysicalDeviceChecks)
    ? evidence.residualPhysicalDeviceChecks.filter((value): value is string => typeof value === 'string')
    : [];

  return [
    '# D-2 App-Flow Evidence Summary',
    '',
    `- Status: ${status}`,
    `- Evidence issues: ${formatList(issues)}`,
    `- Residual physical checks: ${formatList(residualChecks)}`,
  ].join('\n');
}

function readStringField(input: Record<string, unknown>, field: string): string {
  return typeof input[field] === 'string' ? input[field].trim() : '';
}

function isPositiveFiniteNumber(input: unknown): boolean {
  return typeof input === 'number' && Number.isFinite(input) && input > 0;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function formatList(values: string[]): string {
  return values.length === 0 ? 'none' : values.join(', ');
}

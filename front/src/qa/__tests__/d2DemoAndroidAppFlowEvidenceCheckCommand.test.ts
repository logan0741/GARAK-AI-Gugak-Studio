import { expect, test } from 'vitest';
import { runD2DemoAndroidAppFlowEvidenceCheckCommand } from '../d2DemoAndroidAppFlowEvidenceCheckCommand';

test('returns usage when app-flow evidence path is missing', () => {
  const output = createEvidenceCheckHarness();

  expect(output.run([])).toBe(1);

  expect(output.stdout).toEqual([]);
  expect(output.stderr).toEqual([
    'Usage: npm run qa:d2-demo-app-flow-evidence-check -- --evidence <app-flow-evidence.json> [--after <ISO>]',
  ]);
});

test('reports ready emulator app-flow evidence without claiming physical readiness', () => {
  const output = createEvidenceCheckHarness({
    textFiles: new Map([['app-flow.json', JSON.stringify(createReadyAppFlowEvidence())]]),
  });

  expect(output.run(['--evidence', 'app-flow.json'])).toBe(0);

  expect(output.stderr).toEqual([]);
  expect(output.stdout.join('\n')).toContain('- Status: APP_FLOW_EVIDENCE_READY');
  expect(output.stdout.join('\n')).toContain('- Evidence issues: none');
  expect(output.stdout.join('\n')).toContain(
    '- Residual physical checks: audible physical speaker playback, physical-device expo-audio probe',
  );
});

test('rejects stale app-flow evidence when an after timestamp is provided', () => {
  const output = createEvidenceCheckHarness({
    textFiles: new Map([['app-flow.json', JSON.stringify(createReadyAppFlowEvidence())]]),
  });

  expect(
    output.run([
      '--evidence',
      'app-flow.json',
      '--after',
      '2026-07-06T03:50:48.213Z',
    ]),
  ).toBe(1);

  expect(output.stderr).toEqual([]);
  expect(output.stdout.join('\n')).toContain('- Status: APP_FLOW_EVIDENCE_NOT_READY');
  expect(output.stdout.join('\n')).toContain('generatedAt must be at or after --after');
});

test('rejects incomplete app-flow evidence that hides MVP spine observations', () => {
  const evidence = createReadyAppFlowEvidence({
    status: 'fail',
    targetKind: 'physical',
    steps: createReadyAppFlowEvidence().steps.filter((step) => step.id !== 'player-loaded'),
    observations: {
      ...createReadyAppFlowEvidence().observations,
      shareDemoPlayerPlayingUiVisible: false,
      liveAudioReadyBeforeTap: false,
      recordingMode: 'audio-capture',
      microphoneCaptureSuppressed: false,
      microphoneIsolationEvidence: '',
      exportRenderKind: 'audio_capture',
      exportSourceEventCount: 0,
      exportedPlayerPlayingUiVisible: false,
    },
    residualPhysicalDeviceChecks: ['audible physical speaker playback'],
  });
  const output = createEvidenceCheckHarness({
    textFiles: new Map([['app-flow.json', JSON.stringify(evidence)]]),
  });

  expect(output.run(['--evidence', 'app-flow.json'])).toBe(1);

  const summary = output.stdout.join('\n');
  expect(summary).toContain('app-flow evidence status must be pass');
  expect(summary).toContain('app-flow evidence targetKind must be emulator');
  expect(summary).toContain('required app-flow steps must pass: player-loaded');
  expect(summary).toContain('observations must confirm Home/Browse demo player playing UI');
  expect(summary).toContain('observations must confirm S05 live audio readiness before touch input');
  expect(summary).toContain('observations must confirm event-only recording mode');
  expect(summary).toContain(
    'observations must confirm microphone capture is suppressed for event-only recording',
  );
  expect(summary).toContain('observations must include microphone isolation evidence');
  expect(summary).toContain('observations must confirm event_replay export render kind');
  expect(summary).toContain(
    'observations must tie event_replay export provenance to the recorded event count',
  );
  expect(summary).toContain(
    'observations must tie library event_replay playback provenance to the recorded event count',
  );
  expect(summary).toContain('observations must confirm exported player playing UI');
  expect(summary).toContain(
    'residualPhysicalDeviceChecks must keep physical-only checks visible: physical-device expo-audio probe',
  );
});

function createEvidenceCheckHarness(input: {
  textFiles?: Map<string, string>;
} = {}) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const textFiles = input.textFiles ?? new Map<string, string>();

  return {
    stdout,
    stderr,
    run: (argv: string[]) =>
      runD2DemoAndroidAppFlowEvidenceCheckCommand({
        argv,
        readTextFile: (path) => textFiles.get(path) ?? '',
        writeStdout: (value) => stdout.push(value),
        writeStderr: (value) => stderr.push(value),
      }),
  };
}

function createReadyAppFlowEvidence(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: '2026-07-06T03:50:48.212Z',
    status: 'pass',
    targetKind: 'emulator',
    adbSerial: 'emulator-5554',
    steps: [
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
    ].map((id) => ({ id, result: 'pass', notes: `${id} passed` })),
    observations: {
      homeRotation: '0',
      shareDemoPlayerPlayingUiVisible: true,
      performanceRotation: '1',
      liveAudioReadyBeforeTap: true,
      liveAudioReadinessLabel: 'ready',
      liveAudioSentEvents: 16,
      recordingMode: 'event-only',
      recordingFallbackReason: 'Recording capture service is unavailable.',
      microphoneCaptureSuppressed: true,
      microphoneIsolationEvidence:
        'Product recording stayed event-only; no microphone capture artifact is used for playback or export.',
      recordingEvents: 8,
      editorRotation: '0',
      savedWorkVisible: true,
      exportRenderKind: 'event_replay',
      exportProvenanceLabel: 'Janggu / event replay',
      exportSourceEventCount: 8,
      exportedAudioVisible: true,
      libraryExportProvenanceLabel: 'event replay / Janggu / 0:04',
      libraryExportSourceEventCount: 8,
      playerPlayingUiVisible: true,
      exportedPlayerPlayingUiVisible: true,
    },
    residualPhysicalDeviceChecks: [
      'audible physical speaker playback',
      'physical-device expo-audio probe',
    ],
    ...overrides,
  };
}

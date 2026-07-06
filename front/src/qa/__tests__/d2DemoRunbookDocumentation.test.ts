import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const RUNBOOK_PATH = 'docs/qa/d2-demo-runbook.md';

test('documents the D-2 demo build, install, smoke, and fallback path', () => {
  const qaReadme = readText('docs/qa/README.md');
  const runbook = readText(RUNBOOK_PATH);

  expect(qaReadme).toContain('d2-demo-runbook.md');
  expect(runbook).toContain('npm run qa:d2-demo-android-build -- C:\\gsb');
  expect(runbook).toContain('npm run start:dev-client -- --clear --localhost');
  expect(runbook).toContain('npm run qa:d2-demo-smoke-template -- docs/qa/d2-demo-smoke-YYYYMMDD.json');
  expect(runbook).toContain('node .\\node_modules\\vite-node\\vite-node.mjs scripts\\d2-demo-smoke-report.ts');
  expect(runbook).toContain('npm run qa:d2-demo-android-device-smoke -- C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk');
  expect(runbook).toContain('npm run qa:d2-demo-android-recording-evidence -- --evidence docs/qa/d2-demo-smoke-YYYYMMDD.recording-evidence.json --device-evidence docs/qa/d2-demo-smoke-YYYYMMDD.device-evidence.json --run-started-at');
  expect(runbook).toContain('npm run qa:d2-demo-smoke-check-update -- --report docs/qa/d2-demo-smoke-YYYYMMDD.json --check recording-event-take-saved --result pass');
  expect(runbook).toContain('--recording-evidence docs/qa/d2-demo-smoke-YYYYMMDD.recording-evidence.json');
  expect(runbook).toContain('npm run qa:d2-demo-smoke-check-update -- --report docs/qa/d2-demo-smoke-YYYYMMDD.json --check home-browse-demo-playback --result pass');
  expect(runbook).toContain('--evidence docs/qa/d2-demo-smoke-YYYYMMDD.device-evidence.json');
  expect(runbook).toContain('It refuses invalid `pass` notes that would fail the final smoke-report evidence rules');
  expect(runbook).toContain('refuses physical pass updates until `adb-device-detected` and `apk-installed-and-launched` are already pass results');
  expect(runbook).toContain('stale, emulator, or Expo Dev Launcher evidence is rejected before the report is modified');
  expect(runbook).toContain('By default, it preserves the existing report `testedAt`');
  expect(runbook).toContain('Only pass `--tested-at` when intentionally advancing the whole rehearsal timestamp');
  expect(runbook).toContain('--dev-client-url http://127.0.0.1:8081');
  expect(runbook).toContain('npm run qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-YYYYMMDD.json --evidence docs/qa/d2-demo-smoke-YYYYMMDD.device-evidence.json --recording-evidence docs/qa/d2-demo-smoke-YYYYMMDD.recording-evidence.json --day5-probe docs/qa/day-5-audio-engine-probes.real-device.json');
  expect(runbook).toContain('npm run qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json');
  expect(runbook).toContain('npm run qa:prototype-handoff-check -- --d2-expo-only <expo-handoff.json>');
  expect(runbook).toContain('npm run qa:prototype-probe-record -- --d2-expo-only <expo-handoff.json> docs/qa/day-5-audio-engine-probes.real-device.json');
  expect(runbook).toContain('npm run qa:d2-expo-audio-probe-record -- --output docs/qa/day-5-audio-engine-probes.real-device.json');
  expect(runbook).toContain('npm run qa:d2-demo-smoke-check-update -- --report docs/qa/d2-demo-smoke-YYYYMMDD.json --check day5-expo-audio-probe-updated --result pass');
  expect(runbook).toContain('--day5-probe docs/qa/day-5-audio-engine-probes.real-device.json');
  expect(runbook).toContain('reads the probe sidecar before writing and rejects stale, mismatched, or failing `expo-audio` physical-device evidence');
  expect(runbook).toContain('This direct command refuses to write the probe record unless the generated `expo-audio` row parses as physical-device evidence and evaluates to `PASS` or `PASS_WITH_LIMITS`');
  expect(runbook).toContain('NOT_READY_FOR_D2_DEMO');
  expect(runbook).toContain('D-2 scoped evidence only, not final engine selection');
  expect(runbook).toContain('Do not present it as `FINAL_ENGINE_SELECTED`');
  expect(runbook).toContain('no connected adb device');
  expect(runbook).toContain('updates `deviceLabel` and `apkPath`');
  expect(runbook).toContain('sidecar `testedAt` to be an ISO timestamp at or after the report `testedAt`');
  expect(runbook).toContain('installed APK path in the launch pass note, report `apkPath`, and sidecar `apkPath` must match');
  expect(runbook).toContain('install, launch, or process verification fails');
  expect(runbook).toContain('reports textual ADB failures');
  expect(runbook).toContain('pidof');
  expect(runbook).toContain('foreground activity/window');
  expect(runbook).toContain('filtered post-launch logcat scan');
  expect(runbook).toContain('adb reverse tcp:8081 tcp:8081');
  expect(runbook).toContain('automatedEvidence.appUiLoaded: true');
  expect(runbook).toContain('Expo Dev Launcher');
  expect(runbook).toContain('npm run qa:d2-demo-android-app-flow-smoke -- --serial emulator-5556 --dev-client-url http://127.0.0.1:8081 --evidence docs/qa/d2-demo-app-flow-YYYYMMDD.emulator-evidence.json');
  expect(runbook).toContain('npm run qa:d2-demo-app-flow-evidence-check -- --evidence docs/qa/d2-demo-app-flow-YYYYMMDD.emulator-evidence.json');
  expect(runbook).toContain('APP_FLOW_EVIDENCE_READY');
  expect(runbook).toContain('Home `PLAY`, free creation, instrument selection, S05 live performance, event recording, S07 save, S07 Save & Share export, S17 export provenance, S18 exported-item visibility, and S19 exported-player UI');
  expect(runbook).toContain('liveAudioReadyBeforeTap: true');
  expect(runbook).toContain('Garak live audio ready');
  expect(runbook).toContain('recordingMode: "event-only"');
  expect(runbook).toContain('recordingFallbackReason');
  expect(runbook).toContain('exportRenderKind: "event_replay"');
  expect(runbook).toContain('`exportSourceEventCount` and `libraryExportSourceEventCount` matching `recordingEvents`');
  expect(runbook).toContain('visible export provenance labels');
  expect(runbook).toContain('not audible speaker proof');
  expect(runbook).toContain('missing or incomplete device sidecar evidence');
  expect(runbook).toContain('missing or incomplete recording capture sidecar evidence');
  expect(runbook).toContain('missing or incomplete Day-5 probe sidecar evidence');
  expect(runbook).toContain('Evidence still needed');
  expect(runbook).toContain('blocked checks and stale/missing sidecars');
  expect(runbook).toContain('If the Day-5 check is still blocked, the smoke report command does not require the probe file to exist yet');
  expect(runbook).toContain('measurementNotes` naming the physical device and measurement context');
  expect(runbook).toContain('`measuredAt` must be at or after the smoke report `testedAt`');
  expect(runbook).toContain('recordingMode: "event-only"');
  expect(runbook).toContain('status: "pass"');
  expect(runbook).toContain('`collectedAt` at or after the report `testedAt`');
  expect(runbook).toContain('audioEvidence` with app `AudioTrack` playback');
  expect(runbook).toContain('appProcessPid` matching the device sidecar process pid');
  expect(runbook).toContain('zero app audio input starts');
  expect(runbook).toContain('unchanged `RECORD_AUDIO` appops');
  expect(runbook).toContain('A sidecar with `status: "fail"` is diagnostic output only');
  expect(runbook).toContain('exits non-zero with `status: "fail"` if app microphone input');
  expect(runbook).toContain('missing app playback `AudioTrack`');
  expect(runbook).toContain(
    'the note must name `event replay` or `이벤트 녹음` provenance plus a positive source event count for the instrument-only export path',
  );
  expect(runbook).toContain('Do not use `audio capture` as passing evidence for this check');
  expect(runbook).toContain('USB debugging');
  expect(runbook).toContain('UI prototype + prepared audio/video fallback');
});

function readText(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

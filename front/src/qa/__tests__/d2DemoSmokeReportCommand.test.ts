import { expect, test } from 'vitest';
import { runD2DemoSmokeReportCommand } from '../d2DemoSmokeReportCommand';
import { runD2DemoSmokeTemplateCommand } from '../d2DemoSmokeTemplateCommand';

const DAY5_D2_SCOPED_EXPO_AUDIO_NOTE =
  'docs/qa/day-5-audio-engine-probes.real-device.json contains expo-audio physical-device probe evidence on Galaxy S24 / Android 15; qa:day5-audio exit 1; Status INCOMPLETE_DEVICE_EVIDENCE; missing react-native-audio-api; D-2 scoped evidence only, not final engine selection.';

const READY_DEVICE_EVIDENCE = {
  testedAt: '2026-07-04T11:10:00.000Z',
  apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
  targetKind: 'physical',
  adbSerial: 'R3CT1234567',
  adbDetails: 'product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
  packageName: 'com.gukakstudio.prototype',
  activity: '.MainActivity',
  launchTarget: 'com.gukakstudio.prototype/.MainActivity',
  processPid: '12345',
  packagePath: 'package:/data/app/~~hash==/com.gukakstudio.prototype/base.apk',
  foregroundWindow:
    'topResumedActivity=ActivityRecord{123 u0 com.gukakstudio.prototype/com.gukakstudio.prototype.MainActivity t1}',
  logcatRuntimeErrorScan: {
    clearedBeforeLaunch: true,
    exitCode: 0,
    matchingLineCount: 0,
    matchingLines: [],
  },
  automatedEvidence: {
    adbDeviceDetected: true,
    apkInstallCommandSucceeded: true,
    launchCommandSucceeded: true,
    appProcessRunning: true,
    packagePathResolved: true,
    foregroundWindowMentionsPackage: true,
    logcatRuntimeErrorWindowClean: true,
    appUiLoaded: true,
  },
  nonAutomatedChecksNotCoveredByDeviceSmoke: [
    'short-ascii-android-build',
    'home-browse-demo-playback',
    's05-instrument-touch-sound',
    'recording-event-take-saved',
    'library-export-playback',
    'day5-expo-audio-probe-updated',
  ],
};

const READY_RECORDING_EVIDENCE = {
  collectedAt: '2026-07-04T11:12:00.000Z',
  packageName: 'com.gukakstudio.prototype',
  recordingUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/demo.m4a',
  exists: true,
  sizeBytes: 4096,
};

const READY_EVENT_ONLY_RECORDING_EVIDENCE = {
  collectedAt: '2026-07-04T11:12:00.000Z',
  status: 'pass',
  packageName: 'com.gukakstudio.prototype',
  recordingMode: 'event-only',
  recordingUri: null,
  exists: false,
  sizeBytes: 0,
  audioEvidence: {
    appProcessPid: '12345',
    appAudioTrackStartedCount: 3,
    appRecordingActiveFalseCount: 1,
    appAudioInputStartedCount: 0,
    recordAudioAppOpsRefreshedDuringRun: false,
  },
};

const READY_DAY5_PROBE = {
  generatedAt: '2026-07-04T11:12:00.000Z',
  probes: [
    {
      candidate: 'expo-audio',
      evidenceSource: 'physical-device',
      deviceLabel: 'Galaxy S24 / Android 15',
      measuredAt: '2026-07-04T11:11:00.000Z',
      measurementNotes:
        'D-2 scoped physical-device probe on Galaxy S24 / Android 15 from S05 tap latency smoke and qa:day5-audio handoff.',
      touchToSoundLatencyMs: 45,
      firstTouchLatencyMs: 72,
      steadyTouchLatencyMs: 41,
      maxStableVoices: 8,
      pitchBendSmooth: true,
      glissandoTriggeredStrings: 12,
      muteReleaseClean: true,
      preloadStable: true,
      sessionFallbackPreserved: true,
      recordingCaptureSeconds: 10,
    },
  ],
};

function createLaunchReadyReport() {
  return {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345',
      },
    ],
  };
}

test('returns usage when D-2 demo smoke report path is missing', () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [],
      readTextFile: () => '',
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stdout).toEqual([]);
  expect(stderr).toEqual([
    'Usage: npm run qa:d2-demo-smoke-report -- <d2-demo-smoke-report.json> [--evidence <device-evidence.json>] [--recording-evidence <recording-evidence.json>] [--day5-probe <probe-record.json>]',
  ]);
});

test('reports generated D-2 demo templates as not ready until checks are filled', () => {
  const templateWrites = new Map<string, string>();
  runD2DemoSmokeTemplateCommand({
    argv: [
      'd2-demo-smoke.json',
      'CJH',
      'Galaxy S24 / Android 15',
      'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    ],
    getGeneratedAt: () => '2026-07-04T11:00:00.000Z',
    writeTextFile: (path, value) => templateWrites.set(path, value),
    writeStdout: () => undefined,
    writeStderr: () => undefined,
  });

  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => templateWrites.get('d2-demo-smoke.json') ?? '',
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain('- Missing checks: none');
  expect(output).toContain('- Blocked checks: short-ascii-android-build');
  expect(output).toContain('- Failed checks: none');
});

test('reports D-2 demo smoke as ready only when every required check passes', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'Home -> S20 share player -> My Arirang audible on Galaxy S24 speaker.',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'S05 janggu tapped 3 zones; each tap audible on Galaxy S24 speaker.',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after 8 second event-only recording; event-only fallback label visible.',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes:
          'S18 -> S19 exported item event replay playback audible on Galaxy S24 speaker; source event count 8.',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [
        'd2-demo-smoke.json',
        '--evidence',
        'device-evidence.json',
        '--recording-evidence',
        'recording-evidence.json',
        '--day5-probe',
        'docs/qa/day-5-audio-engine-probes.real-device.json',
      ],
      readTextFile: (path) =>
        path === 'device-evidence.json'
          ? JSON.stringify(READY_DEVICE_EVIDENCE)
          : path === 'recording-evidence.json'
            ? JSON.stringify(READY_EVENT_ONLY_RECORDING_EVIDENCE)
          : path === 'docs/qa/day-5-audio-engine-probes.real-device.json'
            ? JSON.stringify(READY_DAY5_PROBE)
            : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: READY_FOR_D2_DEMO');
  expect(output).toContain('- Blocked checks: none');
  expect(output).toContain('- Failed checks: none');
});

test('requires Day-5 probe sidecar when Day-5 expo evidence is marked pass', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'day5-expo-audio-probe-updated pass requires --day5-probe probe record with matching physical-device expo-audio evidence',
  );
});

test('does not read missing Day-5 probe sidecar while Day-5 expo evidence is still blocked', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'blocked',
        notes: 'Waiting for real-device expo-audio probe evidence.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json', '--day5-probe', 'missing-day5-probe.json'],
      readTextFile: (path) => {
        if (path === 'missing-day5-probe.json') {
          throw new Error('missing file');
        }
        return JSON.stringify(report);
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain('- Report issues: none');
  expect(output).toContain('- Blocked checks: day5-expo-audio-probe-updated');
  expect(output).not.toContain('Could not read Day-5 audio probe sidecar');
});

test('reports a missing Day-5 probe sidecar when Day-5 expo evidence is marked pass', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json', '--day5-probe', 'missing-day5-probe.json'],
      readTextFile: (path) => {
        if (path === 'missing-day5-probe.json') {
          throw new Error('missing file');
        }
        return JSON.stringify(report);
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain(
    'Could not read Day-5 audio probe sidecar: missing-day5-probe.json',
  );
});

test('rejects Day-5 probe sidecar that lacks matching expo physical-device evidence', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json', '--day5-probe', 'day5-probe.json'],
      readTextFile: (path) =>
        path === 'day5-probe.json'
          ? JSON.stringify({
              ...READY_DAY5_PROBE,
              probes: [
                {
                  ...READY_DAY5_PROBE.probes[0],
                  deviceLabel: 'Pixel 8 / Android 15',
                },
              ],
            })
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'Day-5 probe sidecar must include an expo-audio physical-device probe for Galaxy S24 / Android 15',
  );
});

test('rejects Day-5 probe sidecar without physical-device measurement notes', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes:
          'day5-probe.json contains expo-audio physical-device probe evidence on Galaxy S24 / Android 15; qa:day5-audio exit 1; Status INCOMPLETE_DEVICE_EVIDENCE; missing react-native-audio-api; D-2 scoped evidence only, not final engine selection.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json', '--day5-probe', 'day5-probe.json'],
      readTextFile: (path) =>
        path === 'day5-probe.json'
          ? JSON.stringify({
              ...READY_DAY5_PROBE,
              probes: READY_DAY5_PROBE.probes.map(({ measurementNotes, ...probe }) => probe),
            })
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'Day-5 probe sidecar expo-audio physical-device probe must include measurementNotes with physical-device measurement context',
  );
});

test('rejects Day-5 probe sidecar whose expo measurement predates the smoke report', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [
        'd2-demo-smoke.json',
        '--day5-probe',
        'docs/qa/day-5-audio-engine-probes.real-device.json',
      ],
      readTextFile: (path) =>
        path === 'docs/qa/day-5-audio-engine-probes.real-device.json'
          ? JSON.stringify({
              ...READY_DAY5_PROBE,
              probes: [
                {
                  ...READY_DAY5_PROBE.probes[0],
                  measuredAt: '2026-07-04T11:09:59.999Z',
                },
              ],
            })
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain(
    'Day-5 probe sidecar expo-audio physical-device measuredAt must be at or after the smoke report testedAt',
  );
});

test('rejects D-2 scoped Day-5 sidecar when the expo-audio physical probe itself fails', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [
        'd2-demo-smoke.json',
        '--day5-probe',
        'docs/qa/day-5-audio-engine-probes.real-device.json',
      ],
      readTextFile: (path) =>
        path === 'docs/qa/day-5-audio-engine-probes.real-device.json'
          ? JSON.stringify({
              ...READY_DAY5_PROBE,
              probes: [
                {
                  ...READY_DAY5_PROBE.probes[0],
                  touchToSoundLatencyMs: 82,
                  firstTouchLatencyMs: 140,
                  steadyTouchLatencyMs: 65,
                  glissandoTriggeredStrings: 5,
                },
              ],
            })
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'Day-5 probe sidecar expo-audio physical-device probe must evaluate to PASS or PASS_WITH_LIMITS for D-2 scoped evidence',
  );
});

test('rejects final Day-5 notes when the probe sidecar is still expo-only incomplete evidence', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes:
          'docs/qa/day-5-audio-engine-probes.real-device.json contains expo-audio physical-device probe evidence on Galaxy S24 / Android 15; qa:day5-audio exit 0; Status FINAL_ENGINE_SELECTED.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [
        'd2-demo-smoke.json',
        '--day5-probe',
        'docs/qa/day-5-audio-engine-probes.real-device.json',
      ],
      readTextFile: (path) =>
        path === 'docs/qa/day-5-audio-engine-probes.real-device.json'
          ? JSON.stringify(READY_DAY5_PROBE)
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'day5-expo-audio-probe-updated final Day-5 notes must match --day5-probe status FINAL_ENGINE_SELECTED',
  );
});

test('does not accept ready launch evidence without the device sidecar', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'Home -> S20 share player -> My Arirang audible on Galaxy S24 speaker.',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'S05 janggu tapped 3 zones; each tap audible on Galaxy S24 speaker.',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after 8 second event-only recording; event-only fallback label visible.',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes:
          'S18 -> S19 exported item event replay playback audible on Galaxy S24 speaker; source event count 8.',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'apk-installed-and-launched pass requires --evidence device sidecar with foreground and logcat evidence',
  );
});

test('does not accept emulator sidecar evidence for the physical D-2 readiness gate', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes:
          'ADB device emulator-5556 product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:3',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 4379',
      },
    ],
  };
  const emulatorEvidence = {
    ...READY_DEVICE_EVIDENCE,
    targetKind: 'emulator',
    adbSerial: 'emulator-5556',
    adbDetails: 'product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:3',
    processPid: '4379',
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json', '--evidence', 'emulator-evidence.json'],
      readTextFile: (path) =>
        path === 'emulator-evidence.json'
          ? JSON.stringify(emulatorEvidence)
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'device evidence sidecar must be from a physical Android presentation device, not an emulator',
  );
  expect(output).not.toContain(
    'device evidence sidecar adbSerial must match adb-device-detected notes',
  );
  expect(output).not.toContain(
    'device evidence sidecar processPid must match the smoke report process pid',
  );
  expect(output).not.toContain(
    'device evidence sidecar launchTarget must match the smoke report launch target',
  );
});

test('requires physical target kind in the device evidence sidecar', () => {
  const report = createLaunchReadyReport();
  const { targetKind, ...legacyEvidence } = READY_DEVICE_EVIDENCE;
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json', '--evidence', 'device-evidence.json'],
      readTextFile: (path) =>
        path === 'device-evidence.json'
          ? JSON.stringify(legacyEvidence)
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain(
    'device evidence sidecar targetKind must be physical',
  );
});

test('keeps emulator sidecar rejection focused when the physical report metadata differs', () => {
  const report = createLaunchReadyReport();
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json', '--evidence', 'emulator-evidence.json'],
      readTextFile: (path) =>
        path === 'emulator-evidence.json'
          ? JSON.stringify({
              ...READY_DEVICE_EVIDENCE,
              targetKind: 'emulator',
              adbSerial: 'emulator-5554',
              adbDetails:
                'product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:2',
              launchTarget:
                'gukakstudio://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081',
              processPid: '6633',
            })
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain(
    'device evidence sidecar must be from a physical Android presentation device, not an emulator',
  );
  expect(output).not.toContain(
    'device evidence sidecar adbSerial must match adb-device-detected notes',
  );
  expect(output).not.toContain(
    'device evidence sidecar adbDetails must match adb-device-detected notes',
  );
  expect(output).not.toContain(
    'device evidence sidecar processPid must match the smoke report process pid',
  );
  expect(output).not.toContain(
    'device evidence sidecar launchTarget must match the smoke report launch target',
  );
});

test('requires the device evidence sidecar to match adb-device-detected notes', () => {
  const report = createLaunchReadyReport();
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json', '--evidence', 'device-evidence.json'],
      readTextFile: (path) =>
        path === 'device-evidence.json'
          ? JSON.stringify({
              ...READY_DEVICE_EVIDENCE,
              adbSerial: 'R3CT9999999',
              adbDetails: 'product:other model:Galaxy_S23 device:other transport_id:9',
            })
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain(
    'device evidence sidecar adbSerial must match adb-device-detected notes',
  );
  expect(output).toContain(
    'device evidence sidecar adbDetails must match adb-device-detected notes',
  );
});

test('rejects stale device evidence sidecar that predates the smoke report', () => {
  const report = {
    ...createLaunchReadyReport(),
    testedAt: '2026-07-04T11:13:00.000Z',
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json', '--evidence', 'device-evidence.json'],
      readTextFile: (path) =>
        path === 'device-evidence.json'
          ? JSON.stringify(READY_DEVICE_EVIDENCE)
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain(
    'device evidence sidecar testedAt must be at or after the smoke report testedAt',
  );
});

test('requires launch pass APK path to match the smoke report APK path', () => {
  const report = {
    ...createLaunchReadyReport(),
    checks: createLaunchReadyReport().checks.map((check) =>
      check.id === 'apk-installed-and-launched'
        ? {
            ...check,
            notes:
              'Installed C:\\stale\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345',
          }
        : check,
    ),
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json', '--evidence', 'device-evidence.json'],
      readTextFile: (path) =>
        path === 'device-evidence.json'
          ? JSON.stringify(READY_DEVICE_EVIDENCE)
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain(
    'apk-installed-and-launched pass installed APK path must match the smoke report apkPath',
  );
});

test('does not accept a device sidecar that only reached Expo Dev Launcher', () => {
  const report = createLaunchReadyReport();
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json', '--evidence', 'device-evidence.json'],
      readTextFile: (path) =>
        path === 'device-evidence.json'
          ? JSON.stringify({
              ...READY_DEVICE_EVIDENCE,
              automatedEvidence: {
                ...READY_DEVICE_EVIDENCE.automatedEvidence,
                appUiLoaded: false,
              },
              supplementalEvidence: {
                uiHierarchySnapshot: {
                  exitCode: 0,
                  rotation: '0',
                  visibleTexts: ['GUKAK STUDIO', 'Development Build', 'DEVELOPMENT SERVERS'],
                  contentDescriptions: ['App Icon', 'User', 'Home', 'Updates', 'Settings'],
                  developmentLauncherVisible: true,
                  garakAppUiVisible: false,
                },
              },
            })
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain(
    'device evidence sidecar must confirm GARAK app UI loaded instead of Expo Dev Launcher; rerun qa:d2-demo-android-device-smoke with --dev-client-url http://127.0.0.1:8081 after Metro is running',
  );
});

test('requires recording sidecar when saved recording pass claims a capture URI', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 with capture URI file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/demo.m4a.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain(
    'recording-event-take-saved pass with capture URI requires --recording-evidence sidecar with matching URI, package, file existence, and size',
  );
});

test('accepts recording capture pass evidence with a matching recording sidecar', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'Home -> S20 share player -> My Arirang audible on Galaxy S24 speaker.',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'S05 janggu tapped 3 zones; each tap audible on Galaxy S24 speaker.',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 with capture URI file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/demo.m4a.',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes:
          'S18 -> S19 exported item event replay playback audible on Galaxy S24 speaker; source event count 8.',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [
        'd2-demo-smoke.json',
        '--evidence',
        'device-evidence.json',
        '--recording-evidence',
        'recording-evidence.json',
        '--day5-probe',
        'docs/qa/day-5-audio-engine-probes.real-device.json',
      ],
      readTextFile: (path) => {
        if (path === 'device-evidence.json') {
          return JSON.stringify(READY_DEVICE_EVIDENCE);
        }
        if (path === 'recording-evidence.json') {
          return JSON.stringify(READY_RECORDING_EVIDENCE);
        }
        if (path === 'docs/qa/day-5-audio-engine-probes.real-device.json') {
          return JSON.stringify(READY_DAY5_PROBE);
        }
        return JSON.stringify(report);
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain('- Status: READY_FOR_D2_DEMO');
});

test('rejects stale recording sidecar that predates the smoke report', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 with capture URI file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/demo.m4a.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json', '--recording-evidence', 'recording-evidence.json'],
      readTextFile: (path) =>
        path === 'recording-evidence.json'
          ? JSON.stringify({
              ...READY_RECORDING_EVIDENCE,
              collectedAt: '2026-07-04T11:09:59.999Z',
            })
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain(
    'recording evidence sidecar collectedAt must be at or after the smoke report testedAt',
  );
});

test('prints evidence prompts for stale sidecars even when smoke checks are already pass', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:13:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'Home -> S20 share player -> My Arirang audible on Galaxy S24 speaker.',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'S05 janggu tapped 3 zones; each tap audible on Galaxy S24 speaker.',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after 8 second event-only recording; event-only fallback label visible.',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes:
          'S18 -> S19 exported item event replay playback audible on Galaxy S24 speaker; source event count 8.',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [
        'd2-demo-smoke.json',
        '--evidence',
        'device-evidence.json',
        '--recording-evidence',
        'recording-evidence.json',
        '--day5-probe',
        'docs/qa/day-5-audio-engine-probes.real-device.json',
      ],
      readTextFile: (path) => {
        if (path === 'device-evidence.json') {
          return JSON.stringify(READY_DEVICE_EVIDENCE);
        }
        if (path === 'recording-evidence.json') {
          return JSON.stringify(READY_EVENT_ONLY_RECORDING_EVIDENCE);
        }
        if (path === 'docs/qa/day-5-audio-engine-probes.real-device.json') {
          return JSON.stringify(READY_DAY5_PROBE);
        }
        return JSON.stringify(report);
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Blocked checks: none');
  expect(output).toContain(
    'device-evidence: rerun qa:d2-demo-android-device-smoke on the physical device with --report and --evidence',
  );
  expect(output).toContain(
    'recording-evidence: rerun qa:d2-demo-android-recording-evidence after S05/S09 recording playback using the current device sidecar',
  );
  expect(output).toContain(
    'day5-probe: regenerate expo-audio physical-device probe evidence with qa:d2-expo-audio-probe-record or prototype probe record',
  );
});

test('rejects stale captured recording sidecar when saved recording notes use event-only fallback', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after 8 second event-only recording; event-only fallback label visible.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [
        'd2-demo-smoke.json',
        '--recording-evidence',
        'recording-evidence.json',
      ],
      readTextFile: (path) =>
        path === 'recording-evidence.json'
          ? JSON.stringify(READY_RECORDING_EVIDENCE)
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain(
    'recording evidence sidecar must not claim captured audio when recording-event-take-saved notes use event-only fallback',
  );
});

test('requires event-only recording sidecar when saved recording pass uses event-only fallback', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after 8 second event-only recording; event-only fallback label visible.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain(
    'recording-event-take-saved pass with event-only fallback requires --recording-evidence sidecar with event-only metadata',
  );
});

test('rejects invalid event-only recording sidecar metadata', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after event-only recording; event-only fallback label visible.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [
        'd2-demo-smoke.json',
        '--evidence',
        'device-evidence.json',
        '--recording-evidence',
        'recording-evidence.json',
      ],
      readTextFile: (path) => {
        if (path === 'device-evidence.json') {
          return JSON.stringify(READY_DEVICE_EVIDENCE);
        }
        if (path === 'recording-evidence.json') {
          return JSON.stringify({
            ...READY_EVENT_ONLY_RECORDING_EVIDENCE,
            packageName: 'com.other.app',
            recordingMode: 'audio-capture',
            exists: true,
            sizeBytes: 128,
          });
        }

        return JSON.stringify(report);
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('event-only recording evidence sidecar packageName must match device evidence packageName');
  expect(output).toContain('event-only recording evidence sidecar recordingMode must be event-only');
  expect(output).toContain('event-only recording evidence sidecar must not confirm a captured file exists');
  expect(output).toContain('event-only recording evidence sidecar sizeBytes must be 0');
});

test('rejects event-only recording sidecar with explicit fail status', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after event-only recording; event-only fallback label visible.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [
        'd2-demo-smoke.json',
        '--evidence',
        'device-evidence.json',
        '--recording-evidence',
        'recording-evidence.json',
      ],
      readTextFile: (path) => {
        if (path === 'device-evidence.json') {
          return JSON.stringify(READY_DEVICE_EVIDENCE);
        }
        if (path === 'recording-evidence.json') {
          return JSON.stringify({
            ...READY_EVENT_ONLY_RECORDING_EVIDENCE,
            status: 'fail',
            blockingIssues: [
              'app playback AudioTrack output was not detected',
            ],
          });
        }

        return JSON.stringify(report);
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain(
    'event-only recording evidence sidecar status must be pass when present',
  );
});

test('rejects event-only recording sidecar from a different app process', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after event-only recording; event-only fallback label visible.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [
        'd2-demo-smoke.json',
        '--evidence',
        'device-evidence.json',
        '--recording-evidence',
        'recording-evidence.json',
      ],
      readTextFile: (path) => {
        if (path === 'device-evidence.json') {
          return JSON.stringify(READY_DEVICE_EVIDENCE);
        }
        if (path === 'recording-evidence.json') {
          return JSON.stringify({
            ...READY_EVENT_ONLY_RECORDING_EVIDENCE,
            audioEvidence: {
              ...READY_EVENT_ONLY_RECORDING_EVIDENCE.audioEvidence,
              appProcessPid: '99999',
            },
          });
        }

        return JSON.stringify(report);
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain(
    'event-only recording evidence sidecar audioEvidence.appProcessPid must match device evidence processPid',
  );
});

test('rejects event-only recording sidecar that shows app microphone input', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after event-only recording; event-only fallback label visible.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [
        'd2-demo-smoke.json',
        '--evidence',
        'device-evidence.json',
        '--recording-evidence',
        'recording-evidence.json',
      ],
      readTextFile: (path) => {
        if (path === 'device-evidence.json') {
          return JSON.stringify(READY_DEVICE_EVIDENCE);
        }
        if (path === 'recording-evidence.json') {
          return JSON.stringify({
            ...READY_EVENT_ONLY_RECORDING_EVIDENCE,
            audioEvidence: {
              appProcessPid: '',
              appAudioTrackStartedCount: 0,
              appRecordingActiveFalseCount: 0,
              appAudioInputStartedCount: 1,
              recordAudioAppOpsRefreshedDuringRun: true,
            },
          });
        }

        return JSON.stringify(report);
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('event-only recording evidence sidecar audioEvidence.appProcessPid must be non-empty');
  expect(output).toContain('event-only recording evidence sidecar must show app AudioTrack playback output');
  expect(output).toContain('event-only recording evidence sidecar must show playback stayed non-recording for the app process');
  expect(output).toContain('event-only recording evidence sidecar must show zero app audio input starts');
  expect(output).toContain('event-only recording evidence sidecar must show RECORD_AUDIO appops did not refresh during the run');
});

test.each([
  {
    recordingEvidence: {
      ...READY_RECORDING_EVIDENCE,
      recordingUri: 'file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/other.m4a',
    },
    issue: 'recording evidence sidecar recordingUri must match the capture URI in recording-event-take-saved notes',
  },
  {
    recordingEvidence: {
      ...READY_RECORDING_EVIDENCE,
      packageName: 'com.other.app',
    },
    issue: 'recording evidence sidecar packageName must match device evidence packageName',
  },
  {
    recordingEvidence: {
      ...READY_RECORDING_EVIDENCE,
      exists: false,
    },
    issue: 'recording evidence sidecar must confirm the captured file exists',
  },
  {
    recordingEvidence: {
      ...READY_RECORDING_EVIDENCE,
      sizeBytes: 0,
    },
    issue: 'recording evidence sidecar must report a captured file size greater than 0 bytes',
  },
])('rejects invalid recording sidecar evidence: $issue', ({ recordingEvidence, issue }) => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 with capture URI file:///data/user/0/com.gukakstudio.prototype/files/garak-recordings/demo.m4a.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [
        'd2-demo-smoke.json',
        '--evidence',
        'device-evidence.json',
        '--recording-evidence',
        'recording-evidence.json',
      ],
      readTextFile: (path) => {
        if (path === 'device-evidence.json') {
          return JSON.stringify(READY_DEVICE_EVIDENCE);
        }
        if (path === 'recording-evidence.json') {
          return JSON.stringify(recordingEvidence);
        }
        return JSON.stringify(report);
      },
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain(issue);
});

test('does not accept hand-edited pass results for automated adb checks', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'verified on physical device',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes: 'verified on physical device',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'audible on physical device',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'audible on physical device',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes: 'event take saved on physical device',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes: 'audible on physical device',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: 'expo-audio physical-device probe recorded',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain('adb-device-detected pass must be written by the adb device smoke command');
  expect(output).toContain(
    'apk-installed-and-launched pass must include confirmed app process pid from the adb device smoke command',
  );
});

test('does not accept launch pass evidence without confirmed app process pid', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes: 'Installed C:\\gsb\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'Home -> S20 share player -> My Arirang audible on Galaxy S24 speaker.',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'S05 janggu tapped 3 zones; each tap audible on Galaxy S24 speaker.',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after 8 second event-only recording; event-only fallback label visible.',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes:
          'S18 -> S19 exported item event replay playback audible on Galaxy S24 speaker; source event count 8.',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'apk-installed-and-launched pass must include confirmed app process pid from the adb device smoke command',
  );
});

test('accepts launch pass evidence when adb pidof returns multiple process ids', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345 12346',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'Home -> S20 share player -> My Arirang audible on Galaxy S24 speaker.',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'S05 janggu tapped 3 zones; each tap audible on Galaxy S24 speaker.',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after 8 second event-only recording; event-only fallback label visible.',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes:
          'S18 -> S19 exported item event replay playback audible on Galaxy S24 speaker; source event count 8.',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: [
        'd2-demo-smoke.json',
        '--evidence',
        'device-evidence.json',
        '--recording-evidence',
        'recording-evidence.json',
        '--day5-probe',
        'docs/qa/day-5-audio-engine-probes.real-device.json',
      ],
      readTextFile: (path) =>
        path === 'device-evidence.json'
          ? JSON.stringify({ ...READY_DEVICE_EVIDENCE, processPid: '12345 12346' })
          : path === 'recording-evidence.json'
            ? JSON.stringify(READY_EVENT_ONLY_RECORDING_EVIDENCE)
          : path === 'docs/qa/day-5-audio-engine-probes.real-device.json'
            ? JSON.stringify(READY_DAY5_PROBE)
          : JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(0);

  expect(stderr).toEqual([]);
  expect(stdout.join('\n')).toContain('- Status: READY_FOR_D2_DEMO');
});

test('does not accept vague hand-written pass results for manual audible checks', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'audible on physical device',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'audible on physical device',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes: 'saved',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes: 'audible',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: 'expo-audio works',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain('home-browse-demo-playback pass must name the screen path and audible device result');
  expect(output).toContain('s05-instrument-touch-sound pass must name S05, the instrument tap, and audible result');
  expect(output).toContain('recording-event-take-saved pass must name the saved work/take evidence');
  expect(output).toContain('library-export-playback pass must name the S18/S19 library playback path and audible result');
  expect(output).toContain(
    'day5-expo-audio-probe-updated pass must include probe file, smoke device label, qa:day5-audio exit/status, and D-2 or final Day-5 scope',
  );
});

test('does not accept Home playback evidence without a demo player path', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'Home screen playback was audible on Galaxy S24 speaker.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'home-browse-demo-playback pass must name the Home/Browse to S20/S19 demo or bundled player path',
  );
});

test('does not accept D-2 Day-5 expo evidence without qa exit status and scope', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: 'expo-audio real-device probe recorded in docs/qa/day-5-audio-engine-probes.real-device.json.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'day5-expo-audio-probe-updated pass must include probe file, smoke device label, qa:day5-audio exit/status, and D-2 or final Day-5 scope',
  );
});

test('does not accept library export playback pass evidence without export provenance', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'library-export-playback',
        result: 'pass',
        notes: 'S18 -> S19 exported item playback audible on Galaxy S24 speaker.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'library-export-playback pass must name event replay/이벤트 녹음 provenance for the instrument-only export playback path',
  );
});

test('accepts Korean event recording provenance for library export playback evidence', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'library-export-playback',
        result: 'pass',
        notes:
          'S18 -> S19 exported item 이벤트 녹음 playback audible on Galaxy S24 speaker; 이벤트 8개.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).not.toContain(
    'library-export-playback pass must name event replay/이벤트 녹음 provenance for the instrument-only export playback path',
  );
  expect(output).not.toContain(
    'library-export-playback pass must name a positive event replay source event count for the instrument-only export playback path',
  );
});

test('does not accept library export playback pass evidence without a positive source event count', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'library-export-playback',
        result: 'pass',
        notes: 'S18 -> S19 exported item event replay playback audible on Galaxy S24 speaker.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'library-export-playback pass must name a positive event replay source event count for the instrument-only export playback path',
  );
});

test('does not accept library export playback pass evidence with mic capture provenance', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'library-export-playback',
        result: 'pass',
        notes: 'S18 -> S19 exported item audio capture playback audible on Galaxy S24 speaker.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'library-export-playback pass must name event replay/이벤트 녹음 provenance for the instrument-only export playback path',
  );
});

test('does not accept S05 instrument pass evidence without at least three audible taps', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'Home -> S20 share player -> My Arirang audible on Galaxy S24 speaker.',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'S05 janggu tapped 1 zone; audible on Galaxy S24 speaker.',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after 8 second event-only recording; event-only fallback label visible.',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes: 'S18 -> S19 exported item playback audible on Galaxy S24 speaker.',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    's05-instrument-touch-sound pass must confirm at least three audible taps or zones',
  );
});

test('does not accept S05 instrument pass evidence without per-tap audible confirmation', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'Home -> S20 share player -> My Arirang audible on Galaxy S24 speaker.',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'S05 janggu tapped 3 zones; audible on Galaxy S24 speaker.',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after 8 second event-only recording; event-only fallback label visible.',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes: 'S18 -> S19 exported item playback audible on Galaxy S24 speaker.',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    's05-instrument-touch-sound pass must confirm each tap was audible or no taps were silent',
  );
});

test('does not accept saved recording evidence without capture or event-only provenance', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'Home -> S20 share player -> My Arirang audible on Galaxy S24 speaker.',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'S05 janggu tapped 3 zones; each tap audible on Galaxy S24 speaker.',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes: 'S05 recording saved work-1 / track-1 / take-1 after 8 second event take.',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes: 'S18 -> S19 exported item playback audible on Galaxy S24 speaker.',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    'recording-event-take-saved pass must name S05/S09, saved work/take evidence, and capture URI or event-only fallback',
  );
});

test('does not accept recording capture wording without a capture URI', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'Home -> S20 share player -> My Arirang audible on Galaxy S24 speaker.',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'S05 janggu tapped 3 zones; each tap audible on Galaxy S24 speaker.',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes: 'S05 recording saved work-1 / track-1 / take-1 after 8 second captured audio take.',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes: 'S18 -> S19 exported item playback audible on Galaxy S24 speaker.',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain(
    'recording-event-take-saved pass must name S05/S09, saved work/take evidence, and capture URI or event-only fallback',
  );
});

test('does not accept event-only recording evidence without visible fallback evidence', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'Home -> S20 share player -> My Arirang audible on Galaxy S24 speaker.',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'S05 janggu tapped 3 zones; each tap audible on Galaxy S24 speaker.',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes: 'S05 recording saved work-1 / track-1 / take-1 after 8 second event-only recording.',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes: 'S18 -> S19 exported item playback audible on Galaxy S24 speaker.',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain(
    'recording-event-take-saved pass must name S05/S09, saved work/take evidence, and capture URI or event-only fallback',
  );
});

test('does not accept negated audible evidence for manual pass results', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'pass',
        notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'pass',
        notes:
          'Installed C:\\gsb\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity; confirmed process pid 12345',
      },
      {
        id: 'home-browse-demo-playback',
        result: 'pass',
        notes: 'Home -> S20 share player -> My Arirang demo opened; not audible on Galaxy S24 speaker.',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'pass',
        notes: 'S05 janggu tapped 3 zones; no sound on Galaxy S24 speaker.',
      },
      {
        id: 'recording-event-take-saved',
        result: 'pass',
        notes:
          'S05 recording saved work-1 / track-1 / take-1 after 8 second event-only recording; event-only fallback label visible.',
      },
      {
        id: 'library-export-playback',
        result: 'pass',
        notes: 'S18 -> S19 exported item playback silent on Galaxy S24 speaker.',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'pass',
        notes: DAY5_D2_SCOPED_EXPO_AUDIO_NOTE,
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain('home-browse-demo-playback pass must name a positive audible device result');
  expect(output).toContain('s05-instrument-touch-sound pass must name a positive audible result');
  expect(output).toContain('library-export-playback pass must name a positive audible device result');
});

test('keeps check evidence visible when report metadata is invalid', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Android device not connected 2026-07-04',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'pass',
        notes: 'BUILD SUCCESSFUL via qa:d2-demo-android-build -- C:\\gsb.',
      },
      {
        id: 'adb-device-detected',
        result: 'blocked',
        notes: 'No connected adb device. Connect the presentation Android device with USB debugging enabled.',
      },
      {
        id: 'apk-installed-and-launched',
        result: 'blocked',
        notes: 'Skipped because no connected adb device was available.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain('- Report issues: deviceLabel must name the physical device');
  expect(output).toContain('- Missing checks: home-browse-demo-playback');
  expect(output).toContain('- Blocked checks: adb-device-detected, apk-installed-and-launched');
});

test('requires notes for failed D-2 demo smoke checks', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'short-ascii-android-build',
        result: 'fail',
        notes: '',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain('- Failed checks: short-ascii-android-build');
  expect(output).toContain('- Failed checks without notes: short-ascii-android-build');
});

test('requires notes for blocked D-2 demo smoke checks', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 's05-instrument-touch-sound',
        result: 'blocked',
        notes: '',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain('- Blocked checks: s05-instrument-touch-sound');
  expect(output).toContain('- Blocked checks without notes: s05-instrument-touch-sound');
});

test('prints concrete remaining evidence prompts for blocked D-2 checks', () => {
  const report = {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: [
      {
        id: 'home-browse-demo-playback',
        result: 'blocked',
        notes: 'UI player opened, but audible output still needs human confirmation.',
      },
      {
        id: 's05-instrument-touch-sound',
        result: 'blocked',
        notes: 'Live audio service succeeded, but speaker output still needs human confirmation.',
      },
      {
        id: 'library-export-playback',
        result: 'blocked',
        notes: 'Export preview entered playing state, but audible output still needs human confirmation.',
      },
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'blocked',
        notes: 'Waiting for real-device expo-audio probe evidence.',
      },
    ],
  };
  const stdout: string[] = [];
  const stderr: string[] = [];

  expect(
    runD2DemoSmokeReportCommand({
      argv: ['d2-demo-smoke.json'],
      readTextFile: () => JSON.stringify(report),
      writeStdout: (value) => stdout.push(value),
      writeStderr: (value) => stderr.push(value),
    }),
  ).toBe(1);

  expect(stderr).toEqual([]);
  const output = stdout.join('\n');
  expect(output).toContain('- Status: NOT_READY_FOR_D2_DEMO');
  expect(output).toContain(
    '- Evidence still needed: home-browse-demo-playback: human must confirm Home/S20/S19 bundled playback is audible on the device speaker',
  );
  expect(output).toContain(
    's05-instrument-touch-sound: human must confirm at least three S05 selected-instrument taps are audible and no taps are silent',
  );
  expect(output).toContain(
    'library-export-playback: human must confirm S18/S19 exported item playback is audible on the device speaker and note event replay/이벤트 녹음 provenance plus a positive source event count for the instrument-only export path',
  );
  expect(output).toContain(
    'day5-expo-audio-probe-updated: generate or copy expo-audio physical-device probe evidence and validate it with --day5-probe',
  );
  expect(output).toContain('qa:d2-expo-audio-probe-record -- --output docs/qa/day-5-audio-engine-probes.real-device.json');
});

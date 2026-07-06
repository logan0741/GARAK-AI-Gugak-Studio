import { expect, test } from 'vitest';
import { runD2DemoSmokeCheckUpdateCommand } from '../d2DemoSmokeCheckUpdateCommand';

const READY_DEVICE_EVIDENCE = {
  testedAt: '2026-07-06T04:00:00.000Z',
  targetKind: 'physical',
  adbSerial: 'R3CT1234567',
  adbDetails: 'product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
  apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
  packageName: 'com.gukakstudio.prototype',
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
};

const READY_DEVICE_SMOKE_CHECKS = [
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
];

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

test('returns usage when D-2 smoke check update arguments are missing', () => {
  const output = createCheckUpdateHarness();

  expect(output.run([])).toBe(1);

  expect(output.stderr).toEqual([
    'Usage: npm run qa:d2-demo-smoke-check-update -- --report <d2-demo-smoke.json> --check <check-id> --result <pass|fail|blocked> --notes <text> [--tested-at <ISO>] [--evidence <device-evidence.json>] [--recording-evidence <recording-evidence.json>] [--day5-probe <probe-record.json>]',
  ]);
  expect([...output.textFiles]).toEqual([]);
});

test('updates one manual audible check with validated pass evidence', () => {
  const output = createCheckUpdateHarness({
    textFiles: new Map([
      [
        'd2-demo-smoke.json',
        JSON.stringify(createReport({
          checks: [
            ...READY_DEVICE_SMOKE_CHECKS,
            {
              id: 'home-browse-demo-playback',
              result: 'blocked',
              notes: 'Waiting for speaker confirmation.',
            },
            {
              id: 'library-export-playback',
              result: 'blocked',
              notes: 'Waiting for export speaker confirmation.',
            },
          ],
        })),
      ],
      ['device-evidence.json', JSON.stringify(READY_DEVICE_EVIDENCE)],
    ]),
  });

  expect(
    output.run([
      '--report',
      'd2-demo-smoke.json',
      '--check',
      'home-browse-demo-playback',
      '--result',
      'pass',
      '--notes',
      'Home -> S20 share player -> My Arirang bundled demo audio was audible on Galaxy S24 speaker.',
      '--evidence',
      'device-evidence.json',
      '--tested-at',
      '2026-07-06T04:00:00.000Z',
    ]),
  ).toBe(0);

  const updated = JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '');
  expect(updated.testedAt).toBe('2026-07-06T04:00:00.000Z');
  expect(updated.checks).toEqual([
    ...READY_DEVICE_SMOKE_CHECKS,
    {
      id: 'home-browse-demo-playback',
      result: 'pass',
      notes:
        'Home -> S20 share player -> My Arirang bundled demo audio was audible on Galaxy S24 speaker.',
    },
    {
      id: 'library-export-playback',
      result: 'blocked',
      notes: 'Waiting for export speaker confirmation.',
    },
  ]);
  expect(output.stdout).toEqual([
    'Updated D-2 smoke check home-browse-demo-playback in d2-demo-smoke.json',
  ]);
  expect(output.stderr).toEqual([]);
});

test('preserves the smoke report testedAt when the update does not explicitly advance it', () => {
  const output = createCheckUpdateHarness({
    textFiles: new Map([
      [
        'd2-demo-smoke.json',
        JSON.stringify(createReport({
          testedAt: '2026-07-06T03:00:00.000Z',
          checks: [
            ...READY_DEVICE_SMOKE_CHECKS,
            {
              id: 's05-instrument-touch-sound',
              result: 'blocked',
              notes: 'Waiting for speaker confirmation.',
            },
          ],
        })),
      ],
      ['device-evidence.json', JSON.stringify(READY_DEVICE_EVIDENCE)],
    ]),
  });

  expect(
    output.run([
      '--report',
      'd2-demo-smoke.json',
      '--check',
      's05-instrument-touch-sound',
      '--result',
      'pass',
      '--notes',
      'S05 selected janggu instrument produced audible sound on Galaxy S24 speaker; three taps were audible and no taps were silent.',
      '--evidence',
      'device-evidence.json',
    ]),
  ).toBe(0);

  const updated = JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '');
  expect(updated.testedAt).toBe('2026-07-06T03:00:00.000Z');
});

test('does not write a manual pass check when the evidence note fails smoke-report rules', () => {
  const originalReport = createReport({
    checks: [
      {
        id: 'library-export-playback',
        result: 'blocked',
        notes: 'Waiting for export speaker confirmation.',
      },
    ],
  });
  const output = createCheckUpdateHarness({
    textFiles: new Map([['d2-demo-smoke.json', JSON.stringify(originalReport)]]),
  });

  expect(
    output.run([
      '--report',
      'd2-demo-smoke.json',
      '--check',
      'library-export-playback',
      '--result',
      'pass',
      '--notes',
      'S18 export player opened but not audible on Galaxy S24 speaker.',
    ]),
  ).toBe(1);

  expect(JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '')).toEqual(originalReport);
  expect(output.stderr).toEqual([
    'Could not update D-2 smoke check: library-export-playback pass must name a positive audible device result',
  ]);
});

test('does not write a physical manual pass check without a device evidence sidecar', () => {
  const originalReport = createReport({
    checks: [
      ...READY_DEVICE_SMOKE_CHECKS,
      {
        id: 'home-browse-demo-playback',
        result: 'blocked',
        notes: 'Waiting for speaker confirmation.',
      },
    ],
  });
  const output = createCheckUpdateHarness({
    textFiles: new Map([['d2-demo-smoke.json', JSON.stringify(originalReport)]]),
  });

  expect(
    output.run([
      '--report',
      'd2-demo-smoke.json',
      '--check',
      'home-browse-demo-playback',
      '--result',
      'pass',
      '--notes',
      'Home -> S20 share player -> My Arirang bundled demo audio was audible on Galaxy S24 speaker.',
    ]),
  ).toBe(1);

  expect(JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '')).toEqual(originalReport);
  expect(output.stderr).toEqual([
    'Could not update D-2 smoke check: device evidence sidecar path is required',
  ]);
});

test('does not write a physical manual pass check before device smoke has passed', () => {
  const originalReport = createReport({
    checks: [
      {
        id: 'home-browse-demo-playback',
        result: 'blocked',
        notes: 'Waiting for speaker confirmation.',
      },
    ],
  });
  const output = createCheckUpdateHarness({
    textFiles: new Map([
      ['d2-demo-smoke.json', JSON.stringify(originalReport)],
      ['device-evidence.json', JSON.stringify(READY_DEVICE_EVIDENCE)],
    ]),
  });

  expect(
    output.run([
      '--report',
      'd2-demo-smoke.json',
      '--check',
      'home-browse-demo-playback',
      '--result',
      'pass',
      '--notes',
      'Home -> S20 share player -> My Arirang bundled demo audio was audible on Galaxy S24 speaker.',
      '--evidence',
      'device-evidence.json',
    ]),
  ).toBe(1);

  expect(JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '')).toEqual(originalReport);
  expect(output.stderr).toEqual([
    'Could not update D-2 smoke check: physical pass update requires adb-device-detected pass from qa:d2-demo-android-device-smoke; physical pass update requires apk-installed-and-launched pass from qa:d2-demo-android-device-smoke',
  ]);
});

test('does not write a physical manual pass check when the device sidecar is stale', () => {
  const originalReport = createReport({
    checks: [
      ...READY_DEVICE_SMOKE_CHECKS,
      {
        id: 'home-browse-demo-playback',
        result: 'blocked',
        notes: 'Waiting for speaker confirmation.',
      },
    ],
  });
  const output = createCheckUpdateHarness({
    textFiles: new Map([
      ['d2-demo-smoke.json', JSON.stringify(originalReport)],
      [
        'device-evidence.json',
        JSON.stringify({
          ...READY_DEVICE_EVIDENCE,
          testedAt: '2026-07-04T11:09:59.999Z',
        }),
      ],
    ]),
  });

  expect(
    output.run([
      '--report',
      'd2-demo-smoke.json',
      '--check',
      'home-browse-demo-playback',
      '--result',
      'pass',
      '--notes',
      'Home -> S20 share player -> My Arirang bundled demo audio was audible on Galaxy S24 speaker.',
      '--evidence',
      'device-evidence.json',
    ]),
  ).toBe(1);

  expect(JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '')).toEqual(originalReport);
  expect(output.stderr).toEqual([
    'Could not update D-2 smoke check: device evidence sidecar testedAt must be at or after the smoke report testedAt',
  ]);
});

test('does not write a library export pass check without source event count evidence', () => {
  const originalReport = createReport({
    checks: [
      {
        id: 'library-export-playback',
        result: 'blocked',
        notes: 'Waiting for export speaker confirmation.',
      },
    ],
  });
  const output = createCheckUpdateHarness({
    textFiles: new Map([['d2-demo-smoke.json', JSON.stringify(originalReport)]]),
  });

  expect(
    output.run([
      '--report',
      'd2-demo-smoke.json',
      '--check',
      'library-export-playback',
      '--result',
      'pass',
      '--notes',
      'S18 -> S19 exported item event replay playback audible on Galaxy S24 speaker.',
    ]),
  ).toBe(1);

  expect(JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '')).toEqual(originalReport);
  expect(output.stderr).toEqual([
    'Could not update D-2 smoke check: library-export-playback pass must name a positive event replay source event count for the instrument-only export playback path',
  ]);
});

test('updates a recording pass check only when the recording sidecar also passes', () => {
  const output = createCheckUpdateHarness({
    textFiles: new Map([
      [
        'd2-demo-smoke.json',
        JSON.stringify(createReport({
          checks: [
            ...READY_DEVICE_SMOKE_CHECKS,
            {
              id: 'recording-event-take-saved',
              result: 'blocked',
              notes: 'Waiting for recording sidecar.',
            },
          ],
        })),
      ],
      ['device-evidence.json', JSON.stringify(READY_DEVICE_EVIDENCE)],
      ['recording-evidence.json', JSON.stringify(READY_EVENT_ONLY_RECORDING_EVIDENCE)],
    ]),
  });

  expect(
    output.run([
      '--report',
      'd2-demo-smoke.json',
      '--check',
      'recording-event-take-saved',
      '--result',
      'pass',
      '--notes',
      'S05 recording saved work-1 / track-1 / take-1 after event-only recording; event-only fallback label visible.',
      '--evidence',
      'device-evidence.json',
      '--recording-evidence',
      'recording-evidence.json',
    ]),
  ).toBe(0);

  const updated = JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '');
  expect(updated.checks).toEqual([
    ...READY_DEVICE_SMOKE_CHECKS,
    {
      id: 'recording-event-take-saved',
      result: 'pass',
      notes:
        'S05 recording saved work-1 / track-1 / take-1 after event-only recording; event-only fallback label visible.',
    },
  ]);
});

test('does not update a recording pass check when the recording sidecar is explicit fail evidence', () => {
  const originalReport = createReport({
    checks: [
      ...READY_DEVICE_SMOKE_CHECKS,
      {
        id: 'recording-event-take-saved',
        result: 'blocked',
        notes: 'Waiting for recording sidecar.',
      },
    ],
  });
  const output = createCheckUpdateHarness({
    textFiles: new Map([
      ['d2-demo-smoke.json', JSON.stringify(originalReport)],
      ['device-evidence.json', JSON.stringify(READY_DEVICE_EVIDENCE)],
      [
        'recording-evidence.json',
        JSON.stringify({
          ...READY_EVENT_ONLY_RECORDING_EVIDENCE,
          status: 'fail',
        }),
      ],
    ]),
  });

  expect(
    output.run([
      '--report',
      'd2-demo-smoke.json',
      '--check',
      'recording-event-take-saved',
      '--result',
      'pass',
      '--notes',
      'S05 recording saved work-1 / track-1 / take-1 after event-only recording; event-only fallback label visible.',
      '--evidence',
      'device-evidence.json',
      '--recording-evidence',
      'recording-evidence.json',
    ]),
  ).toBe(1);

  expect(JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '')).toEqual(originalReport);
  expect(output.stderr).toEqual([
    'Could not update D-2 smoke check: event-only recording evidence sidecar status must be pass when present',
  ]);
});

test('requires a matching Day-5 probe sidecar before marking the Day-5 expo check as passed', () => {
  const originalReport = createReport({
    testedAt: '2026-07-06T03:00:00.000Z',
    checks: [
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'blocked',
        notes: 'Waiting for real-device expo-audio probe evidence.',
      },
    ],
  });
  const output = createCheckUpdateHarness({
    textFiles: new Map([
      ['d2-demo-smoke.json', JSON.stringify(originalReport)],
      ['docs/qa/day-5-audio-engine-probes.real-device.json', JSON.stringify(createD2ScopedProbe())],
    ]),
  });

  expect(
    output.run([
      '--report',
      'd2-demo-smoke.json',
      '--check',
      'day5-expo-audio-probe-updated',
      '--result',
      'pass',
      '--notes',
      'docs/qa/day-5-audio-engine-probes.real-device.json contains expo-audio physical-device probe evidence on Galaxy S24 / Android 15; qa:day5-audio exit 1; Status INCOMPLETE_DEVICE_EVIDENCE; missing react-native-audio-api; D-2 scoped evidence only, not final engine selection.',
      '--day5-probe',
      'docs/qa/day-5-audio-engine-probes.real-device.json',
      '--tested-at',
      '2026-07-06T03:00:00.000Z',
    ]),
  ).toBe(0);

  const updated = JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '');
  expect(updated.checks).toEqual([
    {
      id: 'day5-expo-audio-probe-updated',
      result: 'pass',
      notes:
        'docs/qa/day-5-audio-engine-probes.real-device.json contains expo-audio physical-device probe evidence on Galaxy S24 / Android 15; qa:day5-audio exit 1; Status INCOMPLETE_DEVICE_EVIDENCE; missing react-native-audio-api; D-2 scoped evidence only, not final engine selection.',
    },
  ]);
});

test('does not mark the Day-5 expo check as passed without a probe sidecar', () => {
  const originalReport = createReport({
    checks: [
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'blocked',
        notes: 'Waiting for real-device expo-audio probe evidence.',
      },
    ],
  });
  const output = createCheckUpdateHarness({
    textFiles: new Map([['d2-demo-smoke.json', JSON.stringify(originalReport)]]),
  });

  expect(
    output.run([
      '--report',
      'd2-demo-smoke.json',
      '--check',
      'day5-expo-audio-probe-updated',
      '--result',
      'pass',
      '--notes',
      'docs/qa/day-5-audio-engine-probes.real-device.json contains expo-audio physical-device probe evidence on Galaxy S24 / Android 15; qa:day5-audio exit 1; Status INCOMPLETE_DEVICE_EVIDENCE; missing react-native-audio-api; D-2 scoped evidence only, not final engine selection.',
    ]),
  ).toBe(1);

  expect(JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '')).toEqual(originalReport);
  expect(output.stderr).toEqual([
    'Could not update D-2 smoke check: day5-expo-audio-probe-updated pass requires --day5-probe probe record with matching physical-device expo-audio evidence',
  ]);
});

test('does not mark the Day-5 expo check as passed when the probe sidecar is stale', () => {
  const originalReport = createReport({
    testedAt: '2026-07-06T03:00:00.000Z',
    checks: [
      {
        id: 'day5-expo-audio-probe-updated',
        result: 'blocked',
        notes: 'Waiting for real-device expo-audio probe evidence.',
      },
    ],
  });
  const output = createCheckUpdateHarness({
    textFiles: new Map([
      ['d2-demo-smoke.json', JSON.stringify(originalReport)],
      [
        'docs/qa/day-5-audio-engine-probes.real-device.json',
        JSON.stringify(createD2ScopedProbe({ measuredAt: '2026-07-06T02:59:59.999Z' })),
      ],
    ]),
  });

  expect(
    output.run([
      '--report',
      'd2-demo-smoke.json',
      '--check',
      'day5-expo-audio-probe-updated',
      '--result',
      'pass',
      '--notes',
      'docs/qa/day-5-audio-engine-probes.real-device.json contains expo-audio physical-device probe evidence on Galaxy S24 / Android 15; qa:day5-audio exit 1; Status INCOMPLETE_DEVICE_EVIDENCE; missing react-native-audio-api; D-2 scoped evidence only, not final engine selection.',
      '--day5-probe',
      'docs/qa/day-5-audio-engine-probes.real-device.json',
      '--tested-at',
      '2026-07-06T03:00:00.000Z',
    ]),
  ).toBe(1);

  expect(JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '')).toEqual(originalReport);
  expect(output.stderr).toEqual([
    'Could not update D-2 smoke check: Day-5 probe sidecar expo-audio physical-device measuredAt must be at or after the smoke report testedAt',
  ]);
});

function createCheckUpdateHarness(input: {
  textFiles?: Map<string, string>;
} = {}) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const textFiles = input.textFiles ?? new Map<string, string>();

  return {
    stdout,
    stderr,
    textFiles,
    run: (argv: string[]) =>
      runD2DemoSmokeCheckUpdateCommand({
        argv,
        getTestedAt: () => '2026-07-06T03:30:00.000Z',
        readTextFile: (path) => textFiles.get(path) ?? '',
        writeTextFile: (path, value) => textFiles.set(path, value),
        writeStdout: (value) => stdout.push(value),
        writeStderr: (value) => stderr.push(value),
      }),
  };
}

function createReport(input: {
  checks: Array<{ id: string; result: string; notes: string }>;
  testedAt?: string;
}) {
  return {
    generatedAt: '2026-07-04T11:00:00.000Z',
    testedAt: input.testedAt ?? '2026-07-04T11:10:00.000Z',
    tester: 'CJH',
    deviceLabel: 'Galaxy S24 / Android 15',
    apkPath: 'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    checks: input.checks,
  };
}

function createD2ScopedProbe(input: {
  measuredAt?: string;
} = {}) {
  return {
    generatedAt: '2026-07-06T03:06:00.000Z',
    probes: [
      {
        candidate: 'expo-audio',
        evidenceSource: 'physical-device',
        deviceLabel: 'Galaxy S24 / Android 15',
        measuredAt: input.measuredAt ?? '2026-07-06T03:05:00.000Z',
        measurementNotes:
          'D-2 scoped physical-device probe on Galaxy S24 / Android 15 from S05 tap latency smoke and qa:day5-audio handoff.',
        touchToSoundLatencyMs: 38,
        firstTouchLatencyMs: 64,
        steadyTouchLatencyMs: 32,
        maxStableVoices: 9,
        pitchBendSmooth: true,
        glissandoTriggeredStrings: 12,
        muteReleaseClean: true,
        preloadStable: true,
        sessionFallbackPreserved: true,
        recordingCaptureSeconds: 0,
      },
    ],
  };
}

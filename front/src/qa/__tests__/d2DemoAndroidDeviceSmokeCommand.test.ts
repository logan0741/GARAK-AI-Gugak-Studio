import { expect, test } from 'vitest';
import { runD2DemoAndroidDeviceSmokeCommand } from '../d2DemoAndroidDeviceSmokeCommand';

test('returns usage when D-2 Android device smoke APK path is missing', () => {
  const output = createDeviceSmokeHarness();

  expect(output.run([])).toBe(1);

  expect(output.commands).toEqual([]);
  expect(output.stdout).toEqual([]);
  expect(output.stderr).toEqual([
    'Usage: npm run qa:d2-demo-android-device-smoke -- <apk-path> [--serial <adb-serial>] [--package <android-package>] [--activity <activity>] [--adb <adb-path>] [--report <d2-demo-smoke-report.json>] [--evidence <device-evidence.json>] [--dev-client-url <metro-url>] [--allow-emulator]',
  ]);
});

test('installs and launches the D-2 APK on a single connected adb device', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 logcat -c',
        {
          exitCode: 0,
        },
      ],
      [
        'adb -s R3CT1234567 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '12345\n',
        },
      ],
    ]),
  });

  expect(output.run(['C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk'])).toBe(0);

  expect(output.commands).toEqual([
    {
      command: 'adb',
      args: ['devices', '-l'],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: [
        '-s',
        'R3CT1234567',
        'install',
        '-r',
        'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
      ],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: [
        '-s',
        'R3CT1234567',
        'shell',
        'am',
        'start',
        '-n',
        'com.gukakstudio.prototype/.MainActivity',
      ],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: ['-s', 'R3CT1234567', 'shell', 'pidof', 'com.gukakstudio.prototype'],
      cwd: 'C:\\workspace\\front',
    },
  ]);
  expect(output.stdout).toEqual([
    'ADB device: R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
    'APK installed: C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    'App launched: com.gukakstudio.prototype/.MainActivity',
    'App process: com.gukakstudio.prototype pid 12345',
    'Automated D-2 checks passed: adb-device-detected, apk-installed-and-launched',
    'D-2 checks not covered by device smoke automation: short-ascii-android-build, home-browse-demo-playback, s05-instrument-touch-sound, recording-event-take-saved, library-export-playback, day5-expo-audio-probe-updated',
  ]);
  expect(output.stderr).toEqual([]);
});

test('launches the D-2 dev-client APK through Metro deep link when requested', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nemulator-5556 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:3\n',
        },
      ],
      [
        'adb -s emulator-5556 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '12345\n',
        },
      ],
      [
        'adb -s emulator-5556 exec-out uiautomator dump /dev/tty',
        {
          exitCode: 0,
          stdout:
            '<hierarchy rotation="0"><node text="GARAK과 함께 국악 연주하기" /><node text="게스트로 둘러보기" /></hierarchy>',
        },
      ],
    ]),
  });

  expect(
    output.run([
      'C:\\gsb\\app-debug.apk',
      '--serial',
      'emulator-5556',
      '--allow-emulator',
      '--dev-client-url',
      'http://127.0.0.1:8081',
      '--evidence',
      'emulator-evidence.json',
    ]),
  ).toBe(0);

  const devClientLaunchTarget =
    'gukakstudio://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081';
  expect(output.commands.slice(1, 5)).toEqual([
    {
      command: 'adb',
      args: ['-s', 'emulator-5556', 'logcat', '-c'],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: ['-s', 'emulator-5556', 'install', '-r', 'C:\\gsb\\app-debug.apk'],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: ['-s', 'emulator-5556', 'reverse', 'tcp:8081', 'tcp:8081'],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: [
        '-s',
        'emulator-5556',
        'shell',
        'am',
        'start',
        '-a',
        'android.intent.action.VIEW',
        '-d',
        devClientLaunchTarget,
        'com.gukakstudio.prototype',
      ],
      cwd: 'C:\\workspace\\front',
    },
  ]);
  expect(output.stdout).toContain(`App launched: ${devClientLaunchTarget}`);

  const evidence = JSON.parse(output.textFiles.get('emulator-evidence.json') ?? '');
  expect(evidence.launchTarget).toBe(devClientLaunchTarget);
  expect(evidence.automatedEvidence.appUiLoaded).toBe(true);
});

test('dismisses the Expo dev-client first-run menu before collecting sidecar evidence', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nemulator-5556 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:3\n',
        },
      ],
      [
        'adb -s emulator-5556 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '12345\n',
        },
      ],
      [
        'adb -s emulator-5556 exec-out uiautomator dump /dev/tty',
        {
          exitCode: 0,
          stdout:
            '<hierarchy rotation="0"><node text="This is the developer menu." bounds="[105,1965][975,2055]" /><node text="Continue" bounds="[464,2229][617,2274]" /></hierarchy>',
        },
      ],
    ]),
  });

  expect(
    output.run([
      'C:\\gsb\\app-debug.apk',
      '--serial',
      'emulator-5556',
      '--allow-emulator',
      '--dev-client-url',
      'http://127.0.0.1:8081',
      '--evidence',
      'emulator-evidence.json',
    ]),
  ).toBe(0);

  expect(output.commands).toContainEqual({
    command: 'adb',
    args: ['-s', 'emulator-5556', 'shell', 'input', 'tap', '540', '2251'],
    cwd: 'C:\\workspace\\front',
  });
});

test('closes the Expo dev menu before collecting sidecar evidence', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nemulator-5556 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:3\n',
        },
      ],
      [
        'adb -s emulator-5556 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '12345\n',
        },
      ],
      [
        'adb -s emulator-5556 exec-out uiautomator dump /dev/tty',
        {
          exitCode: 0,
          stdout:
            '<hierarchy rotation="0"><node text="Connected to:" bounds="[105,404][305,443]" /><node text="TOOLS" bounds="[63,814][158,855]" /><node content-desc="Close" bounds="[949,221][991,263]" /></hierarchy>',
        },
      ],
    ]),
  });

  expect(
    output.run([
      'C:\\gsb\\app-debug.apk',
      '--serial',
      'emulator-5556',
      '--allow-emulator',
      '--dev-client-url',
      'http://127.0.0.1:8081',
      '--evidence',
      'emulator-evidence.json',
    ]),
  ).toBe(0);

  expect(output.commands).toContainEqual({
    command: 'adb',
    args: ['-s', 'emulator-5556', 'shell', 'input', 'tap', '970', '242'],
    cwd: 'C:\\workspace\\front',
  });
});

test('does not accept GARAK background text while the Expo dev menu overlay is still open', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nemulator-5556 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:3\n',
        },
      ],
      [
        'adb -s emulator-5556 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '12345\n',
        },
      ],
      [
        'adb -s emulator-5556 exec-out uiautomator dump /dev/tty',
        [
          {
            exitCode: 0,
            stdout: '<hierarchy rotation="0" />',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node content-desc="Live audio sent: 1 events" /><node text="Connected to:" bounds="[105,404][305,443]" /><node text="TOOLS" bounds="[63,814][158,855]" /><node content-desc="Close" bounds="[949,221][991,263]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node content-desc="Live audio sent: 1 events" /></hierarchy>',
          },
        ],
      ],
    ]),
  });

  expect(
    output.run([
      'C:\\gsb\\app-debug.apk',
      '--serial',
      'emulator-5556',
      '--allow-emulator',
      '--dev-client-url',
      'http://127.0.0.1:8081',
      '--evidence',
      'emulator-evidence.json',
    ]),
  ).toBe(0);

  expect(output.commands).toContainEqual({
    command: 'adb',
    args: ['-s', 'emulator-5556', 'shell', 'input', 'tap', '970', '242'],
    cwd: 'C:\\workspace\\front',
  });
  const evidence = JSON.parse(output.textFiles.get('emulator-evidence.json') ?? '');
  expect(evidence.automatedEvidence.appUiLoaded).toBe(true);
  expect(evidence.supplementalEvidence.uiHierarchySnapshot.visibleTexts).not.toContain('TOOLS');
});

test('keeps polling when the Expo Dev Launcher appears before the GARAK app UI', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nemulator-5556 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:3\n',
        },
      ],
      [
        'adb -s emulator-5556 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '12345\n',
        },
      ],
      [
        'adb -s emulator-5556 exec-out uiautomator dump /dev/tty',
        [
          {
            exitCode: 0,
            stdout: '<hierarchy rotation="0" />',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node text="Development Build" /><node text="DEVELOPMENT SERVERS" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node content-desc="Live audio sent: 1 events" /></hierarchy>',
          },
        ],
      ],
    ]),
  });

  expect(
    output.run([
      'C:\\gsb\\app-debug.apk',
      '--serial',
      'emulator-5556',
      '--allow-emulator',
      '--dev-client-url',
      'http://127.0.0.1:8081',
      '--evidence',
      'emulator-evidence.json',
    ]),
  ).toBe(0);

  const evidence = JSON.parse(output.textFiles.get('emulator-evidence.json') ?? '');
  expect(evidence.automatedEvidence.appUiLoaded).toBe(true);
  expect(evidence.supplementalEvidence.uiHierarchySnapshot.developmentLauncherVisible).toBe(false);
});

test('records dev-client adb reverse failures in the D-2 smoke report', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    textFiles: new Map([
      [
        'd2-demo-smoke.json',
        JSON.stringify({
          generatedAt: '2026-07-04T11:00:00.000Z',
          testedAt: '2026-07-04T11:00:00.000Z',
          tester: 'CJH',
          deviceLabel: 'Galaxy S24 / Android 15',
          apkPath: 'C:\\stale\\app-debug.apk',
          checks: [
            'short-ascii-android-build',
            'adb-device-detected',
            'apk-installed-and-launched',
          ].map((id) => ({
            id,
            result: 'blocked',
            notes: '',
          })),
        }),
      ],
    ]),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 reverse tcp:8081 tcp:8081',
        {
          exitCode: 1,
          stderr: 'error: closed\n',
        },
      ],
    ]),
  });

  expect(
    output.run([
      'C:\\gsb\\app-debug.apk',
      '--dev-client-url',
      'http://127.0.0.1:8081',
      '--report',
      'd2-demo-smoke.json',
    ]),
  ).toBe(1);

  const report = JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '');
  expect(report.checks.slice(1, 3)).toEqual([
    {
      id: 'adb-device-detected',
      result: 'pass',
      notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
    },
    {
      id: 'apk-installed-and-launched',
      result: 'fail',
      notes:
        'Installed C:\\gsb\\app-debug.apk, but dev-client reverse tcp:8081 failed on R3CT1234567: adb reverse exit 1. error: closed',
    },
  ]);
});

test('writes sidecar device evidence without marking manual audible checks as passed', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '12345\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell pm path com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: 'package:/data/app/~~hash==/com.gukakstudio.prototype/base.apk\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell dumpsys activity activities',
        {
          exitCode: 0,
          stdout:
            'topResumedActivity=ActivityRecord{123 u0 com.gukakstudio.prototype/com.gukakstudio.prototype.MainActivity t1}\n',
        },
      ],
      [
        'adb -s R3CT1234567 logcat -d -v time AndroidRuntime:E ReactNativeJS:E ExpoModulesCore:E *:S',
        {
          exitCode: 0,
          stdout: '',
        },
      ],
      [
        'adb -s R3CT1234567 shell appops get com.gukakstudio.prototype RECORD_AUDIO',
        {
          exitCode: 0,
          stdout: 'RECORD_AUDIO: allow; time=+3h35m9s40ms ago; duration=+8s75ms\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell dumpsys audio',
        {
          exitCode: 0,
          stdout:
            'AudioPlaybackConfiguration piid:48319 type:android.media.AudioTrack u/pid:10062/12345 state:idle attr:AudioAttributes: usage=USAGE_MEDIA\n' +
            '07-05 22:41:54:453 player piid:48319 event:started package:com.gukakstudio.prototype\n' +
            '07-05 18:46:08:262 rec update riid:48103 uid:10062 session:28305 src:MIC not silenced pack:com.gukakstudio.prototype\n',
        },
      ],
      [
        'adb -s R3CT1234567 exec-out uiautomator dump /dev/tty',
        {
          exitCode: 0,
          stdout:
            '<hierarchy rotation="1"><node text="장구 자유 연주" content-desc="장구 자유 연주 가로 스테이지" /><node content-desc="Live audio sent: 1 events" /></hierarchy>',
        },
      ],
    ]),
  });

  expect(
    output.run(['C:\\gsb\\app-debug.apk', '--evidence', 'device-evidence.json']),
  ).toBe(0);

  expect(output.commands.slice(1)).toEqual([
    {
      command: 'adb',
      args: ['-s', 'R3CT1234567', 'logcat', '-c'],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: ['-s', 'R3CT1234567', 'install', '-r', 'C:\\gsb\\app-debug.apk'],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: [
        '-s',
        'R3CT1234567',
        'shell',
        'am',
        'start',
        '-n',
        'com.gukakstudio.prototype/.MainActivity',
      ],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: ['-s', 'R3CT1234567', 'shell', 'pidof', 'com.gukakstudio.prototype'],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: ['-s', 'R3CT1234567', 'shell', 'pm', 'path', 'com.gukakstudio.prototype'],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: ['-s', 'R3CT1234567', 'shell', 'dumpsys', 'activity', 'activities'],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: [
        '-s',
        'R3CT1234567',
        'logcat',
        '-d',
        '-v',
        'time',
        'AndroidRuntime:E',
        'ReactNativeJS:E',
        'ExpoModulesCore:E',
        '*:S',
      ],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: [
        '-s',
        'R3CT1234567',
        'shell',
        'appops',
        'get',
        'com.gukakstudio.prototype',
        'RECORD_AUDIO',
      ],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: ['-s', 'R3CT1234567', 'shell', 'dumpsys', 'audio'],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: ['-s', 'R3CT1234567', 'exec-out', 'uiautomator', 'dump', '/dev/tty'],
      cwd: 'C:\\workspace\\front',
    },
  ]);
  expect(output.commands.at(-6)).toEqual({
    command: 'adb',
    args: ['-s', 'R3CT1234567', 'shell', 'pm', 'path', 'com.gukakstudio.prototype'],
    cwd: 'C:\\workspace\\front',
  });
  expect(JSON.parse(output.textFiles.get('device-evidence.json') ?? '')).toEqual({
    testedAt: '2026-07-04T12:00:00.000Z',
    apkPath: 'C:\\gsb\\app-debug.apk',
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
    supplementalEvidence: {
      recordAudioAppOps: {
        exitCode: 0,
        outputLines: ['RECORD_AUDIO: allow; time=+3h35m9s40ms ago; duration=+8s75ms'],
      },
      audioServiceScan: {
        exitCode: 0,
        matchingLineCount: 2,
        matchingLines: [
          'AudioPlaybackConfiguration piid:48319 type:android.media.AudioTrack u/pid:10062/12345 state:idle attr:AudioAttributes: usage=USAGE_MEDIA',
          '07-05 22:41:54:453 player piid:48319 event:started package:com.gukakstudio.prototype',
        ],
      },
      uiHierarchySnapshot: {
        exitCode: 0,
        rotation: '1',
        visibleTexts: ['장구 자유 연주'],
        contentDescriptions: ['장구 자유 연주 가로 스테이지', 'Live audio sent: 1 events'],
        developmentLauncherVisible: false,
        garakAppUiVisible: true,
      },
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
  });
  expect(output.stdout).toContain('Wrote D-2 device evidence: device-evidence.json');
});

test('marks Expo Dev Launcher UI as not loaded app content in sidecar evidence', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '12345\n',
        },
      ],
      [
        'adb -s R3CT1234567 exec-out uiautomator dump /dev/tty',
        {
          exitCode: 0,
          stdout:
            '<hierarchy rotation="0"><node text="Development Build" /><node text="DEVELOPMENT SERVERS" /><node content-desc="Updates" /></hierarchy>',
        },
      ],
    ]),
  });

  expect(
    output.run(['C:\\gsb\\app-debug.apk', '--evidence', 'device-evidence.json']),
  ).toBe(0);

  const evidence = JSON.parse(output.textFiles.get('device-evidence.json') ?? '');
  expect(evidence.automatedEvidence.appUiLoaded).toBe(false);
  expect(evidence.supplementalEvidence.uiHierarchySnapshot).toMatchObject({
    visibleTexts: ['Development Build', 'DEVELOPMENT SERVERS'],
    contentDescriptions: ['Updates'],
    developmentLauncherVisible: true,
    garakAppUiVisible: false,
  });
});

test('marks stable GARAK guest-home accessibility labels as loaded app content', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '12345\n',
        },
      ],
      [
        'adb -s R3CT1234567 exec-out uiautomator dump /dev/tty',
        {
          exitCode: 0,
          stdout:
            '<hierarchy rotation="0"><node content-desc="Guest Mode" /><node content-desc="PLAY" /></hierarchy>',
        },
      ],
    ]),
  });

  expect(
    output.run(['C:\\gsb\\app-debug.apk', '--evidence', 'device-evidence.json']),
  ).toBe(0);

  const evidence = JSON.parse(output.textFiles.get('device-evidence.json') ?? '');
  expect(evidence.automatedEvidence.appUiLoaded).toBe(true);
  expect(evidence.supplementalEvidence.uiHierarchySnapshot).toMatchObject({
    contentDescriptions: ['Guest Mode', 'PLAY'],
    developmentLauncherVisible: false,
    garakAppUiVisible: true,
  });
});

test('marks the S05 live audio readiness QA label as loaded app content in sidecar evidence', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '12345\n',
        },
      ],
      [
        'adb -s R3CT1234567 exec-out uiautomator dump /dev/tty',
        {
          exitCode: 0,
          stdout:
            '<hierarchy rotation="1"><node content-desc="Garak live audio ready" /></hierarchy>',
        },
      ],
    ]),
  });

  expect(
    output.run(['C:\\gsb\\app-debug.apk', '--evidence', 'device-evidence.json']),
  ).toBe(0);

  const evidence = JSON.parse(output.textFiles.get('device-evidence.json') ?? '');
  expect(evidence.automatedEvidence.appUiLoaded).toBe(true);
  expect(evidence.supplementalEvidence.uiHierarchySnapshot).toMatchObject({
    contentDescriptions: ['Garak live audio ready'],
    developmentLauncherVisible: false,
    garakAppUiVisible: true,
  });
});

test('updates the D-2 smoke report automated checks after install and launch', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    textFiles: new Map([
      [
        'd2-demo-smoke.json',
        JSON.stringify({
          generatedAt: '2026-07-04T11:00:00.000Z',
          testedAt: '2026-07-04T11:00:00.000Z',
          tester: 'CJH',
          deviceLabel: 'replace-with-physical-device-model',
          apkPath: 'C:\\stale\\app-debug.apk',
          checks: [
            'short-ascii-android-build',
            'adb-device-detected',
            'apk-installed-and-launched',
            'home-browse-demo-playback',
            's05-instrument-touch-sound',
            'recording-event-take-saved',
            'library-export-playback',
            'day5-expo-audio-probe-updated',
          ].map((id) => ({
            id,
            result: 'blocked',
            notes: '',
          })),
        }),
      ],
    ]),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '12345\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell getprop ro.product.model',
        {
          exitCode: 0,
          stdout: 'Galaxy S24 Ultra\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell getprop ro.build.version.release',
        {
          exitCode: 0,
          stdout: '15\n',
        },
      ],
    ]),
  });

  expect(output.run(['C:\\gsb\\app-debug.apk', '--report', 'd2-demo-smoke.json'])).toBe(0);

  const report = JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '');
  expect(report.testedAt).toBe('2026-07-04T12:00:00.000Z');
  expect(report.deviceLabel).toBe('Galaxy S24 Ultra / Android 15');
  expect(report.apkPath).toBe('C:\\gsb\\app-debug.apk');
  expect(report.checks).toEqual([
    {
      id: 'short-ascii-android-build',
      result: 'blocked',
      notes: '',
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
      result: 'blocked',
      notes: '',
    },
    {
      id: 's05-instrument-touch-sound',
      result: 'blocked',
      notes: '',
    },
    {
      id: 'recording-event-take-saved',
      result: 'blocked',
      notes: '',
    },
    {
      id: 'library-export-playback',
      result: 'blocked',
      notes: '',
    },
    {
      id: 'day5-expo-audio-probe-updated',
      result: 'blocked',
      notes: '',
    },
  ]);
  expect(output.stdout).toContain('Updated D-2 smoke report automated checks: d2-demo-smoke.json');
});

test('does not refresh D-2 smoke report deviceLabel from adb details when getprop identity is incomplete', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    textFiles: new Map([
      [
        'd2-demo-smoke.json',
        JSON.stringify({
          generatedAt: '2026-07-04T11:00:00.000Z',
          testedAt: '2026-07-04T11:00:00.000Z',
          tester: 'CJH',
          deviceLabel: 'Pixel 8 / Android 15',
          apkPath: 'C:\\stale\\app-debug.apk',
          checks: [
            'short-ascii-android-build',
            'adb-device-detected',
            'apk-installed-and-launched',
            'home-browse-demo-playback',
            's05-instrument-touch-sound',
            'recording-event-take-saved',
            'library-export-playback',
            'day5-expo-audio-probe-updated',
          ].map((id) => ({
            id,
            result: 'blocked',
            notes: '',
          })),
        }),
      ],
    ]),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell getprop ro.product.model',
        {
          exitCode: 0,
          stdout: '\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell getprop ro.build.version.release',
        {
          exitCode: 0,
          stdout: '15\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '12345\n',
        },
      ],
    ]),
  });

  expect(output.run(['C:\\gsb\\app-debug.apk', '--report', 'd2-demo-smoke.json'])).toBe(0);

  const report = JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '');
  expect(report.testedAt).toBe('2026-07-04T12:00:00.000Z');
  expect(report.apkPath).toBe('C:\\gsb\\app-debug.apk');
  expect(report.deviceLabel).toBe('Pixel 8 / Android 15');
  expect(report.checks[1]).toEqual({
    id: 'adb-device-detected',
    result: 'pass',
    notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
  });
});

test('records install failure evidence in the D-2 smoke report after adb device detection', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    textFiles: new Map([
      [
        'd2-demo-smoke.json',
        JSON.stringify({
          generatedAt: '2026-07-04T11:00:00.000Z',
          testedAt: '2026-07-04T11:00:00.000Z',
          tester: 'CJH',
          deviceLabel: 'replace-with-physical-device-model',
          apkPath: 'C:\\stale\\app-debug.apk',
          checks: [
            'short-ascii-android-build',
            'adb-device-detected',
            'apk-installed-and-launched',
            'home-browse-demo-playback',
            's05-instrument-touch-sound',
            'recording-event-take-saved',
            'library-export-playback',
            'day5-expo-audio-probe-updated',
          ].map((id) => ({
            id,
            result: 'blocked',
            notes: '',
          })),
        }),
      ],
    ]),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 install -r C:\\gsb\\app-debug.apk',
        {
          exitCode: 42,
          stdout: 'Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE]\n',
          stderr: '',
        },
      ],
      [
        'adb -s R3CT1234567 shell getprop ro.product.model',
        {
          exitCode: 0,
          stdout: 'Galaxy S24 Ultra\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell getprop ro.build.version.release',
        {
          exitCode: 0,
          stdout: '15\n',
        },
      ],
    ]),
  });

  expect(
    output.run(['C:\\gsb\\app-debug.apk', '--report', 'd2-demo-smoke.json']),
  ).toBe(42);

  const report = JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '');
  expect(report.testedAt).toBe('2026-07-04T12:00:00.000Z');
  expect(report.deviceLabel).toBe('Galaxy S24 Ultra / Android 15');
  expect(report.apkPath).toBe('C:\\gsb\\app-debug.apk');
  expect(report.checks.slice(1, 3)).toEqual([
    {
      id: 'adb-device-detected',
      result: 'pass',
      notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
    },
    {
      id: 'apk-installed-and-launched',
      result: 'fail',
      notes:
        'Install failed on R3CT1234567: adb install exit 42. Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE]',
    },
  ]);
});

test('treats textual adb install failure as D-2 smoke failure even when adb exits zero', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    textFiles: new Map([
      [
        'd2-demo-smoke.json',
        JSON.stringify({
          generatedAt: '2026-07-04T11:00:00.000Z',
          testedAt: '2026-07-04T11:00:00.000Z',
          tester: 'CJH',
          deviceLabel: 'Galaxy S24 / Android 15',
          apkPath: 'C:\\stale\\app-debug.apk',
          checks: [
            'short-ascii-android-build',
            'adb-device-detected',
            'apk-installed-and-launched',
            'home-browse-demo-playback',
            's05-instrument-touch-sound',
            'recording-event-take-saved',
            'library-export-playback',
            'day5-expo-audio-probe-updated',
          ].map((id) => ({
            id,
            result: 'blocked',
            notes: '',
          })),
        }),
      ],
    ]),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 install -r C:\\gsb\\app-debug.apk',
        {
          exitCode: 0,
          stdout: 'Performing Streamed Install\nFailure [INSTALL_FAILED_VERSION_DOWNGRADE]\n',
        },
      ],
    ]),
  });

  expect(
    output.run(['C:\\gsb\\app-debug.apk', '--report', 'd2-demo-smoke.json']),
  ).toBe(1);

  const report = JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '');
  expect(report.checks.slice(1, 3)).toEqual([
    {
      id: 'adb-device-detected',
      result: 'pass',
      notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
    },
    {
      id: 'apk-installed-and-launched',
      result: 'fail',
      notes:
        'Install failed on R3CT1234567: adb install exit 0. Performing Streamed Install Failure [INSTALL_FAILED_VERSION_DOWNGRADE]',
    },
  ]);
});

test('records launch failure evidence in the D-2 smoke report after install succeeds', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    textFiles: new Map([
      [
        'd2-demo-smoke.json',
        JSON.stringify({
          generatedAt: '2026-07-04T11:00:00.000Z',
          testedAt: '2026-07-04T11:00:00.000Z',
          tester: 'CJH',
          deviceLabel: 'replace-with-physical-device-model',
          apkPath: 'C:\\stale\\app-debug.apk',
          checks: [
            'short-ascii-android-build',
            'adb-device-detected',
            'apk-installed-and-launched',
            'home-browse-demo-playback',
            's05-instrument-touch-sound',
            'recording-event-take-saved',
            'library-export-playback',
            'day5-expo-audio-probe-updated',
          ].map((id) => ({
            id,
            result: 'blocked',
            notes: '',
          })),
        }),
      ],
    ]),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell am start -n com.gukakstudio.prototype/.MainActivity',
        {
          exitCode: 17,
          stderr: 'Starting: Intent { cmp=com.gukakstudio.prototype/.MainActivity }\nError type 3\nActivity class does not exist.',
        },
      ],
      [
        'adb -s R3CT1234567 shell getprop ro.product.model',
        {
          exitCode: 0,
          stdout: 'Galaxy S24 Ultra\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell getprop ro.build.version.release',
        {
          exitCode: 0,
          stdout: '15\n',
        },
      ],
    ]),
  });

  expect(
    output.run(['C:\\gsb\\app-debug.apk', '--report', 'd2-demo-smoke.json']),
  ).toBe(17);

  const report = JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '');
  expect(report.testedAt).toBe('2026-07-04T12:00:00.000Z');
  expect(report.deviceLabel).toBe('Galaxy S24 Ultra / Android 15');
  expect(report.apkPath).toBe('C:\\gsb\\app-debug.apk');
  expect(report.checks.slice(1, 3)).toEqual([
    {
      id: 'adb-device-detected',
      result: 'pass',
      notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
    },
    {
      id: 'apk-installed-and-launched',
      result: 'fail',
      notes:
        'Installed C:\\gsb\\app-debug.apk, but launch com.gukakstudio.prototype/.MainActivity failed on R3CT1234567: adb shell am start exit 17. Starting: Intent { cmp=com.gukakstudio.prototype/.MainActivity } Error type 3 Activity class does not exist.',
    },
  ]);
});

test('treats textual adb launch failure as D-2 smoke failure even when adb exits zero', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    textFiles: new Map([
      [
        'd2-demo-smoke.json',
        JSON.stringify({
          generatedAt: '2026-07-04T11:00:00.000Z',
          testedAt: '2026-07-04T11:00:00.000Z',
          tester: 'CJH',
          deviceLabel: 'Galaxy S24 / Android 15',
          apkPath: 'C:\\stale\\app-debug.apk',
          checks: [
            'short-ascii-android-build',
            'adb-device-detected',
            'apk-installed-and-launched',
            'home-browse-demo-playback',
            's05-instrument-touch-sound',
            'recording-event-take-saved',
            'library-export-playback',
            'day5-expo-audio-probe-updated',
          ].map((id) => ({
            id,
            result: 'blocked',
            notes: '',
          })),
        }),
      ],
    ]),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell am start -n com.gukakstudio.prototype/.MainActivity',
        {
          exitCode: 0,
          stdout:
            'Starting: Intent { cmp=com.gukakstudio.prototype/.MainActivity }\nError type 3\nActivity class does not exist.\n',
        },
      ],
    ]),
  });

  expect(
    output.run(['C:\\gsb\\app-debug.apk', '--report', 'd2-demo-smoke.json']),
  ).toBe(1);

  const report = JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '');
  expect(report.checks.slice(1, 3)).toEqual([
    {
      id: 'adb-device-detected',
      result: 'pass',
      notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
    },
    {
      id: 'apk-installed-and-launched',
      result: 'fail',
      notes:
        'Installed C:\\gsb\\app-debug.apk, but launch com.gukakstudio.prototype/.MainActivity failed on R3CT1234567: adb shell am start exit 0. Starting: Intent { cmp=com.gukakstudio.prototype/.MainActivity } Error type 3 Activity class does not exist.',
    },
  ]);
});

test('records process check failure evidence when the launched app process is not running', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    textFiles: new Map([
      [
        'd2-demo-smoke.json',
        JSON.stringify({
          generatedAt: '2026-07-04T11:00:00.000Z',
          testedAt: '2026-07-04T11:00:00.000Z',
          tester: 'CJH',
          deviceLabel: 'Galaxy S24 / Android 15',
          apkPath: 'C:\\stale\\app-debug.apk',
          checks: [
            'short-ascii-android-build',
            'adb-device-detected',
            'apk-installed-and-launched',
            'home-browse-demo-playback',
            's05-instrument-touch-sound',
            'recording-event-take-saved',
            'library-export-playback',
            'day5-expo-audio-probe-updated',
          ].map((id) => ({
            id,
            result: 'blocked',
            notes: '',
          })),
        }),
      ],
    ]),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 1,
          stderr: '',
        },
      ],
      [
        "adb -s R3CT1234567 shell for i in 1 2 3 4 5 6 7 8 9 10; do pidof 'com.gukakstudio.prototype' && exit 0; sleep 1; done; exit 1",
        {
          exitCode: 1,
          stderr: '',
        },
      ],
    ]),
  });

  expect(
    output.run(['C:\\gsb\\app-debug.apk', '--report', 'd2-demo-smoke.json']),
  ).toBe(1);

  const report = JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '');
  expect(report.checks.slice(1, 3)).toEqual([
    {
      id: 'adb-device-detected',
      result: 'pass',
      notes: 'ADB device R3CT1234567 product:dm3q model:Galaxy_S24 device:dm3q transport_id:1',
    },
    {
      id: 'apk-installed-and-launched',
      result: 'fail',
      notes:
        'Installed C:\\gsb\\app-debug.apk and launched com.gukakstudio.prototype/.MainActivity, but process com.gukakstudio.prototype was not running: adb pidof exit 1',
    },
  ]);
});

test('retries process confirmation after launch before failing the D-2 smoke', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CT1234567 device product:dm3q model:Galaxy_S24 device:dm3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CT1234567 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 1,
          stderr: '',
        },
      ],
      [
        "adb -s R3CT1234567 shell for i in 1 2 3 4 5 6 7 8 9 10; do pidof 'com.gukakstudio.prototype' && exit 0; sleep 1; done; exit 1",
        {
          exitCode: 0,
          stdout: '12345\n',
        },
      ],
    ]),
  });

  expect(output.run(['C:\\gsb\\app-debug.apk'])).toBe(0);

  expect(output.commands.slice(3, 5)).toEqual([
    {
      command: 'adb',
      args: ['-s', 'R3CT1234567', 'shell', 'pidof', 'com.gukakstudio.prototype'],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: 'adb',
      args: [
        '-s',
        'R3CT1234567',
        'shell',
        "for i in 1 2 3 4 5 6 7 8 9 10; do pidof 'com.gukakstudio.prototype' && exit 0; sleep 1; done; exit 1",
      ],
      cwd: 'C:\\workspace\\front',
    },
  ]);
  expect(output.stdout).toContain('App process: com.gukakstudio.prototype pid 12345');
  expect(output.stderr).toEqual([]);
});

test('fails before install when no connected adb device is available', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout: 'List of devices attached\n\n',
        },
      ],
    ]),
  });

  expect(output.run(['C:\\gsb\\app-debug.apk'])).toBe(1);

  expect(output.commands).toEqual([
    {
      command: 'adb',
      args: ['devices', '-l'],
      cwd: 'C:\\workspace\\front',
    },
  ]);
  expect(output.stdout).toEqual([]);
  expect(output.stderr).toEqual([
    'Could not run D-2 Android device smoke: no connected adb device',
  ]);
});

test('records blocked device evidence in the D-2 smoke report when no adb device is connected', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    textFiles: new Map([
      [
        'd2-demo-smoke.json',
        JSON.stringify({
          generatedAt: '2026-07-04T11:00:00.000Z',
          testedAt: '2026-07-04T11:00:00.000Z',
          tester: 'CJH',
          deviceLabel: 'Galaxy S24 / Android 15',
          apkPath: 'C:\\gsb\\app-debug.apk',
          checks: [
            'short-ascii-android-build',
            'adb-device-detected',
            'apk-installed-and-launched',
            'home-browse-demo-playback',
            's05-instrument-touch-sound',
            'recording-event-take-saved',
            'library-export-playback',
            'day5-expo-audio-probe-updated',
          ].map((id) => ({
            id,
            result: 'blocked',
            notes: '',
          })),
        }),
      ],
    ]),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout: 'List of devices attached\n\n',
        },
      ],
    ]),
  });

  expect(
    output.run(['C:\\gsb\\app-debug.apk', '--report', 'd2-demo-smoke.json']),
  ).toBe(1);

  const report = JSON.parse(output.textFiles.get('d2-demo-smoke.json') ?? '');
  expect(report.testedAt).toBe('2026-07-04T12:00:00.000Z');
  expect(report.checks.slice(1, 3)).toEqual([
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
  ]);
});

test('requires --serial when multiple adb devices are connected', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nfirst device model:Pixel_8\nsecond device model:Galaxy_S24\n',
        },
      ],
    ]),
  });

  expect(output.run(['C:\\gsb\\app-debug.apk'])).toBe(1);

  expect(output.stderr).toEqual([
    'Could not run D-2 Android device smoke: multiple connected adb devices; pass --serial <adb-serial>',
  ]);
});

test('rejects emulator targets by default so physical smoke reports are not polluted', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nemulator-5556 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:3\n',
        },
      ],
    ]),
  });

  expect(output.run(['C:\\gsb\\app-debug.apk', '--serial', 'emulator-5556'])).toBe(1);

  expect(output.commands).toEqual([
    {
      command: 'adb',
      args: ['devices', '-l'],
      cwd: 'C:\\workspace\\front',
    },
  ]);
  expect(output.stderr).toEqual([
    'Could not run D-2 Android device smoke: adb target emulator-5556 is an emulator; use a physical presentation device, or pass --allow-emulator without --report for emulator regression evidence',
  ]);
});

test('allows emulator sidecar evidence when explicitly requested without updating the physical report', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nemulator-5556 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:3\n',
        },
      ],
      [
        'adb -s emulator-5556 shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '4379\n',
        },
      ],
      [
        'adb -s emulator-5556 shell pm path com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: 'package:/data/app/~~hash==/com.gukakstudio.prototype/base.apk\n',
        },
      ],
      [
        'adb -s emulator-5556 shell dumpsys activity activities',
        {
          exitCode: 0,
          stdout: 'ResumedActivity: ActivityRecord{123 u0 com.gukakstudio.prototype/.MainActivity t1}\n',
        },
      ],
      [
        'adb -s emulator-5556 logcat -d -v time AndroidRuntime:E ReactNativeJS:E ExpoModulesCore:E *:S',
        {
          exitCode: 0,
          stdout: '',
        },
      ],
    ]),
  });

  expect(
    output.run([
      'C:\\gsb\\app-debug.apk',
      '--serial',
      'emulator-5556',
      '--allow-emulator',
      '--evidence',
      'emulator-evidence.json',
    ]),
  ).toBe(0);

  const evidence = JSON.parse(output.textFiles.get('emulator-evidence.json') ?? '');
  expect(evidence.targetKind).toBe('emulator');
  expect(evidence.adbSerial).toBe('emulator-5556');
  expect(output.stdout).toContain('ADB target kind: emulator');
});

test('does not allow emulator runs to update the physical D-2 smoke report', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nemulator-5556 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:3\n',
        },
      ],
    ]),
  });

  expect(
    output.run([
      'C:\\gsb\\app-debug.apk',
      '--serial',
      'emulator-5556',
      '--allow-emulator',
      '--report',
      'd2-demo-smoke.json',
    ]),
  ).toBe(1);

  expect(output.commands).toEqual([
    {
      command: 'adb',
      args: ['devices', '-l'],
      cwd: 'C:\\workspace\\front',
    },
  ]);
  expect(output.stderr).toEqual([
    'Could not run D-2 Android device smoke: emulator smoke must not update the physical D-2 smoke report; omit --report and write a separate emulator evidence sidecar',
  ]);
});

test('uses the requested adb serial and custom package when provided', () => {
  const output = createDeviceSmokeHarness({
    existingPaths: new Set(['C:\\gsb\\app-debug.apk']),
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout: 'List of devices attached\nfirst device model:Pixel_8\nsecond device model:Galaxy_S24\n',
        },
      ],
      [
        'adb -s second shell pidof com.example.demo',
        {
          exitCode: 0,
          stdout: '7788\n',
        },
      ],
    ]),
  });

  expect(
    output.run([
      'C:\\gsb\\app-debug.apk',
      '--serial',
      'second',
      '--package',
      'com.example.demo',
      '--activity',
      '.DemoActivity',
    ]),
  ).toBe(0);

  expect(output.commands[1].args).toEqual([
    '-s',
    'second',
    'install',
    '-r',
    'C:\\gsb\\app-debug.apk',
  ]);
  expect(output.commands[2].args).toEqual([
    '-s',
    'second',
    'shell',
    'am',
    'start',
    '-n',
    'com.example.demo/.DemoActivity',
  ]);
  expect(output.commands[3].args).toEqual(['-s', 'second', 'shell', 'pidof', 'com.example.demo']);
});

type CommandResult = { exitCode: number; stdout?: string; stderr?: string };
type CommandResultEntry = CommandResult | CommandResult[];

function createDeviceSmokeHarness(input: {
  existingPaths?: Set<string>;
  commandResults?: Map<string, CommandResultEntry>;
  textFiles?: Map<string, string>;
} = {}) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const commands: Array<{ command: string; args: string[]; cwd: string }> = [];
  const existingPaths = input.existingPaths ?? new Set<string>();
  const commandResults = input.commandResults ?? new Map<string, CommandResultEntry>();
  const textFiles = input.textFiles ?? new Map<string, string>();

  return {
    stdout,
    stderr,
    commands,
    textFiles,
    run: (argv: string[]) =>
      runD2DemoAndroidDeviceSmokeCommand({
        argv,
        workingDirectory: 'C:\\workspace\\front',
        getTestedAt: () => '2026-07-04T12:00:00.000Z',
        pathExists: (path) => existingPaths.has(path),
        readTextFile: (path) => textFiles.get(path) ?? '',
        writeTextFile: (path, value) => textFiles.set(path, value),
        runCommand: (command, args, options) => {
          const key = [command, ...args].join(' ');
          commands.push({
            command,
            args,
            cwd: options.cwd,
          });
          const result = commandResults.get(key);
          if (Array.isArray(result)) {
            return result.shift() ?? { exitCode: 0, stdout: '' };
          }

          return result ?? { exitCode: 0, stdout: '' };
        },
        writeStdout: (value) => stdout.push(value),
        writeStderr: (value) => stderr.push(value),
      }),
  };
}

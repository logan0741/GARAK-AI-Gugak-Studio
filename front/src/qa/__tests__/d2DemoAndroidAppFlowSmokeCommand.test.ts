import { expect, test } from 'vitest';
import { runD2DemoAndroidAppFlowSmokeCommand } from '../d2DemoAndroidAppFlowSmokeCommand';

test('returns usage when the D-2 Android app-flow smoke evidence path is missing', () => {
  const output = createAppFlowSmokeHarness();

  expect(output.run(['--serial', 'emulator-5556'])).toBe(1);

  expect(output.commands).toEqual([]);
  expect(output.stderr).toEqual([
    'Usage: npm run qa:d2-demo-android-app-flow-smoke -- --evidence <app-flow-evidence.json> [--serial <adb-serial>] [--adb <adb-path>] [--dev-client-url <metro-url>]',
  ]);
});

test('reports Expo Dev Launcher when the app-flow smoke was not opened through a dev-client URL', () => {
  const output = createAppFlowSmokeHarness({
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
        'adb -s emulator-5556 exec-out uiautomator dump /dev/tty',
        {
          exitCode: 0,
          stdout:
            '<hierarchy rotation="0"><node text="GUKAK STUDIO" /><node text="Development Build" /><node text="DEVELOPMENT SERVERS" /><node text="http://10.0.2.2:8081" /></hierarchy>',
        },
      ],
    ]),
  });

  expect(output.run(['--serial', 'emulator-5556', '--evidence', 'flow-evidence.json'])).toBe(1);

  expect(output.stderr).toEqual([
    'Expo Dev Launcher is visible instead of the GARAK app; rerun qa:d2-demo-android-app-flow-smoke with --dev-client-url http://127.0.0.1:8081 after Metro is running',
  ]);
  const evidence = JSON.parse(output.textFiles.get('flow-evidence.json') ?? '');
  expect(evidence.steps).toEqual([
    {
      id: 'app-flow-smoke',
      result: 'fail',
      notes:
        'Expo Dev Launcher is visible instead of the GARAK app; rerun qa:d2-demo-android-app-flow-smoke with --dev-client-url http://127.0.0.1:8081 after Metro is running',
    },
  ]);
});

test('drives the emulator MVP spine and writes app-flow evidence', () => {
  const output = createAppFlowSmokeHarness({
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
        'adb -s emulator-5556 exec-out uiautomator dump /dev/tty',
        [
          {
            exitCode: 0,
            stdout: '<hierarchy rotation="0" />',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node content-desc="Guest Mode" bounds="[68,1425][1013,1551]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node content-desc="Guest Mode" bounds="[68,1425][1013,1551]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node content-desc="PLAY" bounds="[628,1429][917,1584]" /><node content-desc="라이브러리" bounds="[339,2074][473,2205]" /><node content-desc="홈" bounds="[473,2074][607,2205]" /><node content-desc="쉐어" bounds="[607,2074][741,2205]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node text="Hot" /><node content-desc="My Arirang" bounds="[88,1084][992,1324]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node content-desc="My Arirang 재생 화면" /><node content-desc="보관함으로 돌아가기" bounds="[87,111][176,200]" /><node content-desc="일시정지" /><node text="0:13" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node text="Playlist" /><node content-desc="라이브러리" bounds="[339,2074][473,2205]" /><node content-desc="홈" bounds="[473,2074][607,2205]" /><node content-desc="쉐어" bounds="[607,2074][741,2205]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node content-desc="PLAY" bounds="[628,1429][917,1584]" /><node content-desc="라이브러리" bounds="[339,2074][473,2205]" /><node content-desc="홈" bounds="[473,2074][607,2205]" /><node content-desc="쉐어" bounds="[607,2074][741,2205]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node text="원하는 연주모드를&#10;선택해요." /><node content-desc="NEXT" bounds="[90,2034][990,2160]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node text="연주 할 악기를&#10;선택해요." /><node content-desc="NEXT" bounds="[87,2059][993,2185]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node content-desc="장구 자유연주 화면 미리보기" /><node content-desc="NEXT" bounds="[87,2099][993,2225]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="1"><node content-desc="장구 자유 연주 가로 스테이지" bounds="[0,63][2400,1017]" /><node content-desc="녹음 시작" bounds="[2117,105][2232,221]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="1"><node content-desc="장구 자유 연주 가로 스테이지" bounds="[0,63][2400,1017]" /><node content-desc="녹음 시작" bounds="[2117,105][2232,221]" /><node content-desc="Garak live audio ready" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="1"><node content-desc="장구 자유 연주 가로 스테이지" bounds="[0,63][2400,1017]" /><node content-desc="녹음 시작" bounds="[2117,105][2232,221]" /><node content-desc="Live audio sent: 8 events" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="1"><node text="녹음 전 설정" /><node content-desc="녹음 시작" bounds="[1211,815][2324,941]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="1"><node content-desc="장구 자유 연주 가로 스테이지" bounds="[0,63][2400,1017]" /><node content-desc="연주 완료" bounds="[2117,105][2232,221]" /><node content-desc="Live audio sent: 16 events" /><node content-desc="이벤트 녹음만 저장됨: Recording capture service is unavailable." /><node text="녹음 중 · 이벤트 8개 · 약 3초 · 80 BPM" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node content-desc="작업 저장" bounds="[161,2003][917,2098]" /><node text="Track 1 : 장구" /><node content-desc="장구 작업 1 재생 미리보기" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node text="저장됨" /><node content-desc="프로젝트 저장 및 공유" bounds="[161,2119][917,2213]" /><node content-desc="뒤로가기" bounds="[87,111][176,200]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node text="사용 악기" /><node text="장구 / 이벤트 녹음" /><node content-desc="저장만 하기" bounds="[87,1670][527,1786]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node text="로컬 저장 · 작업 2개 · 내보낸 음원/결과 1개" /><node content-desc="내보낸 음원/결과 1" bounds="[550,1393][992,1493]" /><node content-desc="장구 작업 2, 1 track · 로컬 저장 · 서버 저장 대기, ▶, Ⅱ" bounds="[132,1644][948,1805]" /><node text="▶" bounds="[854,1706][881,1743]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node text="로컬 저장 · 작업 2개 · 내보낸 음원/결과 1개" /><node content-desc="장구 작업 2 내보내기, 이벤트 녹음 / 장구 / 0:04, ▶, Ⅱ" bounds="[132,1644][948,1805]" /><node text="이벤트 녹음 / 장구 / 0:04" /><node text="▶" bounds="[854,1706][881,1743]" /></hierarchy>',
          },
          {
            exitCode: 0,
            stdout:
              '<hierarchy rotation="0"><node content-desc="장구 작업 2 내보내기 재생 화면" /><node content-desc="일시정지" /><node text="0:13" /></hierarchy>',
          },
        ],
      ],
    ]),
  });

  expect(
    output.run([
      '--serial',
      'emulator-5556',
      '--evidence',
      'flow-evidence.json',
      '--dev-client-url',
      'http://127.0.0.1:8081',
    ]),
  ).toBe(0);

  expect(output.commands).toContainEqual({
    command: 'adb',
    args: ['-s', 'emulator-5556', 'shell', 'am', 'force-stop', 'com.gukakstudio.prototype'],
    cwd: 'C:\\workspace\\front',
  });
  expect(output.commands).toContainEqual({
    command: 'adb',
    args: ['-s', 'emulator-5556', 'reverse', 'tcp:8081', 'tcp:8081'],
    cwd: 'C:\\workspace\\front',
  });
  expect(output.commands).toContainEqual({
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
      'gukakstudio://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081',
      'com.gukakstudio.prototype',
    ],
    cwd: 'C:\\workspace\\front',
  });
  expect(output.commands).toContainEqual({
    command: 'adb',
    args: ['-s', 'emulator-5556', 'shell', 'input', 'tap', '772', '1506'],
    cwd: 'C:\\workspace\\front',
  });
  expect(output.commands).toContainEqual({
    command: 'adb',
    args: ['-s', 'emulator-5556', 'shell', 'input', 'tap', '2174', '163'],
    cwd: 'C:\\workspace\\front',
  });

  const evidence = JSON.parse(output.textFiles.get('flow-evidence.json') ?? '');
  expect(evidence.targetKind).toBe('emulator');
  expect(evidence.adbSerial).toBe('emulator-5556');
  expect(evidence.observations).toMatchObject({
    homeRotation: '0',
    performanceRotation: '1',
    liveAudioReadyBeforeTap: true,
    liveAudioReadinessLabel: 'ready',
    liveAudioSentEvents: 16,
    recordingMode: 'event-only',
    recordingCaptureNotice: 'Event-only recording: Recording capture service is unavailable.',
    recordingFallbackReason: 'Recording capture service is unavailable.',
    microphoneCaptureSuppressed: true,
    microphoneIsolationEvidence:
      'Product recording stayed event-only; no microphone capture artifact is used for playback or export.',
    recordingEvents: 8,
    shareDemoPlayerVisible: true,
    shareDemoPlayerPlayingUiVisible: true,
    editorRotation: '0',
    savedWorkVisible: true,
    exportRenderKind: 'event_replay',
    exportProvenanceLabel: 'Janggu / event replay',
    exportSourceEventCount: 8,
    exportedAudioVisible: true,
    libraryExportProvenanceLabel: 'event replay / Janggu / 0:04',
    libraryExportSourceEventCount: 8,
    libraryWorkVisible: true,
    playerPlayingUiVisible: true,
    exportedPlayerPlayingUiVisible: true,
  });
  expect(evidence.residualPhysicalDeviceChecks).toContain('audible physical speaker playback');
  expect(evidence.residualPhysicalDeviceChecks).toContain('physical-device expo-audio probe');
  expect(evidence.residualPhysicalDeviceChecks).not.toContain(
    'microphone isolation by human listening',
  );
  expect(output.stdout).toEqual([
    'D-2 Android app-flow smoke passed on emulator-5556',
    'Wrote D-2 app-flow evidence: flow-evidence.json',
  ]);
});

type CommandResult = {
  exitCode: number;
  stdout?: string;
  stderr?: string;
};

type RecordedCommand = {
  command: string;
  args: string[];
  cwd: string;
};

function createAppFlowSmokeHarness(input: {
  commandResults?: Map<string, CommandResult | CommandResult[]>;
} = {}) {
  const commands: RecordedCommand[] = [];
  const stdout: string[] = [];
  const stderr: string[] = [];
  const textFiles = new Map<string, string>();
  const commandResults = new Map(input.commandResults);

  return {
    commands,
    stdout,
    stderr,
    textFiles,
    run: (argv: string[]) =>
      runD2DemoAndroidAppFlowSmokeCommand({
        argv,
        workingDirectory: 'C:\\workspace\\front',
        getGeneratedAt: () => '2026-07-05T12:00:00.000Z',
        writeTextFile: (path, value) => textFiles.set(path, value),
        runCommand: (command, args, options) => {
          commands.push({ command, args, cwd: options.cwd });
          const key = [command, ...args].join(' ');
          const result = commandResults.get(key);
          if (Array.isArray(result)) {
            const [next, ...remaining] = result;
            commandResults.set(key, remaining);
            return next ?? { exitCode: 0 };
          }

          return result ?? { exitCode: 0 };
        },
        writeStdout: (value) => stdout.push(value),
        writeStderr: (value) => stderr.push(value),
      }),
  };
}

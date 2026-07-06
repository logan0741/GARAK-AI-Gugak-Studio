import { expect, test } from 'vitest';
import { runD2DemoAndroidRecordingEvidenceCommand } from '../d2DemoAndroidRecordingEvidenceCommand';

test('returns usage when recording evidence output or run start timestamp is missing', () => {
  const output = createRecordingEvidenceHarness();

  expect(output.run([])).toBe(1);

  expect(output.commands).toEqual([]);
  expect(output.stderr).toEqual([
    'Usage: npm run qa:d2-demo-android-recording-evidence -- --evidence <recording-evidence.json> --run-started-at <ISO> [--device-evidence <device-evidence.json>] [--serial <adb-serial>] [--package <android-package>] [--adb <adb-path>] [--allow-emulator]',
  ]);
});

test('writes event-only recording evidence from app logcat and RECORD_AUDIO appops', () => {
  const output = createRecordingEvidenceHarness({
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CX203CV8X device product:e3qksx model:SM_S928N device:e3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CX203CV8X logcat -d',
        {
          exitCode: 0,
          stdout: [
            '07-06 01:28:12.000 10062 32296 I AudioTrack: com.gukakstudio.prototype state:started piid=48335',
            '07-06 01:28:13.000 10062 32296 I AudioTrack: routing update mRecordingActive=false',
            '07-06 01:28:14.000 10062 11111 I AudioRecord: com.google.android.googlequicksearchbox startInput',
          ].join('\n'),
        },
      ],
      [
        'adb -s R3CX203CV8X shell cmd appops get com.gukakstudio.prototype RECORD_AUDIO',
        {
          exitCode: 0,
          stdout: 'Uid mode: RECORD_AUDIO: foreground\nRECORD_AUDIO: allow; time=+6h14m26s499ms ago; duration=+8s75ms\n',
        },
      ],
    ]),
    textFiles: new Map([
      [
        'device-evidence.json',
        JSON.stringify({
          testedAt: '2026-07-06T01:27:30.000Z',
          targetKind: 'physical',
          adbSerial: 'R3CX203CV8X',
          packageName: 'com.gukakstudio.prototype',
          processPid: '32296',
        }),
      ],
    ]),
  });

  expect(
    output.run([
      '--evidence',
      'recording-evidence.json',
      '--device-evidence',
      'device-evidence.json',
      '--run-started-at',
      '2026-07-06T01:28:00.000Z',
    ]),
  ).toBe(0);

  expect(output.stderr).toEqual([]);
  expect(output.stdout).toEqual([
    'Wrote D-2 event-only recording evidence: recording-evidence.json',
  ]);
  expect(output.commands).toEqual([
    { command: 'adb', args: ['devices', '-l'], cwd: 'C:\\workspace\\front' },
    { command: 'adb', args: ['-s', 'R3CX203CV8X', 'logcat', '-d'], cwd: 'C:\\workspace\\front' },
    {
      command: 'adb',
      args: [
        '-s',
        'R3CX203CV8X',
        'shell',
        'cmd',
        'appops',
        'get',
        'com.gukakstudio.prototype',
        'RECORD_AUDIO',
      ],
      cwd: 'C:\\workspace\\front',
    },
  ]);

  const evidence = JSON.parse(output.textFiles.get('recording-evidence.json') ?? '');
  expect(evidence).toMatchObject({
    collectedAt: '2026-07-06T01:30:00.000Z',
    packageName: 'com.gukakstudio.prototype',
    status: 'pass',
    recordingMode: 'event-only',
    recordingUri: null,
    exists: false,
    sizeBytes: 0,
    blockingIssues: [],
    audioEvidence: {
      appProcessPid: '32296',
      appAudioTrackStartedCount: 1,
      appRecordingActiveFalseCount: 1,
      appAudioInputStartedCount: 0,
      recordAudioAppOpsRefreshedDuringRun: false,
    },
  });
  expect(evidence.notes).toContain('event-only');
});

test('fails event-only recording evidence when app microphone input or refreshed appops are detected', () => {
  const output = createRecordingEvidenceHarness({
    commandResults: new Map([
      [
        'adb devices -l',
        {
          exitCode: 0,
          stdout:
            'List of devices attached\nR3CX203CV8X device product:e3qksx model:SM_S928N device:e3q transport_id:1\n',
        },
      ],
      [
        'adb -s R3CX203CV8X shell pidof com.gukakstudio.prototype',
        {
          exitCode: 0,
          stdout: '32296\n',
        },
      ],
      [
        'adb -s R3CX203CV8X logcat -d',
        {
          exitCode: 0,
          stdout: [
            '07-06 01:28:12.000 10062 32296 I AudioTrack: com.gukakstudio.prototype state:started',
            '07-06 01:28:13.000 10062 32296 I AudioRecord: com.gukakstudio.prototype startInput',
          ].join('\n'),
        },
      ],
      [
        'adb -s R3CX203CV8X shell cmd appops get com.gukakstudio.prototype RECORD_AUDIO',
        {
          exitCode: 0,
          stdout: 'RECORD_AUDIO: allow; time=+10s ago; duration=+8s75ms\n',
        },
      ],
    ]),
  });

  expect(
    output.run([
      '--serial',
      'R3CX203CV8X',
      '--evidence',
      'recording-evidence.json',
      '--run-started-at',
      '2026-07-06T01:28:00.000Z',
    ]),
  ).toBe(1);

  expect(output.stderr).toEqual([
    'Could not write passing event-only recording evidence: app microphone input was detected; RECORD_AUDIO appops refreshed during the recording run; app playback did not report mRecordingActive=false',
  ]);
  const evidence = JSON.parse(output.textFiles.get('recording-evidence.json') ?? '');
  expect(evidence).toMatchObject({
    status: 'fail',
    blockingIssues: [
      'app microphone input was detected',
      'RECORD_AUDIO appops refreshed during the recording run',
      'app playback did not report mRecordingActive=false',
    ],
    audioEvidence: {
      appAudioInputStartedCount: 1,
      recordAudioAppOpsRefreshedDuringRun: true,
    },
  });
  expect(evidence.notes).toContain('not passing evidence yet');
  expect(evidence.notes).toContain('Rerun immediately after the S05/S09 event-only recording flow');
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

function createRecordingEvidenceHarness(input: {
  commandResults?: Map<string, CommandResult | CommandResult[]>;
  textFiles?: Map<string, string>;
} = {}) {
  const commands: RecordedCommand[] = [];
  const stdout: string[] = [];
  const stderr: string[] = [];
  const textFiles = new Map(input.textFiles);
  const commandResults = new Map(input.commandResults);

  return {
    commands,
    stdout,
    stderr,
    textFiles,
    run: (argv: string[]) =>
      runD2DemoAndroidRecordingEvidenceCommand({
        argv,
        workingDirectory: 'C:\\workspace\\front',
        getCollectedAt: () => '2026-07-06T01:30:00.000Z',
        readTextFile: (path) => {
          const value = textFiles.get(path);
          if (value === undefined) {
            throw new Error(`Missing fixture file: ${path}`);
          }
          return value;
        },
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

import { expect, test } from 'vitest';
import { runD2DemoAndroidBuildCommand } from '../d2DemoAndroidBuildCommand';

test('returns usage when D-2 Android build target is missing', () => {
  const output = createBuildCommandHarness();

  expect(output.run([])).toBe(1);

  expect(output.stdout).toEqual([]);
  expect(output.commands).toEqual([]);
  expect(output.stderr).toEqual([
    'Usage: npm run qa:d2-demo-android-build -- <short-ascii-build-dir> [--install] [--refresh-native] [--skip-copy] [--skip-gradle]',
  ]);
});

test('copies the app to a short ASCII path and builds the debug APK', () => {
  const output = createBuildCommandHarness({
    existingPaths: new Set([
      'C:\\gsb\\node_modules',
      'C:\\gsb\\android',
      'C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    ]),
  });

  expect(output.run(['C:\\gsb'])).toBe(0);

  expect(output.commands).toEqual([
    {
      command: 'robocopy',
      args: [
        'C:\\workspace\\front',
        'C:\\gsb',
        '/E',
        '/XD',
        'node_modules',
        'android',
        '.expo',
        'dist',
        '.codex-backup',
        '.codex-logs',
        '/XF',
        '.codex-*.log',
        '*.log',
      ],
      cwd: 'C:\\workspace\\front',
    },
    {
      command: '.\\gradlew.bat',
      args: [':app:assembleDebug', '--console=plain', '--no-daemon'],
      cwd: 'C:\\gsb\\android',
    },
  ]);
  expect(output.stdout).toContain(
    'Android debug APK: C:\\gsb\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
  );
  expect(output.stdout).toContain('APK size bytes: 123456');
  expect(output.stderr).toEqual([]);
});

test('installs dependencies and prebuilds Android when the ASCII build path is fresh', () => {
  const output = createBuildCommandHarness({
    existingPaths: new Set([
      'C:\\fresh\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk',
    ]),
  });

  expect(output.run(['C:\\fresh'])).toBe(0);

  expect(output.commands.map((command) => command.command)).toEqual([
    'robocopy',
    'npm',
    'npx',
    '.\\gradlew.bat',
  ]);
  expect(output.commands[1]).toMatchObject({
    args: ['install'],
    cwd: 'C:\\fresh',
  });
  expect(output.commands[2]).toMatchObject({
    args: ['expo', 'prebuild', '--platform', 'android', '--no-install'],
    cwd: 'C:\\fresh',
  });
});

test('rejects non-ASCII and nested build paths before running commands', () => {
  const nonAscii = createBuildCommandHarness();
  expect(nonAscii.run(['C:\\국악\\gsb'])).toBe(1);
  expect(nonAscii.commands).toEqual([]);
  expect(nonAscii.stderr).toEqual([
    'Could not run D-2 Android build: build directory must be an absolute ASCII path',
  ]);

  const nested = createBuildCommandHarness();
  expect(nested.run(['C:\\workspace\\front\\build-copy'])).toBe(1);
  expect(nested.commands).toEqual([]);
  expect(nested.stderr).toEqual([
    'Could not run D-2 Android build: build directory must not be inside the source project',
  ]);
});

type BuildCommandInvocation = {
  command: string;
  args: string[];
  cwd: string;
};

function createBuildCommandHarness(input: {
  existingPaths?: Set<string>;
  commandExitCodes?: Map<string, number>;
} = {}) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const commands: BuildCommandInvocation[] = [];
  const existingPaths = input.existingPaths ?? new Set<string>();
  const commandExitCodes = input.commandExitCodes ?? new Map<string, number>();

  return {
    stdout,
    stderr,
    commands,
    run: (argv: string[]) =>
      runD2DemoAndroidBuildCommand({
        argv,
        sourceRoot: 'C:\\workspace\\front',
        env: { GRADLE_USER_HOME: 'C:\\Users\\tester\\.gradle' },
        pathExists: (path) => existingPaths.has(path),
        ensureDirectory: (path) => existingPaths.add(path),
        getFileSizeBytes: (path) => (existingPaths.has(path) ? 123456 : undefined),
        runCommand: (command, args, options) => {
          commands.push({
            command,
            args,
            cwd: options.cwd,
          });
          return {
            exitCode: commandExitCodes.get(command) ?? 0,
          };
        },
        writeStdout: (value) => stdout.push(value),
        writeStderr: (value) => stderr.push(value),
      }),
  };
}

import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { runD2DemoAndroidAppFlowSmokeCommand } from '../src/qa/d2DemoAndroidAppFlowSmokeCommand';

process.exitCode = runD2DemoAndroidAppFlowSmokeCommand({
  argv: withDefaultAdbPath(process.argv.slice(2)),
  workingDirectory: process.cwd(),
  getGeneratedAt: () => new Date().toISOString(),
  writeTextFile: (path, value) => writeFileSync(path, value),
  runCommand: (command, args, options) => {
    const result = spawnSync(command, args, {
      cwd: options.cwd,
      encoding: 'utf8',
      shell: false,
    });

    return {
      exitCode: result.status ?? 1,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  },
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

function withDefaultAdbPath(argv: string[]): string[] {
  if (argv.includes('--adb')) {
    return argv;
  }

  const sdkRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (sdkRoot === undefined || sdkRoot.trim().length === 0) {
    return argv;
  }

  const adbExecutable = process.platform === 'win32' ? 'adb.exe' : 'adb';
  return [...argv, '--adb', join(sdkRoot, 'platform-tools', adbExecutable)];
}

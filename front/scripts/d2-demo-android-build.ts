import { mkdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { runD2DemoAndroidBuildCommand } from '../src/qa/d2DemoAndroidBuildCommand';

process.exitCode = runD2DemoAndroidBuildCommand({
  argv: process.argv.slice(2),
  sourceRoot: process.cwd(),
  env: process.env,
  pathExists: (path) => {
    try {
      statSync(path);
      return true;
    } catch {
      return false;
    }
  },
  ensureDirectory: (path) => mkdirSync(path, { recursive: true }),
  getFileSizeBytes: (path) => {
    try {
      return statSync(path).size;
    } catch {
      return undefined;
    }
  },
  runCommand: (command, args, options) => {
    const spawnInput = createSpawnInput(command, args);
    const result = spawnSync(spawnInput.command, spawnInput.args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: false,
      stdio: 'inherit',
    });

    return {
      exitCode: result.status ?? 1,
    };
  },
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

function createSpawnInput(command: string, args: string[]): {
  command: string;
  args: string[];
} {
  if (process.platform !== 'win32') {
    return { command, args };
  }

  if (command === 'npm') {
    return { command: 'npm.cmd', args };
  }

  if (command === 'npx') {
    return { command: 'npx.cmd', args };
  }

  if (command.toLowerCase().endsWith('.bat')) {
    return {
      command: 'cmd.exe',
      args: ['/d', '/c', command, ...args],
    };
  }

  return { command, args };
}

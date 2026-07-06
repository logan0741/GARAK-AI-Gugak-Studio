import { readFileSync, writeFileSync } from 'node:fs';
import { runD2DemoSmokeCheckUpdateCommand } from '../src/qa/d2DemoSmokeCheckUpdateCommand';

process.exitCode = runD2DemoSmokeCheckUpdateCommand({
  argv: process.argv.slice(2),
  getTestedAt: () => new Date().toISOString(),
  readTextFile: (path) => readFileSync(path, 'utf8'),
  writeTextFile: (path, value) => writeFileSync(path, value, 'utf8'),
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

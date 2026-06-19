import { readFileSync } from 'node:fs';
import { runDay5ReadinessCommand } from '../src/qa/day5ReadinessCommand';

process.exitCode = runDay5ReadinessCommand({
  argv: process.argv.slice(2),
  readTextFile: (path) => readFileSync(path, 'utf8'),
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

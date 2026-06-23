import { readFileSync, writeFileSync } from 'node:fs';
import { runPrototypeHandoffMergeCommand } from '../src/prototype/prototypeHandoffMergeCommand';

process.exitCode = runPrototypeHandoffMergeCommand({
  argv: process.argv.slice(2),
  getGeneratedAt: () => new Date().toISOString(),
  readTextFile: (path) => readFileSync(path, 'utf8'),
  writeTextFile: (path, value) => writeFileSync(path, value, 'utf8'),
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

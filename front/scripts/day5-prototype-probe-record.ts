import { readFileSync, writeFileSync } from 'node:fs';
import { runPrototypeProbeHandoffCommand } from '../src/prototype/prototypeProbeHandoffCommand';

process.exitCode = runPrototypeProbeHandoffCommand({
  argv: process.argv.slice(2),
  readTextFile: (path) => readFileSync(path, 'utf8'),
  writeTextFile: (path, value) => writeFileSync(path, value, 'utf8'),
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

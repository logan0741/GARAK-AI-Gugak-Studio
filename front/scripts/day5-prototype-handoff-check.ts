import { readFileSync } from 'node:fs';
import { runPrototypeHandoffCheckCommand } from '../src/prototype/prototypeHandoffCheckCommand';

process.exitCode = runPrototypeHandoffCheckCommand({
  argv: process.argv.slice(2),
  readTextFile: (path) => readFileSync(path, 'utf8'),
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

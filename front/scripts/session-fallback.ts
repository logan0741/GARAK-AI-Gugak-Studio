import { readFileSync } from 'node:fs';
import { runPrototypeSessionFallbackCommand } from '../src/prototype/prototypeSessionFallbackCommand';

process.exitCode = runPrototypeSessionFallbackCommand({
  argv: process.argv.slice(2),
  readTextFile: (path) => readFileSync(path, 'utf8'),
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

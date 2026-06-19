import { readFileSync } from 'node:fs';
import { runDay5AudioEngineProbeHandoffCommand } from '../src/audio/audioEngineProbeHandoffCommand';

process.exitCode = runDay5AudioEngineProbeHandoffCommand({
  argv: process.argv.slice(2),
  readTextFile: (path) => readFileSync(path, 'utf8'),
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

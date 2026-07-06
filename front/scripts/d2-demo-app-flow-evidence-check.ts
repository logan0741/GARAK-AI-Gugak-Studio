import { readFileSync } from 'node:fs';
import { runD2DemoAndroidAppFlowEvidenceCheckCommand } from '../src/qa/d2DemoAndroidAppFlowEvidenceCheckCommand';

process.exitCode = runD2DemoAndroidAppFlowEvidenceCheckCommand({
  argv: process.argv.slice(2),
  readTextFile: (path) => readFileSync(path, 'utf8'),
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

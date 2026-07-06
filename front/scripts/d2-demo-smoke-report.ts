import { readFileSync } from 'node:fs';
import { runD2DemoSmokeReportCommand } from '../src/qa/d2DemoSmokeReportCommand';

process.exitCode = runD2DemoSmokeReportCommand({
  argv: process.argv.slice(2),
  readTextFile: (path) => readFileSync(path, 'utf8'),
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

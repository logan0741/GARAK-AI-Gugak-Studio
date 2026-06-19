import { readFileSync } from 'node:fs';
import { runWeek1SmokeReportCommand } from '../src/qa/week1SmokeReportCommand';

process.exitCode = runWeek1SmokeReportCommand({
  argv: process.argv.slice(2),
  readTextFile: (path) => readFileSync(path, 'utf8'),
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

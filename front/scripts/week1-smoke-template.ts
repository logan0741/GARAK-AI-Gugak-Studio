import { writeFileSync } from 'node:fs';
import { runWeek1SmokeTemplateCommand } from '../src/qa/week1SmokeTemplateCommand';

process.exitCode = runWeek1SmokeTemplateCommand({
  argv: process.argv.slice(2),
  getGeneratedAt: () => new Date().toISOString(),
  writeTextFile: (path, value) => writeFileSync(path, value, 'utf8'),
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

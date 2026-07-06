import { writeFileSync } from 'node:fs';
import { runD2DemoSmokeTemplateCommand } from '../src/qa/d2DemoSmokeTemplateCommand';

process.exitCode = runD2DemoSmokeTemplateCommand({
  argv: process.argv.slice(2),
  getGeneratedAt: () => new Date().toISOString(),
  writeTextFile: (path, value) => writeFileSync(path, value, 'utf8'),
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

import { writeFileSync } from 'node:fs';
import { runD2ExpoAudioProbeRecordCommand } from '../src/audio/d2ExpoAudioProbeRecordCommand';

process.exitCode = runD2ExpoAudioProbeRecordCommand({
  argv: process.argv.slice(2),
  getGeneratedAt: () => new Date().toISOString(),
  writeTextFile: (path, value) => writeFileSync(path, value, 'utf8'),
  writeStdout: (value) => process.stdout.write(`${value}\n`),
  writeStderr: (value) => process.stderr.write(`${value}\n`),
});

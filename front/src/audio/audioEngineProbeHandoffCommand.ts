import { buildDay5AudioEngineProbeHandoff } from './audioEngineProbeHandoff';

export type Day5AudioEngineProbeHandoffCommandInput = {
  argv: string[];
  readTextFile: (path: string) => string;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export function runDay5AudioEngineProbeHandoffCommand(
  input: Day5AudioEngineProbeHandoffCommandInput,
): number {
  const [probeRecordPath] = input.argv;

  if (!probeRecordPath) {
    input.writeStderr('Usage: npm run qa:day5-audio -- <probe-record.json>');
    return 1;
  }

  let recordText: string;

  try {
    recordText = input.readTextFile(probeRecordPath);
  } catch {
    input.writeStderr(`Could not read probe record: ${probeRecordPath}`);
    return 1;
  }

  let recordInput: unknown;

  try {
    recordInput = JSON.parse(recordText);
  } catch {
    input.writeStderr(`Invalid JSON in probe record: ${probeRecordPath}`);
    return 1;
  }

  const handoff = buildDay5AudioEngineProbeHandoff(recordInput);
  input.writeStdout(handoff.output);
  return handoff.ok ? 0 : 1;
}

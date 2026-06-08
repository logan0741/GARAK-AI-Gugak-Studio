import { parseAudioEngineProbeRecord } from '../audio/audioEngineProbeRecord';
import { buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts } from './prototypeProbeHandoff';

type PrototypeProbeRecordHandoffInput = Parameters<
  typeof buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts
>[0];

export type PrototypeProbeHandoffCommandInput = {
  argv: string[];
  readTextFile: (path: string) => string;
  writeTextFile?: (path: string, value: string) => void;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export function runPrototypeProbeHandoffCommand(
  input: PrototypeProbeHandoffCommandInput,
): number {
  const [prototypeHandoffPath, probeRecordOutputPath] = input.argv;

  if (!prototypeHandoffPath) {
    input.writeStderr(
      'Usage: npm run qa:prototype-probe-record -- <prototype-handoff.json> <probe-record.json>',
    );
    return 1;
  }

  let handoffText: string;

  try {
    handoffText = input.readTextFile(prototypeHandoffPath);
  } catch {
    input.writeStderr(`Could not read prototype handoff: ${prototypeHandoffPath}`);
    return 1;
  }

  let handoffInput: unknown;

  try {
    handoffInput = JSON.parse(handoffText);
  } catch {
    input.writeStderr(`Invalid JSON in prototype handoff: ${prototypeHandoffPath}`);
    return 1;
  }

  let record: ReturnType<typeof buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts>;

  try {
    record = buildPhysicalDeviceProbeRecordFromPrototypeInspectorDrafts(
      handoffInput as PrototypeProbeRecordHandoffInput,
    );
  } catch (error) {
    input.writeStderr(`Could not build prototype probe record: ${getErrorMessage(error)}`);
    return 1;
  }

  const parseResult = parseAudioEngineProbeRecord(record);
  if (!parseResult.ok) {
    input.writeStderr(
      `Could not build prototype probe record: generated probe record is invalid: ${parseResult.errors.join('; ')}`,
    );
    return 1;
  }

  const recordText = JSON.stringify(parseResult.record, null, 2);
  if (probeRecordOutputPath) {
    if (!input.writeTextFile) {
      input.writeStderr('Could not write probe record: output file writer is unavailable');
      return 1;
    }

    try {
      input.writeTextFile(probeRecordOutputPath, recordText);
    } catch {
      input.writeStderr(`Could not write probe record: ${probeRecordOutputPath}`);
      return 1;
    }

    input.writeStdout(`Wrote Day 5 probe record: ${probeRecordOutputPath}`);
    return 0;
  }

  input.writeStdout(recordText);
  return 0;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

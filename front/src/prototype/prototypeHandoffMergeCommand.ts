import { type AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import {
  parsePrototypeHandoffFile,
  type PrototypeHandoffFile,
} from './prototypeHandoffFile';
import { type PhysicalDevicePrototypeProbeHandoffInput } from './prototypeProbeHandoff';

export type PrototypeHandoffMergeCommandInput = {
  argv: string[];
  getGeneratedAt: () => string;
  readTextFile: (path: string) => string;
  writeTextFile: (path: string, value: string) => void;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export function runPrototypeHandoffMergeCommand(
  input: PrototypeHandoffMergeCommandInput,
): number {
  const [outputHandoffPath, ...inputHandoffPaths] = input.argv;

  if (!outputHandoffPath || inputHandoffPaths.length === 0) {
    input.writeStderr(
      'Usage: npm run qa:prototype-handoff-merge -- <output-handoff.json> <prototype-handoff.json...>',
    );
    return 1;
  }

  const entries: PhysicalDevicePrototypeProbeHandoffInput[] = [];

  for (const handoffPath of inputHandoffPaths) {
    let handoffText: string;

    try {
      handoffText = input.readTextFile(handoffPath);
    } catch {
      input.writeStderr(`Could not read prototype handoff: ${handoffPath}`);
      return 1;
    }

    let handoffInput: unknown;

    try {
      handoffInput = JSON.parse(handoffText);
    } catch {
      input.writeStderr(`Invalid JSON in prototype handoff: ${handoffPath}`);
      return 1;
    }

    const parseResult = parsePrototypeHandoffFile(handoffInput, handoffPath);
    if (!parseResult.ok) {
      input.writeStderr(`Could not merge prototype handoffs: ${parseResult.error}`);
      return 1;
    }

    entries.push(...parseResult.handoff.entries);
  }

  const duplicateCandidates = findDuplicateCandidates(entries);
  if (duplicateCandidates.length > 0) {
    input.writeStderr(
      `Could not merge prototype handoffs: duplicate candidate entries: ${duplicateCandidates.join(', ')}`,
    );
    return 1;
  }

  const mergedHandoff: PrototypeHandoffFile = {
    generatedAt: input.getGeneratedAt(),
    entries,
  };

  try {
    input.writeTextFile(outputHandoffPath, JSON.stringify(mergedHandoff, null, 2));
  } catch {
    input.writeStderr(`Could not write merged prototype handoff: ${outputHandoffPath}`);
    return 1;
  }

  input.writeStdout(`Wrote merged prototype handoff: ${outputHandoffPath} (${entries.length} entries)`);
  return 0;
}

function findDuplicateCandidates(
  entries: PhysicalDevicePrototypeProbeHandoffInput[],
): AudioEngineCandidateId[] {
  const seen = new Set<AudioEngineCandidateId>();
  const duplicates = new Set<AudioEngineCandidateId>();

  for (const entry of entries) {
    const candidate = entry.inspectorDraft.probeTemplate.candidate;
    if (seen.has(candidate)) {
      duplicates.add(candidate);
    }
    seen.add(candidate);
  }

  return [...duplicates].sort();
}

import { type AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import { type PhysicalDevicePrototypeProbeHandoffInput } from './prototypeProbeHandoff';

type PrototypeHandoffFile = {
  generatedAt: string;
  entries: PhysicalDevicePrototypeProbeHandoffInput[];
};

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

function parsePrototypeHandoffFile(
  input: unknown,
  sourcePath: string,
): { ok: true; handoff: PrototypeHandoffFile } | { ok: false; error: string } {
  if (!isObject(input)) {
    return { ok: false, error: `${sourcePath} must be an object` };
  }

  if (!Array.isArray(input.entries)) {
    return { ok: false, error: `${sourcePath} entries must be an array` };
  }

  for (const [index, entry] of input.entries.entries()) {
    if (!isObject(entry)) {
      return { ok: false, error: `${sourcePath} entries[${index}] must be an object` };
    }

    if (!isObject(entry.measurements)) {
      return {
        ok: false,
        error: `${sourcePath} entries[${index}].measurements must be an object`,
      };
    }

    const candidate = getEntryCandidate(entry);
    if (!isAudioEngineCandidate(candidate)) {
      return {
        ok: false,
        error: `${sourcePath} entries[${index}].inspectorDraft.probeTemplate.candidate must be expo-audio or react-native-audio-api`,
      };
    }
  }

  return {
    ok: true,
    handoff: {
      generatedAt: typeof input.generatedAt === 'string' ? input.generatedAt : '',
      entries: input.entries as PhysicalDevicePrototypeProbeHandoffInput[],
    },
  };
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

function getEntryCandidate(entry: Record<string, unknown>): unknown {
  const inspectorDraft = entry.inspectorDraft;
  if (!isObject(inspectorDraft)) {
    return undefined;
  }

  const probeTemplate = inspectorDraft.probeTemplate;
  if (!isObject(probeTemplate)) {
    return undefined;
  }

  return probeTemplate.candidate;
}

function isAudioEngineCandidate(input: unknown): input is AudioEngineCandidateId {
  return input === 'expo-audio' || input === 'react-native-audio-api';
}

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

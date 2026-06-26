import { type AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import { type PhysicalDevicePrototypeProbeHandoffInput } from './prototypeProbeHandoff';

export type PrototypeHandoffFile = {
  generatedAt: string;
  entries: PhysicalDevicePrototypeProbeHandoffInput[];
};

type PrototypeHandoffFileParseResult =
  | { ok: true; handoff: PrototypeHandoffFile }
  | { ok: false; error: string };

export function parsePrototypeHandoffFile(
  input: unknown,
  sourceLabel = 'handoff',
): PrototypeHandoffFileParseResult {
  if (!isObject(input)) {
    return { ok: false, error: `${sourceLabel} must be an object` };
  }

  if (!Array.isArray(input.entries)) {
    return { ok: false, error: `${sourceLabel} entries must be an array` };
  }

  for (const [index, entry] of input.entries.entries()) {
    if (!isObject(entry)) {
      return { ok: false, error: `${sourceLabel} entries[${index}] must be an object` };
    }

    const inspectorDraft = entry.inspectorDraft;
    if (!isObject(inspectorDraft)) {
      return {
        ok: false,
        error: `${sourceLabel} entries[${index}].inspectorDraft must be an object`,
      };
    }

    if (!isObject(inspectorDraft.probeTemplate)) {
      return {
        ok: false,
        error: `${sourceLabel} entries[${index}].inspectorDraft.probeTemplate must be an object`,
      };
    }

    const candidate = getEntryCandidate(entry);
    if (!isAudioEngineCandidate(candidate)) {
      return {
        ok: false,
        error: `${sourceLabel} entries[${index}].inspectorDraft.probeTemplate.candidate must be expo-audio or react-native-audio-api`,
      };
    }

    if (!isObject(entry.measurements)) {
      return {
        ok: false,
        error: `${sourceLabel} entries[${index}].measurements must be an object`,
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

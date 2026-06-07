import {
  AudioEngineCandidateId,
  AudioEngineEvaluation,
  AudioEngineProbe,
  AudioEngineSelection,
  evaluateAudioEngineProbe,
  selectAudioEngineCandidate,
} from './audioEngineEvaluation';

export type Day5AudioEngineDecisionStatus =
  | 'INCOMPLETE_DEVICE_EVIDENCE'
  | 'FINAL_ENGINE_SELECTED'
  | 'NO_FINAL_ENGINE';

export type Day5AudioEngineDecisionRecord = {
  generatedAt: string;
  status: Day5AudioEngineDecisionStatus;
  missingCandidates: AudioEngineCandidateId[];
  duplicateCandidates: AudioEngineCandidateId[];
  evaluations: AudioEngineEvaluation[];
  selection: AudioEngineSelection;
};

const DAY_5_REQUIRED_AUDIO_ENGINE_CANDIDATES: AudioEngineCandidateId[] = [
  'expo-audio',
  'react-native-audio-api',
];

export function buildDay5AudioEngineDecisionRecord(input: {
  generatedAt: string;
  probes: AudioEngineProbe[];
}): Day5AudioEngineDecisionRecord {
  const physicalDeviceProbes = input.probes.filter(
    (probe) => probe.evidenceSource === 'physical-device',
  );
  const evaluations = physicalDeviceProbes.map(evaluateAudioEngineProbe);
  const measuredCandidates = new Set(physicalDeviceProbes.map((probe) => probe.candidate));
  const missingCandidates = DAY_5_REQUIRED_AUDIO_ENGINE_CANDIDATES.filter(
    (candidate) => !measuredCandidates.has(candidate),
  );
  const duplicateCandidates = DAY_5_REQUIRED_AUDIO_ENGINE_CANDIDATES.filter(
    (candidate) =>
      physicalDeviceProbes.filter((probe) => probe.candidate === candidate).length > 1,
  );

  if (missingCandidates.length > 0) {
    return {
      generatedAt: input.generatedAt,
      status: 'INCOMPLETE_DEVICE_EVIDENCE',
      missingCandidates,
      duplicateCandidates,
      evaluations,
      selection: {
        decision: 'NO_GO',
        reason: `missing required physical-device probes: ${missingCandidates.join(', ')}`,
      },
    };
  }

  if (duplicateCandidates.length > 0) {
    return {
      generatedAt: input.generatedAt,
      status: 'INCOMPLETE_DEVICE_EVIDENCE',
      missingCandidates: [],
      duplicateCandidates,
      evaluations,
      selection: {
        decision: 'NO_GO',
        reason: `duplicate physical-device probes for candidates: ${duplicateCandidates.join(', ')}`,
      },
    };
  }

  const selection = selectAudioEngineCandidate(evaluations);

  return {
    generatedAt: input.generatedAt,
    status: selection.selectedCandidate ? 'FINAL_ENGINE_SELECTED' : 'NO_FINAL_ENGINE',
    missingCandidates: [],
    duplicateCandidates: [],
    evaluations,
    selection,
  };
}

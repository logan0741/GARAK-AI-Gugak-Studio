import {
  AudioEngineCandidateId,
  AudioEngineEvaluation,
  AudioEngineProbe,
  AudioEngineSelection,
  evaluateAudioEngineProbe,
  selectAudioEngineCandidate,
} from './audioEngineEvaluation';
import {
  isPhysicalDeviceLabel,
  normalizePhysicalDeviceLabelForReport,
} from '../qa/physicalDeviceLabel';

export type Day5AudioEngineDecisionStatus =
  | 'INCOMPLETE_DEVICE_EVIDENCE'
  | 'FINAL_ENGINE_SELECTED'
  | 'NO_FINAL_ENGINE';

export type Day5AudioEngineDecisionRecord = {
  generatedAt: string;
  status: Day5AudioEngineDecisionStatus;
  missingCandidates: AudioEngineCandidateId[];
  duplicateCandidates: AudioEngineCandidateId[];
  deviceLabelIssues: string[];
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
    (probe) =>
      probe.evidenceSource === 'physical-device' &&
      isDay5RequiredAudioEngineCandidate(probe.candidate),
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
  const deviceLabelIssues = collectDeviceLabelIssues(physicalDeviceProbes);

  if (missingCandidates.length > 0) {
    return {
      generatedAt: input.generatedAt,
      status: 'INCOMPLETE_DEVICE_EVIDENCE',
      missingCandidates,
      duplicateCandidates,
      deviceLabelIssues,
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
      deviceLabelIssues,
      evaluations,
      selection: {
        decision: 'NO_GO',
        reason: `duplicate physical-device probes for candidates: ${duplicateCandidates.join(', ')}`,
      },
    };
  }

  if (deviceLabelIssues.length > 0) {
    return {
      generatedAt: input.generatedAt,
      status: 'INCOMPLETE_DEVICE_EVIDENCE',
      missingCandidates: [],
      duplicateCandidates: [],
      deviceLabelIssues,
      evaluations,
      selection: {
        decision: 'NO_GO',
        reason: deviceLabelIssues[0],
      },
    };
  }

  const selection = selectAudioEngineCandidate(evaluations);

  return {
    generatedAt: input.generatedAt,
    status: selection.selectedCandidate ? 'FINAL_ENGINE_SELECTED' : 'NO_FINAL_ENGINE',
    missingCandidates: [],
    duplicateCandidates: [],
    deviceLabelIssues: [],
    evaluations,
    selection,
  };
}

function collectDeviceLabelIssues(probes: AudioEngineProbe[]): string[] {
  const issues: string[] = [];
  const labels: string[] = [];

  for (const probe of probes) {
    if (!isPhysicalDeviceLabel(probe.deviceLabel)) {
      issues.push(`${probe.candidate}.deviceLabel must name the physical device`);
      continue;
    }

    labels.push(normalizePhysicalDeviceLabelForReport(probe.deviceLabel));
  }

  const uniqueLabels = unique(labels);
  if (uniqueLabels.length > 1) {
    issues.push(`physical-device probes must use one device label: ${uniqueLabels.join(', ')}`);
  }

  return issues;
}

function isDay5RequiredAudioEngineCandidate(
  candidate: AudioEngineCandidateId,
): candidate is AudioEngineCandidateId {
  return DAY_5_REQUIRED_AUDIO_ENGINE_CANDIDATES.includes(candidate);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

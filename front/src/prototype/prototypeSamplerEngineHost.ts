import { AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import { SamplerEngine } from '../audio/samplerEngine';
import { SampleAssetManifest } from '../domain/sampleManifest';

export type PrototypeAudioRuntime = 'fake-prototype' | AudioEngineCandidateId;

export type PrototypeSamplerEngineHost =
  | {
      activeRuntime: 'fake-prototype';
      requestedCandidate: AudioEngineCandidateId;
      engine: SamplerEngine;
      manifestVersion?: string;
      missingStringIndexes: number[];
      status: 'missing_sample_manifest';
    }
  | {
      activeRuntime: AudioEngineCandidateId;
      requestedCandidate: AudioEngineCandidateId;
      engine: SamplerEngine;
      manifestVersion: string;
      missingStringIndexes: [];
      status: 'native_candidate_ready';
    };

export type PrototypeSamplerEngineHostInput = {
  requestedCandidate: AudioEngineCandidateId;
  manifest?: SampleAssetManifest;
  createFakeEngine(): SamplerEngine;
  createNativeEngine(input: {
    candidate: AudioEngineCandidateId;
    manifest: SampleAssetManifest;
  }): SamplerEngine;
};

const REQUIRED_STRING_INDEXES = Array.from({ length: 12 }, (_, index) => index + 1);

export function createPrototypeSamplerEngineHost(
  input: PrototypeSamplerEngineHostInput,
): PrototypeSamplerEngineHost {
  const missingStringIndexes = getMissingSampleStringIndexes(input.manifest);

  if (!input.manifest || missingStringIndexes.length > 0) {
    return {
      activeRuntime: 'fake-prototype',
      requestedCandidate: input.requestedCandidate,
      engine: input.createFakeEngine(),
      manifestVersion: input.manifest?.version,
      missingStringIndexes,
      status: 'missing_sample_manifest',
    };
  }

  return {
    activeRuntime: input.requestedCandidate,
    requestedCandidate: input.requestedCandidate,
    engine: input.createNativeEngine({
      candidate: input.requestedCandidate,
      manifest: input.manifest,
    }),
    manifestVersion: input.manifest.version,
    missingStringIndexes: [],
    status: 'native_candidate_ready',
  };
}

export function getMissingSampleStringIndexes(manifest?: SampleAssetManifest): number[] {
  const availableStringIndexes = new Set(
    manifest?.assets.map((asset) => asset.stringIndex) ?? [],
  );

  return REQUIRED_STRING_INDEXES.filter((stringIndex) => !availableStringIndexes.has(stringIndex));
}

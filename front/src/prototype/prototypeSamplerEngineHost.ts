import { AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import { SamplerEngine } from '../audio/samplerEngine';
import { SampleAssetManifest } from '../domain/sampleManifest';

export type PrototypeAudioRuntime = 'fake-prototype' | AudioEngineCandidateId;

export type PrototypeNativeCandidateState =
  | { status: 'preloading' }
  | { status: 'ready'; engine: SamplerEngine }
  | { status: 'failed'; errorMessage: string };

export type PrototypeSamplerEngineHost =
  | {
      activeRuntime: 'fake-prototype';
      requestedCandidate: AudioEngineCandidateId;
      engine: SamplerEngine;
      manifestVersion?: string;
      missingStringIndexes: number[];
      duplicateStringIndexes: number[];
      status: 'missing_sample_manifest';
    }
  | {
      activeRuntime: 'fake-prototype';
      requestedCandidate: AudioEngineCandidateId;
      engine: SamplerEngine;
      manifestVersion: string;
      missingStringIndexes: [];
      duplicateStringIndexes: number[];
      status: 'duplicate_sample_manifest';
    }
  | {
      activeRuntime: 'fake-prototype';
      requestedCandidate: AudioEngineCandidateId;
      engine: SamplerEngine;
      manifestVersion: string;
      missingStringIndexes: [];
      duplicateStringIndexes: [];
      status: 'native_candidate_preloading';
    }
  | {
      activeRuntime: 'fake-prototype';
      requestedCandidate: AudioEngineCandidateId;
      engine: SamplerEngine;
      manifestVersion: string;
      missingStringIndexes: [];
      duplicateStringIndexes: [];
      preloadErrorMessage: string;
      status: 'native_candidate_failed';
    }
  | {
      activeRuntime: AudioEngineCandidateId;
      requestedCandidate: AudioEngineCandidateId;
      engine: SamplerEngine;
      manifestVersion: string;
      missingStringIndexes: [];
      duplicateStringIndexes: [];
      status: 'native_candidate_ready';
    };

export type PrototypeSamplerEngineHostInput = {
  requestedCandidate: AudioEngineCandidateId;
  manifest?: SampleAssetManifest;
  nativeCandidate?: PrototypeNativeCandidateState;
  createFakeEngine(): SamplerEngine;
};

const REQUIRED_STRING_INDEXES = Array.from({ length: 12 }, (_, index) => index + 1);

export function createPrototypeSamplerEngineHost(
  input: PrototypeSamplerEngineHostInput,
): PrototypeSamplerEngineHost {
  const missingStringIndexes = getMissingSampleStringIndexes(input.manifest);
  const duplicateStringIndexes = getDuplicateSampleStringIndexes(input.manifest);

  if (!input.manifest || missingStringIndexes.length > 0) {
    return {
      activeRuntime: 'fake-prototype',
      requestedCandidate: input.requestedCandidate,
      engine: input.createFakeEngine(),
      manifestVersion: input.manifest?.version,
      missingStringIndexes,
      duplicateStringIndexes,
      status: 'missing_sample_manifest',
    };
  }

  if (duplicateStringIndexes.length > 0) {
    return {
      activeRuntime: 'fake-prototype',
      requestedCandidate: input.requestedCandidate,
      engine: input.createFakeEngine(),
      manifestVersion: input.manifest.version,
      missingStringIndexes: [],
      duplicateStringIndexes,
      status: 'duplicate_sample_manifest',
    };
  }

  if (!input.nativeCandidate || input.nativeCandidate.status === 'preloading') {
    return {
      activeRuntime: 'fake-prototype',
      requestedCandidate: input.requestedCandidate,
      engine: input.createFakeEngine(),
      manifestVersion: input.manifest.version,
      missingStringIndexes: [],
      duplicateStringIndexes: [],
      status: 'native_candidate_preloading',
    };
  }

  if (input.nativeCandidate.status === 'failed') {
    return {
      activeRuntime: 'fake-prototype',
      requestedCandidate: input.requestedCandidate,
      engine: input.createFakeEngine(),
      manifestVersion: input.manifest.version,
      missingStringIndexes: [],
      duplicateStringIndexes: [],
      preloadErrorMessage: input.nativeCandidate.errorMessage,
      status: 'native_candidate_failed',
    };
  }

  return {
    activeRuntime: input.requestedCandidate,
    requestedCandidate: input.requestedCandidate,
    engine: input.nativeCandidate.engine,
    manifestVersion: input.manifest.version,
    missingStringIndexes: [],
    duplicateStringIndexes: [],
    status: 'native_candidate_ready',
  };
}

export function getMissingSampleStringIndexes(manifest?: SampleAssetManifest): number[] {
  const availableStringIndexes = new Set(
    manifest?.assets.map((asset) => asset.stringIndex) ?? [],
  );

  return REQUIRED_STRING_INDEXES.filter((stringIndex) => !availableStringIndexes.has(stringIndex));
}

export function getDuplicateSampleStringIndexes(manifest?: SampleAssetManifest): number[] {
  const seenStringIndexes = new Set<number>();
  const duplicateStringIndexes = new Set<number>();

  for (const asset of manifest?.assets ?? []) {
    if (seenStringIndexes.has(asset.stringIndex)) {
      duplicateStringIndexes.add(asset.stringIndex);
    }
    seenStringIndexes.add(asset.stringIndex);
  }

  return Array.from(duplicateStringIndexes).sort((left, right) => left - right);
}

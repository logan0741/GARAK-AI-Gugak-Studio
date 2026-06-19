import { AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import { SamplerEngine } from '../audio/samplerEngine';
import { SampleAssetManifest, isGayageumSampleAsset } from '../domain/sampleManifest';

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
      unexpectedStringIndexes: number[];
      status: 'missing_sample_manifest';
    }
  | {
      activeRuntime: 'fake-prototype';
      requestedCandidate: AudioEngineCandidateId;
      engine: SamplerEngine;
      manifestVersion: string;
      missingStringIndexes: [];
      duplicateStringIndexes: number[];
      unexpectedStringIndexes: number[];
      status: 'duplicate_sample_manifest';
    }
  | {
      activeRuntime: 'fake-prototype';
      requestedCandidate: AudioEngineCandidateId;
      engine: SamplerEngine;
      manifestVersion: string;
      missingStringIndexes: [];
      duplicateStringIndexes: [];
      unexpectedStringIndexes: number[];
      status: 'invalid_sample_manifest';
    }
  | {
      activeRuntime: 'fake-prototype';
      requestedCandidate: AudioEngineCandidateId;
      engine: SamplerEngine;
      manifestVersion: string;
      missingStringIndexes: [];
      duplicateStringIndexes: [];
      unexpectedStringIndexes: [];
      status: 'native_candidate_preloading';
    }
  | {
      activeRuntime: 'fake-prototype';
      requestedCandidate: AudioEngineCandidateId;
      engine: SamplerEngine;
      manifestVersion: string;
      missingStringIndexes: [];
      duplicateStringIndexes: [];
      unexpectedStringIndexes: [];
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
      unexpectedStringIndexes: [];
      status: 'native_candidate_ready';
    };

export type PrototypeSamplerEngineHostInput = {
  requestedCandidate: AudioEngineCandidateId;
  manifest?: SampleAssetManifest;
  nativeCandidate?: PrototypeNativeCandidateState;
  createFakeEngine(): SamplerEngine;
};

const REQUIRED_STRING_INDEXES = Array.from({ length: 12 }, (_, index) => index + 1);

function getGayageumSampleAssets(manifest?: SampleAssetManifest) {
  return (manifest?.assets ?? []).filter(isGayageumSampleAsset);
}

export function createPrototypeSamplerEngineHost(
  input: PrototypeSamplerEngineHostInput,
): PrototypeSamplerEngineHost {
  const missingStringIndexes = getMissingSampleStringIndexes(input.manifest);
  const duplicateStringIndexes = getDuplicateSampleStringIndexes(input.manifest);
  const unexpectedStringIndexes = getUnexpectedSampleStringIndexes(input.manifest);

  if (!input.manifest || missingStringIndexes.length > 0) {
    return {
      activeRuntime: 'fake-prototype',
      requestedCandidate: input.requestedCandidate,
      engine: input.createFakeEngine(),
      manifestVersion: input.manifest?.version,
      missingStringIndexes,
      duplicateStringIndexes,
      unexpectedStringIndexes,
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
      unexpectedStringIndexes,
      status: 'duplicate_sample_manifest',
    };
  }

  if (unexpectedStringIndexes.length > 0) {
    return {
      activeRuntime: 'fake-prototype',
      requestedCandidate: input.requestedCandidate,
      engine: input.createFakeEngine(),
      manifestVersion: input.manifest.version,
      missingStringIndexes: [],
      duplicateStringIndexes: [],
      unexpectedStringIndexes,
      status: 'invalid_sample_manifest',
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
      unexpectedStringIndexes: [],
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
      unexpectedStringIndexes: [],
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
    unexpectedStringIndexes: [],
    status: 'native_candidate_ready',
  };
}

export function getMissingSampleStringIndexes(manifest?: SampleAssetManifest): number[] {
  const availableStringIndexes = new Set(
    getGayageumSampleAssets(manifest).map((asset) => asset.stringIndex),
  );

  return REQUIRED_STRING_INDEXES.filter((stringIndex) => !availableStringIndexes.has(stringIndex));
}

export function getDuplicateSampleStringIndexes(manifest?: SampleAssetManifest): number[] {
  const seenStringIndexes = new Set<number>();
  const duplicateStringIndexes = new Set<number>();

  for (const asset of getGayageumSampleAssets(manifest)) {
    if (seenStringIndexes.has(asset.stringIndex)) {
      duplicateStringIndexes.add(asset.stringIndex);
    }
    seenStringIndexes.add(asset.stringIndex);
  }

  return Array.from(duplicateStringIndexes).sort((left, right) => left - right);
}

export function getUnexpectedSampleStringIndexes(manifest?: SampleAssetManifest): number[] {
  const requiredStringIndexes = new Set(REQUIRED_STRING_INDEXES);
  const unexpectedStringIndexes = new Set<number>();

  for (const asset of getGayageumSampleAssets(manifest)) {
    if (!requiredStringIndexes.has(asset.stringIndex)) {
      unexpectedStringIndexes.add(asset.stringIndex);
    }
  }

  return Array.from(unexpectedStringIndexes).sort((left, right) => left - right);
}

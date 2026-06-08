import { AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import {
  ExpoAudioRuntimePort,
  ExpoAudioSamplerEngine,
} from '../audio/expoAudioSamplerEngine';
import {
  ReactNativeAudioApiRuntimePort,
  ReactNativeAudioApiSamplerEngine,
} from '../audio/reactNativeAudioApiSamplerEngine';
import { SamplerEngine } from '../audio/samplerEngine';
import { SampleAssetManifest } from '../domain/sampleManifest';
import { getMissingSampleStringIndexes } from './prototypeSamplerEngineHost';

export type PrototypeNativeSamplerEngineRuntimePorts = {
  createExpoAudioRuntimePort(): ExpoAudioRuntimePort;
  createReactNativeAudioApiRuntimePort(): ReactNativeAudioApiRuntimePort;
};

export type PrototypeSampleAssetResolver = {
  resolveFileUri(fileUri: string): Promise<string>;
};

export async function createAndPreloadPrototypeNativeSamplerEngine(input: {
  candidate: AudioEngineCandidateId;
  manifest: SampleAssetManifest;
  assetResolver?: PrototypeSampleAssetResolver;
  runtimePorts?: PrototypeNativeSamplerEngineRuntimePorts;
}): Promise<SamplerEngine> {
  assertCompletePrototypeSampleManifest(input.manifest);

  const runtimePorts = input.runtimePorts ?? await loadDefaultRuntimePorts(input.candidate);
  const manifest = await resolveSampleAssetManifestUris({
    manifest: input.manifest,
    assetResolver: input.assetResolver ?? await loadDefaultSampleAssetResolver(),
  });
  const engine =
    input.candidate === 'expo-audio'
      ? new ExpoAudioSamplerEngine({
          manifest,
          runtime: runtimePorts.createExpoAudioRuntimePort(),
        })
      : new ReactNativeAudioApiSamplerEngine({
          manifest,
          runtime: runtimePorts.createReactNativeAudioApiRuntimePort(),
        });

  await engine.preload();

  return engine;
}

function assertCompletePrototypeSampleManifest(manifest: SampleAssetManifest): void {
  const missingStringIndexes = getMissingSampleStringIndexes(manifest);
  if (missingStringIndexes.length > 0) {
    throw new Error(
      `Prototype native sampler requires all 12 sample strings before preload; missing strings: ${missingStringIndexes.join(', ')}`,
    );
  }

  const duplicateStringIndexes = getDuplicateSampleStringIndexes(manifest);
  if (duplicateStringIndexes.length > 0) {
    throw new Error(
      `Prototype native sampler requires exactly one sample for each string; duplicate strings: ${duplicateStringIndexes.join(', ')}`,
    );
  }
}

function getDuplicateSampleStringIndexes(manifest: SampleAssetManifest): number[] {
  const seenStringIndexes = new Set<number>();
  const duplicateStringIndexes = new Set<number>();

  for (const asset of manifest.assets) {
    if (seenStringIndexes.has(asset.stringIndex)) {
      duplicateStringIndexes.add(asset.stringIndex);
    }
    seenStringIndexes.add(asset.stringIndex);
  }

  return Array.from(duplicateStringIndexes).sort((left, right) => left - right);
}

export async function resolveSampleAssetManifestUris(input: {
  manifest: SampleAssetManifest;
  assetResolver: PrototypeSampleAssetResolver;
}): Promise<SampleAssetManifest> {
  return {
    ...input.manifest,
    assets: await Promise.all(
      input.manifest.assets.map(async (asset) => ({
        ...asset,
        fileUri: await input.assetResolver.resolveFileUri(asset.fileUri),
      })),
    ),
  };
}

async function loadDefaultRuntimePorts(
  candidate: AudioEngineCandidateId,
): Promise<PrototypeNativeSamplerEngineRuntimePorts> {
  if (candidate === 'expo-audio') {
    const { createExpoAudioRuntimePort } = await import('../audio/expoAudioRuntime');
    return {
      createExpoAudioRuntimePort,
      createReactNativeAudioApiRuntimePort: () => {
        throw new Error('react-native-audio-api runtime was not loaded for expo-audio candidate');
      },
    };
  }

  const { createReactNativeAudioApiRuntimePort } = await import('../audio/reactNativeAudioApiRuntime');
  return {
    createExpoAudioRuntimePort: () => {
      throw new Error('expo-audio runtime was not loaded for react-native-audio-api candidate');
    },
    createReactNativeAudioApiRuntimePort,
  };
}

async function loadDefaultSampleAssetResolver(): Promise<PrototypeSampleAssetResolver> {
  const [{ Asset }, { prototypeBundledSampleAssetModules }] = await Promise.all([
    import('expo-asset'),
    import('./prototypeBundledSampleAssetRegistry'),
  ]);

  return {
    async resolveFileUri(fileUri) {
      const moduleId = prototypeBundledSampleAssetModules[fileUri];

      if (moduleId === undefined) {
        throw new Error(`No bundled prototype sample module for ${fileUri}`);
      }

      const asset = Asset.fromModule(moduleId);
      await asset.downloadAsync();

      const resolvedUri = asset.localUri ?? asset.uri;
      if (!resolvedUri) {
        throw new Error(`Bundled prototype sample did not resolve to a URI: ${fileUri}`);
      }

      return resolvedUri;
    },
  };
}

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

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

export async function createAndPreloadPrototypeNativeSamplerEngine(input: {
  candidate: AudioEngineCandidateId;
  manifest: SampleAssetManifest;
  runtimePorts?: PrototypeNativeSamplerEngineRuntimePorts;
}): Promise<SamplerEngine> {
  const runtimePorts = input.runtimePorts ?? await loadDefaultRuntimePorts(input.candidate);
  const engine =
    input.candidate === 'expo-audio'
      ? new ExpoAudioSamplerEngine({
          manifest: input.manifest,
          runtime: runtimePorts.createExpoAudioRuntimePort(),
        })
      : new ReactNativeAudioApiSamplerEngine({
          manifest: input.manifest,
          runtime: runtimePorts.createReactNativeAudioApiRuntimePort(),
        });

  await engine.preload();

  return engine;
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

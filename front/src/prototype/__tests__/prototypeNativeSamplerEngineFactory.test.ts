import { expect, test } from 'vitest';
import { ExpoAudioRuntimePort } from '../../audio/expoAudioSamplerEngine';
import {
  ReactNativeAudioApiContextPort,
  ReactNativeAudioApiRuntimePort,
} from '../../audio/reactNativeAudioApiSamplerEngine';
import { SampleAssetManifest } from '../../domain/sampleManifest';
import { createAndPreloadPrototypeNativeSamplerEngine } from '../prototypeNativeSamplerEngineFactory';

const manifest: SampleAssetManifest = {
  version: 'test-12-string-manifest',
  assets: Array.from({ length: 12 }, (_, index) => ({
    id: `string-${index + 1}`,
    instrument: 'gayageum_12',
    stringIndex: index + 1,
    pitchHz: 196 + index * 12,
    fileUri: `asset://gayageum/${String(index + 1).padStart(2, '0')}.wav`,
    sourceLayer: 'own_asset',
    sourceName: 'test fixture',
    licenseNote: 'test only',
  })),
};

test('creates and preloads the expo-audio candidate through injected runtime ports', async () => {
  const downloadedUris: string[] = [];
  const createdPlayerUris: string[] = [];
  const runtime: ExpoAudioRuntimePort = {
    setAudioModeAsync: async () => undefined,
    downloadAudioSource: async (source) => {
      downloadedUris.push(source.uri);
      return source;
    },
    createAudioPlayer: (source) => {
      createdPlayerUris.push(source.uri);
      return {
        volume: 1,
        play: () => undefined,
        pause: () => undefined,
        seekTo: async () => undefined,
        setPlaybackRate: () => undefined,
      };
    },
    requestRecordingPermissionsAsync: async () => ({ granted: true }),
    createAudioRecorder: () => {
      throw new Error('recording is not part of preload');
    },
  };

  await createAndPreloadPrototypeNativeSamplerEngine({
    candidate: 'expo-audio',
    manifest,
    runtimePorts: {
      createExpoAudioRuntimePort: () => runtime,
      createReactNativeAudioApiRuntimePort: () => {
        throw new Error('react-native-audio-api runtime should not be created');
      },
    },
  });

  expect(downloadedUris).toEqual(manifest.assets.map((asset) => asset.fileUri));
  expect(createdPlayerUris).toEqual(manifest.assets.map((asset) => asset.fileUri));
});

test('creates and preloads the react-native-audio-api candidate through injected runtime ports', async () => {
  const decodedInputs: string[] = [];
  const context = {
    currentTime: 0,
    destination: createNode(),
    decodeAudioData: async (input: string) => {
      decodedInputs.push(input);
      return { decoded: input };
    },
    createBufferSource: () => {
      throw new Error('buffer sources are not created during preload');
    },
    createGain: () => {
      throw new Error('gain nodes are not created during preload');
    },
    createBiquadFilter: () => {
      throw new Error('filter nodes are not created during preload');
    },
  } satisfies ReactNativeAudioApiContextPort;
  const runtime: ReactNativeAudioApiRuntimePort = {
    createAudioContext: () => context,
  };

  await createAndPreloadPrototypeNativeSamplerEngine({
    candidate: 'react-native-audio-api',
    manifest,
    runtimePorts: {
      createExpoAudioRuntimePort: () => {
        throw new Error('expo-audio runtime should not be created');
      },
      createReactNativeAudioApiRuntimePort: () => runtime,
    },
  });

  expect(decodedInputs).toEqual(manifest.assets.map((asset) => asset.fileUri));
});

function createNode(): ReactNativeAudioApiContextPort['destination'] {
  return {
    connect: () => undefined,
    disconnect: () => undefined,
  };
}

import { expect, test, vi } from 'vitest';
import { ExpoAudioRuntimePort } from '../../audio/expoAudioSamplerEngine';
import {
  ReactNativeAudioApiContextPort,
  ReactNativeAudioApiRuntimePort,
} from '../../audio/reactNativeAudioApiSamplerEngine';
import { SampleAssetManifest } from '../../domain/sampleManifest';
import { createAndPreloadPrototypeNativeSamplerEngine } from '../prototypeNativeSamplerEngineFactory';

const defaultDependencyLoadMocks = vi.hoisted(() => ({
  bundledSampleRegistryModuleLoaded: vi.fn(),
  expoAssetModuleLoaded: vi.fn(),
  expoAudioRuntimeModuleLoaded: vi.fn(),
  reactNativeAudioApiRuntimeModuleLoaded: vi.fn(),
}));

vi.mock('../../audio/expoAudioRuntime', () => {
  defaultDependencyLoadMocks.expoAudioRuntimeModuleLoaded();
  return {
    createExpoAudioRuntimePort: () => {
      throw new Error('default expo-audio runtime should not be loaded');
    },
  };
});

vi.mock('../../audio/reactNativeAudioApiRuntime', () => {
  defaultDependencyLoadMocks.reactNativeAudioApiRuntimeModuleLoaded();
  return {
    createReactNativeAudioApiRuntimePort: () => {
      throw new Error('default react-native-audio-api runtime should not be loaded');
    },
  };
});

vi.mock('expo-asset', () => {
  defaultDependencyLoadMocks.expoAssetModuleLoaded();
  return {
    Asset: {
      fromModule: () => ({
        downloadAsync: async () => undefined,
        localUri: undefined,
        uri: undefined,
      }),
    },
  };
});

vi.mock('../prototypeBundledSampleAssetRegistry', () => {
  defaultDependencyLoadMocks.bundledSampleRegistryModuleLoaded();
  return {
    prototypeBundledSampleAssetModules: {},
  };
});

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
  const resolvedUris: string[] = [];
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
    assetResolver: {
      resolveFileUri: async (fileUri) => {
        const resolvedUri = `file://resolved/${fileUri}`;
        resolvedUris.push(resolvedUri);
        return resolvedUri;
      },
    },
    runtimePorts: {
      createExpoAudioRuntimePort: () => runtime,
      createReactNativeAudioApiRuntimePort: () => {
        throw new Error('react-native-audio-api runtime should not be created');
      },
    },
  });

  expect(resolvedUris).toEqual(manifest.assets.map((asset) => `file://resolved/${asset.fileUri}`));
  expect(downloadedUris).toEqual(resolvedUris);
  expect(createdPlayerUris).toEqual(resolvedUris);
});

test('creates and preloads the react-native-audio-api candidate through injected runtime ports', async () => {
  const decodedInputs: string[] = [];
  const resolvedUris: string[] = [];
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
    assetResolver: {
      resolveFileUri: async (fileUri) => {
        const resolvedUri = `file://decoded/${fileUri}`;
        resolvedUris.push(resolvedUri);
        return resolvedUri;
      },
    },
    runtimePorts: {
      createExpoAudioRuntimePort: () => {
        throw new Error('expo-audio runtime should not be created');
      },
      createReactNativeAudioApiRuntimePort: () => runtime,
    },
  });

  expect(resolvedUris).toEqual(manifest.assets.map((asset) => `file://decoded/${asset.fileUri}`));
  expect(decodedInputs).toEqual(resolvedUris);
});

test('rejects incomplete sample manifests before creating a native candidate', async () => {
  const resolvedUris: string[] = [];

  await expect(
    createAndPreloadPrototypeNativeSamplerEngine({
      candidate: 'react-native-audio-api',
      manifest: {
        version: 'partial-manifest',
        assets: manifest.assets.slice(0, 11),
      },
      assetResolver: {
        resolveFileUri: async (fileUri) => {
          resolvedUris.push(fileUri);
          return fileUri;
        },
      },
      runtimePorts: {
        createExpoAudioRuntimePort: () => {
          throw new Error('expo-audio runtime should not be created');
        },
        createReactNativeAudioApiRuntimePort: () => {
          throw new Error('react-native-audio-api runtime should not be created');
        },
      },
    }),
  ).rejects.toThrow('Prototype native sampler requires all 12 sample strings before preload; missing strings: 12');
  expect(resolvedUris).toEqual([]);
});

test('rejects duplicate sample string indexes before creating a native candidate', async () => {
  const resolvedUris: string[] = [];

  await expect(
    createAndPreloadPrototypeNativeSamplerEngine({
      candidate: 'react-native-audio-api',
      manifest: {
        version: 'duplicate-manifest',
        assets: [...manifest.assets, { ...manifest.assets[0], id: 'duplicate-string-1' }],
      },
      assetResolver: {
        resolveFileUri: async (fileUri) => {
          resolvedUris.push(fileUri);
          return fileUri;
        },
      },
      runtimePorts: {
        createExpoAudioRuntimePort: () => {
          throw new Error('expo-audio runtime should not be created');
        },
        createReactNativeAudioApiRuntimePort: () => {
          throw new Error('react-native-audio-api runtime should not be created');
        },
      },
    }),
  ).rejects.toThrow('Prototype native sampler requires exactly one sample for each string; duplicate strings: 1');
  expect(resolvedUris).toEqual([]);
});

test.each(['expo-audio', 'react-native-audio-api'] as const)(
  'rejects incomplete sample manifests before loading default native dependencies for %s',
  async (candidate) => {
    clearDefaultDependencyLoadMocks();

    await expect(
      createAndPreloadPrototypeNativeSamplerEngine({
        candidate,
        manifest: {
          version: 'partial-manifest',
          assets: manifest.assets.slice(0, 11),
        },
      }),
    ).rejects.toThrow('Prototype native sampler requires all 12 sample strings before preload; missing strings: 12');

    expect(defaultDependencyLoadMocks.expoAudioRuntimeModuleLoaded).not.toHaveBeenCalled();
    expect(defaultDependencyLoadMocks.reactNativeAudioApiRuntimeModuleLoaded).not.toHaveBeenCalled();
    expect(defaultDependencyLoadMocks.expoAssetModuleLoaded).not.toHaveBeenCalled();
    expect(defaultDependencyLoadMocks.bundledSampleRegistryModuleLoaded).not.toHaveBeenCalled();
  },
);

function clearDefaultDependencyLoadMocks(): void {
  defaultDependencyLoadMocks.expoAudioRuntimeModuleLoaded.mockClear();
  defaultDependencyLoadMocks.reactNativeAudioApiRuntimeModuleLoaded.mockClear();
  defaultDependencyLoadMocks.expoAssetModuleLoaded.mockClear();
  defaultDependencyLoadMocks.bundledSampleRegistryModuleLoaded.mockClear();
}

function createNode(): ReactNativeAudioApiContextPort['destination'] {
  return {
    connect: () => undefined,
    disconnect: () => undefined,
  };
}

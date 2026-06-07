import { AudioContext } from 'react-native-audio-api';
import type { ReactNativeAudioApiRuntimePort } from './reactNativeAudioApiSamplerEngine';

export function createReactNativeAudioApiRuntimePort(
  input: { sampleRate?: number } = {},
): ReactNativeAudioApiRuntimePort {
  return {
    createAudioContext() {
      return new AudioContext({ sampleRate: input.sampleRate ?? 44_100 });
    },
  };
}

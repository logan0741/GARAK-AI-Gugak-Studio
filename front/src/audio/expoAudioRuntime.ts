import AudioModule from 'expo-audio/build/AudioModule';
import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { createRecordingOptions } from 'expo-audio/build/utils/options';
import { resolveSourceWithDownload } from 'expo-audio/build/utils/resolveSource';
import type { AudioMode, AudioPlayerOptions, AudioSource } from 'expo-audio';
import type { ExpoAudioRuntimePort } from './expoAudioSamplerEngine';

export function createExpoAudioRuntimePort(): ExpoAudioRuntimePort {
  return {
    async setAudioModeAsync(mode) {
      await setAudioModeAsync(mode satisfies AudioMode);
    },
    async downloadAudioSource(source) {
      return coerceUriSource(await resolveSourceWithDownload(source satisfies AudioSource));
    },
    createAudioPlayer(source, options) {
      return createAudioPlayer(source satisfies AudioSource, options satisfies AudioPlayerOptions);
    },
    async requestRecordingPermissionsAsync() {
      return requestRecordingPermissionsAsync();
    },
    createAudioRecorder() {
      return new AudioModule.AudioRecorder(createRecordingOptions(RecordingPresets.HIGH_QUALITY));
    },
  };
}

function coerceUriSource(source: AudioSource): { uri: string } {
  if (typeof source === 'string') {
    return { uri: source };
  }
  if (source && typeof source === 'object' && 'uri' in source && typeof source.uri === 'string') {
    return { uri: source.uri };
  }

  throw new Error('expo-audio source resolver did not return a playable URI');
}

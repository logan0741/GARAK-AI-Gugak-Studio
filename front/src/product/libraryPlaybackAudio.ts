import {
  daegeumNgcMonotoneSampleManifest,
  jangguNgcMonotoneSampleManifest,
} from './livePerformanceBundledSamples';

declare const require: (path: string) => number;

const DEMO_LIBRARY_AUDIO_URI = daegeumNgcMonotoneSampleManifest.assets[0].fileUri;
const WATER_DEMO_AUDIO_URI = daegeumNgcMonotoneSampleManifest.assets[7].fileUri;
const RHYTHM_DEMO_AUDIO_URI = jangguNgcMonotoneSampleManifest.assets[0].fileUri;

export function createLocalExportAudioUri(): string {
  return DEMO_LIBRARY_AUDIO_URI;
}

export function createDemoLibraryAudioUri(title: string | undefined): string {
  const normalizedTitle = title?.toLowerCase() ?? '';

  if (normalizedTitle.includes('water') || normalizedTitle.includes('sea')) {
    return WATER_DEMO_AUDIO_URI;
  }

  if (normalizedTitle.includes('arirang')) {
    return RHYTHM_DEMO_AUDIO_URI;
  }

  return DEMO_LIBRARY_AUDIO_URI;
}

export function resolveLibraryPlaybackAudioSource(audioUri: string): string | number {
  return createLibraryPlaybackAudioAssetModules()[audioUri] ?? audioUri;
}

function createLibraryPlaybackAudioAssetModules(): Record<string, number> {
  return {
    [jangguNgcMonotoneSampleManifest.assets[0].fileUri]: require('../../assets/audio/ngc-monotone/janggu/kung-strong.wav'),
    [daegeumNgcMonotoneSampleManifest.assets[0].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-01.wav'),
    [daegeumNgcMonotoneSampleManifest.assets[7].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-08.wav'),
  };
}

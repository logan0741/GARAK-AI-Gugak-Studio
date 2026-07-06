import {
  daegeumNgcMonotoneSampleManifest,
  jangguNgcMonotoneSampleManifest,
} from './livePerformanceBundledSamples';
import { countWorkMixPlanInstrumentEvents, createWorkMixPlan } from '../studio/studioLibrary';
import type { ExportedAudio, PracticeResult, Take, Work } from '../studio/studioTypes';
import type { SharedRecording } from './productFixtures';

declare const require: (path: string) => number;

const ARIRANG_DEMO_AUDIO_URI = 'garak://library-demo/my-arirang-showcase';
const DAEGEUM_DEMO_AUDIO_URI = 'garak://library-demo/daegeum-showcase';
const DEMO_LIBRARY_AUDIO_URI = DAEGEUM_DEMO_AUDIO_URI;
const WATER_DEMO_AUDIO_URI = DAEGEUM_DEMO_AUDIO_URI;
const RHYTHM_DEMO_AUDIO_URI = ARIRANG_DEMO_AUDIO_URI;
const PRACTICE_ARIRANG_AUDIO_URI = 'garak://library-demo/arirang';
const PRACTICE_DAEGEUM_AUDIO_URI = 'garak://library-demo/practice-daegeum';
const EXPORT_FALLBACK_AUDIO_URI = 'garak://library-demo/export-fallback';
const LIBRARY_PLAYBACK_BUNDLED_AUDIO_ASSET_PATHS: Record<string, string> = {
  [ARIRANG_DEMO_AUDIO_URI]: 'assets/audio/demo/my-arirang-showcase.wav',
  [DAEGEUM_DEMO_AUDIO_URI]: 'assets/audio/demo/daegeum-showcase.wav',
  [PRACTICE_ARIRANG_AUDIO_URI]: 'assets/audio/demo/my-arirang-showcase.wav',
  [PRACTICE_DAEGEUM_AUDIO_URI]: 'assets/audio/demo/daegeum-showcase.wav',
  [EXPORT_FALLBACK_AUDIO_URI]: 'assets/audio/demo/my-arirang-showcase.wav',
  [jangguNgcMonotoneSampleManifest.assets[0].fileUri]: 'assets/audio/ngc-monotone/janggu/kung-strong.wav',
  [daegeumNgcMonotoneSampleManifest.assets[0].fileUri]: 'assets/audio/ngc-monotone/daegeum/note-01.wav',
  [daegeumNgcMonotoneSampleManifest.assets[7].fileUri]: 'assets/audio/ngc-monotone/daegeum/note-08.wav',
};

export function createLocalExportAudioUri(): string {
  return EXPORT_FALLBACK_AUDIO_URI;
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

export function createPracticeResultLibraryAudioUri(result: PracticeResult): string {
  const normalizedSongId = result.songId.toLowerCase();

  if (normalizedSongId.includes('arirang') || result.instrument === 'janggu') {
    return PRACTICE_ARIRANG_AUDIO_URI;
  }

  if (result.instrument === 'daegeum') {
    return PRACTICE_DAEGEUM_AUDIO_URI;
  }

  return DEMO_LIBRARY_AUDIO_URI;
}

export function createSharedRecordingLibraryAudioUri(recording: SharedRecording): string {
  const normalizedUri = recording.audioUri.trim();

  if (normalizedUri.length > 0 && !normalizedUri.toLowerCase().startsWith('placeholder://')) {
    return normalizedUri;
  }

  if (recording.instrument === 'janggu') {
    return RHYTHM_DEMO_AUDIO_URI;
  }

  if (recording.instrument === 'daegeum') {
    return WATER_DEMO_AUDIO_URI;
  }

  return createDemoLibraryAudioUri(recording.title);
}

export function resolveLibraryPlaybackAudioSource(audioUri: string): string | number {
  return createLibraryPlaybackAudioAssetModules()[audioUri] ?? audioUri;
}

export function resolveLibraryPlaybackBundledAudioAssetPath(
  audioUri: string,
): string | undefined {
  return LIBRARY_PLAYBACK_BUNDLED_AUDIO_ASSET_PATHS[audioUri];
}

export function isPlayableExportedAudioUri(audioUri: string): boolean {
  const normalizedUri = audioUri.trim();

  return normalizedUri.length > 0 && !normalizedUri.toLowerCase().startsWith('placeholder://');
}

export function isPlayableExportedAudioForPlayback(
  works: readonly Work[],
  audio: ExportedAudio,
): boolean {
  if (!isPlayableExportedAudioUri(audio.audioUri)) {
    return false;
  }

  if (audio.renderKind === 'audio_capture') {
    return isPlayableCapturedAudioExport(works, audio);
  }

  if (audio.renderKind !== 'event_replay') {
    return true;
  }

  const workId = normalizeOptionalText(audio.workId);
  const sourceTakeId = normalizeOptionalText(audio.sourceTakeId);
  if (workId === undefined || sourceTakeId === undefined) {
    return false;
  }

  const sourceWork = works.find((work) => work.id === workId);
  if (sourceWork === undefined) {
    return false;
  }

  const sourceTake = sourceWork.tracks
    .filter((track) => track.kind === 'instrument')
    .flatMap((track) => track.takes.map((take) => ({ take, track })))
    .find((entry) => entry.take.id === sourceTakeId);
  if (sourceTake === undefined) {
    return false;
  }

  if (sourceTake.take.events.length === 0) {
    return false;
  }

  const sourceEventCount = audio.sourceEventCount;
  if (
    typeof sourceEventCount !== 'number' ||
    !Number.isInteger(sourceEventCount) ||
    sourceEventCount <= 0
  ) {
    return false;
  }

  if (countWorkMixPlanInstrumentEvents(sourceWork) !== sourceEventCount) {
    return false;
  }

  const audibleTrackIds = new Set(createWorkMixPlan(sourceWork).tracks.map((track) => track.trackId));
  return audibleTrackIds.has(sourceTake.track.id);
}

export function isPlayableCapturedAudioExport(
  works: readonly Work[],
  audio: ExportedAudio,
): boolean {
  const audioUri = normalizeOptionalText(audio.audioUri);
  const workId = normalizeOptionalText(audio.workId);
  const sourceTakeId = normalizeOptionalText(audio.sourceTakeId);
  const sourceRecordingUri = normalizeOptionalText(audio.sourceRecordingUri);
  if (
    audioUri === undefined ||
    workId === undefined ||
    sourceTakeId === undefined ||
    sourceRecordingUri === undefined ||
    !isCaptureFileUri(audioUri) ||
    !isCaptureFileUri(sourceRecordingUri)
  ) {
    return false;
  }

  const sourceWork = works.find((work) => work.id === workId);
  if (sourceWork === undefined) {
    return false;
  }

  const sourceTake = findInstrumentTakeById(sourceWork, sourceTakeId);
  if (sourceTake === undefined) {
    return false;
  }

  const takeRecordingUri = normalizeOptionalText(sourceTake.take.recordingUri);
  if (takeRecordingUri !== sourceRecordingUri) {
    return false;
  }

  const audibleTrackIds = new Set(createWorkMixPlan(sourceWork).tracks.map((track) => track.trackId));
  return audibleTrackIds.has(sourceTake.track.id);
}

function createLibraryPlaybackAudioAssetModules(): Record<string, number> {
  return {
    [ARIRANG_DEMO_AUDIO_URI]: require('../../assets/audio/demo/my-arirang-showcase.wav'),
    [DAEGEUM_DEMO_AUDIO_URI]: require('../../assets/audio/demo/daegeum-showcase.wav'),
    [PRACTICE_ARIRANG_AUDIO_URI]: require('../../assets/audio/demo/my-arirang-showcase.wav'),
    [PRACTICE_DAEGEUM_AUDIO_URI]: require('../../assets/audio/demo/daegeum-showcase.wav'),
    [EXPORT_FALLBACK_AUDIO_URI]: require('../../assets/audio/demo/my-arirang-showcase.wav'),
    [jangguNgcMonotoneSampleManifest.assets[0].fileUri]: require('../../assets/audio/ngc-monotone/janggu/kung-strong.wav'),
    [daegeumNgcMonotoneSampleManifest.assets[0].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-01.wav'),
    [daegeumNgcMonotoneSampleManifest.assets[7].fileUri]: require('../../assets/audio/ngc-monotone/daegeum/note-08.wav'),
  };
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function isCaptureFileUri(value: string): boolean {
  return /^(file|content):\/\/\S+/i.test(value.trim());
}

function findInstrumentTakeById(
  work: Work,
  takeId: string,
): { track: Extract<Work['tracks'][number], { kind: 'instrument' }>; take: Take } | undefined {
  for (const track of work.tracks) {
    if (track.kind !== 'instrument') {
      continue;
    }

    const take = track.takes.find((candidate) => candidate.id === takeId);
    if (take !== undefined) {
      return { track, take };
    }
  }

  return undefined;
}

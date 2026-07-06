import type { AuthStoragePort } from './authSessionStore';
import type { ProductLibraryState } from './garakProductState';
import {
  createNoopGarakProductServices,
  type PauseLibraryAudioResult,
  type GarakProductServices,
  type PlayLibraryAudioInput,
  type PlayLibraryAudioResult,
  type ServiceResult,
  type StopRecordingCaptureResult,
} from './garakProductServices';
import {
  createLivePerformanceAudioPort,
  type LivePerformanceAudioPort,
} from './livePerformanceAudio';
import { getLivePerformanceBundledSampleManifest } from './livePerformanceBundledSamples';
import type { PerformanceEvent } from '../domain/performanceEvent';
import type { SampleAssetManifest } from '../domain/sampleManifest';
import type { ExportedAudio, InstrumentId, Take, Work } from '../studio/studioTypes';
import {
  countWorkMixPlanInstrumentEvents,
  createWorkMixPlan,
  type WorkMixPlan,
} from '../studio/studioLibrary';
import {
  createLocalExportAudioUri,
  createSharedRecordingLibraryAudioUri,
  isPlayableExportedAudioForPlayback,
  isPlayableExportedAudioUri,
  resolveLibraryPlaybackAudioSource,
} from './libraryPlaybackAudio';
import { findSharedRecordingById } from './productFixtures';

const LIBRARY_SNAPSHOT_STORAGE_KEY = 'garak.library.snapshot.v1';
const DEFAULT_SHARE_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_RECORDING_CAPTURE_MAX_SECONDS = 60 * 60;
const DEFAULT_WORK_MIX_PREVIEW_BPM = 84;
const FIRST_WORK_MIX_BEAT = 1;
const GARAK_RECORDING_CAPTURE_DIRECTORY = 'garak-recordings';
const LOCAL_WORK_MIX_PREVIEW_UNSUPPORTED_MESSAGE =
  'Local work mix preview cannot render a full mixed audio preview yet.';
const LOCAL_WORK_MIX_EXPORT_UNSUPPORTED_MESSAGE =
  'Local export cannot render a full mixed audio artifact yet.';

export type GarakSharePort = (content: {
  title?: string;
  message: string;
  url?: string;
}) => Promise<unknown>;

export type LocalGarakProductServicesInput = {
  storage?: AuthStoragePort;
  share?: GarakSharePort;
  liveAudio?: LivePerformanceAudioPort;
  recordingCapture?: RecordingCapturePort;
  recordingCaptureStorage?: RecordingCaptureStoragePort;
  libraryAudio?: LibraryAudioPort;
  nowMs?: () => number;
  createRemoteId?: () => string;
};

export type LibraryAudioPort = {
  playLibraryAudio: (
    input: PlayLibraryAudioInput,
  ) => Promise<ServiceResult<PlayLibraryAudioResult>>;
  pauseLibraryAudio: () => Promise<ServiceResult<PauseLibraryAudioResult>>;
};

export type RecordingCapturePort = Pick<
  GarakProductServices['audio'],
  'startRecordingCapture' | 'stopRecordingCapture' | 'discardRecordingCapture'
>;

export type RecordingCaptureStoragePort = {
  persistRecordingCapture: (input: {
    recordingUri: string;
    durationSeconds?: number;
    capturedAtMs: number;
  }) => Promise<ServiceResult<{ recordingUri: string }>>;
};

export type RecordingCaptureFileSystemPort = {
  documentDirectory?: string | null;
  makeDirectoryAsync: (uri: string, options?: { intermediates?: boolean }) => Promise<void>;
  copyAsync: (input: { from: string; to: string }) => Promise<void>;
};

export function createExpoFileSystemRecordingCaptureStoragePort(
  fileSystem: RecordingCaptureFileSystemPort,
): RecordingCaptureStoragePort {
  return {
    async persistRecordingCapture(input) {
      const documentDirectory = normalizeOptionalText(fileSystem.documentDirectory);
      const sourceUri = normalizeOptionalText(input.recordingUri);
      if (documentDirectory === undefined || sourceUri === undefined) {
        return { status: 'unavailable' };
      }

      const directoryUri = joinFileUri(documentDirectory, GARAK_RECORDING_CAPTURE_DIRECTORY);
      const targetUri = joinFileUri(
        directoryUri,
        createRecordingCaptureFileName(sourceUri, input.capturedAtMs),
      );

      try {
        await fileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });
        await fileSystem.copyAsync({ from: sourceUri, to: targetUri });

        return {
          status: 'ok',
          value: { recordingUri: targetUri },
        };
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

export function createLocalGarakProductServices({
  storage = createDefaultLocalStorage(),
  share = async () => undefined,
  liveAudio = createLivePerformanceAudioPort(),
  recordingCapture = createEventOnlyRecordingCapturePort(),
  recordingCaptureStorage,
  libraryAudio = createExpoLibraryAudioPort(),
  nowMs = () => Date.now(),
  createRemoteId = createShareId,
}: LocalGarakProductServicesInput = {}): GarakProductServices {
  const noopServices = createNoopGarakProductServices();
  const sequencedRecordingCapture = createSequencedRecordingCapturePort(recordingCapture, nowMs);

  return {
    ...noopServices,
    library: {
      loadSnapshot: async () => readLibrarySnapshot(storage),
      saveSnapshot: async (snapshot) => {
        await storage.setItem(LIBRARY_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
      },
    },
    audio: {
      ...noopServices.audio,
      prepareLivePerformanceAudio: liveAudio.prepareLivePerformanceAudio,
      playPerformanceEvents: liveAudio.playPerformanceEvents,
      startRecordingCapture: sequencedRecordingCapture.startRecordingCapture,
      stopRecordingCapture: async () =>
        persistRecordingCaptureResult(
          await sequencedRecordingCapture.stopRecordingCapture(),
          recordingCaptureStorage,
          nowMs,
        ),
      discardRecordingCapture: sequencedRecordingCapture.discardRecordingCapture,
      playWorkMix: async (work, mixPlan) => {
        if (mixPlan.tracks.length === 0) {
          return {
            status: 'error',
            message: 'No audible tracks are available to preview.',
          };
        }

        const eventReplays = createLocalWorkMixEventReplays(work, mixPlan);
        if (eventReplays.length === mixPlan.tracks.length) {
          for (const replay of eventReplays) {
            const result = await liveAudio.playPerformanceEvents({
              instrument: replay.instrument,
              events: replay.events,
            });

            if (result.status !== 'ok') {
              return result.status === 'error'
                ? { status: 'error', message: result.message }
                : { status: 'unavailable' };
            }
          }

          return {
            status: 'ok',
            value: { handledTracks: eventReplays.length },
          };
        }

        if (requiresFullLocalMixRenderer(mixPlan)) {
          return {
            status: 'error',
            message: LOCAL_WORK_MIX_PREVIEW_UNSUPPORTED_MESSAGE,
          };
        }

        const artifact = createLocalExportArtifact(work, mixPlan);
        if (artifact.renderKind === 'audio_capture') {
          return playLocalWorkMixFallbackAudio(
            work,
            artifact.audioUri,
            libraryAudio,
            mixPlan.tracks.length,
            artifact.playbackVolume,
            'audioCapture',
          );
        }

        const referencePlaybacks = createLocalWorkMixReferencePlaybacks(work, mixPlan);
        if (referencePlaybacks.length > 0) {
          for (const reference of referencePlaybacks) {
            const playbackResult = await libraryAudio.playLibraryAudio({
              audioUri: reference.audioUri,
              title: reference.title,
              volume: reference.volume,
              sourceKind: 'sharedRecording',
            });

            if (playbackResult.status !== 'ok') {
              return playbackResult.status === 'error'
                ? { status: 'error', message: playbackResult.message }
                : { status: 'unavailable' };
            }
          }

          return {
            status: 'ok',
            value: { handledTracks: referencePlaybacks.length },
          };
        }

        if (mixPlan.tracks.some((track) => track.kind === 'reference')) {
          return {
            status: 'error',
            message: 'Reference audio source is unavailable.',
          };
        }

        return playLocalWorkMixFallbackAudio(work, artifact.audioUri, libraryAudio, mixPlan.tracks.length);
      },
      playLibraryAudio: libraryAudio.playLibraryAudio,
      pauseLibraryAudio: libraryAudio.pauseLibraryAudio,
      exportWorkAudio: async (work) => {
        const mixPlan = createWorkMixPlan(work);
        if (mixPlan.tracks.length === 0) {
          return {
            status: 'error',
            message: 'No audible tracks are available to export.',
          };
        }

        const eventReplays = createLocalWorkMixEventReplays(work, mixPlan);
        if (requiresFullLocalMixRenderer(mixPlan) && eventReplays.length !== mixPlan.tracks.length) {
          return {
            status: 'error',
            message: LOCAL_WORK_MIX_EXPORT_UNSUPPORTED_MESSAGE,
          };
        }

        if (hasUnresolvedReferenceAudio(work, mixPlan)) {
          return {
            status: 'error',
            message: 'Reference audio source is unavailable.',
          };
        }

        return {
          status: 'ok',
          value: {
            ...createLocalExportArtifact(work, mixPlan),
            durationSeconds: estimateWorkDurationSeconds(work),
          },
        };
      },
    },
    share: {
      publishShareTarget: async (input) => {
        const remoteId = createRemoteId();
        const shareUrl = input.shareUrl ?? createLocalShareUrl(remoteId);
        const expiresAtMs = nowMs() + DEFAULT_SHARE_LINK_TTL_MS;
        const shareMethod = input.fileUri === undefined ? 'link' : 'file';

        await share({
          title: input.title,
          message: `${input.message}\n${shareUrl}`,
          url: input.fileUri ?? shareUrl,
        });

        return {
          status: 'ok',
          value: {
            remoteId,
            shareUrl,
            expiresAtMs,
            shareMethod,
          },
        };
      },
    },
  };
}

async function readLibrarySnapshot(storage: AuthStoragePort): Promise<ProductLibraryState> {
  const rawSnapshot = await storage.getItem(LIBRARY_SNAPSHOT_STORAGE_KEY);

  if (rawSnapshot === null || rawSnapshot.trim().length === 0) {
    return createEmptyLibrarySnapshot();
  }

  try {
    return normalizeLibrarySnapshot(JSON.parse(rawSnapshot));
  } catch {
    return createEmptyLibrarySnapshot();
  }
}

function normalizeLibrarySnapshot(value: unknown): ProductLibraryState {
  if (typeof value !== 'object' || value === null) {
    return createEmptyLibrarySnapshot();
  }

  const snapshot = value as Partial<ProductLibraryState>;
  const works = Array.isArray(snapshot.works) ? snapshot.works.map(normalizeWorkSnapshot) : [];

  return {
    works,
    exportedAudios: Array.isArray(snapshot.exportedAudios)
      ? snapshot.exportedAudios.map((audio) => normalizeExportedAudioSnapshot(audio, works))
      : [],
    practiceResults: Array.isArray(snapshot.practiceResults) ? snapshot.practiceResults : [],
  };
}

function normalizeWorkSnapshot(work: Work): Work {
  return {
    ...work,
    tracks: Array.isArray(work.tracks) ? work.tracks.map(normalizeTrackSnapshot) : [],
  };
}

function normalizeTrackSnapshot(track: Work['tracks'][number]): Work['tracks'][number] {
  if (track.kind !== 'instrument') {
    return track;
  }

  return {
    ...track,
    takes: Array.isArray(track.takes) ? track.takes.map(normalizeTakeSnapshot) : [],
  };
}

function normalizeTakeSnapshot(take: Take): Take {
  const recordingUri = normalizeOptionalText(take.recordingUri);
  if (recordingUri === undefined) {
    return take;
  }

  if (isCaptureFileUri(recordingUri)) {
    return {
      ...take,
      recordingUri,
    };
  }

  const { recordingUri: _discardedRecordingUri, ...rest } = take;
  return rest;
}

function normalizeExportedAudioSnapshot(audio: ExportedAudio, works: Work[]): ExportedAudio {
  const audioUri = normalizeOptionalText(audio.audioUri) ?? createLocalExportAudioUri();
  if (audio.renderKind === 'event_replay') {
    return normalizeEventReplayExportSnapshot(audio, works, audioUri);
  }

  if (audio.renderKind !== 'audio_capture') {
    return {
      ...audio,
      audioUri,
    };
  }

  const sourceRecordingUri = normalizeOptionalText(audio.sourceRecordingUri);
  const sourceWork = findSnapshotWork(works, audio.workId);
  const sourceTake = findSnapshotInstrumentTake(works, audio.workId, audio.sourceTakeId);
  if (sourceTake !== undefined && sourceTake.take.events.length > 0) {
    const { sourceRecordingUri: _discardedSourceRecordingUri, ...rest } = audio;
    const eventReplayExport: ExportedAudio = {
      ...rest,
      audioUri: createLocalExportAudioUri(),
      renderKind: 'event_replay',
      sourceEventCount:
        sourceWork === undefined
          ? sourceTake.take.events.length
          : countWorkMixPlanInstrumentEvents(sourceWork),
    };

    if (isPlayableExportedAudioForPlayback(works, eventReplayExport)) {
      return eventReplayExport;
    }
  }

  if (
    isCaptureFileUri(audioUri) &&
    sourceRecordingUri !== undefined &&
    isCaptureFileUri(sourceRecordingUri) &&
    sourceWork !== undefined &&
    sourceTake !== undefined &&
    isSnapshotInstrumentTakeAudible(sourceWork, sourceTake) &&
    normalizeOptionalText(sourceTake.take.recordingUri) === sourceRecordingUri
  ) {
    return {
      ...audio,
      audioUri,
      sourceRecordingUri,
    };
  }

  const {
    sourceRecordingUri: _discardedSourceRecordingUri,
    sourceTakeId: _discardedSourceTakeId,
    sourceEventCount: _discardedSourceEventCount,
    ...rest
  } = audio;

  return {
    ...rest,
    audioUri: createLocalExportAudioUri(),
    renderKind: 'demo_sample',
  };
}

function normalizeEventReplayExportSnapshot(
  audio: ExportedAudio,
  works: Work[],
  audioUri: string,
): ExportedAudio {
  const normalizedAudio = {
    ...audio,
    audioUri: isPlayableExportedAudioUri(audioUri) ? audioUri : createLocalExportAudioUri(),
  };
  const { sourceRecordingUri: _discardedSourceRecordingUri, ...withoutRecordingSource } =
    normalizedAudio;

  if (isPlayableExportedAudioForPlayback(works, withoutRecordingSource)) {
    return withoutRecordingSource;
  }

  const {
    sourceTakeId: _discardedSourceTakeId,
    sourceEventCount: _discardedSourceEventCount,
    sourceRecordingUri: _discardedInvalidSourceRecordingUri,
    ...rest
  } = audio;

  return {
    ...rest,
    audioUri: createLocalExportAudioUri(),
    renderKind: 'demo_sample',
  };
}

function findSnapshotWork(works: Work[], workId: string | undefined): Work | undefined {
  return workId === undefined ? undefined : works.find((item) => item.id === workId);
}

function findSnapshotInstrumentTake(
  works: Work[],
  workId: string | undefined,
  takeId: string | undefined,
): { track: Extract<Work['tracks'][number], { kind: 'instrument' }>; take: Take } | undefined {
  if (workId === undefined || takeId === undefined) {
    return undefined;
  }

  const work = works.find((item) => item.id === workId);
  if (work === undefined) {
    return undefined;
  }

  for (const track of work.tracks) {
    if (track.kind !== 'instrument') {
      continue;
    }

    const take = track.takes.find((item) => item.id === takeId);
    if (take !== undefined) {
      return { track, take };
    }
  }

  return undefined;
}

function isSnapshotInstrumentTakeAudible(
  work: Work,
  sourceTake: { track: Extract<Work['tracks'][number], { kind: 'instrument' }>; take: Take },
): boolean {
  const audibleTrackIds = new Set(createWorkMixPlan(work).tracks.map((track) => track.trackId));

  return audibleTrackIds.has(sourceTake.track.id);
}

function createEmptyLibrarySnapshot(): ProductLibraryState {
  return {
    works: [],
    exportedAudios: [],
    practiceResults: [],
  };
}

function createSequencedRecordingCapturePort(
  port: RecordingCapturePort,
  nowMs: () => number,
): RecordingCapturePort {
  let inFlightStart: ReturnType<RecordingCapturePort['startRecordingCapture']> | undefined;
  let activeStartedAtMs: number | undefined;

  return {
    startRecordingCapture(input) {
      if (inFlightStart !== undefined) {
        return inFlightStart;
      }

      const startRequestedAtMs = nowMs();
      const result = port.startRecordingCapture(input);
      const waitForStart = result
        .then(
          (startResult) => {
            activeStartedAtMs = startResult.status === 'ok' ? startRequestedAtMs : undefined;
            return startResult;
          },
          (error) => {
            activeStartedAtMs = undefined;
            throw error;
          },
        )
        .finally(() => {
          if (inFlightStart === waitForStart) {
            inFlightStart = undefined;
          }
        });

      inFlightStart = waitForStart;
      return waitForStart;
    },
    async stopRecordingCapture() {
      await inFlightStart?.catch(() => undefined);
      const result = await port.stopRecordingCapture();
      const stoppedAtMs = nowMs();
      const startedAtMs = activeStartedAtMs;
      activeStartedAtMs = undefined;

      return applyElapsedRecordingDurationFallback(result, startedAtMs, stoppedAtMs);
    },
    async discardRecordingCapture() {
      await inFlightStart?.catch(() => undefined);
      const result = await port.discardRecordingCapture();
      activeStartedAtMs = undefined;
      return result;
    },
  };
}

function applyElapsedRecordingDurationFallback(
  result: ServiceResult<StopRecordingCaptureResult>,
  startedAtMs: number | undefined,
  stoppedAtMs: number,
): ServiceResult<StopRecordingCaptureResult> {
  if (
    result.status !== 'ok' ||
    normalizeOptionalText(result.value.recordingUri) === undefined ||
    isPositiveNumber(result.value.durationSeconds)
  ) {
    return result;
  }

  const fallbackDurationSeconds = createElapsedRecordingDurationSeconds(startedAtMs, stoppedAtMs);
  if (fallbackDurationSeconds === undefined) {
    return result;
  }

  return {
    status: 'ok',
    value: {
      ...result.value,
      durationSeconds: fallbackDurationSeconds,
    },
  };
}

function createElapsedRecordingDurationSeconds(
  startedAtMs: number | undefined,
  stoppedAtMs: number,
): number | undefined {
  if (
    startedAtMs === undefined ||
    !Number.isFinite(startedAtMs) ||
    !Number.isFinite(stoppedAtMs) ||
    stoppedAtMs < startedAtMs
  ) {
    return undefined;
  }

  return Math.max((stoppedAtMs - startedAtMs) / 1000, 0.001);
}

function isPositiveNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function requiresFullLocalMixRenderer(mixPlan: WorkMixPlan): boolean {
  return mixPlan.tracks.length > 1 || mixPlan.tracks.some((track) => track.kind === 'accompaniment');
}

function hasUnresolvedReferenceAudio(work: Work, mixPlan: WorkMixPlan): boolean {
  const referenceTrackCount = mixPlan.tracks.filter((track) => track.kind === 'reference').length;

  return (
    referenceTrackCount > 0 &&
    createLocalWorkMixReferencePlaybacks(work, mixPlan).length !== referenceTrackCount
  );
}

function createLocalExportUri(work: Work): string {
  void work;
  return createLocalExportAudioUri();
}

function normalizeOptionalText(value: string | undefined | null): string | undefined {
  const normalized = value?.trim();

  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function isCaptureFileUri(value: string): boolean {
  return /^(file|content):\/\/\S+/i.test(value.trim());
}

function joinFileUri(baseUri: string, pathSegment: string): string {
  return `${baseUri.replace(/\/+$/, '')}/${pathSegment.replace(/^\/+/, '')}`;
}

function createRecordingCaptureFileName(recordingUri: string, capturedAtMs: number): string {
  const timestamp = Number.isFinite(capturedAtMs) ? Math.max(0, Math.round(capturedAtMs)) : 0;
  const sourceName = normalizeOptionalText(recordingUri.split(/[?#]/)[0]?.split('/').filter(Boolean).pop())
    ?? 'capture.m4a';
  const sanitizedName = normalizeOptionalText(
    sourceName
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, ''),
  ) ?? 'capture.m4a';
  const fileName = sanitizedName.includes('.') ? sanitizedName : `${sanitizedName}.m4a`;

  return `${timestamp}-${fileName}`;
}

async function persistRecordingCaptureResult(
  result: ServiceResult<StopRecordingCaptureResult>,
  storage: RecordingCaptureStoragePort | undefined,
  nowMs: () => number,
): Promise<ServiceResult<StopRecordingCaptureResult>> {
  if (result.status !== 'ok' || storage === undefined) {
    return result;
  }

  const recordingUri = normalizeOptionalText(result.value.recordingUri);
  if (recordingUri === undefined) {
    return result;
  }

  try {
    const persisted = await storage.persistRecordingCapture({
      recordingUri,
      durationSeconds: result.value.durationSeconds,
      capturedAtMs: nowMs(),
    });
    if (persisted.status !== 'ok') {
      return {
        status: 'error',
        message:
          persisted.status === 'error'
            ? `Recording capture could not be saved: ${persisted.message}`
            : 'Recording capture could not be saved: persistent storage is unavailable.',
      };
    }

    const persistedRecordingUri = normalizeOptionalText(persisted.value.recordingUri);
    if (persistedRecordingUri === undefined) {
      return {
        status: 'error',
        message: 'Recording capture could not be saved: persistent storage returned no URI.',
      };
    }

    return {
      status: 'ok',
      value: {
        ...result.value,
        recordingUri: persistedRecordingUri,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Recording capture could not be saved: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

function createLocalExportArtifact(work: Work, mixPlan?: WorkMixPlan): {
  audioUri: string;
  renderKind: 'audio_capture' | 'event_replay' | 'demo_sample';
  sourceTakeId?: string;
  sourceEventCount?: number;
  sourceRecordingUri?: string;
  playbackVolume?: number;
} {
  const resolvedMixPlan = mixPlan ?? createWorkMixPlan(work);
  const audibleTrackIds = new Set(resolvedMixPlan.tracks.map((track) => track.trackId));
  const eventTake = findFirstInstrumentTake(work, (take) => take.events.length > 0, audibleTrackIds);
  if (eventTake !== undefined) {
    return {
      audioUri: createLocalExportUri(work),
      renderKind: 'event_replay',
      sourceTakeId: eventTake.take.id,
      sourceEventCount: countWorkMixPlanInstrumentEvents(work, resolvedMixPlan),
    };
  }

  const capturedTake = findFirstInstrumentTake(
    work,
    (take) => {
      const recordingUri = normalizeOptionalText(take.recordingUri);
      return recordingUri !== undefined && isCaptureFileUri(recordingUri);
    },
    audibleTrackIds,
  );
  if (capturedTake !== undefined) {
    const recordingUri = normalizeOptionalText(capturedTake.take.recordingUri) as string;
    const playbackVolume = resolvedMixPlan.tracks.find(
      (track) => track.trackId === capturedTake.track.id,
    )?.volume;

    return {
      audioUri: recordingUri,
      renderKind: 'audio_capture',
      sourceTakeId: capturedTake.take.id,
      sourceRecordingUri: recordingUri,
      playbackVolume: clamp01(playbackVolume ?? 1),
    };
  }

  const referencePlayback = createLocalWorkMixReferencePlaybacks(work, resolvedMixPlan)[0];
  if (referencePlayback !== undefined) {
    return {
      audioUri: referencePlayback.audioUri,
      renderKind: 'demo_sample',
      playbackVolume: referencePlayback.volume,
    };
  }

  return {
    audioUri: createLocalExportUri(work),
    renderKind: 'demo_sample',
  };
}

async function playLocalWorkMixFallbackAudio(
  work: Work,
  audioUri: string,
  libraryAudio: LibraryAudioPort,
  handledTracks: number,
  volume = 1,
  sourceKind: PlayLibraryAudioInput['sourceKind'] = 'demo',
): Promise<ServiceResult<{ handledTracks: number }>> {
  const playbackResult = await libraryAudio.playLibraryAudio({
    audioUri,
    title: work.title,
    volume: clamp01(volume),
    sourceKind,
  });

  if (playbackResult.status !== 'ok') {
    return playbackResult.status === 'error'
      ? { status: 'error', message: playbackResult.message }
      : { status: 'unavailable' };
  }

  return {
    status: 'ok',
    value: { handledTracks },
  };
}

function createLocalWorkMixEventReplays(
  work: Work,
  mixPlan: WorkMixPlan,
): Array<{ instrument: InstrumentId; events: PerformanceEvent[] }> {
  const tracksById = new Map(work.tracks.map((track) => [track.id, track]));
  const replays: Array<{ instrument: InstrumentId; events: PerformanceEvent[] }> = [];

  for (const planTrack of mixPlan.tracks) {
    if (planTrack.kind !== 'instrument') {
      continue;
    }

    const track = tracksById.get(planTrack.trackId);
    if (track?.kind !== 'instrument') {
      continue;
    }

    const events = track.takes.flatMap((take) => {
      const startOffsetMs = createStartBeatOffsetMs(planTrack.startedAtBeat, take.recordingSetup?.bpm);

      return take.events.map((event) =>
        shiftPerformanceEventTime(
          scalePerformanceEventVelocity(event, planTrack.volume),
          startOffsetMs,
        ),
      );
    });
    if (events.length === 0) {
      continue;
    }

    replays.push({
      instrument: track.instrument,
      events,
    });
  }

  return replays;
}

function createLocalWorkMixReferencePlaybacks(
  work: Work,
  mixPlan: WorkMixPlan,
): Array<{ audioUri: string; title: string; volume: number }> {
  const tracksById = new Map(work.tracks.map((track) => [track.id, track]));
  const playbacks: Array<{ audioUri: string; title: string; volume: number }> = [];

  for (const planTrack of mixPlan.tracks) {
    if (planTrack.kind !== 'reference') {
      continue;
    }

    const track = tracksById.get(planTrack.trackId);
    if (track?.kind !== 'reference') {
      continue;
    }

    const recording = findSharedRecordingById(track.sourceShareId);
    if (recording === undefined) {
      continue;
    }

    playbacks.push({
      audioUri: createSharedRecordingLibraryAudioUri(recording),
      title: track.title,
      volume: clamp01(planTrack.volume),
    });
  }

  return playbacks;
}

function createStartBeatOffsetMs(startedAtBeat: number, bpm: number | undefined): number {
  const normalizedBpm = bpm !== undefined && Number.isFinite(bpm) && bpm > 0
    ? bpm
    : DEFAULT_WORK_MIX_PREVIEW_BPM;

  return Math.max(0, Math.round((startedAtBeat - FIRST_WORK_MIX_BEAT) * (60_000 / normalizedBpm)));
}

function shiftPerformanceEventTime(event: PerformanceEvent, offsetMs: number): PerformanceEvent {
  if (offsetMs === 0) {
    return event;
  }

  return {
    ...event,
    tsMs: event.tsMs + offsetMs,
  };
}

function scalePerformanceEventVelocity(event: PerformanceEvent, volume: number): PerformanceEvent {
  switch (event.type) {
    case 'string_pluck':
    case 'glissando_step':
      return {
        ...event,
        velocity: clamp01(event.velocity * volume),
      };
    default:
      return event;
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, Math.round(value * 1000) / 1000));
}

function findFirstInstrumentTake(
  work: Work,
  predicate: (take: Take) => boolean,
  trackIds?: ReadonlySet<string>,
): { track: Extract<Work['tracks'][number], { kind: 'instrument' }>; take: Take } | undefined {
  for (const track of work.tracks) {
    if (trackIds !== undefined && !trackIds.has(track.id)) {
      continue;
    }

    if (track.kind !== 'instrument') {
      continue;
    }

    const take = track.takes.find(predicate);
    if (take !== undefined) {
      return { track, take };
    }
  }

  return undefined;
}

function createEventOnlyRecordingCapturePort(): RecordingCapturePort {
  return {
    startRecordingCapture: async () => ({ status: 'unavailable' }),
    stopRecordingCapture: async () => ({ status: 'unavailable' }),
    discardRecordingCapture: async () => ({ status: 'ok', value: { discarded: false } }),
  };
}

export function createExpoRecordingCapturePort(): RecordingCapturePort {
  type ProductRecordingEngine = {
    startRecordingProbe(durationSeconds: number): Promise<
      | { ok: true; requestedDurationSeconds: number }
      | { ok: false; reason: string }
    >;
    stopRecordingProbe(): Promise<{
      ok: true;
      capturedSeconds: number;
      recordingUri: string | null;
    }>;
  };

  let activeEngine: ProductRecordingEngine | undefined;

  return {
    async startRecordingCapture(input) {
      if (activeEngine !== undefined) {
        return {
          status: 'error',
          message: 'Recording capture is already active.',
        };
      }

      try {
        const engine = await createExpoRecordingEngine(input.instrument);
        const result = await engine.startRecordingProbe(DEFAULT_RECORDING_CAPTURE_MAX_SECONDS);
        if (!result.ok) {
          return {
            status: 'error',
            message: formatRecordingCaptureStartFailure(result.reason),
          };
        }

        activeEngine = engine;
        return {
          status: 'ok',
          value: { started: true },
        };
      } catch (error) {
        activeEngine = undefined;
        return {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
    async stopRecordingCapture() {
      if (activeEngine === undefined) {
        return {
          status: 'unavailable',
        };
      }

      const engine = activeEngine;
      activeEngine = undefined;

      try {
        const result = await engine.stopRecordingProbe();
        return {
          status: 'ok',
          value: {
            recordingUri: normalizeOptionalText(result.recordingUri),
            durationSeconds: result.capturedSeconds,
          },
        };
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
    async discardRecordingCapture() {
      if (activeEngine === undefined) {
        return {
          status: 'ok',
          value: { discarded: false },
        };
      }

      const engine = activeEngine;
      activeEngine = undefined;

      try {
        await engine.stopRecordingProbe();
      } catch {
        // Best effort cleanup: the product flow still keeps event recording.
      }

      return {
        status: 'ok',
        value: { discarded: true },
      };
    },
  };
}

async function createExpoRecordingEngine(instrument: InstrumentId): Promise<{
  startRecordingProbe(durationSeconds: number): Promise<
    | { ok: true; requestedDurationSeconds: number }
    | { ok: false; reason: string }
  >;
  stopRecordingProbe(): Promise<{
    ok: true;
    capturedSeconds: number;
    recordingUri: string | null;
  }>;
}> {
  const [
    { ExpoAudioSamplerEngine },
    { createExpoAudioRuntimePort },
    { prototypeGayageumSampleManifest },
  ] = await Promise.all([
    import('../audio/expoAudioSamplerEngine'),
    import('../audio/expoAudioRuntime'),
    import('../prototype/prototypeSampleManifest'),
  ]);
  const manifest = resolveRecordingCaptureManifest(instrument, prototypeGayageumSampleManifest);

  return new ExpoAudioSamplerEngine({
    manifest,
    runtime: createExpoAudioRuntimePort(),
  });
}

function resolveRecordingCaptureManifest(
  instrument: InstrumentId,
  fallbackManifest: SampleAssetManifest,
): SampleAssetManifest {
  return getLivePerformanceBundledSampleManifest(instrument) ?? fallbackManifest;
}

function formatRecordingCaptureStartFailure(reason: string): string {
  switch (reason) {
    case 'recording_permission_denied':
      return '마이크 권한이 거부되었습니다.';
    case 'recording_already_active':
      return '이미 오디오 캡처가 진행 중입니다.';
    case 'recording_duration_invalid':
      return '녹음 시간이 올바르지 않습니다.';
    case 'recording_start_failed':
      return '오디오 캡처를 시작하지 못했습니다.';
    default:
      return reason;
  }
}

function createExpoLibraryAudioPort(): LibraryAudioPort {
  type ExpoAudioPlayer = {
    pause: () => void;
    play: () => void;
    remove: () => void;
    volume: number;
  };

  let activePlayer: ExpoAudioPlayer | undefined;

  return {
    async playLibraryAudio(input) {
      try {
        activePlayer?.pause();
        activePlayer?.remove();

        const { createAudioPlayer } = await import('expo-audio');
        const source = resolveLibraryPlaybackAudioSource(input.audioUri);
        const player = createAudioPlayer(source, {
          keepAudioSessionActive: true,
        });

        activePlayer = player;
        player.volume = clamp01(input.volume ?? 1);
        player.play();

        return {
          status: 'ok',
          value: { audioUri: input.audioUri },
        };
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
    async pauseLibraryAudio() {
      try {
        activePlayer?.pause();

        return {
          status: 'ok',
          value: { paused: activePlayer !== undefined },
        };
      } catch (error) {
        return {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

function estimateWorkDurationSeconds(work: Work): number {
  const maxDurationBeats = Math.max(
    4,
    ...work.tracks.map((track) => {
      if (track.kind !== 'instrument') {
        return 4;
      }

      return Math.max(4, ...track.takes.map((take) => take.startedAtBeat + take.durationBeats));
    }),
  );

  return Math.max(4, Math.round(maxDurationBeats * 0.75));
}

function createLocalShareUrl(remoteId: string): string {
  return `https://garak.local/share/${remoteId}`;
}

function createShareId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid !== undefined) {
    return randomUuid;
  }

  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultLocalStorage(): AuthStoragePort {
  const memoryValues = new Map<string, string>();

  return {
    async getItem(key) {
      return globalThis.localStorage?.getItem(key) ?? memoryValues.get(key) ?? null;
    },
    async setItem(key, value) {
      if (globalThis.localStorage !== undefined) {
        globalThis.localStorage.setItem(key, value);
        return;
      }

      memoryValues.set(key, value);
    },
    async deleteItem(key) {
      globalThis.localStorage?.removeItem(key);
      memoryValues.delete(key);
    },
  };
}

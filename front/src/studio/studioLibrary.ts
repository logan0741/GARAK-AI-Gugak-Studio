import { PerformanceEvent } from '../domain/performanceEvent';
import {
  AccompanimentTrack,
  ExportedAudio,
  InstrumentId,
  InstrumentSettingValues,
  InstrumentTrack,
  JangdanPresetId,
  LibrarySections,
  LiveJangdanGuide,
  PracticeResult,
  RecordingSetup,
  ReferenceTrack,
  Take,
  Track,
  Work,
} from './studioTypes';

const FIRST_BEAT = 1;

const INSTRUMENT_NAMES: Record<InstrumentId, string> = {
  gayageum: '가야금',
  janggu: '장구',
  daegeum: '대금',
};

export type WorkMixPlanTrack = {
  trackId: string;
  kind: Track['kind'];
  startedAtBeat: number;
  volume: number;
};

export type WorkMixPlan = {
  workId: string;
  title: string;
  hasSoloTracks: boolean;
  tracks: WorkMixPlanTrack[];
};

export function autoSaveTakeAsWork(input: {
  workId: string;
  trackId: string;
  takeId: string;
  title: string;
  instrument: InstrumentId;
  events: PerformanceEvent[];
  createdAt: string;
  startedAtBeat: number;
  durationBeats: number;
  recordingUri?: string;
  recordingSetup?: RecordingSetup;
  liveJangdanGuide?: LiveJangdanGuide;
  instrumentSettings?: InstrumentSettingValues;
}): Work {
  const take = createTake({
    id: input.takeId,
    events: input.events,
    startedAtBeat: input.startedAtBeat,
    durationBeats: input.durationBeats,
    recordingUri: input.recordingUri,
    recordingSetup: input.recordingSetup,
    liveJangdanGuide: input.liveJangdanGuide,
    instrumentSettings: input.instrumentSettings,
  });

  return {
    id: input.workId,
    title: input.title,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    source: 'free_creation',
    syncState: 'local_only',
    tracks: [
      createInstrumentTrack({
        id: input.trackId,
        instrument: input.instrument,
        take,
        createdAt: input.createdAt,
      }),
    ],
  };
}

export function addInstrumentTrack(
  work: Work,
  input: {
    trackId: string;
    takeId: string;
    instrument: InstrumentId;
    events: PerformanceEvent[];
    createdAt: string;
    durationBeats: number;
    playheadBeat?: number;
    recordingUri?: string;
    recordingSetup?: RecordingSetup;
    instrumentSettings?: InstrumentSettingValues;
  },
): Work {
  const startedAtBeat = resolveStartBeat(input.playheadBeat);
  const take = createTake({
    id: input.takeId,
    events: input.events,
    startedAtBeat,
    durationBeats: input.durationBeats,
    recordingUri: input.recordingUri,
    recordingSetup: input.recordingSetup,
    instrumentSettings: input.instrumentSettings,
  });

  return {
    ...work,
    updatedAt: input.createdAt,
    tracks: [
      ...work.tracks,
      createInstrumentTrack({
        id: input.trackId,
        instrument: input.instrument,
        take,
        createdAt: input.createdAt,
      }),
    ],
  };
}

export function addAccompanimentTrack(
  work: Work,
  input: {
    trackId: string;
    presetId: JangdanPresetId;
    bpm: number;
    volume: number;
    createdAt: string;
    playheadBeat?: number;
  },
): Work {
  const track: AccompanimentTrack = {
    id: input.trackId,
    kind: 'accompaniment',
    presetId: input.presetId,
    bpm: input.bpm,
    volume: clamp01(input.volume),
    mute: false,
    solo: false,
    startedAtBeat: resolveStartBeat(input.playheadBeat),
    createdAt: input.createdAt,
  };

  return {
    ...work,
    updatedAt: input.createdAt,
    tracks: [...work.tracks, track],
  };
}

export function isWorkShareable(_work: Work): boolean {
  return false;
}

export function toggleWorkTrackMute(
  work: Work,
  input: {
    trackId: string;
    updatedAt: string;
  },
): Work {
  const track = work.tracks.find((item) => item.id === input.trackId);
  if (track === undefined) {
    return work;
  }

  return {
    ...work,
    updatedAt: input.updatedAt,
    tracks: work.tracks.map((item) =>
      item.id === input.trackId ? { ...item, mute: !item.mute } : item,
    ),
  };
}

export function toggleWorkTrackSolo(
  work: Work,
  input: {
    trackId: string;
    updatedAt: string;
  },
): Work {
  const target = work.tracks.find((track) => track.id === input.trackId);
  if (target === undefined) {
    return work;
  }

  const shouldSoloTarget = !target.solo;

  return {
    ...work,
    updatedAt: input.updatedAt,
    tracks: work.tracks.map((track) => setTrackSolo(track, track.id === input.trackId && shouldSoloTarget)),
  };
}

export function createWorkMixPlan(work: Work): WorkMixPlan {
  const unmutedTracks = work.tracks.filter((track) => !track.mute);
  const soloTracks = unmutedTracks.filter((track) => track.solo);
  const audibleTracks = soloTracks.length > 0 ? soloTracks : unmutedTracks;
  const orderedTracks = audibleTracks
    .map((track, index) => ({
      index,
      track,
    }))
    .sort((left, right) => {
      const beatDiff = left.track.startedAtBeat - right.track.startedAtBeat;
      return beatDiff === 0 ? left.index - right.index : beatDiff;
    });

  return {
    workId: work.id,
    title: work.title,
    hasSoloTracks: soloTracks.length > 0,
    tracks: orderedTracks.map(({ track }) => ({
      trackId: track.id,
      kind: track.kind,
      startedAtBeat: resolveStartBeat(track.startedAtBeat),
      volume: clamp01(track.volume),
    })),
  };
}

export function exportWorkAudioPlaceholder(input: {
  id: string;
  work: Work;
  title: string;
  audioUri: string;
  durationSeconds: number;
  createdAt: string;
}): ExportedAudio {
  const referenceSource = collectReferenceSource(input.work);

  return {
    id: input.id,
    kind: 'exported_audio',
    workId: input.work.id,
    title: input.title,
    durationSeconds: input.durationSeconds,
    instrumentNames: collectInstrumentNames(input.work),
    createdAt: input.createdAt,
    audioUri: input.audioUri,
    shareState: 'ready',
    ...referenceSource,
  };
}

export function createPracticeResult(input: {
  id: string;
  songId: string;
  instrument: InstrumentId;
  accuracyScore: number;
  timingScore: number;
  feedback: string;
  createdAt: string;
}): PracticeResult {
  return {
    id: input.id,
    kind: 'practice_result',
    songId: input.songId,
    instrument: input.instrument,
    accuracyScore: input.accuracyScore,
    timingScore: input.timingScore,
    feedback: input.feedback,
    createdAt: input.createdAt,
    shareState: 'ready',
  };
}

export function selectLibrarySections(input: {
  works: Work[];
  exportedAudios: ExportedAudio[];
  practiceResults: PracticeResult[];
}): LibrarySections {
  return {
    works: input.works,
    shareables: [...input.exportedAudios, ...input.practiceResults],
  };
}

export function mergeAccountLibraryPreview(input: {
  localWorks: Work[];
  accountWorks: Work[];
}): {
  localPreserved: true;
  conflictWorkIds: string[];
  mergedWorkCount: number;
} {
  const accountIds = new Set(input.accountWorks.map((work) => work.id));
  const conflictWorkIds = input.localWorks
    .filter((work) => accountIds.has(work.id))
    .map((work) => work.id);

  return {
    localPreserved: true,
    conflictWorkIds,
    mergedWorkCount: input.localWorks.length + input.accountWorks.length,
  };
}

function createTake(input: {
  id: string;
  events: PerformanceEvent[];
  startedAtBeat: number;
  durationBeats: number;
  recordingUri?: string;
  recordingSetup?: RecordingSetup;
  liveJangdanGuide?: LiveJangdanGuide;
  instrumentSettings?: InstrumentSettingValues;
}): Take {
  return {
    id: input.id,
    events: input.events,
    recordingUri: normalizeOptionalText(input.recordingUri),
    startedAtBeat: input.startedAtBeat,
    durationBeats: input.durationBeats,
    recordingSetup: input.recordingSetup,
    liveJangdanGuide: input.liveJangdanGuide,
    instrumentSettings: input.instrumentSettings,
  };
}

function createInstrumentTrack(input: {
  id: string;
  instrument: InstrumentId;
  take: Take;
  createdAt: string;
}): InstrumentTrack {
  return {
    id: input.id,
    kind: 'instrument',
    instrument: input.instrument,
    takes: [input.take],
    startedAtBeat: input.take.startedAtBeat,
    volume: 1,
    mute: false,
    solo: false,
    createdAt: input.createdAt,
  };
}

function setTrackSolo(track: Track, solo: boolean): Track {
  return {
    ...track,
    solo,
  };
}

function collectInstrumentNames(work: Work): string[] {
  const names = new Set<string>();

  for (const track of work.tracks) {
    if (track.kind === 'instrument') {
      names.add(INSTRUMENT_NAMES[track.instrument]);
    }
    if (track.kind === 'accompaniment') {
      names.add('장단');
    }
    if (track.kind === 'reference') {
      names.add(`참조: ${track.title}`);
    }
  }

  return [...names];
}

function collectReferenceSource(work: Work): Pick<
  ExportedAudio,
  'sourceShareId' | 'authorDisplayName' | 'sourceLabel'
> | undefined {
  const referenceTrack = work.tracks.find((track): track is ReferenceTrack => track.kind === 'reference');

  if (referenceTrack === undefined) {
    return undefined;
  }

  return {
    sourceShareId: referenceTrack.sourceShareId,
    authorDisplayName: referenceTrack.authorDisplayName,
    sourceLabel: referenceTrack.sourceLabel,
  };
}

function resolveStartBeat(playheadBeat: number | undefined): number {
  if (typeof playheadBeat === 'number' && Number.isFinite(playheadBeat) && playheadBeat > 0) {
    return playheadBeat;
  }

  return FIRST_BEAT;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

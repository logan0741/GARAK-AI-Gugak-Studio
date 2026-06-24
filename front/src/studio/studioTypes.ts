import { PerformanceEvent } from '../domain/performanceEvent';

export type InstrumentId = 'gayageum' | 'janggu' | 'daegeum';

export type JangdanPresetId = 'semachi' | 'jungmori' | 'jajinmori';

export type TrackKind = 'instrument' | 'accompaniment' | 'reference';

export type SyncState = 'local_only' | 'synced' | 'account_only' | 'conflict';

export type ShareState = 'ready' | 'shared';

export type LiveJangdanGuide = {
  presetId: JangdanPresetId;
  bpm: number;
  volume: number;
  startedAtBeat: number;
};

export type RecordingSetup = {
  presetId: JangdanPresetId;
  bpm: number;
  beatUnit: string;
};

export type Take = {
  id: string;
  events: PerformanceEvent[];
  recordingUri?: string;
  startedAtBeat: number;
  durationBeats: number;
  recordingSetup?: RecordingSetup;
  liveJangdanGuide?: LiveJangdanGuide;
};

export type InstrumentTrack = {
  id: string;
  kind: 'instrument';
  instrument: InstrumentId;
  takes: Take[];
  startedAtBeat: number;
  volume: number;
  mute: boolean;
  solo: boolean;
  createdAt: string;
};

export type AccompanimentTrack = {
  id: string;
  kind: 'accompaniment';
  presetId: JangdanPresetId;
  bpm: number;
  volume: number;
  mute: boolean;
  solo: boolean;
  startedAtBeat: number;
  createdAt: string;
};

export type ReferenceTrack = {
  id: string;
  kind: 'reference';
  sourceShareId: string;
  title: string;
  authorDisplayName: string;
  sourceLabel: string;
  volume: number;
  mute: boolean;
  solo: boolean;
  startedAtBeat: number;
  createdAt: string;
};

export type Track = InstrumentTrack | AccompanimentTrack | ReferenceTrack;

export type Work = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  source: 'free_creation' | 'remix' | 'synced';
  syncState: SyncState;
  tracks: Track[];
};

export type ExportedAudio = {
  id: string;
  kind: 'exported_audio';
  workId?: string;
  title: string;
  durationSeconds: number;
  instrumentNames: string[];
  createdAt: string;
  audioUri: string;
  shareState: ShareState;
  sourceShareId?: string;
  authorDisplayName?: string;
  sourceLabel?: string;
};

export type PracticeResult = {
  id: string;
  kind: 'practice_result';
  songId: string;
  instrument: InstrumentId;
  accuracyScore: number;
  timingScore: number;
  feedback: string;
  createdAt: string;
  shareState: ShareState;
};

export type LibraryShareable = ExportedAudio | PracticeResult;

export type LibrarySections = {
  works: Work[];
  shareables: LibraryShareable[];
};

import type { PerformanceEvent } from '../domain/performanceEvent';
import type {
  InstrumentId,
  JangdanPresetId,
  RecordingSetup,
  Work,
} from '../studio/studioTypes';

export type AiAutoAccompanimentJo = 'pyeongjo' | 'gyemyeonjo';

export type AiAutoAccompanimentJangdan = JangdanPresetId | 'gutgeori';

export type AiAutoAccompanimentRole = 'melody' | 'rhythm';

export type AiAutoAccompanimentRequest = {
  requestId: string;
  source: 's10b_auto_accompaniment';
  workId: string;
  sourceTrackId: string;
  sourceTakeId: string;
  sourceInstrument: InstrumentId;
  events: readonly PerformanceEvent[];
  recordingUri?: string;
  recordingSetup?: RecordingSetup;
  options: {
    outputKind: 'ensemble_wav_candidate';
    maxCandidates: number;
    temperature: number;
  };
};

export type AiAutoAccompanimentGeneratedTrack = {
  instrument: InstrumentId;
  role: AiAutoAccompanimentRole;
  audioUri: string;
  volume: number;
  startedAtBeat: number;
};

export type AiAutoAccompanimentCandidate = {
  id: string;
  status: 'ready';
  sourceWorkId: string;
  sourceTrackId: string;
  sourceTakeId: string;
  sourceInstrument: InstrumentId;
  analysis: {
    jo: AiAutoAccompanimentJo;
    jangdan: AiAutoAccompanimentJangdan;
    bpm: number;
    confidence: number;
  };
  generatedTracks: AiAutoAccompanimentGeneratedTrack[];
  mixedAudioUri: string;
  durationSeconds: number;
  model: {
    pitchModelId?: string;
    rhythmModelId?: string;
    temperature: number;
  };
};

export type AiAutoAccompanimentFailureCode =
  | 'insufficient_events'
  | 'low_confidence'
  | 'model_unavailable'
  | 'audio_render_failed'
  | 'timeout';

export type AiAutoAccompanimentGenerationStage = 'analyzing' | 'generating' | 'mixing';

export type AiAutoAccompanimentStatus =
  | { status: 'idle' }
  | { status: 'generating'; stage: AiAutoAccompanimentGenerationStage }
  | { status: 'candidateReady'; candidate: AiAutoAccompanimentCandidate }
  | { status: 'failed'; code: AiAutoAccompanimentFailureCode; message: string };

export type AiAutoAccompanimentTrackPlan = {
  instrument: InstrumentId;
  role: AiAutoAccompanimentRole;
  volume: number;
};

export function createAutoAccompanimentRequest({
  requestId,
  work,
  maxCandidates = 1,
  temperature = 0.7,
}: {
  requestId: string;
  work: Work | undefined;
  maxCandidates?: number;
  temperature?: number;
}): AiAutoAccompanimentRequest | undefined {
  if (work === undefined) {
    return undefined;
  }

  for (const track of work.tracks) {
    if (track.kind !== 'instrument') {
      continue;
    }

    for (const take of track.takes) {
      if (take.events.length === 0) {
        continue;
      }

      return {
        requestId,
        source: 's10b_auto_accompaniment',
        workId: work.id,
        sourceTrackId: track.id,
        sourceTakeId: take.id,
        sourceInstrument: track.instrument,
        events: take.events,
        ...(take.recordingUri === undefined ? {} : { recordingUri: take.recordingUri }),
        ...(take.recordingSetup === undefined ? {} : { recordingSetup: take.recordingSetup }),
        options: {
          outputKind: 'ensemble_wav_candidate',
          maxCandidates,
          temperature,
        },
      };
    }
  }

  return undefined;
}

export function getAutoAccompanimentGeneratedTrackPlan(
  sourceInstrument: InstrumentId,
): AiAutoAccompanimentTrackPlan[] {
  switch (sourceInstrument) {
    case 'gayageum':
      return [
        { instrument: 'daegeum', role: 'melody', volume: 0.7 },
        { instrument: 'janggu', role: 'rhythm', volume: 0.6 },
      ];
    case 'daegeum':
      return [
        { instrument: 'gayageum', role: 'melody', volume: 0.7 },
        { instrument: 'janggu', role: 'rhythm', volume: 0.6 },
      ];
    case 'janggu':
      return [
        { instrument: 'gayageum', role: 'melody', volume: 0.7 },
        { instrument: 'daegeum', role: 'melody', volume: 0.7 },
      ];
  }
}

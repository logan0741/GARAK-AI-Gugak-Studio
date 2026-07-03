import { expect, test } from 'vitest';
import type { PerformanceEvent } from '../../domain/performanceEvent';
import type { Work } from '../../studio/studioTypes';
import {
  createAutoAccompanimentRequest,
  getAutoAccompanimentGeneratedTrackPlan,
} from '../aiAutoAccompaniment';

test('builds the S10B auto accompaniment request from the first recorded instrument take', () => {
  const events: PerformanceEvent[] = [
    { type: 'string_pluck', tsMs: 0, stringIndex: 1, velocity: 0.7 },
  ];
  const work = createWork('work-1', {
    instrument: 'gayageum',
    events,
  });

  expect(
    createAutoAccompanimentRequest({
      requestId: 'request-1',
      work,
    }),
  ).toEqual({
    requestId: 'request-1',
    source: 's10b_auto_accompaniment',
    workId: 'work-1',
    sourceTrackId: 'track-1',
    sourceTakeId: 'take-1',
    sourceInstrument: 'gayageum',
    events,
    recordingSetup: {
      presetId: 'semachi',
      bpm: 84,
      beatUnit: '4/4',
    },
    options: {
      outputKind: 'ensemble_wav_candidate',
      maxCandidates: 1,
      temperature: 0.7,
    },
  });
});

test('returns no auto accompaniment request when the work has no recorded events', () => {
  expect(
    createAutoAccompanimentRequest({
      requestId: 'request-1',
      work: createWork('work-1', { instrument: 'janggu', events: [] }),
    }),
  ).toBeUndefined();
});

test('plans generated partner tracks from the PDF instrument pairing rules', () => {
  expect(getAutoAccompanimentGeneratedTrackPlan('gayageum')).toEqual([
    { instrument: 'daegeum', role: 'melody', volume: 0.7 },
    { instrument: 'janggu', role: 'rhythm', volume: 0.6 },
  ]);
  expect(getAutoAccompanimentGeneratedTrackPlan('daegeum')).toEqual([
    { instrument: 'gayageum', role: 'melody', volume: 0.7 },
    { instrument: 'janggu', role: 'rhythm', volume: 0.6 },
  ]);
  expect(getAutoAccompanimentGeneratedTrackPlan('janggu')).toEqual([
    { instrument: 'gayageum', role: 'melody', volume: 0.7 },
    { instrument: 'daegeum', role: 'melody', volume: 0.7 },
  ]);
});

function createWork(
  id: string,
  input: {
    instrument: 'gayageum' | 'daegeum' | 'janggu';
    events: PerformanceEvent[];
  },
): Work {
  return {
    id,
    title: 'My Work',
    createdAt: '2026-06-26T00:00:00.000Z',
    updatedAt: '2026-06-26T00:00:00.000Z',
    source: 'free_creation',
    syncState: 'local_only',
    tracks: [
      {
        id: 'track-1',
        kind: 'instrument',
        instrument: input.instrument,
        startedAtBeat: 1,
        volume: 1,
        mute: false,
        solo: false,
        createdAt: '2026-06-26T00:00:00.000Z',
        takes: [
          {
            id: 'take-1',
            events: input.events,
            startedAtBeat: 1,
            durationBeats: 8,
            recordingSetup: {
              presetId: 'semachi',
              bpm: 84,
              beatUnit: '4/4',
            },
          },
        ],
      },
    ],
  };
}

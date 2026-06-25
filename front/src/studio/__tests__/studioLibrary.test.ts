import { expect, test } from 'vitest';
import {
  addAccompanimentTrack,
  addInstrumentTrack,
  autoSaveTakeAsWork,
  createPracticeResult,
  exportWorkAudioPlaceholder,
  isWorkShareable,
  mergeAccountLibraryPreview,
  selectLibrarySections,
  toggleWorkTrackMute,
  toggleWorkTrackSolo,
} from '../studioLibrary';

const pluck = {
  type: 'string_pluck',
  tsMs: 100,
  stringIndex: 1,
  velocity: 1,
} as const;

test('auto-saves a free-play take as an editable work that is not directly shareable', () => {
  const work = autoSaveTakeAsWork({
    workId: 'work-1',
    trackId: 'track-1',
    takeId: 'take-1',
    title: '가야금 첫 작업',
    instrument: 'gayageum',
    events: [pluck],
    createdAt: '2026-06-18T00:00:00.000Z',
    startedAtBeat: 1,
    durationBeats: 4,
    liveJangdanGuide: {
      presetId: 'semachi',
      bpm: 84,
      volume: 0.6,
      startedAtBeat: 1,
    },
  });

  expect(work.tracks).toHaveLength(1);
  expect(work.tracks[0]).toMatchObject({
    id: 'track-1',
    kind: 'instrument',
    instrument: 'gayageum',
    startedAtBeat: 1,
  });
  expect(work.tracks[0].kind === 'instrument' ? work.tracks[0].takes[0].liveJangdanGuide : undefined).toEqual({
    presetId: 'semachi',
    bpm: 84,
    volume: 0.6,
    startedAtBeat: 1,
  });
  expect(isWorkShareable(work)).toBe(false);
});

test('adds an instrument track at the playhead or falls back to the first beat', () => {
  const work = autoSaveTakeAsWork({
    workId: 'work-1',
    trackId: 'track-1',
    takeId: 'take-1',
    title: '레이어 작업',
    instrument: 'gayageum',
    events: [pluck],
    createdAt: '2026-06-18T00:00:00.000Z',
    startedAtBeat: 1,
    durationBeats: 4,
  });

  const withPlayhead = addInstrumentTrack(work, {
    trackId: 'track-2',
    takeId: 'take-2',
    instrument: 'janggu',
    events: [],
    createdAt: '2026-06-18T00:01:00.000Z',
    playheadBeat: 9,
    durationBeats: 2,
  });

  const withoutPlayhead = addInstrumentTrack(work, {
    trackId: 'track-3',
    takeId: 'take-3',
    instrument: 'daegeum',
    events: [],
    createdAt: '2026-06-18T00:02:00.000Z',
    durationBeats: 2,
  });

  expect(withPlayhead.tracks[1]).toMatchObject({
    id: 'track-2',
    instrument: 'janggu',
    startedAtBeat: 9,
  });
  expect(withoutPlayhead.tracks[1]).toMatchObject({
    id: 'track-3',
    instrument: 'daegeum',
    startedAtBeat: 1,
  });
});

test('adds accompaniment as a track without replacing existing instrument layers', () => {
  const work = autoSaveTakeAsWork({
    workId: 'work-1',
    trackId: 'track-1',
    takeId: 'take-1',
    title: '장단 작업',
    instrument: 'gayageum',
    events: [pluck],
    createdAt: '2026-06-18T00:00:00.000Z',
    startedAtBeat: 1,
    durationBeats: 4,
  });

  const next = addAccompanimentTrack(work, {
    trackId: 'track-2',
    presetId: 'semachi',
    bpm: 84,
    volume: 0.7,
    createdAt: '2026-06-18T00:03:00.000Z',
    playheadBeat: 5,
  });

  expect(next.tracks).toHaveLength(2);
  expect(next.tracks[1]).toMatchObject({
    id: 'track-2',
    kind: 'accompaniment',
    presetId: 'semachi',
    bpm: 84,
    volume: 0.7,
    startedAtBeat: 5,
  });
});

test('separates editable works from exported audio and practice results in the library', () => {
  const work = autoSaveTakeAsWork({
    workId: 'work-1',
    trackId: 'track-1',
    takeId: 'take-1',
    title: '보관함 작업',
    instrument: 'gayageum',
    events: [pluck],
    createdAt: '2026-06-18T00:00:00.000Z',
    startedAtBeat: 1,
    durationBeats: 4,
  });
  const exported = exportWorkAudioPlaceholder({
    id: 'export-1',
    work,
    title: '내보낸 보관함 작업',
    audioUri: 'placeholder://export-1.wav',
    durationSeconds: 24,
    createdAt: '2026-06-18T00:05:00.000Z',
  });
  const practiceResult = createPracticeResult({
    id: 'practice-1',
    songId: 'arirang',
    instrument: 'daegeum',
    accuracyScore: 82,
    timingScore: 78,
    feedback: '박자 흐름이 안정적이에요.',
    createdAt: '2026-06-18T00:06:00.000Z',
  });

  const sections = selectLibrarySections({
    works: [work],
    exportedAudios: [exported],
    practiceResults: [practiceResult],
  });

  expect(sections.works.map((item) => item.id)).toEqual(['work-1']);
  expect(sections.shareables.map((item) => item.id)).toEqual(['export-1', 'practice-1']);
  expect(exported.shareState).toBe('ready');
  expect(practiceResult.shareState).toBe('ready');
});

test('previews account sync without deleting local library items', () => {
  const localWork = autoSaveTakeAsWork({
    workId: 'work-1',
    trackId: 'track-1',
    takeId: 'take-1',
    title: '로컬 작업',
    instrument: 'gayageum',
    events: [pluck],
    createdAt: '2026-06-18T00:00:00.000Z',
    startedAtBeat: 1,
    durationBeats: 4,
  });
  const accountWork = autoSaveTakeAsWork({
    workId: 'work-1',
    trackId: 'track-account',
    takeId: 'take-account',
    title: '계정 작업',
    instrument: 'janggu',
    events: [],
    createdAt: '2026-06-17T00:00:00.000Z',
    startedAtBeat: 1,
    durationBeats: 4,
  });

  const preview = mergeAccountLibraryPreview({
    localWorks: [localWork],
    accountWorks: [accountWork],
  });

  expect(preview.localPreserved).toBe(true);
  expect(preview.conflictWorkIds).toEqual(['work-1']);
  expect(preview.mergedWorkCount).toBe(2);
});

test('toggles a track mute state without changing the other layers', () => {
  const work = autoSaveTakeAsWork({
    workId: 'work-1',
    trackId: 'track-1',
    takeId: 'take-1',
    title: '뮤트 작업',
    instrument: 'gayageum',
    events: [pluck],
    createdAt: '2026-06-18T00:00:00.000Z',
    startedAtBeat: 1,
    durationBeats: 4,
  });
  const layered = addAccompanimentTrack(work, {
    trackId: 'track-2',
    presetId: 'semachi',
    bpm: 84,
    volume: 0.7,
    createdAt: '2026-06-18T00:01:00.000Z',
  });

  const muted = toggleWorkTrackMute(layered, {
    trackId: 'track-2',
    updatedAt: '2026-06-18T00:02:00.000Z',
  });
  const unmuted = toggleWorkTrackMute(muted, {
    trackId: 'track-2',
    updatedAt: '2026-06-18T00:03:00.000Z',
  });

  expect(muted.updatedAt).toBe('2026-06-18T00:02:00.000Z');
  expect(muted.tracks.map((track) => track.mute)).toEqual([false, true]);
  expect(unmuted.updatedAt).toBe('2026-06-18T00:03:00.000Z');
  expect(unmuted.tracks.map((track) => track.mute)).toEqual([false, false]);
});

test('toggles one solo layer at a time in the track editor model', () => {
  const work = autoSaveTakeAsWork({
    workId: 'work-1',
    trackId: 'track-1',
    takeId: 'take-1',
    title: '솔로 작업',
    instrument: 'gayageum',
    events: [pluck],
    createdAt: '2026-06-18T00:00:00.000Z',
    startedAtBeat: 1,
    durationBeats: 4,
  });
  const layered = addAccompanimentTrack(work, {
    trackId: 'track-2',
    presetId: 'semachi',
    bpm: 84,
    volume: 0.7,
    createdAt: '2026-06-18T00:01:00.000Z',
  });

  const firstSolo = toggleWorkTrackSolo(layered, {
    trackId: 'track-1',
    updatedAt: '2026-06-18T00:02:00.000Z',
  });
  const secondSolo = toggleWorkTrackSolo(firstSolo, {
    trackId: 'track-2',
    updatedAt: '2026-06-18T00:03:00.000Z',
  });
  const cleared = toggleWorkTrackSolo(secondSolo, {
    trackId: 'track-2',
    updatedAt: '2026-06-18T00:04:00.000Z',
  });

  expect(firstSolo.tracks.map((track) => track.solo)).toEqual([true, false]);
  expect(secondSolo.tracks.map((track) => track.solo)).toEqual([false, true]);
  expect(cleared.tracks.map((track) => track.solo)).toEqual([false, false]);
});

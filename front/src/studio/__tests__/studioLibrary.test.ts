import { expect, test } from 'vitest';
import {
  addAccompanimentTrack,
  addInstrumentTrack,
  autoSaveTakeAsWork,
  countWorkMixPlanInstrumentEvents,
  createWorkMixPlan,
  createPracticeResult,
  exportWorkAudioPlaceholder,
  isWorkShareable,
  mergeAccountLibraryPreview,
  selectLibrarySections,
  toggleWorkTrackMute,
  toggleWorkTrackSolo,
} from '../studioLibrary';
import type { Work } from '../studioTypes';

const pluck = {
  type: 'string_pluck',
  tsMs: 100,
  stringIndex: 1,
  velocity: 1,
} as const;

test('auto-saves a free-play take as an editable shareable work', () => {
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
  expect(isWorkShareable(work)).toBe(true);
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
    instrumentSettings: {
      '타격 민감도': '높음',
      '타격면 표시': '켬',
      '기본 음색': '기본',
    },
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
  expect(withPlayhead.tracks[1].kind === 'instrument' ? withPlayhead.tracks[1].takes[0].instrumentSettings : undefined).toEqual({
    '타격 민감도': '높음',
    '타격면 표시': '켬',
    '기본 음색': '기본',
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
    audioUri: 'pending://export-1.wav',
    durationSeconds: 18,
    createdAt: '2026-06-18T00:05:00.000Z',
  });
  const practiceResult = createPracticeResult({
    id: 'practice-1',
    songId: 'arirang',
    instrument: 'daegeum',
    accuracyScore: 73,
    timingScore: 69,
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

test('exports a reference-only remix work with shared recording provenance', () => {
  const work: Work = {
    id: 'work-remix',
    title: '아침의 아리랑 리믹스',
    createdAt: '2026-06-18T00:00:00.000Z',
    updatedAt: '2026-06-18T00:00:00.000Z',
    source: 'remix',
    syncState: 'local_only',
    tracks: [
      {
        id: 'track-reference',
        kind: 'reference',
        sourceShareId: 'shared-morning-arirang',
        title: '아침의 아리랑',
        authorDisplayName: 'Minsu_Kim',
        sourceLabel: '공유 피드 데모',
        volume: 0.8,
        mute: false,
        solo: false,
        startedAtBeat: 1,
        createdAt: '2026-06-18T00:00:00.000Z',
      },
    ],
  };

  const exported = exportWorkAudioPlaceholder({
    id: 'export-remix',
    work,
    title: '아침의 아리랑 리믹스 내보내기',
    audioUri: 'placeholder://export-remix.wav',
    durationSeconds: 24,
    createdAt: '2026-06-18T00:05:00.000Z',
  });

  expect(exported).toMatchObject({
    id: 'export-remix',
    workId: 'work-remix',
    instrumentNames: ['참조: 아침의 아리랑'],
    sourceShareId: 'shared-morning-arirang',
    authorDisplayName: 'Minsu_Kim',
    sourceLabel: '공유 피드 데모',
  });
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

test('creates a work mix plan sorted by start beat with track volume', () => {
  const work = autoSaveTakeAsWork({
    workId: 'work-1',
    trackId: 'track-1',
    takeId: 'take-1',
    title: '믹스 플랜 작업',
    instrument: 'gayageum',
    events: [pluck],
    createdAt: '2026-06-18T00:00:00.000Z',
    startedAtBeat: 1,
    durationBeats: 4,
  });
  const withAccompaniment = addAccompanimentTrack(work, {
    trackId: 'track-2',
    presetId: 'semachi',
    bpm: 84,
    volume: 0.6,
    createdAt: '2026-06-18T00:01:00.000Z',
    playheadBeat: 5,
  });
  const layered = addInstrumentTrack(withAccompaniment, {
    trackId: 'track-3',
    takeId: 'take-3',
    instrument: 'daegeum',
    events: [],
    createdAt: '2026-06-18T00:02:00.000Z',
    durationBeats: 2,
    playheadBeat: 3,
  });

  expect(createWorkMixPlan(layered)).toEqual({
    workId: 'work-1',
    title: '믹스 플랜 작업',
    hasSoloTracks: false,
    tracks: [
      { trackId: 'track-1', kind: 'instrument', startedAtBeat: 1, volume: 1 },
      { trackId: 'track-3', kind: 'instrument', startedAtBeat: 3, volume: 1 },
      { trackId: 'track-2', kind: 'accompaniment', startedAtBeat: 5, volume: 0.6 },
    ],
  });
});

test('treats zero-volume selected tracks as inaudible in the work mix plan', () => {
  const work = autoSaveTakeAsWork({
    workId: 'work-zero-volume',
    trackId: 'track-1',
    takeId: 'take-1',
    title: 'zero volume mix',
    instrument: 'gayageum',
    events: [pluck],
    createdAt: '2026-06-18T00:00:00.000Z',
    startedAtBeat: 1,
    durationBeats: 4,
  });
  const layered = addInstrumentTrack(work, {
    trackId: 'track-2',
    takeId: 'take-2',
    instrument: 'janggu',
    events: [pluck],
    createdAt: '2026-06-18T00:01:00.000Z',
    durationBeats: 4,
    playheadBeat: 2,
  });
  const zeroVolumeFirstTrack: Work = {
    ...layered,
    tracks: layered.tracks.map((track) =>
      track.id === 'track-1' ? { ...track, volume: 0 } : track,
    ),
  };

  expect(createWorkMixPlan(zeroVolumeFirstTrack)).toMatchObject({
    workId: 'work-zero-volume',
    hasSoloTracks: false,
    tracks: [
      { trackId: 'track-2', kind: 'instrument', startedAtBeat: 2, volume: 1 },
    ],
  });
  expect(countWorkMixPlanInstrumentEvents(zeroVolumeFirstTrack)).toBe(1);

  const silentSoloWork: Work = {
    ...layered,
    tracks: layered.tracks.map((track) =>
      track.id === 'track-1'
        ? { ...track, solo: true, volume: 0 }
        : { ...track, solo: false, volume: 1 },
    ),
  };

  expect(createWorkMixPlan(silentSoloWork)).toMatchObject({
    workId: 'work-zero-volume',
    hasSoloTracks: true,
    tracks: [],
  });
  expect(countWorkMixPlanInstrumentEvents(silentSoloWork)).toBe(0);
});

test('creates a work mix plan from unmuted solo tracks when solo is active', () => {
  const work = autoSaveTakeAsWork({
    workId: 'work-1',
    trackId: 'track-1',
    takeId: 'take-1',
    title: '솔로 믹스 작업',
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
    volume: 0.6,
    createdAt: '2026-06-18T00:01:00.000Z',
    playheadBeat: 1,
  });
  const muted = toggleWorkTrackMute(layered, {
    trackId: 'track-1',
    updatedAt: '2026-06-18T00:02:00.000Z',
  });
  const soloed = toggleWorkTrackSolo(muted, {
    trackId: 'track-2',
    updatedAt: '2026-06-18T00:03:00.000Z',
  });

  expect(createWorkMixPlan(soloed)).toEqual({
    workId: 'work-1',
    title: '솔로 믹스 작업',
    hasSoloTracks: true,
    tracks: [
      { trackId: 'track-2', kind: 'accompaniment', startedAtBeat: 1, volume: 0.6 },
    ],
  });
});

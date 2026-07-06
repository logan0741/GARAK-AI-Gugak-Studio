import { readFileSync, statSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  createDemoLibraryAudioUri,
  createLocalExportAudioUri,
  createPracticeResultLibraryAudioUri,
  createSharedRecordingLibraryAudioUri,
  isPlayableExportedAudioForPlayback,
  isPlayableExportedAudioUri,
  resolveLibraryPlaybackBundledAudioAssetPath,
} from '../libraryPlaybackAudio';
import type { ExportedAudio, Work } from '../../studio/studioTypes';

test('maps every demo library fixture title to a bundled playback asset', () => {
  const fixtureTitles = [
    'My Arirang',
    'Falling water in a valley',
    'Forest Birds singing',
    'sea waves',
  ];

  for (const title of fixtureTitles) {
    const audioUri = createDemoLibraryAudioUri(title);

    expectBundledWav(resolveLibraryPlaybackBundledAudioAssetPath(audioUri));
  }
});

test('maps presentation demo playback paths to audible-length bundled audio', () => {
  const playbackUris = [
    createDemoLibraryAudioUri('My Arirang'),
    createDemoLibraryAudioUri('Falling water in a valley'),
    createSharedRecordingLibraryAudioUri({
      id: 'shared-janggu',
      title: 'K-pop Demon Hunters',
      authorDisplayName: 'Kpop_Garak',
      sourceLabel: 'shared feed demo',
      instrument: 'janggu',
      durationSeconds: 64,
      audioUri: 'placeholder://recent-kpop-demon-hunters.wav',
      remixable: true,
    }),
    createLocalExportAudioUri(),
  ];

  for (const audioUri of playbackUris) {
    const assetPath = resolveLibraryPlaybackBundledAudioAssetPath(audioUri);

    expectBundledWav(assetPath);
    expect(getWavDurationSeconds(assetPath as string)).toBeGreaterThanOrEqual(10);
  }
});

test('maps placeholder shared recordings to bundled playback assets', () => {
  const sharedRecordingUris = [
    createSharedRecordingLibraryAudioUri({
      id: 'shared-janggu',
      title: 'K-pop Demon Hunters',
      authorDisplayName: 'Kpop_Garak',
      sourceLabel: 'shared feed demo',
      instrument: 'janggu',
      durationSeconds: 64,
      audioUri: 'placeholder://recent-kpop-demon-hunters.wav',
      remixable: true,
    }),
    createSharedRecordingLibraryAudioUri({
      id: 'shared-daegeum',
      title: 'K-Drama OST',
      authorDisplayName: 'Drama_Garak',
      sourceLabel: 'shared feed demo',
      instrument: 'daegeum',
      durationSeconds: 57,
      audioUri: 'placeholder://recent-kdrama-ost.wav',
      remixable: true,
    }),
    createSharedRecordingLibraryAudioUri({
      id: 'shared-uppercase-placeholder',
      title: 'Uppercase Placeholder Demo',
      authorDisplayName: 'Demo_Garak',
      sourceLabel: 'shared feed demo',
      instrument: 'janggu',
      durationSeconds: 42,
      audioUri: ' PLACEHOLDER://recent-uppercase-placeholder.wav ',
      remixable: true,
    }),
  ];

  for (const audioUri of sharedRecordingUris) {
    expect(audioUri.toLowerCase()).not.toMatch(/^placeholder:\/\//);
    expectBundledWav(resolveLibraryPlaybackBundledAudioAssetPath(audioUri));
  }
});

test('maps export and practice-result fallback audio to bundled playback assets', () => {
  const exportFallbackUri = createLocalExportAudioUri();
  const jangguPracticeUri = createPracticeResultLibraryAudioUri({
    id: 'practice-1',
    kind: 'practice_result',
    songId: 'arirang',
    instrument: 'janggu',
    accuracyScore: 82,
    timingScore: 76,
    feedback: 'steady rhythm',
    createdAt: '2026-07-04T00:00:00.000Z',
    shareState: 'ready',
  });
  const daegeumPracticeUri = createPracticeResultLibraryAudioUri({
    id: 'practice-2',
    kind: 'practice_result',
    songId: 'doraji',
    instrument: 'daegeum',
    accuracyScore: 88,
    timingScore: 81,
    feedback: 'clear tone',
    createdAt: '2026-07-04T00:00:00.000Z',
    shareState: 'ready',
  });

  for (const audioUri of [exportFallbackUri, jangguPracticeUri, daegeumPracticeUri]) {
    expectBundledWav(resolveLibraryPlaybackBundledAudioAssetPath(audioUri));
  }
});

test('classifies legacy placeholder export URIs as non-playable exported audio', () => {
  expect(isPlayableExportedAudioUri('file://garak/export-1.wav')).toBe(true);
  expect(isPlayableExportedAudioUri(' garak://library-demo/export-fallback ')).toBe(true);
  expect(isPlayableExportedAudioUri('')).toBe(false);
  expect(isPlayableExportedAudioUri(' placeholder://export-1.wav ')).toBe(false);
  expect(isPlayableExportedAudioUri('PLACEHOLDER://export-1.wav')).toBe(false);
});

test('requires event-replay exports to keep a source work and take for playback', () => {
  const sourceWork = createPlaybackWork();
  const eventReplayExport = createExportedAudio({
    workId: ' work-1 ',
    renderKind: 'event_replay',
    sourceTakeId: ' take-1 ',
  });

  expect(isPlayableExportedAudioForPlayback([sourceWork], eventReplayExport)).toBe(false);
  expect(
    isPlayableExportedAudioForPlayback(
      [sourceWork],
      createExportedAudio({
        workId: ' work-1 ',
        renderKind: 'event_replay',
        sourceTakeId: ' take-1 ',
        sourceEventCount: 1,
      }),
    ),
  ).toBe(true);
  expect(isPlayableExportedAudioForPlayback([], eventReplayExport)).toBe(false);
  expect(
    isPlayableExportedAudioForPlayback(
      [sourceWork],
      createExportedAudio({
        workId: 'work-1',
        renderKind: 'event_replay',
        sourceTakeId: 'missing-take',
      }),
    ),
  ).toBe(false);
  expect(
    isPlayableExportedAudioForPlayback(
      [sourceWork],
      createExportedAudio({
        workId: 'work-1',
        renderKind: 'event_replay',
        sourceTakeId: 'take-1',
        audioUri: 'placeholder://export-1.wav',
      }),
    ),
  ).toBe(false);
  expect(
    isPlayableExportedAudioForPlayback(
      [createPlaybackWorkWithEmptySourceTake()],
      createExportedAudio({
        workId: 'work-1',
        renderKind: 'event_replay',
        sourceTakeId: 'take-empty',
      }),
    ),
  ).toBe(false);
  expect(
    isPlayableExportedAudioForPlayback(
      [createPlaybackWorkWithMutedSourceAndAudibleTrack()],
      createExportedAudio({
        workId: 'work-1',
        renderKind: 'event_replay',
        sourceTakeId: 'take-muted',
      }),
    ),
  ).toBe(false);
  expect(
    isPlayableExportedAudioForPlayback(
      [sourceWork],
      createExportedAudio({
        workId: 'work-1',
        renderKind: 'event_replay',
        sourceTakeId: 'take-1',
        sourceEventCount: 1,
      }),
    ),
  ).toBe(true);
  expect(
    isPlayableExportedAudioForPlayback(
      [sourceWork],
      createExportedAudio({
        workId: 'work-1',
        renderKind: 'event_replay',
        sourceTakeId: 'take-1',
        sourceEventCount: 2,
      }),
    ),
  ).toBe(false);
  expect(isPlayableExportedAudioForPlayback([], createExportedAudio())).toBe(true);
});

test('requires audio-capture exports to keep file-backed capture provenance for playback', () => {
  expect(
    isPlayableExportedAudioForPlayback(
      [createCapturedPlaybackWork('file://garak/takes/take-1.m4a')],
      createExportedAudio({
        audioUri: 'file://garak/takes/take-1.m4a',
        renderKind: 'audio_capture',
        sourceTakeId: 'take-1',
        sourceRecordingUri: 'file://garak/takes/take-1.m4a',
      }),
    ),
  ).toBe(true);
  expect(
    isPlayableExportedAudioForPlayback(
      [createCapturedPlaybackWork('content://garak/takes/take-1.m4a')],
      createExportedAudio({
        audioUri: 'content://garak/exports/export-1.m4a',
        renderKind: 'audio_capture',
        sourceTakeId: 'take-1',
        sourceRecordingUri: 'content://garak/takes/take-1.m4a',
      }),
    ),
  ).toBe(true);
  expect(
    isPlayableExportedAudioForPlayback(
      [],
      createExportedAudio({
        audioUri: 'file://garak/takes/take-1.m4a',
        renderKind: 'audio_capture',
        sourceTakeId: 'take-1',
        sourceRecordingUri: 'file://garak/takes/take-1.m4a',
      }),
    ),
  ).toBe(false);
  expect(
    isPlayableExportedAudioForPlayback(
      [createCapturedPlaybackWork('file://garak/takes/take-1.m4a')],
      createExportedAudio({
        audioUri: 'garak://library-demo/export-fallback',
        renderKind: 'audio_capture',
        sourceTakeId: 'take-1',
        sourceRecordingUri: 'garak://library-demo/export-fallback',
      }),
    ),
  ).toBe(false);
  expect(
    isPlayableExportedAudioForPlayback(
      [createCapturedPlaybackWork('file://garak/takes/take-1.m4a')],
      createExportedAudio({
        audioUri: 'file://garak/takes/take-1.m4a',
        renderKind: 'audio_capture',
      }),
    ),
  ).toBe(false);
  expect(
    isPlayableExportedAudioForPlayback(
      [createCapturedPlaybackWork('file://garak/takes/take-1.m4a')],
      createExportedAudio({
        audioUri: 'file://garak/takes/take-1.m4a',
        renderKind: 'audio_capture',
        sourceRecordingUri: 'file://garak/takes/take-1.m4a',
      }),
    ),
  ).toBe(false);
  expect(
    isPlayableExportedAudioForPlayback(
      [createCapturedPlaybackWork('file://garak/takes/take-1.m4a')],
      createExportedAudio({
        audioUri: 'file://garak/exports/export-1.m4a',
        renderKind: 'audio_capture',
        sourceTakeId: 'take-1',
        sourceRecordingUri: 'file://garak/takes/other.m4a',
      }),
    ),
  ).toBe(false);
  expect(
    isPlayableExportedAudioForPlayback(
      [createCapturedPlaybackWork('file://garak/takes/take-1.m4a', { mute: true })],
      createExportedAudio({
        audioUri: 'file://garak/exports/export-1.m4a',
        renderKind: 'audio_capture',
        sourceTakeId: 'take-1',
        sourceRecordingUri: 'file://garak/takes/take-1.m4a',
      }),
    ),
  ).toBe(false);
});

test('requires event-replay exports to keep the recorded source mix event count', () => {
  const sourceWork = createLayeredPlaybackWork(1);

  expect(
    isPlayableExportedAudioForPlayback(
      [sourceWork],
      createExportedAudio({
        workId: 'work-1',
        renderKind: 'event_replay',
        sourceTakeId: 'take-1',
        sourceEventCount: 2,
      }),
    ),
  ).toBe(true);
  expect(
    isPlayableExportedAudioForPlayback(
      [createLayeredPlaybackWork(2)],
      createExportedAudio({
        workId: 'work-1',
        renderKind: 'event_replay',
        sourceTakeId: 'take-1',
        sourceEventCount: 2,
      }),
    ),
  ).toBe(false);
});

function expectBundledWav(assetPath: string | undefined) {
  expect(assetPath).toBeDefined();

  const header = readFileSync(assetPath as string).subarray(0, 12).toString('ascii');

  expect(statSync(assetPath as string).size).toBeGreaterThan(44);
  expect(header.slice(0, 4)).toBe('RIFF');
  expect(header.slice(8, 12)).toBe('WAVE');
}

function getWavDurationSeconds(assetPath: string): number {
  const data = readFileSync(assetPath);
  const dataChunkIndex = data.indexOf(Buffer.from('data'));

  expect(dataChunkIndex).toBeGreaterThanOrEqual(0);

  const byteRate = data.readUInt32LE(28);
  const dataSize = data.readUInt32LE(dataChunkIndex + 4);

  return dataSize / byteRate;
}

function createPlaybackWork(): Work {
  return {
    id: 'work-1',
    title: 'Source Work',
    createdAt: '2026-07-04T00:00:00.000Z',
    updatedAt: '2026-07-04T00:00:00.000Z',
    source: 'free_creation',
    syncState: 'local_only',
    tracks: [
      {
        id: 'track-1',
        kind: 'instrument',
        instrument: 'janggu',
        startedAtBeat: 1,
        volume: 1,
        mute: false,
        solo: false,
        createdAt: '2026-07-04T00:00:00.000Z',
        takes: [
          {
            id: 'take-1',
            events: [{ type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 }],
            startedAtBeat: 1,
            durationBeats: 4,
          },
        ],
      },
    ],
  };
}

function createCapturedPlaybackWork(
  recordingUri: string,
  options: { mute?: boolean; volume?: number } = {},
): Work {
  const work = createPlaybackWork();
  const baseTrack = work.tracks[0];
  if (baseTrack === undefined || baseTrack.kind !== 'instrument') {
    throw new Error('Expected createPlaybackWork to start with an instrument track.');
  }

  return {
    ...work,
    tracks: [
      {
        ...baseTrack,
        mute: options.mute ?? baseTrack.mute,
        volume: options.volume ?? baseTrack.volume,
        takes: baseTrack.takes.map((take) =>
          take.id === 'take-1' ? { ...take, recordingUri } : take,
        ),
      },
    ],
  };
}

function createLayeredPlaybackWork(secondTrackEventCount: number): Work {
  const work = createPlaybackWork();
  const baseTrack = work.tracks[0];
  if (baseTrack === undefined || baseTrack.kind !== 'instrument') {
    throw new Error('Expected createPlaybackWork to start with an instrument track.');
  }

  return {
    ...work,
    tracks: [
      baseTrack,
      {
        ...baseTrack,
        id: 'track-2',
        instrument: 'gayageum',
        takes: [
          {
            id: 'take-2',
            events: Array.from({ length: secondTrackEventCount }, (_, index) => ({
              type: 'string_pluck' as const,
              tsMs: 180 + index * 80,
              stringIndex: 5,
              velocity: 0.7,
            })),
            startedAtBeat: 1,
            durationBeats: 4,
          },
        ],
      },
    ],
  };
}

function createPlaybackWorkWithEmptySourceTake(): Work {
  const work = createPlaybackWork();
  const baseTrack = work.tracks[0];
  if (baseTrack === undefined || baseTrack.kind !== 'instrument') {
    throw new Error('Expected createPlaybackWork to start with an instrument track.');
  }

  return {
    ...work,
    tracks: [
      {
        ...baseTrack,
        takes: [
          {
            id: 'take-empty',
            events: [],
            startedAtBeat: 1,
            durationBeats: 4,
          },
        ],
      },
    ],
  };
}

function createPlaybackWorkWithMutedSourceAndAudibleTrack(): Work {
  const work = createPlaybackWork();
  const baseTrack = work.tracks[0];
  if (baseTrack === undefined || baseTrack.kind !== 'instrument') {
    throw new Error('Expected createPlaybackWork to start with an instrument track.');
  }

  return {
    ...work,
    tracks: [
      {
        ...baseTrack,
        id: 'track-muted',
        mute: true,
        takes: [
          {
            id: 'take-muted',
            events: [{ type: 'string_pluck', tsMs: 120, stringIndex: 3, velocity: 0.8 }],
            startedAtBeat: 1,
            durationBeats: 4,
          },
        ],
      },
      {
        ...baseTrack,
        id: 'track-audible',
        mute: false,
        takes: [
          {
            id: 'take-audible',
            events: [{ type: 'string_pluck', tsMs: 160, stringIndex: 4, velocity: 0.8 }],
            startedAtBeat: 1,
            durationBeats: 4,
          },
        ],
      },
    ],
  };
}

function createExportedAudio(overrides: Partial<ExportedAudio> = {}): ExportedAudio {
  return {
    id: 'export-1',
    kind: 'exported_audio',
    workId: 'work-1',
    title: 'Exported Audio',
    durationSeconds: 12,
    instrumentNames: ['Janggu'],
    createdAt: '2026-07-04T00:00:00.000Z',
    audioUri: 'garak://library-demo/export-fallback',
    shareState: 'ready',
    ...overrides,
  };
}

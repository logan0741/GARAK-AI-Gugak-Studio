import { expect, test } from 'vitest';
import { applyProductAction, createInitialGarakProductState } from '../garakProductState';
import {
  getMyLibraryItemAction,
  getMyLibraryPlayerViewModel,
  getMyLibraryViewModel,
} from '../libraryScreenModel';

test('uses the Figma my-screen demo library when there are no saved items', () => {
  const model = getMyLibraryViewModel(createInitialGarakProductState());

  expect(model.heroCards.map((card) => card.title)).toEqual([
    'K-Drama OST',
    'K-pop Demon Hunters',
    'Korea Minyo',
  ]);
  expect(model.heroCards[2]).toMatchObject({
    date: '2026.02.01',
    playable: true,
    tone: 'navy',
  });
  expect(model.playlistRows.map((row) => row.title)).toEqual([
    'My Arirang',
    'Falling water in a valley',
    'Forest Birds singing',
    'sea waves',
    'sea waves',
  ]);
  expect(model.playlistRows[0]).toMatchObject({
    active: true,
    kind: 'demo',
    playable: true,
  });
});

test('puts saved works and exports before the demo playlist rows', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'completePerformance' });
  state = applyProductAction(state, { type: 'exportCurrentWork' });

  const model = getMyLibraryViewModel(state);

  expect(model.heroCards[2]).toMatchObject({
    date: '2026.06.18',
    playable: true,
    tone: 'navy',
    workId: 'work-1',
  });
  expect(model.playlistRows[0]).toMatchObject({
    active: true,
    date: '2026.06.18',
    kind: 'work',
    playable: true,
    workId: 'work-1',
  });
  expect(model.playlistRows[1]).toMatchObject({
    exportedAudioId: 'export-1',
    kind: 'exportedAudio',
    playable: true,
  });
  expect(model.playlistRows[2]).toMatchObject({
    kind: 'demo',
    title: 'My Arirang',
  });
});

test('routes library work rows to editing and shareable rows to the player', () => {
  expect(
    getMyLibraryItemAction({
      id: 'work-work-1',
      title: '가야금 작업 1',
      date: '2026.06.18',
      kind: 'work',
      playable: true,
      active: false,
      workId: 'work-1',
    }),
  ).toEqual({ type: 'openWork', workId: 'work-1' });

  expect(
    getMyLibraryItemAction({
      id: 'export-export-1',
      title: '가야금 작업 1 내보내기',
      date: '2026.06.18',
      kind: 'exportedAudio',
      playable: true,
      active: false,
      exportedAudioId: 'export-1',
    }),
  ).toEqual({
    type: 'playLibraryItem',
    item: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
  });

  expect(
    getMyLibraryItemAction({
      id: 'demo-my-arirang',
      title: 'My Arirang',
      date: '2026.06.01',
      kind: 'demo',
      playable: true,
      active: false,
    }),
  ).toEqual({
    type: 'playLibraryItem',
    item: { kind: 'demo', title: 'My Arirang', date: '2026.06.01' },
  });
});

test('builds the player detail from the selected my-library item', () => {
  let state = createInitialGarakProductState({
    now: () => '2026-06-18T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'completePerformance' });
  state = applyProductAction(state, { type: 'exportCurrentWork' });

  state = applyProductAction(state, {
    type: 'playLibraryItem',
    item: { kind: 'work', workId: 'work-1' },
  });
  expect(getMyLibraryPlayerViewModel(state)).toMatchObject({
    editWorkId: 'work-1',
    elapsedLabel: '0:13',
    remainingLabel: '-3:01',
    showsAirPlay: true,
    sourceKind: 'work',
    title: state.library.works[0].title,
  });

  state = applyProductAction(state, {
    type: 'playLibraryItem',
    item: { kind: 'exportedAudio', exportedAudioId: 'export-1' },
  });
  expect(getMyLibraryPlayerViewModel(state)).toMatchObject({
    editWorkId: 'work-1',
    sourceKind: 'exportedAudio',
    title: state.library.exportedAudios[0].title,
  });
});

import { expect, test } from 'vitest';
import { PerformanceEvent } from '../../domain/performanceEvent';
import { getJangdanPresetPanelModel } from '../jangdanPresetPanelModel';
import { JANGDAN_PRESETS } from '../productFixtures';
import { applyProductAction, createInitialGarakProductState } from '../garakProductState';

function plucks(tsValues: number[]): PerformanceEvent[] {
  return tsValues.map((tsMs, index) => ({
    type: 'string_pluck',
    tsMs,
    stringIndex: (index % 12) + 1,
    velocity: 1,
  }));
}

function createWorkState(events: PerformanceEvent[]) {
  let state = createInitialGarakProductState({
    now: () => '2026-06-24T00:00:00.000Z',
  });

  state = applyProductAction(state, { type: 'selectMode', mode: 'freeCreation' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'selectInstrument', instrument: 'gayageum' });
  state = applyProductAction(state, { type: 'next' });
  state = applyProductAction(state, { type: 'startWithDefaults' });
  state = applyProductAction(state, { type: 'startPerformanceRecording' });
  state = applyProductAction(state, { type: 'appendFreePlayPerformanceEvents', events });
  state = applyProductAction(state, { type: 'completePerformance' });
  state = applyProductAction(state, { type: 'addTrack' });
  state = applyProductAction(state, { type: 'chooseAccompanimentTrack' });

  return state;
}

test('models S10B recommendation from current work events with manual fallback preserved', () => {
  const readyModel = getJangdanPresetPanelModel(
    createWorkState(plucks([0, 650, 1300, 1950, 2600])),
    'track',
  );

  expect(readyModel.recommendationStatus).toBe('ready');
  expect(readyModel.recommendedPreset?.id).toBe('semachi');
  expect(readyModel.miniPlayerTitle).toBe('AI 추천: 세마치');
  expect(readyModel.workContextLabel).toBe('현재 작업 · 가야금 작업 1');
  expect(readyModel.acceptedPreset.id).toBe('semachi');
  expect(readyModel.acceptedPreset.defaultBpm).toBe(84);
  expect(readyModel.manualPresets.map((preset) => preset.id)).toEqual(
    JANGDAN_PRESETS.map((preset) => preset.id),
  );

  const fallbackModel = getJangdanPresetPanelModel(createWorkState([]), 'track');

  expect(fallbackModel.recommendationStatus).toBe('insufficient-data');
  expect(fallbackModel.recommendationMessage).toBe('추천을 만들려면 먼저 연주 트랙이 필요해요.');
  expect(fallbackModel.recommendedPreset).toBeUndefined();
  expect(fallbackModel.acceptedPreset.id).toBe(JANGDAN_PRESETS[0].id);
  expect(fallbackModel.acceptedPreset.defaultBpm).toBe(JANGDAN_PRESETS[0].defaultBpm);
  expect(fallbackModel.acceptAction).toBeUndefined();
  expect(fallbackModel.manualPresets.map((preset) => preset.id)).toEqual(
    JANGDAN_PRESETS.map((preset) => preset.id),
  );
});

test('exposes the previewing jangdan preset only for the active panel mode', () => {
  let state = createWorkState(plucks([0, 650, 1300, 1950, 2600]));

  state = applyProductAction(state, {
    type: 'previewJangdanPreset',
    mode: 'track',
    presetId: 'jungmori',
    bpm: 80,
    volume: 0.7,
  });

  expect(getJangdanPresetPanelModel(state, 'track').previewingPresetId).toBe('jungmori');
  expect(getJangdanPresetPanelModel(state, 'live').previewingPresetId).toBeUndefined();
});

test('accepts the previewed S10B preset when adding an accompaniment track', () => {
  let state = createWorkState(plucks([0, 650, 1300, 1950, 2600]));

  state = applyProductAction(state, {
    type: 'previewJangdanPreset',
    mode: 'track',
    presetId: 'jungmori',
    bpm: 76,
    volume: 0.42,
  });

  const model = getJangdanPresetPanelModel(state, 'track');

  expect(model.acceptedPreset.id).toBe('jungmori');
  expect(model.acceptedBpm).toBe(76);
  expect(model.acceptedVolume).toBe(0.42);
  expect(model.acceptAction).toMatchObject({
    type: 'addAccompanimentTrack',
    presetId: 'jungmori',
    bpm: 76,
    volume: 0.42,
  });
  expect(model.bpmValueLabel).toBe('76 BPM');
  expect(model.volumeValueLabel).toBe('42%');
  expect(model.increaseBpmAction).toMatchObject({
    type: 'previewJangdanPreset',
    mode: 'track',
    presetId: 'jungmori',
    bpm: 80,
    volume: 0.42,
  });
  expect(model.increaseVolumeAction).toMatchObject({
    type: 'previewJangdanPreset',
    mode: 'track',
    presetId: 'jungmori',
    bpm: 76,
    volume: 0.52,
  });
});

test('clamps S10B preview controls to preset bpm and volume bounds', () => {
  let state = createWorkState(plucks([0, 650, 1300, 1950, 2600]));

  state = applyProductAction(state, {
    type: 'previewJangdanPreset',
    mode: 'track',
    presetId: 'jungmori',
    bpm: 999,
    volume: 2,
  });

  const maxModel = getJangdanPresetPanelModel(state, 'track');

  expect(maxModel.acceptedBpm).toBe(100);
  expect(maxModel.acceptedVolume).toBe(1);
  expect(maxModel.increaseBpmAction).toMatchObject({ bpm: 100 });
  expect(maxModel.increaseVolumeAction).toMatchObject({ volume: 1 });
  expect(maxModel.acceptAction).toMatchObject({
    type: 'addAccompanimentTrack',
    presetId: 'jungmori',
    bpm: 100,
    volume: 1,
  });

  state = applyProductAction(state, {
    type: 'previewJangdanPreset',
    mode: 'track',
    presetId: 'jungmori',
    bpm: -1,
    volume: -0.5,
  });

  const minModel = getJangdanPresetPanelModel(state, 'track');

  expect(minModel.acceptedBpm).toBe(70);
  expect(minModel.acceptedVolume).toBe(0);
  expect(minModel.decreaseBpmAction).toMatchObject({ bpm: 70 });
  expect(minModel.decreaseVolumeAction).toMatchObject({ volume: 0 });
  expect(minModel.acceptAction).toMatchObject({
    type: 'addAccompanimentTrack',
    presetId: 'jungmori',
    bpm: 70,
    volume: 0,
  });
});

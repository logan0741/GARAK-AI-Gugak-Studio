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
  state = applyProductAction(state, { type: 'completePerformance', events });
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
  expect(fallbackModel.manualPresets.map((preset) => preset.id)).toEqual(
    JANGDAN_PRESETS.map((preset) => preset.id),
  );
});

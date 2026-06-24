import { expect, test } from 'vitest';

import { applyProductAction, createInitialGarakProductState } from '../garakProductState';
import { getInstrumentSettingsModel } from '../instrumentSettingsModel';

test('models S04A default settings and sample readiness for the selected instrument', () => {
  const state = {
    ...createInitialGarakProductState({ sampleFallbackInstruments: ['janggu', 'daegeum'] }),
    selectedInstrument: 'daegeum' as const,
  };

  expect(getInstrumentSettingsModel(state)).toMatchObject({
    instrumentName: '대금',
    sampleStatusLabel: '기본 샘플 사용 중',
    sampleStatusDescription: '고급 샘플 없이도 기본 연주로 시작할 수 있어요.',
    primaryAction: { type: 'startWithDefaults' },
    settingRows: [
      { label: '운지 입력 방식', value: '기본 운지' },
      { label: '호흡 입력 민감도', value: '중간' },
      { label: '음정 안정 보조', value: '약하게' },
    ],
  });
});

test('keeps S04A instrument settings specific instead of showing generic controls', () => {
  const state = {
    ...createInitialGarakProductState(),
    selectedInstrument: 'janggu' as const,
  };

  const model = getInstrumentSettingsModel(state);

  expect(model.settingRows).toEqual([
    { label: '타격 민감도', value: '중간' },
    { label: '타격면 표시', value: '켬' },
    { label: '기본 음색', value: '기본' },
  ]);
  expect(model.settingRows.map((row) => row.label)).not.toContain('잔향');
  expect(model.settingRows.map((row) => row.label)).not.toContain('BPM');
  expect(model.settingRows.map((row) => row.label)).not.toContain('장단');
});

test('blocks S04A start when the selected instrument requires a sample download', () => {
  const state = {
    ...createInitialGarakProductState(),
    selectedInstrument: 'daegeum' as const,
    screenFlow: {
      currentScreen: 'S04A' as const,
      history: ['S01' as const, 'S04' as const],
      mode: 'freeCreation' as const,
    },
    instrumentSampleStatuses: {
      gayageum: 'ready' as const,
      janggu: 'ready' as const,
      daegeum: 'downloadRequired' as const,
    },
  };

  const model = getInstrumentSettingsModel(state);

  expect(model).toMatchObject({
    sampleStatusLabel: '다운로드 필요',
    sampleStatusDescription: '필수 샘플 준비 후 연주를 시작할 수 있어요.',
  });
  expect(model.primaryAction).toBeUndefined();

  const nextState = applyProductAction(state, { type: 'startWithDefaults' });

  expect(nextState.screenFlow.currentScreen).toBe('S04A');
  expect(nextState.instrumentSettingsNotice).toBe('sampleRequired');
});

test('opens direct adjustment on S04A and exposes Next for adjusted settings', () => {
  const state = {
    ...createInitialGarakProductState({ sampleFallbackInstruments: ['janggu', 'daegeum'] }),
    selectedInstrument: 'janggu' as const,
    screenFlow: {
      currentScreen: 'S04A' as const,
      history: ['S01' as const, 'S04' as const],
      mode: 'freeCreation' as const,
    },
  };

  const initialModel = getInstrumentSettingsModel(state);

  expect(initialModel.isAdjustmentOpen).toBe(false);
  expect(initialModel.secondaryAction).toEqual({ type: 'openInstrumentSettingsAdjustment' });
  expect(initialModel.nextAction).toBeUndefined();

  const adjustedState = applyProductAction(state, initialModel.secondaryAction);
  const adjustedModel = getInstrumentSettingsModel(adjustedState);

  expect(adjustedState.instrumentSettingsAdjustmentOpen).toBe(true);
  expect(adjustedModel.isAdjustmentOpen).toBe(true);
  expect(adjustedModel.secondaryAction).toEqual({ type: 'cancelInstrumentSettingsAdjustment' });
  expect(adjustedModel.nextAction).toEqual({ type: 'startWithAdjustedSettings' });

  const selectedOption = adjustedModel.settingControls[0].options.find((option) => option.value === '높음');
  if (selectedOption === undefined) {
    throw new Error('expected janggu sensitivity option');
  }

  const changedState = applyProductAction(adjustedState, selectedOption.selectAction);
  const startedState = applyProductAction(changedState, { type: 'startWithAdjustedSettings' });

  expect(startedState.screenFlow.currentScreen).toBe('S05');
  expect(startedState.activeInstrumentSettings).toMatchObject({
    instrument: 'janggu',
    source: 'adjusted',
    values: {
      '타격 민감도': '높음',
      '타격면 표시': '켬',
      '기본 음색': '기본',
    },
  });

  const resetState = applyProductAction(changedState, { type: 'cancelInstrumentSettingsAdjustment' });
  const resetModel = getInstrumentSettingsModel(resetState);

  expect(resetModel.isAdjustmentOpen).toBe(false);
  expect(resetModel.settingRows).toEqual([
    { label: '타격 민감도', value: '중간' },
    { label: '타격면 표시', value: '켬' },
    { label: '기본 음색', value: '기본' },
  ]);
});

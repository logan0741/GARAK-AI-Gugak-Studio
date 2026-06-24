import type { InstrumentId } from '../studio/studioTypes';
import type {
  GarakProductAction,
  GarakProductState,
  InstrumentSampleStatus,
} from './garakProductState';
import {
  INSTRUMENT_SETTING_DEFINITIONS,
  resolveInstrumentSettingValues,
} from './instrumentSettingsConfig';
import { DEFAULT_FREE_CREATION_INSTRUMENT, getInstrumentName } from './productFixtures';

export type InstrumentSettingRow = {
  label: string;
  value: string;
};

export type InstrumentSettingOption = {
  value: string;
  isSelected: boolean;
  selectAction: GarakProductAction;
};

export type InstrumentSettingControl = InstrumentSettingRow & {
  options: InstrumentSettingOption[];
};

export type InstrumentSettingsModel = {
  instrument: InstrumentId;
  instrumentName: string;
  sampleStatus: InstrumentSampleStatus;
  sampleStatusLabel: string;
  sampleStatusDescription: string;
  settingRows: InstrumentSettingRow[];
  settingControls: InstrumentSettingControl[];
  primaryAction?: GarakProductAction;
  secondaryAction: GarakProductAction;
  nextAction?: GarakProductAction;
  isAdjustmentOpen: boolean;
  notice?: string;
};

export function getInstrumentSettingsModel(state: GarakProductState): InstrumentSettingsModel {
  const instrument = state.selectedInstrument ?? DEFAULT_FREE_CREATION_INSTRUMENT;
  const sampleStatus = state.instrumentSampleStatuses[instrument];
  const canStart = sampleStatus !== 'downloadRequired';
  const isAdjustmentOpen = state.instrumentSettingsAdjustmentOpen === true;
  const values = resolveInstrumentSettingValues(
    instrument,
    state.instrumentSettingSelections[instrument],
  );
  const sampleStatusCopy = getSampleStatusCopy(sampleStatus);
  const settingRows = INSTRUMENT_SETTING_DEFINITIONS[instrument].map((setting) => ({
    label: setting.label,
    value: values[setting.label],
  }));

  return {
    instrument,
    instrumentName: getInstrumentName(instrument),
    sampleStatus,
    sampleStatusLabel: sampleStatusCopy.label,
    sampleStatusDescription: sampleStatusCopy.description,
    settingRows,
    settingControls: INSTRUMENT_SETTING_DEFINITIONS[instrument].map((setting) => ({
      label: setting.label,
      value: values[setting.label],
      options: setting.options.map((value) => ({
        value,
        isSelected: values[setting.label] === value,
        selectAction: {
          type: 'adjustInstrumentSetting',
          instrument,
          label: setting.label,
          value,
        },
      })),
    })),
    primaryAction: canStart ? { type: 'startWithDefaults' } : undefined,
    secondaryAction: {
      type: isAdjustmentOpen
        ? 'cancelInstrumentSettingsAdjustment'
        : 'openInstrumentSettingsAdjustment',
    },
    nextAction: isAdjustmentOpen && canStart ? { type: 'startWithAdjustedSettings' } : undefined,
    isAdjustmentOpen,
    notice:
      state.instrumentSettingsNotice === 'sampleRequired'
        ? '필수 샘플 준비 후 연주를 시작할 수 있어요.'
        : undefined,
  };
}

function getSampleStatusCopy(status: InstrumentSampleStatus): {
  label: string;
  description: string;
} {
  switch (status) {
    case 'fallback':
      return {
        label: '기본 샘플 사용 중',
        description: '고급 샘플 없이도 기본 연주로 시작할 수 있어요.',
      };
    case 'downloadRequired':
      return {
        label: '다운로드 필요',
        description: '필수 샘플 준비 후 연주를 시작할 수 있어요.',
      };
    case 'ready':
    default:
      return {
        label: '샘플 준비 완료',
        description: '기본 연주 상태로 바로 시작할 수 있어요.',
      };
  }
}

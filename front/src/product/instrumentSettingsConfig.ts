import type { InstrumentId } from '../studio/studioTypes';

export type InstrumentSettingDefinition = {
  label: string;
  defaultValue: string;
  options: string[];
};

export type InstrumentSettingValueMap = Record<string, string>;

export const INSTRUMENT_SETTING_DEFINITIONS: Record<InstrumentId, InstrumentSettingDefinition[]> = {
  gayageum: [
    { label: '조율', defaultValue: '산조 12현 기본', options: ['산조 12현 기본', '정악 12현', '저음 강조'] },
    { label: '터치 민감도', defaultValue: '중간', options: ['낮음', '중간', '높음'] },
    { label: '잔향', defaultValue: '자연', options: ['짧게', '자연', '길게'] },
  ],
  janggu: [
    { label: '타격 민감도', defaultValue: '중간', options: ['낮음', '중간', '높음'] },
    { label: '타격면 표시', defaultValue: '켬', options: ['끔', '켬'] },
    { label: '기본 음색', defaultValue: '기본', options: ['둔탁하게', '기본', '밝게'] },
  ],
  daegeum: [
    { label: '운지 입력 방식', defaultValue: '기본 운지', options: ['기본 운지', '단순 운지'] },
    { label: '호흡 입력 민감도', defaultValue: '중간', options: ['낮음', '중간', '높음'] },
    { label: '음정 안정 보조', defaultValue: '약하게', options: ['끔', '약하게', '강하게'] },
  ],
};

export function resolveInstrumentSettingValues(
  instrument: InstrumentId,
  selectedValues: InstrumentSettingValueMap | undefined,
): InstrumentSettingValueMap {
  return Object.fromEntries(
    INSTRUMENT_SETTING_DEFINITIONS[instrument].map((setting) => {
      const selectedValue = selectedValues?.[setting.label];

      return [
        setting.label,
        selectedValue !== undefined && setting.options.includes(selectedValue)
          ? selectedValue
          : setting.defaultValue,
      ];
    }),
  );
}

export function getDefaultInstrumentSettingValues(instrument: InstrumentId): InstrumentSettingValueMap {
  return resolveInstrumentSettingValues(instrument, undefined);
}

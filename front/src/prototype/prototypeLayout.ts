export const PROTOTYPE_STRING_COUNT = 12;
export const PROTOTYPE_STRING_ROW_MIN_HEIGHT = 20;
export const PROTOTYPE_INSTRUMENT_VERTICAL_PADDING = 10;
export const PROTOTYPE_STRING_LINE_HEIGHT = 5;

export function getPrototypeInstrumentMinimumHeight(input: { stringCount: number }): number {
  return input.stringCount * PROTOTYPE_STRING_ROW_MIN_HEIGHT + PROTOTYPE_INSTRUMENT_VERTICAL_PADDING * 2;
}

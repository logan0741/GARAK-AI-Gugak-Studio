import { expect, test } from 'vitest';
import {
  getPrototypeInstrumentMinimumHeight,
  PROTOTYPE_STRING_COUNT,
} from '../prototypeLayout';

test('keeps all 12 strings visible in a compact landscape prototype viewport', () => {
  expect(
    getPrototypeInstrumentMinimumHeight({
      stringCount: PROTOTYPE_STRING_COUNT,
    }),
  ).toBeLessThanOrEqual(300);
});

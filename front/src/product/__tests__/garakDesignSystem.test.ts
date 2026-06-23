import { expect, test } from 'vitest';
import {
  FIGMA_DESIGN_FRAME_AUDIT,
  FIGMA_IMPLEMENTATION_MAP,
  GARAK_COLORS,
  getFigmaMappedScreenIds,
} from '../garakDesignSystem';

test('uses exact Figma design-system color tokens', () => {
  expect(GARAK_COLORS.brandNavy).toBe('#1A1C2D');
  expect(GARAK_COLORS.brandRed).toBe('#B51A14');
  expect(GARAK_COLORS.brandAmber).toBe('#E59100');
  expect(GARAK_COLORS.surfaceCanvas).toBe('#F9F7F3');
});

test('maps Figma screens to implemented GARAK screen ids', () => {
  expect(getFigmaMappedScreenIds('홈')).toContain('S01');
  expect(getFigmaMappedScreenIds('쉐어')).toContain('S20');
  expect(getFigmaMappedScreenIds('마이')).toContain('S18');
});

test('keeps product-constrained Figma elements explicit', () => {
  expect(FIGMA_DESIGN_FRAME_AUDIT.excludedByUser).toContain('플레잉 iPhone mockup background');
  expect(FIGMA_IMPLEMENTATION_MAP.some((item) => item.figmaName === '로그인')).toBe(true);
  expect(
    FIGMA_IMPLEMENTATION_MAP.find((item) => item.figmaName === '로그인')?.constraint,
  ).toContain('첫 실행 관문 아님');
});

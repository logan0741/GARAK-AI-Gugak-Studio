import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import {
  GARAK_AUTH_BUTTON_LAYOUT,
  FIGMA_DESIGN_FRAME_AUDIT,
  FIGMA_IMPLEMENTATION_MAP,
  GARAK_COLORS,
  GARAK_ONBOARDING_LOGOS,
  getFigmaMappedScreenIds,
} from '../garakDesignSystem';

const testDir = dirname(fileURLToPath(import.meta.url));
const brandAssetsDir = resolve(testDir, '../../../assets/brand');
const fontAssetsDir = resolve(testDir, '../../../assets/fonts');
const designDocPath = resolve(testDir, '../../../docs/design/DESIGN.md');

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

test('documents Figma MCP as the design authority over user screenshots', () => {
  const designDoc = readFileSync(designDocPath, 'utf8');

  expect(designDoc).toContain('| Figma MCP 노드/레이어 값 |');
  expect(designDoc).toContain('사용자 제공 Figma 캡쳐는 판정 기준으로 쓰지 않는다.');
  expect(designDoc).not.toContain('| 2026-06-19 첨부 Figma 스크린샷 |');
});

test('uses the Figma login button geometry for S23 auth actions', () => {
  expect(GARAK_AUTH_BUTTON_LAYOUT).toEqual({
    buttonHeight: 60,
    buttonWidth: 346,
    cornerRadius: 30,
    gap: 15,
    googleIconSize: 24,
  });
});

test('maps the three onboarding logo SVGs to the documented brand surfaces', () => {
  expect(GARAK_ONBOARDING_LOGOS).toEqual([
    {
      fileName: 'logo1.svg',
      backgroundColor: GARAK_COLORS.surfaceCanvas,
      logoColor: GARAK_COLORS.brandRed,
    },
    {
      fileName: 'logo2.svg',
      backgroundColor: GARAK_COLORS.brandNavy,
      logoColor: GARAK_COLORS.brandAmber,
    },
    {
      fileName: 'logo3.svg',
      backgroundColor: GARAK_COLORS.brandRed,
      logoColor: GARAK_COLORS.surfaceCanvas,
    },
  ]);
});

test('ships the three onboarding logo SVG assets', () => {
  expect(GARAK_ONBOARDING_LOGOS.map(({ fileName }) => existsSync(resolve(brandAssetsDir, fileName)))).toEqual([
    true,
    true,
    true,
  ]);
});

test('loads Pretendard as the GARAK app font', () => {
  const appSource = readFileSync(resolve(testDir, '../../../app/index.tsx'), 'utf8');
  const typographySource = readFileSync(resolve(testDir, '../garakTypography.ts'), 'utf8');

  expect(typographySource).toContain("export const GARAK_FONT_FAMILY = 'Pretendard'");
  expect(typographySource).toContain('fontFamily: GARAK_FONT_FAMILY');
  expect(typographySource).toContain("[GARAK_FONT_FAMILY]: require('../../assets/fonts/PretendardVariable.ttf')");
  expect(existsSync(resolve(fontAssetsDir, 'PretendardVariable.ttf'))).toBe(true);
  expect(existsSync(resolve(fontAssetsDir, 'Pretendard-LICENSE.txt'))).toBe(true);
  expect(appSource).toContain('useFonts(GARAK_FONT_ASSETS)');
  expect(appSource).not.toContain('applyGarakTextDefaults()');
  expect(typographySource).toContain('withGarakFontStyle');
  expect(typographySource).toContain('GarakTextInput');
  expect(typographySource).not.toContain('defaultProps');
  expect(typographySource).not.toContain('React.cloneElement');
});

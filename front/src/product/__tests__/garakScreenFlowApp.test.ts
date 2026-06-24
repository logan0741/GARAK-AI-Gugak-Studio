import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('does not render a mocked OS status bar in the app shell', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/GarakScreenFlowApp.tsx'), 'utf8');

  expect(source).not.toContain('9:41');
  expect(source).not.toContain('styles.statusBar');
  expect(source).not.toContain('homeIndicator');
});

test('uses the Figma home hero copy in the home screen accessibility contract', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/freeCreationScreens.tsx'), 'utf8');

  expect(source).toContain('AI와 함께');
  expect(source).not.toContain('장단 추천으로');
});

test('uses the Figma free-creation mode guide for the intro screen', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/settingsScreens.tsx'), 'utf8');

  expect(source).toContain('원하는');
  expect(source).toContain('연주모드');
  expect(source).toContain('자유창작 모드');
  expect(source).toContain('따라하기 모드');
  expect(source).toContain('AI 반주 추가');
  expect(source).toContain('useWindowDimensions');
  expect(source).toContain('modeGuidePanelCompact');
  expect(source).toContain("target: 'S04'");
  expect(source).not.toContain('GARAK에 오신 것을 환영해요');
});

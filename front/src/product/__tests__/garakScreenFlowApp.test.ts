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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('does not render a mocked OS status bar in the app shell', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/product/GarakScreenFlowApp.tsx'), 'utf8');

  expect(source).not.toContain('9:41');
  expect(source).not.toContain('styles.statusBar');
  expect(source).not.toContain('homeIndicator');
});

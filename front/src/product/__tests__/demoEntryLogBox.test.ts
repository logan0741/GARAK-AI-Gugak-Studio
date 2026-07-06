import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('demo entry LogBox setup', () => {
  it('boots through a local entry so the dev-client keep-awake warning is suppressed before Expo Router starts', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
    ) as { main?: string };
    const entrySource = readFileSync(resolve(process.cwd(), 'index.ts'), 'utf8');

    expect(packageJson.main).toBe('./index.ts');
    expect(entrySource).toContain("import { LogBox } from 'react-native'");
    expect(entrySource).toContain('Unable to activate keep awake');
    expect(entrySource.indexOf('LogBox.ignoreLogs')).toBeLessThan(
      entrySource.indexOf("require('expo-router/entry')"),
    );
  });
});

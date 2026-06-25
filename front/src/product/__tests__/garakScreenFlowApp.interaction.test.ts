import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('documents the required React Native interaction test dependency', () => {
  const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
    devDependencies?: Record<string, string>;
  };

  expect(packageJson.devDependencies?.['@testing-library/react-native']).toBeDefined();
  expect(packageJson.devDependencies?.['test-renderer']).toBe('1.1.0');
});

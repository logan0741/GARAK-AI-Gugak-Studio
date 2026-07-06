import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

function readJson(path: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
}

function getPluginName(plugin: unknown): string | undefined {
  if (typeof plugin === 'string') {
    return plugin;
  }

  if (Array.isArray(plugin) && typeof plugin[0] === 'string') {
    return plugin[0];
  }

  return undefined;
}

test('allows runtime screen orientation locks instead of locking the whole app landscape', () => {
  const appConfig = readJson('app.json');
  const packageJson = readJson('package.json');
  const pluginNames = appConfig.expo.plugins.map(getPluginName);

  expect(appConfig.expo.orientation).toBe('default');
  expect(pluginNames).toContain('expo-screen-orientation');
  expect(packageJson.dependencies['expo-screen-orientation']).toBe('~9.0.9');
});

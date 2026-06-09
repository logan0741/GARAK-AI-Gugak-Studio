import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

type PackageJson = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
};

type EasJson = {
  cli?: {
    appVersionSource?: string;
  };
  build?: Record<
    string,
    { autoIncrement?: boolean; developmentClient?: boolean }
  >;
};

type AppJson = {
  expo?: {
    plugins?: unknown[];
  };
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), path), 'utf8')) as T;
}

test('configures an Expo development client for native audio candidate QA', () => {
  const packageJson = readJson<PackageJson>('package.json');
  const appJson = readJson<AppJson>('app.json');
  const easJson = readJson<EasJson>('eas.json');

  expect(packageJson.dependencies).toHaveProperty('expo-dev-client');
  expect(packageJson.scripts).toMatchObject({
    'start:dev-client': 'expo start --dev-client',
  });
  expect(easJson.build?.development).toMatchObject({
    autoIncrement: true,
    developmentClient: true,
  });
  expect(easJson.cli).toMatchObject({
    appVersionSource: 'remote',
  });
  expect(appJson.expo?.plugins).toEqual(
    expect.arrayContaining([
      'expo-router',
      expect.arrayContaining(['expo-audio']),
      expect.arrayContaining(['react-native-audio-api']),
    ]),
  );
});

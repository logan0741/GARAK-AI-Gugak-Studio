import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type PackageLockJson = {
  packages?: Record<string, { version?: string }>;
};

const TECH_STACK_PATH = 'docs/architecture/tech-stack.md';

test('keeps installed package version rows in the tech stack doc aligned with package-lock', () => {
  const packageJson = readJson<PackageJson>('package.json');
  const packageLockJson = readJson<PackageLockJson>('package-lock.json');
  const techStackMarkdown = readText(TECH_STACK_PATH);
  const installedPackageNames = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ]);

  const mismatches = findPackageVersionRows(techStackMarkdown)
    .filter((row) => installedPackageNames.has(row.packageName))
    .filter((row) => row.documentedVersion !== getLockedVersion(packageLockJson, row.packageName))
    .map(
      (row) =>
        `${row.packageName}: docs=${row.documentedVersion}, lock=${getLockedVersion(packageLockJson, row.packageName)}`,
    );

  expect(mismatches).toEqual([]);
});

test('documents physical-device audio QA as a Week 2 gate', () => {
  const techStackMarkdown = readText(TECH_STACK_PATH);

  expect(techStackMarkdown).not.toContain('Week 1 device QA uses');
  expect(techStackMarkdown).toContain('Week 2 physical-device QA uses');
});

function readJson<T>(path: string): T {
  return JSON.parse(readText(path)) as T;
}

function readText(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

function getLockedVersion(packageLockJson: PackageLockJson, packageName: string): string | undefined {
  return packageLockJson.packages?.[`node_modules/${packageName}`]?.version;
}

function findPackageVersionRows(markdown: string): Array<{
  documentedVersion: string;
  packageName: string;
}> {
  return [...markdown.matchAll(/^\|\s*`([^`]+)`\s*\|\s*`?([0-9]+(?:\.[0-9]+){1,2})`?\s*\|/gm)]
    .map((match) => ({
      packageName: match[1],
      documentedVersion: match[2],
    }));
}

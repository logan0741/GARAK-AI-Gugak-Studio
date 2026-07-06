export type D2DemoAndroidBuildCommandInput = {
  argv: string[];
  sourceRoot: string;
  env: Record<string, string | undefined>;
  pathExists: (path: string) => boolean;
  ensureDirectory: (path: string) => void;
  getFileSizeBytes: (path: string) => number | undefined;
  runCommand: (
    command: string,
    args: string[],
    options: D2DemoAndroidBuildCommandRunOptions,
  ) => D2DemoAndroidBuildCommandRunResult;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export type D2DemoAndroidBuildCommandRunOptions = {
  cwd: string;
  env?: Record<string, string | undefined>;
};

export type D2DemoAndroidBuildCommandRunResult = {
  exitCode: number;
};

type D2DemoAndroidBuildOptions = {
  buildRoot: string;
  install: boolean;
  refreshNative: boolean;
  skipCopy: boolean;
  skipGradle: boolean;
};

const USAGE =
  'Usage: npm run qa:d2-demo-android-build -- <short-ascii-build-dir> [--install] [--refresh-native] [--skip-copy] [--skip-gradle]';

const COPY_EXCLUDED_DIRECTORIES = [
  'node_modules',
  'android',
  '.expo',
  'dist',
  '.codex-backup',
  '.codex-logs',
];

const COPY_EXCLUDED_FILES = ['.codex-*.log', '*.log'];

export function runD2DemoAndroidBuildCommand(
  input: D2DemoAndroidBuildCommandInput,
): number {
  const parseResult = parseD2DemoAndroidBuildOptions(input.argv);
  if (!parseResult.ok) {
    input.writeStderr(parseResult.message);
    return 1;
  }

  const options = parseResult.options;
  const sourceRoot = normalizeWindowsPath(input.sourceRoot);
  const buildRoot = normalizeWindowsPath(options.buildRoot);

  if (!isAbsoluteAsciiPath(buildRoot)) {
    input.writeStderr(
      'Could not run D-2 Android build: build directory must be an absolute ASCII path',
    );
    return 1;
  }

  if (isSameOrNestedPath(buildRoot, sourceRoot)) {
    input.writeStderr(
      'Could not run D-2 Android build: build directory must not be inside the source project',
    );
    return 1;
  }

  input.ensureDirectory(buildRoot);

  if (!options.skipCopy) {
    const copyResult = input.runCommand(
      'robocopy',
      [
        sourceRoot,
        buildRoot,
        '/E',
        '/XD',
        ...COPY_EXCLUDED_DIRECTORIES,
        '/XF',
        ...COPY_EXCLUDED_FILES,
      ],
      { cwd: sourceRoot },
    );
    if (copyResult.exitCode > 7) {
      input.writeStderr(`Could not copy project to ASCII build path: robocopy exit ${copyResult.exitCode}`);
      return copyResult.exitCode;
    }
  }

  if (shouldInstallDependencies(buildRoot, options, input.pathExists)) {
    const installResult = input.runCommand('npm', ['install'], { cwd: buildRoot });
    if (installResult.exitCode !== 0) {
      input.writeStderr(`Could not install dependencies in ASCII build path: npm exit ${installResult.exitCode}`);
      return installResult.exitCode;
    }
  }

  if (shouldRunAndroidPrebuild(buildRoot, options, input.pathExists)) {
    const prebuildResult = input.runCommand(
      'npx',
      ['expo', 'prebuild', '--platform', 'android', '--no-install'],
      { cwd: buildRoot },
    );
    if (prebuildResult.exitCode !== 0) {
      input.writeStderr(`Could not prebuild Android native project: expo exit ${prebuildResult.exitCode}`);
      return prebuildResult.exitCode;
    }
  }

  const androidRoot = joinWindowsPath(buildRoot, 'android');
  const apkPath = joinWindowsPath(
    androidRoot,
    'app',
    'build',
    'outputs',
    'apk',
    'debug',
    'app-debug.apk',
  );

  if (!options.skipGradle) {
    const gradleResult = input.runCommand(
      '.\\gradlew.bat',
      [':app:assembleDebug', '--console=plain', '--no-daemon'],
      {
        cwd: androidRoot,
        env: {
          ...input.env,
          GRADLE_USER_HOME: input.env.GRADLE_USER_HOME,
        },
      },
    );
    if (gradleResult.exitCode !== 0) {
      input.writeStderr(`Could not build Android debug APK: Gradle exit ${gradleResult.exitCode}`);
      return gradleResult.exitCode;
    }
  }

  if (!input.pathExists(apkPath)) {
    input.writeStderr(`Could not find Android debug APK: ${apkPath}`);
    return 1;
  }

  input.writeStdout(`Android debug APK: ${apkPath}`);
  const apkSizeBytes = input.getFileSizeBytes(apkPath);
  if (apkSizeBytes !== undefined) {
    input.writeStdout(`APK size bytes: ${apkSizeBytes}`);
  }

  return 0;
}

function parseD2DemoAndroidBuildOptions(
  argv: string[],
): { ok: true; options: D2DemoAndroidBuildOptions } | { ok: false; message: string } {
  const [buildRoot, ...flags] = argv;
  if (!buildRoot) {
    return { ok: false, message: USAGE };
  }

  const knownFlags = new Set(['--install', '--refresh-native', '--skip-copy', '--skip-gradle']);
  for (const flag of flags) {
    if (!knownFlags.has(flag)) {
      return { ok: false, message: `Unknown D-2 Android build option: ${flag}` };
    }
  }

  return {
    ok: true,
    options: {
      buildRoot,
      install: flags.includes('--install'),
      refreshNative: flags.includes('--refresh-native'),
      skipCopy: flags.includes('--skip-copy'),
      skipGradle: flags.includes('--skip-gradle'),
    },
  };
}

function shouldInstallDependencies(
  buildRoot: string,
  options: D2DemoAndroidBuildOptions,
  pathExists: (path: string) => boolean,
): boolean {
  return options.install || !pathExists(joinWindowsPath(buildRoot, 'node_modules'));
}

function shouldRunAndroidPrebuild(
  buildRoot: string,
  options: D2DemoAndroidBuildOptions,
  pathExists: (path: string) => boolean,
): boolean {
  return options.refreshNative || !pathExists(joinWindowsPath(buildRoot, 'android'));
}

function isAbsoluteAsciiPath(path: string): boolean {
  return /^[\x00-\x7F]+$/.test(path) && /^[A-Za-z]:\\/.test(path);
}

function isSameOrNestedPath(candidate: string, root: string): boolean {
  const normalizedCandidate = stripTrailingSlash(candidate).toLowerCase();
  const normalizedRoot = stripTrailingSlash(root).toLowerCase();

  return normalizedCandidate === normalizedRoot ||
    normalizedCandidate.startsWith(`${normalizedRoot}\\`);
}

function normalizeWindowsPath(path: string): string {
  return stripTrailingSlash(path.trim().replace(/\//g, '\\'));
}

function stripTrailingSlash(path: string): string {
  return path.replace(/\\+$/g, '');
}

function joinWindowsPath(...parts: string[]): string {
  return parts
    .map((part, index) => {
      const normalized = normalizeWindowsPath(part);
      return index === 0 ? stripTrailingSlash(normalized) : normalized.replace(/^\\+/g, '');
    })
    .filter((part) => part.length > 0)
    .join('\\');
}

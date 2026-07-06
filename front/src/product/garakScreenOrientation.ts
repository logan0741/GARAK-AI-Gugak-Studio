import type { GarakScreenFrameMode } from './garakScreenFrame';

export type GarakScreenOrientationLockName = 'PORTRAIT_UP' | 'LANDSCAPE';

export type GarakScreenOrientationApi = {
  OrientationLock: Record<GarakScreenOrientationLockName, number>;
  lockAsync: (orientationLock: number) => Promise<void>;
  supportsOrientationLockAsync?: (orientationLock: number) => Promise<boolean>;
};

export type GarakScreenOrientationResult =
  | { status: 'locked'; lockName: GarakScreenOrientationLockName }
  | { status: 'stale'; lockName: GarakScreenOrientationLockName }
  | { status: 'unsupported'; lockName: GarakScreenOrientationLockName }
  | { status: 'unavailable'; lockName: GarakScreenOrientationLockName };

export type GarakScreenOrientationOptions = {
  isCurrent?: () => boolean;
  loadApi?: () => Promise<GarakScreenOrientationApi | undefined>;
};

export function getGarakScreenOrientationLockName(
  frameMode: GarakScreenFrameMode,
): GarakScreenOrientationLockName {
  return frameMode === 'landscape' ? 'LANDSCAPE' : 'PORTRAIT_UP';
}

export async function lockGarakScreenOrientation(
  frameMode: GarakScreenFrameMode,
  options: GarakScreenOrientationOptions = {},
): Promise<GarakScreenOrientationResult> {
  const lockName = getGarakScreenOrientationLockName(frameMode);
  const isCurrent = options.isCurrent ?? (() => true);
  const screenOrientation = await (options.loadApi ?? loadExpoScreenOrientation)();

  if (screenOrientation === undefined) {
    return { status: 'unavailable', lockName };
  }

  const orientationLock = screenOrientation.OrientationLock[lockName];

  if (!isCurrent()) {
    return { status: 'stale', lockName };
  }

  if (screenOrientation.supportsOrientationLockAsync !== undefined) {
    try {
      const isSupported = await screenOrientation.supportsOrientationLockAsync(orientationLock);

      if (!isSupported) {
        return { status: 'unsupported', lockName };
      }
    } catch {
      // Some runtimes cannot answer support queries but can still accept lockAsync.
    }
  }

  if (!isCurrent()) {
    return { status: 'stale', lockName };
  }

  await screenOrientation.lockAsync(orientationLock);

  return { status: 'locked', lockName };
}

async function loadExpoScreenOrientation(): Promise<GarakScreenOrientationApi | undefined> {
  try {
    return await import('expo-screen-orientation');
  } catch {
    return undefined;
  }
}

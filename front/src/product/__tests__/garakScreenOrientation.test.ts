import { expect, test } from 'vitest';
import {
  type GarakScreenOrientationApi,
  getGarakScreenOrientationLockName,
  lockGarakScreenOrientation,
} from '../garakScreenOrientation';

function createFakeOrientationApi({
  supported = true,
}: {
  supported?: boolean;
} = {}) {
  const locks: number[] = [];
  const api: GarakScreenOrientationApi = {
    OrientationLock: {
      PORTRAIT_UP: 3,
      LANDSCAPE: 5,
    },
    lockAsync: async (orientationLock) => {
      locks.push(orientationLock);
    },
    supportsOrientationLockAsync: async () => supported,
  };

  return { api, locks };
}

test('maps portrait and landscape frame modes to native orientation locks', () => {
  expect(getGarakScreenOrientationLockName('portrait')).toBe('PORTRAIT_UP');
  expect(getGarakScreenOrientationLockName('landscape')).toBe('LANDSCAPE');
});

test('locks the current screen frame orientation through the native API', async () => {
  const { api, locks } = createFakeOrientationApi();

  await expect(
    lockGarakScreenOrientation('portrait', { loadApi: async () => api }),
  ).resolves.toEqual({ status: 'locked', lockName: 'PORTRAIT_UP' });
  await expect(
    lockGarakScreenOrientation('landscape', { loadApi: async () => api }),
  ).resolves.toEqual({ status: 'locked', lockName: 'LANDSCAPE' });

  expect(locks).toEqual([3, 5]);
});

test('skips stale orientation requests after the screen changes again', async () => {
  const { api, locks } = createFakeOrientationApi();

  await expect(
    lockGarakScreenOrientation('landscape', {
      isCurrent: () => false,
      loadApi: async () => api,
    }),
  ).resolves.toEqual({ status: 'stale', lockName: 'LANDSCAPE' });

  expect(locks).toEqual([]);
});

test('does not call lockAsync when the requested orientation is unsupported', async () => {
  const { api, locks } = createFakeOrientationApi({ supported: false });

  await expect(
    lockGarakScreenOrientation('portrait', { loadApi: async () => api }),
  ).resolves.toEqual({ status: 'unsupported', lockName: 'PORTRAIT_UP' });

  expect(locks).toEqual([]);
});

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import {
  getGarakScreenFrameConfig,
  PERFORMANCE_LANDSCAPE_SCREEN_IDS,
  usesEmbeddedLandscapeArtworkHeader,
  usesImmersivePortraitScreen,
} from '../garakScreenFrame';

const testDir = dirname(fileURLToPath(import.meta.url));
const productAssetsDir = resolve(testDir, '../../../assets/product');

test('uses a landscape non-scroll frame for performance-focused screens', () => {
  expect(PERFORMANCE_LANDSCAPE_SCREEN_IDS).toEqual(['S05', 'S09', 'S15']);

  for (const screenId of PERFORMANCE_LANDSCAPE_SCREEN_IDS) {
    expect(getGarakScreenFrameConfig(screenId)).toEqual({
      mode: 'landscape',
      scrollable: false,
    });
  }
});

test('keeps setup, editing, guide, and library screens in the portrait scroll frame', () => {
  expect(getGarakScreenFrameConfig('S01')).toEqual({ mode: 'portrait', scrollable: true });
  expect(getGarakScreenFrameConfig('S04A')).toEqual({ mode: 'portrait', scrollable: true });
  expect(getGarakScreenFrameConfig('S07')).toEqual({ mode: 'portrait', scrollable: true });
  expect(getGarakScreenFrameConfig('S10A')).toEqual({ mode: 'portrait', scrollable: true });
  expect(getGarakScreenFrameConfig('S18')).toEqual({ mode: 'portrait', scrollable: true });
});

test('ships the Figma janggu stage bitmap for the landscape free-play surface', () => {
  expect(existsSync(resolve(productAssetsDir, 'creation-free-play-janggu-stage.png'))).toBe(true);
});

test('uses the embedded Figma header only on the free-play landscape artwork screen', () => {
  expect(usesEmbeddedLandscapeArtworkHeader('S05')).toBe(true);
  expect(usesEmbeddedLandscapeArtworkHeader('S09')).toBe(false);
  expect(usesEmbeddedLandscapeArtworkHeader('S15')).toBe(false);
  expect(usesEmbeddedLandscapeArtworkHeader('S07')).toBe(false);
});

test('uses an immersive portrait frame for the Figma playing screen', () => {
  expect(getGarakScreenFrameConfig('S19')).toEqual({ mode: 'portrait', scrollable: false });
  expect(usesImmersivePortraitScreen('S19')).toBe(true);
  expect(usesImmersivePortraitScreen('S18')).toBe(false);
});

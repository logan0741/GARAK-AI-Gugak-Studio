import { expect, test } from 'vitest';
import { shouldStartPrototypeNativeAudioCandidate } from '../prototypePlatform';

test('does not start native audio candidates on web smoke runs', () => {
  expect(shouldStartPrototypeNativeAudioCandidate('web')).toBe(false);
});

test('starts native audio candidates on device platforms', () => {
  expect(shouldStartPrototypeNativeAudioCandidate('ios')).toBe(true);
  expect(shouldStartPrototypeNativeAudioCandidate('android')).toBe(true);
});

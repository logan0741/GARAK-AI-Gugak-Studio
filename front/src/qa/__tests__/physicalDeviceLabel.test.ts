import { expect, test } from 'vitest';
import {
  isPhysicalDeviceLabel,
  normalizePhysicalDeviceLabelForReport,
} from '../physicalDeviceLabel';

test('rejects blank and placeholder-like physical device labels', () => {
  for (const deviceLabel of [
    '',
    '   ',
    'replace-with-physical-device-model',
    'Replace With Physical Device Model',
    'Device / OS',
    'Device /OS',
    'Device/ OS',
    'Device/OS',
    'physical device',
  ]) {
    expect(isPhysicalDeviceLabel(deviceLabel)).toBe(false);
  }
});

test('accepts concrete physical device and OS labels', () => {
  expect(isPhysicalDeviceLabel('Pixel 8 / Android 15')).toBe(true);
  expect(isPhysicalDeviceLabel('iPhone 15 / iOS 18')).toBe(true);
});

test('normalizes spacing without changing the reported device casing', () => {
  expect(normalizePhysicalDeviceLabelForReport('  Pixel 8/Android 15  ')).toBe(
    'Pixel 8 / Android 15',
  );
  expect(normalizePhysicalDeviceLabelForReport('pixel   8 / android   15')).toBe(
    'pixel 8 / android 15',
  );
});

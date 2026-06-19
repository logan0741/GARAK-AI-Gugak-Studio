const PHYSICAL_DEVICE_LABEL_PLACEHOLDERS = new Set([
  'replace-with-physical-device-model',
  'replace with physical device model',
  'device os',
  'device/os',
  'physical device',
]);

export function isPhysicalDeviceLabel(input: unknown): input is string {
  return (
    typeof input === 'string' &&
    input.trim().length > 0 &&
    !PHYSICAL_DEVICE_LABEL_PLACEHOLDERS.has(normalizePhysicalDeviceLabelKey(input))
  );
}

export function normalizePhysicalDeviceLabelForReport(input: string): string {
  return input
    .trim()
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ');
}

function normalizePhysicalDeviceLabelKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ');
}

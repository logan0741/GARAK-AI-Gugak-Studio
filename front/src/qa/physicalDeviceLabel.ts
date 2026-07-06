const PHYSICAL_DEVICE_LABEL_PLACEHOLDERS = new Set([
  'replace-with-physical-device-model',
  'replace with physical device model',
  'device os',
  'device/os',
  'physical device',
]);

const EMULATOR_DEVICE_LABEL_PATTERNS = [
  /\bemulator\b/,
  /\bavd\b/,
  /\bsdk[_ ]?gphone/,
  /\bgeneric[_ ]?(?:x86|x86_64|arm64)?\b/,
];

export function isPhysicalDeviceLabel(input: unknown): input is string {
  const normalizedKey = typeof input === 'string'
    ? normalizePhysicalDeviceLabelKey(input)
    : undefined;

  return (
    typeof input === 'string' &&
    input.trim().length > 0 &&
    normalizedKey !== undefined &&
    !PHYSICAL_DEVICE_LABEL_PLACEHOLDERS.has(normalizedKey) &&
    !normalizedKey.includes('not connected') &&
    !normalizedKey.includes('no connected') &&
    !isEmulatorDeviceLabel(input)
  );
}

export function isEmulatorDeviceLabel(input: unknown): input is string {
  if (typeof input !== 'string') {
    return false;
  }

  const normalizedKey = normalizePhysicalDeviceLabelKey(input);
  return EMULATOR_DEVICE_LABEL_PATTERNS.some((pattern) => pattern.test(normalizedKey));
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

import { PerformanceEvent } from '../domain/performanceEvent';
import { isPhysicalDeviceLabel } from '../qa/physicalDeviceLabel';
import {
  AudioEngineCandidateId,
  AudioEngineProbe,
} from './audioEngineEvaluation';
import { AudioEngineProbeRecord } from './audioEngineProbeRecord';

export type AudioEngineProbeDraftInput = {
  candidate: AudioEngineCandidateId;
  deviceLabel: string;
  measuredAt: string;
  touchToSoundLatencyMs?: number;
  maxStableVoices?: number;
  pitchBendSmooth?: boolean;
  glissandoEvents?: PerformanceEvent[];
  glissandoTriggeredStrings?: number;
  muteReleaseClean?: boolean;
  preloadStable?: boolean;
  sessionFallbackPreserved?: boolean;
  recordingCaptureSeconds?: number;
};

export type PhysicalDeviceAudioEngineProbeMeasurements = Pick<
  AudioEngineProbe,
  | 'touchToSoundLatencyMs'
  | 'maxStableVoices'
  | 'pitchBendSmooth'
  | 'glissandoTriggeredStrings'
  | 'muteReleaseClean'
  | 'preloadStable'
  | 'sessionFallbackPreserved'
  | 'recordingCaptureSeconds'
>;

const PHYSICAL_DEVICE_MEASUREMENT_FIELDS = [
  'touchToSoundLatencyMs',
  'maxStableVoices',
  'pitchBendSmooth',
  'glissandoTriggeredStrings',
  'muteReleaseClean',
  'preloadStable',
  'sessionFallbackPreserved',
  'recordingCaptureSeconds',
] as const satisfies ReadonlyArray<keyof PhysicalDeviceAudioEngineProbeMeasurements>;

const PHYSICAL_DEVICE_DURATION_FIELDS = [
  'touchToSoundLatencyMs',
  'recordingCaptureSeconds',
] as const satisfies ReadonlyArray<keyof PhysicalDeviceAudioEngineProbeMeasurements>;

const PHYSICAL_DEVICE_COUNT_FIELDS = [
  'maxStableVoices',
  'glissandoTriggeredStrings',
] as const satisfies ReadonlyArray<keyof PhysicalDeviceAudioEngineProbeMeasurements>;

const PHYSICAL_DEVICE_BOOLEAN_FIELDS = [
  'pitchBendSmooth',
  'muteReleaseClean',
  'preloadStable',
  'sessionFallbackPreserved',
] as const satisfies ReadonlyArray<keyof PhysicalDeviceAudioEngineProbeMeasurements>;

const MAX_GAYAGEUM_STRING_COUNT = 12;

export function createAudioEngineProbeDraft(input: AudioEngineProbeDraftInput): AudioEngineProbe {
  return {
    candidate: input.candidate,
    evidenceSource: 'estimate',
    deviceLabel: input.deviceLabel,
    measuredAt: input.measuredAt,
    touchToSoundLatencyMs: input.touchToSoundLatencyMs ?? 0,
    maxStableVoices: input.maxStableVoices ?? 0,
    pitchBendSmooth: input.pitchBendSmooth ?? false,
    glissandoTriggeredStrings:
      input.glissandoTriggeredStrings ??
      countTriggeredGlissandoStrings(input.glissandoEvents ?? []),
    muteReleaseClean: input.muteReleaseClean ?? false,
    preloadStable: input.preloadStable ?? false,
    sessionFallbackPreserved: input.sessionFallbackPreserved ?? false,
    recordingCaptureSeconds: input.recordingCaptureSeconds ?? 0,
  };
}

export function promoteAudioEngineProbeDraftToPhysicalDevice(input: {
  draft: AudioEngineProbe;
  deviceLabel?: string;
  measuredAt?: string;
  measurements: PhysicalDeviceAudioEngineProbeMeasurements;
}): AudioEngineProbe {
  if (input.draft.evidenceSource !== 'estimate') {
    throw new Error('only estimate probe drafts can be promoted to physical-device evidence');
  }

  const missingFields = PHYSICAL_DEVICE_MEASUREMENT_FIELDS.filter(
    (field) => input.measurements[field] === null || input.measurements[field] === undefined,
  );
  if (missingFields.length > 0) {
    throw new Error(`physical-device measurements missing: ${missingFields.join(', ')}`);
  }

  const invalidFields = getInvalidPhysicalDeviceMeasurementFields(input.measurements);
  if (invalidFields.length > 0) {
    throw new Error(`physical-device measurements invalid: ${invalidFields.join(', ')}`);
  }

  const deviceLabel = input.deviceLabel?.trim() || input.draft.deviceLabel.trim();
  if (!isPhysicalDeviceLabel(deviceLabel)) {
    throw new Error('physical-device probe deviceLabel must name the tested physical device');
  }

  return {
    ...input.draft,
    ...input.measurements,
    evidenceSource: 'physical-device',
    deviceLabel,
    measuredAt: input.measuredAt ?? input.draft.measuredAt,
  };
}

export function createAudioEngineProbeRecordDraft(input: {
  generatedAt: string;
  probes: AudioEngineProbeDraftInput[];
}): AudioEngineProbeRecord {
  return {
    generatedAt: input.generatedAt,
    probes: input.probes.map(createAudioEngineProbeDraft),
  };
}

function countTriggeredGlissandoStrings(events: PerformanceEvent[]): number {
  return new Set(
    events
      .filter((event) => event.type === 'glissando_step')
      .map((event) => event.stringIndex),
  ).size;
}

function getInvalidPhysicalDeviceMeasurementFields(
  measurements: PhysicalDeviceAudioEngineProbeMeasurements,
): string[] {
  const invalidFields = getUnexpectedPhysicalDeviceMeasurementFields(measurements);

  for (const field of PHYSICAL_DEVICE_DURATION_FIELDS) {
    if (!isNonNegativeFiniteNumber(measurements[field])) {
      invalidFields.push(field);
    }
  }

  for (const field of PHYSICAL_DEVICE_COUNT_FIELDS) {
    if (!isNonNegativeInteger(measurements[field])) {
      invalidFields.push(field);
    }
  }

  if (
    isNonNegativeInteger(measurements.glissandoTriggeredStrings) &&
    measurements.glissandoTriggeredStrings > MAX_GAYAGEUM_STRING_COUNT
  ) {
    invalidFields.push('glissandoTriggeredStrings');
  }

  for (const field of PHYSICAL_DEVICE_BOOLEAN_FIELDS) {
    if (typeof measurements[field] !== 'boolean') {
      invalidFields.push(field);
    }
  }

  return orderMeasurementFields([...new Set(invalidFields)]);
}

function getUnexpectedPhysicalDeviceMeasurementFields(
  measurements: PhysicalDeviceAudioEngineProbeMeasurements,
): string[] {
  return Object.keys(measurements)
    .filter(
      (field) =>
        !PHYSICAL_DEVICE_MEASUREMENT_FIELDS.includes(
          field as keyof PhysicalDeviceAudioEngineProbeMeasurements,
        ),
    )
    .sort();
}

function orderMeasurementFields(fields: string[]): string[] {
  const order = new Map<string, number>(
    PHYSICAL_DEVICE_MEASUREMENT_FIELDS.map((field, index) => [field, index]),
  );

  return [...fields].sort((left, right) => {
    const leftOrder = order.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right) ?? Number.MAX_SAFE_INTEGER;

    return leftOrder === rightOrder ? left.localeCompare(right) : leftOrder - rightOrder;
  });
}

function isNonNegativeFiniteNumber(input: unknown): input is number {
  return typeof input === 'number' && Number.isFinite(input) && input >= 0;
}

function isNonNegativeInteger(input: unknown): input is number {
  return Number.isInteger(input) && typeof input === 'number' && input >= 0;
}

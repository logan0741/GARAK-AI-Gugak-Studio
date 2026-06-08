import { buildDay5AudioEngineDecisionRecord } from './audioEngineDecisionRecord';
import {
  AudioEngineCandidateId,
  AudioEngineEvidenceSource,
  AudioEngineProbe,
} from './audioEngineEvaluation';

export type AudioEngineProbeRecord = {
  generatedAt: string;
  probes: AudioEngineProbe[];
};

export type AudioEngineProbeRecordParseResult =
  | { ok: true; record: AudioEngineProbeRecord }
  | { ok: false; errors: string[] };

const AUDIO_ENGINE_CANDIDATES: AudioEngineCandidateId[] = [
  'expo-audio',
  'react-native-audio-api',
];

const EVIDENCE_SOURCES: AudioEngineEvidenceSource[] = [
  'physical-device',
  'emulator',
  'unit-test',
  'estimate',
];
const PHYSICAL_DEVICE_LABEL_PLACEHOLDERS = new Set([
  'replace-with-physical-device-model',
]);
const UTC_ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const DURATION_PROBE_FIELDS = ['touchToSoundLatencyMs', 'recordingCaptureSeconds'] as const satisfies ReadonlyArray<
  keyof AudioEngineProbe
>;

const COUNT_PROBE_FIELDS = ['maxStableVoices', 'glissandoTriggeredStrings'] as const satisfies ReadonlyArray<
  keyof AudioEngineProbe
>;
const MAX_GAYAGEUM_STRING_COUNT = 12;

const BOOLEAN_PROBE_FIELDS = [
  'pitchBendSmooth',
  'muteReleaseClean',
  'preloadStable',
  'sessionFallbackPreserved',
] as const satisfies ReadonlyArray<keyof AudioEngineProbe>;

export function parseAudioEngineProbeRecord(input: unknown): AudioEngineProbeRecordParseResult {
  const errors: string[] = [];

  if (!isObject(input)) {
    return {
      ok: false,
      errors: ['record must be an object'],
    };
  }

  if (!isNonEmptyString(input.generatedAt)) {
    errors.push('generatedAt must be a non-empty string');
  } else if (!isUtcIsoTimestamp(input.generatedAt)) {
    errors.push('generatedAt must be a UTC ISO timestamp');
  }
  if (!Array.isArray(input.probes)) {
    errors.push('probes must be an array');
  }

  const probesInput = Array.isArray(input.probes) ? input.probes : [];
  const probes: AudioEngineProbe[] = [];

  probesInput.forEach((probeInput, index) => {
    const path = `probes[${index}]`;
    if (!isObject(probeInput)) {
      errors.push(`${path} must be an object`);
      return;
    }

    const result = parseProbe(probeInput, path);
    errors.push(...result.errors);
    if (result.probe) {
      probes.push(result.probe);
    }
  });

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    record: {
      generatedAt: input.generatedAt as string,
      probes,
    },
  };
}

export function buildDay5AudioEngineDecisionRecordFromProbeRecord(record: AudioEngineProbeRecord) {
  return buildDay5AudioEngineDecisionRecord({
    generatedAt: record.generatedAt,
    probes: record.probes,
  });
}

function parseProbe(
  probe: Record<string, unknown>,
  path: string,
): { errors: string[]; probe?: AudioEngineProbe } {
  const errors: string[] = [];

  if (!AUDIO_ENGINE_CANDIDATES.includes(probe.candidate as AudioEngineCandidateId)) {
    errors.push(`${path}.candidate must be expo-audio or react-native-audio-api`);
  }
  if (!EVIDENCE_SOURCES.includes(probe.evidenceSource as AudioEngineEvidenceSource)) {
    errors.push(`${path}.evidenceSource must be physical-device, emulator, unit-test, or estimate`);
  }
  if (!isNonEmptyString(probe.deviceLabel)) {
    errors.push(`${path}.deviceLabel must be a non-empty string`);
  } else if (
    probe.evidenceSource === 'physical-device' &&
    PHYSICAL_DEVICE_LABEL_PLACEHOLDERS.has(normalizeLabel(probe.deviceLabel))
  ) {
    errors.push(`${path}.deviceLabel must name the physical device when evidenceSource is physical-device`);
  }
  if (!isNonEmptyString(probe.measuredAt)) {
    errors.push(`${path}.measuredAt must be a non-empty string`);
  } else if (!isUtcIsoTimestamp(probe.measuredAt)) {
    errors.push(`${path}.measuredAt must be a UTC ISO timestamp`);
  }

  for (const field of DURATION_PROBE_FIELDS) {
    if (!isNonNegativeFiniteNumber(probe[field])) {
      errors.push(`${path}.${field} must be a finite number >= 0`);
    }
  }

  for (const field of COUNT_PROBE_FIELDS) {
    if (!isNonNegativeInteger(probe[field])) {
      errors.push(`${path}.${field} must be an integer >= 0`);
    }
  }

  if (
    isNonNegativeInteger(probe.glissandoTriggeredStrings) &&
    probe.glissandoTriggeredStrings > MAX_GAYAGEUM_STRING_COUNT
  ) {
    errors.push(`${path}.glissandoTriggeredStrings must be an integer from 0 to 12`);
  }

  for (const field of BOOLEAN_PROBE_FIELDS) {
    if (typeof probe[field] !== 'boolean') {
      errors.push(`${path}.${field} must be a boolean`);
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    probe: {
      candidate: probe.candidate as AudioEngineCandidateId,
      evidenceSource: probe.evidenceSource as AudioEngineEvidenceSource,
      deviceLabel: probe.deviceLabel as string,
      measuredAt: probe.measuredAt as string,
      touchToSoundLatencyMs: probe.touchToSoundLatencyMs as number,
      maxStableVoices: probe.maxStableVoices as number,
      pitchBendSmooth: probe.pitchBendSmooth as boolean,
      glissandoTriggeredStrings: probe.glissandoTriggeredStrings as number,
      muteReleaseClean: probe.muteReleaseClean as boolean,
      preloadStable: probe.preloadStable as boolean,
      sessionFallbackPreserved: probe.sessionFallbackPreserved as boolean,
      recordingCaptureSeconds: probe.recordingCaptureSeconds as number,
    },
  };
}

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function isNonEmptyString(input: unknown): input is string {
  return typeof input === 'string' && input.trim().length > 0;
}

function normalizeLabel(input: string): string {
  return input.trim().toLowerCase();
}

function isUtcIsoTimestamp(input: string): boolean {
  return UTC_ISO_TIMESTAMP_PATTERN.test(input) && Number.isFinite(Date.parse(input));
}

function isNonNegativeFiniteNumber(input: unknown): input is number {
  return typeof input === 'number' && Number.isFinite(input) && input >= 0;
}

function isNonNegativeInteger(input: unknown): input is number {
  return Number.isInteger(input) && typeof input === 'number' && input >= 0;
}

import { PerformanceEvent, assertPerformanceEvent } from '../domain/performanceEvent';
import { Recording, Session } from '../domain/session';

export type PrototypeSessionFallback = {
  format: 'gukak-studio-session-fallback-v1';
  note: string;
  canReplay: boolean;
  eventCount: number;
  session: Session;
};

export type PrototypeSessionFallbackParseResult =
  | { ok: true; fallback: PrototypeSessionFallback }
  | { ok: false; errors: string[] };

const SESSION_FALLBACK_FORMAT = 'gukak-studio-session-fallback-v1';
const SESSION_FALLBACK_NOTE =
  'Copy this JSON as the event-session fallback if audio capture fails.';

export function buildPrototypeSessionFallback(session: Session): PrototypeSessionFallback {
  return {
    format: SESSION_FALLBACK_FORMAT,
    note: SESSION_FALLBACK_NOTE,
    canReplay: session.events.length > 0,
    eventCount: session.events.length,
    session: sanitizeSessionForFallback(session),
  };
}

export function formatPrototypeSessionFallbackForInspector(session: Session): string {
  return JSON.stringify(buildPrototypeSessionFallback(session), null, 2);
}

export function parsePrototypeSessionFallbackJson(
  fallbackJson: string,
): PrototypeSessionFallbackParseResult {
  let fallbackInput: unknown;

  try {
    fallbackInput = JSON.parse(stripUtf8Bom(fallbackJson));
  } catch {
    return {
      ok: false,
      errors: ['fallback JSON must be valid JSON'],
    };
  }

  return parsePrototypeSessionFallback(fallbackInput);
}

function stripUtf8Bom(input: string): string {
  return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
}

export function parsePrototypeSessionFallback(input: unknown): PrototypeSessionFallbackParseResult {
  if (!isObject(input)) {
    return {
      ok: false,
      errors: ['fallback must be an object'],
    };
  }

  const errors: string[] = [];

  if (input.format !== SESSION_FALLBACK_FORMAT) {
    errors.push(`format must be ${SESSION_FALLBACK_FORMAT}`);
  }

  if (!isNonEmptyString(input.note)) {
    errors.push('note must be a non-empty string');
  }

  if (typeof input.canReplay !== 'boolean') {
    errors.push('canReplay must be a boolean');
  }

  if (!isNonNegativeInteger(input.eventCount)) {
    errors.push('eventCount must be an integer >= 0');
  }

  const rawSessionEventCount = getRawSessionEventCount(input.session);
  if (
    isNonNegativeInteger(input.eventCount) &&
    rawSessionEventCount !== null &&
    input.eventCount !== rawSessionEventCount
  ) {
    errors.push('eventCount must match session.events.length');
  }

  const sessionResult = parseFallbackSession(input.session);
  errors.push(...sessionResult.errors);

  const session = sessionResult.session;
  if (session) {
    if (
      isNonNegativeInteger(input.eventCount) &&
      rawSessionEventCount === null &&
      input.eventCount !== session.events.length
    ) {
      errors.push('eventCount must match session.events.length');
    }

    if (typeof input.canReplay === 'boolean' && input.canReplay !== session.events.length > 0) {
      errors.push('canReplay must match whether session has events');
    }
  }

  if (errors.length > 0 || !session) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    fallback: {
      format: SESSION_FALLBACK_FORMAT,
      note: input.note as string,
      canReplay: input.canReplay as boolean,
      eventCount: input.eventCount as number,
      session,
    },
  };
}

function sanitizeSessionForFallback(session: Session): Session {
  const recordingUri = normalizeRecordingUri(session.recordingUri);
  const recordings = session.recordings.flatMap((recording) => {
    const uri = normalizeRecordingUri(recording.uri);
    return uri === null ? [] : [{ ...recording, uri }];
  });
  const sanitizedSession = {
    ...session,
    recordings,
  };

  if (!recordingUri) {
    const { recordingUri: _recordingUri, ...sessionWithoutRecordingUri } = sanitizedSession;
    return sessionWithoutRecordingUri;
  }

  return {
    ...sanitizedSession,
    recordingUri,
  };
}

function normalizeRecordingUri(recordingUri: unknown): string | null {
  if (typeof recordingUri !== 'string') {
    return null;
  }

  const normalizedRecordingUri = recordingUri.trim();
  return normalizedRecordingUri.length > 0 ? normalizedRecordingUri : null;
}

function getRawSessionEventCount(input: unknown): number | null {
  if (!isObject(input) || !Array.isArray(input.events)) {
    return null;
  }

  return input.events.length;
}

function parseFallbackSession(input: unknown): { errors: string[]; session?: Session } {
  const errors: string[] = [];

  if (!isObject(input)) {
    return {
      errors: ['session must be an object'],
    };
  }

  if (!isNonEmptyString(input.id)) {
    errors.push('session.id must be a non-empty string');
  }

  if (!isNonEmptyString(input.createdAt)) {
    errors.push('session.createdAt must be a non-empty string');
  }

  if (!isNonEmptyString(input.sampleAssetManifestVersion)) {
    errors.push('session.sampleAssetManifestVersion must be a non-empty string');
  }

  if (
    input.dataReferenceManifestVersion !== undefined &&
    !isNonEmptyString(input.dataReferenceManifestVersion)
  ) {
    errors.push('session.dataReferenceManifestVersion must be a non-empty string when provided');
  }

  if (input.recordingUri !== undefined && normalizeRecordingUri(input.recordingUri) === null) {
    errors.push('session.recordingUri must be a non-empty string when provided');
  }

  if (!Array.isArray(input.events)) {
    errors.push('session.events must be an array');
  }

  if (!Array.isArray(input.recordings)) {
    errors.push('session.recordings must be an array');
  }

  const events = Array.isArray(input.events)
    ? input.events.flatMap((eventInput, eventIndex) => {
        const eventResult = parseFallbackPerformanceEvent(
          eventInput,
          `session.events[${eventIndex}]`,
        );
        errors.push(...eventResult.errors);
        return eventResult.event ? [eventResult.event] : [];
      })
    : [];
  const recordings = Array.isArray(input.recordings)
    ? input.recordings.flatMap((recordingInput, recordingIndex) => {
        const recordingResult = parseFallbackRecording(
          recordingInput,
          `session.recordings[${recordingIndex}]`,
        );
        errors.push(...recordingResult.errors);
        return recordingResult.recording ? [recordingResult.recording] : [];
      })
    : [];

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    session: {
      id: input.id as string,
      createdAt: input.createdAt as string,
      sampleAssetManifestVersion: input.sampleAssetManifestVersion as string,
      dataReferenceManifestVersion: input.dataReferenceManifestVersion as string | undefined,
      recordingUri:
        input.recordingUri === undefined
          ? undefined
          : (normalizeRecordingUri(input.recordingUri) as string),
      recordings,
      events,
      bpmEstimate: input.bpmEstimate as number | undefined,
      densityEstimate: input.densityEstimate as 'low' | 'medium' | 'high' | undefined,
      jangdanRecommendation: input.jangdanRecommendation as
        | 'jungmori'
        | 'gutgeori'
        | 'jajinmori'
        | undefined,
    },
  };
}

function parseFallbackPerformanceEvent(
  input: unknown,
  path: string,
): { errors: string[]; event?: PerformanceEvent } {
  const errors: string[] = [];

  if (!isObject(input)) {
    return {
      errors: [`${path} must be an object`],
    };
  }

  const type = input.type;
  if (!isPerformanceEventType(type)) {
    errors.push(`${path}.type must be a known PerformanceEvent type`);
  }

  if (!isFiniteNumber(input.tsMs)) {
    errors.push(`${path}.tsMs must be a finite number`);
  }

  if (!isStringIndex(input.stringIndex)) {
    errors.push(`${path}.stringIndex must be an integer from 1 to 12`);
  }

  if (type === 'string_pluck' || type === 'glissando_step') {
    if (!isFiniteNumber(input.velocity)) {
      errors.push(`${path}.velocity must be a finite number`);
    }
  }

  if (type === 'string_bend' && !isFiniteNumber(input.cents)) {
    errors.push(`${path}.cents must be a finite number`);
  }

  if (type === 'string_mute' && !isFiniteNumber(input.strength)) {
    errors.push(`${path}.strength must be a finite number`);
  }

  if (errors.length > 0 || !isPerformanceEventType(type)) {
    return { errors };
  }

  const event = buildPerformanceEventFromInput(input, type);
  assertPerformanceEvent(event);

  return {
    errors: [],
    event,
  };
}

function buildPerformanceEventFromInput(
  input: Record<string, unknown>,
  type: PerformanceEvent['type'],
): PerformanceEvent {
  if (type === 'string_pluck' || type === 'glissando_step') {
    return {
      type,
      tsMs: input.tsMs as number,
      stringIndex: input.stringIndex as number,
      velocity: input.velocity as number,
    };
  }

  if (type === 'string_bend') {
    return {
      type,
      tsMs: input.tsMs as number,
      stringIndex: input.stringIndex as number,
      cents: input.cents as number,
    };
  }

  if (type === 'string_mute') {
    return {
      type,
      tsMs: input.tsMs as number,
      stringIndex: input.stringIndex as number,
      strength: input.strength as number,
    };
  }

  return {
    type: 'string_release',
    tsMs: input.tsMs as number,
    stringIndex: input.stringIndex as number,
  };
}

function parseFallbackRecording(
  input: unknown,
  path: string,
): { errors: string[]; recording?: Recording } {
  const errors: string[] = [];

  if (!isObject(input)) {
    return {
      errors: [`${path} must be an object`],
    };
  }

  if (!isNonEmptyString(input.id)) {
    errors.push(`${path}.id must be a non-empty string`);
  }

  if (input.kind !== 'live_capture') {
    errors.push(`${path}.kind must be live_capture`);
  }

  const uri = normalizeRecordingUri(input.uri);
  if (uri === null) {
    errors.push(`${path}.uri must be a non-empty string`);
  }

  if (errors.length > 0 || uri === null) {
    return { errors };
  }

  return {
    errors: [],
    recording: {
      id: input.id as string,
      kind: 'live_capture',
      uri,
    },
  };
}

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function isNonEmptyString(input: unknown): input is string {
  return typeof input === 'string' && input.trim().length > 0;
}

function isNonNegativeInteger(input: unknown): input is number {
  return typeof input === 'number' && Number.isInteger(input) && input >= 0;
}

function isFiniteNumber(input: unknown): input is number {
  return typeof input === 'number' && Number.isFinite(input);
}

function isStringIndex(input: unknown): input is number {
  return typeof input === 'number' && Number.isInteger(input) && input >= 1 && input <= 12;
}

function isPerformanceEventType(input: unknown): input is PerformanceEvent['type'] {
  return (
    input === 'string_pluck' ||
    input === 'string_bend' ||
    input === 'string_mute' ||
    input === 'glissando_step' ||
    input === 'string_release'
  );
}

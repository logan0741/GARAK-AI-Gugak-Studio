import { Session } from '../domain/session';

export type PrototypeSessionFallback = {
  format: 'gukak-studio-session-fallback-v1';
  note: string;
  canReplay: boolean;
  eventCount: number;
  session: Session;
};

const SESSION_FALLBACK_NOTE =
  'Copy this JSON as the event-session fallback if audio capture fails.';

export function buildPrototypeSessionFallback(session: Session): PrototypeSessionFallback {
  return {
    format: 'gukak-studio-session-fallback-v1',
    note: SESSION_FALLBACK_NOTE,
    canReplay: session.events.length > 0,
    eventCount: session.events.length,
    session: sanitizeSessionForFallback(session),
  };
}

export function formatPrototypeSessionFallbackForInspector(session: Session): string {
  return JSON.stringify(buildPrototypeSessionFallback(session), null, 2);
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

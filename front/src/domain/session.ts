import { PerformanceEvent, assertPerformanceEvent } from './performanceEvent';

export type Recording = {
  id: string;
  kind: 'live_capture';
  uri: string;
};

export type Session = {
  id: string;
  createdAt: string;
  sampleAssetManifestVersion: string;
  dataReferenceManifestVersion?: string;
  events: PerformanceEvent[];
  recordings: Recording[];
  recordingUri?: string;
  bpmEstimate?: number;
  densityEstimate?: 'low' | 'medium' | 'high';
  jangdanRecommendation?: 'jungmori' | 'gutgeori' | 'jajinmori';
};

export function createEmptySession(input: {
  id: string;
  createdAt: string;
  sampleAssetManifestVersion: string;
  dataReferenceManifestVersion?: string;
}): Session {
  return {
    id: input.id,
    createdAt: input.createdAt,
    sampleAssetManifestVersion: input.sampleAssetManifestVersion,
    dataReferenceManifestVersion: input.dataReferenceManifestVersion,
    events: [],
    recordings: [],
  };
}

export function appendPerformanceEvent(session: Session, event: PerformanceEvent): Session {
  assertPerformanceEvent(event);

  return {
    id: session.id,
    createdAt: session.createdAt,
    sampleAssetManifestVersion: session.sampleAssetManifestVersion,
    dataReferenceManifestVersion: session.dataReferenceManifestVersion,
    recordingUri: session.recordingUri,
    recordings: [...session.recordings],
    events: [...session.events, event],
  };
}

export function attachRecordingUriToSession(session: Session, recordingUri: string): Session {
  const normalizedRecordingUri = recordingUri.trim();

  if (normalizedRecordingUri.length === 0) {
    return session;
  }

  return {
    ...session,
    recordingUri: normalizedRecordingUri,
    recordings: [
      ...session.recordings,
      {
        id: `recording-${session.recordings.length + 1}`,
        kind: 'live_capture',
        uri: normalizedRecordingUri,
      },
    ],
  };
}

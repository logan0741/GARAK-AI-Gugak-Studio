import { PerformanceEvent } from './performanceEvent';

export type Session = {
  id: string;
  createdAt: string;
  sampleAssetManifestVersion: string;
  events: PerformanceEvent[];
  recordingUri?: string;
  bpmEstimate?: number;
  densityEstimate?: 'low' | 'medium' | 'high';
  jangdanRecommendation?: 'jungmori' | 'gutgeori' | 'jajinmori';
};

export function createEmptySession(input: {
  id: string;
  createdAt: string;
  sampleAssetManifestVersion: string;
}): Session {
  return {
    id: input.id,
    createdAt: input.createdAt,
    sampleAssetManifestVersion: input.sampleAssetManifestVersion,
    events: [],
  };
}

export function appendPerformanceEvent(session: Session, event: PerformanceEvent): Session {
  return {
    id: session.id,
    createdAt: session.createdAt,
    sampleAssetManifestVersion: session.sampleAssetManifestVersion,
    recordingUri: session.recordingUri,
    events: [...session.events, event],
  };
}

export function attachRecordingUriToSession(session: Session, recordingUri: string): Session {
  return {
    ...session,
    recordingUri,
  };
}

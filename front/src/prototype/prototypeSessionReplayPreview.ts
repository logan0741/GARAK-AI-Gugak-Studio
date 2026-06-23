import { SampleAssetManifest } from '../domain/sampleManifest';
import { planSessionReplay } from '../domain/replayPlanner';
import { Session } from '../domain/session';

export type PrototypeSessionReplayPreview =
  | {
      durationMs: 0;
      eventCount: 0;
      status: 'waiting';
      text: string;
    }
  | {
      durationMs: number;
      eventCount: number;
      status: 'ready';
      text: string;
    }
  | {
      durationMs: 0;
      errorMessage: string;
      eventCount: number;
      status: 'blocked';
      text: string;
    };

export function createPrototypeSessionReplayPreview(
  session: Session,
  sampleAssetManifest: SampleAssetManifest,
): PrototypeSessionReplayPreview {
  if (session.events.length === 0) {
    return {
      durationMs: 0,
      eventCount: 0,
      status: 'waiting',
      text: 'Replay waiting: 0 events',
    };
  }

  try {
    const schedule = planSessionReplay(session, sampleAssetManifest);

    return {
      durationMs: schedule.durationMs,
      eventCount: schedule.items.length,
      status: 'ready',
      text: `Replay ready: ${schedule.items.length} events, ${schedule.durationMs} ms`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      durationMs: 0,
      errorMessage,
      eventCount: session.events.length,
      status: 'blocked',
      text: `Replay blocked: ${errorMessage}`,
    };
  }
}

export function formatPrototypeSessionReplayPreview(
  preview: PrototypeSessionReplayPreview,
): string {
  return preview.text;
}

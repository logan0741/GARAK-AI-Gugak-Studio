import { planSessionReplay } from '../domain/replayPlanner';
import { validateSampleAssetManifest } from '../domain/sampleManifest';
import {
  PrototypeSessionFallback,
  parsePrototypeSessionFallbackJson,
} from './prototypeSessionFallback';

export type PrototypeSessionFallbackCommandInput = {
  argv: string[];
  readTextFile: (path: string) => string;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export type PrototypeSessionFallbackSummaryStatus =
  | 'REPLAYABLE_SESSION_FALLBACK'
  | 'NOT_REPLAYABLE_SESSION_FALLBACK';

export type PrototypeSessionFallbackSummary = {
  status: PrototypeSessionFallbackSummaryStatus;
  sessionId: string;
  eventCount: number;
  sampleAssetManifestVersion: string;
  replaySchedule?: {
    durationMs: number;
    itemCount: number;
  };
};

export function runPrototypeSessionFallbackCommand(
  input: PrototypeSessionFallbackCommandInput,
): number {
  const [sessionFallbackPath, sampleManifestPath] = input.argv;

  if (!sessionFallbackPath) {
    input.writeStderr(
      'Usage: npm run qa:session-fallback -- <session-fallback.json> [sample-manifest.json]',
    );
    return 1;
  }

  let fallbackText: string;

  try {
    fallbackText = input.readTextFile(sessionFallbackPath);
  } catch {
    input.writeStderr(`Could not read session fallback: ${sessionFallbackPath}`);
    return 1;
  }

  const parseResult = parsePrototypeSessionFallbackJson(fallbackText);
  if (!parseResult.ok) {
    input.writeStderr(`Could not parse session fallback: ${parseResult.errors.join('; ')}`);
    return 1;
  }

  let replaySchedule: PrototypeSessionFallbackSummary['replaySchedule'];
  if (sampleManifestPath) {
    let manifestText: string;

    try {
      manifestText = input.readTextFile(sampleManifestPath);
    } catch {
      input.writeStderr(`Could not read sample manifest: ${sampleManifestPath}`);
      return 1;
    }

    let manifestInput: unknown;

    try {
      manifestInput = JSON.parse(stripUtf8Bom(manifestText));
    } catch {
      input.writeStderr(`Invalid JSON in sample manifest: ${sampleManifestPath}`);
      return 1;
    }

    try {
      const manifest = validateSampleAssetManifest(manifestInput);
      const schedule = planSessionReplay(parseResult.fallback.session, manifest);
      replaySchedule = {
        durationMs: schedule.durationMs,
        itemCount: schedule.items.length,
      };
    } catch (error) {
      input.writeStderr(`Could not plan session fallback replay: ${getErrorMessage(error)}`);
      return 1;
    }
  }

  const summary = summarizePrototypeSessionFallback(parseResult.fallback, replaySchedule);
  input.writeStdout(formatPrototypeSessionFallbackSummary(summary));
  return summary.status === 'REPLAYABLE_SESSION_FALLBACK' ? 0 : 1;
}

export function summarizePrototypeSessionFallback(
  fallback: PrototypeSessionFallback,
  replaySchedule?: PrototypeSessionFallbackSummary['replaySchedule'],
): PrototypeSessionFallbackSummary {
  return {
    status:
      fallback.canReplay && fallback.eventCount > 0
        ? 'REPLAYABLE_SESSION_FALLBACK'
        : 'NOT_REPLAYABLE_SESSION_FALLBACK',
    sessionId: fallback.session.id,
    eventCount: fallback.eventCount,
    replaySchedule,
    sampleAssetManifestVersion: fallback.session.sampleAssetManifestVersion,
  };
}

export function formatPrototypeSessionFallbackSummary(
  summary: PrototypeSessionFallbackSummary,
): string {
  return [
    '# Session Fallback Summary',
    '',
    `- Status: ${summary.status}`,
    `- Session: ${summary.sessionId}`,
    `- Event count: ${summary.eventCount}`,
    `- Sample manifest: ${summary.sampleAssetManifestVersion}`,
    ...(summary.replaySchedule
      ? [
          `- Replay schedule: ${summary.replaySchedule.itemCount} items, ${summary.replaySchedule.durationMs} ms`,
        ]
      : []),
  ].join('\n');
}

function stripUtf8Bom(input: string): string {
  return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

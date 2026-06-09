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
};

export function runPrototypeSessionFallbackCommand(
  input: PrototypeSessionFallbackCommandInput,
): number {
  const [sessionFallbackPath] = input.argv;

  if (!sessionFallbackPath) {
    input.writeStderr('Usage: npm run qa:session-fallback -- <session-fallback.json>');
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

  const summary = summarizePrototypeSessionFallback(parseResult.fallback);
  input.writeStdout(formatPrototypeSessionFallbackSummary(summary));
  return summary.status === 'REPLAYABLE_SESSION_FALLBACK' ? 0 : 1;
}

export function summarizePrototypeSessionFallback(
  fallback: PrototypeSessionFallback,
): PrototypeSessionFallbackSummary {
  return {
    status:
      fallback.canReplay && fallback.eventCount > 0
        ? 'REPLAYABLE_SESSION_FALLBACK'
        : 'NOT_REPLAYABLE_SESSION_FALLBACK',
    sessionId: fallback.session.id,
    eventCount: fallback.eventCount,
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
  ].join('\n');
}

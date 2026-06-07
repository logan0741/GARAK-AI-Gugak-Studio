import { formatDay5AudioEngineDecisionSummary } from './audioEngineDecisionSummary';
import {
  buildDay5AudioEngineDecisionRecordFromProbeRecord,
  parseAudioEngineProbeRecord,
} from './audioEngineProbeRecord';

export type Day5AudioEngineProbeHandoffResult =
  | { ok: true; output: string }
  | { ok: false; output: string };

export function buildDay5AudioEngineProbeHandoff(input: unknown): Day5AudioEngineProbeHandoffResult {
  const parseResult = parseAudioEngineProbeRecord(input);

  if (!parseResult.ok) {
    return {
      ok: false,
      output: formatInvalidProbeRecord(parseResult.errors),
    };
  }

  return {
    ok: true,
    output: formatDay5AudioEngineDecisionSummary(
      buildDay5AudioEngineDecisionRecordFromProbeRecord(parseResult.record),
    ),
  };
}

export function formatDay5AudioEngineProbeHandoff(input: unknown): string {
  return buildDay5AudioEngineProbeHandoff(input).output;
}

function formatInvalidProbeRecord(errors: string[]): string {
  return [
    '# Day 5 Audio Engine Probe Handoff',
    '',
    '- Status: INVALID_PROBE_RECORD',
    '- Decision summary: not generated',
    '',
    '## Errors',
    '',
    ...errors.map((error) => `- ${error}`),
  ].join('\n');
}

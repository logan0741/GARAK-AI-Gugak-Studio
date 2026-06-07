import { formatDay5AudioEngineDecisionSummary } from './audioEngineDecisionSummary';
import {
  buildDay5AudioEngineDecisionRecordFromProbeRecord,
  parseAudioEngineProbeRecord,
} from './audioEngineProbeRecord';

export function formatDay5AudioEngineProbeHandoff(input: unknown): string {
  const parseResult = parseAudioEngineProbeRecord(input);

  if (!parseResult.ok) {
    return formatInvalidProbeRecord(parseResult.errors);
  }

  return formatDay5AudioEngineDecisionSummary(
    buildDay5AudioEngineDecisionRecordFromProbeRecord(parseResult.record),
  );
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

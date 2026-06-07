import { Day5AudioEngineDecisionRecord } from './audioEngineDecisionRecord';

export function formatDay5AudioEngineDecisionSummary(
  record: Day5AudioEngineDecisionRecord,
): string {
  return [
    '# Day 5 Audio Engine Decision Summary',
    '',
    `- Generated at: ${record.generatedAt}`,
    `- Status: ${record.status}`,
    `- Selected engine: ${record.selection.selectedCandidate ?? 'none'}`,
    `- Decision: ${record.selection.decision}`,
    `- Reason: ${record.selection.reason}`,
    `- Missing candidates: ${formatList(record.missingCandidates)}`,
    `- Duplicate candidates: ${formatList(record.duplicateCandidates)}`,
    '',
    '| Candidate | Decision | Passed core criteria | Failed criteria |',
    '| --- | --- | --- | --- |',
    ...record.evaluations.map(
      (evaluation) =>
        `| ${evaluation.candidate} | ${evaluation.decision} | ${evaluation.passedCoreCriteria}/5 | ${formatList(
          evaluation.failedCriteria,
        )} |`,
    ),
  ].join('\n');
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : 'none';
}

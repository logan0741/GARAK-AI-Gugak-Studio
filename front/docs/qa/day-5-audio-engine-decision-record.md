# Day 5 Audio Engine Decision Record

Status: awaiting physical-device measurements  
Owner: Front-end spike  
Scope: Week 1 final audio-engine gate

## Responsibility

Use this document after Day 2, Day 3, and Day 4 smoke checks have been run on a physical device. The decision record converts measured candidate probes into the final Day 5 status. It must not be used to select an engine from estimates, emulator results, or unit-test results.

## Code Under Test

| File | Responsibility |
| --- | --- |
| `src/audio/audioEngineEvaluation.ts` | Evaluates one physical-device probe against Day 5 pass/fail criteria. |
| `src/audio/audioEngineProbeRecord.ts` | Validates a manual QA probe record before building the Day 5 decision record. |
| `src/audio/audioEngineDecisionRecord.ts` | Builds the Day 5 record across required candidates and prevents final selection while required physical-device probes are missing. |
| `src/audio/audioEngineDecisionSummary.ts` | Formats the Day 5 decision record as a stable Markdown summary for QA handoff and review. |
| `src/audio/__tests__/audioEngineProbeRecord.test.ts` | Verifies probe-record parsing, invalid field errors, and estimate records staying incomplete. |
| `src/audio/__tests__/audioEngineDecisionRecord.test.ts` | Verifies incomplete evidence, final selection, and no-final-engine outcomes. |
| `src/audio/__tests__/audioEngineDecisionSummary.test.ts` | Verifies selected and incomplete decision summaries do not imply the wrong engine state. |

## Required Inputs

Record exactly one physical-device `AudioEngineProbe` per required candidate:

```ts
{
  candidate: 'expo-audio',
  evidenceSource: 'physical-device',
  deviceLabel: '',
  measuredAt: '',
  touchToSoundLatencyMs: 0,
  maxStableVoices: 0,
  pitchBendSmooth: false,
  glissandoTriggeredStrings: 0,
  muteReleaseClean: false,
  preloadStable: false,
  sessionFallbackPreserved: false,
  recordingCaptureSeconds: 0,
}
```

Required candidates for Week 1:

| Candidate | Source Smoke |
| --- | --- |
| `expo-audio` | `docs/qa/day-2-expo-audio-smoke.md` |
| `react-native-audio-api` | `docs/qa/day-3-react-native-audio-api-smoke.md` |

This candidate set is fixed for the Week 1 Day 5 gate. Callers must not narrow it to force an early final selection.

Only probes with `evidenceSource: 'physical-device'` count as measured for this record. Emulator, unit-test, and estimate probes may support development, but they do not satisfy the Day 5 final-selection gate.

If a required candidate has more than one physical-device probe in a single record, the record reports it in `duplicateCandidates` and does not select a final engine. Consolidate repeated measurements into one candidate probe before publishing the Day 5 decision.

Touch model evidence comes from `docs/qa/day-4-touch-model-smoke.md` and should be reflected in the glissando, pitch bend, mute, and session fallback fields.

## Probe Record Handoff

Use `docs/qa/day-5-audio-engine-probes.example.json` as the starting shape for a manual QA handoff. Keep `evidenceSource: 'estimate'` until the values have been measured on a physical Android or iOS device. After physical-device measurement, each required candidate should appear once with `evidenceSource: 'physical-device'`.

Before publishing the Day 5 record, parse the handoff object through `src/audio/audioEngineProbeRecord.ts`, then build the decision record from the parsed result. Format the result with `src/audio/audioEngineDecisionSummary.ts` when copying the decision into a review note, handoff, or final QA log. Do not bypass this parser when moving values from QA notes into the final Day 5 decision.

## Status Rules

| Status | Rule |
| --- | --- |
| `INCOMPLETE_DEVICE_EVIDENCE` | At least one required candidate has no physical-device probe, or a required candidate has duplicate physical-device probes. Do not select an engine. |
| `FINAL_ENGINE_SELECTED` | Required candidates are measured and the strongest evaluation is `PASS` or `PASS_WITH_LIMITS`. |
| `NO_FINAL_ENGINE` | Required candidates are measured, but no candidate passes the Day 5 gate. Pause Week 2 feature work. |

## Automated Verification

Run before publishing a Day 5 record:

```bash
npm test src/audio/__tests__/audioEngineDecisionRecord.test.ts
npm test src/audio/__tests__/audioEngineProbeRecord.test.ts
npm test src/audio/__tests__/audioEngineDecisionSummary.test.ts
npm run typecheck
```

Expected result: all commands exit 0.

## Current Record

| Field | Value |
| --- | --- |
| Status | `INCOMPLETE_DEVICE_EVIDENCE` |
| Reason | Physical-device probes for both required candidates have not been recorded yet. |
| Duplicate candidates | none |
| Selected engine | none |

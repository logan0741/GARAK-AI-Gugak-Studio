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
| `src/audio/audioEngineProbeDraft.ts` | Creates `estimate` probe drafts from observed QA values before a tester promotes measured values into a physical-device handoff. Draft output is not final-selection evidence. |
| `src/audio/audioEngineProbeRecord.ts` | Validates a manual QA probe record before building the Day 5 decision record. |
| `src/audio/audioEngineDecisionRecord.ts` | Builds the Day 5 record across required candidates and prevents final selection while required physical-device probes are missing. |
| `src/audio/audioEngineDecisionSummary.ts` | Formats the Day 5 decision record as a stable Markdown summary for QA handoff and review. |
| `src/audio/audioEngineProbeHandoff.ts` | One-call handoff boundary that either reports probe-record parse errors or returns the formatted Day 5 decision summary. |
| `src/prototype/prototypeQaSnapshot.ts` | Prototype-only read model that tracks observable fake counters and renders an estimate inspector template with nullable physical-device measurement fields. |
| `scripts/day5-audio-engine-handoff.ts` | Node-only QA command entry point used by `npm run qa:day5-audio -- <probe-record.json>`. |
| `src/audio/__tests__/audioEngineProbeDraft.test.ts` | Verifies draft probes stay `estimate`, count triggered glissando strings, and can be wrapped in a probe record. |
| `src/prototype/__tests__/prototypeQaSnapshot.test.ts` | Verifies the prototype inspector draft does not claim audible-quality or physical-device evidence automatically. |
| `src/audio/__tests__/audioEngineProbeRecord.test.ts` | Verifies probe-record parsing, invalid field errors, and estimate records staying incomplete. |
| `src/audio/__tests__/audioEngineDecisionRecord.test.ts` | Verifies incomplete evidence, final selection, and no-final-engine outcomes. |
| `src/audio/__tests__/audioEngineDecisionSummary.test.ts` | Verifies selected and incomplete decision summaries do not imply the wrong engine state. |
| `src/audio/__tests__/audioEngineProbeHandoffCommand.test.ts` | Verifies CLI command behavior for missing arguments, invalid JSON, and readable handoff files. |
| `src/audio/__tests__/audioEngineProbeHandoff.test.ts` | Verifies invalid handoffs do not generate decision summaries and valid handoffs do. |

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

When a draft is promoted to `physical-device`, `deviceLabel` must be replaced with the tested physical model, for example `Galaxy S24 / Android 15` or `iPhone 15 / iOS 18`. The parser rejects the estimate placeholder `replace-with-physical-device-model` for physical-device evidence.

If a required candidate has more than one physical-device probe in a single record, the record reports it in `duplicateCandidates` and does not select a final engine. Consolidate repeated measurements into one candidate probe before publishing the Day 5 decision.

Touch model evidence comes from `docs/qa/day-4-touch-model-smoke.md` and should be reflected in the glissando, pitch bend, mute, and session fallback fields.

## Probe Record Handoff

Use `docs/qa/day-5-audio-engine-probes.example.json` as the starting shape for a manual QA handoff. Keep `evidenceSource: 'estimate'` until the values have been measured on a physical Android or iOS device. After physical-device measurement, each required candidate should appear once with `evidenceSource: 'physical-device'`.

If a device smoke harness collects partial observations first, it may use `createAudioEngineProbeDraft()` to format those observations into the same shape. Drafts always use `evidenceSource: 'estimate'`; promote a draft to `physical-device` only after the tester has confirmed the values on the physical device and checked audible quality fields such as pitch-bend smoothness and mute release cleanliness.

The prototype inspector may show a copyable `Probe draft (estimate only, fake engine counters)` JSON block. Treat it as a rehearsal artifact: it can preserve fake observed counters and show the probe field names, but nullable physical-device measurement fields must be replaced with measured values from the real candidate runtime before any Day 5 handoff. The inspector JSON includes `runtimeUnderTest: "fake-sampler-engine"` and `measuredCandidateEvidence: false` to prevent confusing fake-engine counters with candidate-engine measurements.

Before publishing the Day 5 record, run the QA command entry point:

```bash
npm run qa:day5-audio -- docs/qa/day-5-audio-engine-probes.example.json
```

Replace the example path with the filled physical-device probe record when publishing a real Day 5 handoff. The command uses the parser, decision record, and summary formatter in order, so invalid probe records produce error output instead of a misleading engine decision.

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
npm test src/audio/__tests__/audioEngineProbeDraft.test.ts
npm test src/prototype/__tests__/prototypeQaSnapshot.test.ts
npm test src/audio/__tests__/audioEngineProbeRecord.test.ts
npm test src/audio/__tests__/audioEngineDecisionSummary.test.ts
npm test src/audio/__tests__/audioEngineProbeHandoff.test.ts
npm test src/audio/__tests__/audioEngineProbeHandoffCommand.test.ts
npm run qa:day5-audio -- docs/qa/day-5-audio-engine-probes.example.json
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

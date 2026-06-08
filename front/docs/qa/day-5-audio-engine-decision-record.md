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
| `src/audio/audioEngineProbeDraft.ts` | Creates `estimate` probe drafts from observed QA values and promotes a draft to `physical-device` only when every manual measurement field is supplied explicitly as a non-null value. Draft output is not final-selection evidence. |
| `src/audio/audioEngineProbeRecord.ts` | Validates a manual QA probe record before building the Day 5 decision record. |
| `src/audio/audioEngineDecisionRecord.ts` | Builds the Day 5 record across required candidates and prevents final selection while required physical-device probes are missing. |
| `src/audio/audioEngineDecisionSummary.ts` | Formats the Day 5 decision record as a stable Markdown summary for QA handoff and review. |
| `src/audio/audioEngineProbeHandoff.ts` | One-call handoff boundary that either reports probe-record parse errors or returns the formatted Day 5 decision summary. |
| `src/qa/week1SmokeReportCommand.ts` | CLI command boundary that validates Day 2, Day 3, and Day 4 physical-device smoke report completeness before Day 5 review. |
| `src/qa/week1SmokeTemplateCommand.ts` | CLI command boundary that generates a blocked Week 1 smoke report template with every required Day 2/3/4 check ID. |
| `src/qa/day5ReadinessCommand.ts` | CLI command boundary that confirms the completed Week 1 smoke report and Day 5 probe record are aligned before the final decision command. |
| `src/prototype/prototypeQaSnapshot.ts` | Prototype-only read model that tracks observable fake counters and renders estimate probe and prototype handoff templates with nullable physical-device measurement fields. |
| `src/prototype/prototypeProbeHandoff.ts` | Converts prototype inspector drafts into physical-device probes or a Day 5 probe record only when observed runtime context proves each requested native candidate is ready. |
| `src/prototype/prototypeHandoffMergeCommand.ts` | CLI command boundary that combines separately copied prototype handoff files and rejects duplicate candidate entries without promoting measurements. |
| `src/prototype/prototypeHandoffCheckCommand.ts` | CLI command boundary that checks a filled prototype handoff for required candidates, duplicate candidates, physical device label consistency, UTC ISO timestamps, missing manual measurements, runtime readiness, and generated probe-record parser validity before probe-record generation. |
| `src/prototype/prototypeProbeHandoffCommand.ts` | CLI command boundary that reads a prototype handoff JSON, validates the generated Day 5 probe record, and writes it without selecting the final engine. |
| `scripts/day5-audio-engine-handoff.ts` | Node-only QA command entry point used by `npm run qa:day5-audio -- <probe-record.json>`. |
| `scripts/week1-smoke-report.ts` | Node-only QA command entry point used by `npm run qa:week1-smoke-report -- <week1-smoke-report.json>`. |
| `scripts/week1-smoke-template.ts` | Node-only QA command entry point used by `npm run qa:week1-smoke-template -- <output-json> <tester> <device-label>`. |
| `scripts/day5-readiness.ts` | Node-only QA command entry point used by `npm run qa:day5-readiness -- <week1-smoke-report.json> <probe-record.json>`. |
| `scripts/day5-prototype-handoff-merge.ts` | Node-only QA command entry point used by `npm run qa:prototype-handoff-merge -- <output-handoff.json> <prototype-handoff.json...>`. |
| `scripts/day5-prototype-handoff-check.ts` | Node-only QA command entry point used by `npm run qa:prototype-handoff-check -- <prototype-handoff.json>`. |
| `scripts/day5-prototype-probe-record.ts` | Node-only QA command entry point used by `npm run qa:prototype-probe-record -- <prototype-handoff.json> <probe-record.json>`. |
| `src/audio/__tests__/audioEngineProbeDraft.test.ts` | Verifies draft probes stay `estimate`, count triggered glissando strings, can be wrapped in a probe record, and require explicit measurements before physical-device promotion. |
| `src/qa/__tests__/week1SmokeReportCommand.test.ts` | Verifies the Week 1 smoke report command rejects missing, duplicate, blocked, or malformed Day 2/3/4 smoke evidence while preserving final engine selection for Day 5. |
| `src/qa/__tests__/week1SmokeTemplateCommand.test.ts` | Verifies the Week 1 smoke template command writes every required check as blocked and rejects placeholder device labels before file output. |
| `src/qa/__tests__/day5ReadinessCommand.test.ts` | Verifies Week 1 smoke evidence and Day 5 probe records are ready only when both required candidates are measured on the same physical device. |
| `src/prototype/__tests__/prototypeQaSnapshot.test.ts` | Verifies the prototype inspector draft does not claim audible-quality or physical-device evidence automatically. |
| `src/prototype/__tests__/prototypeProbeHandoff.test.ts` | Verifies prototype inspector promotion rejects fake, preloading, or missing runtime observation before physical-device probe or record creation. |
| `src/prototype/__tests__/prototypeHandoffMergeCommand.test.ts` | Verifies separately copied prototype handoff files can be merged and duplicate candidates are rejected. |
| `src/prototype/__tests__/prototypeHandoffCheckCommand.test.ts` | Verifies filled prototype handoff files are reported as ready only when both required candidates, physical device labels, UTC ISO timestamps, all manual measurements, and ready native runtime observations are present. |
| `src/prototype/__tests__/prototypeProbeHandoffCommand.test.ts` | Verifies the prototype handoff CLI command emits usage, readable errors, and parseable Day 5 probe record JSON. |
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

When a draft is promoted to `physical-device`, `deviceLabel` must be replaced with the tested physical model, for example `Galaxy S24 / Android 15` or `iPhone 15 / iOS 18`. The parser rejects estimate placeholders such as `replace-with-physical-device-model`, `Device / OS`, or `physical device` for physical-device evidence.

Use UTC ISO timestamps for both `generatedAt` and `measuredAt`, for example `2026-06-08T01:00:00.000Z`. Localized strings such as `June 8, 2026` or slash-separated dates are rejected by the parser.

`glissandoTriggeredStrings` is the count of unique strings triggered during a 12-string swipe. It must be an integer from 0 to 12; values above 12 are treated as handoff input errors, not better results.

If a required candidate has more than one physical-device probe in a single record, the record reports it in `duplicateCandidates` and does not select a final engine. Consolidate repeated measurements into one candidate probe before publishing the Day 5 decision.

Touch model evidence comes from `docs/qa/day-4-touch-model-smoke.md` and should be reflected in the glissando, pitch bend, mute, and session fallback fields.

Before building the Day 5 record, create and validate the Week 1 smoke report:

```bash
npm run qa:week1-smoke-template -- <week1-smoke-report.json> <tester> "<device-label>"
npm run qa:week1-smoke-report -- <week1-smoke-report.json>
```

The template command starts every required check as `blocked`; fill each result from physical-device QA before validation. The smoke report proves Day 2, Day 3, and Day 4 physical-device smoke procedures were actually recorded. It may include failed checks for Day 5 review, but missing areas, duplicate areas, missing checks, duplicate checks, or blocked checks must be resolved before relying on the Day 5 record.

After a physical-device probe record exists, run the readiness gate before the final decision command:

```bash
npm run qa:day5-readiness -- <week1-smoke-report.json> <probe-record.json>
```

The readiness gate requires `READY_FOR_DAY5_DECISION`. It checks that the Week 1 smoke report is complete, the probe record has one physical-device probe for both required candidates, and the physical-device labels match across the smoke report and probe record. It reports failed smoke checks for review context, but it does not write files and does not select a final engine.

## Probe Record Handoff

Use `docs/qa/day-5-audio-engine-probes.example.json` as the starting shape for a manual QA handoff. Keep `evidenceSource: 'estimate'` until the values have been measured on a physical Android or iOS device. After physical-device measurement, each required candidate should appear once with `evidenceSource: 'physical-device'`.

If a device smoke harness collects partial observations first, it may use `createAudioEngineProbeDraft()` to format those observations into the same shape. Drafts always use `evidenceSource: 'estimate'`; promote a draft to `physical-device` only after the tester has confirmed every value on the physical device and checked audible quality fields such as pitch-bend smoothness and mute release cleanliness. `promoteAudioEngineProbeDraftToPhysicalDevice()` requires all Day 5 measurement fields to be non-null before changing `evidenceSource`, but the resulting probe still must pass `parseAudioEngineProbeRecord()` and the `npm run qa:day5-audio -- <probe-record.json>` handoff.

The prototype inspector may show a copyable `Probe draft (estimate only, fake engine counters)` JSON block and a `Prototype handoff JSON` block. Treat both as rehearsal artifacts until the tester replaces every nullable `measurements` field with measured values from the real candidate runtime. The inspector JSON includes `runtimeUnderTest: "fake-sampler-engine"` and `measuredCandidateEvidence: false` to prevent confusing fake-engine counters with candidate-engine measurements. Before using `prototypeProbeHandoff.ts`, confirm `observedRuntime.activeRuntime` matches the candidate and both runtime status and native preload status are ready; fake fallback and preloading states must not be promoted.

When starting from prototype inspector drafts, copy the inspector's `Prototype handoff JSON`, replace every `measurements` null with manual physical-device values, combine one filled entry per required candidate, and run:

```bash
npm run qa:prototype-probe-record -- <prototype-handoff.json> <probe-record.json>
```

If the two candidate handoffs are saved as separate files, merge them first:

```bash
npm run qa:prototype-handoff-merge -- <merged-handoff.json> <expo-handoff.json> <rn-audio-api-handoff.json>
```

The merge command does not promote evidence or fill manual values. It only combines `entries[]` and rejects duplicate candidates so the resulting file can be passed to `qa:prototype-probe-record`.

Before generating the probe record, run the readiness check:

```bash
npm run qa:prototype-handoff-check -- <merged-handoff.json>
```

The check must report `READY_FOR_PROBE_RECORD`. It does not write a probe record or select an engine; it only catches missing candidates, duplicate candidates, placeholder or mismatched device labels, candidate entries from different physical device labels, invalid timestamps, unexpected sample manifest versions, nullable manual measurement fields, runtime readiness issues, and generated probe-record validation issues before `qa:prototype-probe-record`.

The `qa:prototype-probe-record` command only produces and parser-validates the probe record JSON. It does not replace the final `qa:day5-audio` decision check.

Before publishing the Day 5 record, run the QA command entry point:

```bash
npm run qa:day5-readiness -- <week1-smoke-report.json> <probe-record.json>
npm run qa:day5-audio -- <probe-record.json>
```

Use the filled physical-device probe record when publishing a real Day 5 handoff. The command uses the parser, decision record, and summary formatter in order, so invalid probe records produce error output instead of a misleading engine decision.

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
npm test src/qa/__tests__/week1SmokeReportCommand.test.ts
npm test src/qa/__tests__/week1SmokeTemplateCommand.test.ts
npm test src/qa/__tests__/day5ReadinessCommand.test.ts
npm test src/prototype/__tests__/prototypeQaSnapshot.test.ts
npm test src/prototype/__tests__/prototypeProbeHandoff.test.ts
npm test src/prototype/__tests__/prototypeHandoffMergeCommand.test.ts
npm test src/prototype/__tests__/prototypeHandoffCheckCommand.test.ts
npm test src/audio/__tests__/audioEngineProbeRecord.test.ts
npm test src/audio/__tests__/audioEngineDecisionSummary.test.ts
npm test src/audio/__tests__/audioEngineProbeHandoff.test.ts
npm test src/audio/__tests__/audioEngineProbeHandoffCommand.test.ts
npm test src/prototype/__tests__/prototypeProbeHandoffCommand.test.ts
npm run qa:day5-readiness -- <week1-smoke-report.json> <probe-record.json>
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

# Day 5 Audio Engine Decision Record

Status: awaiting physical-device measurements  
Owner: Front-end spike  
Scope: Week 1 final audio-engine gate

## Responsibility

Use this document after Day 2, Day 3, and Day 4 smoke checks have been run on a physical device. The decision record converts measured candidate probes into the final Day 5 status. It must not be used to select an engine from estimates, emulator results, or unit-test results.

## Code Under Test

| File | Responsibility |
| --- | --- |
| `src/audio/audioEngineEvaluation.ts` | Evaluates one physical-device probe against Day 5 pass/fail criteria and treats non-finite, out-of-range, or non-boolean manual measurements as failed criteria. |
| `src/audio/audioEngineProbeDraft.ts` | Creates `estimate` probe drafts from observed QA values and promotes a draft to `physical-device` only when every manual measurement field is supplied explicitly as a non-null, correctly typed, in-range value and the resolved device label names the tested physical device. Draft output is not final-selection evidence. |
| `src/audio/audioEngineProbeRecord.ts` | Validates a manual QA probe record before building the Day 5 decision record. |
| `src/audio/audioEngineDecisionRecord.ts` | Builds the Day 5 record across required candidates and prevents final selection while required physical-device probes are missing, duplicated, still using placeholder labels, or copied from different physical device labels. |
| `src/audio/audioEngineDecisionSummary.ts` | Formats the Day 5 decision record as a stable Markdown summary for QA handoff and review. |
| `src/audio/audioEngineProbeHandoff.ts` | One-call handoff boundary that either reports probe-record parse errors or returns the formatted Day 5 decision summary. |
| `src/qa/physicalDeviceLabel.ts` | Shared physical-device label predicate and slash/whitespace normalization used by Week 1 smoke, Day 5 probe, readiness, and prototype handoff gates. |
| `src/qa/week1SmokeReportCommand.ts` | CLI command boundary that validates Day 2, Day 3, and Day 4 physical-device smoke report completeness and same-device evidence before Day 5 review. |
| `src/qa/week1SmokeTemplateCommand.ts` | CLI command boundary that generates a blocked Week 1 smoke report template with every required Day 2/3/4 check ID. |
| `src/qa/day5ReadinessCommand.ts` | CLI command boundary that confirms the completed Week 1 smoke report and Day 5 probe record are aligned before the final decision command. |
| `src/prototype/prototypeNativeSamplerEngineFactory.ts` | Prototype native sampler boundary that rejects unsupported candidate IDs before sample resolution or native preload, then routes only `expo-audio` or `react-native-audio-api` into the matching runtime. |
| `src/prototype/prototypeQaSnapshot.ts` | Prototype-only read model that tracks observable fake counters and renders estimate probe and prototype handoff templates with nullable physical-device measurement fields. |
| `src/prototype/prototypeProbeHandoff.ts` | Converts prototype inspector drafts into physical-device probes or a Day 5 probe record only when estimate-only inspector guard fields are intact, device labels name the same physical device, and observed runtime context proves each requested native candidate is ready and uses the Week 1 fixture sample manifest. |
| `src/prototype/prototypeHandoffFile.ts` | Shared parser for prototype handoff JSON files used by merge, readiness, and probe-record commands. |
| `src/prototype/prototypeHandoffMergeCommand.ts` | CLI command boundary that combines separately copied prototype handoff files and rejects duplicate candidate entries or mixed physical device labels without promoting measurements. |
| `src/prototype/prototypeHandoffCheckCommand.ts` | CLI command boundary that checks a filled prototype handoff for required candidates, duplicate candidates, physical device label consistency, UTC ISO timestamps, expected sample manifest version, missing or invalid manual measurements, runtime readiness, and generated probe-record parser validity before probe-record generation. |
| `src/prototype/prototypeProbeHandoffCommand.ts` | CLI command boundary that reads a prototype handoff JSON, validates its handoff shape, enforces runtime and sample-manifest promotion guards, validates the generated Day 5 probe record, and writes it without selecting the final engine. |
| `scripts/day5-audio-engine-handoff.ts` | Node-only QA command entry point used by `npm run qa:day5-audio -- <probe-record.json>`. |
| `scripts/week1-smoke-report.ts` | Node-only QA command entry point used by `npm run qa:week1-smoke-report -- <week1-smoke-report.json>`. |
| `scripts/week1-smoke-template.ts` | Node-only QA command entry point used by `npm run qa:week1-smoke-template -- <output-json> <tester> <device-label>`. |
| `scripts/day5-readiness.ts` | Node-only QA command entry point used by `npm run qa:day5-readiness -- <week1-smoke-report.json> <probe-record.json>`. |
| `scripts/day5-prototype-handoff-merge.ts` | Node-only QA command entry point used by `npm run qa:prototype-handoff-merge -- <output-handoff.json> <prototype-handoff.json...>`. |
| `scripts/day5-prototype-handoff-check.ts` | Node-only QA command entry point used by `npm run qa:prototype-handoff-check -- <prototype-handoff.json>`. |
| `scripts/day5-prototype-probe-record.ts` | Node-only QA command entry point used by `npm run qa:prototype-probe-record -- <prototype-handoff.json> <probe-record.json>`. |
| `src/audio/__tests__/audioEngineProbeDraft.test.ts` | Verifies draft probes stay `estimate`, count triggered glissando strings, can be wrapped in a probe record, and require explicit measurements before physical-device promotion. |
| `src/qa/__tests__/physicalDeviceLabel.test.ts` | Verifies placeholder rejection and physical-device label normalization stay consistent across QA gates. |
| `src/qa/__tests__/week1SmokeReportCommand.test.ts` | Verifies the Week 1 smoke report command rejects missing, duplicate, blocked, mixed-device, or malformed Day 2/3/4 smoke evidence while preserving final engine selection for Day 5. |
| `src/qa/__tests__/week1SmokeTemplateCommand.test.ts` | Verifies the Week 1 smoke template command writes every required check as blocked and rejects placeholder device labels before file output. |
| `src/qa/__tests__/day5ReadinessCommand.test.ts` | Verifies Week 1 smoke evidence and Day 5 probe records are ready only when both required candidates are measured on the same physical device. |
| `src/prototype/__tests__/prototypeNativeSamplerEngineFactory.test.ts` | Verifies native sampler creation rejects unsupported candidate IDs before touching sample assets or native runtimes, and preloads supported candidates through the correct runtime. |
| `src/prototype/__tests__/prototypeQaSnapshot.test.ts` | Verifies the prototype inspector draft does not claim audible-quality or physical-device evidence automatically. |
| `src/prototype/__tests__/prototypeProbeHandoff.test.ts` | Verifies prototype inspector promotion rejects edited guard fields, fake fallback, preloading, mismatched sample-manifest, or missing runtime observation before physical-device probe or record creation. |
| `src/prototype/__tests__/prototypeHandoffMergeCommand.test.ts` | Verifies separately copied prototype handoff files can be merged and duplicate candidates are rejected. |
| `src/prototype/__tests__/prototypeHandoffCheckCommand.test.ts` | Verifies filled prototype handoff files are reported as ready only when both required candidates, physical device labels, UTC ISO timestamps, valid manual measurements, and ready native runtime observations are present. |
| `src/prototype/__tests__/prototypeProbeHandoffCommand.test.ts` | Verifies the prototype handoff CLI command requires an output path, emits readable errors, and writes parseable Day 5 probe record JSON. |
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

If a caller bypasses `parseAudioEngineProbeRecord()` and passes an unexpected candidate into the decision builder, that probe is ignored for measured-candidate, duplicate-candidate, evaluation, and final-selection purposes. The Week 1 decision can only be made from `expo-audio` and `react-native-audio-api` physical-device probes.

When a draft is promoted to `physical-device`, `deviceLabel` must be replaced with the tested physical model, for example `Galaxy S24 / Android 15` or `iPhone 15 / iOS 18`. The parser rejects estimate placeholders such as `replace-with-physical-device-model`, `Device / OS`, or `physical device` for physical-device evidence.

Use UTC ISO timestamps for both `generatedAt` and `measuredAt`, for example `2026-06-08T01:00:00.000Z`. Localized strings such as `June 8, 2026`, slash-separated dates, or impossible calendar dates such as `2026-02-31T10:00:00.000Z` are rejected by the parser. `generatedAt` must be at or after every probe `measuredAt` timestamp so a final handoff cannot predate the physical-device measurements it contains.

`glissandoTriggeredStrings` is the count of unique strings triggered during a 12-string swipe. It must be an integer from 0 to 12; values above 12 are treated as handoff input errors, not better results.

The decision evaluator is also conservative if a caller bypasses the parser: negative or non-finite duration values, fractional voice/string counts, values above the 12-string glissando range, or non-boolean audible-quality fields are counted as failed Day 5 criteria rather than passing by JavaScript truthiness.

If a required candidate has more than one physical-device probe in a single record, the record reports it in `duplicateCandidates` and does not select a final engine. Consolidate repeated measurements into one candidate probe before publishing the Day 5 decision.

All physical-device probes in the final decision record must name a real tested device and must use one tested device label after trimming whitespace and normalizing slash spacing. If a caller bypasses the parser with blank or placeholder labels, or if candidate probes come from different physical devices, the decision record reports `deviceLabelIssues`, keeps `status: 'INCOMPLETE_DEVICE_EVIDENCE'`, and does not select a final engine.

Touch model evidence comes from `docs/qa/day-4-touch-model-smoke.md` and should be reflected in the glissando, pitch bend, mute, and session fallback fields.

Before building the Day 5 record, create and validate the Week 1 smoke report:

```bash
npm run qa:week1-smoke-template -- <week1-smoke-report.json> <tester> "<device-label>"
npm run qa:week1-smoke-report -- <week1-smoke-report.json>
```

The template command starts every required check as `blocked`; fill each result from physical-device QA before validation. The smoke report proves Day 2, Day 3, and Day 4 physical-device smoke procedures were actually recorded on one physical device label. It may include failed checks for Day 5 review, but missing areas, duplicate areas, missing checks, duplicate checks, mixed device labels, blocked checks, or failed checks without notes must be resolved before relying on the Day 5 record.

After a physical-device probe record exists, run the readiness gate before the final decision command:

```bash
npm run qa:day5-readiness -- <week1-smoke-report.json> <probe-record.json>
```

The readiness gate requires `READY_FOR_DAY5_DECISION`. It checks that the Week 1 smoke report is complete, the probe record has one physical-device probe for both required candidates, the physical-device labels match across the smoke report and probe record after trimming surrounding whitespace, and every physical-device probe `measuredAt` is at or after the latest Week 1 smoke run `testedAt`. If the smoke report is incomplete, `Smoke report issues` includes the concrete missing, duplicate, blocked, or device-label causes. It reports failed smoke checks for review context, but it does not write files and does not select a final engine.

## Probe Record Handoff

Use `docs/qa/day-5-audio-engine-probes.example.json` as the starting shape for a manual QA handoff. Keep `evidenceSource: 'estimate'` until the values have been measured on a physical Android or iOS device. After physical-device measurement, each required candidate should appear once with `evidenceSource: 'physical-device'`.

If a device smoke harness collects partial observations first, it may use `createAudioEngineProbeDraft()` to format those observations into the same shape. Drafts always use `evidenceSource: 'estimate'`; promote a draft to `physical-device` only after the tester has confirmed every value on the physical device, replaced placeholder device labels with the tested model/OS, and checked audible quality fields such as pitch-bend smoothness and mute release cleanliness. `promoteAudioEngineProbeDraftToPhysicalDevice()` requires all Day 5 measurement fields to be non-null, correctly typed, and in range, and it rejects placeholder-like physical-device labels before changing `evidenceSource`; the resulting probe still must pass `parseAudioEngineProbeRecord()` and the `npm run qa:day5-audio -- <probe-record.json>` handoff.

The prototype inspector may show a copyable `Probe draft (estimate only, fake engine counters)` JSON block and a `Prototype handoff JSON` block. Treat both as rehearsal artifacts until the tester replaces every nullable `measurements` field with measured values from the real candidate runtime. The inspector JSON includes `runtimeUnderTest: "fake-sampler-engine"` and `measuredCandidateEvidence: false` to prevent confusing fake-engine counters with candidate-engine measurements. Before using `prototypeProbeHandoff.ts`, confirm the copied inspector guard fields still match the estimate-only prototype shape, draft and handoff device labels name the same physical device, `observedRuntime.activeRuntime` matches the candidate, both runtime status and native preload status are ready, `observedRuntime.sampleManifestVersion` is `dev-synthetic-gayageum-2026-06-08`, and `observedRuntime.unexpectedStringIndexes` is absent; edited guard fields, placeholder or mismatched device labels, fake fallback, preloading states, unexpected sample string indexes, and mismatched sample fixtures must not be promoted.

When starting from prototype inspector drafts, copy the inspector's `Prototype handoff JSON`, replace every `measurements` null with manual physical-device values, combine one filled entry per required candidate, and run:

```bash
npm run qa:prototype-probe-record -- <prototype-handoff.json> <probe-record.json>
```

If the two candidate handoffs are saved as separate files, merge them first:

```bash
npm run qa:prototype-handoff-merge -- <merged-handoff.json> <expo-handoff.json> <rn-audio-api-handoff.json>
```

The merge command does not promote evidence or fill manual values. It combines `entries[]`, rejects duplicate candidates, and rejects mixed physical device labels after trimming whitespace and normalizing slash spacing so the resulting file can be passed to `qa:prototype-probe-record`.
It also rejects placeholder or blank device labels, invalid generated timestamps, input handoffs whose `generatedAt` predates their measured entries, and output `generatedAt` values that predate measured handoff entries before writing output, including labels still present inside the copied inspector draft.

Before generating the probe record, run the readiness check:

```bash
npm run qa:prototype-handoff-check -- <merged-handoff.json>
```

The check must report `READY_FOR_PROBE_RECORD`. It does not write a probe record or select an engine; it only catches missing candidates, duplicate candidates, placeholder or mismatched device labels, candidate entries from different physical device labels, invalid timestamps including impossible calendar dates or `generatedAt` values that predate handoff measurements, unexpected sample manifest versions, nullable or invalid manual measurement fields, runtime readiness issues, and generated probe-record validation issues before `qa:prototype-probe-record`. Manual measurement fields are closed to the Day 5 schema: `touchToSoundLatencyMs`, `maxStableVoices`, `pitchBendSmooth`, `glissandoTriggeredStrings`, `muteReleaseClean`, `preloadStable`, `sessionFallbackPreserved`, and `recordingCaptureSeconds`. Extra keys in `measurements` are invalid measurement fields and must be removed before probe-record generation. The `qa:prototype-probe-record` command reuses the same readiness report and refuses to write output if the handoff is not ready.

`qa:prototype-handoff-check` compares handoff `deviceLabel` values and inspector draft `probeTemplate.deviceLabel` values after trimming whitespace and normalizing slash spacing. For example, `Pixel 8/Android 15` and `Pixel 8 / Android 15` are treated as the same physical device; different model names still fail the handoff check.

`qa:prototype-handoff-check` also rejects inspector drafts whose guard fields were edited away from the prototype shape: `measuredCandidateEvidence` must stay `false`, `runtimeUnderTest` must stay `fake-sampler-engine`, and `probeTemplate.evidenceSource` must stay `estimate` until physical-device measurements are promoted into a separate probe record.

The `qa:prototype-probe-record` command first validates the handoff JSON shape, then enforces runtime readiness and the expected sample manifest, then produces and parser-validates the probe record JSON. It does not replace the final `qa:day5-audio` decision check.

`qa:day5-readiness` compares the Week 1 smoke report and probe record device labels after trimming whitespace and normalizing slash spacing. For example, `Pixel 8/Android 15` and `Pixel 8 / Android 15` are treated as the same physical device; different model names still fail readiness. It also rejects physical-device probes whose `measuredAt` predates the latest Week 1 smoke run `testedAt`, because the Day 5 probe record must be created from evidence available after the Day 2, Day 3, and Day 4 smoke procedures have run.

Before publishing the Day 5 record, run the QA command entry point:

```bash
npm run qa:day5-readiness -- <week1-smoke-report.json> <probe-record.json>
npm run qa:day5-audio -- <probe-record.json>
```

Use the filled physical-device probe record when publishing a real Day 5 handoff. The command uses the parser, decision record, and summary formatter in order, so invalid probe records produce error output instead of a misleading engine decision.

## Status Rules

| Status | Rule |
| --- | --- |
| `INCOMPLETE_DEVICE_EVIDENCE` | At least one required candidate has no physical-device probe, a required candidate has duplicate physical-device probes, or physical-device probes have placeholder, blank, or mixed device labels. Do not select an engine. |
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
npm test src/prototype/__tests__/prototypeNativeSamplerEngineFactory.test.ts
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
| Device label issues | none |
| Selected engine | none |

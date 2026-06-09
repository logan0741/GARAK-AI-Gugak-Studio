# Day 5 Audio Engine Checklist

Status: Week 2 physical-device gate; required before choosing the real `SamplerEngine` implementation
Scope: Week 1 audio and touch spike for the 12-string gayageum prototype

Related candidate smoke checks:

- Candidate A `expo-audio`: `docs/qa/day-2-expo-audio-smoke.md`
- Candidate B `react-native-audio-api`: `docs/qa/day-3-react-native-audio-api-smoke.md`
- Touch model: `docs/qa/day-4-touch-model-smoke.md`
- Week 1 smoke report: `docs/qa/week-1-smoke-report.md`
- Decision record: `docs/qa/day-5-audio-engine-decision-record.md`
- Probe record example: `docs/qa/day-5-audio-engine-probes.example.json`

Use this checklist on a physical Android or iOS device during Week 2. Do not use an emulator to judge audio latency, dropout, click noise, pitch bend quality, or mute release quality.

Week 1 may continue implementation work on the domain model, prototype UI, sample fixtures, recording fallback, and QA harness. Do not publish a final audio-engine selection until the Week 2 physical-device probes and smoke report pass the readiness gate.

Web smoke checks are allowed only for layout, blank-screen, fake fallback interaction, and inspector-state regressions. Web runs intentionally keep active runtime on `fake-prototype`; web results must not be used as physical-device audio evidence.

## Development Client Setup

Native audio candidates require an Expo development client. Verify the config before device QA:

```bash
npm run samples:generate-dev
npm test src/config/__tests__/developmentBuildConfig.test.ts
npm test src/prototype/__tests__/prototypeSampleManifest.test.ts
npm test src/prototype/__tests__/prototypeRecordingProbeController.test.ts
npm run start:dev-client
```

For cloud or local native builds, use the `development` profile in `eas.json`. Expo Go is not valid evidence for Day 5 native audio candidate selection.

The `development` profile must keep `developmentClient: true` and `autoIncrement: true`, and `cli.appVersionSource` must remain `remote`. The config test above is the source-controlled guard for this build contract before physical-device QA starts.

The generated `dev-synthetic-gayageum-2026-06-08` samples are Week 1 technical fixtures only. They are valid for checking whether a candidate engine can preload and play 12 local WAV files, but they are not final instrument assets and do not prove release sound quality.

The prototype native sampler factory must resolve each fixture sample to a non-empty local URI before a candidate runtime is loaded. Empty resolved URIs or `http(s)` URIs are invalid for normal-play latency checks.

Candidate engines must reject non-finite playback control values before touching native player, node, or automation state. `velocity`, `cents`, and `strength` may be clamped when finite, but `NaN` or infinite values must fail at the `SamplerEngine` boundary instead of becoming device QA evidence.

## Device Setup

| Field | Value |
| --- | --- |
| Date |  |
| Tester |  |
| Device model |  |
| OS version |  |
| Build type | Expo dev build / native debug / native release |
| Audio output | Built-in speaker / wired headphones / external speaker |
| Bluetooth disabled for primary latency test | yes / no |
| Engine candidate | `react-native-audio-api` / `expo-audio` / other |
| Sample manifest version |  |

## Hard Pass Criteria

| Check | Pass Criteria | Result | Notes |
| --- | --- | --- | --- |
| Touch-to-sound latency | No perceived delay on device; target <= 50 ms |  |  |
| Polyphony | At least 8 simultaneous voices play without audible dropout |  |  |
| Pitch bend | Hold-drag changes pitch smoothly without click noise or abrupt jumps |  |  |
| Glissando | A swipe across all 12 strings triggers every open string in order |  |  |
| Mute | Ji-eum or cover gesture produces a natural release curve without pop noise |  |  |
| Preload | Normal playing does not trigger runtime file loading or visible waiting |  |  |
| Session fallback | `PerformanceEvent[]` remains saved and replayable if audio capture fails |  |  |
| Recording possibility | Native path can capture at least 10 seconds of live performance audio and play the captured URI back, or fallback decision is recorded |  |  |

## Automated Evaluation Record

After the physical-device test, transfer the measured values into the same shape used by `src/audio/audioEngineEvaluation.ts`.

During rehearsal, `src/audio/audioEngineProbeDraft.ts` can create an `estimate` draft from observed values. That draft is useful for checking JSON shape and glissando counts, but it does not satisfy the Day 5 final gate. Only a tester-reviewed probe with `evidenceSource: 'physical-device'` counts.

The prototype inspector also reports `observedFakeCounters.eventDispatchLatency`. This is a debug-only measurement from the first `PerformanceEvent.tsMs` in a handled batch to the moment the current `SamplerEngine` dispatch call returns. It is useful for spotting JS event pipeline regressions, but it is not touch-to-sound latency evidence and must not be copied into `touchToSoundLatencyMs`.

The copyable prototype probe draft includes `observedRuntime` for handoff traceability. Use it to confirm whether the selected candidate actually became the active runtime on the device build, but keep all final gate fields under a separate `physical-device` probe.

If a candidate cannot start, stop, or play a recording probe, copy `observedPrototypeRecording.fallbackReason` and the `Session fallback` JSON. This records the fallback decision for review, but it is not a passing 10-second capture result. When the filled prototype handoff uses `recordingCaptureSeconds: 0`, the matching inspector draft must include a non-empty fallback reason or `qa:prototype-handoff-check` rejects the recording measurement.

Recording probes reject non-finite, zero, or negative requested durations before touching native recording APIs, and reject non-positive or non-finite native start response durations before entering the `recording` state. The Week 1 prototype UI should use the fixed `Rec 10s` path for candidate evidence.

For recording probes, a non-finite or negative native recorder duration is normalized to `0` captured seconds before it reaches the prototype inspector. Treat that as failed recording evidence unless the tester has a separate verified 10-second capture and playback result.

Captured recording URIs are trimmed before they are stored or sent to playback. Whitespace-only URIs are treated as missing capture output and must not be copied as recording evidence.

Captured playback must use the current candidate's recording probe state. After changing the requested candidate, `Play Rec` must not reuse a stale session recording URI from the previous candidate.

When a new capture result is recorded, `observedPrototypeRecording.playbackConfirmed` must reset to `false`. When a recording fallback is recorded, `capturedSeconds`, `uriAvailable`, and `playbackConfirmed` must reset so stale capture evidence is not copied. Treat playback confirmation as valid only after `Play Rec` succeeds for the current captured URI; a playback confirmation without a current captured URI, URI availability, and no fallback reason must remain `false`. A zero or invalid captured duration must keep `playbackConfirmed: false` and record `fallbackReason: "recording_capture_duration_invalid"` even when a URI is present.

When `Prototype handoff JSON` is filled with any positive `recordingCaptureSeconds`, the matching inspector draft must show `observedPrototypeRecording.capturedSeconds` greater than or equal to that measurement, `uriAvailable: true`, `playbackConfirmed: true`, and `fallbackReason: null`. Otherwise `qa:prototype-handoff-check` must report `recordingCaptureSeconds` as an invalid measurement field. This prevents a fallback, stale recording observation, or inflated capture duration from becoming recording evidence, including under-10-second `PASS_WITH_LIMITS` evidence.

`Rec 10s` must be unavailable while a recording probe is active, and `Stop Rec` must be unavailable unless the current probe state is `recording`. Do not create fallback evidence by pressing stop while idle or by starting a second recording before the first probe is stopped.

```ts
{
  candidate: 'react-native-audio-api' | 'expo-audio',
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

Decision mapping:

| Decision | Code rule |
| --- | --- |
| `PASS` | All hard criteria pass, including at least 10 seconds of recording capture. |
| `PASS_WITH_LIMITS` | Core loop, preload, and session fallback pass, but recording is under 10 seconds. |
| `FAIL` | At least one core criterion, preload, or session fallback fails. |
| `NO_GO` | Fewer than two core audio criteria pass. |

After exactly one physical-device probe per candidate is recorded, run `npm run qa:day5-readiness -- <week1-smoke-report.json> <probe-record.json>` before the final Day 5 handoff. The readiness gate must report `READY_FOR_DAY5_DECISION`, proving that the completed Week 1 smoke report and the Day 5 probe record refer to the same physical device and that probe `measuredAt` values do not predate the latest Week 1 smoke run `testedAt`.

Then run the handoff object through `npm run qa:day5-audio -- <probe-record.json>`. The handoff must return parse errors for invalid records, or a formatted Day 5 decision summary for valid records. The record must remain `INCOMPLETE_DEVICE_EVIDENCE` until both `expo-audio` and `react-native-audio-api` have `evidenceSource: 'physical-device'` probe values, no candidate appears more than once, and all physical-device probes use one device label after trimming whitespace and normalizing slash spacing.

Before relying on the Day 5 record, create the Week 1 smoke report with `npm run qa:week1-smoke-template -- <week1-smoke-report.json> <tester> "<device-label>"`, fill it from device QA, then validate it with `npm run qa:week1-smoke-report -- <week1-smoke-report.json>`. The smoke report must show Day 2, Day 3, and Day 4 were all recorded on one physical device label without missing areas, duplicate areas, missing checks, duplicate checks, blocked checks, or failed checks with blank notes.

## Current Prototype Smoke Test

The current branch provides a `PanResponder` instrument surface for tap, swipe glissando, hold-drag bend, broad-contact ji-eum mute, release, deterministic `Bend` and `Mute` probe controls, an 8-voice polyphony burst control, requested candidate, active runtime, runtime status, sample manifest version, sample provenance and release-quality warning, native preload status, recording probe controls including captured playback, recording/playback status, recording observation counters, missing sample string indexes, duplicate sample string indexes, unexpected sample string indexes, session event count, local jangdan recommendation preview, audible fake voice count, event-to-dispatch latency debug counters, command log, audio failure status with batch handled/failed event context, a copyable `Probe draft (estimate only, fake engine counters)` JSON block, a copyable `Prototype handoff JSON` block for the `qa:prototype-probe-record` command, and a copyable `Session fallback` JSON block in the prototype inspector.

1. Open the 12-string prototype screen on a physical device or Expo dev build.
2. Enter the tested physical device and OS in `Device / OS`, for example `Pixel 8 / Android 15`, and confirm `probeTemplate.deviceLabel` no longer uses `replace-with-physical-device-model`. If the input is cleared or set to a placeholder-like value such as `Device / OS`, confirm the copyable draft returns to `replace-with-physical-device-model` instead of keeping a stale or fake device label.
3. Confirm the inspector separates requested candidate from active runtime. If no complete 12-string sample manifest is passed into the host, if any string index is duplicated, or if any string index is outside the 1-12 prototype range, active runtime must remain `fake-prototype`.
4. Confirm sample manifest version is `dev-synthetic-gayageum-2026-06-08`, sample provenance shows 12 `own_asset` technical fixture assets, and the sample quality warning says the fixture must be replaced before release-quality sound decisions.
5. Confirm a complete manifest moves through `native_candidate_preloading`; active runtime must remain `fake-prototype` until native preload succeeds.
6. If native preload fails, confirm runtime status is `native_candidate_failed` and session event logging still works through the fake fallback.
7. If native preload succeeds, confirm runtime status is `native_candidate_ready` and active runtime matches the requested candidate.
8. Press `Rec 10s` and confirm unsupported engines report `recording_probe_not_supported` without stopping session event logging.
9. If active runtime is `expo-audio`, press `Rec 10s`, confirm `Rec 10s` is unavailable while recording and `Stop Rec` is available only during the active recording, interact for about 10 seconds, press `Stop Rec`, and record the captured seconds and URI shown in the inspector. Confirm `observedPrototypeRecording.capturedSeconds` and `uriAvailable` in the probe draft. Then press `Play Rec` and confirm `playbackConfirmed` becomes `true` for the current candidate recording probe. If recording is unsupported or fails, confirm `observedPrototypeRecording.fallbackReason` records the reason.
10. Touch each string once from 1 to 12 and confirm `string_pluck` appears on touch start and `string_release` appears on touch end.
11. Swipe across the instrument surface and confirm crossed strings emit ordered `glissando_step` events.
12. Hold one string and drag horizontally after the hold threshold; confirm `string_bend` appears as the latest event.
13. Use a broad or multi-touch contact and confirm `string_mute` appears.
14. Press `Bend` and confirm the event count increments by 4, `pitchBendObserved` becomes `true` in the probe draft, and the current engine handles a pluck, two bends, and release without audio failure.
15. Press `Mute` and confirm the event count increments by 3, `muteObserved` becomes `true` in the probe draft, and the current engine handles a pluck, mute, and release without audio failure.
16. Confirm `Jangdan preview` stays `waiting for event context` before at least 4 pluck-like events, then shows a local recommendation with score, BPM, density, and reason after enough tap or glissando events. This preview must not auto-start accompaniment.
17. Press `Glissando` and confirm the event count increments by 12.
18. Press `8 Voice` and confirm the event count increments by 8. On device, listen for dropout or voice stealing; on web fake runtime, confirm audible fake voice count reaches at least 8 before release cleanup.
19. While active runtime is `fake-prototype`, confirm audible fake voice count grows for plucks and does not count released voices.
20. Confirm audio status remains `ok` while the current engine handles events. If a batch fails, confirm it reports handled event count, total event count, failed event index, error message, and failed `PerformanceEvent` while the session fallback still preserves the full event batch.
21. Confirm the probe draft exposes `observedFakeCounters.eventDispatchLatency` after at least one handled event batch, and keep `probeTemplate.touchToSoundLatencyMs` as `null` until physical-device audio latency is measured.
22. Confirm the `Session fallback (copyable)` JSON uses format `gukak-studio-session-fallback-v1`, has `canReplay: true` after at least one event, preserves the full `Session.events` list even if recording is unsupported or fails, trims captured recording URIs, and omits null, empty, or whitespace-only recording URIs.
23. Confirm the probe draft keeps `evidenceSource: "estimate"`, includes `runtimeUnderTest: "fake-sampler-engine"`, exposes `observedRuntime` with requested candidate, active runtime, runtime status, native preload status, sample manifest version, and preload error if present, keeps unmeasured physical-device fields as `null`, exposes recording observations and fallback reason only under `observedPrototypeRecording`, and does not show a Day 5 decision or selected engine.
24. Confirm `Prototype handoff JSON` has `generatedAt`, one `entries[]` item for the current candidate, the same `inspectorDraft`, and `measurements` fields set to `null` until the tester replaces them with physical-device values.
25. If candidate handoffs were copied into separate files, run `npm run qa:prototype-handoff-merge -- <merged-handoff.json> <expo-handoff.json> <rn-audio-api-handoff.json>`. The merge must reject duplicate candidates, placeholder or blank device labels, invalid generated timestamps, input or output `generatedAt` values that predate measured entries, and candidate entries copied from different physical device labels; slash spacing differences such as `Pixel 8/Android 15` and `Pixel 8 / Android 15` are treated as the same label.
26. Run `npm run qa:prototype-handoff-check -- <merged-handoff.json>` and confirm `READY_FOR_PROBE_RECORD` before generating the probe record. Resolve missing candidates, duplicate candidates, device label issues, timestamp issues including `generatedAt` values that predate measured handoff entries, manifest issues, inspector draft issues, nullable or invalid measurement fields, runtime readiness issues, or generated probe-record validation issues first.
27. Run `npm run qa:prototype-probe-record -- <merged-handoff.json> <probe-record.json>`; the command reuses the `READY_FOR_PROBE_RECORD` gate and must reject missing or duplicate candidates, device-label issues, timestamp issues, inspector draft issues, nullable or invalid measurements, non-ready runtimes, generated probe-record validation issues, any `sampleManifestVersion` other than `dev-synthetic-gayageum-2026-06-08`, or any copied `unexpectedStringIndexes` field before it writes output.
28. Run `npm run qa:day5-readiness -- <week1-smoke-report.json> <probe-record.json>` and confirm `READY_FOR_DAY5_DECISION`.
29. Run `npm run qa:day5-audio -- <probe-record.json>`.

## Day 5 Full Test Script

Prerequisite: before running this full script, the active `SamplerEngine` candidate must expose tap playback, hold-drag pitch bend, mute or cover gesture, and recording or explicit recording fallback behavior in the device build. For fixture-based runs, record sample manifest version `dev-synthetic-gayageum-2026-06-08` and note that the result is engine evidence, not final sound-asset evidence.

1. Open the 12-string prototype screen on a physical device.
2. Tap each string once from 1 to 12 and verify immediate sound response.
3. Press `8 Voice` and listen for voice dropout or stealing artifacts across the simultaneous 8-string burst.
4. Press `Bend`, then hold one active string and drag to test pitch bend continuity through both deterministic and raw-touch paths.
5. Swipe across all 12 strings in both directions and verify no missing string trigger.
6. Trigger a mute or cover gesture and listen for pop noise or unnatural cutoff.
7. Record or attempt to record 10 seconds of live interaction if the candidate engine supports capture, then press `Play Rec` if a captured URI is returned.
8. Save the `Session fallback (copyable)` JSON and confirm the event log is still available even if audio capture fails.

## Decision

| Decision | Rule |
| --- | --- |
| PASS | Tap latency, 8-voice polyphony, pitch bend, glissando, mute, preload, session fallback, and at least 10 seconds of recording all pass. |
| PASS_WITH_LIMITS | Core loop, preload, and session fallback pass, but recording is under 10 seconds. Continue with event-session fallback and document the recording limit. |
| FAIL | Tap latency, polyphony, pitch bend, glissando, mute, preload, or session fallback fails. Do not expand into studio features. |
| NO_GO | No candidate engine can support at least two core gestures reliably. Pause Week 2 feature work and run another audio spike. |

## Failure Log

Use one entry per failure.

| Time | Check | Symptom | Device Condition | Suspected Cause | Follow-up |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |

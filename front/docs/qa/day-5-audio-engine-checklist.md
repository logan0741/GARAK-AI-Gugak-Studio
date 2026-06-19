# Day 5 Audio Engine Checklist

Status: required before choosing the real `SamplerEngine` implementation  
Scope: Week 1 audio and touch spike for the 12-string gayageum prototype

Related candidate smoke checks:

- Candidate A `expo-audio`: `docs/qa/day-2-expo-audio-smoke.md`
- Candidate B `react-native-audio-api`: `docs/qa/day-3-react-native-audio-api-smoke.md`
- Touch model: `docs/qa/day-4-touch-model-smoke.md`
- Decision record: `docs/qa/day-5-audio-engine-decision-record.md`
- Probe record example: `docs/qa/day-5-audio-engine-probes.example.json`

Use this checklist on a physical Android or iOS device. Do not use an emulator to judge audio latency, dropout, click noise, pitch bend quality, or mute release quality.

## Development Client Setup

Native audio candidates require an Expo development client. Verify the config before device QA:

```bash
npm run samples:generate-dev
npm test src/config/__tests__/developmentBuildConfig.test.ts
npm test src/prototype/__tests__/prototypeSampleManifest.test.ts
npm run start:dev-client
```

For cloud or local native builds, use the `development` profile in `eas.json`. Expo Go is not valid evidence for Day 5 native audio candidate selection.

The generated `dev-synthetic-gayageum-2026-06-08` samples are Week 1 technical fixtures only. They are valid for checking whether a candidate engine can preload and play 12 local WAV files, but they are not final instrument assets and do not prove release sound quality.

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
| Recording possibility | Native path can capture at least 10 seconds of live performance audio, or fallback decision is recorded |  |  |

## Automated Evaluation Record

After the physical-device test, transfer the measured values into the same shape used by `src/audio/audioEngineEvaluation.ts`.

During rehearsal, `src/audio/audioEngineProbeDraft.ts` can create an `estimate` draft from observed values. That draft is useful for checking JSON shape and glissando counts, but it does not satisfy the Day 5 final gate. Only a tester-reviewed probe with `evidenceSource: 'physical-device'` counts.

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

After exactly one physical-device probe per candidate is recorded, run the handoff object through `npm run qa:day5-audio -- <probe-record.json>`. The handoff must return parse errors for invalid records, or a formatted Day 5 decision summary for valid records. The record must remain `INCOMPLETE_DEVICE_EVIDENCE` until both `expo-audio` and `react-native-audio-api` have `evidenceSource: 'physical-device'` probe values and no candidate appears more than once.

## Current Prototype Smoke Test

The current branch provides a `PanResponder` instrument surface for tap, swipe glissando, hold-drag bend, broad-contact ji-eum mute, release, requested candidate, active runtime, runtime status, sample manifest version, native preload status, missing sample string indexes, session event count, audible fake voice count, command log, audio failure status, and a copyable `Probe draft (estimate only, fake engine counters)` JSON block in the prototype inspector.

1. Open the 12-string prototype screen on a physical device or Expo dev build.
2. Confirm the inspector separates requested candidate from active runtime. If no complete 12-string sample manifest is passed into the host, active runtime must remain `fake-prototype`.
3. Confirm sample manifest version is `dev-synthetic-gayageum-2026-06-08`.
4. Confirm a complete manifest moves through `native_candidate_preloading`; active runtime must remain `fake-prototype` until native preload succeeds.
5. If native preload fails, confirm runtime status is `native_candidate_failed` and session event logging still works through the fake fallback.
6. If native preload succeeds, confirm runtime status is `native_candidate_ready` and active runtime matches the requested candidate.
7. Touch each string once from 1 to 12 and confirm `string_pluck` appears on touch start and `string_release` appears on touch end.
8. Swipe across the instrument surface and confirm crossed strings emit ordered `glissando_step` events.
9. Hold one string and drag horizontally after the hold threshold; confirm `string_bend` appears as the latest event.
10. Use a broad or multi-touch contact and confirm `string_mute` appears.
11. Press the glissando control and confirm the event count increments by 12.
12. While active runtime is `fake-prototype`, confirm audible fake voice count grows for plucks and does not count released voices.
13. Confirm audio status remains `ok` while the current engine handles events.
14. Confirm the probe draft keeps `evidenceSource: "estimate"`, includes `runtimeUnderTest: "fake-sampler-engine"`, keeps unmeasured physical-device fields as `null`, and does not show a Day 5 decision or selected engine.

## Day 5 Full Test Script

Prerequisite: before running this full script, the active `SamplerEngine` candidate must expose tap playback, hold-drag pitch bend, mute or cover gesture, and recording or explicit recording fallback behavior in the device build. For fixture-based runs, record sample manifest version `dev-synthetic-gayageum-2026-06-08` and note that the result is engine evidence, not final sound-asset evidence.

1. Open the 12-string prototype screen on a physical device.
2. Tap each string once from 1 to 12 and verify immediate sound response.
3. Rapidly trigger at least 8 strings and listen for voice dropout or stealing artifacts.
4. Hold one active string and drag to test pitch bend continuity.
5. Swipe across all 12 strings in both directions and verify no missing string trigger.
6. Trigger a mute or cover gesture and listen for pop noise or unnatural cutoff.
7. Record or attempt to record 10 seconds of live interaction if the candidate engine supports capture.
8. Save the event session and confirm the event log is still available even if audio capture fails.

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

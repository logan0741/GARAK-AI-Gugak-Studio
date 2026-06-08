# Day 2 Expo Audio Smoke Check

Status: implementation harness ready; physical-device result not recorded yet  
Owner: Front-end spike  
Scope: Week 1 candidate A, `expo-audio`

## Responsibility

Use this document when validating whether `expo-audio` can cover basic playback and recording before the Day 5 engine decision. This is not the final audio-engine decision record; final selection still belongs to `day-5-audio-engine-checklist.md`.

## Code Under Test

| File | Responsibility |
| --- | --- |
| `src/audio/expoAudioSamplerEngine.ts` | Candidate A `SamplerEngine` implementation. Owns source resolution before preload, pluck playback, queued playback failure reporting through `waitForIdle()`, bend approximation, mute/release mapping, recording probe lifecycle, non-empty captured recording URI validation, and captured recording URI playback. |
| `src/audio/expoAudioRuntime.ts` | Only runtime bridge that imports `expo-audio`. Keeps UI and domain code independent from the concrete library and reuses the SDK source resolver and recording option normalizer. |
| `src/prototype/prototypeRecordingProbeController.ts` | Prototype boundary that calls optional recording probe methods, normalizes empty captured URIs to `null`, and reports unsupported, failed, recording, captured, missing-URI, or playback states without breaking session fallback. |
| `src/audio/__tests__/expoAudioSamplerEngine.test.ts` | Pure port-injected behavior tests for preload, playback controls, bend/mute/release mapping, and recording probe lifecycle. |
| `src/prototype/prototypeQaSnapshot.ts` | Inspector QA read model. Records prototype capture seconds, URI availability, playback confirmation, and fallback reason under `observedPrototypeRecording` without promoting it to final physical-device evidence. |
| `src/audio/__tests__/expoAudioRuntime.test.ts` | Mocked package-delegation test for the installed `expo-audio` API surface. |

## Automated Verification

Run before opening a device build:

```bash
npm run samples:generate-dev
npm test src/config/__tests__/developmentBuildConfig.test.ts
npm test src/prototype/__tests__/prototypeRecordingProbeController.test.ts
npm test src/prototype/__tests__/prototypeSampleManifest.test.ts
npm test src/audio/__tests__/expoAudioSamplerEngine.test.ts
npm test src/audio/__tests__/expoAudioRuntime.test.ts
npm run typecheck
```

Expected result: all commands exit 0.

## Device Smoke Procedure

Prerequisite: run `npm run samples:generate-dev` from `front/` before building the device client. This creates the Week 1 synthetic fixture files under `assets/audio/gayageum-dev/` and the matching manifest in `src/prototype/prototypeSampleManifest.ts`.

The `dev-synthetic-gayageum-2026-06-08` manifest is a technical fixture only. It can validate preload, latency, polyphony, and recording plumbing, but it is not release-quality gayageum audio and must be replaced by owned or licensed recordings before product sound decisions.

Resolve every `SampleAssetManifest.fileUri` through the prototype bundled sample registry and Expo Asset before constructing `ExpoAudioSamplerEngine`. Do not use remote URLs for normal-play latency checks. If any string sample is missing, the prototype host must stay on `fake-prototype` and report the missing string indexes; the native sampler factory also rejects missing or duplicate string indexes before creating a candidate runtime. If the manifest is complete and has exactly one asset for each string but native preload has not finished, the prototype host must show `native_candidate_preloading` and keep dispatching to the fake fallback until preload succeeds.

Use a development client, not Expo Go, because this candidate uses native audio modules and microphone permissions:

```bash
npm run start:dev-client
```

For an EAS development build, use the `development` profile in `eas.json`.

1. Build or launch an Expo dev build on a physical device.
2. Preload the manifest through `ExpoAudioSamplerEngine.preload()` and confirm the inspector reaches `native_candidate_ready`.
3. Trigger one `string_pluck` event and confirm immediate audible playback.
4. Trigger 12 sequential `glissando_step` events and confirm every string produces a sound.
5. Press `Rec 10s`, perform a short interaction, then press `Stop Rec`.
6. Record the returned `capturedSeconds` and `recordingUri`.
7. Confirm `Probe draft (estimate only, fake engine counters)` includes `observedPrototypeRecording.capturedSeconds` and `uriAvailable`. If recording fails, confirm `observedPrototypeRecording.fallbackReason` records the native failure reason.
8. Press `Play Rec` and confirm the captured performance plays back from the returned URI.
9. Confirm `observedPrototypeRecording.playbackConfirmed` becomes `true`.

Treat a `null`, empty, or whitespace-only `recordingUri` as missing playback context. The Expo Audio stop result must normalize it to `null`; the inspector must keep `uriAvailable: false` and record `fallbackReason: "recording_playback_uri_missing"` instead of enabling captured playback.

## Result Table

| Check | Expected | Result | Notes |
| --- | --- | --- | --- |
| Preload | All manifest strings resolve/download to playable URIs before players are created |  | Players are created with `downloadFirst: false` after explicit source resolution. |
| Tap playback | One pluck event plays the matching preloaded string |  |  |
| Playback queue failure | Automated smoke fails if `waitForIdle()` reports queued `seekTo()` or play errors |  | Do not treat a silent queue failure as successful playback. |
| Glissando playback | 12 sequential steps trigger 12 audible attacks |  |  |
| Bend approximation | `string_bend` changes playback rate without crash |  | `expo-audio` rate change is an approximation, not true instrument pitch bend. |
| Mute/release | Mute lowers volume; release pauses player without pop noise |  |  |
| Recording permission | Permission request succeeds on device |  |  |
| 10-second capture | `stopRecordingProbe()` returns about 10 seconds and a non-empty, non-whitespace URI |  |  |
| Captured playback | `Play Rec` plays the captured recording URI without throwing |  | Confirms self-playback feasibility, not final sound quality. |
| Inspector recording observation | `observedPrototypeRecording` records capture seconds, URI availability, playback confirmation, and any fallback reason |  | Still copy values into a physical-device probe record manually before Day 5. |

## Handoff To Day 5

Transfer measured values into `src/audio/audioEngineEvaluation.ts` using candidate `expo-audio`.

Also add one `day-2-expo-audio` run to the Week 1 smoke report and validate it with `npm run qa:week1-smoke-report -- <week1-smoke-report.json>` after Day 2, Day 3, and Day 4 runs have all been recorded. Use `docs/qa/week-1-smoke-report.md` for the required check IDs.

If playback works but pitch bend or polyphony is not convincing, keep `expo-audio` as recording/fallback only and continue Day 3 validation with `react-native-audio-api`.

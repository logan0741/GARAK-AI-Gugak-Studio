# Day 3 React Native Audio API Smoke Check

Status: implementation harness ready; physical-device result not recorded yet  
Owner: Front-end spike  
Scope: Week 1 candidate B, `react-native-audio-api`

## Responsibility

Use this document when validating whether `react-native-audio-api` can support the low-latency instrument engine path: polyphony, pitch bend, and filter/gain graph control. This is not the final audio-engine decision record; final selection still belongs to `day-5-audio-engine-checklist.md`.

## Code Under Test

| File | Responsibility |
| --- | --- |
| `src/audio/reactNativeAudioApiSamplerEngine.ts` | Candidate B `SamplerEngine` implementation. Owns `AudioBuffer` preload, source-per-voice playback, `GainNode` mixing, `BiquadFilterNode` setup, detune pitch bend, mute/release envelope, voice budget behavior, duplicate release stop suppression, and idempotent cleanup when a stolen voice later emits a native end callback. |
| `src/audio/reactNativeAudioApiRuntime.ts` | Only runtime bridge that imports `react-native-audio-api`. Keeps UI and domain code independent from the concrete package. |
| `src/prototype/gayageumPrototypeController.ts` | Prototype event planner for tap, glissando, 8-voice polyphony burst, pitch-bend probe, and mute probe used by device QA. |
| `src/prototype/prototypeRecordingProbeController.ts` | Prototype boundary that should report `recording_probe_not_supported` for engines without recording methods instead of treating playback validation as failed. |
| `src/prototype/prototypeQaSnapshot.ts` | Inspector QA read model. Records `observedPrototypeRecording.fallbackReason` when this candidate cannot provide a recording probe, without promoting it to final physical-device evidence. |
| `src/audio/__tests__/reactNativeAudioApiSamplerEngine.test.ts` | Pure port-injected behavior tests for preload, 8-voice polyphony, graph wiring, pitch bend, mute/release, voice stealing, and late native end cleanup. |
| `src/audio/__tests__/reactNativeAudioApiRuntime.test.ts` | Mocked package-delegation test for the installed `react-native-audio-api` API surface. |

## Automated Verification

Run before opening a device build:

```bash
npm run samples:generate-dev
npm test src/config/__tests__/developmentBuildConfig.test.ts
npm test src/prototype/__tests__/prototypeRecordingProbeController.test.ts
npm test src/prototype/__tests__/prototypeSampleManifest.test.ts
npm test src/audio/__tests__/reactNativeAudioApiSamplerEngine.test.ts
npm test src/audio/__tests__/reactNativeAudioApiRuntime.test.ts
npm run typecheck
```

Expected result: all commands exit 0.

## Device Smoke Procedure

Prerequisite: run `npm run samples:generate-dev` from `front/` before building the device client. This creates the Week 1 synthetic fixture files under `assets/audio/gayageum-dev/` and the matching manifest in `src/prototype/prototypeSampleManifest.ts`.

The `dev-synthetic-gayageum-2026-06-08` manifest is a technical fixture only. It can validate preload, latency, polyphony, pitch-bend plumbing, filter/gain graph behavior, and mute/release envelopes, but it is not release-quality gayageum audio and must be replaced by owned or licensed recordings before product sound decisions.

Resolve every `SampleAssetManifest.fileUri` through the prototype bundled sample registry and Expo Asset before constructing `ReactNativeAudioApiSamplerEngine`. Do not use remote URLs for normal-play latency checks. The native sampler factory rejects empty resolved URIs and `http(s)` URIs before loading the candidate runtime. If any string sample is missing, the prototype host must stay on `fake-prototype` and report the missing string indexes; the native sampler factory also rejects missing or duplicate string indexes before creating a candidate runtime. If the manifest is complete and has exactly one asset for each string but native preload has not finished, the prototype host must show `native_candidate_preloading` and keep dispatching to the fake fallback until preload succeeds.

Use a development client, not Expo Go, because this candidate depends on native audio graph APIs:

```bash
npm run start:dev-client
```

For an EAS development build, use the `development` profile in `eas.json`.

1. Build or launch an Expo dev build on a physical device.
2. Preload the manifest through `ReactNativeAudioApiSamplerEngine.preload()` and confirm the inspector reaches `native_candidate_ready`.
3. Tap one string and confirm the graph plays from a decoded buffer without runtime file loading.
4. Press `8 Voice` and listen for dropout, clipping, or unwanted voice stealing across the simultaneous 8-string burst.
5. Press `Bend` to send an active pluck, +120/-120 cents bend range, and release through the current candidate. Also hold one active string and drag horizontally to confirm the raw touch path emits `string_bend`.
6. Confirm bend changes are continuous and do not create click noise.
7. Confirm each voice routes `source -> lowpass filter -> gain -> destination`.
8. Press `Mute` to send an active pluck, full mute, and release through the current candidate. Also trigger a broad or multi-touch ji-eum gesture to confirm the raw touch path emits `string_mute`.
9. Press `Rec 10s` and confirm the recording probe reports `recording_probe_not_supported` unless a recording-capable implementation has been explicitly added for this candidate.
10. Confirm the probe draft records `observedPrototypeRecording.fallbackReason: "recording_probe_not_supported"` and keep the `Session fallback (copyable)` JSON for Day 5 review.

## Result Table

| Check | Expected | Result | Notes |
| --- | --- | --- | --- |
| Preload | All manifest strings decode into reusable `AudioBuffer` instances before play |  |  |
| Tap playback | One pluck event creates a fresh source node and starts immediately |  |  |
| Polyphony | At least 8 simultaneous voices play without audible dropout |  |  |
| Pitch bend | `string_bend` applies detune automation to active voices smoothly |  |  |
| Filter path | Each voice routes through a lowpass `BiquadFilterNode` and `GainNode` |  |  |
| Mute/release | Mute lowers gain envelope; release ramps to silence and stops source without pop noise |  |  |
| Recording fallback | Unsupported recording is captured as `observedPrototypeRecording.fallbackReason` while session replay remains available |  |  |

## Handoff To Day 5

Transfer measured values into `src/audio/audioEngineEvaluation.ts` using candidate `react-native-audio-api`.

Also add one `day-3-react-native-audio-api` run to the Week 1 smoke report and validate it with `npm run qa:week1-smoke-report -- <week1-smoke-report.json>` after Day 2, Day 3, and Day 4 runs have all been recorded. Use `docs/qa/week-1-smoke-report.md` for the required check IDs.

If polyphony and pitch bend pass but recording is weaker than `expo-audio`, keep `react-native-audio-api` as the playback engine and document a split playback/recording strategy before Day 5 selection.

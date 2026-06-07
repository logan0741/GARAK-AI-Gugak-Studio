# Day 3 React Native Audio API Smoke Check

Status: implementation harness ready; physical-device result not recorded yet  
Owner: Front-end spike  
Scope: Week 1 candidate B, `react-native-audio-api`

## Responsibility

Use this document when validating whether `react-native-audio-api` can support the low-latency instrument engine path: polyphony, pitch bend, and filter/gain graph control. This is not the final audio-engine decision record; final selection still belongs to `day-5-audio-engine-checklist.md`.

## Code Under Test

| File | Responsibility |
| --- | --- |
| `src/audio/reactNativeAudioApiSamplerEngine.ts` | Candidate B `SamplerEngine` implementation. Owns `AudioBuffer` preload, source-per-voice playback, `GainNode` mixing, `BiquadFilterNode` setup, detune pitch bend, mute/release envelope, and voice budget behavior. |
| `src/audio/reactNativeAudioApiRuntime.ts` | Only runtime bridge that imports `react-native-audio-api`. Keeps UI and domain code independent from the concrete package. |
| `src/prototype/prototypeRecordingProbeController.ts` | Prototype boundary that should report `recording_probe_not_supported` for engines without recording methods instead of treating playback validation as failed. |
| `src/audio/__tests__/reactNativeAudioApiSamplerEngine.test.ts` | Pure port-injected behavior tests for preload, 8-voice polyphony, graph wiring, pitch bend, mute/release, and voice stealing. |
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

Resolve every `SampleAssetManifest.fileUri` before constructing `ReactNativeAudioApiSamplerEngine`. Do not use remote URLs for normal-play latency checks. If any string sample is missing, the prototype host must stay on `fake-prototype` and report the missing string indexes. If the manifest is complete but native preload has not finished, the prototype host must show `native_candidate_preloading` and keep dispatching to the fake fallback until preload succeeds.

Use a development client, not Expo Go, because this candidate depends on native audio graph APIs:

```bash
npm run start:dev-client
```

For an EAS development build, use the `development` profile in `eas.json`.

1. Build or launch an Expo dev build on a physical device.
2. Preload the manifest through `ReactNativeAudioApiSamplerEngine.preload()` and confirm the inspector reaches `native_candidate_ready`.
3. Tap one string and confirm the graph plays from a decoded buffer without runtime file loading.
4. Trigger at least 8 different strings rapidly and listen for dropout, clipping, or unwanted voice stealing.
5. Hold one active string and send `string_bend` values across a practical range such as -120 to +120 cents.
6. Confirm bend changes are continuous and do not create click noise.
7. Confirm each voice routes `source -> lowpass filter -> gain -> destination`.
8. Trigger `string_mute` and `string_release` and listen for release pops or abrupt cutoff.
9. Press `Rec 10s` and confirm the recording probe reports `recording_probe_not_supported` unless a recording-capable implementation has been explicitly added for this candidate.

## Result Table

| Check | Expected | Result | Notes |
| --- | --- | --- | --- |
| Preload | All manifest strings decode into reusable `AudioBuffer` instances before play |  |  |
| Tap playback | One pluck event creates a fresh source node and starts immediately |  |  |
| Polyphony | At least 8 simultaneous voices play without audible dropout |  |  |
| Pitch bend | `string_bend` applies detune automation to active voices smoothly |  |  |
| Filter path | Each voice routes through a lowpass `BiquadFilterNode` and `GainNode` |  |  |
| Mute/release | Mute lowers gain envelope; release ramps to silence and stops source without pop noise |  |  |

## Handoff To Day 5

Transfer measured values into `src/audio/audioEngineEvaluation.ts` using candidate `react-native-audio-api`.

If polyphony and pitch bend pass but recording is weaker than `expo-audio`, keep `react-native-audio-api` as the playback engine and document a split playback/recording strategy before Day 5 selection.

# 2026-06-10 Week 1 Implementation Summary

## Current State

GUKAK STUDIO front-end Week 1 spike has a runnable Expo/React Native prototype under `front/`.

The implemented scope is still a technical spike, not a final audio-engine selection. Physical-device QA and the final engine decision are deferred to Week 2. Until that evidence exists, all prototype inspector values that come from the fake fallback engine remain estimate-only evidence.

## Implemented Areas

### Project Scaffold

- Expo + React Native + TypeScript app shell under `front/`.
- Vitest test harness for pure domain, audio boundary, prototype, and QA command logic.
- Expo dev client and EAS profile setup for later physical-device builds.
- Front-only workspace structure, scripts, docs, and generated dev sample assets.

### Domain Model

- `PerformanceEvent` vocabulary for pluck, release, bend, mute, and glissando.
- `Session` model with event fallback data, recording URI preservation, and data reference attachment.
- `SampleAssetManifest` and `DataReferenceManifest` separation.
- `ReplaySchedule` planning for deterministic session replay.
- `JangdanMatcher` and prototype jangdan preview.

### Interaction And Prototype UI

- 12-string gayageum prototype screen.
- Touch model for tap, swipe/glissando, hold-drag bend, ji-eum mute, release cleanup, and invalid-frame guards.
- Deterministic probe controls for glissando, 8-voice polyphony burst, bend, mute, recording, and replay.
- Prototype inspector for event count, latest event, fake engine commands, replay readiness, replay dispatch status, sample provenance, runtime state, recording probe state, QA draft JSON, handoff JSON, and session fallback JSON.

### Audio Boundary And Candidates

- `SamplerEngine` boundary and `FakeSamplerEngine` fallback.
- `expo-audio` candidate harness with playback queue, source URI validation, preload guard, stop URI normalization, and recording probe support where available.
- `react-native-audio-api` candidate harness with voice allocation, pitch bend, filter path, release cleanup, preload isolation, and voice-budget guards.
- Native candidate host that keeps fake fallback active until candidate preload is ready.
- 12-string synthetic dev sample fixture manifest for Week 1 technical QA only.

### Recording And Session Fallback

- 10-second recording probe start/stop/playback UI state and controller.
- Captured recording URI trimming and blank URI rejection.
- Recording fallback reason capture for engines that cannot record.
- Session fallback JSON formatter and CLI validation command.
- Session replay planner, engine dispatch path, inspector preview, and stale dispatch reset after new events.

### QA And Handoff Harness

- Day 2, Day 3, Day 4, and Day 5 QA documents.
- Day 5 audio-engine probe record parser and evaluator.
- Probe draft model, physical-device promotion guards, and decision summary/record generation.
- Prototype handoff JSON, handoff readiness check, merge command, and probe-record generation command.
- Week 1 smoke report template and validator.
- Day 5 readiness bridge between smoke report and physical-device probe record.
- Physical device label normalization and placeholder rejection shared across QA flows.

## Verification Evidence

Latest verified commands before this summary:

```bash
npm test
npm run typecheck
git diff --check
```

Observed result:

- 45 Vitest files passed.
- 374 tests passed.
- TypeScript `tsc --noEmit` passed.
- Diff whitespace check passed.
- Expo web smoke confirmed `Glissando -> Replay -> 8 Voice` resets `Session replay dispatch` to `none` without console errors.

## Deferred To Week 2

The following remain intentionally incomplete until physical-device QA:

- Real touch-to-sound latency measurement, target <= 50 ms.
- Real 8-voice polyphony stability measurement.
- Real pitch-bend smoothness and click-noise review.
- Real glissando input-loss review.
- Real ji-eum mute/release quality review.
- Native 10-second recording capture and playback evidence.
- Final audio-engine selection and Day 5 decision record.

## PR Split Recommendation

Keep PRs below 15 by grouping commits by purpose rather than by individual commit.

Suggested review order:

1. Front scaffold and domain foundation.
2. Interaction model and prototype surface.
3. Audio engine boundary and candidate harnesses.
4. Dev sample fixtures and native preload host.
5. Recording probe and session fallback.
6. Session replay and inspector replay controls.
7. Day 5 probe record and engine decision model.
8. Prototype probe draft and inspector handoff.
9. Prototype handoff validation, merge, and probe-record commands.
10. Week 1 smoke report and Day 5 readiness QA gates.
11. Validation hardening for labels, timestamps, manifests, measurement schema, and invalid touch/audio values.
12. Documentation, smoke logs, and Week 2 physical-device gate alignment.

Because later work depends on the front scaffold and domain foundation, the cleanest split is a stacked PR series. If every PR must target `main` directly, merge the PRs in order and rebase the remaining branches after each merge.

# MVP Readiness Uplift Plan

Date: 2026-07-04
Branch at creation: `codex/d2-demo-audio-build-readiness`
Mode: D-2 demo triage first, MVP completion second

## Goal

Raise GARAK from an interactive prototype toward a demonstrable MVP without confusing demo-only fallbacks for product-complete audio.

The immediate goal is not "finish every audio system." The immediate goal is:

1. Android dev build can be rebuilt from a documented path.
2. A presenter can install the app on the actual demo device.
3. Home/share/library playback produces audible bundled audio.
4. Free-play instrument sound, recording, editing preview, export, and library playback have one rehearsable happy path.
5. Gaps remain visible in UI, QA records, and docs instead of being hidden by placeholders.

## Scope Challenge

Recommendation: reduce the next implementation scope to a single end-to-end demo spine before improving every feature surface.

The current risk is not lack of UI breadth. The risk is that the user can tap through many screens but only some taps produce real audio. For a D-2 presentation, one complete path is worth more than partial coverage across every path.

Target demo spine:

```text
Home
  -> Share / Browse
  -> Open demo player
  -> Play audible bundled audio
  -> Free creation
  -> Select instrument
  -> Tap instrument and hear sound
  -> Record short event take with event-only fallback provenance
  -> Edit volume/mute/solo
  -> Export to playable library item
  -> Play exported item from library
```

## Current Baseline

| Area | Baseline after latest commit | Remaining blocker |
| --- | --- | --- |
| Home browsing | Home, quick access, share feed, library entry, and one-tap share/library playback affordances exist | Feed remains fixture-driven; physical-device audible playback evidence is still missing |
| Instrument play | `expo-audio` is now first candidate; sampler paths exist | Physical-device sound/latency smoke not captured |
| Recording | Event recording is now the default S05/S09 product path; native microphone capture remains injectable for probes/debug evidence but is not used by default playback/export | Physical-device event-only recording smoke is still required |
| Editing | Tracks, layer controls, volume, mute/solo, playhead state, captured-audio preview, and event-replay preview exist | No rendered mix WAV yet; audible device check is still required |
| Library playback | Player screen now calls `expo-audio` for demo/exported/captured audio | Physical-device audible playback evidence is still missing |
| Build/DX | Doctor, web export, Android build passed from short ASCII path; D-2 runbook and smoke scripts exist | No connected-device smoke evidence |

## What Already Exists

- `src/product/garakProductState.ts` already owns the state machine for S01-S23 and should remain the source of truth.
- `src/product/garakProductEffects.ts` already routes side effects through service boundaries; playback/recording work should extend this, not bypass it from views.
- `src/product/garakProductServices.ts` already defines audio/library/share ports; add capability there before adding screen-specific implementations.
- `src/product/localGarakProductServices.ts` now has an `expo-audio` library playback adapter; reuse it for demo playback and exported audio playback.
- `src/audio/expoAudioSamplerEngine.ts` already has recording probe support and error reasons; product recording should reuse its runtime approach.
- `src/studio/studioLibrary.ts` already has `Work`, `Track`, `Take`, `ExportedAudio`, and `createWorkMixPlan`; do not introduce a parallel library model.
- `docs/qa/day-5-audio-engine-checklist.md` and `npm run qa:day5-audio` already define the evidence gate; do not invent a new readiness score.

## NOT In Scope

- Full DSP-quality offline mix rendering: defer until after the presentation; the D-2 path only needs deterministic audible preview/export.
- Background playback/recording: not needed for live demo and increases native permission/service risk.
- Server upload/object storage: local library is enough for the presentation spine.
- Real community backend feed: fixture feed is acceptable if audible playback and remix/save behavior are honest.
- Reviving Android autolink for `react-native-audio-api`: defer until Windows/bash/CMake path issues are solved separately.
- iOS build validation: current presentation blocker is Android dev build and Android physical-device evidence.

## Architecture Plan

Keep one audio boundary and three concrete capabilities:

```text
UI Press
  |
  v
GarakProductAction
  |
  v
applyProductAction(state)  ---- pure state only
  |
  v
runGarakProductEffect(action, state, services)
  |
  +--> audio.prepareLivePerformanceAudio()
  +--> audio.playPerformanceEvents()
  +--> audio.startRecordingCapture()
  +--> audio.stopRecordingCapture()
  +--> audio.playWorkMix()
  +--> audio.exportWorkAudio()
  +--> audio.playLibraryAudio()
```

Do not let React views import `expo-audio` directly. The app already has a clean service boundary; the plan should deepen that boundary instead of scattering native APIs through screens.

## Workstream A: Demo Build And Device Evidence

Priority: P0, must happen before claiming demo readiness.

1. Add a documented Android demo build workflow.
   - Create a script or README section that copies `front` to a short ASCII path such as `C:\gsb`, runs install/prebuild, and builds `assembleDebug`.
   - Output the APK path explicitly.
   - Keep the source workspace unchanged except for generated native output exclusion.

2. Add a physical-device smoke checklist for one presenter.
   - Generate a blocked template with:
     `npm run qa:d2-demo-smoke-template -- docs/qa/d2-demo-smoke-YYYYMMDD.json "<tester>" "<device-label>" "<apk-path>"`
   - Install and launch the APK on the connected device with:
     `npm run qa:d2-demo-android-device-smoke -- <apk-path> [--serial <adb-serial>] [--report docs/qa/d2-demo-smoke-YYYYMMDD.json]`
   - When `--report` is provided, the command writes the automated `adb-device-detected` and `apk-installed-and-launched` evidence into the template, updates `deviceLabel` only when ADB `ro.product.model` and `ro.build.version.release` both return concrete values, writes the actual `apkPath`, and leaves only the audible checks for rehearsal.
   - Fill the generated JSON during rehearsal, then gate it with:
     `npm run qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-YYYYMMDD.json --evidence docs/qa/d2-demo-smoke-YYYYMMDD.device-evidence.json --recording-evidence docs/qa/d2-demo-smoke-YYYYMMDD.recording-evidence.json --day5-probe docs/qa/day-5-audio-engine-probes.real-device.json`
   - Device detected by `adb devices -l`.
   - APK installs.
   - App launches.
   - Home/share demo player plays audible audio.
   - S05 selected instrument produces audible sample.
   - Recording path saves an event take and, if available, capture URI.
   - Library exported item plays.

3. Update Day-5 probe evidence after testing the actual device.
   - Fill `expo-audio` physical-device probe first.
   - Keep `react-native-audio-api` as missing/deferred unless a separate Android-native fix is made.
   - Readiness can become `PASS_WITH_LIMITS`; do not require both candidates for the D-2 demo if the product path intentionally chooses `expo-audio`.

Exit criteria:

- `adb devices -l` shows the actual device.
- APK install and launch are recorded.
- `npm run qa:day5-audio -- <real-probe.json>` no longer reports missing `expo-audio` physical-device evidence.
- The demo script has a clear fallback if audio fails.

## Workstream B: Home / Browse / Library Playback

Priority: P0.

1. Make share-feed player controls honest.
   - If card icons are decorative, either remove interactivity expectations or make the visible play icon dispatch the same player flow.
   - The main card can still navigate to the player detail screen.

2. Add audible demo mapping for all fixture player entries.
   - `My Arirang` -> bundled janggu WAV.
   - Water/sea-themed entries -> bundled daegeum WAV.
   - Default fixture -> bundled daegeum WAV.

3. Extend player actions to practice results and work mix preview.
   - `exportedAudio` uses `playLibraryAudio`.
   - `demo` uses `playLibraryAudio`.
   - `work` uses `playWorkMix`.
   - `practiceResult` should either play a bundled practice result sample or show a disabled state with a clear label.

Tests:

- Unit: share feed card exposes the expected navigation/play action.
- Unit: player action calls `playLibraryAudio` for demo/exported/practice result.
- Unit: player action calls `playWorkMix` for work.
- Smoke: player screen play button toggles play/pause state and calls the audio service.

Exit criteria:

- From Home -> Browse, there is at least one visible path where pressing play produces sound on device.
- No visible play icon is decorative without a matching action or disabled state.

## Workstream C: Instrument Play

Priority: P0 for demo happy path, P1 for engine completeness.

1. Lock demo playback to `expo-audio` until the native `react-native-audio-api` build path is repaired.
   - Keep `react-native-audio-api` tests and runtime code in place.
   - Keep Android autolink disabled for the D-2 build.
   - Document this as a demo constraint, not a final architecture decision.

2. Add S05 readiness state.
   - `idle`: not prepared.
   - `preparing`: sample preload in progress.
   - `ready`: touch should sound.
   - `error`: user sees concise local error and can retry.

3. Preload samples before the first playable tap where possible.
   - On S05 entry, call `prepareLivePerformanceAudio`.
   - On instrument switch, refresh the sampler.
   - If preparation fails, keep visual performance usable but mark audio unavailable.

Tests:

- Unit: entering S05 requests preparation for selected instrument.
- Unit: failed preparation sets a visible readiness notice.
- Unit: touch-to-event still works when audio is unavailable.
- Device smoke: tap 3 strings, record whether sound occurs and whether any tap is silent.

Exit criteria:

- Presenter can select one instrument and reliably hear sample sound within 1 second of tapping.
- If sound is unavailable, the app does not fake success; it shows the reason.

## Workstream D: Recording Capture

Priority: P1 for product truth, P0 if presentation claims "recording audio."

1. Add recording capture service methods.
   - `startRecordingCapture(setup)`
   - `stopRecordingCapture() -> { recordingUri, durationSeconds }`
   - `discardRecordingCapture()`

2. Reuse `expo-audio` recording runtime patterns.
   - Request microphone permission explicitly.
   - Use high-quality preset with persistent document directory when possible, because Expo docs note cache recordings can be deleted by the system.
   - Store permission denial and start/stop failures as user-visible states.

3. Attach capture URI to `Take`.
   - Event recording remains the source of truth.
   - `recordingUri` is an optional audio artifact for playback/export.
   - If capture fails, save the event take with a visible "event-only recording" label.

Tests:

- Unit: start recording calls capture service and sets recording state.
- Unit: stop recording attaches `recordingUri` to the pending take when present.
- Unit: permission denied keeps event recording available and surfaces an error.
- Device smoke: record 5-10 seconds, stop, play back capture.

Exit criteria:

- Demo can honestly say "녹음됨" only if the flow produced either a real `recordingUri` or clearly says "이벤트 녹음."

## Workstream E: Edit Preview And Export

Priority: P1.

1. Implement deterministic work preview.
   - Use `createWorkMixPlan(work)` as the scheduler.
   - Play sample events with track volume, mute, solo, and start beat.
   - For D-2, a sequenced preview is enough; offline rendered WAV is not required.

2. Make export produce a playable artifact contract.
   - If actual rendered WAV is unavailable, export should explicitly mark `renderKind: 'demo_sample' | 'event_replay' | 'audio_capture'`.
   - Library UI should show "발표용 샘플" or "이벤트 리플레이" instead of implying a final mixed audio file.

3. Prefer real captured audio when present.
   - If a take has `recordingUri`, exported audio should point to that capture or a copied persistent URI.
   - If no capture exists, fall back to event-replay preview or bundled demo sample.

Tests:

- Unit: muted tracks do not contribute to preview plan.
- Unit: solo tracks suppress non-solo tracks.
- Unit: exported audio URI chooses capture URI before bundled fallback.
- Unit: export metadata tells the UI whether the artifact is real capture, replay, or demo sample.

Exit criteria:

- Editing controls audibly change the preview for the happy path.
- Exported library item is playable and its provenance is not misleading.

## Workstream F: DevEx And Demo Operator Experience

Primary persona:

```text
Who:       Solo presenter / student developer running a two-day demo.
Context:   Needs to rebuild, install, and verify on one Android device without debugging Gradle for an hour.
Tolerance: 10 minutes to first audible demo after checkout or branch switch.
Expects:   One documented command path, one APK path, one smoke checklist, clear fallback plan.
```

Developer empathy narrative:

"I open the repo two days before the presentation. I need to know whether the app will make sound on my phone. If the instructions say only `npm run android`, I may lose time in Korean-path Gradle errors, npm launcher issues, native autolink failures, or missing device setup. I need a path that tells me exactly where to build, where the APK appears, how to install it, and what taps prove the demo works. If sound fails, I need a fallback script and preloaded audio/video rather than discovering the failure while presenting."

DX target:

| Metric | Current | Target |
| --- | --- | --- |
| Time to first APK | 30-60+ min if path issue recurs | < 10 min with documented short path |
| Time to first audible demo | blocked without device evidence | < 10 min after APK install |
| Build command discoverability | tribal knowledge from chat | repo doc/script |
| Failure diagnosis | scattered command output | checklist with exact remediation |

Magical moment:

```text
Run documented build/install path
  -> app opens on Android device
  -> Home/Browse demo player plays sound
  -> S05 tap produces instrument sound
```

This is the developer-facing "it works" moment for the team.

## Failure Modes

| Code path | Failure mode | Test/error handling needed | User impact |
| --- | --- | --- | --- |
| Android build | Long/non-ASCII path breaks Gradle/CMake | Build doc/script uses short ASCII path | No APK |
| `expo-audio` library player | `createAudioPlayer` source cannot resolve | Unit test asset mapping; service returns error | Silent play button unless UI surfaces error |
| Live instrument preload | sample asset missing or preload rejects | readiness state + retry action | Taps show animation but no sound |
| Recording capture | mic permission denied | permission branch test + visible notice | User thinks recording failed mysteriously |
| Stop recording | recorder returns no URI | event-only fallback + label | Saved take exists but no audio playback |
| Mix preview | multiple scheduled events overlap poorly | scheduler tests for volume/mute/solo | editing appears ineffective |
| Export | placeholder labeled as final audio | provenance metadata test | presentation overclaims product state |
| Physical QA | no connected device | `adb devices` gate in checklist | false readiness claim |

Critical gaps:

- Physical-device audio evidence is still missing.
- Product recording cannot be called real audio recording until `recordingUri` is produced in the normal flow.
- Export cannot be called real mixed audio until preview/export provenance is explicit or real rendering exists.

## Test Plan

Narrow tests first:

```text
src/product/__tests__/garakProductEffects.test.ts
  - play demo/export/practice/work selection through correct service
  - start/stop recording capture service success and failure

src/product/__tests__/garakProductState.test.ts
  - recording states and event-only fallback
  - export provenance and library insertion

src/product/__tests__/freeCreationMixEditorModel.test.ts
  - mix controls expose preview/export states honestly

src/product/__tests__/livePerformanceAudioDefault.test.ts
  - expo-audio remains demo default while RNAA Android autolink is disabled

src/audio/__tests__/expoAudioSamplerEngine.test.ts
  - recording URI success/failure paths

docs/qa or scripts smoke
  - physical device checklist validates actual APK install and audible playback
```

Full verification before any readiness claim:

```text
npm run typecheck
npm test
npx expo-doctor
npx expo export --platform web
Android debug build from short ASCII path
adb devices -l
APK install and launch on actual device
npm run qa:day5-audio -- <real physical-device probe json>
```

## Implementation Order

### P0: Same day

1. Write build/install/smoke docs or script for the short ASCII path.
2. Connect every visible Home/Browse/Library play affordance to either a real play action or a disabled state.
3. Add player error state plumbing for failed `playLibraryAudio`.
4. Run physical-device smoke on the actual presentation Android device.
5. Fill real `expo-audio` Day-5 probe evidence.

Expected completion lift:

- Home browsing: 80-85%.
- Library playback: 55-65%.
- Overall demo flow: 65-75% if the device smoke passes.

### P1: Next 1-2 days

1. Add product recording capture with optional `recordingUri`.
2. Add S05 live audio readiness and retry UI.
3. Make work preview audibly respect volume/mute/solo.
4. Export real capture URI when available; otherwise label fallback provenance.

Expected completion lift:

- Instrument play: 60-70% after device proof.
- Recording: 55-65% if capture URI works.
- Editing: 60-70% if preview reflects controls.
- Library playback: 70-80% for demo/exported items.

### P2: After presentation

1. Repair `react-native-audio-api` Android build/autolink path in a separate branch.
2. Re-run full candidate comparison and update tech-stack docs.
3. Implement offline mix rendering or a native mixer-backed export.
4. Replace fixture community feed with real backend/shared audio storage.
5. Add CI-friendly build validation and artifact retention.

Expected completion lift:

- Instrument play: 75-85%.
- Recording: 70-80%.
- Editing/export: 75-85%.
- Whole MVP: 75-85%.

## Parallelization Strategy

| Step | Modules touched | Depends on |
| --- | --- | --- |
| A. Build/device workflow | docs, scripts, Android build copy path | none |
| B. Player affordances | product screens, product effects, services | none |
| C. S05 readiness | product screens, product state, live audio | none |
| D. Recording capture | product state, services, audio runtime | C for best UX, but can start independently |
| E. Mix preview/export provenance | studio, product effects, library models | B, D for best artifact selection |
| F. QA evidence | docs/qa, scripts, physical device | A, B, C |

Parallel lanes:

- Lane A: build/device workflow and smoke checklist.
- Lane B: Home/Browse/Library player affordances.
- Lane C: S05 readiness and recording capture, sequential inside shared product state.
- Lane D: mix preview/export provenance, starts after B and overlaps carefully with C.

Conflict flags:

- Lanes B, C, and D all touch `src/product`; coordinate or keep them sequential if using one worktree.
- Lane A is independent and should be done in parallel.

## DX Scorecard

| Dimension | Current | Target after P0/P1 |
| --- | --- | --- |
| Getting started | 4/10 | 7/10 |
| API/service boundaries | 7/10 | 8/10 |
| Error messages | 4/10 | 7/10 |
| Documentation | 5/10 | 7/10 |
| Upgrade path | 4/10 | 5/10 |
| Dev environment | 3/10 | 7/10 |
| QA measurement | 6/10 | 8/10 |
| Overall DX | 4.7/10 | 7.0/10 |

TTHW target for a demo operator: < 10 minutes from branch checkout to audible device smoke, assuming dependencies are installed and the Android SDK is configured.

## Implementation Progress - 2026-07-04

Implemented in the D-2 uplift branch:

- Added `qa:d2-demo-smoke-template` and `qa:d2-demo-smoke-report` so device rehearsal has a blocked template and an explicit `READY_FOR_D2_DEMO` gate.
- Added `qa:d2-demo-android-build` so the short ASCII Android build path is reproducible from the project:
  `npm run qa:d2-demo-android-build -- C:\gsb`.
- Added `qa:d2-demo-android-device-smoke` so the connected-device install and app launch checks can be run as one ADB-backed command before manual audible checks. It can now update the D-2 smoke report directly with `--report <json>`.
- Improved `qa:d2-demo-android-device-smoke --report` so a successful connected-device run refreshes the report `deviceLabel` only when ADB `ro.product.model` and `ro.build.version.release` both return concrete values, and always writes the actual APK path, reducing stale template metadata before the manual audible checks without guessing device evidence from `adb devices -l`.
- Tightened ADB smoke failure evidence: when a device is detected but APK install or app launch fails, `qa:d2-demo-android-device-smoke --report` now records `adb-device-detected` as `pass` and `apk-installed-and-launched` as `fail` with the ADB exit details instead of leaving the report in a vague blocked state.
- Tightened ADB smoke pass criteria again: textual install/launch failures such as `Failure [INSTALL_FAILED_*]`, `Error type 3`, missing activity, or unresolved intents are treated as failed smoke evidence even when the ADB process exits zero.
- Added a post-launch process check to `qa:d2-demo-android-device-smoke`: after `am start`, the command runs `adb shell pidof <package>` and only records `apk-installed-and-launched` as pass when the app process is still running, reducing false pass risk from immediate startup crashes.
- Tightened the D-2 smoke report gate to require that `apk-installed-and-launched` pass evidence include the confirmed app process pid, so a hand-edited install/launch note without `pidof` evidence no longer marks the APK launch path as ready.
- Kept the process evidence gate compatible with real `pidof` output by accepting one or more numeric process IDs while still rejecting install/launch notes that omit process evidence.
- Made Home/Browse/Library playback more honest: fixture/practice result playback routes through `playLibraryAudio`, visible decorative share-card controls were reduced, and exported fallback audio resolves to a bundled WAV.
- Added product recording capture ports: `startRecordingCapture`, `stopRecordingCapture`, and `discardRecordingCapture`.
- Wired S05 recording start/stop effects through the audio service boundary. Event recording remains the source of truth; when a capture URI is returned, it is attached to the saved `Take`.
- Added a local Expo recording capture adapter using the existing Expo recording probe runtime, but kept it as an explicit injectable port instead of the default product path. HTTP services intentionally return `unavailable` for recording capture until a backend/native remote contract exists.
- Added `recordingCaptureStatus` and a visible S05 notice for `audio capture starting/active/saving` and `event recording only` fallback states.
- Added export provenance fields: `renderKind`, `sourceTakeId`, and `sourceRecordingUri`.
- Made both Save & Share export and normal S07 export prefer captured `recordingUri`; otherwise they mark `event_replay` or `demo_sample` instead of hiding fallback behavior.
- Added provenance labels to library/share models so exported items expose `audio capture`, `event replay`, or `demo sample` in visible metadata.
- Implemented local `playWorkMix` fallback playback so S07 preview uses the best available work audio artifact instead of returning `unavailable`.
- Upgraded local S07 mix preview for uncaptured instrument takes: it replays only the audible `createWorkMixPlan` tracks and scales event velocity by track volume, so mute/solo/volume are reflected in the preview path.
- Tightened captured-audio preview/export selection so muted tracks and non-solo tracks no longer leak into S07 preview or exported provenance.
- Added visible playback failure notices for both S19 library playback and S07 work preview instead of leaving failed play taps silent.
- Wired S17 share preview to the same audio service boundary as the library player, including visible failure notice when preview playback fails.
- Tightened S05 live readiness for instrument switching: changing instruments on S05 refreshes active settings, re-enters `preparing`, calls `prepareLivePerformanceAudio` for the new instrument, and ignores stale success/failure results from the old instrument.
- Kept demo-spine audio local even when `EXPO_PUBLIC_API_BASE_URL` is configured: runtime services now route recording capture, work mix preview, export, library playback, and live performance playback through the local audio fallback while preserving remote library sync.
- Reduced export provenance false positives: `event_replay` exported items with a source work now play through `playWorkMix` from the source work instead of playing the bundled export fallback WAV directly.
- Added S09 extra-instrument capture parity with S05: applying an extra instrument track now moves capture to `stopping`, stops the capture service, and attaches the returned URI to the newly added track take.
- Tightened export provenance defaults: remote/service exports without explicit provenance are stored as `demo_sample` instead of leaving `renderKind` undefined, and successful `exportWorkAudio` service results now require `renderKind`.
- Improved deterministic S07 event replay preview: uncaptured instrument events are shifted by `startedAtBeat` using the take recording BPM, so tracks added later in the arrangement no longer preview at beat 1.
- Forwarded captured-audio track volume into S07 preview playback, and applied that volume in the Expo library audio player before starting playback.
- Tightened S09 extra-instrument capture lifecycle: restart now discards the previous capture before starting a new one, cancel discards the active capture, and S09 shows the same capture status notice as S05.
- Localized recording capture notices for the presentation UI so S05/S09 explain capture progress and event-only fallback in Korean.
- Added an injectable recording-capture storage port plus a tested Expo FileSystem-compatible copy adapter, so captured cache URIs can be converted to persistent document-directory URIs before the product state stores them.
- Added `expo-file-system` as a direct dependency and wired `GarakAuthEntryApp` to inject the Expo legacy FileSystem storage adapter by default, so normal app runtime persists supported recording capture URIs under the document directory before saving them to product state.
- Tightened recording capture persistence failure handling: when a configured storage adapter cannot persist the captured URI, the service now returns an explicit error instead of exposing an unpersisted cache URI as if it were safe product state.
- Tightened event-replay export playback: `event_replay` library items with a missing source work now fail visibly instead of falling through to the bundled demo WAV and hiding the provenance gap.
- Tightened D-2 smoke evidence handling: the Android device smoke command writes blocked evidence into the report when no ADB device is connected, the report gate rejects `not connected`/`no connected` placeholder device labels, and automated ADB pass checks must be written by the smoke command rather than hand-edited notes.
- Improved D-2 smoke report diagnostics so invalid report metadata, such as a placeholder device label, does not discard usable check evidence; blocked/manual checks remain visible in the summary.
- Added `docs/qa/d2-demo-runbook.md` and linked it from the QA README so the presenter has one D-2 path for short ASCII Android build, ADB install/launch smoke, manual audible checks, Day-5 evidence, and fallback wording.
- Tightened visible playback affordances for the demo spine: the S20 share-feed player card and S18 shareable/demo library rows now dispatch `playLibraryItemNow`, which opens S19, marks the selected item as playing, and triggers the existing audio service effect in one tap.
- Made S19 player auxiliary controls honest: favorite, previous, next, and AirPlay now exist in the action contract and render disabled until real actions are implemented, instead of looking tappable while doing nothing.
- Added a library playback asset mapping test that verifies demo, export fallback, practice result, and shared-recording placeholder routes all resolve to real bundled WAV files.
- Sequenced the local recording capture port so `stopRecordingCapture` and `discardRecordingCapture` wait for an in-flight `startRecordingCapture`, reducing fast-tap start/stop races in S05/S09.
- Wired S21 shared recording playback through the audio service boundary with a `sharedRecording` source kind and bundled fallback audio for placeholder community fixtures.
- Added visible S21 playback failure notice and cleared `playingSharedRecordingId` on playback failure so a failed shared recording does not remain visually paused/playing.
- Tightened D-2 smoke report manual pass evidence: audible/home, S05 instrument, recording take, library export, and Day-5 probe passes now require concrete notes instead of vague hand-written pass text.
- Tightened D-2 smoke report manual audible evidence again: pass notes such as `not audible`, `no sound`, `silent`, `inaudible`, `muted`, or missing/unavailable audio are rejected instead of satisfying the manual gate.
- Tightened recording smoke pass evidence: `recording-event-take-saved` now requires S05/S09 path, saved work/take evidence, and either capture URI evidence or a visible event-only fallback label, preventing a generic saved-take note from overclaiming audio recording readiness.
- Tightened S21 save-to-library playback: saved shared demo recordings no longer store `placeholder://` URIs in exported audio items; they store the bundled source playback URI and show `demo sample` provenance.
- Rejected zero/invalid recording capture durations even when a URI is returned, so empty captures stay as event-only fallback instead of being promoted to `audio_capture`.
- Routed reference-only remix preview/export through the source shared recording audio mapping, and stopped treating missing reference audio as a successful generic export fallback.
- Extracted and tested the S05/S09 live event playback failure path so `playPerformanceEvents` service errors dispatch a visible live-audio failure state.
- Tightened stale player selections: missing work/export/practice-result selections and stale S21 shared-recording playback now dispatch visible failure instead of leaving a playing state or falling back to the featured fixture.
- Tightened S21 shared-recording detail actions: an explicit missing/stale selected shared recording no longer displays the featured fixture or allows remix/save fallback; default S21 entry without an explicit selection still opens the featured recording.
- Made generic S21 detail navigation select the featured shared recording explicitly, so default detail entry is deterministic while explicit stale selections still stay unavailable and non-playable.
- Tightened export false positives: direct S07 export no longer creates a library export when every track is muted, and Save & Share service exports now reject blank URIs, non-positive durations, and missing render provenance before `completeWorkAudioExport`.
- Tightened recording failure handling: when recording capture start fails and the pending S05/S09 take has neither events nor a recording URI, completion/apply no longer creates an empty work or instrument track.
- Added S05/S09 recording progress labels for active takes, showing event count, approximate duration, and BPM instead of only a generic recording state.
- Tightened stale recording capture follow-ups: late S05 attach/failure results no longer clear or overwrite a newer active S09 recording state.
- Tightened S17 share preview failure handling: stale explicit share selections now dispatch a visible playback failure instead of leaving the preview marked as playing with no audio service call.
- Tightened S07/S19 empty mix playback: muted-all works now fail visibly before preview/player playback instead of treating a zero-track mix as successful silent playback.
- Tightened `audio_capture` export provenance: Save & Share service exports now require a non-blank `sourceRecordingUri` before storing an item as captured audio.
- Tightened recording capture attach failures: if a stopped capture returns after its target take is unavailable, the capture status moves to a visible failed state instead of remaining stuck at `stopping`.
- Tightened S19/S20 stale player selections at the view-model layer: explicit missing selections now render unavailable/disabled states instead of falling back to a different library or share-feed item.
- Made disabled S19/S20/S21 playback affordances visibly dimmed, so unavailable or unimplemented play actions are not presented as active controls.
- Tightened export/share stale completion handling: reducer completions are ignored when the active export or publish target has changed, and captured-audio exports now require complete source-take/source-recording provenance before storage.
- Tightened `audio_capture` export URI evidence: service and reducer export completions now require captured audio artifacts to use file-backed `file://` or `content://` URIs, preventing bundled `garak://library-demo/...` fallbacks from being stored as real capture exports.
- Tightened `event_replay` sharing provenance: S17 share preparation, share publishing effects, and share publish completions now require the replay export's source work to still exist, so stale replay exports cannot be shared as if their event source were available.
- Normalized absolute S05/S09 performance event timestamps before saving takes, preventing epoch-ms recordings from inflating progress, duration, and export metadata.
- Tightened S09 capture cancel cleanup: cancel now enters a `discarding` state, successful discard completes explicitly, and discard failures surface as visible recording-capture errors instead of being swallowed.
- Tightened stale S05/S09 capture attachment: late S05 capture attach results no longer clear a newer S09 stop/attach state.
- Tightened legacy placeholder export playback: `placeholder://` exported audio is still visible as historical library data, but is no longer sent to the audio service or exposed as playable/shareable from S19/S20.
- Added direct URI classification coverage so blank, whitespace-padded, and mixed-case `placeholder://` exported audio stays non-playable while real `file://`/demo artifact URIs remain playable.
- Closed the post-review S17/S19 placeholder gap: placeholder exports are no longer prepared as S17 share targets, selected for share preview, accepted by the publish effect, or rendered as a normal S19 exported-audio player detail.
- Blocked misleading mixed-track local audio success: local preview/export now returns an explicit error for multi-track mixes until a real full-mix renderer exists, instead of playing/exporting only the first captured, event, or reference source.
- Added recording capture attempt IDs to S05/S09 capture start/stop/discard follow-ups, so late same-instrument start/failure results cannot overwrite a newer recording attempt.
- Tightened event-replay sharing provenance: `event_replay` exports no longer publish the bundled fallback WAV URI as `fileUri`, avoiding a false "real audio file" signal.
- Tightened preview retry state: successful S07 work preview and S17 share preview now clear stale playback failure notices and mark the player as playing.
- Blocked missing reference-only remix exports in both reducer and local service paths, so an unavailable shared-recording source no longer falls through to a generic demo-sample export.
- Tightened event-replay library playback again: source works with no audible mix tracks now fail visibly instead of calling `playWorkMix` and showing a silent success state.
- Tightened S09 cancel cleanup again: `cancelInstrumentTrack` only calls recording-capture discard cleanup when the post-reducer state is explicitly `discarding`, avoiding wildcard cleanup actions from stale cancels.
- Tightened S05 live audio preparation retry handling with explicit preparation attempt IDs, so late same-instrument prepare success/failure results cannot overwrite a newer retry or instrument-ready state.
- Split live performance event playback failure from preparation failure with `failLivePerformanceEventPlayback`, allowing preparation completion/failure actions to require exact attempt IDs without weakening visible playback error handling.
- Tightened S05 live playback readiness: touch events still record and animate, but `playPerformanceEvents` is only called after the current selected instrument is in `ready`; late playback failures from a previous instrument are ignored.
- Tightened S09 extra-instrument live readiness: choosing an extra instrument now starts audio preparation, S09 shows the same readiness/retry badge, and S09 touch playback is gated on the chosen instrument reaching `ready`.
- Tightened demo-sample sharing provenance: exported items marked `demo_sample` no longer send the bundled `garak://library-demo/...` fallback URI as a file attachment; share uses link-only evidence unless the export is a real `audio_capture` or legacy `file://` artifact.
- Tightened recording capture attempt IDs further: capture start/stop/discard follow-up actions now require an exact `captureAttemptId`, and id-less same-instrument follow-ups after a restart are ignored instead of acting as wildcards.

Verified locally:

- `tsc --noEmit`: pass.
- `vitest run`: 85 files, 872 tests pass.
- `npx expo-doctor`: pass.
- `expo export --platform web`: pass.
- Android debug build through `qa:d2-demo-android-build -- C:\gsb`: pass.
  - APK: `C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk`
  - Size: 216,490,384 bytes.
- `qa:d2-demo-android-device-smoke -- C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk --report docs/qa/d2-demo-smoke-20260704.json`: blocked with `no connected adb device`.
- `$env:ANDROID_HOME\platform-tools\adb.exe devices -l`: no connected devices; plain `adb` was not on the current shell `PATH`.
- `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.example.json`: `INCOMPLETE_DEVICE_EVIDENCE`, `NO_GO`; the example probe still lacks required physical-device evidence.
- `qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-20260704.json`: `NOT_READY_FOR_D2_DEMO`; the placeholder no-device label is rejected, short ASCII Android build is marked pass, and all connected-device/audible checks remain blocked.
- `git diff --check`: pass; only line-ending conversion warnings were reported.

Still not cleared:

- The earlier automated build pass had no actual Android device connected; follow-up device evidence is recorded below.
- The current D-2 smoke report now names `SM-S928N / Android 15`, but it remains `NOT_READY_FOR_D2_DEMO` until manual audible playback checks and Day-5 probe evidence are filled.
- `qa:day5-audio` still needs real physical-device `expo-audio` evidence.
- The default product recording path is event-only to avoid recording user voice. The Expo microphone capture adapter remains available only when explicitly injected for probe/debug work.
- Offline multitrack mix rendering is still deferred; export provenance now prevents this from being mislabeled as a final rendered mix.

2026-07-05 follow-up:

- Connected `SM-S928N / Android 15` through ADB and drove the dev-client S05 path from Guest Mode to S07 with UIAutomator/ADB input.
- Confirmed microphone permission prompt, active recording state, three janggu zone taps, S07 work `장구 작업 1`, and `Track 1 : 장구 100%`.
- Confirmed persisted capture file evidence with `adb run-as`: `files/garak-recordings/1783242751252-recording-b196718a-b10c-4b75-a924-24609a7232c5.m4a`.
- Fixed a fast Save & Share race: S07/S08 export actions now no-op and UI buttons disable while recording capture finalization is still pending without a `recordingUri`, preventing premature `event_replay` exports before the captured URI attaches.
- Updated `docs/qa/d2-demo-smoke-20260704.json` so `recording-event-take-saved` is pass with concrete work/take/capture evidence. Manual audible checks and Day-5 physical-device probe evidence remain blocked until a human confirms sound.

2026-07-05 follow-up 2:

- Restarted Metro with `--clear` after a stale dev-client module graph produced `ReferenceError: Property 'reconcileCountersWithLibrarySnapshot' doesn't exist`; the clean bundle rendered normally.
- Confirmed the S05 recording flow requires two taps: the top REC button opens the recording setup panel, and the panel's `recording start` button starts the native capture.
- Confirmed a new persisted capture file on `SM-S928N / Android 15`: `files/garak-recordings/1783246168561-recording-24fca193-01f4-4cf9-9726-c05685e8b653.m4a`.
- Confirmed the counter/snapshot fix on-device: S07 created `Janggu work 2`, S17 export metadata showed `9 sec`, `janggu`, and `audio capture`; the previous false `event replay` label did not recur.
- Tapped S17 preview and confirmed visible `previewing` state plus no ReactNativeJS logcat error. Audible speaker output is still not independently confirmed by Codex, so `library-export-playback` remains blocked in the QA JSON.
- Added follow-up docs for stale backlog/architecture references: `docs/plans/backlog/2026-07-05-s05-recording-capture-update.md` and `docs/architecture/free-play-recording-capture-update.md`.
- Rebuilt the latest source through `qa:d2-demo-android-build -- C:\gsb`; APK size is now `221,141,609` bytes.
- Fixed `qa:d2-demo-android-device-smoke` process confirmation to retry `pidof` through an Android shell loop after `am start`, avoiding a false failure while the Expo dev launcher is still starting.
- Re-ran connected-device install/launch smoke on `SM-S928N / Android 15`; `apk-installed-and-launched` passed with process pid `19094`.

2026-07-05 follow-up 3:

- Confirmed auth polish backlog already exists for the non-critical Google/Guest icon issue: the Google button still renders a text `G`, and `Guest Mode` has no left icon.
- Confirmed S20 Share/Browse stays portrait on `SM-S928N / Android 15`; tapping `My Arirang` opened the S19 player, showed the pause control and elapsed time `0:13`, and produced no ReactNativeJS/AndroidRuntime/ExpoModulesCore logcat error.
- Kept `home-browse-demo-playback` blocked in `docs/qa/d2-demo-smoke-20260704.json` because the UI/logcat evidence does not prove audible speaker output.
- Added S07 to the runtime landscape frame set so the track/layer editor now follows the same wide layout policy as the performance/recording screens.
- Confirmed on device that S07 locks to landscape (`rotation=1`, `3120x1440`) and returning to S18 restores portrait (`rotation=0`, `1440x3120`).
- Guarded S18 library row keys against duplicated persisted work ids by including row order in the render id, which cleared the React duplicate-key warning caused by old duplicate `work-1` data while preserving the original `workId` action target.
- Verified related tests: `garakScreenFrame`, `garakScreenOrientation`, `garakNativeOrientationConfig`, and `libraryScreenModel`.
- Rebuilt the latest source through `qa:d2-demo-android-build -- C:\gsb`; APK size remains `221,141,609` bytes.
- Re-ran connected-device install/launch smoke on `SM-S928N / Android 15`; `apk-installed-and-launched` passed with process pid `23244`.
- Re-ran `qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-20260704.json`; the report has no shape/missing/duplicate/failed issues, but remains `NOT_READY_FOR_D2_DEMO` because home/browse audio, S05 instrument audio, library export audio, and Day-5 physical-device probe evidence are still blocked.

2026-07-05 follow-up 4:

- Tightened `s05-instrument-touch-sound` smoke evidence so a pass note must name S05, confirm positive audible output, include at least three taps/zones/pads/strings, and say each tap was audible or no taps were silent.
- Added `Blocked checks without notes` to the smoke summary and filled the current Day-5 blocked note so unresolved checks still explain why they are not ready.
- Updated the D-2 runbook manual audible checklist with the stricter S05 and blocked-note requirements.
- Verified `src/qa/__tests__/d2DemoSmokeReportCommand.test.ts`: 16 tests pass.
- Verified `tsc --noEmit`: pass.
- Re-ran `qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-20260704.json`: still `NOT_READY_FOR_D2_DEMO`, with blocked checks unchanged and `Blocked checks without notes: none`.

2026-07-05 follow-up 5:

- Tightened `qa:day5-audio` exit semantics: valid probe records now exit 0 only when the Day-5 summary reaches `FINAL_ENGINE_SELECTED`; `INCOMPLETE_DEVICE_EVIDENCE` and `NO_FINAL_ENGINE` now exit non-zero.
- Added regression coverage that an `expo-audio`-only physical-device probe remains `INCOMPLETE_DEVICE_EVIDENCE`, names missing `react-native-audio-api`, and does not select a final engine.
- Tightened D-2 `day5-expo-audio-probe-updated` pass evidence so notes must include the probe file, the smoke report device label, `qa:day5-audio` exit/status, and whether the note is D-2 scoped evidence or a final Day-5 engine selection.
- Updated the D-2 runbook, Day-5 checklist, Day-5 decision record, QA README, and current smoke JSON to reflect the stricter exit/status wording.
- Verified related tests: `d2DemoSmokeReportCommand`, `d2DemoRunbookDocumentation`, `audioEngineProbeHandoffCommand`, `audioEngineProbeHandoff`, `audioEngineDecisionRecord`, and `audioEngineDecisionSummary` all pass.
- Verified `tsc --noEmit`: pass.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.example.json`: exits 1 with `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO`, as intended for the negative fixture.
- Re-ran `qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-20260704.json`: still `NOT_READY_FOR_D2_DEMO`, with the same four blocked checks and no empty blocked notes.

2026-07-05 follow-up 6:

- Added `--evidence <device-evidence.json>` to `qa:d2-demo-android-device-smoke` so successful ADB install/launch runs can write a sidecar JSON with ADB serial/details, APK path, package/activity, launch target, process pid, resolved `pm path`, and the non-automated checks not covered by device-smoke automation.
- Kept the sidecar separate from D-2 smoke check notes so automated runtime evidence does not turn manual audible checks into pass results.
- Updated the D-2 runbook to show the optional sidecar path and explicitly state that sidecar evidence is not audible proof.
- Verified `src/qa/__tests__/d2DemoAndroidDeviceSmokeCommand.test.ts`: 15 tests pass.
- Re-ran the related D-2/Day-5 QA test bundle: 7 files, 54 tests pass.
- Verified `tsc --noEmit`: pass.
- Re-ran `qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-20260704.json`: still `NOT_READY_FOR_D2_DEMO`.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.example.json`: still exits 1 with `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO`.
- Re-ran connected-device smoke with `--evidence docs/qa/d2-demo-smoke-20260704.device-evidence.json` on `SM-S928N / Android 15`; install/launch passed with process pid `31981`, `pm path` resolved the installed package path, and the sidecar lists the non-automated checks not covered by device-smoke automation.
- Re-ran `qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-20260704.json` after sidecar generation: still `NOT_READY_FOR_D2_DEMO`, because home/browse audio, S05 instrument audio, library export audio, and Day-5 physical-device probe evidence remain blocked.
- Renamed the sidecar list from `manualAudibleChecksStillRequired` to `nonAutomatedChecksNotCoveredByDeviceSmoke` and aligned the command stdout so build/probe/manual-flow checks are not mislabeled as audible-only requirements.

2026-07-05 follow-up 7:

- Re-ran connected-device smoke with `--evidence docs/qa/d2-demo-smoke-20260704.device-evidence.json` on `SM-S928N / Android 15`; install/launch passed with process pid `3798`.
- Confirmed the sidecar now records foreground activity evidence: `ResumedActivity: ActivityRecord{9a361a u0 com.gukakstudio.prototype/.MainActivity t10549}` and `foregroundWindowMentionsPackage: true`.
- Confirmed the sidecar post-launch runtime-error scan is clean: `logcatRuntimeErrorScan.matchingLineCount` is `0`, and `AndroidRuntime`/`ReactNativeJS`/`ExpoModulesCore` filtered lines are empty for the launch window.
- Re-ran `qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-20260704.json --evidence docs/qa/d2-demo-smoke-20260704.device-evidence.json`: still `NOT_READY_FOR_D2_DEMO`; the remaining blockers are `home-browse-demo-playback`, `s05-instrument-touch-sound`, `library-export-playback`, and `day5-expo-audio-probe-updated`.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.example.json`: still exits `1` with `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO`, as intended for the negative fixture.
- Verified the related QA tests again: `d2DemoAndroidDeviceSmokeCommand`, `d2DemoSmokeReportCommand`, `d2DemoRunbookDocumentation`, and `audioEngineProbeHandoffCommand` pass with 41 tests total; `tsc --noEmit` and `git diff --check` also pass.
- Confirmed the non-critical auth polish item is already tracked in `docs/logs/2026-06-23-figma-design-system-ui-backlog.md`: replace the plain text Google `G` mark with the official Google G logo and add a left icon to `Guest Mode` later.
- Closed the sidecar gate gap found during review: `qa:d2-demo-smoke-report` now accepts `--evidence <device-evidence.json>` and a launch pass requires matching sidecar evidence for process pid, foreground activity/window, resolved package path, and a clean filtered runtime logcat scan.

2026-07-05 follow-up 8:

- Rebuilt the latest source through `qa:d2-demo-android-build -- C:\gsb`; Android debug build passed and the APK remains `221,141,609` bytes.
- Re-ran connected-device install/launch smoke with `--evidence docs/qa/d2-demo-smoke-20260704.device-evidence.json` on `SM-S928N / Android 15`; install/launch passed with process pid `12643`, foreground activity evidence, and a clean filtered runtime logcat scan.
- Confirmed the current auth screen still matches the deferred polish backlog: the Google button renders a plain text `G`, and `Guest Mode` has no left icon.
- Added successful S05 live playback service evidence to product state/model/UI: after a ready janggu tap, the landscape performance screen now renders `Live audio sent: 1 events`.
- Confirmed on device that Guest Mode -> Home portrait -> S05 landscape works, janggu zone taps reach the live audio service success path, and filtered AndroidRuntime/ReactNativeJS/ExpoModulesCore logcat output remains empty.
- Kept `s05-instrument-touch-sound` blocked in `docs/qa/d2-demo-smoke-20260704.json` because this automatic evidence proves service success, not audible speaker output.

2026-07-05 follow-up 9:

- Tightened `audio_capture` export provenance again: Save & Share service results and reducer completions now require `sourceTakeId` to exist in the exported work, belong to an audible mix track, and have a `recordingUri` matching `sourceRecordingUri`.
- Added regression coverage for missing source takes, mismatched source recording URIs, and muted source takes so stale or dishonest service completions cannot store a captured-audio export that is not backed by the work's actual take metadata.
- Verified the recording/export provenance bundle: `garakProductEffects`, `garakProductState`, `garakProductServices`, `garakRuntimeProductServices`, `freeCreationMixEditorModel`, `libraryScreenModel`, and `shareScreenModel` pass with 259 tests total.
- Verified `tsc --noEmit`: pass.
- Verified full `vitest run`: 87 files and 900 tests pass.
- Verified `git diff --check`: pass, with only line-ending conversion warnings.
- Re-ran `qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-20260704.json --evidence docs/qa/d2-demo-smoke-20260704.device-evidence.json`: still `NOT_READY_FOR_D2_DEMO`, with report issues none and the remaining blockers unchanged.

2026-07-05 follow-up 10:

- Added `--recording-evidence <recording-evidence.json>` to `qa:d2-demo-smoke-report`; any `recording-event-take-saved` pass that claims a capture URI now requires a sidecar with matching URI, package name, file existence, and non-zero file size.
- Confirmed the current device capture still exists through `adb run-as com.gukakstudio.prototype ls -l files/garak-recordings`: `1783246168561-recording-24fca193-01f4-4cf9-9726-c05685e8b653.m4a` is `130,114` bytes.
- Added `docs/qa/d2-demo-smoke-20260704.recording-evidence.json` and updated the D-2 runbook command to include the recording sidecar when capture URI evidence is used.
- Tightened non-file recording URI handling: S05/S09 capture attach now rejects non-`file://`/`content://` URIs, and local/reducer export artifact selection no longer promotes non-file `recordingUri` values to `audio_capture`.
- Verified targeted QA/product tests: `d2DemoSmokeReportCommand`, `d2DemoRunbookDocumentation`, `garakProductState`, and `garakProductServices` pass.
- Re-ran `qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-20260704.json --evidence docs/qa/d2-demo-smoke-20260704.device-evidence.json --recording-evidence docs/qa/d2-demo-smoke-20260704.recording-evidence.json`: still `NOT_READY_FOR_D2_DEMO`, with report issues none and the remaining blockers unchanged.

2026-07-05 follow-up 11:

- Added the deferred UI polish note for the save/edit bottom CTA layout to `docs/logs/2026-06-23-figma-design-system-ui-backlog.md`: the `작업 저장` / `Save & Share Project` box should be aligned with the nearby `Mix` button size/radius/padding rules later.
- Tightened local library snapshot loading so persisted non-`file://`/`content://` take `recordingUri` values are stripped before re-entering product state.
- Downgraded stale persisted `audio_capture` exports during local snapshot load when their source take evidence is invalid: event-backed exports become `event_replay`, otherwise they fall back to `demo_sample`.
- Marked captured work preview playback with `sourceKind: 'audioCapture'` instead of `demo`, while keeping non-capture fallback playback as `demo`.
- Verified the related product/QA bundle: 9 files and 289 tests pass.
- Verified `tsc --noEmit`: pass.
- Verified full `vitest run`: 87 files and 911 tests pass.
- Verified `git diff --check`: pass, with only line-ending conversion warnings.
- Re-ran `qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-20260704.json --evidence docs/qa/d2-demo-smoke-20260704.device-evidence.json --recording-evidence docs/qa/d2-demo-smoke-20260704.recording-evidence.json`: still `NOT_READY_FOR_D2_DEMO`, with report issues none and the same four blocked checks.

2026-07-05 follow-up 12:

- Added `--day5-probe <probe-record.json>` to `qa:d2-demo-smoke-report`; if `day5-expo-audio-probe-updated` is marked pass, the gate now requires a readable Day-5 probe sidecar.
- The Day-5 sidecar must parse as an audio probe record and include an `expo-audio` `physical-device` probe whose `deviceLabel` matches the D-2 smoke report device label.
- The pass note must also name the same `--day5-probe` file path, keeping the human-readable smoke evidence tied to the machine-checked probe record.
- Updated the D-2 runbook gate command to include `--day5-probe docs/qa/day-5-audio-engine-probes.real-device.json` and documented missing/incomplete Day-5 probe sidecar evidence as a common blocker.
- Verified `d2DemoSmokeReportCommand` and `d2DemoRunbookDocumentation`: 2 files and 27 tests pass.
- Verified `tsc --noEmit`: pass.
- Re-ran `qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-20260704.json --evidence docs/qa/d2-demo-smoke-20260704.device-evidence.json --recording-evidence docs/qa/d2-demo-smoke-20260704.recording-evidence.json`: still `NOT_READY_FOR_D2_DEMO`, with report issues none and the same four blocked checks.
- Verified `git diff --check`: pass, with only line-ending conversion warnings.

2026-07-05 follow-up 13:

- Added a D-2 scoped `--d2-expo-only` mode to the prototype handoff check and probe-record commands so a real `expo-audio` physical-device handoff can generate a parser-valid one-candidate probe sidecar without hand-editing JSON.
- Kept the default Day-5 path unchanged: without `--d2-expo-only`, `qa:prototype-handoff-check`, `qa:prototype-probe-record`, `qa:day5-readiness`, and `qa:day5-audio` still require the normal final Day-5 candidate evidence before final engine selection.
- Updated the D-2 runbook and QA README to document the command sequence and the boundary: this is D-2 scoped evidence only, not final Day-5 readiness, not final engine selection, and not audible proof for the D-2 speaker checks.
- Verified `prototypeHandoffCheckCommand` and `prototypeProbeHandoffCommand`: 2 files and 35 tests pass.

2026-07-05 follow-up 14:

- Added `Evidence still needed` to the D-2 smoke summary so blocked checks print the concrete remaining operator evidence instead of only listing check IDs.
- Kept the audible boundary intact: the prompts tell the human what to confirm, but they do not turn service/runtime sidecar evidence into audible pass evidence.
- Changed Day-5 probe sidecar reading so `--day5-probe` is only required once `day5-expo-audio-probe-updated` is marked `pass`; blocked Day-5 evidence no longer creates a report issue just because the future probe file path is already present in the runbook command.
- Updated the D-2 runbook to document the new summary line and the conditional Day-5 probe sidecar requirement.
- Verified `d2DemoSmokeReportCommand` and `d2DemoRunbookDocumentation`: 2 files and 30 tests pass.

2026-07-05 follow-up 15:

- Tightened `library-export-playback` smoke evidence so a pass note must include export provenance: `audio capture`, `event replay`, or `demo sample`.
- Updated the D-2 runbook and `Evidence still needed` prompt so the operator records both audible speaker confirmation and the export provenance actually being demonstrated.
- This keeps captured-audio/export provenance honest without treating preview state, sidecar file existence, or clean logcat as audible proof.
- Verified `d2DemoSmokeReportCommand` and `d2DemoRunbookDocumentation`: 2 files and 31 tests pass.

2026-07-05 follow-up 16:

- Root caused the reported `장구 쨌 event replay` label to stale/corrupted metadata separators and changed library/share export metadata separators to ` / `.
- Tightened the product default recording path to event-only: `createLocalGarakProductServices()` no longer opens the Expo microphone recorder unless a native capture port is explicitly injected.
- Changed S07/S17/S18 default preview/export selection so instrument events replay before any mic capture artifact, preventing user voice from becoming the default instrument recording playback.
- Tightened `library-export-playback` smoke evidence again: the S05/S09 instrument-only export path must now name `event replay` provenance; `audio capture` no longer clears that check.
- Marked the existing D-2 smoke JSON recording/export evidence as stale where it predates the event-only provenance change; rebuilt APK and device smoke are required before claiming current readiness.
- Verified `tsc --noEmit`, full `vitest run` (87 files, 920 tests), and `git diff --check`.

2026-07-05 follow-up 17:

- Rebuilt the current event-only recording/export code from the short ASCII path with `npm run qa:d2-demo-android-build -- C:\gsb`.
- Android debug build passed and produced `C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk`, 221,141,609 bytes.
- Attempted `npm run qa:d2-demo-android-device-smoke -- C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk --report docs\qa\d2-demo-smoke-20260704.json --evidence docs\qa\d2-demo-smoke-20260704.device-evidence.json`; it failed with `no connected adb device`.
- Updated `docs/qa/d2-demo-smoke-20260704.json` so build is current/pass and ADB/install remain blocked until the presentation device is reconnected.

2026-07-06 follow-up 18:

- Replaced the one-second library/demo playback fallback with bundled presentation-length WAV assets: `assets/audio/demo/my-arirang-showcase.wav` is about 18.65 seconds, and `assets/audio/demo/daegeum-showcase.wav` is 15 seconds.
- Mapped Home/S20 demo playback, S18/S19 export fallback playback, practice-result playback, and placeholder shared-recording playback to the bundled assets instead of placeholder or one-shot sample URIs.
- Fixed the S18 library work-row action mismatch: rows that show playable controls now dispatch `playLibraryItemNow` for work items, so the visible play affordance no longer routes directly to the editor.
- Verified on SM-S928N / Android 15 before returning the phone: S20 My Arirang playback and S18 exported event-replay playback both opened S19, showed the pause control after 6 seconds, and produced app `AudioTrack` playback lasting about 18.65 seconds. These checks remain blocked for D-2 readiness until a human confirms audible speaker output.
- Verified `tsc --noEmit`, full `vitest run` (88 files, 932 tests), and `expo export --platform web`; the web export includes both new bundled WAV assets.
- Rebuilt from the short ASCII path with `qa:d2-demo-android-build -- C:\gsb`; Gradle `BUILD SUCCESSFUL`, APK `C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk`, 221,141,609 bytes. Robocopy copied both new bundled demo WAV assets into the build directory.
- Re-ran `qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-20260704.json --evidence docs/qa/d2-demo-smoke-20260704.device-evidence.json --recording-evidence docs/qa/d2-demo-smoke-20260704.recording-evidence.json`: still `NOT_READY_FOR_D2_DEMO`, with report issues none. Remaining blockers are human audible confirmation for home/browse playback, S05 taps, library export playback, plus a real Day-5 `expo-audio` probe sidecar.

2026-07-06 follow-up 19:

- Split emulator regression evidence from physical D-2 readiness evidence. `qa:d2-demo-android-device-smoke` now rejects emulator ADB targets by default and only allows them with `--allow-emulator`.
- Emulator runs must not update the physical D-2 smoke report. They can write a separate sidecar such as `docs/qa/d2-demo-smoke-20260704.emulator-evidence.json`, which records `targetKind: "emulator"`.
- Tightened the physical readiness gate so `qa:d2-demo-smoke-report --evidence ...` requires `targetKind: "physical"`, rejects emulator sidecars by `targetKind`, `adbSerial`, or `adbDetails`, and binds sidecar `adbSerial`/`adbDetails` to the `adb-device-detected` smoke note.
- Regenerated the emulator sidecar on `emulator-5556` with the current APK. Install/launch/process checks passed and the sidecar is now explicitly marked as emulator regression evidence.
- Verified targeted QA tests: `physicalDeviceLabel`, `d2DemoAndroidDeviceSmokeCommand`, and `d2DemoSmokeReportCommand`.
- This does not clear the remaining D-2 blockers: human audible speaker confirmation and real physical-device Day-5 `expo-audio` probe evidence are still required.

2026-07-06 follow-up 20:

- Fixed S09 live-audio retry parity: the extra-instrument screen already rendered the same readiness/retry badge as S05, but `retryLivePerformanceAudioPreparation` only worked on S05. It now retries from S09 as well.
- Added reducer and effect coverage so a failed S09 extra-instrument preparation retries the same extra instrument and calls `prepareLivePerformanceAudio` through the service boundary.
- Rebuilt the current source through `qa:d2-demo-android-build -- C:\gsb`; Gradle `BUILD SUCCESSFUL`, APK `C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk`, 221,141,609 bytes.
- Re-ran emulator install/launch smoke on `emulator-5556` with `--allow-emulator`; it passed and regenerated `docs/qa/d2-demo-smoke-20260706.emulator-evidence.json` with `targetKind: "emulator"`.
- Re-ran the physical smoke report with the emulator sidecar and confirmed it is rejected as non-physical evidence. Re-ran with the physical sidecar and report issues remain `none`; the same four blocked checks remain.
- Verified `tsc --noEmit`, full `vitest run` (88 files, 942 tests), and `git diff --check` with only line-ending conversion warnings.

2026-07-06 follow-up 21:

- Added a shared S05/S09 live-audio readiness badge model so the play screens now show `소리 준비 완료` as soon as the live sampler is ready, even before the first tap.
- Kept post-tap playback evidence visible as `Live audio sent: N events`, and centralized preparing/failed/retry labels in `getFreePlayLiveAudioStatusModel` instead of branching inside the UI component.
- Verified the presentation entry point still does not inject native microphone capture, preserving the event-only recording default unless a capture port is explicitly provided.
- Re-verified `tsc --noEmit`, full `vitest run` (88 files, 943 tests), and `git diff --check`; only line-ending conversion warnings were reported by Git.
- Rebuilt the current source through `qa:d2-demo-android-build -- C:\gsb`; Gradle `BUILD SUCCESSFUL`, APK `C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk`, 221,141,609 bytes.
- Re-ran emulator install/launch smoke on `emulator-5556` with `--allow-emulator`; it passed and regenerated `docs/qa/d2-demo-smoke-20260706.emulator-evidence.json` with `targetKind: "emulator"`.
- This emulator evidence is valid for regression coverage while the phone is unavailable, but it still does not clear the physical-only audible speaker checks or the real physical-device Day-5 `expo-audio` probe.

2026-07-06 follow-up 22:

- Reclassified S07 save/edit as a portrait scroll screen instead of a landscape performance screen. `PERFORMANCE_LANDSCAPE_SCREEN_IDS` now keeps only S05/S09/S15 in the landscape lock set.
- Kept S05/S09 performance and recording screens landscape-only, while S07 returns to portrait after recording completion.
- Aligned the S07 Mix, Save, and Save & Share CTAs to the same horizontal inset, height, and radius so the lower action stack no longer looks mismatched.
- Verified the flow on `emulator-5556`: Home/S03/S04/S04A stayed portrait, S05 rotated to landscape, S05 showed `Live audio sent: 6 events` and `event 6` recording evidence, then S07 returned to portrait.
- Captured visual evidence at `temp/s07-cta-layout-portrait-emulator.png`; the S07 lower panel shows Mix, Save, and Save & Share aligned in the same column.
- Verified targeted frame/UI tests: `garakScreenFrame.test.ts` and `garakScreenFlowApp.test.ts` passed with 61 tests.
- Re-verified `tsc --noEmit`, full `vitest run` (88 files, 943 tests), and `git diff --check`; only line-ending conversion warnings were reported by Git.
- Rebuilt the current source through `qa:d2-demo-android-build -- C:\gsb`; Gradle `BUILD SUCCESSFUL`, APK `C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk`, 221,141,609 bytes.
- Re-ran emulator install/launch smoke on `emulator-5556` with `--allow-emulator`; it passed and regenerated `docs/qa/d2-demo-smoke-20260706.emulator-evidence.json` with `targetKind: "emulator"`.
- This remains emulator regression evidence only. It does not clear the physical-only audible speaker checks or the real physical-device Day-5 `expo-audio` probe.

2026-07-06 follow-up 23:

- Switched current regression work back to Android emulator while the presentation phone is unavailable.
- Fixed S19 event-replay export playback so an export with a source work now replays the source work mix instead of falling through to the bundled demo WAV fallback.
- Surfaced library pause failures through `failPlayerPlayback` instead of silently setting the UI idle when the native pause service reports `error`, `unavailable`, or throws.
- Verified targeted effect tests for event-replay playback and pause failure handling, then re-ran the full `garakProductEffects` test file with 62 passing tests.
- Re-verified `tsc --noEmit`, full `vitest run` (88 files, 944 tests), and `git diff --check`; only line-ending conversion warnings were reported by Git.
- Rebuilt the current source through `qa:d2-demo-android-build -- C:\gsb`; Gradle `BUILD SUCCESSFUL`, APK `C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk`, 221,141,609 bytes.
- Re-ran emulator install/launch smoke on `emulator-5556` with `--allow-emulator`; it passed and regenerated `docs/qa/d2-demo-smoke-20260706.emulator-evidence.json` with `targetKind: "emulator"`.
- Re-ran the D-2 smoke report with the emulator sidecar and confirmed it remains `NOT_READY_FOR_D2_DEMO` because emulator evidence is rejected for the physical presentation-device gate.
- This is valid code regression coverage. It still does not clear physical-only audible speaker confirmation for Home/Browse playback, S05/S09 instrument taps, S18/S19 library playback, or the real physical-device Day-5 `expo-audio` probe.

2026-07-06 follow-up 24:

- Exposed S07 Save & Share export failures in the existing mix-player notice area. A failed export for the current work now shows `Export unavailable: ...` instead of leaving the user on a silent failed state.
- Kept playback failure notices higher priority than export failure notices so an active audio playback error remains the most visible message.
- Verified the new notice with a RED/GREEN model test, then re-ran `tsc --noEmit`, full `vitest run` (88 files, 945 tests), and `git diff --check`; only line-ending conversion warnings were reported by Git.
- Rebuilt the current source through `qa:d2-demo-android-build -- C:\gsb`; Gradle `BUILD SUCCESSFUL`, APK `C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk`, 221,141,609 bytes.
- Re-ran emulator install/launch smoke on `emulator-5556` with `--allow-emulator`; it passed and regenerated `docs/qa/d2-demo-smoke-20260706.emulator-evidence.json` with `targetKind: "emulator"`.
- Re-ran the D-2 smoke report with the emulator sidecar and confirmed it remains `NOT_READY_FOR_D2_DEMO`; the remaining blockers are still the physical audible checks and the physical Day-5 `expo-audio` probe.
- Deferred the larger `exportCurrentWork` service-boundary refactor because it touches the S07/S10/S17/S19 reducer contract and should be split from the D-2 emulator regression pass.

2026-07-06 follow-up 25:

- Completed the `exportCurrentWork` service-boundary refactor. The reducer now enters `workExportStatus: exporting` without adding a placeholder exported audio, and `completeWorkAudioExport` is the only path that stores the exported item.
- Added `completionTarget` routing for export completion so S07 preview/export opens S19, while Save & Share continues into S17 after the audio service returns.
- Updated product effects so both S07 export and Save & Share call the `audio.exportWorkAudio` service before persisting exported audio metadata.
- Repaired model/test fixtures that still assumed direct reducer export completion; library and login-sync tests now construct exported audio through the same completion action.
- Verified `tsc --noEmit`, full `vitest run` (88 files, 945 tests), and `git diff --check`; Git only reported existing line-ending conversion warnings.
- Rebuilt the current source through `qa:d2-demo-android-build -- C:\gsb`; Gradle `BUILD SUCCESSFUL`, APK `C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk`, 221,141,609 bytes.
- Re-ran emulator install/launch smoke on `emulator-5556` with `--allow-emulator`; it passed and regenerated `docs/qa/d2-demo-smoke-20260706.emulator-evidence.json` with `targetKind: "emulator"`.
- Re-ran the D-2 smoke report with the emulator sidecar and confirmed it remains `NOT_READY_FOR_D2_DEMO`. The emulator sidecar is valid regression evidence while the phone is unavailable, but it is intentionally rejected for the physical presentation-device gate.
- Remaining physical-only blockers are unchanged: audible Home/Browse playback, S05/S09 instrument taps, S18/S19 library playback, and a real physical-device Day-5 `expo-audio` probe.

2026-07-06 follow-up 26:

- Improved the P1 S07 editing preview path for layered event-only work. Local `playWorkMix` now replays multiple audible instrument event tracks when every audible track can be represented as event replay, preserving track volume and start-beat timing.
- Kept the honest boundary for unsupported real mixes: event-plus-reference/capture/accompaniment combinations and multi-track export still return the existing full-mix-renderer error instead of pretending to render a final mixed artifact.
- Added a TDD regression test through the public local audio service port: two audible event tracks now produce two `playPerformanceEvents` calls with scaled velocity and beat-offset timing.
- Verified `garakProductServices.test.ts` (29 tests), targeted product state/effects/model tests (196 tests), `tsc --noEmit`, full `vitest run` (88 files, 946 tests), and `git diff --check`; Git only reported existing line-ending conversion warnings.
- Rebuilt the current source through `qa:d2-demo-android-build -- C:\gsb`; Gradle `BUILD SUCCESSFUL`, APK `C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk`, 221,141,609 bytes.
- Re-ran emulator install/launch smoke on `emulator-5556` with `--allow-emulator`; it passed and regenerated `docs/qa/d2-demo-smoke-20260706.emulator-evidence.json` with `targetKind: "emulator"`.
- Re-ran the D-2 smoke report with the emulator sidecar and confirmed it remains `NOT_READY_FOR_D2_DEMO` because the remaining checks require physical audible speaker confirmation and physical Day-5 `expo-audio` probe evidence.

2026-07-06 follow-up 27:

- Improved the P1 S07 export path for layered event-only work. Local export now stores multi-track event-only mixes as honest `event_replay` artifacts instead of requiring the deferred full mix renderer.
- Kept the unsupported boundary for real mixed artifacts: reference/capture/accompaniment combinations still return the full-mix-renderer error instead of pretending to produce a final rendered file.
- Added regression coverage for layered event-only export metadata and S19 playback of exported `event_replay` items through the source work mix, preserving audible track selection and volume.
- Verified `garakProductServices.test.ts` (30 tests), `garakProductEffects.test.ts` (63 tests), targeted product state/effects/services/runtime tests (226 tests), `tsc --noEmit`, full `vitest run` (88 files, 948 tests), and `git diff --check`; Git only reported existing line-ending conversion warnings.
- Rebuilt the current source through `qa:d2-demo-android-build -- C:\gsb`; Gradle `BUILD SUCCESSFUL`, APK `C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk`, 221,141,609 bytes.
- Re-ran emulator install/launch smoke on `emulator-5556` with `--allow-emulator`; it passed and regenerated `docs/qa/d2-demo-smoke-20260706.emulator-evidence.json` with `targetKind: "emulator"`.
- Re-ran the D-2 smoke report with the emulator sidecar and confirmed it remains `NOT_READY_FOR_D2_DEMO`: the emulator evidence is valid regression coverage while the phone is unavailable, but it is intentionally rejected for the physical presentation-device gate.

2026-07-06 follow-up 28:

- Tightened `event_replay` provenance across export completion, S19 playback, S17 share preparation, and share publishing. Event-replay exports now require a source take that still exists in the source work instead of only requiring a source work id.
- Stale or hand-edited `event_replay` library items with a missing source take now fail visibly or stay out of share flows instead of replaying the whole current source work and implying unverifiable provenance.
- Kept the D-2 audio boundary intact: event replay remains the default for instrument-only recordings so microphone capture does not become the default playback/export path.
- Verified related product tests: `garakProductState.test.ts`, `garakProductEffects.test.ts`, `shareScreenModel.test.ts`, and `libraryScreenModel.test.ts` passed with 236 tests.
- Re-verified `tsc --noEmit`, full `vitest run` (88 files, 954 tests), and `git diff --check`; Git only reported existing line-ending conversion warnings.
- Rebuilt the current source through `qa:d2-demo-android-build -- C:\gsb`; Gradle `BUILD SUCCESSFUL`, APK `C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk`, 221,141,609 bytes.
- Re-ran emulator install/launch smoke on `emulator-5556` with `--allow-emulator`; it passed and regenerated `docs/qa/d2-demo-smoke-20260706.emulator-evidence.json` with `targetKind: "emulator"`.
- Re-ran the D-2 smoke report with the emulator sidecar and confirmed it remains `NOT_READY_FOR_D2_DEMO` because the remaining checks require physical audible speaker confirmation and a physical-device Day-5 `expo-audio` probe.

2026-07-06 follow-up 29:

- Switched the active regression target back to Android emulator while the presentation phone is unavailable.
- Confirmed ADB currently sees only emulator targets: `emulator-5554` and `emulator-5556`.
- Attempted D-2 emulator smoke on `emulator-5554`; APK install failed, so it was not used as evidence.
- Re-ran D-2 emulator install/launch smoke on `emulator-5556` with `--allow-emulator`; install, launch, process, package path, foreground window, and clean runtime logcat checks passed.
- Wrote fresh emulator-only evidence to `docs/qa/d2-demo-smoke-20260706.emulator-5556-evidence.json`.
- Re-ran the D-2 smoke report with that emulator sidecar and confirmed it remains `NOT_READY_FOR_D2_DEMO`: the sidecar is useful regression evidence, but the physical readiness gate still rejects `targetKind: "emulator"`.
- Remaining blocked checks are unchanged and physical-only: audible Home/Browse playback, audible S05/S09 instrument taps, audible S18/S19 library playback, and a physical-device Day-5 `expo-audio` probe.

2026-07-06 follow-up 30:

- Cleaned up user-facing export provenance labels in S17/S18/S19. `audio_capture`, `event_replay`, and `demo_sample` now render as `녹음 파일`, `이벤트 녹음`, and `데모 샘플` in the library/share models instead of exposing English enum labels.
- Replaced the S17 share-prepare description metadata separator with `/` so presentation copy no longer risks showing a broken middle-dot glyph such as `쨌` in the "사용 악기" context.
- Updated the D-2 smoke report/runbook wording so physical testers can write either `event replay` or the visible Korean label `이벤트 녹음` as instrument-only export provenance, while `audio capture` remains rejected for that check.
- Verified the label changes with RED/GREEN model and QA tests, then re-ran `tsc --noEmit`, full `vitest run` (88 files, 955 tests), and `git diff --check`; Git only reported existing line-ending conversion warnings.
- Rebuilt the current app through `qa:d2-demo-android-build -- C:\gsb`; Gradle `BUILD SUCCESSFUL`, APK `C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk`, 221,141,609 bytes.
- Re-ran emulator install/launch smoke on `emulator-5556` with `--allow-emulator`; it passed and regenerated `docs/qa/d2-demo-smoke-20260706.emulator-evidence.json`.
- Re-ran the D-2 smoke report with the emulator sidecar and confirmed it remains `NOT_READY_FOR_D2_DEMO`; the remaining blockers are still the physical audible checks and physical Day-5 `expo-audio` probe.

2026-07-06 follow-up 31:

- Tightened the actual-device smoke gate so `apk-installed-and-launched` no longer means only "Android process is running." The device evidence sidecar now records UI hierarchy visible text/content descriptions and derives `automatedEvidence.appUiLoaded`.
- The D-2 smoke report now requires `automatedEvidence.appUiLoaded: true`; a sidecar that only reaches Expo Dev Launcher or the development-server picker is rejected as insufficient launch evidence.
- Re-ran emulator smoke on `emulator-5556`; the sidecar now records `appUiLoaded: false`, with no GARAK app UI evidence. This is the correct regression signal for the current emulator state.
- Re-ran the D-2 smoke report with the existing physical sidecar. It now reports `device evidence sidecar must confirm GARAK app UI loaded instead of Expo Dev Launcher`, which means the old physical sidecar is no longer enough for D-2 readiness.
- Updated `docs/qa/d2-demo-runbook.md` so presenters know the sidecar must prove GARAK app UI load, not just Dev Launcher/process launch.
- Verified targeted smoke gate tests: `d2DemoAndroidDeviceSmokeCommand`, `d2DemoSmokeReportCommand`, and `d2DemoRunbookDocumentation` passed with 62 tests.
- Re-verified `tsc --noEmit`, full `vitest run` (88 files, 957 tests), and `git diff --check`; Git only reported existing line-ending conversion warnings.
- Remaining physical-only blockers are unchanged, but the first physical rerun must now also regenerate device evidence after the GARAK UI is actually loaded.

2026-07-06 follow-up 32:

- Added `--dev-client-url <metro-url>` to `qa:d2-demo-android-device-smoke` so debug development-client APK smoke can run `adb reverse tcp:8081 tcp:8081`, open the Expo development-client deep link, and collect UI evidence after the GARAK app bundle loads instead of stopping at Expo Dev Launcher.
- The smoke command now polls UI hierarchy for dev-client runs, dismisses the Expo first-run `Continue` overlay, closes the Expo developer menu, and refuses to treat mixed dev-menu/GARAK background hierarchy as app-loaded evidence.
- Regenerated emulator evidence on `emulator-5556` with `--dev-client-url http://127.0.0.1:8081`; the sidecar now records `launchTarget: "gukakstudio://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"`, `developmentLauncherVisible: false`, `garakAppUiVisible: true`, and `automatedEvidence.appUiLoaded: true`.
- Confirmed the physical readiness gate remains strict: the emulator sidecar is still rejected for physical D-2 readiness, and the old physical sidecar is still rejected because it lacks GARAK app UI load evidence.
- Updated `docs/qa/d2-demo-runbook.md` with the Metro/dev-client startup and `--dev-client-url` smoke commands for both physical-device and emulator-regression runs.
- Added regression coverage for dev-client deep-link launch, reverse failure report updates, first-run overlay dismissal, developer-menu closure, mixed overlay/GARAK hierarchy, and Dev Launcher-to-GARAK polling.
- Verified targeted smoke gate tests: `d2DemoAndroidDeviceSmokeCommand`, `d2DemoSmokeReportCommand`, and `d2DemoRunbookDocumentation` passed with 65 tests before the review fixes, then `d2DemoAndroidDeviceSmokeCommand` passed with 25 tests and `tsc --noEmit` passed after addressing review findings.
- Remaining physical-only blockers are unchanged: audible Home/Browse playback, audible S05/S09 instrument taps, audible S18/S19 library playback, and a real physical-device Day-5 `expo-audio` probe.

2026-07-06 follow-up 33:

- Switched active non-audible regression coverage to Android emulator while the presentation phone is unavailable.
- Added `qa:d2-demo-android-app-flow-smoke`, an emulator-only ADB flow that drives Home `PLAY`, free creation, S05 live performance, event recording, S07 save, S18 library visibility, and S19 player UI from uiautomator-derived tap targets.
- The new evidence file records `targetKind: "emulator"` plus residual physical-device checks so it cannot be mistaken for physical audible proof.
- Ran the new command on `emulator-5556`; it passed and wrote `docs/qa/d2-demo-app-flow-20260706.emulator-evidence.json` with S05 `rotation: 1`, editor `rotation: 0`, `liveAudioSentEvents: 16`, `recordingEvents: 8`, saved work visible, library work visible, and player playing UI visible.
- Remaining physical-only blockers are unchanged: audible Home/Browse playback, audible S05/S09 instrument taps, audible S18/S19 library playback, and a real physical-device Day-5 `expo-audio` probe.

2026-07-06 follow-up 34:

- Tightened the emulator app-flow evidence for recording provenance. When the S05 recording path falls back from microphone capture to event replay, the sidecar now records `recordingMode: "event-only"` and a normalized `recordingFallbackReason`.
- Extended the same emulator app-flow smoke through S07 Save & Share, S17 export provenance, S18 exported-item visibility, and S19 exported-player UI.
- Added S05 pre-tap readiness evidence to the same sidecar via `liveAudioReadyBeforeTap: true` and `liveAudioReadinessLabel: "ready"`.
- Regenerated `docs/qa/d2-demo-app-flow-20260706.emulator-evidence.json` on `emulator-5556`; it passed and now records `recordingFallbackReason: "Recording capture service is unavailable."`, `exportRenderKind: "event_replay"`, `exportProvenanceLabel: "Janggu / event replay"`, and `libraryExportProvenanceLabel: "event replay / Janggu / 0:04"` instead of relying on potentially mojibaked ADB UI text.
- Updated the D-2 runbook to document the new emulator-only recording/export provenance fields while keeping the physical audible checks separate.
- Remaining physical-only blockers are unchanged: audible Home/Browse playback, audible S05/S09 instrument taps, audible S18/S19 library playback, microphone-isolation listening, and a real physical-device Day-5 `expo-audio` probe.

2026-07-06 follow-up 35:

- Extended `qa:d2-demo-android-app-flow-smoke` to cover Home/Browse playback regression before the free-creation path: Home quick access opens S20, the `My Arirang` demo player opens S19, and the player shows playing UI before returning home.
- Hardened S05 live-audio readiness evidence by retrying the UI hierarchy check when the stage is visible before the `ready` label appears, avoiding false failures from preload timing.
- Regenerated `docs/qa/d2-demo-app-flow-20260706.emulator-evidence.json` on `emulator-5554`; it passed with 17 steps and records `shareDemoPlayerPlayingUiVisible: true`, `liveAudioReadyBeforeTap: true`, `liveAudioSentEvents: 16`, `recordingMode: "event-only"`, `recordingEvents: 8`, `exportRenderKind: "event_replay"`, and `exportedPlayerPlayingUiVisible: true`.
- Manual operator note: the user confirmed actual audible instrument playback during this run. This improves confidence, but the D-2 gate still needs that confirmation copied into the physical smoke report/checklist before it can count as formal evidence.
- Post-D2 UI backlog: remove or hide user-facing technical readiness badges such as `소리 준비 완료`; keep an invisible accessibility/test hook or QA-only marker so app-flow smoke can still prove readiness without exposing implementation status in the presentation UI.
- Remaining formal physical-only blockers are now documentation/evidence gaps rather than a known audible failure: filled Home/Browse audible notes, S05/S09 audible notes, S18/S19 library audible notes, microphone-isolation listening, and a real physical-device Day-5 `expo-audio` probe.

2026-07-06 follow-up 36:

- Promoted the `s05-instrument-touch-sound` physical smoke check in `docs/qa/d2-demo-smoke-20260704.json` from `blocked` to `pass` after the operator confirmed the S05 janggu taps were actually audible.
- Kept the S05 note tied to the existing SM-S928N / Android 15 evidence: three janggu zones tapped, `Live audio sent: 6 events`, app `AudioTrack` started on `STREAM_MUSIC / speaker`, `mRecordingActive=false`, and `RECORD_AUDIO` appops did not refresh.
- Re-ran the smoke report validator directly through local `vite-node`; it accepts the S05 pass note but still returns `NOT_READY_FOR_D2_DEMO`.
- Current remaining report blockers: the old physical device sidecar lacks `automatedEvidence.appUiLoaded: true`, `home-browse-demo-playback` still needs human audible confirmation, `library-export-playback` still needs human audible confirmation with event-replay provenance, and `day5-expo-audio-probe-updated` still needs a real physical-device `expo-audio` probe sidecar.
- ADB currently sees only `emulator-5554`; the physical sidecar cannot be regenerated until the presentation phone is reconnected.

2026-07-06 follow-up 37:

- Confirmed the D-2 device smoke command default package already matches `app.json`: `com.gukakstudio.prototype`; no package-default code change was needed.
- Found the local shell's `npm`/`npx` shim currently resolves to a missing global npm install under `C:\Users\cjh51\AppData\Roaming\npm\node_modules\npm`, while project-local `vite-node` works.
- Added a runbook fallback for the gate validation command: `node .\node_modules\vite-node\vite-node.mjs scripts\d2-demo-smoke-report.ts ...`, so the presenter can still validate D-2 readiness if `npm run` is unavailable on the machine.
- Verified the local `vite-node` smoke-report fallback command runs and preserves the current `NOT_READY_FOR_D2_DEMO` result for the right reasons.
- Verified `src/qa/__tests__/d2DemoRunbookDocumentation.test.ts` through direct local Vitest execution after sandbox path restrictions caused a false config-load failure.

2026-07-06 follow-up 38:

- Kept the operator-confirmed S05 audible result as the formal `s05-instrument-touch-sound` pass condition and clarified that the visible `소리 준비 완료` badge is temporary D-2 QA scaffolding, not desired long-term user UI.
- Tightened the D-2 smoke report failure message for stale physical sidecars: when `automatedEvidence.appUiLoaded` is missing or false, the report now tells the operator to rerun `qa:d2-demo-android-device-smoke` with `--dev-client-url http://127.0.0.1:8081` after Metro is running.
- Re-ran `d2DemoSmokeReportCommand` and `d2DemoRunbookDocumentation` targeted tests; 43 tests passed.
- Re-ran the current D-2 smoke report through local `vite-node`; it remains `NOT_READY_FOR_D2_DEMO` with the correct remaining blockers: stale physical UI-loaded sidecar, Home/Browse audible playback, Library export audible playback, and Day-5 physical `expo-audio` probe evidence.

2026-07-06 follow-up 39:

- Confirmed the Day-5 `expo-audio` sidecar cannot be honestly promoted from the existing S05 audible confirmation alone; the D-2 scoped probe still needs explicit physical measurements for latency, voice stability, pitch bend, glissando, mute release, preload, session fallback, and recording capture seconds.
- Re-ran `qa:d2-demo-android-app-flow-smoke` on `emulator-5554` after returning the app to the login/guest entry screen; it passed and regenerated `docs/qa/d2-demo-app-flow-20260706.emulator-evidence.json`.
- The regenerated emulator evidence keeps `targetKind: "emulator"` and records Home/Browse player playing UI, Home portrait rotation, S05 landscape rotation, pre-tap live-audio readiness, event-only recording fallback, S07 save, S17 event-replay export provenance, S18 library visibility, and S19 exported-player playing UI.
- Re-ran the current D-2 smoke report through local `vite-node`; it remains `NOT_READY_FOR_D2_DEMO` for the expected physical-only reasons: stale physical UI-loaded sidecar, Home/Browse audible playback, Library export audible playback, and Day-5 physical `expo-audio` probe evidence.

2026-07-06 follow-up 40:

- Hardened `qa:d2-demo-android-app-flow-smoke` so emulator regression runs no longer depend on the app already being on Home. The command now force-stops the GARAK package, supports `--dev-client-url`, runs `adb reverse`, launches the Expo development-client deep link, polls through the initial blank/native loading hierarchy, and waits after tapping `Guest Mode` until Home `PLAY` is visible.
- Updated the D-2 runbook app-flow command to include `--dev-client-url http://127.0.0.1:8081`.
- Re-ran the app-flow command on `emulator-5554` with `--dev-client-url http://127.0.0.1:8081`; it passed and regenerated `docs/qa/d2-demo-app-flow-20260706.emulator-evidence.json` with `status: "pass"`.
- Verified `d2DemoAndroidAppFlowSmokeCommand` and `d2DemoRunbookDocumentation` targeted tests, `tsc --noEmit`, and the current D-2 smoke report fallback command; the smoke report remains `NOT_READY_FOR_D2_DEMO` only for the expected physical-only blockers.

2026-07-06 follow-up 41:

- Re-ran `qa:d2-demo-android-device-smoke` on `emulator-5554` with `--allow-emulator --dev-client-url http://127.0.0.1:8081`; it installed the current `C:\gsb` APK, launched the GARAK bundle through Expo Dev Client, confirmed the app process, clean runtime logcat, foreground package, and `automatedEvidence.appUiLoaded: true`.
- Regenerated `docs/qa/d2-demo-smoke-20260706.emulator-evidence.json` with `testedAt: 2026-07-06T02:00:47.008Z`, `targetKind: "emulator"`, and `garakAppUiVisible: true`; this remains regression evidence only and cannot clear the physical D-2 gate.
- Tightened `qa:d2-demo-smoke-report` diagnostics so passing an emulator sidecar to the physical report now reports only the physical-device rejection instead of noisy serial, pid, and launch-target mismatch follow-ons.
- Re-ran the current D-2 report with both the emulator sidecar and the stale physical sidecar. The emulator sidecar is rejected as non-physical, and the stale physical sidecar still correctly asks for a physical rerun with `--dev-client-url http://127.0.0.1:8081`.

2026-07-06 follow-up 42:

- Confirmed the current ADB target is emulator-only: `emulator-5554` is connected, and no physical presentation phone is available for physical audible/probe gates.
- Re-ran `qa:d2-demo-android-app-flow-smoke` on `emulator-5554` with `--dev-client-url http://127.0.0.1:8081`; it passed and regenerated `docs/qa/d2-demo-app-flow-20260706.emulator-evidence.json` with `generatedAt: 2026-07-06T02:10:27.229Z`.
- Re-ran `qa:d2-demo-android-device-smoke` on `emulator-5554` with `--allow-emulator --dev-client-url http://127.0.0.1:8081`; it passed and regenerated `docs/qa/d2-demo-smoke-20260706.emulator-evidence.json` with `testedAt: 2026-07-06T02:11:07.955Z`.
- Re-ran the physical D-2 smoke report. It still returns `NOT_READY_FOR_D2_DEMO` for the expected reasons: stale physical sidecar, Home/Browse audible speaker confirmation, S18/S19 event-replay export audible speaker confirmation, and physical-device Day-5 `expo-audio` probe evidence.
- Confirmed the visible live-audio ready badge remains intentional temporary D-2 QA scaffolding; the post-D2 backlog already tracks replacing it with an invisible accessibility/test hook or QA-only marker before removing it from user-facing UI.

2026-07-06 follow-up 43:

- Added `docs/qa/day-5-audio-engine-probes.real-device.json` as an intentionally empty probe record so the D-2 runbook validation path exists before the phone rehearsal without pretending physical evidence exists.
- Updated `docs/qa/d2-demo-runbook.md` to state that the checked-in real-device probe file must keep returning `INCOMPLETE_DEVICE_EVIDENCE` until physical probe values are copied in.
- Verified `node .\node_modules\vite-node\vite-node.mjs scripts\day5-audio-engine-handoff.ts docs\qa\day-5-audio-engine-probes.real-device.json`; it exits non-zero with `INCOMPLETE_DEVICE_EVIDENCE`, `NO_GO`, and missing `expo-audio` plus `react-native-audio-api`.
- Re-ran the D-2 smoke report with `--day5-probe docs\qa\day-5-audio-engine-probes.real-device.json`; because the Day-5 smoke check is still blocked, the report remains `NOT_READY_FOR_D2_DEMO` for the same physical-only blockers and does not treat the placeholder as passing evidence.

2026-07-06 follow-up 44:

- Tightened the D-2 scoped Day-5 probe gate: a physical `expo-audio` probe now must evaluate to `PASS` or `PASS_WITH_LIMITS`; `INCOMPLETE_DEVICE_EVIDENCE` is acceptable only when it is caused by the missing `react-native-audio-api` physical probe, not by a failing `expo-audio` row.
- Corrected the D-2 smoke report test fixture so `READY_DAY5_PROBE` is actually passing on latency, first-touch, steady-touch, voice, bend, glissando, mute, preload, session fallback, and recording fields.
- Added regression coverage rejecting a failed physical `expo-audio` probe that otherwise had matching device label, measurement notes, and D-2 scoped text.
- Reduced P1 playback false affordances: stale `event_replay` exports whose source work/take no longer exists are visible but not playable/shareable in S18/S19/S20, empty work rows are visible but not playable, and S17 preview fallback skips a newer stale event-replay export in favor of a valid practice result.
- Updated `docs/qa/d2-demo-runbook.md` and `docs/qa/day-5-audio-engine-checklist.md` to document the stricter D-2 scoped `expo-audio` row requirement.

2026-07-06 follow-up 45:

- Added direct `libraryPlaybackAudio` unit coverage for the shared `isPlayableExportedAudioForPlayback` predicate so event-replay export playback remains tied to a live source work/take instead of only a non-placeholder URI.
- Re-ran the targeted P0/P1 suite after the helper test: `d2DemoSmokeReportCommand`, `d2DemoRunbookDocumentation`, `libraryPlaybackAudio`, `libraryScreenModel`, `shareScreenModel`, and `garakProductEffects`; 162 tests passed.
- Re-ran `tsc --noEmit`, the D-2 smoke report command, and the Day-5 audio handoff command. Typecheck passes; D-2 remains `NOT_READY_FOR_D2_DEMO` and Day-5 remains `INCOMPLETE_DEVICE_EVIDENCE`, which is the expected state until physical evidence is collected.

2026-07-06 follow-up 46:

- Tightened event-replay export provenance beyond source existence: the source take must now belong to an audible track in the current work mix plan before an export can be stored, shared, or treated as playable in the library.
- Added regression coverage for muted-source event replay exports in the reducer, Save & Share effect path, S19 share action, and shared library playback predicate.
- Re-ran the related product suite: `libraryPlaybackAudio`, `libraryScreenModel`, `shareScreenModel`, `garakProductState`, and `garakProductEffects`; 248 tests passed.
- Operator confirmed actual live instrument sound is audible; the left-top `소리 준비 완료` readiness badge remains temporary D-2 QA scaffolding and should be removed or hidden behind a QA-only/accessibility hook after the demo.

2026-07-06 follow-up 47:

- Closed the remaining direct playback gap for event-replay exports: `playSelectedPlayerItem` now rejects a source take whose own track is muted even when another track in the same source work is audible.
- Added effect-runner regression coverage so event-replay playback cannot silently play a different audible track while claiming provenance for a muted source take.

2026-07-06 follow-up 48:

- Aligned reducer share eligibility with the shared playback predicate. Placeholder event-replay exports are no longer allowed to enter `publishing` or complete as shared just because their source work/take still exists.
- Added reducer regression coverage for placeholder event-replay exports with otherwise valid source provenance.

2026-07-06 follow-up 49:

- Hardened shared-recording playback URI mapping so uppercase or whitespace-padded `PLACEHOLDER://` fixture/persisted URIs are treated as placeholders and mapped to bundled demo WAVs instead of leaking through as playable raw URIs.
- Added `libraryPlaybackAudio` regression coverage for uppercase shared-recording placeholder schemes and rechecked the S20/S21 shared-recording playback/save paths.

2026-07-06 follow-up 50:

- Aligned direct event-replay playback with the library/share predicate: `playSelectedPlayerItem` now rejects placeholder event-replay export URIs instead of using source-work replay as a hidden fallback when the UI would mark the item non-playable.
- Normalized persisted event-replay exports on local snapshot load. Valid source replay exports with placeholder URIs are rewritten to the bundled export fallback URI; stale replay exports whose source take no longer exists are downgraded to `demo_sample` and stripped of stale source provenance.
- Added local service regression coverage for persisted event-replay snapshot normalization.

2026-07-06 follow-up 51:

- Tightened the physical D-2 Home/Browse audible gate. A `home-browse-demo-playback` pass note must now name the Home/Browse to S20/S19 demo or bundled player path, not just a generic Home screen audible result.
- Added D-2 smoke report regression coverage for vague Home playback notes that could otherwise overclaim the actual Home/Browse demo player path.

2026-07-06 follow-up 52:

- Tightened the physical D-2 device sidecar gate so stale launch evidence cannot be reused after a newer smoke report update. The sidecar `testedAt` must now be an ISO timestamp at or after the report `testedAt`.
- Tightened APK provenance so `apk-installed-and-launched` pass notes must name the same installed APK path as the smoke report `apkPath`, matching the device sidecar.
- Added regression coverage for stale sidecars and mismatched launch APK paths, and updated the D-2 runbook to document the sidecar freshness/APK-match rule.
- Re-ran `d2DemoSmokeReportCommand` plus `d2DemoRunbookDocumentation`; 48 tests passed. Re-ran `tsc --noEmit`, the current D-2 smoke report command, and the Day-5 handoff command. Typecheck passes; D-2 still returns `NOT_READY_FOR_D2_DEMO` because the checked-in physical sidecar is stale/not app-UI-loaded, Home/Browse audible playback is still blocked, S18/S19 export playback is still blocked, and the Day-5 physical `expo-audio` probe is still missing. Day-5 still returns `INCOMPLETE_DEVICE_EVIDENCE / NO_GO`.

2026-07-06 follow-up 53:

- Tightened recording sidecar provenance so `recording-evidence.json` must include `collectedAt` as an ISO timestamp at or after the smoke report `testedAt`.
- Tightened event-only recording evidence so `audioEvidence.appProcessPid` must be covered by the device sidecar `processPid`; multi-pid `adb pidof` output is accepted when the audio pid is one of the reported app pids.
- Added regression coverage for stale recording sidecars and event-only sidecars from a different app process, and updated the D-2 runbook to document the stricter recording sidecar contract.
- Re-ran `d2DemoSmokeReportCommand` plus `d2DemoRunbookDocumentation`; 50 tests passed. Re-ran `tsc --noEmit`, `git diff --check`, the current D-2 smoke report command, and the Day-5 handoff command. Typecheck and diff check pass; D-2 now also reports the checked-in recording sidecar as stale because its `collectedAt` predates the current smoke report `testedAt`. Day-5 still returns `INCOMPLETE_DEVICE_EVIDENCE / NO_GO`.

2026-07-06 follow-up 54:

- Aligned the D-2 Day-5 probe sidecar gate with the Week-1/Day-5 freshness rule. Once `day5-expo-audio-probe-updated` is marked `pass`, the matching physical-device `expo-audio` probe `measuredAt` must be at or after the smoke report `testedAt`.
- Updated the passing Day-5 fixture to use a post-smoke measurement timestamp and added regression coverage for stale `expo-audio` probe measurements.
- Updated the D-2 runbook to document the `measuredAt` freshness requirement for the probe sidecar.
- Re-ran `d2DemoSmokeReportCommand` plus `d2DemoRunbookDocumentation`; 51 tests passed. Re-ran `tsc --noEmit`, `git diff --check`, the current D-2 smoke report command, the Day-5 handoff command, and `adb devices -l`. Typecheck and diff check pass; ADB currently shows only `emulator-5554`, D-2 remains `NOT_READY_FOR_D2_DEMO`, and Day-5 remains `INCOMPLETE_DEVICE_EVIDENCE / NO_GO`.

2026-07-06 follow-up 55:

- Tightened event-replay export provenance so a source work/take must contain at least one recorded performance event before the export can be stored, shared, or treated as playable from S18/S19.
- Updated direct player playback, reducer export completion, library playback predicates, and share target resolution to reject empty-source event replay instead of silently falling back to bundled demo audio.
- Adjusted library and login-sync test fixtures so generated event-replay exports represent a real S05 event take, not an empty recording.
- Re-ran `npm test` (89 files, 985 tests), `tsc --noEmit`, and `git diff --check`; tests and typecheck pass, with only existing LF/CRLF warnings from Git. Re-ran the current D-2 smoke report and Day-5 handoff; D-2 remains `NOT_READY_FOR_D2_DEMO` for stale physical sidecars plus Home/Browse, Library export, and Day-5 physical evidence blockers, and Day-5 remains `INCOMPLETE_DEVICE_EVIDENCE / NO_GO`.

2026-07-06 follow-up 56:

- Improved `qa:d2-demo-android-app-flow-smoke` failure diagnosis: if the UI tree is still on Expo Dev Launcher / Development Servers, it now reports that the GARAK app was not opened through `--dev-client-url http://127.0.0.1:8081` instead of the vague `Missing home PLAY button`.
- Added regression coverage for the Dev Launcher detection path.
- Re-ran the emulator app-flow smoke with `--dev-client-url http://127.0.0.1:8081`; `docs/qa/d2-demo-app-flow-20260706.emulator-latest-evidence.json` now records a passing emulator-only spine through Home/Browse S20/S19 player UI, S05 landscape performance readiness, event-only recording, S07 save, S17 event-replay provenance, S18 library visibility, and S19 exported-player UI.
- This remains emulator regression evidence only. It does not satisfy audible physical speaker playback, microphone-isolation listening, or physical-device `expo-audio` probe requirements.

2026-07-06 follow-up 57:

- Added `qa:d2-demo-android-recording-evidence` to generate the D-2 `recording-evidence.json` sidecar from ADB `logcat` plus `RECORD_AUDIO` appops after the S05/S09 event-only recording rehearsal.
- The command writes the gate-required event-only fields (`recordingMode`, null `recordingUri`, zero file size, app pid, app `AudioTrack` count, `mRecordingActive=false` count, app input count, and appops refresh boolean) and exits non-zero if app microphone input, refreshed `RECORD_AUDIO` appops, missing app playback, or missing non-recording playback routing is detected.
- Updated the D-2 runbook so the physical device rehearsal can refresh stale recording sidecars without hand-editing JSON.
- Re-ran `d2DemoAndroidRecordingEvidenceCommand`, `d2DemoRunbookDocumentation`, and `d2DemoSmokeReportCommand`; 54 tests passed. Re-ran `tsc --noEmit`, `git diff --check`, the current D-2 smoke report command, and the Day-5 handoff command. Typecheck and diff check pass; D-2 remains `NOT_READY_FOR_D2_DEMO` until fresh physical sidecars, Home/Browse audible confirmation, S18/S19 export audible confirmation, and physical `expo-audio` probe evidence are collected. Day-5 remains `INCOMPLETE_DEVICE_EVIDENCE / NO_GO`.

2026-07-06 follow-up 58:

- Added `qa:d2-expo-audio-probe-record` so D-2 `expo-audio` physical-device probe evidence can be generated directly from explicit measurements without requiring a prototype handoff JSON.
- The command validates the generated row with the existing probe parser and refuses to write unless `expo-audio` evaluates to `PASS` or `PASS_WITH_LIMITS`; failed latency, polyphony, bend, glissando, mute, preload, session fallback, or recording criteria remain visible instead of becoming hand-edited JSON.
- Updated the D-2 runbook to document this direct measurement path and kept the `소리 준비 완료` badge as temporary QA scaffolding that should be replaced with a hidden QA/accessibility hook after the demo.

2026-07-06 follow-up 59:

- Split the visible S05 live-audio readiness badge from the QA/app-flow anchor. `getFreePlayLiveAudioStatusModel` now exposes `qaReadinessLabel: "Garak live audio ready"` for the ready-before-first-tap state, while the visible `소리 준비 완료` text can remain temporary D-2 UI.
- Updated `FreePlayLiveAudioStatusBadge` to use the QA readiness label for accessibility/UI-hierarchy evidence, and updated both `qa:d2-demo-android-app-flow-smoke` and the device-smoke sidecar UI detector to accept that label. This lets the visible status badge be removed after the demo without breaking readiness detection.

2026-07-06 follow-up 60:

- Re-ran emulator app-flow smoke on `emulator-5554` through the active dev-client Metro URL after the readiness-anchor split.
- `docs/qa/d2-demo-app-flow-20260706.emulator-readylabel-evidence.json` passed with Home/Browse S20/S19 player UI, S05 live-audio readiness before taps, `Live audio sent: 16 events`, event-only recording, S07 save, S17 event-replay export provenance, S18 exported-item visibility, and S19 exported-player UI.
- This remains non-physical regression evidence only; the file explicitly keeps audible speaker playback, physical-device `expo-audio` probe, and microphone-isolation listening as residual physical-device checks.

2026-07-06 follow-up 61:

- Added `qa:d2-demo-smoke-check-update` so manual D-2 smoke checks can be updated without hand-editing the report JSON.
- The command updates one check and reuses the final smoke-report manual pass evidence rules before writing; invalid pass notes such as negated audible evidence are rejected before they can pollute the report.
- Updated the D-2 runbook with the command for Home/Browse and S18/S19 export audible confirmations.

2026-07-06 follow-up 62:

- Extended `qa:d2-demo-smoke-check-update` with `--day5-probe` validation for the `day5-expo-audio-probe-updated` pass path.
- When that check is marked `pass`, the command now reads the Day-5 probe sidecar before writing and reuses the final smoke-report Day-5 sidecar checks, including matching physical device, `expo-audio` PASS/PASS_WITH_LIMITS evaluation, measurement-note context, and `measuredAt` freshness.
- Updated the D-2 runbook so the Day-5 probe file and smoke report pass note are advanced together instead of relying on separate hand-edits.

2026-07-06 follow-up 63:

- Fixed `qa:d2-demo-smoke-check-update` so it preserves the existing report `testedAt` unless `--tested-at` is explicitly provided. This prevents a later manual audible note from making already-collected device, recording, or Day-5 probe sidecars stale.
- Updated the D-2 runbook examples to omit `--tested-at` for normal manual check updates and documented that the flag should only be used when intentionally advancing the whole rehearsal timestamp and then refreshing sidecars.
- Reconfirmed the post-D2 UI backlog: the visible left-top readiness badge is temporary D-2 QA scaffolding, while the accessibility label `Garak live audio ready` remains available as the hidden readiness anchor after the badge is removed.

2026-07-06 follow-up 64:

- Improved `qa:d2-demo-smoke-report` operator output so `Evidence still needed` now includes stale/missing sidecar prompts, not only blocked smoke checks.
- Added regression coverage for the case where every smoke check is already marked `pass` but device, recording, or Day-5 probe sidecars are stale. The gate remains `NOT_READY_FOR_D2_DEMO`, and the output now points to rerunning `qa:d2-demo-android-device-smoke`, `qa:d2-demo-android-recording-evidence`, and the D-2 scoped `expo-audio` probe generation path.
- Updated the D-2 runbook to describe `Evidence still needed` as the operator checklist for both blocked checks and stale/missing sidecars.

2026-07-06 follow-up 65:

- Added `qa:d2-demo-app-flow-evidence-check` to validate emulator app-flow evidence after `qa:d2-demo-android-app-flow-smoke` writes it.
- The command requires emulator target evidence, `status: "pass"`, all required Home/Browse -> S05 -> S07/S17 -> S18/S19 steps, the hidden S05 readiness anchor, event-only recording observations, `event_replay` export provenance, player playing UI, and explicit residual physical-only checks.
- Verified the latest emulator-readylabel sidecar with `--after 2026-07-06T03:00:00.000Z`; it reports `APP_FLOW_EVIDENCE_READY` while still keeping audible physical speaker playback, physical-device `expo-audio` probe, and microphone-isolation listening outside the emulator claim.

2026-07-06 follow-up 66:

- Tightened emulator app-flow export provenance evidence. `qa:d2-demo-android-app-flow-smoke` now records `exportSourceEventCount` from the S05 recording event counter when S17 produces an `event_replay` export.
- `qa:d2-demo-app-flow-evidence-check` now rejects app-flow evidence unless `exportSourceEventCount` is positive and matches `recordingEvents`, so the emulator proof covers an event-backed export instead of only a generic visible provenance label.
- Re-ran emulator app-flow smoke on `emulator-5554`; `docs/qa/d2-demo-app-flow-20260706.emulator-readylabel-evidence.json` now records `exportSourceEventCount: 8` and still reports `APP_FLOW_EVIDENCE_READY` with the physical-only residual checks intact.

2026-07-06 follow-up 67:

- Improved `qa:d2-demo-smoke-report` remaining-evidence output for the physical `day5-expo-audio-probe-updated` blocker.
- The `Evidence still needed` line now includes the direct `qa:d2-expo-audio-probe-record -- --output docs/qa/day-5-audio-engine-probes.real-device.json` path, so the presenter does not have to jump back to the runbook to discover the fastest D-2 scoped `expo-audio` probe command.
- Re-ran `d2DemoSmokeReportCommand`; 51 tests passed.

2026-07-06 follow-up 68:

- Tightened multi-track `event_replay` export provenance. `sourceEventCount` now records the full audible instrument-event count from the exported work mix, not only the first source take's event count.
- Added `countWorkMixPlanInstrumentEvents()` in the studio layer and reused it in local export generation, reducer export completion, direct player playback, share eligibility, and library playback predicates.
- Added regression coverage for layered event-only exports, persisted layered capture-export downgrades, and stale source mixes where the source take still exists but another audible event track changed after export.
- Re-ran the related product/studio suite; 7 files and 297 tests passed, and `tsc --noEmit` passed.

2026-07-06 follow-up 69:

- Tightened `createWorkMixPlan()` so zero-volume selected tracks are treated as inaudible after mute/solo selection.
- This keeps solo semantics intact: a zero-volume solo track still suppresses non-solo tracks instead of silently falling through to another layer.
- Added regression coverage that `countWorkMixPlanInstrumentEvents()` returns 0 for a silent solo mix and only counts positive-volume selected instrument tracks.
- Re-ran the related product/studio suite; 8 files and 306 tests passed, and `tsc --noEmit` passed.

2026-07-06 follow-up 70:

- Re-ran `npm test`; 93 files and 1010 tests passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.
- Re-ran the current D-2 smoke report with physical sidecars and Day-5 probe path; it still returns `NOT_READY_FOR_D2_DEMO` because the physical device/recording sidecars are stale or not app-UI-loaded, Home/Browse audible playback and Library export audible playback remain blocked, and the physical `expo-audio` probe evidence is still missing.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because both physical-device candidate probes are missing. `adb devices -l` currently shows only `emulator-5554`.

2026-07-06 follow-up 71:

- Added product-level regression coverage for the zero-volume mix semantics from follow-up 69.
- S07 direct export and Save & Share now have tests proving an all-zero-volume selected mix is rejected with `No audible tracks are available to export.` instead of creating a silent library item.
- S19 work playback and S07 preview now have tests proving zero-volume works dispatch visible playback failures and do not call `playWorkMix`.
- Re-ran `garakProductState`, `garakProductEffects`, and `studioLibrary`; 3 files and 218 tests passed, and `tsc --noEmit` passed.

2026-07-06 follow-up 72:

- Re-ran `npm test`; 93 files and 1013 tests passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.
- Re-ran the current D-2 smoke report with device, recording, and Day-5 sidecars; it still returns `NOT_READY_FOR_D2_DEMO` because fresh physical sidecars, Home/Browse audible confirmation, Library export audible confirmation, and physical `expo-audio` probe evidence are still missing.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because both physical-device candidate probes are missing. `adb devices -l` currently shows only `emulator-5554`.

2026-07-06 follow-up 73:

- Removed a remaining local audio service false-success path: `playWorkMix()` now returns `No audible tracks are available to preview.` when the supplied mix plan has no audible tracks instead of reporting `handledTracks: 0`.
- Tightened local export the same way: `exportWorkAudio()` now returns `No audible tracks are available to export.` when `createWorkMixPlan()` has no audible tracks instead of producing a `demo_sample` fallback artifact.
- Added service-level regression coverage for zero-volume preview/export so the UI/effect guards are not the only protection against silent success.
- Re-ran `garakProductServices`, `garakProductState`, `garakProductEffects`, `garakRuntimeProductServices`, and `studioLibrary`; 5 files and 259 tests passed, and `tsc --noEmit` passed.

2026-07-06 follow-up 74:

- Re-ran `npm test`; 93 files and 1015 tests passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.
- Re-ran the current D-2 smoke report with device, recording, and Day-5 sidecars; it still returns `NOT_READY_FOR_D2_DEMO` for stale/non-app UI physical sidecars, Home/Browse audible confirmation, Library export audible confirmation, and missing physical `expo-audio` probe evidence.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because both physical-device candidate probes are missing. `adb devices -l` currently shows only `emulator-5554`.

2026-07-06 follow-up 75:

- Removed another local audio service false-success path: accompaniment-only works now require the missing full local mix renderer instead of falling through to demo-sample playback/export.
- Added service-level regression coverage proving accompaniment-only preview does not call fallback library playback and accompaniment-only export does not create a `demo_sample` artifact.
- Confirmed the visible `소리 준비 완료` badge remains tracked as temporary D-2 QA UI; it should be hidden or replaced with the existing accessibility/QA readiness anchor after the demo.
- Re-ran `garakProductServices`, `garakProductState`, `garakProductEffects`, `garakRuntimeProductServices`, and `studioLibrary`; 5 files and 261 tests passed, and `tsc --noEmit` passed.

2026-07-06 follow-up 76:

- Re-ran `npm test`; 93 files and 1017 tests passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.
- Re-ran the current D-2 smoke report with device, recording, and Day-5 sidecars; it still returns `NOT_READY_FOR_D2_DEMO` for stale/non-app UI physical sidecars, Home/Browse audible confirmation, Library export audible confirmation, and missing physical `expo-audio` probe evidence.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because both physical-device candidate probes are missing.
- Rechecked ADB; it currently shows only `emulator-5554`, so physical-device sidecar/probe regeneration cannot proceed without reconnecting the presentation phone.

2026-07-06 follow-up 77:

- Tightened event-replay export provenance again: new event-replay exports now require a positive `sourceEventCount`, and the reducer rejects replay export completions that omit it.
- The export effect runner now rejects service `event_replay` results without source event count instead of completing a share/export with incomplete provenance.
- Library playback and S19/S17 shareability now require event-replay exports to carry a source event count matching the current audible source work mix, so stale or under-specified replay exports stay visible but not playable/shareable.
- Re-ran `garakProductServices`, `garakProductState`, `garakProductEffects`, `libraryPlaybackAudio`, `libraryScreenModel`, `shareScreenModel`, and `garakRuntimeProductServices`; 7 files and 303 tests passed, and `tsc --noEmit` passed.

2026-07-06 follow-up 78:

- Re-ran `npm test`; 93 files and 1019 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.
- Re-ran the current D-2 smoke report with device, recording, and Day-5 sidecars; it still returns `NOT_READY_FOR_D2_DEMO` for stale/non-app UI physical sidecars, Home/Browse audible confirmation, Library export audible confirmation, and missing physical `expo-audio` probe evidence.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because both physical-device candidate probes are missing.
- Rechecked ADB; it currently shows only `emulator-5554`.

2026-07-06 follow-up 79:

- Closed the remaining share-service boundary for under-specified `event_replay` exports. Even if stale state reaches `publishShareTarget` directly, event-replay exports without positive `sourceEventCount` are rejected before the share service is called.
- Added effect-runner regression coverage for this direct publish path, so S17/UI shareability is not the only guard against incomplete event-replay provenance.
- Re-ran `garakProductServices`, `garakProductState`, `garakProductEffects`, `libraryPlaybackAudio`, `libraryScreenModel`, `shareScreenModel`, and `garakRuntimeProductServices`; 7 files and 304 tests passed.

2026-07-06 follow-up 80:

- Re-ran `npm test`; 93 files and 1020 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.
- Re-ran a source scan for optional/legacy `sourceEventCount >= 0` and `sourceEventCount !== undefined` checks in the product export/playback/share boundaries; no stale optional-count patterns remain.
- Re-ran the current D-2 smoke report with device, recording, and Day-5 sidecars; it still returns `NOT_READY_FOR_D2_DEMO` for stale/non-app UI physical sidecars, Home/Browse audible confirmation, Library export audible confirmation, and missing physical `expo-audio` probe evidence.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because both physical-device candidate probes are missing.
- Rechecked ADB; it currently shows only `emulator-5554`.

2026-07-06 follow-up 81:

- Tightened `library-export-playback` manual smoke evidence again: a pass note must now include S18/S19 audible playback, `event replay` / `이벤트 녹음` provenance, and a positive source event count.
- Updated the D-2 runbook and smoke-check update coverage so a one-off manual pass update cannot skip the event count evidence.
- User confirmed actual audible output in the current app session. This should be transferred into a fresh smoke report note when the remaining D-2 sidecars are regenerated.
- Backlog polish: hide or remove the upper-left S05 live-audio readiness badge such as `소리 준비 완료` / `Garak live audio ready` after replacing its QA role with non-user-facing automation evidence.

2026-07-06 follow-up 82:

- Re-ran targeted D-2 QA tests for smoke report, smoke-check update, and runbook documentation; 3 files and 61 tests passed.
- Re-ran `npm test`; 93 files and 1022 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.
- Re-ran the current D-2 smoke report with device, recording, and Day-5 sidecars; it still returns `NOT_READY_FOR_D2_DEMO` for stale/non-app UI physical sidecars, Home/Browse audible confirmation, Library export audible confirmation with source event count, and missing physical `expo-audio` probe evidence.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because both physical-device candidate probes are missing.
- Rechecked ADB; it currently shows only `emulator-5554`.

2026-07-06 follow-up 83:

- Tightened emulator app-flow evidence for S18/S19 exported playback provenance. The sidecar now records `libraryExportSourceEventCount` and the checker requires it to match both `exportSourceEventCount` and `recordingEvents`.
- Updated the app-flow runbook and regression tests so future emulator evidence cannot pass with a library provenance label that lacks the source event count link.
- Regenerated `docs/qa/d2-demo-app-flow-20260706.emulator-evidence.json`, `docs/qa/d2-demo-app-flow-20260706.emulator-latest-evidence.json`, and `docs/qa/d2-demo-app-flow-20260706.emulator-readylabel-evidence.json` on `emulator-5554`; all three now report `APP_FLOW_EVIDENCE_READY` with residual physical checks still visible.
- Re-ran targeted app-flow QA tests for smoke command, evidence check, and runbook documentation; 3 files and 8 tests passed.
- Re-ran `npm test`; 93 files and 1022 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.
- Re-ran the current D-2 smoke report with device, recording, and Day-5 sidecars; it still returns `NOT_READY_FOR_D2_DEMO` for stale/non-app UI physical sidecars, Home/Browse audible confirmation, Library export audible confirmation with source event count, and missing physical `expo-audio` probe evidence.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because both physical-device candidate probes are missing.
- Rechecked ADB; it currently shows only `emulator-5554`.

2026-07-06 follow-up 84:

- Hid the pre-tap S05 `소리 준비 완료` readiness badge from the visible UI while preserving the `Garak live audio ready` accessibility marker used by QA automation.
- Kept visible S05 audio states for `소리 준비 중`, failure/retry, and post-tap `Live audio sent: N events`, so user-facing feedback remains meaningful when action is required or playback evidence exists.
- Re-ran the emulator app-flow smoke on `emulator-5554`; it passed after the hidden marker change and regenerated `docs/qa/d2-demo-app-flow-20260706.emulator-latest-evidence.json`.
- Re-ran `qa:d2-demo-app-flow-evidence-check` on the regenerated latest sidecar; it reports `APP_FLOW_EVIDENCE_READY`.
- Re-ran targeted tests for S05 performance model, screen wiring, app-flow smoke, and Android device smoke; 4 files and 93 tests passed.
- Re-ran `npm test`; 93 files and 1022 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.
- Re-ran the current D-2 smoke report with device, recording, and Day-5 sidecars; it still returns `NOT_READY_FOR_D2_DEMO` for stale/non-app UI physical sidecars, Home/Browse audible confirmation, Library export audible confirmation with source event count, and missing physical `expo-audio` probe evidence.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because both physical-device candidate probes are missing.
- Rechecked ADB; it currently shows only `emulator-5554`.

2026-07-06 follow-up 85:

- Tightened stale `audio_capture` export playback/share boundaries: captured-audio exports now require a file-backed `audioUri`, a file-backed `sourceRecordingUri`, and a non-blank `sourceTakeId` before S18/S19 playback or share can treat them as playable/shareable.
- Added regression coverage for stale `audio_capture` exports in library playback, library row/player model, direct player effects, and direct share effects.
- Re-ran targeted product export/playback/share tests; 7 files and 308 tests passed.
- Re-ran `npm test`; 93 files and 1026 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.
- Re-ran `qa:d2-demo-app-flow-evidence-check -- --evidence docs/qa/d2-demo-app-flow-20260706.emulator-latest-evidence.json`; it reports `APP_FLOW_EVIDENCE_READY`.
- Re-ran the current D-2 smoke report with device, recording, and Day-5 sidecars; it still returns `NOT_READY_FOR_D2_DEMO` because the physical sidecars are stale/non-app UI evidence, Home/Browse audible confirmation and Library export audible confirmation are still blocked, and the physical-device Day-5 `expo-audio` probe is missing.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because the required physical-device candidates are missing.
- Rechecked ADB; it currently shows only `emulator-5554`.

2026-07-06 follow-up 86:

- Aligned local snapshot loading with the stricter `audio_capture` playback/share rule: a copied export file can now keep `renderKind: "audio_capture"` after reload when both the export `audioUri` and source recording URI are file-backed and the source take still points at the source recording.
- Added a regression test for copied capture exports so a future real export file path is not downgraded to `demo_sample` just because it differs from the original take recording URI.
- Updated the D-2 runbook to reflect the current S05 pre-tap readiness behavior: the user-visible `소리 준비 완료` badge is hidden, while the hidden `Garak live audio ready` QA/accessibility anchor remains.
- Re-ran product provenance tests for services, state, effects, library playback/model, share model, and runtime services; 7 files and 309 tests passed.
- Re-ran runbook documentation coverage with the service provenance tests; 2 files and 38 tests passed.
- Re-ran `npm test`; 93 files and 1027 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.
- Re-ran `qa:d2-demo-app-flow-evidence-check -- --evidence docs/qa/d2-demo-app-flow-20260706.emulator-latest-evidence.json`; it reports `APP_FLOW_EVIDENCE_READY`.
- Re-ran the current D-2 smoke report with device, recording, and Day-5 sidecars; it still returns `NOT_READY_FOR_D2_DEMO` because the physical sidecars are stale/non-app UI evidence, Home/Browse audible confirmation and Library export audible confirmation are still blocked, and the physical-device Day-5 `expo-audio` probe is missing.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because the required physical-device candidates are missing.
- Rechecked ADB; it currently shows only `emulator-5554`.

2026-07-06 follow-up 87:

- Tightened local snapshot `audio_capture` downgrade again: persisted capture exports with recorded events are only downgraded to `event_replay` when the source take is still audible in the current mix and the replay evidence passes the same playback validator used by S18/S19.
- Persisted capture exports whose source events are muted or otherwise inaudible now fall back to `demo_sample` instead of exposing an event replay with zero playable source events or preserving a stale captured-audio provenance.
- Added regression coverage for muted-source capture exports and re-ran the product provenance boundary tests for services, state, effects, library playback/model, share model, and runtime services; 7 files and 310 tests passed.
- Re-ran `npm test`; 93 files and 1028 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.
- Re-ran `qa:d2-demo-app-flow-evidence-check -- --evidence docs/qa/d2-demo-app-flow-20260706.emulator-latest-evidence.json`; it reports `APP_FLOW_EVIDENCE_READY`.
- Re-ran the current D-2 smoke report with device, recording, and Day-5 sidecars; it still returns `NOT_READY_FOR_D2_DEMO` because the physical sidecars are stale/non-app UI evidence, Home/Browse audible confirmation and Library export audible confirmation are still blocked, and the physical-device Day-5 `expo-audio` probe is missing.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because the required physical-device candidates are missing.
- Rechecked ADB; it currently shows only `emulator-5554`.

2026-07-06 follow-up 88:

- Operator confirmed actual S05 live instrument audio is audible in the app. This improves the demo confidence for touch-to-sound, but it does not replace the stale physical sidecar, Home/Browse audible check, Library export audible check, or Day-5 probe evidence required by the D-2 gate.
- Recorded the UX follow-up for the upper-left live-audio status UI: keep `소리 준비 완료` / readiness-style labels out of the final user-facing presentation UI and preserve only a hidden QA/accessibility anchor for app-flow automation.
- Tightened `audio_capture` playback/share validation again. S18/S19 playback and S17 sharing now require the captured export to point back to an existing source work, matching source take, matching source recording URI, and an audible source track instead of trusting file-backed URIs alone.
- Updated regression coverage for valid captured exports, copied captured exports, missing source work, mismatched source recording URI, and muted source tracks.
- Re-ran targeted library/share/effect tests; 4 files and 130 tests passed.
- Re-ran the product provenance boundary tests for services, state, effects, library playback/model, share model, and runtime services; 7 files and 310 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran `npm test`; 93 files and 1028 tests passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.
- Re-ran `qa:d2-demo-app-flow-evidence-check -- --evidence docs/qa/d2-demo-app-flow-20260706.emulator-latest-evidence.json`; it reports `APP_FLOW_EVIDENCE_READY` with residual physical checks for audible speaker playback, physical-device `expo-audio` probe, and microphone isolation by human listening.
- Re-ran the current D-2 smoke report with physical sidecars and Day-5 probe path; it still returns `NOT_READY_FOR_D2_DEMO` because the device and recording sidecars are stale, the device sidecar does not prove GARAK app UI loaded, Home/Browse audible playback and Library export audible playback remain blocked, and physical-device Day-5 probe evidence is missing.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because physical-device probes for `expo-audio` and `react-native-audio-api` are missing.
- Rechecked ADB; it currently shows only `emulator-5554`.

2026-07-06 follow-up 89:

- Split the emulator app-flow evidence contract more cleanly: the non-audible app-flow proof now records `microphoneCaptureSuppressed: true` and `microphoneIsolationEvidence` when the product recording path stays event-only instead of using microphone capture.
- Updated `qa:d2-demo-app-flow-evidence-check` so event-only recording is only READY when microphone capture suppression is explicit in the evidence. The residual physical checks are now limited to audible physical speaker playback and the physical-device `expo-audio` probe.
- Regenerated `docs/qa/d2-demo-app-flow-20260706.emulator-latest-evidence.json` on `emulator-5554`; it passed and now records Home/Browse player UI, S05 readiness, event-only recording, microphone suppression, S17/S18/S19 event-replay export provenance, and the remaining physical-only checks.
- Re-ran `qa:d2-demo-app-flow-evidence-check -- --evidence docs/qa/d2-demo-app-flow-20260706.emulator-latest-evidence.json`; it reports `APP_FLOW_EVIDENCE_READY` with residual checks only for audible speaker playback and physical-device `expo-audio` probe.
- Re-ran the current D-2 smoke report with physical sidecars and Day-5 probe path; it still returns `NOT_READY_FOR_D2_DEMO` because the physical device and recording sidecars are stale, the physical device sidecar does not prove GARAK app UI loaded, Home/Browse audible playback and Library export audible playback remain blocked, and physical-device Day-5 probe evidence is missing.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because physical-device probes for both candidates are missing.
- Rechecked ADB; it currently shows only `emulator-5554`.

2026-07-06 follow-up 90:

- Hardened `qa:d2-demo-android-device-smoke` app UI detection for the next physical rehearsal. The sidecar now treats stable GARAK accessibility anchors such as `Guest Mode`, `PLAY`, `My Arirang`, `Garak live audio ready`, `Live audio sent`, and `Track 1` as app UI evidence while still rejecting Expo Dev Launcher UI labels.
- Added regression coverage so Expo Dev Launcher remains `appUiLoaded: false`, while GARAK guest-home anchors and the hidden S05 readiness anchor produce `appUiLoaded: true`.
- Re-ran the device-smoke and smoke-report regression tests; 2 files and 79 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Ran an emulator-only dry-run device smoke with `--allow-emulator --dev-client-url http://127.0.0.1:8081`; it passed and wrote `docs/qa/d2-demo-smoke-20260706.emulator-device-latest-evidence.json` with `targetKind: "emulator"` and `automatedEvidence.appUiLoaded: true` from the GARAK `Guest Mode` UI. This remains emulator regression evidence only and cannot satisfy the physical smoke report.
- Re-ran the current D-2 smoke report with the stale physical sidecars and Day-5 probe path; it still returns `NOT_READY_FOR_D2_DEMO` for the stale/non-app physical device sidecar, stale recording sidecar, Home/Browse audible playback, Library export audible playback, and missing physical-device Day-5 probe evidence.
- Re-ran `npm test`; 93 files and 1029 tests passed.
- Re-ran `qa:d2-demo-app-flow-evidence-check -- --evidence docs/qa/d2-demo-app-flow-20260706.emulator-latest-evidence.json`; it still reports `APP_FLOW_EVIDENCE_READY`.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because physical-device probes for both candidates are missing.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.

2026-07-06 follow-up 91:

- Tightened `qa:d2-demo-android-recording-evidence` failure provenance. The command already writes a sidecar before returning non-zero; that sidecar now includes `status: "fail"`, `blockingIssues`, and notes that explicitly say it is not passing evidence yet instead of using success-style wording.
- Kept passing event-only sidecars explicit with `status: "pass"` and an empty `blockingIssues` array.
- Re-ran recording-evidence, smoke-report, and runbook regression tests; 3 files and 56 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran the emulator recording-evidence dry-run against `docs/qa/d2-demo-smoke-20260706.emulator-device-latest-evidence.json`; it still exits non-zero because the current logcat window lacks app playback `AudioTrack` and `mRecordingActive=false` evidence, but `docs/qa/d2-demo-smoke-20260706.emulator-recording-latest-evidence.json` now records `status: "fail"` and the blocking issues honestly.
- Re-ran `npm test`; 93 files and 1029 tests passed.
- Re-ran `qa:d2-demo-app-flow-evidence-check -- --evidence docs/qa/d2-demo-app-flow-20260706.emulator-latest-evidence.json`; it still reports `APP_FLOW_EVIDENCE_READY`.
- Re-ran the current D-2 smoke report with stale physical sidecars and Day-5 probe path; it still returns `NOT_READY_FOR_D2_DEMO` for stale/non-app physical device evidence, stale recording evidence, Home/Browse audible playback, Library export audible playback, and missing physical-device Day-5 probe evidence.
- Re-ran `qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because physical-device probes for both candidates are missing.

2026-07-06 follow-up 92:

- Confirmed the post-D2 polish backlog now distinguishes the hidden pre-tap `소리 준비 완료` readiness anchor from visible post-tap playback evidence such as `Live audio sent: N events`; final user-facing UI should remove or QA-gate that upper-left technical status surface.
- Tightened `qa:d2-demo-smoke-report` so an event-only recording evidence sidecar with explicit `status: "fail"` is rejected even if other metadata fields are present.
- Added regression coverage for explicit failed event-only recording sidecars and made the ready event-only fixture carry `status: "pass"`.
- Re-ran smoke-report and recording-evidence regression tests; 2 files and 56 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran `qa:d2-demo-smoke-report` through `node .\node_modules\vite-node\vite-node.mjs ...` with the current emulator recording sidecar; it still returns `NOT_READY_FOR_D2_DEMO` and now includes `event-only recording evidence sidecar status must be pass when present`.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.

2026-07-06 follow-up 93:

- Updated the D-2 runbook so event-only recording evidence now documents the same `status: "pass"` / `status: "fail"` contract enforced by `qa:d2-demo-smoke-report`; a failed sidecar is diagnostic output only and cannot satisfy the readiness gate.
- Added documentation regression coverage for the recording sidecar status contract.
- Re-ran runbook, smoke-report, and recording-evidence targeted tests; 3 files and 57 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran `qa:d2-demo-smoke-report` through the project-local `vite-node` entrypoint; it still returns `NOT_READY_FOR_D2_DEMO` with stale physical sidecar evidence, explicit failed event-only recording sidecar status, blocked Home/Browse audible playback, blocked Library export audible playback, and missing physical Day-5 probe evidence.
- Re-ran `qa:d2-demo-app-flow-evidence-check` through the project-local `vite-node` entrypoint on `docs/qa/d2-demo-app-flow-20260706.emulator-latest-evidence.json`; it reports `APP_FLOW_EVIDENCE_READY` with residual physical checks for audible speaker playback and the physical-device `expo-audio` probe.
- Re-ran `qa:day5-audio` through the project-local `vite-node` entrypoint on `docs/qa/day-5-audio-engine-probes.real-device.json`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because physical-device probes for `expo-audio` and `react-native-audio-api` are missing.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.

2026-07-06 follow-up 94:

- Tightened `qa:d2-demo-smoke-check-update` for the recording gate. When updating `recording-event-take-saved` to `pass`, the command now accepts `--evidence` and `--recording-evidence`, reads both sidecars, and reuses the same recording evidence validator as `qa:d2-demo-smoke-report` before writing the report.
- This prevents a failed event-only sidecar from being attached to a passing recording check and only discovered later by the final smoke report.
- Updated the D-2 runbook with the guarded recording check-update command, including both sidecar paths.
- Added regression coverage for a passing event-only recording sidecar and an explicit `status: "fail"` sidecar rejection.
- Re-ran check-update, smoke-report, runbook, and recording-evidence targeted tests; 4 files and 67 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran `qa:d2-demo-smoke-check-update` through the project-local `vite-node` entrypoint using the current failed emulator recording sidecar; it exited non-zero before writing and reported the recording sidecar status/audio evidence issues.
- Re-ran `qa:d2-demo-smoke-report` through the project-local `vite-node` entrypoint; it still returns `NOT_READY_FOR_D2_DEMO` with the same physical sidecar, audible playback, recording evidence, and Day-5 probe blockers.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.

2026-07-06 follow-up 95:

- Tightened `qa:d2-demo-smoke-check-update` for physical audible pass updates. When updating `home-browse-demo-playback`, `s05-instrument-touch-sound`, `recording-event-take-saved`, or `library-export-playback` to `pass`, the command now requires `--evidence` and reuses the same physical device sidecar validator as `qa:d2-demo-smoke-report` before writing.
- This prevents stale, emulator, or Expo Dev Launcher sidecar evidence from being paired with a manual audible pass and only discovered later by the final smoke report.
- Updated the D-2 runbook so the Home/Browse manual pass example includes `--evidence`, and noted that S05 and Library export audible updates should use the same command shape.
- Added regression coverage for missing physical sidecar evidence and stale device sidecar rejection in `qa:d2-demo-smoke-check-update`.
- Re-ran check-update, smoke-report, and runbook targeted tests; 3 files and 66 tests passed.
- Re-ran `tsc --noEmit`; it passed.
- Re-ran `qa:d2-demo-smoke-check-update` through the project-local `vite-node` entrypoint using the current stale/non-app UI physical sidecar; it exited non-zero before writing and reported the device sidecar freshness/app UI issues.
- Re-ran `qa:d2-demo-smoke-report`; it still returns `NOT_READY_FOR_D2_DEMO` for stale/non-app physical sidecar evidence, explicit failed event-only recording sidecar status/audio evidence, blocked Home/Browse audible playback, blocked Library export audible playback, and missing physical Day-5 probe evidence.
- Re-ran `qa:d2-demo-app-flow-evidence-check`; it still reports `APP_FLOW_EVIDENCE_READY` with residual physical checks for audible speaker playback and the physical-device `expo-audio` probe.
- Re-ran `qa:day5-audio`; it still returns `INCOMPLETE_DEVICE_EVIDENCE` / `NO_GO` because physical-device probes for `expo-audio` and `react-native-audio-api` are missing.
- Re-ran full `vitest`; 93 files and 1034 tests passed.
- Re-ran `git diff --check`; it passed with only existing LF/CRLF warnings.

## Completion Definition

Do not call the MVP "demo-ready" until all P0 items are true:

- APK is built from documented path.
- Actual presentation Android device is connected and tested.
- Home/Browse demo playback is audible.
- S05 selected instrument is audible.
- Recording path produces at least event recording and clearly indicates event-only fallback provenance.
- Exported library item is audible.
- `qa:day5-audio` contains real `expo-audio` physical-device evidence.

Do not call the MVP "product-complete" until P1/P2 items are true:

- Normal recording flow persists real audio where supported.
- Edit preview reflects track controls audibly.
- Export provenance is explicit or real rendered mix exists.
- Library playback supports all playable item kinds without silent no-op paths.

# D-2 Demo Runbook

Status: required before calling the Android demo ready.

Scope: one presenter, one Android presentation device, one debug APK, and one audible demo spine.

This runbook is intentionally stricter than a normal local build note. A passing unit test, web export, or Android build does not prove the app is ready to present. The presenter must connect the actual Android device, install the APK, launch the app, and record audible results.

## 1. Build The Debug APK

Use the short ASCII build path so Gradle, CMake, and Windows path handling do not depend on the Korean OneDrive workspace path:

```bash
npm run qa:d2-demo-android-build -- C:\gsb
```

Expected APK:

```text
C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk
```

If the build succeeds, record the APK path and size in the smoke report. If this command fails, do not fall back to `npm run android` during the presentation window; fix the short-path build first.

## 2. Create The Smoke Report

Use the real presenter name and the real device model / OS. Do not use `Device / OS`, `physical device`, `not connected`, or `no connected adb device`.

```bash
npm run qa:d2-demo-smoke-template -- docs/qa/d2-demo-smoke-YYYYMMDD.json "<tester>" "<device-label>" "C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk"
```

Example device labels:

```text
Galaxy S24 / Android 15
Pixel 8 / Android 15
```

## 3. Connect The Device

On the Android device:

- Enable Developer options.
- Enable USB debugging.
- Accept the computer trust prompt.
- Keep the screen unlocked for install and launch.

Because the debug APK is an Expo development-client build, start Metro from the same short ASCII project copy before running the device smoke:

```powershell
cd C:\gsb
npm run start:dev-client -- --clear --localhost
```

Then run:

```bash
npm run qa:d2-demo-android-device-smoke -- C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk --dev-client-url http://127.0.0.1:8081 --report docs/qa/d2-demo-smoke-YYYYMMDD.json --evidence docs/qa/d2-demo-smoke-YYYYMMDD.device-evidence.json
```

The smoke command automatically uses `$ANDROID_HOME/platform-tools/adb` when `adb` is not on `PATH`. For a manual connection check on Windows, run:

```powershell
& "$env:ANDROID_HOME\platform-tools\adb.exe" devices -l
```

If multiple devices are connected, add `--serial <adb-serial>`.

The command writes the automated `adb-device-detected` and `apk-installed-and-launched` checks into the report. When `--dev-client-url http://127.0.0.1:8081` is present, it runs `adb reverse tcp:8081 tcp:8081`, opens the Expo development-client deep link, and closes the Expo first-run/developer menu overlays before collecting UI evidence. When `adb shell getprop ro.product.model` and `adb shell getprop ro.build.version.release` both return concrete values, it also updates `deviceLabel` and `apkPath` in the report so the gate matches the actual installed APK and device. After launch, it runs `adb shell pidof <package>` and only passes the install/launch check when the app process is still running. The final pass note must include `confirmed process pid <pid>`. If `--evidence` is provided after a successful launch, the command writes a sidecar JSON with the ADB serial/details, APK path, package/activity, launch target, process pid, resolved `pm path`, foreground activity/window, a filtered post-launch logcat scan for `AndroidRuntime`/`ReactNativeJS`/`ExpoModulesCore` errors, UI hierarchy text/content-description evidence, and the checks not covered by the device-smoke automation. The report gate requires the sidecar `testedAt` to be an ISO timestamp at or after the report `testedAt`, and the installed APK path in the launch pass note, report `apkPath`, and sidecar `apkPath` must match. The report gate also requires `automatedEvidence.appUiLoaded: true`; a sidecar that only shows Expo Dev Launcher, the development server picker, or the developer menu is not enough. That sidecar is installation/runtime evidence only; it must not be used as audible proof. If install, launch, or process verification fails after the device is detected, the device check is recorded as `pass` and the install/launch check is recorded as `fail` with the ADB exit details. The gate also reports textual ADB failures such as `Failure [INSTALL_FAILED_*]` or `Error type 3` even if the command exits zero. If no device is connected, the report stays blocked with `no connected adb device`; that is the correct result and must not be hand-edited to pass.

For emulator regression checks while the physical phone is unavailable, do not pass `--report`. Use a separate sidecar and opt in explicitly:

```bash
npm run qa:d2-demo-android-device-smoke -- C:\gsb\android\app\build\outputs\apk\debug\app-debug.apk --serial emulator-5556 --allow-emulator --dev-client-url http://127.0.0.1:8081 --evidence docs/qa/d2-demo-smoke-YYYYMMDD.emulator-evidence.json
```

The emulator sidecar records `targetKind: "emulator"` and is useful for install, launch, foreground, and logcat regression checks. It cannot satisfy the physical D-2 readiness gate; `qa:d2-demo-smoke-report` rejects emulator sidecars for the `--evidence` path.

Run the emulator-only app-flow smoke to cover the non-audible MVP spine while the physical phone is unavailable. For a development-client APK, pass the same Metro URL so the command can reset the app, open the GARAK bundle through Expo Dev Client, and enter guest mode before driving the flow:

```bash
npm run qa:d2-demo-android-app-flow-smoke -- --serial emulator-5556 --dev-client-url http://127.0.0.1:8081 --evidence docs/qa/d2-demo-app-flow-YYYYMMDD.emulator-evidence.json
```

This command drives Home quick access to the S20 demo player, verifies the S19 demo player playing UI, returns home, then drives Home `PLAY`, free creation, instrument selection, S05 live performance, event recording, S07 save, S07 Save & Share export, S17 export provenance, S18 exported-item visibility, and S19 exported-player UI. The written evidence must keep `targetKind: "emulator"` and lists the remaining physical-only checks. Its observations include `shareDemoPlayerPlayingUiVisible: true`, `liveAudioReadyBeforeTap: true` before S05 touch input, `recordingMode: "event-only"`, `recordingFallbackReason`, and `microphoneCaptureSuppressed: true` when the product recording path falls back to event replay instead of microphone capture, plus `exportRenderKind: "event_replay"`, `exportSourceEventCount` and `libraryExportSourceEventCount` matching `recordingEvents`, and the visible export provenance labels when Save & Share produces an event-replay export. It is regression evidence for navigation, Home/Browse player wiring, orientation, S05 readiness, event capture, microphone-capture suppression in the default recording path, local save/export, and player-state wiring; it is not audible speaker proof and must not be attached to the physical smoke report as the `--evidence` sidecar.

After writing the emulator app-flow sidecar, verify that the file still covers the full non-audible MVP spine:

```bash
npm run qa:d2-demo-app-flow-evidence-check -- --evidence docs/qa/d2-demo-app-flow-YYYYMMDD.emulator-evidence.json --after 2026-07-06T03:00:00.000Z
```

Passing status is `APP_FLOW_EVIDENCE_READY`. This check still keeps `audible physical speaker playback` and `physical-device expo-audio probe` as residual physical checks; it must not be treated as D-2 physical readiness.

The S05 pre-tap `소리 준비 완료` state is no longer shown as a visible user badge. The app-flow and device-smoke sidecar checks use the hidden accessibility/QA label `Garak live audio ready`, so the readiness anchor stays available without exposing technical sampler state in the presentation UI.

## 4. Manual Audible Checks

After the app launches on the device, fill these smoke checks manually:

| Check | Pass condition |
| --- | --- |
| `home-browse-demo-playback` | Home / Browse demo player makes audible bundled audio. |
| `s05-instrument-touch-sound` | S05 selected instrument produces audible sound after tapping at least three strings or pads; the note must say each tap was audible or no taps were silent. |
| `recording-event-take-saved` | S05/S09 recording creates a saved work/take and the note names either the capture URI evidence or the visible event-only fallback label. If the note claims a capture URI, also collect `docs/qa/d2-demo-smoke-YYYYMMDD.recording-evidence.json` with `collectedAt` at or after the report `testedAt`, the matching URI, package name, file existence, and non-zero file size. If the note uses event-only fallback, the sidecar must say `status: "pass"` when present, `collectedAt` at or after the report `testedAt`, `recordingMode: "event-only"`, no `recordingUri`, `exists: false`, `sizeBytes: 0`, and `audioEvidence` with app `AudioTrack` playback, `appProcessPid` matching the device sidecar process pid, zero app audio input starts, and unchanged `RECORD_AUDIO` appops during the run. A sidecar with `status: "fail"` is diagnostic output only and cannot satisfy the gate. |
| `library-export-playback` | The S05/S09 exported library item plays audible audio, and the note must name `event replay` or `이벤트 녹음` provenance plus a positive source event count for the instrument-only export path. Do not use `audio capture` as passing evidence for this check. |
| `day5-expo-audio-probe-updated` | Real physical-device `expo-audio` probe evidence has been copied into the Day-5 probe record. The note must include the probe JSON path, the smoke report device label, `qa:day5-audio` exit/status, and whether this is D-2 scoped evidence or a final Day-5 engine selection. The matching `expo-audio` probe must include `measurementNotes` naming the physical device and measurement context, and `measuredAt` must be at or after the smoke report `testedAt`. |

Failed and blocked checks need concrete notes. Blocked checks are not acceptable for a ready demo.

To update a single manual check without hand-editing JSON, use the check update command. It refuses invalid `pass` notes that would fail the final smoke-report evidence rules. By default, it preserves the existing report `testedAt` so a later manual note does not make already-collected device, recording, or probe sidecars stale. Only pass `--tested-at` when intentionally advancing the whole rehearsal timestamp, then rerun the sidecars afterward.

For physical audible checks, run the device-smoke command first. `qa:d2-demo-smoke-check-update` refuses physical pass updates until `adb-device-detected` and `apk-installed-and-launched` are already pass results from `qa:d2-demo-android-device-smoke`, and the current physical `--evidence` sidecar still validates.

```bash
npm run qa:d2-demo-smoke-check-update -- --report docs/qa/d2-demo-smoke-YYYYMMDD.json --check home-browse-demo-playback --result pass --notes "Home -> S20 share player -> My Arirang bundled demo audio was audible on SM-S928N / Android 15 speaker." --evidence docs/qa/d2-demo-smoke-YYYYMMDD.device-evidence.json
```

Use the same command shape for `s05-instrument-touch-sound` and `library-export-playback` after each human audible check. Always pass the current physical `--evidence` sidecar so stale, emulator, or Expo Dev Launcher evidence is rejected before the report is modified. For `library-export-playback`, also name the `event replay` / `이벤트 녹음` provenance plus a positive source event count in the note.

After completing the S05/S09 event-only recording path and playing its preview/export at least once, collect the recording sidecar from the same app process. Use the run-start timestamp from just before the recording rehearsal began:

```bash
npm run qa:d2-demo-android-recording-evidence -- --evidence docs/qa/d2-demo-smoke-YYYYMMDD.recording-evidence.json --device-evidence docs/qa/d2-demo-smoke-YYYYMMDD.device-evidence.json --run-started-at 2026-07-06T01:28:00.000Z
```

This command reads app `logcat` and `RECORD_AUDIO` appops, writes event-only sidecar fields, and exits non-zero with `status: "fail"` if app microphone input, refreshed `RECORD_AUDIO` appops, missing app playback `AudioTrack`, or missing `mRecordingActive=false` evidence is detected. It does not replace human audible confirmation for Home/Browse or S18/S19 playback.

After a passing recording sidecar is written, update `recording-event-take-saved` through the guarded check-update command and pass both sidecars so the same recording evidence rules run before the report is modified:

```bash
npm run qa:d2-demo-smoke-check-update -- --report docs/qa/d2-demo-smoke-YYYYMMDD.json --check recording-event-take-saved --result pass --notes "S05 recording saved work-1 / track-1 / take-1 after event-only recording; event-only fallback label visible." --evidence docs/qa/d2-demo-smoke-YYYYMMDD.device-evidence.json --recording-evidence docs/qa/d2-demo-smoke-YYYYMMDD.recording-evidence.json
```

## 5. Validate The Gate

Run:

```bash
npm run qa:d2-demo-smoke-report -- docs/qa/d2-demo-smoke-YYYYMMDD.json --evidence docs/qa/d2-demo-smoke-YYYYMMDD.device-evidence.json --recording-evidence docs/qa/d2-demo-smoke-YYYYMMDD.recording-evidence.json --day5-probe docs/qa/day-5-audio-engine-probes.real-device.json
```

If the local Node install has a broken `npm`/`npx` shim, run the same CLI through the project-local `vite-node` entrypoint instead:

```powershell
node .\node_modules\vite-node\vite-node.mjs scripts\d2-demo-smoke-report.ts docs\qa\d2-demo-smoke-YYYYMMDD.json --evidence docs\qa\d2-demo-smoke-YYYYMMDD.device-evidence.json --recording-evidence docs\qa\d2-demo-smoke-YYYYMMDD.recording-evidence.json --day5-probe docs\qa\day-5-audio-engine-probes.real-device.json
```

Passing status:

```text
READY_FOR_D2_DEMO
```

Any `NOT_READY_FOR_D2_DEMO` result means the product demo is not ready yet. The most common expected blockers are a placeholder device label, `no connected adb device`, missing or incomplete device sidecar evidence, missing or incomplete recording capture sidecar evidence, missing or incomplete Day-5 probe sidecar evidence, or remaining blocked audible checks.

The summary also prints `Evidence still needed` for blocked checks and stale/missing sidecars. Use that line as the short operator checklist for the remaining device rehearsal work. It is not a substitute for changing the check result and notes after the evidence is actually collected.

If the Day-5 check is still blocked, the smoke report command does not require the probe file to exist yet, even when `--day5-probe` is present in the command. Once `day5-expo-audio-probe-updated` is changed to `pass`, the same command must be able to read that file and validate matching `expo-audio` physical-device evidence.

## 6. Validate Day-5 Audio Evidence

The D-2 product path chooses `expo-audio` for the demo spine, but the Day-5 record still needs real physical-device evidence before it can be used as an engine decision input.

```bash
npm run qa:day5-audio -- docs/qa/day-5-audio-engine-probes.real-device.json
```

The checked-in `docs/qa/day-5-audio-engine-probes.real-device.json` file is an intentionally empty placeholder so the validation path exists before the phone rehearsal. It must keep returning `INCOMPLETE_DEVICE_EVIDENCE` until the physical-device probe values are copied in. The example probe file is not enough. A real-device file must use `evidenceSource: "physical-device"`, the same device label used in the smoke report, and `measurementNotes` that name the physical device and measurement context.

For D-2 scoped evidence only, an `expo-audio` physical-device probe can be generated from a filled prototype handoff before the final Week 2 two-candidate record is complete:

```bash
npm run qa:prototype-handoff-check -- --d2-expo-only <expo-handoff.json>
npm run qa:prototype-probe-record -- --d2-expo-only <expo-handoff.json> docs/qa/day-5-audio-engine-probes.real-device.json
```

If there is no prototype handoff file, generate the D-2 scoped `expo-audio` probe directly from explicit physical-device measurements:

```bash
npm run qa:d2-expo-audio-probe-record -- --output docs/qa/day-5-audio-engine-probes.real-device.json --device-label "SM-S928N / Android 15" --measured-at 2026-07-06T02:00:00.000Z --touch-latency-ms 38 --first-touch-latency-ms 64 --steady-touch-latency-ms 32 --max-stable-voices 9 --pitch-bend-smooth true --glissando-triggered-strings 12 --mute-release-clean true --preload-stable true --session-fallback-preserved true --recording-capture-seconds 0 --measurement-notes "D-2 scoped physical-device probe on SM-S928N / Android 15 after audible S05 rehearsal."
```

This direct command refuses to write the probe record unless the generated `expo-audio` row parses as physical-device evidence and evaluates to `PASS` or `PASS_WITH_LIMITS`. It is useful for recording the presentation-device result quickly; it is still D-2 scoped evidence only unless the full Day-5 two-candidate decision record is complete.

This can support the D-2 demo spine even if `qa:day5-audio` exits non-zero because `react-native-audio-api` is still missing. The non-zero exit is acceptable only when the `expo-audio` physical-device row itself evaluates to `PASS` or `PASS_WITH_LIMITS`; it is not acceptable when `expo-audio` fails latency, voice, bend, glissando, mute, preload, session fallback, or D-2 recording criteria. In that case, record the note as D-2 scoped evidence only, for example: `qa:day5-audio exit 1; Status INCOMPLETE_DEVICE_EVIDENCE; missing react-native-audio-api; D-2 scoped evidence only, not final engine selection`. Do not present it as `FINAL_ENGINE_SELECTED`, and do not use sidecar/device/runtime evidence as audible proof for the D-2 audible checks.

After the probe file is written, update the smoke report check through the same guarded check-update command and pass the sidecar path:

```bash
npm run qa:d2-demo-smoke-check-update -- --report docs/qa/d2-demo-smoke-YYYYMMDD.json --check day5-expo-audio-probe-updated --result pass --notes "docs/qa/day-5-audio-engine-probes.real-device.json contains expo-audio physical-device probe evidence on SM-S928N / Android 15; qa:day5-audio exit 1; Status INCOMPLETE_DEVICE_EVIDENCE; missing react-native-audio-api; D-2 scoped evidence only, not final engine selection." --day5-probe docs/qa/day-5-audio-engine-probes.real-device.json
```

For this check, `qa:d2-demo-smoke-check-update` reads the probe sidecar before writing and rejects stale, mismatched, or failing `expo-audio` physical-device evidence.

## 7. Fallback Boundary

If the build passes but any physical-device audible check fails, present this as a UI prototype + prepared audio/video fallback. Do not claim the app itself is producing the failed audio path.

Acceptable fallback statement:

```text
The current app build demonstrates the UI flow and saved/exported state. This audio segment is prepared fallback media because the physical-device smoke gate did not pass.
```

Unacceptable fallback statement:

```text
The MVP audio path is ready.
```

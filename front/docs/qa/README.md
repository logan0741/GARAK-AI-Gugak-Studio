# QA

This folder owns manual validation checklists and physical-device QA handoffs.

The most important MVP QA area is audio and touch validation. Unit tests can prove data shape and boundary behavior, but they cannot prove touch-to-sound latency, dropout, click noise, or pitch-bend quality.

Before Day 5 review, create a Week 1 smoke report template, record the Day 2, Day 3, and Day 4 physical-device smoke runs in it, then validate it:

```bash
npm run qa:week1-smoke-template -- <week1-smoke-report.json> <tester> "<device-label>"
npm run qa:week1-smoke-report -- <week1-smoke-report.json>
```

The template command writes all required Day 2/3/4 check IDs with `blocked` results so the tester can fill them after device QA. It requires a non-empty tester name and a real physical device label before writing. The report command checks completed `pass` or `fail` results, notes for failed checks, duplicate areas or checks, and one physical device label across all runs. It reports failures for review, but it does not select the final engine and does not replace the Day 5 probe record. See `week-1-smoke-report.md` for the JSON shape and required check IDs.

Day 5 audio-engine values must be moved into a candidate probe record that follows `day-5-audio-engine-probes.example.json`. Final-selection probes must use `evidenceSource: 'physical-device'`, and all physical-device probes in the final decision record must come from one physical device label. The record must be validated with:

```bash
npm run qa:day5-readiness -- <week1-smoke-report.json> <probe-record.json>
npm run qa:day5-audio -- <probe-record.json>
```

The readiness command is the bridge between Week 1 smoke evidence and the Day 5 decision command. It requires a completed smoke report, exactly one physical-device probe for each required candidate, and matching physical-device labels across both files after trimming surrounding whitespace and normalizing slash spacing. When the smoke report is incomplete, its `Smoke report issues` line includes the concrete missing, duplicate, blocked, or device-label causes. When the probe record itself has missing candidates, duplicate physical-device probes, or mixed physical-device labels, those appear under `Probe record issues`. It does not write a new record and does not select the final engine.

`src/audio/audioEngineProbeDraft.ts` may be used to create rehearsal drafts, but draft probes stay `estimate` and cannot select the final engine. When a tester has measured every Day 5 field on a device, `promoteAudioEngineProbeDraftToPhysicalDevice()` can convert an estimate draft into a `physical-device` probe only if all manual measurement fields are supplied explicitly as non-null, correctly typed, in-range values.

When promoting a draft to `physical-device`, replace `deviceLabel: "replace-with-physical-device-model"` with the actual tested device and OS. The prototype screen has a `Device / OS` input that updates the copyable probe draft before handoff. Clearing that input resets the copyable draft to `replace-with-physical-device-model` so a stale physical device label is not copied by accident. The Day 5 parser rejects that placeholder and placeholder-like labels such as `Device / OS` for final-selection evidence.

The prototype probe draft also includes `observedRuntime` so the handoff records the requested candidate, active runtime, runtime status, native preload status, sample manifest version, unexpected sample string indexes when present, and preload error when present. Treat that field as QA context only; it does not replace any `physical-device` probe value.

`src/prototype/prototypeProbeHandoff.ts` may build physical-device probes or a Day 5 probe record from prototype inspector drafts only when the copied inspector draft is still an estimate-only prototype artifact, the draft and handoff device labels name the same physical device, `observedRuntime.activeRuntime` matches each probe candidate, the runtime/preload status is ready, `observedRuntime.sampleManifestVersion` is `dev-synthetic-gayageum-2026-06-08`, and `observedRuntime.unexpectedStringIndexes` is absent. This prevents fake fallback, edited inspector guard fields, placeholder or mismatched device labels, preloading states, mismatched sample fixtures, or copied invalid-string fixture reports from being promoted.

To produce a Day 5 probe record from prototype inspector drafts, copy the prototype inspector's `Prototype handoff JSON` block after testing each candidate. Each entry contains the copied `inspectorDraft`, `measuredAt`, `deviceLabel`, and nullable manual `measurements`. Replace every `measurements` null with explicit physical-device values, then check readiness before generating a probe record:

```bash
npm run qa:prototype-handoff-check -- <prototype-handoff.json>
npm run qa:prototype-probe-record -- <prototype-handoff.json> <probe-record.json>
```

The check reports missing candidates, duplicate candidates, device label issues, timestamp issues, manifest issues, inspector draft issues, missing or invalid manual measurement fields, runtime readiness issues, and generated probe-record validation issues without writing a probe record or selecting an engine. Manual `measurements` must contain only the Day 5 fields `touchToSoundLatencyMs`, `maxStableVoices`, `pitchBendSmooth`, `glissandoTriggeredStrings`, `muteReleaseClean`, `preloadStable`, `sessionFallbackPreserved`, and `recordingCaptureSeconds`; extra keys are invalid measurement fields. The probe-record command rejects malformed handoff JSON shape, then enforces runtime readiness and the expected sample manifest before writing the probe record JSON file, then validates that the generated record passes the Day 5 parser. Combine one filled entry per required candidate in the same handoff file, then validate the output again with `npm run qa:day5-audio -- <probe-record.json>` before treating it as a Day 5 handoff.

If each candidate was tested in a separate run, merge the copied handoff files before building the probe record. The merged handoff must still represent one physical device label across all candidate entries:

```bash
npm run qa:prototype-handoff-merge -- <merged-handoff.json> <expo-handoff.json> <rn-audio-api-handoff.json>
```

The merge command combines `entries[]`, rejects duplicate candidate entries, and rejects handoffs copied from different physical device labels. Device labels are compared after trimming whitespace and normalizing slash spacing, so `Pixel 8/Android 15` and `Pixel 8 / Android 15` are treated as the same device. It does not fill or validate physical-device measurements; `qa:prototype-probe-record` remains responsible for turning the filled handoff into a parser-valid probe record.
The merge command also rejects placeholder or blank device labels before writing a merged handoff, including labels copied from the inspector draft. It validates every input handoff `generatedAt` timestamp and the newly generated merged handoff timestamp before writing output. Replace `Device / OS` with the tested physical device before merging.

After merging, check that the merged handoff is ready for promotion:

```bash
npm run qa:prototype-handoff-check -- <merged-handoff.json>
```

The readiness check reports missing candidates, duplicate candidates, device label issues, timestamp issues, manifest issues, inspector draft issues, missing or invalid manual measurement fields, runtime readiness issues, and generated probe-record validation issues. It does not write a probe record or select the final engine. Device label issues include placeholder labels, entry/draft label mismatches, and candidate entries that were copied from different physical devices. Inspector draft issues mean the copied prototype guard fields no longer match the estimate-only prototype shape. Manifest issues mean the observed runtime did not use `dev-synthetic-gayageum-2026-06-08`, the Week 1 technical fixture manifest, or it reported unexpected sample string indexes outside the 1-12 prototype range. Invalid measurement fields include wrong value types, out-of-range counts, recording values without capture playback evidence, and any extra measurement key outside the Day 5 schema.

For candidates that cannot capture audio, keep the `Session fallback` JSON and copy `observedPrototypeRecording.fallbackReason` from the prototype draft. That reason is handoff context only; final selection still depends on the manually reviewed `physical-device` probe record.

Use UTC ISO timestamps such as `2026-06-08T01:00:00.000Z` for `generatedAt` and `measuredAt` in probe records. The parser also rejects impossible calendar dates even when the string shape looks like UTC ISO.

## Required QA Areas

| Area | Standard |
| --- | --- |
| Touch-to-sound latency | Physical-device target <= 50 ms |
| Polyphony | At least 8 simultaneous voices |
| Pitch bend | Continuous pitch change without click noise |
| Glissando | 12-string swipe has no missing input; probe count range is 0-12 |
| Mute | Ji-eum release decays naturally |
| Session fallback | Event session is preserved if audio capture fails |

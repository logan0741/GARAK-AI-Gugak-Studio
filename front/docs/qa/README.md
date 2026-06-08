# QA

This folder owns manual validation checklists and physical-device QA handoffs.

The most important MVP QA area is audio and touch validation. Unit tests can prove data shape and boundary behavior, but they cannot prove touch-to-sound latency, dropout, click noise, or pitch-bend quality.

Day 5 audio-engine values must be moved into a candidate probe record that follows `day-5-audio-engine-probes.example.json`. Final-selection probes must use `evidenceSource: 'physical-device'`, and the record must be validated with:

```bash
npm run qa:day5-audio -- <probe-record.json>
```

`src/audio/audioEngineProbeDraft.ts` may be used to create rehearsal drafts, but draft probes stay `estimate` and cannot select the final engine. When a tester has measured every Day 5 field on a device, `promoteAudioEngineProbeDraftToPhysicalDevice()` can convert an estimate draft into a `physical-device` probe only if all manual measurement fields are supplied explicitly as non-null values.

When promoting a draft to `physical-device`, replace `deviceLabel: "replace-with-physical-device-model"` with the actual tested device and OS. The prototype screen has a `Device / OS` input that updates the copyable probe draft before handoff. The Day 5 parser rejects that placeholder and placeholder-like labels such as `Device / OS` for final-selection evidence.

The prototype probe draft also includes `observedRuntime` so the handoff records the requested candidate, active runtime, runtime status, native preload status, sample manifest version, and preload error when present. Treat that field as QA context only; it does not replace any `physical-device` probe value.

For candidates that cannot capture audio, keep the `Session fallback` JSON and copy `observedPrototypeRecording.fallbackReason` from the prototype draft. That reason is handoff context only; final selection still depends on the manually reviewed `physical-device` probe record.

Use UTC ISO timestamps such as `2026-06-08T01:00:00.000Z` for `generatedAt` and `measuredAt` in probe records.

## Required QA Areas

| Area | Standard |
| --- | --- |
| Touch-to-sound latency | Physical-device target <= 50 ms |
| Polyphony | At least 8 simultaneous voices |
| Pitch bend | Continuous pitch change without click noise |
| Glissando | 12-string swipe has no missing input; probe count range is 0-12 |
| Mute | Ji-eum release decays naturally |
| Session fallback | Event session is preserved if audio capture fails |

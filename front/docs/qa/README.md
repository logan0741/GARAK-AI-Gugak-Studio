# QA

This folder owns manual validation checklists and physical-device QA handoffs.

The most important MVP QA area is audio and touch validation. Unit tests can prove data shape and boundary behavior, but they cannot prove touch-to-sound latency, dropout, click noise, or pitch-bend quality.

Day 5 audio-engine values must be moved into a candidate probe record that follows `day-5-audio-engine-probes.example.json`. Final-selection probes must use `evidenceSource: 'physical-device'`, and the record must be validated with:

```bash
npm run qa:day5-audio -- <probe-record.json>
```

`src/audio/audioEngineProbeDraft.ts` may be used to create rehearsal drafts, but draft probes stay `estimate` and cannot select the final engine.

## Required QA Areas

| Area | Standard |
| --- | --- |
| Touch-to-sound latency | Physical-device target <= 50 ms |
| Polyphony | At least 8 simultaneous voices |
| Pitch bend | Continuous pitch change without click noise |
| Glissando | 12-string swipe has no missing input |
| Mute | Ji-eum release decays naturally |
| Session fallback | Event session is preserved if audio capture fails |

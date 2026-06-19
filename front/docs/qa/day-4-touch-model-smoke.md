# Day 4 Touch Model Smoke Check

Status: implementation harness ready; physical-device result not recorded yet
Owner: Front-end spike
Scope: Week 1 touch model for the 12-string gayageum prototype

## Responsibility

Use this document when validating whether the prototype can turn raw touch movement into the core `PerformanceEvent` stream: tap, glissando swipe, hold-drag pitch bend, ji-eum mute, and release. This is not the final audio-engine decision record; final selection still belongs to `day-5-audio-engine-checklist.md`.

## Code Under Test

| File | Responsibility |
| --- | --- |
| `src/interaction/touchModel.ts` | Converts raw touch frames into `PerformanceEvent[]` using the existing `GestureMapper` functions. |
| `src/interaction/__tests__/touchModel.test.ts` | Pure tests for tap start, forward/reverse glissando crossing, hold-drag bend threshold, ji-eum mute, and release cleanup. |
| `src/prototype/GayageumPrototypeScreen.tsx` | Uses a `PanResponder` instrument surface and dispatches touch-model events to the current `SamplerEngine`, including additional touch starts for ji-eum mute. |

## Automated Verification

Run before opening a device build:

```bash
npm test src/interaction/__tests__/touchModel.test.ts
npm run typecheck
```

Expected result: all commands exit 0.

## Device Smoke Procedure

1. Build or launch an Expo dev build on a physical device.
2. Touch a single string and confirm a `string_pluck` event is emitted immediately on touch start.
3. Release the same touch and confirm a `string_release` event is emitted.
4. Swipe across all 12 strings and confirm each newly crossed string emits one `glissando_step` in order.
5. Hold one string past the hold threshold, drag horizontally, and confirm `string_bend` events are emitted.
6. Use a broad or multi-touch contact over a string and confirm `string_mute` is emitted even if the added contact does not move.
7. Confirm the session event log remains available even if the audio engine reports a failure.

## Result Table

| Check | Expected | Result | Notes |
| --- | --- | --- | --- |
| Tap | `string_pluck` on touch start, `string_release` on touch end |  | Tap latency is measured from touch start. |
| Glissando | Every crossed string emits one ordered `glissando_step` |  | Test both directions. |
| Hold drag | Same-string horizontal drag after threshold emits smooth `string_bend` values |  | Bend range is clamped by `GestureMapper`; a pointer that already became a swipe does not later switch into bend. |
| Ji-eum | Broad or multi-touch contact emits `string_mute` once per touched string |  | Prototype maps multi-touch to full contact area. |
| Fallback | Events still append to `Session` when audio dispatch fails |  |  |

## Handoff To Day 5

Use this smoke result to fill the glissando, pitch bend, mute, and session fallback rows in `day-5-audio-engine-checklist.md`.

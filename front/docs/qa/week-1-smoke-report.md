# Week 1 Smoke Report

Status: required before Day 5 review when physical-device smoke runs exist
Owner: Front-end spike
Scope: Day 2, Day 3, and Day 4 physical-device smoke evidence

## Responsibility

Use this report after running the Day 2 `expo-audio`, Day 3 `react-native-audio-api`, and Day 4 touch model smoke procedures on a physical device. It records whether each smoke step was run, failed, or was blocked. It does not select the final audio engine and does not replace the Day 5 physical-device probe record.

Create a template before device QA:

```bash
npm run qa:week1-smoke-template -- <week1-smoke-report.json> <tester> "<device-label>"
```

The template command writes every required Day 2/3/4 check with `result: "blocked"`. Replace each result with `pass` or `fail` after running the corresponding physical-device smoke step.

`tester` must be a non-empty name after trimming whitespace. The template command rejects blank tester names before writing a report so generated smoke reports remain parseable by `qa:week1-smoke-report`. The written `tester` and `deviceLabel` values are trimmed before they are saved.

The template command also validates its generated timestamp before writing. If the clock provider does not return an ISO timestamp that `qa:week1-smoke-report` can parse, the command fails instead of producing a broken smoke report.

Validate a filled report with:

```bash
npm run qa:week1-smoke-report -- <week1-smoke-report.json>
```

The command exits 0 only when all required Day 2/3/4 areas are present once, every required check appears once, every required check has a `pass` or `fail` result, all failed checks include review notes, all runs use the same physical device label, `generatedAt` is at or after every run `testedAt` timestamp, and no check is `blocked`. Failed checks are reported for review but still count as executed evidence when notes explain the observed failure; Day 5 decides whether the failures block the final engine choice.

If a run exists with an empty `checks` array, every required check for that run's area is reported as missing. Empty check arrays are not accepted as executed smoke evidence.

`deviceLabel` must name the tested physical device and OS, for example `Pixel 8 / Android 15`. Placeholder labels such as `Device / OS`, `Device/OS`, `physical device`, `replace-with-physical-device-model`, or `replace with physical device model` are rejected by both template generation and report validation. A filled report must use one `deviceLabel` across Day 2, Day 3, and Day 4 runs so the later Day 5 probe record can be aligned to the same physical device. Slash spacing differences such as `Pixel 8/Android 15` and `Pixel 8 / Android 15` are treated as the same label for consistency checks.

After creating the Day 5 probe record, run `npm run qa:day5-readiness -- <week1-smoke-report.json> <probe-record.json>` to confirm this report and the candidate probes were recorded on the same physical device before selecting an engine.

## JSON Shape

```json
{
  "generatedAt": "2026-06-08T07:05:00.000Z",
  "runs": [
    {
      "area": "day-2-expo-audio",
      "testedAt": "2026-06-08T07:01:00.000Z",
      "tester": "name",
      "deviceLabel": "Pixel 8 / Android 15",
      "checks": [
        {
          "id": "preload",
          "result": "pass",
          "notes": ""
        }
      ]
    }
  ]
}
```

Allowed `result` values:

| Value | Meaning |
| --- | --- |
| `pass` | The smoke step ran and met the expected behavior. |
| `fail` | The smoke step ran and did not meet the expected behavior. |
| `blocked` | The smoke step could not be run. Resolve before Day 5 review. |

For `fail`, `notes` must include the observed symptom or condition. Blank failure notes keep the report incomplete for Day 5 review.

## Required Check IDs

### `day-2-expo-audio`

| ID | Source row |
| --- | --- |
| `preload` | Preload |
| `tap-playback` | Tap playback |
| `playback-queue-failure` | Playback queue failure |
| `glissando-playback` | Glissando playback |
| `bend-approximation` | Bend approximation |
| `mute-release` | Mute/release |
| `recording-permission` | Recording permission |
| `ten-second-capture` | 10-second capture |
| `captured-playback` | Captured playback |
| `inspector-recording-observation` | Inspector recording observation |

### `day-3-react-native-audio-api`

| ID | Source row |
| --- | --- |
| `preload` | Preload |
| `tap-playback` | Tap playback |
| `polyphony` | Polyphony |
| `pitch-bend` | Pitch bend |
| `filter-path` | Filter path |
| `mute-release` | Mute/release |
| `recording-fallback` | Recording fallback |

### `day-4-touch-model`

| ID | Source row |
| --- | --- |
| `tap` | Tap |
| `glissando` | Glissando |
| `hold-drag` | Hold drag |
| `ji-eum` | Ji-eum |
| `bend-button` | Bend button |
| `mute-button` | Mute button |
| `fallback` | Fallback |

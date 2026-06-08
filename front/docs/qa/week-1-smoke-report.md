# Week 1 Smoke Report

Status: required before Day 5 review when physical-device smoke runs exist
Owner: Front-end spike
Scope: Day 2, Day 3, and Day 4 physical-device smoke evidence

## Responsibility

Use this report after running the Day 2 `expo-audio`, Day 3 `react-native-audio-api`, and Day 4 touch model smoke procedures on a physical device. It records whether each smoke step was run, failed, or was blocked. It does not select the final audio engine and does not replace the Day 5 physical-device probe record.

Validate a filled report with:

```bash
npm run qa:week1-smoke-report -- <week1-smoke-report.json>
```

The command exits 0 only when all required Day 2/3/4 areas are present once, every required check appears once, every required check has a `pass` or `fail` result, and no check is `blocked`. Failed checks are reported for review but still count as executed evidence; Day 5 decides whether the failures block the final engine choice.

## JSON Shape

```json
{
  "generatedAt": "2026-06-08T07:00:00.000Z",
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
| `fallback` | Fallback |

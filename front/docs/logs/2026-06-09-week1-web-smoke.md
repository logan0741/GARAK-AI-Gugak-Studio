# Week 1 Prototype Web Smoke Log

Date: 2026-06-09
Branch: `feat/1-week1-spike`
Scope: Expo web smoke only; not physical-device audio evidence

## Runtime

Command:

```bash
CI=1 npm run start -- --web --port 8081 --non-interactive
```

Observed server state:

- URL: `http://localhost:8081/`
- Page title: `GUKAK STUDIO`
- Metro web bundle completed.
- Console error logs: none observed during this smoke run.
- Screenshot captured from the in-app browser; visible UI was not blank and showed the 12-string prototype plus `Prototype Inspector`.

Note: Expo reported `--non-interactive is not supported, use $CI=1 instead`; the run used `CI=1`, and the web server still started successfully.

## Initial Inspector Checks

| Check | Observed |
| --- | --- |
| App title visible | `GUKAK STUDIO` |
| Inspector visible | `Prototype Inspector` |
| Initial session replay state | `Replay waiting: 0 events` |
| Initial `Replay` button state | disabled |
| Browser console errors | none |

## Interaction Checks

Action sequence:

1. Press `Glissando`.
2. Confirm `Replay` becomes enabled.
3. Press `Replay`.

Observed post-action state:

| Check | Observed |
| --- | --- |
| Event count | `Events: 12` |
| Session replay | `Replay ready: 12 events, 176 ms` |
| Session replay dispatch | `Replay dispatched: 12 events` |
| Audio status | `ok` |
| Browser console errors | none |

## Limit

This log proves only that the current prototype web route renders, the fake fallback path stays interactive, and the inspector state changes after replay smoke actions. It must not be used as evidence for touch-to-sound latency, polyphony quality, pitch-bend smoothness, mute release quality, recording capture, or final audio-engine selection.

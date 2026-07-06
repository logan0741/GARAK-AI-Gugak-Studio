# S05 Recording Capture Update

Status: partially cleared for the one-track D-2 demo path.

Related stale backlog: `2026-06-26-s05-recording-backlog.md`

## Cleared

- REC-09 is no longer purely future work for the one-track S05/S09 demo path.
- Native capture can start from the S05 recording setup panel.
- Supported capture URIs are persisted under `files/garak-recordings`.
- Saved takes can carry `recordingUri`.
- S07/S17 export/share metadata can show `audio_capture` provenance when a file-backed URI is present.

## Physical-device evidence

- Device: `SM-S928N / Android 15`.
- Flow: Guest Mode -> S05 -> recording setup panel -> S07 -> S17.
- File evidence: `files/garak-recordings/1783246168561-recording-24fca193-01f4-4cf9-9726-c05685e8b653.m4a`.
- UI evidence: S17 displayed `9 sec`, `janggu`, and `audio capture` instead of the previous `event replay` label.
- Preview evidence: S17 preview changed to `previewing` and logcat showed no ReactNativeJS error.

## Still Open

- Human audible confirmation for S05 instrument taps and exported capture playback.
- Full mixed-track rendering; current local renderer intentionally rejects misleading multi-track success.
- Draft recovery for interrupted recordings.
- Richer per-instrument recording schemas.

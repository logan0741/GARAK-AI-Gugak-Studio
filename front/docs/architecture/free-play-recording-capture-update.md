# Free Play Recording Capture Update

Date: 2026-07-05

Related canonical flow: `free-play-recording-flow.md`

## Current Capture Path

The S05/S09 demo recording path now has two layers:

- Event capture: touch events remain stored on the take so replay and editing still work if audio capture fails.
- Audio capture: supported native recordings are persisted and attached to the take as `recordingUri`.

The S05 top REC button opens the recording setup panel. Native capture starts only after the user confirms the panel's recording start action.

## State And Provenance

- A saved `Take` may include `recordingUri` when native capture returns a supported file-backed URI.
- Local capture storage copies supported cache URIs into `files/garak-recordings` before product state stores them.
- S07 preview and S17 export prefer captured audio only when the take has a valid `file://` or `content://` artifact.
- Exported audio provenance is explicit:
  - `audio_capture` for file-backed captured audio.
  - `event_replay` for honest event replay exports.
  - `demo_sample` for bundled demo or placeholder audio.

## Guardrails

- Late persisted library snapshots merge local `recordingUri` values back into matching works/tracks/takes instead of wiping a just-attached capture.
- Library counters are reconciled after loading a snapshot so new recordings do not reuse an existing `work-*` id.
- Duplicate in-flight native capture starts share the same start promise instead of calling the native port twice.
- If a native recorder returns a playable URI with a zero duration, local capture falls back to elapsed session time.

## Remaining Architecture Work

- Real full-mix rendering for multi-track captured/event/reference mixes.
- Human audible verification as a QA artifact, not just UI/logcat evidence.
- Durable draft recovery for interrupted recording sessions.

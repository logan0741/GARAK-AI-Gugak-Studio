from __future__ import annotations

import argparse
import json
from pathlib import Path

from audio_preprocess import PreprocessConfig, SessionMeta, preprocess_recording


def _load_meta_json(path: str | None) -> dict:
    if not path:
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize one recording and split it into fixed-length bars."
    )
    parser.add_argument("--input", required=True, help="Input wav path")
    parser.add_argument("--output-dir", default="AI/preprocessed")
    parser.add_argument("--meta-json", help="Optional session metadata JSON")
    parser.add_argument("--session-id", help="Recording session id")
    parser.add_argument("--instrument", help="Instrument name")
    parser.add_argument("--bpm", type=float, help="Recording BPM")
    parser.add_argument("--beats-per-bar", type=int, help="Beats per bar")
    parser.add_argument("--jangdan", help="Jangdan name")
    parser.add_argument("--jo", help="Jo name")
    parser.add_argument(
        "--first-bar-offset",
        type=float,
        default=0.0,
        help="Seconds from wav start to the first bar start. Negative values pad silence.",
    )
    parser.add_argument("--expected-bars", type=int)
    parser.add_argument("--target-rms-db", type=float, default=-20.0)
    parser.add_argument("--peak-ceiling", type=float, default=0.95)
    parser.add_argument("--trim-top-db", type=float, default=45.0)
    parser.add_argument("--fade-ms", type=float, default=5.0)
    args = parser.parse_args()

    meta_json = _load_meta_json(args.meta_json)
    session_id = args.session_id or meta_json.get("session_id") or Path(args.input).stem
    instrument = args.instrument or meta_json.get("instrument")
    bpm = args.bpm if args.bpm is not None else meta_json.get("bpm")
    beats_per_bar = (
        args.beats_per_bar
        if args.beats_per_bar is not None
        else meta_json.get("beats_per_bar")
    )

    if not instrument:
        raise SystemExit("--instrument is required unless meta-json includes instrument")
    if bpm is None:
        raise SystemExit("--bpm is required unless meta-json includes bpm")
    if beats_per_bar is None:
        raise SystemExit("--beats-per-bar is required unless meta-json includes beats_per_bar")

    meta = SessionMeta(
        session_id=session_id,
        instrument=instrument,
        bpm=float(bpm),
        beats_per_bar=int(beats_per_bar),
        jangdan=args.jangdan or meta_json.get("jangdan"),
        jo=args.jo or meta_json.get("jo"),
        first_bar_offset_s=(
            args.first_bar_offset
            if args.first_bar_offset != 0.0
            else float(meta_json.get("first_bar_offset_s", 0.0))
        ),
        expected_bars=(
            args.expected_bars
            if args.expected_bars is not None
            else meta_json.get("expected_bars")
        ),
    )
    config = PreprocessConfig(
        target_rms_db=args.target_rms_db,
        peak_ceiling=args.peak_ceiling,
        trim_top_db=args.trim_top_db,
        fade_ms=args.fade_ms,
    )

    manifest = preprocess_recording(args.input, args.output_dir, meta, config)
    stats = manifest["stats"]
    print(f"[OK] manifest: {manifest['manifest_path']}")
    print(f"[OK] normalized: {manifest['normalized_path']}")
    print(f"[OK] bar_aligned: {manifest['bar_aligned_path']}")
    print(
        "[OK] bars: "
        f"{stats['kept_bars']} kept, {stats['padded_bars']} padded, "
        f"{stats['bar_duration_s']:.3f}s each"
    )


if __name__ == "__main__":
    main()

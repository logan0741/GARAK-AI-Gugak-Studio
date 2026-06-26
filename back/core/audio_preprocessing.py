from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, List, Tuple, Union

import json
import math

try:
    import librosa
    import numpy as np
    import soundfile as sf
except ImportError as exc:
    raise ImportError(
        "audio_preprocessing requires numpy, librosa and soundfile. "
        "Install them with: pip install numpy librosa soundfile"
    ) from exc

from core.gugak import TARGET_SR


PathLike = Union[str, Path]


@dataclass(frozen=True)
class PreprocessConfig:
    target_sr: int = TARGET_SR
    target_rms_db: float = -20.0
    peak_ceiling: float = 0.95
    trim_top_db: float = 45.0
    fade_ms: float = 5.0
    min_bar_coverage: float = 0.65


@dataclass(frozen=True)
class RecordingMeta:
    session_id: str
    instrument: str
    bpm: float
    beats_per_bar: int
    jangdan: str | None = None
    jo: str | None = None
    first_bar_offset_s: float = 0.0
    expected_bars: int | None = None


def load_mono(path: PathLike, target_sr: int) -> np.ndarray:
    audio, sr = sf.read(str(path), dtype="float32", always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    audio = np.asarray(audio, dtype=np.float32)
    if sr != target_sr:
        audio = librosa.resample(
            audio.astype(np.float64), orig_sr=sr, target_sr=target_sr
        ).astype(np.float32)
    return audio


def trim_silence(
    audio: np.ndarray,
    top_db: float,
    sr: int,
) -> Tuple[np.ndarray, dict[str, Any]]:
    if audio.size == 0:
        return audio, {"trim_start_sample": 0, "trim_end_sample": 0}

    peak = float(np.max(np.abs(audio)))
    if peak <= 1e-8:
        return audio, {"trim_start_sample": 0, "trim_end_sample": int(audio.size)}

    threshold = peak * (10.0 ** (-top_db / 20.0))
    active = np.flatnonzero(np.abs(audio) >= threshold)
    if active.size == 0:
        return audio, {"trim_start_sample": 0, "trim_end_sample": int(audio.size)}

    pad = min(int(0.05 * sr), audio.size // 2)
    start = max(0, int(active[0]) - pad)
    end = min(int(audio.size), int(active[-1]) + pad)
    return audio[start:end], {"trim_start_sample": start, "trim_end_sample": end}


def normalize_rms(
    audio: np.ndarray,
    target_rms_db: float,
    peak_ceiling: float,
) -> Tuple[np.ndarray, dict[str, Any]]:
    if audio.size == 0:
        return audio, {
            "input_rms_db": None,
            "output_rms_db": None,
            "input_peak": 0.0,
            "output_peak": 0.0,
            "gain_db": 0.0,
        }

    rms = float(np.sqrt(np.mean(np.square(audio)))) + 1e-12
    peak = float(np.max(np.abs(audio)))
    target_rms = 10.0 ** (target_rms_db / 20.0)
    gain = target_rms / rms

    if peak * gain > peak_ceiling:
        gain = peak_ceiling / max(peak, 1e-12)

    normalized = (audio * gain).astype(np.float32)
    out_rms = float(np.sqrt(np.mean(np.square(normalized)))) + 1e-12
    out_peak = float(np.max(np.abs(normalized))) if normalized.size else 0.0

    return normalized, {
        "input_rms_db": 20.0 * math.log10(rms),
        "output_rms_db": 20.0 * math.log10(out_rms),
        "input_peak": peak,
        "output_peak": out_peak,
        "gain_db": 20.0 * math.log10(max(gain, 1e-12)),
    }


def apply_fades(audio: np.ndarray, sr: int, fade_ms: float) -> np.ndarray:
    fade_len = int(sr * fade_ms / 1000.0)
    fade_len = min(fade_len, audio.size // 2)
    if fade_len <= 0:
        return audio
    out = audio.copy()
    out[:fade_len] *= np.linspace(0.0, 1.0, fade_len, dtype=np.float32)
    out[-fade_len:] *= np.linspace(1.0, 0.0, fade_len, dtype=np.float32)
    return out


def split_to_bars(
    audio: np.ndarray,
    meta: RecordingMeta,
    sr: int,
    min_bar_coverage: float,
) -> Tuple[np.ndarray, List[np.ndarray], dict[str, Any]]:
    if meta.bpm <= 0:
        raise ValueError("bpm must be greater than zero")
    if meta.beats_per_bar <= 0:
        raise ValueError("beats_per_bar must be greater than zero")

    bar_samples = int(round((60.0 / meta.bpm) * meta.beats_per_bar * sr))
    if bar_samples <= 0:
        raise ValueError("computed bar length is invalid")

    offset_samples = int(round(meta.first_bar_offset_s * sr))
    if offset_samples >= 0:
        aligned = audio[offset_samples:]
    else:
        aligned = np.pad(audio, (abs(offset_samples), 0))

    available_bars = int(math.ceil(aligned.size / bar_samples)) if aligned.size else 0
    n_bars = meta.expected_bars or available_bars
    bars: List[np.ndarray] = []
    padded = 0

    for idx in range(n_bars):
        start = idx * bar_samples
        end = start + bar_samples
        chunk = aligned[start:end]
        coverage = chunk.size / bar_samples if bar_samples else 0.0
        if coverage < min_bar_coverage:
            continue
        if chunk.size < bar_samples:
            chunk = np.pad(chunk, (0, bar_samples - chunk.size))
            padded += 1
        bars.append(chunk.astype(np.float32))

    bar_aligned = np.concatenate(bars).astype(np.float32) if bars else np.empty(0, dtype=np.float32)
    return bar_aligned, bars, {
        "bar_samples": bar_samples,
        "bar_duration_s": bar_samples / sr,
        "offset_samples": offset_samples,
        "requested_bars": meta.expected_bars,
        "available_bars": available_bars,
        "kept_bars": len(bars),
        "padded_bars": padded,
    }


def preprocess_recording(
    input_path: PathLike,
    output_dir: PathLike,
    meta: RecordingMeta,
    config: PreprocessConfig = PreprocessConfig(),
) -> dict[str, Any]:
    out_dir = Path(output_dir)
    bars_dir = out_dir / "bars"
    bars_dir.mkdir(parents=True, exist_ok=True)

    audio = load_mono(input_path, config.target_sr)
    original_samples = int(audio.size)
    trimmed, trim_stats = trim_silence(audio, config.trim_top_db, config.target_sr)
    normalized, norm_stats = normalize_rms(
        trimmed,
        target_rms_db=config.target_rms_db,
        peak_ceiling=config.peak_ceiling,
    )
    normalized = apply_fades(normalized, config.target_sr, config.fade_ms)
    aligned, bars, bar_stats = split_to_bars(
        normalized,
        meta,
        config.target_sr,
        config.min_bar_coverage,
    )

    normalized_path = out_dir / f"{meta.session_id}_normalized.wav"
    aligned_path = out_dir / f"{meta.session_id}_bars.wav"
    sf.write(normalized_path, normalized, config.target_sr)
    sf.write(aligned_path, aligned, config.target_sr)

    bar_entries = []
    for idx, bar_audio in enumerate(bars):
        bar_path = bars_dir / f"{meta.session_id}_bar_{idx + 1:03d}.wav"
        sf.write(bar_path, bar_audio, config.target_sr)
        bar_entries.append({
            "index": idx,
            "path": str(bar_path),
            "duration_s": len(bar_audio) / config.target_sr,
        })

    manifest = {
        "input_path": str(input_path),
        "normalized_path": str(normalized_path),
        "bar_aligned_path": str(aligned_path),
        "bars": bar_entries,
        "meta": asdict(meta),
        "config": asdict(config),
        "stats": {
            "original_samples": original_samples,
            "trimmed_samples": int(trimmed.size),
            "normalized_samples": int(normalized.size),
            **trim_stats,
            **norm_stats,
            **bar_stats,
        },
    }

    manifest_path = out_dir / f"{meta.session_id}_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    manifest["manifest_path"] = str(manifest_path)
    return manifest

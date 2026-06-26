from __future__ import annotations

import os
import uuid

try:
    import numpy as np
    import soundfile as sf
    import librosa
except ImportError as exc:
    raise ImportError(
        "audio_service requires 'numpy', 'soundfile' and 'librosa'. "
        "Install them with: pip install numpy soundfile librosa"
    ) from exc

from core.gugak import JANGDAN_BEATS, TARGET_SR


def _load_resampled(path: str) -> np.ndarray:
    audio, sr = sf.read(path, dtype="float32", always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    audio = np.asarray(audio, dtype=np.float32)
    if sr != TARGET_SR:
        audio = librosa.resample(
            audio.astype(np.float64), orig_sr=sr, target_sr=TARGET_SR
        ).astype(np.float32)
    return audio


def _crossfade_append(
    base: np.ndarray, segment: np.ndarray, crossfade_samples: int
) -> np.ndarray:
    if base.size == 0:
        return segment.copy()

    overlap = min(crossfade_samples, base.size, segment.size)
    if overlap <= 0:
        return np.concatenate([base, segment])

    fade_out = np.linspace(1.0, 0.0, overlap, dtype=np.float32)
    fade_in = np.linspace(0.0, 1.0, overlap, dtype=np.float32)

    blended = base[-overlap:] * fade_out + segment[:overlap] * fade_in
    return np.concatenate([base[:-overlap], blended, segment[overlap:]])


def assemble_accompaniment(
    segment_paths: list[str],
    output_dir: str,
    bpm: float,
    beats_per_bar: int,
    crossfade_ratio: float = 0.03,
) -> str:
    if not segment_paths:
        raise ValueError("segment_paths가 비어 있습니다.")

    os.makedirs(output_dir, exist_ok=True)

    beat_duration_s = 60.0 / bpm if bpm > 0 else 0.5
    bar_duration_s = beat_duration_s * beats_per_bar
    bar_duration_samples = int(bar_duration_s * TARGET_SR)
    crossfade_samples = max(0, int(bar_duration_samples * crossfade_ratio))

    result = np.empty(0, dtype=np.float32)
    for path in segment_paths:
        if not os.path.isfile(path):
            continue
        segment = _load_resampled(path)
        if segment.size == 0:
            continue
        result = _crossfade_append(result, segment, crossfade_samples)

    if result.size == 0:
        raise ValueError("조립할 유효한 오디오 세그먼트가 없습니다.")

    peak = float(np.max(np.abs(result)))
    if peak > 1.0:
        result = result / peak

    filename = f"generated_{uuid.uuid4().hex[:8]}.wav"
    out_path = os.path.join(output_dir, filename)
    sf.write(out_path, result, TARGET_SR)
    return out_path

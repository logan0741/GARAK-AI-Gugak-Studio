from __future__ import annotations

try:
    import numpy as np
    import librosa
except ImportError as exc:
    raise ImportError(
        "onset_detection requires 'numpy' and 'librosa'. "
        "Install them with: pip install numpy librosa"
    ) from exc

MIN_IOI_MS = 50.0


def _estimate_tempo(y: np.ndarray, sr: int) -> float:
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    try:
        import librosa.feature.rhythm as _lf_rhythm
        tempo = _lf_rhythm.tempo(onset_envelope=onset_env, sr=sr)
    except (AttributeError, ImportError):
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", FutureWarning)
            tempo = librosa.beat.tempo(onset_envelope=onset_env, sr=sr)
    bpm = float(np.atleast_1d(tempo)[0])
    if not np.isfinite(bpm) or bpm <= 0:
        return 120.0
    return bpm


def _detect_onset_times(y: np.ndarray, sr: int) -> np.ndarray:
    onset_frames = librosa.onset.onset_detect(
        y=y, sr=sr, backtrack=True, units="frames"
    )
    if onset_frames.size == 0:
        return np.empty(0, dtype=float)
    return librosa.frames_to_time(onset_frames, sr=sr)


def extract_ioi(wav_path: str, sr: int = 22050) -> np.ndarray:
    y, sr = librosa.load(wav_path, sr=sr, mono=True)
    onset_times = _detect_onset_times(y, sr)
    if onset_times.size < 2:
        return np.empty(0, dtype=float)

    ioi_ms = np.diff(onset_times) * 1000.0
    return ioi_ms[ioi_ms >= MIN_IOI_MS]


def extract_bar_patterns(
    wav_path: str, beats_per_bar: int, sr: int = 22050
) -> list[np.ndarray]:
    y, sr = librosa.load(wav_path, sr=sr, mono=True)
    onset_times = _detect_onset_times(y, sr)
    if onset_times.size < 2:
        return []

    bpm = _estimate_tempo(y, sr)
    beat_duration_s = 60.0 / bpm
    bar_duration_s = beat_duration_s * beats_per_bar
    if bar_duration_s <= 0:
        return []

    total_duration_s = float(len(y)) / sr
    n_bars = int(total_duration_s // bar_duration_s)
    if n_bars < 1:
        n_bars = 1

    patterns: list[np.ndarray] = []
    for bar_idx in range(n_bars):
        bar_start = bar_idx * bar_duration_s
        bar_end = bar_start + bar_duration_s
        mask = (onset_times >= bar_start) & (onset_times < bar_end)
        bar_onsets = onset_times[mask]
        if bar_onsets.size < 2:
            continue
        ioi_ms = np.diff(bar_onsets) * 1000.0
        ioi_ms = ioi_ms[ioi_ms >= MIN_IOI_MS]
        if ioi_ms.size > 0:
            patterns.append(ioi_ms)

    return patterns

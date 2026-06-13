# -*- coding: utf-8 -*-
"""
WAV → 노트 시퀀스(pitch class) 추출 + 마르코프 전이 행렬 학습 라이브러리

상태 공간: 12 chromatic pitch classes
국악 율명 매핑 (상대적 반음 순서):
  황(0) 대(1) 태(2) 협(3) 고(4) 중(5) 유(6) 임(7) 이(8) 남(9) 무(10) 응(11)
"""
from __future__ import annotations

import os
import pickle
from datetime import datetime, timezone
from typing import List, Tuple

try:
    import numpy as np
    import librosa
except ImportError as exc:
    raise ImportError("pip install numpy librosa") from exc

N_PITCHES = 12
YUL_NAMES = ["황", "대", "태", "협", "고", "중", "유", "임", "이", "남", "무", "응"]

# 평조: 황태중임남 → 상대적 반음 [0,2,5,7,9]  (장2도 간격 5음계)
# 계면조: 황중임남응 → 상대적 반음 [0,3,5,7,10] (단3도 시작 5음계)
JO_SCALE = {
    "평조":  [0, 2, 5, 7, 9],
    "계면조": [0, 3, 5, 7, 10],
}

LAPLACE_ALPHA   = 1e-6
MIN_NOTE_DUR_S  = 0.05   # 50ms 미만 노트 무시
HOP_LENGTH      = 512    # pyin · onset_detect 공용 hop


def extract_note_sequence(wav_path: str, sr: int = 22050) -> List[int]:
    """WAV → pitch class 시퀀스 (0-11).

    pyin 으로 F0 를 추적하고, onset 경계마다 지배적 pitch class 를 추출한다.
    타악(장구) 등 무성 구간은 voiced_flag 로 걸러 낸다.
    """
    y, _ = librosa.load(wav_path, sr=sr, mono=True)
    if y.size < sr * 0.2:          # 0.2초 미만 파일 스킵
        return []

    # F0 추적 — voiced_flag=True 인 프레임만 유효
    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr,
        hop_length=HOP_LENGTH,
        fill_na=None,
    )

    # onset 검출 (같은 hop_length 사용 → 프레임 인덱스 일치)
    onset_frames = librosa.onset.onset_detect(
        y=y, sr=sr, backtrack=True, units="frames", hop_length=HOP_LENGTH
    )
    if onset_frames.size < 2:
        return []

    notes: List[int] = []
    n_frames = len(f0)

    for i, onset_fr in enumerate(onset_frames):
        end_fr = int(onset_frames[i + 1]) if i + 1 < len(onset_frames) else n_frames
        onset_fr = int(onset_fr)

        # 최소 지속 시간 필터
        dur_s = (end_fr - onset_fr) * HOP_LENGTH / sr
        if dur_s < MIN_NOTE_DUR_S:
            continue

        seg_f0      = f0[onset_fr:end_fr]
        seg_voiced  = voiced_flag[onset_fr:end_fr]

        if seg_f0 is None or seg_voiced is None:
            continue

        # voiced 프레임만 추출
        valid_mask  = seg_voiced & ~np.isnan(seg_f0)
        voiced_f0   = seg_f0[valid_mask]
        if voiced_f0.size == 0:
            continue

        # 지배적 pitch class: MIDI 반올림 후 최빈값
        midi_vals   = librosa.hz_to_midi(voiced_f0)
        midi_int    = np.round(midi_vals).astype(int) % N_PITCHES
        pitch_class = int(np.bincount(midi_int, minlength=N_PITCHES).argmax())
        notes.append(pitch_class)

    return notes


def build_pitch_transition_matrix(
    sequences: List[List[int]],
) -> Tuple[np.ndarray, np.ndarray]:
    """pitch class 시퀀스들 → (12×12 전이행렬, 12차원 음고 히스토그램).

    전이행렬[i][j] = "음 i 다음 음 j 의 확률"  (행 합 = 1.0)
    Laplace smoothing α=1e-6 적용 (미관측 전이에도 0 이 아닌 확률 부여).
    """
    counts    = np.zeros((N_PITCHES, N_PITCHES), dtype=np.float64)
    histogram = np.zeros(N_PITCHES, dtype=np.float64)

    for seq in sequences:
        for p in seq:
            if 0 <= p < N_PITCHES:
                histogram[p] += 1.0
        for cur, nxt in zip(seq[:-1], seq[1:]):
            if 0 <= cur < N_PITCHES and 0 <= nxt < N_PITCHES:
                counts[cur, nxt] += 1.0

    counts += LAPLACE_ALPHA
    row_sums = counts.sum(axis=1, keepdims=True)
    transition_matrix = counts / row_sums

    total = histogram.sum()
    note_histogram = histogram / total if total > 0 else histogram

    return transition_matrix, note_histogram


def sample_next_pitch(
    current_pitch: int,
    transition_matrix: np.ndarray,
    jo: str | None = None,
    temperature: float = 1.0,
) -> int:
    """현재 음에서 다음 음 샘플링.

    temperature > 1 : 더 다양한 음 선택 (창의적)
    temperature < 1 : 더 확실한 다음 음 (보수적)
    jo 지정 시 해당 음계 외 음의 확률을 0 으로 마스킹.
    """
    probs = transition_matrix[current_pitch].copy()

    # 조 스케일 마스킹 — 해당 조의 5음 외 확률 제거
    if jo and jo in JO_SCALE:
        scale_pcs = set(JO_SCALE[jo])
        for pc in range(N_PITCHES):
            if pc not in scale_pcs:
                probs[pc] = 0.0

    # temperature scaling
    if temperature != 1.0 and temperature > 0:
        log_p   = np.log(probs + 1e-10)
        log_p  /= temperature
        log_p  -= log_p.max()
        probs   = np.exp(log_p)

    total = probs.sum()
    if total <= 0:                      # 마스킹 후 모두 0 → uniform
        probs = np.ones(N_PITCHES) / N_PITCHES
    else:
        probs /= total

    return int(np.random.choice(N_PITCHES, p=probs))


def generate_pitch_sequence(
    n_notes: int,
    transition_matrix: np.ndarray,
    note_histogram: np.ndarray,
    jo: str | None = None,
    temperature: float = 1.0,
) -> List[int]:
    """n_notes 개의 음고 시퀀스 생성."""
    if n_notes <= 0:
        return []

    # 시작음: 조 스케일 내 히스토그램 확률로 선택
    hist = note_histogram.copy()
    if jo and jo in JO_SCALE:
        scale_pcs = set(JO_SCALE[jo])
        for pc in range(N_PITCHES):
            if pc not in scale_pcs:
                hist[pc] = 0.0
    if hist.sum() <= 0:
        hist = note_histogram.copy()
    hist /= hist.sum()

    current = int(np.random.choice(N_PITCHES, p=hist))
    sequence = [current]

    for _ in range(n_notes - 1):
        current = sample_next_pitch(current, transition_matrix, jo, temperature)
        sequence.append(current)

    return sequence


def save_pitch_model(
    transition_matrix: np.ndarray,
    note_histogram: np.ndarray,
    instrument: str,
    jo: str,
    jangdan: str,
    n_sequences: int,
    output_dir: str,
) -> str:
    os.makedirs(output_dir, exist_ok=True)
    model = {
        "pitch_transition_matrix": transition_matrix,   # (12, 12)
        "note_histogram":          note_histogram,       # (12,)
        "instrument":  instrument,
        "jo":          jo,
        "jangdan":     jangdan,
        "n_sequences": n_sequences,
        "n_pitches":   N_PITCHES,
        "yul_names":   YUL_NAMES,
        "jo_scale":    JO_SCALE,
        "created_at":  datetime.now(timezone.utc).isoformat(),
    }
    fname = f"pitch_{instrument}_{jo}_{jangdan}.pkl"
    path  = os.path.join(output_dir, fname)
    with open(path, "wb") as f:
        pickle.dump(model, f)
    return path


def load_pitch_model(pkl_path: str) -> dict:
    with open(pkl_path, "rb") as f:
        return pickle.load(f)

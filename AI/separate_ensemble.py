from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import List, Optional, Tuple

JO_LIST = ["평조", "계면조"]
JANGDAN_LIST = [
    "중모리",
    "중중모리",
    "자진모리",
    "굿거리",
    "휘모리",
    "엇모리",
    "엇중모리",
    "세마치",
]

WAV_EXTENSIONS = (".wav", ".WAV", ".mp3", ".MP3")

DEFAULT_DATA_DIR = "AI/data"
DEFAULT_TMP_DIR = "AI/tmp_demucs"
DEMUCS_MODEL_DIRNAME = "htdemucs"  # 2-stem 출력도 모델명 폴더 아래에 생성됨


def _check_demucs() -> bool:
    try:
        import demucs  # noqa: F401
    except ImportError:
        print("[ERROR] demucs가 설치되어 있지 않습니다.")
        print("        설치: pip install demucs")
        return False
    return True


def separate_file(wav_path: str, output_dir: str) -> str:
    # demucs --two-stems drums -o output_dir input.wav
    # 출력: output_dir/htdemucs/{파일명}/drums.wav
    os.makedirs(output_dir, exist_ok=True)
    cmd = [
        sys.executable,
        "-m",
        "demucs",
        "--two-stems",
        "drums",
        "-o",
        output_dir,
        wav_path,
    ]
    subprocess.check_call(cmd)

    stem_name = Path(wav_path).stem
    drums_path = Path(output_dir) / DEMUCS_MODEL_DIRNAME / stem_name / "drums.wav"
    if not drums_path.exists():
        # fallback: 모델 폴더 이름이 다를 수 있으므로 전체 탐색
        candidates = list(Path(output_dir).glob(f"*/{stem_name}/drums.wav"))
        if candidates:
            drums_path = candidates[0]
        else:
            raise FileNotFoundError(f"drums.wav not found under {output_dir}")
    return str(drums_path)


def _find_audio_files(folder: str) -> List[str]:
    files: List[str] = []
    for entry in sorted(os.listdir(folder)):
        full = os.path.join(folder, entry)
        if os.path.isfile(full) and entry.endswith(WAV_EXTENSIONS):
            files.append(full)
    return files


def _collect_jobs(
    input_path: str, jo: Optional[str], jangdan: Optional[str]
) -> List[Tuple[str, str, str]]:
    # 반환: (jo, jangdan, wav_path) 목록
    jobs: List[Tuple[str, str, str]] = []
    p = Path(input_path)

    if p.is_file():
        if jo is None or jangdan is None:
            print("[ERROR] 파일 하나를 처리하려면 --jo 와 --jangdan 을 지정하세요.")
            sys.exit(1)
        jobs.append((jo, jangdan, str(p)))
        return jobs

    if not p.is_dir():
        print(f"[ERROR] 입력 경로가 없습니다: {input_path}")
        sys.exit(1)

    if jo is not None and jangdan is not None:
        # 명시된 폴더 전체 처리
        for wav_path in _find_audio_files(str(p)):
            jobs.append((jo, jangdan, wav_path))
        return jobs

    # 자동 추론: input/{조}/{장단}/*.wav
    for jo_dir in sorted(p.iterdir()):
        if not jo_dir.is_dir() or jo_dir.name not in JO_LIST:
            continue
        for jangdan_dir in sorted(jo_dir.iterdir()):
            if not jangdan_dir.is_dir() or jangdan_dir.name not in JANGDAN_LIST:
                continue
            for wav_path in _find_audio_files(str(jangdan_dir)):
                jobs.append((jo_dir.name, jangdan_dir.name, wav_path))
    return jobs


def main() -> None:
    parser = argparse.ArgumentParser(
        description="합주 음원에서 Demucs로 장구(drums) 트랙 분리"
    )
    parser.add_argument(
        "--input",
        required=True,
        help="합주 WAV 파일 또는 디렉토리 (data_ensemble/{조}/{장단}/ 구조면 자동 추론)",
    )
    parser.add_argument("--jo", choices=JO_LIST, help="조 (파일/폴더 직접 지정 시)")
    parser.add_argument(
        "--jangdan", choices=JANGDAN_LIST, help="장단 (파일/폴더 직접 지정 시)"
    )
    parser.add_argument(
        "--data-dir", default=DEFAULT_DATA_DIR, help="분리 결과 저장 루트 (기본 AI/data)"
    )
    parser.add_argument(
        "--tmp-dir", default=DEFAULT_TMP_DIR, help="Demucs 임시 출력 디렉토리"
    )
    args = parser.parse_args()

    if not _check_demucs():
        sys.exit(1)

    jobs = _collect_jobs(args.input, args.jo, args.jangdan)
    if not jobs:
        print("[ERROR] 처리할 음원이 없습니다.")
        sys.exit(1)

    print(
        "[INFO] Demucs 첫 실행 시 htdemucs 모델을 자동 다운로드합니다 (~350MB, "
        "시간이 걸릴 수 있습니다)."
    )
    print(f"[INFO] 총 {len(jobs)}개 음원 처리 시작\n")

    done = 0
    for jo, jangdan, wav_path in jobs:
        src_name = Path(wav_path).stem
        out_name = f"demucs_{src_name}.wav"
        dest_dir = os.path.join(args.data_dir, jo, jangdan)
        os.makedirs(dest_dir, exist_ok=True)
        dest_path = os.path.join(dest_dir, out_name)

        if os.path.exists(dest_path):
            print(f"[SKIP] 이미 존재: {jo}/{jangdan}/{out_name}")
            done += 1
            continue

        try:
            drums_path = separate_file(wav_path, args.tmp_dir)
        except subprocess.CalledProcessError as exc:
            print(f"[WARN] Demucs 실행 실패 ({Path(wav_path).name}): {exc} → SKIP")
            continue
        except FileNotFoundError as exc:
            print(f"[WARN] 분리 결과 없음 ({Path(wav_path).name}): {exc} → SKIP")
            continue

        shutil.copyfile(drums_path, dest_path)
        print(
            f"[OK]   {jo}/{jangdan}: {Path(wav_path).name} → {out_name} (저장 완료)"
        )
        done += 1

    print("\n" + "-" * 60)
    print(f"총 {done}개 분리 완료 → 재학습하려면: python AI/train_markov.py")


if __name__ == "__main__":
    main()

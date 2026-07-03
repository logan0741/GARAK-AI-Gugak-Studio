# -*- coding: utf-8 -*-
"""
국립국악원 국악디지털음원 OpenAPI — 악구(phrase) 다운로더
Endpoint: https://apis.data.go.kr/1371034/phrasedataview2/view

[용도]
  악구 = 장단 단위로 반복되는 연주 구간 (합주 포함).
  리듬(장단) Markov 학습용 WAV 소스로 사용.
  ※ 단음(단일 음) 샘플이 필요하면 extract_notes_from_phrases.py 사용.

[파라미터 주의사항]
  - tranditional_key: API 스펙 자체의 오타. 수정 불가, 그대로 사용.
  - instrument_nm 파라미터는 API 서버가 무시함 → 클라이언트에서 instr_cd 로 필터링.
  - 악기 코드(INSTR_CD_MAP): 대금=PHINST0008, 가야금=PHINST0002 등.

사용법:
  python AI/pipeline/00_ingestion/download_phrase_api.py                        # 전체 혼합 다운로드
  python AI/pipeline/00_ingestion/download_phrase_api.py --jo 계면조            # 특정 조만
  python AI/pipeline/00_ingestion/download_phrase_api.py --jangdan 중모리       # 특정 장단만
  python AI/pipeline/00_ingestion/download_phrase_api.py --instrument 대금      # 대금만
  python AI/pipeline/00_ingestion/download_phrase_api.py --dry-run              # API 응답만 확인
  python AI/pipeline/00_ingestion/download_phrase_api.py --list-fields          # 응답 필드명 확인
"""
from __future__ import annotations

import argparse
import os
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

API_KEY = os.getenv("GUGAK_API_KEY", "")
API_URL = "https://apis.data.go.kr/1371034/phrasedataview2/view"
WAV_TIMEOUT = 30
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")

# API 스펙 오타 그대로 사용 (수정하면 파라미터 무시됨)
TRADKEY_PARAM = "tranditional_key"

# 조 → API traditional_key 값
JO_MAP = {
    "평조":  "평조",
    "계면조": "계면조",
}

# 악기명 → instr_cd (API 서버가 instrument_nm 파라미터를 무시하므로 클라이언트 필터용)
# --list-fields 로 직접 확인한 값 기준
INSTR_CD_MAP: dict[str, str] = {
    "가야금": "PHINST0002",
    "거문고": "PHINST0003",
    "해금":   "PHINST0004",
    "대금":   "PHINST0008",
    "장구":   "PHINST0015",
}

# 다운로드 대상: (조, 장단, 목표파일수)
TARGETS = [
    ("계면조", "중모리",   20),
    ("계면조", "자진모리", 20),
    ("계면조", "굿거리",   20),
    ("계면조", "세마치",   20),
    ("계면조", "중중모리", 20),
    ("계면조", "휘모리",   20),
    ("계면조", "엇모리",   20),
    ("계면조", "진양조",   20),
    ("평조",   "중모리",   15),
    ("평조",   "자진모리", 15),
    ("평조",   "굿거리",   15),
    ("평조",   "세마치",   15),
    ("평조",   "중중모리", 15),
    ("평조",   "휘모리",   15),
    ("평조",   "엇모리",   15),
    ("평조",   "진양조",   15),
]


def _fetch_page(
    rhythm: str,
    tradkey: str | None,
    page: int,
    rows: int = 100,
) -> tuple[list[dict], int]:
    """API 한 페이지 호출 → (item 리스트, 총 개수)"""
    qs = (
        f"serviceKey={API_KEY}"
        f"&pageNo={page}"
        f"&numOfRows={rows}"
        f"&rhythm={requests.utils.quote(rhythm)}"
    )
    if tradkey:
        qs += f"&{TRADKEY_PARAM}={requests.utils.quote(tradkey)}"
    url = f"{API_URL}?{qs}"

    r = requests.get(url, timeout=15)
    r.raise_for_status()

    root = ET.fromstring(r.content)

    result_code = root.findtext(".//resultCode", "")
    if result_code and result_code not in ("00", "0000"):
        result_msg = root.findtext(".//resultMsg", "")
        raise RuntimeError(f"API 에러 [{result_code}]: {result_msg}")

    total = int(root.findtext(".//totalCount", "0"))
    items = [
        {child.tag: (child.text or "").strip() for child in item}
        for item in root.iter("item")
        if item.findtext("wav_file_path", "").strip()
    ]
    return items, total


def _collect_items(
    rhythm: str,
    tradkey: str | None,
    need: int,
    instr_cd: str | None = None,
) -> list[dict]:
    """
    필요한 수만큼 아이템 수집.
    instr_cd 지정 시 클라이언트 사이드 필터링 (API 서버가 악기 파라미터를 무시함).
    tradkey 필터 결과가 부족하면 필터 없이 2차 보완.
    """
    collected: list[dict] = []
    existing_wavs: set[str] = set()
    page = 1
    rows = 100

    while len(collected) < need:
        items, total = _fetch_page(rhythm, tradkey, page, rows)
        for it in items:
            if instr_cd and it.get("instr_cd", "") != instr_cd:
                continue
            wav = it.get("wav_file_path", "")
            if wav and wav not in existing_wavs:
                collected.append(it)
                existing_wavs.add(wav)
        if page * rows >= total or not items:
            break
        page += 1

    # tradkey 필터 결과가 부족하면 tradkey 없이 2차 수집
    if tradkey and len(collected) < need:
        page = 1
        while len(collected) < need:
            items, total = _fetch_page(rhythm, None, page, rows)
            for it in items:
                if instr_cd and it.get("instr_cd", "") != instr_cd:
                    continue
                wav = it.get("wav_file_path", "")
                if wav and wav not in existing_wavs:
                    collected.append(it)
                    existing_wavs.add(wav)
                    if len(collected) >= need:
                        break
            if page * rows >= total or not items:
                break
            page += 1

    return collected[:need]


def _download_wav(wav_url: str, dest: str) -> bool:
    try:
        r = requests.get(wav_url, timeout=WAV_TIMEOUT)
        r.raise_for_status()
        with open(dest, "wb") as f:
            f.write(r.content)
        return True
    except Exception as e:
        print(f"    [WARN] {os.path.basename(dest)}: {e}")
        return False


def list_fields(instrument_nm: str | None = None) -> None:
    """첫 페이지 응답의 모든 필드명과 샘플값 출력 (파라미터 검증용)."""
    jangdan = "중모리"
    try:
        items, total = _fetch_page(jangdan, None, 1, 3, instrument_nm)
    except Exception as e:
        print(f"[ERROR] {e}")
        return
    print(f"totalCount={total}")
    if not items:
        print("항목 없음")
        return
    for i, item in enumerate(items):
        print(f"\n── 항목 {i+1} ──")
        for k, v in sorted(item.items()):
            print(f"  {k}: {v[:80]}")


def run(
    filter_jo: str | None,
    filter_jangdan: str | None,
    dry_run: bool,
    instrument: str | None = None,
) -> None:
    if not API_KEY:
        print("[ERROR] .env에 GUGAK_API_KEY가 없습니다.")
        sys.exit(1)

    instr_cd = INSTR_CD_MAP.get(instrument) if instrument else None
    if instrument:
        if instr_cd:
            print(f"[INFO] 악기 필터: {instrument} (instr_cd={instr_cd})")
        else:
            known = ", ".join(INSTR_CD_MAP.keys())
            print(f"[WARN] '{instrument}' 코드 미등록. 알려진 악기: {known}")
            print("  코드를 직접 확인하려면: python AI/pipeline/00_ingestion/download_phrase_api.py --list-fields")

    targets = [
        (jo, jd, n) for jo, jd, n in TARGETS
        if (not filter_jo or jo == filter_jo)
        and (not filter_jangdan or jd == filter_jangdan)
    ]

    total_saved = 0
    for jo, jangdan, target_n in targets:
        out_dir = (
            os.path.join(OUTPUT_DIR, instrument, jo, jangdan)
            if instrument
            else os.path.join(OUTPUT_DIR, jo, jangdan)
        )
        existing = len(list(Path(out_dir).glob("api_*.wav"))) if os.path.isdir(out_dir) else 0
        need = target_n - existing

        if need <= 0:
            print(f"[SKIP] {jo}/{jangdan}: 이미 {existing}개 보유")
            continue

        tradkey = JO_MAP.get(jo)
        print(f"\n[{jo}/{jangdan}] 목표={target_n}, 보유={existing}, 추가={need}")

        try:
            items = _collect_items(jangdan, tradkey, need, instr_cd)
        except Exception as e:
            print(f"  [ERROR] 조회 실패: {e}")
            continue

        print(f"  수집 항목: {len(items)}개")

        if dry_run:
            for it in items[:5]:
                tkey = it.get("traditional_key", it.get("tranditional_key", "-"))
                ic   = it.get("instr_cd", "-")
                wav  = it.get("wav_file_path", "")[:70]
                print(f"    instr_cd={ic} | tkey={tkey} | {wav}")
            continue

        os.makedirs(out_dir, exist_ok=True)
        saved = 0
        for idx, it in enumerate(items):
            wav_url = it.get("wav_file_path", "")
            if not wav_url:
                continue
            fname = f"api_{jangdan}_{idx:03d}.wav"
            dest  = os.path.join(out_dir, fname)
            if os.path.exists(dest):
                saved += 1
                continue
            if _download_wav(wav_url, dest):
                saved += 1
                print(f"  [OK] {fname}")
                time.sleep(0.2)

        total_saved += saved
        print(f"  -> {saved}개 저장 ({out_dir})")

    if not dry_run:
        print(f"\n총 {total_saved}개 WAV 저장 완료.")
        if total_saved:
            print("다음: python AI/pipeline/02_training/train_markov.py --data-dir AI/data")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="국악원 공공API 악구 WAV 다운로더")
    parser.add_argument("--jo",         help="특정 조만 (평조/계면조)")
    parser.add_argument("--jangdan",    help="특정 장단만 (예: 중모리)")
    parser.add_argument("--instrument", help="악기 필터 (예: 대금, 가야금). 미지정 시 전 악기 혼합")
    parser.add_argument("--dry-run",    action="store_true", help="다운로드 없이 확인만")
    parser.add_argument("--list-fields", action="store_true", help="응답 필드명 출력")
    args = parser.parse_args()

    if not API_KEY:
        print("[ERROR] .env에 GUGAK_API_KEY가 없습니다.")
        sys.exit(1)

    if args.list_fields:
        list_fields(args.instrument)
        return

    run(args.jo, args.jangdan, args.dry_run, args.instrument)


if __name__ == "__main__":
    main()

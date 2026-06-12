# -*- coding: utf-8 -*-
"""
국립국악원 국악디지털음원 OpenAPI 다운로더
Endpoint: https://apis.data.go.kr/1371034/phrasedataview2/view

사용법:
  python AI/download_phrase_api.py                    # 전체 대상 다운로드
  python AI/download_phrase_api.py --jo 계면조        # 특정 조만
  python AI/download_phrase_api.py --jangdan 중모리   # 특정 장단만
  python AI/download_phrase_api.py --dry-run          # API 응답만 확인
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

# traditional_key 쿼리 파라미터명 (API 스펙 오타 그대로 사용)
TRADKEY_PARAM = "tranditional_key"

# 조 → API traditional_key 값
JO_MAP = {
    "평조":  "평조",
    "계면조": "계면조",
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


def _fetch_page(rhythm: str, tradkey: str | None, page: int, rows: int = 100) -> tuple[list[dict], int]:
    """API 한 페이지 호출 → (item 리스트, 총 개수)"""
    # serviceKey는 이중인코딩 방지를 위해 URL에 직접 삽입
    qs = f"serviceKey={API_KEY}&pageNo={page}&numOfRows={rows}&rhythm={requests.utils.quote(rhythm)}"
    if tradkey:
        qs += f"&{TRADKEY_PARAM}={requests.utils.quote(tradkey)}"
    url = f"{API_URL}?{qs}"

    r = requests.get(url, timeout=15)
    r.raise_for_status()

    root = ET.fromstring(r.content)
    total = int(root.findtext(".//totalCount", "0"))
    items = [
        {child.tag: (child.text or "").strip() for child in item}
        for item in root.iter("item")
        if item.findtext("wav_file_path", "").strip()
    ]
    return items, total


def _collect_items(rhythm: str, tradkey: str | None, need: int) -> list[dict]:
    """필요한 수만큼 아이템 수집 (traditional_key 없는 항목은 2차로 보완)."""
    collected: list[dict] = []
    page = 1
    rows = min(need * 2, 100)

    while len(collected) < need:
        items, total = _fetch_page(rhythm, tradkey, page, rows)
        collected.extend(items)
        if page * rows >= total or not items:
            break
        page += 1

    # tradkey 필터 결과가 부족하면 필터 없이 추가 수집
    if tradkey and len(collected) < need:
        extra_need = need - len(collected)
        existing_wavs = {it["wav_file_path"] for it in collected}
        page = 1
        while len(collected) < need:
            items, total = _fetch_page(rhythm, None, page, 100)
            for it in items:
                if it["wav_file_path"] not in existing_wavs:
                    collected.append(it)
                    existing_wavs.add(it["wav_file_path"])
                    if len(collected) >= need:
                        break
            if page * 100 >= total or not items:
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


def run(filter_jo: str | None, filter_jangdan: str | None, dry_run: bool) -> None:
    if not API_KEY:
        print("[ERROR] .env에 GUGAK_API_KEY가 없습니다.")
        sys.exit(1)

    targets = [
        (jo, jd, n) for jo, jd, n in TARGETS
        if (not filter_jo or jo == filter_jo)
        and (not filter_jangdan or jd == filter_jangdan)
    ]

    total_saved = 0
    for jo, jangdan, target_n in targets:
        out_dir = os.path.join(OUTPUT_DIR, jo, jangdan)
        existing = len(list(Path(out_dir).glob("api_*.wav"))) if os.path.isdir(out_dir) else 0
        need = target_n - existing

        if need <= 0:
            print(f"[SKIP] {jo}/{jangdan}: 이미 {existing}개 보유")
            continue

        tradkey = JO_MAP.get(jo)
        print(f"\n[{jo}/{jangdan}] 목표={target_n}, 보유={existing}, 추가={need}")

        try:
            items = _collect_items(jangdan, tradkey, need)
        except Exception as e:
            print(f"  [ERROR] 조회 실패: {e}")
            continue

        print(f"  수집 항목: {len(items)}개")

        if dry_run:
            for it in items[:5]:
                tkey = it.get("traditional_key", "-")
                wav  = it.get("wav_file_path", "")[:70]
                print(f"    tkey={tkey} | {wav}")
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
            print("다음: python AI/train_markov.py --data-dir AI/data")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="국악원 공공API WAV 다운로더")
    parser.add_argument("--jo",       help="특정 조만 (평조/계면조)")
    parser.add_argument("--jangdan",  help="특정 장단만 (예: 중모리)")
    parser.add_argument("--dry-run",  action="store_true", help="다운로드 없이 확인만")
    args = parser.parse_args()
    run(args.jo, args.jangdan, args.dry_run)


if __name__ == "__main__":
    main()

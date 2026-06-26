# TODOS

## T2 — GET /api/sessions/{id} 에서 selectinload 사용 필수
**What:** `session_repo.py`의 세션 조회 쿼리에 `selectinload` eager load 적용
**Why:** `Session.events`를 lazy load하면 PerformanceEvent 수백 개당 쿼리 수백 번. 최소 5 쿼리 → selectinload로 2 쿼리
**How:**
```python
from sqlalchemy.orm import selectinload

stmt = (
    select(Session)
    .where(Session.id == session_id)
    .options(
        selectinload(Session.events),
        selectinload(Session.recordings),
        selectinload(Session.jangdan_recommendations),
    )
)
```
**Blocked by:** session_repo.py 작성 시점

## T4 — ai/ 모듈 비동기 래핑 (블로킹 방지)
**What:** `ai_client.py`에서 동기 ai/ 함수 호출 시 `asyncio.to_thread()` 로 감싸기
**Why:** librosa, DTW, Markov Chain은 CPU-bound 동기 코드. async 이벤트 루프에서 직접 호출 시 전체 서버 블로킹
**How:**
```python
import asyncio
result = await asyncio.to_thread(analyze_key, events)
```
**Blocked by:** 건희 ai/ 모듈 완성 후

## T5 — Alembic occurred_at_ms + CASCADE + SET NULL 마이그레이션
**What:** `alembic revision --autogenerate -m "fix_fk_and_bigint"` 로 모델 변경 한 번에 반영
**Why:** T1(CASCADE) + occurred_at_ms BIGINT + ShareLink SET NULL 세 변경이 모두 마이그레이션 미반영 상태
**Blocked by:** DB 서버 실행 중이어야 함 (T1 대체)

## T3 — ai/ 인터페이스 건희와 확정 (Day 3 마감)
**What:** `analyze_key`, `analyze_jangdan`, `generate_pattern_sequence` 함수 시그니처 합의
**Why:** `ai_client.py`가 stub 상태. 미확정 시 Day 7 AI 실연결 건너뜀 → 발표 당일 stub 데모
**How:** ARCHITECTURE.md "건희와 확정해야 할 항목" 체크리스트 참고
**Blocked by:** 건희 모듈 진행 상황

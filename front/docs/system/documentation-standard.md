# Documentation Standard

이 문서는 GUKAK STUDIO의 AI 친화적 문서화 기준이다.

## Layering

1. System of Record: 에이전트가 반드시 읽는 짧은 기준 문서
2. Harness & Orchestration: 실행 환경, 아키텍처, ADR, 계획, QA
3. Handoffs & Logs: 리뷰, handoff, 실패 기록, 평가 지표
4. Product Narrative: 제안서, 발표, 사용자/시장 검증 문서

## File Rules

- 한 문서에는 하나의 책임만 둔다.
- 문서 제목 아래에 상태, 범위, 관련 문서를 둔다.
- 실행 가능한 문서는 입력, 출력, 명령, 검증 기준을 명시한다.
- 리뷰 문서는 스냅샷이다. 확정 내용은 source-of-truth 문서에 반영한다.
- `TBD`, `TODO`, `나중에`, `임시` 같은 표식은 계획 문서에만 제한적으로 허용하고, 완료 문서에는 남기지 않는다.

## Responsibility Rules

| 내용 | 위치 |
| --- | --- |
| 제품 가치, 사용자, 심사 설득 | `docs/product/` |
| DDD 용어, aggregate, invariant | `docs/domain/` |
| 런타임 경계, ERD, 기술 스택 | `docs/architecture/` |
| 되돌리기 어려운 결정 | `docs/adr/` |
| 실행 가능한 구현 순서 | `docs/plans/` |
| 리뷰 결과 | `docs/reviews/` |
| 실패/중단/handoff 로그 | `docs/logs/` |
| 수동 QA 체크리스트 | `docs/qa/` |

## Promotion Rule

리뷰나 회의에서 나온 문장은 바로 source of truth가 아니다. 다음 조건을 만족할 때만 승격한다.

- 기존 문서의 책임과 맞는다.
- 기존 용어와 충돌하지 않는다.
- 구현자가 읽었을 때 구체적 행동으로 이어진다.
- 검증 기준이나 불변조건이 명확하다.


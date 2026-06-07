# GUKAK STUDIO Documentation Map

이 디렉터리는 에이전트가 읽고 실행할 수 있는 AI 친화적 문서 구조를 따른다. 긴 거대 매뉴얼 대신 각 문서가 하나의 책임을 갖는다.

## 1. System Of Record

| 문서 | 책임 | 언제 읽나 | 수정 기준 |
| --- | --- | --- | --- |
| `../README.md` | 프로젝트 개요와 첫 진입점 | 저장소를 처음 볼 때 | 제품 정체성이나 기본 읽기 순서가 바뀔 때 |
| `../AGENTS.md` | 에이전트 작업 규칙, DDD/문서화 가드레일 | 모든 에이전트 작업 시작 전 | 작업 규칙, 검증 규칙, 읽기 순서가 바뀔 때 |
| `../CONTEXT.md` | 짧은 프로젝트 원칙과 MVP 경계 | 컨텍스트를 빠르게 잡을 때 | 도메인 상세가 아니라 핵심 원칙이 바뀔 때 |
| `domain/README.md` | DDD 도메인 모델, ubiquitous language, aggregate/invariant | 도메인 모델링, 구현 설계, 명명 결정 전 | 새 용어가 확정되거나 관계/불변조건이 바뀔 때 |
| `architecture/tech-stack.md` | MVP 확정 기술 스택 | dependency, 프레임워크, 서버 범위 판단 전 | 기술 채택/보류/제외 결정이 바뀔 때 |
| `system/documentation-standard.md` | AI 친화적 문서화 기준 | 새 문서를 만들거나 내용을 이동할 때 | 문서 책임/승격 규칙이 바뀔 때 |
| `system/conventions.md` | 브랜치, 커밋, 코드 컨벤션 | 브랜치 생성, 커밋, 코드 구현 전 | 팀 컨벤션이 바뀔 때 |

## 2. Harness & Orchestration

| 문서 | 책임 | 언제 읽나 | 수정 기준 |
| --- | --- | --- | --- |
| `architecture/gukak-studio-erd.md` | 저장소 독립 ERD와 직렬화 관계 | 데이터 모델, DB, 세션 저장 설계 전 | 엔티티 관계나 저장 불변조건이 바뀔 때 |
| `architecture/runtime-architecture.md` | 런타임 흐름, 경계, 실패 fallback | 오디오, 제스처, 세션, 장단 추천 작업 전 | 런타임 경계나 데이터 흐름이 바뀔 때 |
| `adr/` | 아키텍처 결정 기록 | 기존 결정의 이유를 확인할 때 | 되돌리기 어려운 기술/구조 결정 발생 시 |
| `plans/implementation/` | 단계별 구현 계획 | 실제 구현을 시작하거나 이어받을 때 | 실행 순서, 파일 경로, 검증 방식이 바뀔 때 |
| `qa/` | 수동 QA와 검증 체크리스트 | 실제 기기/오디오/시각 검증 전 | 통과 기준이나 테스트 장비 조건이 바뀔 때 |

## 3. Handoffs & Logs

| 문서 | 책임 | 언제 읽나 | 수정 기준 |
| --- | --- | --- | --- |
| `reviews/` | CEO/Eng/Garry Tan식 리뷰 결과 스냅샷 | 계획을 수정하거나 리스크를 재검토할 때 | 새 리뷰를 수행했을 때 |
| `logs/` | 실행 중 발생한 오류, handoff, entropy 기록 위치 | 작업이 중단되거나 실패 원인을 남길 때 | 실제 handoff/log가 생길 때 |

## 4. Product & Proposal

| 문서 | 책임 | 언제 읽나 | 수정 기준 |
| --- | --- | --- | --- |
| `product/gukak-studio-proposal.md` | 공모전/제품 제안, 사용자 가치, 검증 계획 | 제품 의도, 발표, 심사 설득 문맥이 필요할 때 | 제품 메시지, 검증 가설, 데모 시나리오가 바뀔 때 |

제안서 안에 아키텍처나 데이터 흐름 설명이 있어도, 구현 판단의 source of truth는 `architecture/`와 `domain/` 문서다. 제안서는 외부 설득용 narrative를 유지한다.

## 작업별 읽기 경로

| 작업 | 먼저 읽을 문서 |
| --- | --- |
| 새 기능 구현 | `CONTEXT.md` → `domain/README.md` → `architecture/runtime-architecture.md` → 구현 계획 |
| 도메인 용어/DDD 정리 | `domain/README.md` → `architecture/gukak-studio-erd.md` |
| dependency 추가 | `architecture/tech-stack.md` → 관련 ADR |
| 브랜치/커밋 작업 | `system/conventions.md` |
| 세션/저장소 설계 | `domain/README.md` → `architecture/gukak-studio-erd.md` |
| 오디오 엔진 작업 | `architecture/tech-stack.md` → `architecture/runtime-architecture.md` → `qa/` |
| 공모전 문서/발표 | `product/gukak-studio-proposal.md` → `reviews/ceo-review.md` |
| 계획 리뷰/수정 | `plans/implementation/` → `reviews/` → `architecture/` |

## 문서 이동 규칙

- 도메인 전문가가 쓰는 말과 불변조건은 `domain/`으로 옮긴다.
- 런타임 경계, 데이터 흐름, 기술 선택은 `architecture/`로 옮긴다.
- 실행 순서, 명령, 파일 생성 내용은 `plans/`로 옮긴다.
- 외부 심사/사용자 설득 문장은 `product/`에 둔다.
- 리뷰에서 나온 결론은 그대로 두지 말고, 확정된 내용만 책임 문서에 반영한다.

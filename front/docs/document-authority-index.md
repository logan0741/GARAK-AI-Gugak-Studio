# 문서 기준 인덱스

상태: 기준 문서
작성일: 2026-06-11
문서 책임: 어떤 질문의 최종 기준이 어느 문서인지 알려주는 루트 인덱스다.

이 문서는 제품 답변을 길게 반복하지 않는다. 질문이 생겼을 때 어느 문서를 고쳐야 하고, 어느 문서를 최종 기준으로 읽어야 하는지만 정한다.

## 기본 규칙

- `README.md`는 외부에 보여줄 서비스 소개와 최소 실행 안내를 담는다. 내부 판단 기준으로 쓰지 않는다.
- `CONTEXT.md`는 에이전트가 작업 시작 전에 읽는 짧은 제품 맥락이다. 상세 기준은 이 인덱스가 가리키는 문서를 따른다.
- `docs/README.md`는 `docs/` 폴더 안내다. 문서 체계의 루트 기준은 이 문서다.
- `reviews/`와 `logs/`는 당시 판단의 기록이다. 새 기준으로 쓰려면 담당 기준 문서에 반영한다.
- `changes/` 하위 문서는 변경 이력이다. 현재 화면 판단은 `current-screen-flow.md`를 따른다.

## 질문별 최종 기준

| 질문 | 최종 기준 문서 | 보조 문서 / 이력 |
| --- | --- | --- |
| 서비스명, 부제, MVP 제품 방향은 무엇인가? | `docs/product/garak-product-brief.md` | `CONTEXT.md`, `docs/product/gukak-studio-proposal.md` |
| 작업 시작 전에 무엇을 먼저 읽어야 하는가? | `AGENTS.md` | `CONTEXT.md` |
| 제품 핵심 원칙과 MVP 경계는 무엇인가? | `CONTEXT.md` | `docs/product/garak-product-brief.md` |
| 화면 목록, CTA, 연결, 데이터 흐름은 무엇인가? | `docs/product/screen-flow/current-screen-flow.md` | `docs/product/screen-flow/changes/` |
| 화면 구성의 정보 위계, 상태, 접근성 기준은 무엇인가? | `docs/product/screen-flow/screen-composition-standards.md` | `docs/reviews/` |
| 화면 변경 이력은 어디에 남기는가? | `docs/product/screen-flow/changes/` | `docs/product/screen-flow/current-screen-flow.md` |
| 도메인 용어, aggregate, invariant는 무엇인가? | `docs/domain/README.md` | `docs/architecture/gukak-studio-erd.md` |
| 세션 저장 구조와 엔티티 관계는 무엇인가? | `docs/architecture/gukak-studio-erd.md` | `docs/domain/README.md` |
| 런타임 경계와 데이터 흐름은 무엇인가? | `docs/architecture/runtime-architecture.md` | `docs/architecture/tech-stack.md` |
| 기술 스택과 dependency 판단은 무엇인가? | `docs/architecture/tech-stack.md` | `docs/adr/` |
| 되돌리기 어려운 기술 결정의 이유는 무엇인가? | `docs/adr/` | `docs/architecture/tech-stack.md` |
| 구현 순서, 파일 경로, 검증 명령은 어디에 있는가? | `docs/plans/implementation/` | `docs/system/conventions.md` |
| 브랜치, 커밋, 코드 작업 컨벤션은 무엇인가? | `docs/system/conventions.md` | `AGENTS.md` |
| 문서를 새로 만들거나 옮길 때의 규칙은 무엇인가? | `docs/system/documentation-standard.md` | 이 문서 |
| 수동 QA와 오디오/기기 검증 기준은 무엇인가? | `docs/qa/` | `docs/architecture/runtime-architecture.md` |
| 과거 리뷰의 판단 근거는 어디에서 확인하는가? | `docs/reviews/` | 담당 기준 문서 |
| 작업 중단, 실패, handoff 기록은 어디에 남기는가? | `docs/logs/` | `docs/system/conventions.md` |

## 현재 제품 기준

현재 서비스의 기준 이름은 `GARAK`이며, 부제는 `AI GUGAK STUDIO`다. 이전 문서에 `GUKAK STUDIO`가 제품명처럼 쓰인 부분은 과거 기획 문맥으로 본다. 현재 화면과 제품 판단은 `GARAK` 기준 문서에 반영한다.

MVP 악기 범위는 가야금, 장구, 대금이다. 현재 코드의 가야금 프로토타입은 기술 검증의 출발점이지 제품 전체 범위를 제한하는 기준이 아니다.

## 변경 반영 순서

1. 제품 방향이 바뀌면 `docs/product/garak-product-brief.md`를 먼저 갱신한다.
2. 화면 구조가 바뀌면 `docs/product/screen-flow/current-screen-flow.md`를 갱신한다.
3. 변경 이유와 이전안 대비 차이는 `docs/product/screen-flow/changes/`에 별도 파일로 남긴다.
4. 도메인 모델이나 저장 구조가 바뀌면 `docs/domain/README.md`와 `docs/architecture/gukak-studio-erd.md`를 함께 확인한다.
5. 기술 선택이 바뀌면 `docs/architecture/tech-stack.md`를 갱신하고, 되돌리기 어려운 결정이면 `docs/adr/`에 남긴다.

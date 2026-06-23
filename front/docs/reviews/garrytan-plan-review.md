# Garry Tan Style Plan Review

대상 문서: `../plans/implementation/2026-06-02-gukak-studio-mvp-light-spec.md`  
작성일: 2026-06-08  
모드: HOLD SCOPE  
결론: FIXED WITH DOCUMENTATION GATES

이 리뷰는 Garry Tan의 plan review 방식에서 핵심 질문을 가져와 적용했다. 10배 확장보다 현재는 scope discipline이 중요하다. MVP의 성패는 더 큰 기능이 아니라, 문서와 도메인 경계가 흐려지지 않은 상태로 30초 가야금 코어 루프를 실행하는 데 있다.

## Review Questions

1. 이 계획은 가장 중요한 사용자 결과를 먼저 검증하는가?
2. 에이전트가 처음 읽어야 할 진실의 원천이 명확한가?
3. 도메인 언어와 구현 파일명이 같은 모델을 가리키는가?
4. 실패했을 때 fallback 경로가 제품 원칙을 지키는가?
5. 구현 계획이 오래된 기술 스택 경로와 충돌하지 않는가?

## Findings

### 1. CRITICAL GAP: 구현 계획이 문서 기준을 먼저 고정하지 않았다

기존 계획은 코드 scaffold부터 시작한다. 하지만 현재 프로젝트는 코드보다 문서와 도메인 모델이 먼저 있는 저장소다. 에이전트가 계획만 읽고 시작하면 `CONTEXT.md`, 도메인 문서, 기술 스택 확정안을 건너뛸 수 있다.

Fix:

- 구현 계획 상단에 mandatory read order를 추가한다.
- `docs/document-authority-index.md`를 문서 기준 인덱스로 둔다.
- `docs/domain/README.md`를 DDD canonical document로 추가한다.

### 2. CRITICAL GAP: 기술 스택 기준 경로가 이동 후에도 예전 위치를 가리켰다

`docs/tech-stack.md` 기준 링크가 문서 구조 재편 이후 `docs/architecture/tech-stack.md`로 바뀌었다.

Fix:

- 구현 계획, ADR, 기술 스택 문서의 상호 링크를 새 경로로 수정한다.

### 3. WARNING: package version 예시가 lockfile보다 강한 결정처럼 보일 수 있다

계획의 `package.json` 예시는 실행에 유용하지만, 시간이 지나면 Expo SDK와 충돌할 수 있다. 기술 스택 문서가 이미 "정확한 semver는 scaffold 시점 lockfile로 고정"한다고 정했으므로 계획에는 그 우선순위를 명확히 해야 한다.

Fix:

- 구현 계획에 `docs/architecture/tech-stack.md`가 package/version 판단을 우선한다고 명시한다.

### 4. WARNING: Day 5 QA가 계획 하단에만 있어 실행 전 기준으로 눈에 띄지 않는다

오디오 엔진 선택은 MVP의 hard gate다. 계획 후반부의 체크리스트 생성 태스크만으로는 구현자가 Day 1부터 latency/voice/bend/mute 기준을 의식하기 어렵다.

Fix:

- 계획 상단에 Day 5 hard gate 요약을 추가한다.
- `docs/qa/README.md`에 QA 책임과 기준을 분리한다.

### 5. OK: 도메인 우선 구현 순서는 유지할 가치가 있다

`PerformanceEvent`, `Session`, `SampleAssetManifest`, `SamplerEngine`를 먼저 만드는 순서는 DDD와 잘 맞는다. 이 계획은 기술 스택이 바뀌어도 core domain을 보호한다.

## Scope Decision

HOLD SCOPE.

추가할 것은 기능이 아니라 문서/도메인/검증 gate다. FastAPI, DB, Google Auth, Claude API, Markov Chain은 계속 MVP 이후로 둔다.

## Changes Applied

- 문서 구조를 system of record, architecture, domain, plans, reviews, logs, qa로 재배치했다.
- 구현 계획의 문서 기준 링크를 새 문서 구조로 고쳤다.
- DDD 도메인 문서를 추가했다.
- 런타임 아키텍처 문서를 추가했다.
- 계획 상단에 문서 읽기 gate와 Day 5 gate를 추가했다.


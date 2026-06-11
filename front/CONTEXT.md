# GUKAK STUDIO Context

이 파일은 에이전트가 작업을 시작할 때 읽는 짧은 프로젝트 컨텍스트다. 상세한 도메인 모델, 기술 스택, ERD, 구현 계획은 `docs/README.md`의 문서 맵을 따른다.

## Product Identity

GUKAK STUDIO는 모바일 국악 악기 시뮬레이터가 먼저이고, 스튜디오 기능은 그 위에 얹히는 확장 레이어다.

MVP의 첫 품질 기준은 12현 가야금의 30초 코어 루프다. 사용자가 한 현을 뜯고, 여러 현을 쓸고, 홀드 드래그로 음을 흔들고, 지음으로 여운을 끊는 경험이 먼저 설득되어야 한다.

## Agent Read Order

1. `AGENTS.md`: 작업 규칙, 언어, 안전 가드레일
2. `docs/README.md`: 문서 구조와 각 문서의 책임
3. `docs/domain/README.md`: DDD 도메인 모델과 ubiquitous language
4. `docs/architecture/tech-stack.md`: 확정 기술 스택
5. 작업 성격에 따라 제안서, ERD, 구현 계획, 리뷰 문서 선택

## Domain Principles

- 가야금은 버튼 배열이 아니라 현 중심 악기 엔진이다.
- Session의 기준 데이터는 오디오 파일이 아니라 `PerformanceEvent` 로그다.
- Recording은 Session에서 파생된 선택 산출물이다.
- 정상 연주 경로는 서버, 외부 AI API, 공공데이터 실시간 호출에 의존하지 않는다.
- 공공데이터는 재생 에셋, 분석 참조, 검증 기준으로 분리한다.
- AI는 MVP에서 오디오 파형을 생성하지 않는다. 사용자의 이벤트 스트림을 분석해 장단 프리셋을 추천한다.
- 장단 추천은 자동 적용하지 않는다. 사용자가 미리듣고 수락해야 한다.

## MVP Boundaries

In scope:

- 12현 가야금 UI와 제스처 맵퍼
- 현별 독립 발음, 잔향 중첩, 글리산도, pitch bend, 지음 release
- `PerformanceEvent` 기반 로컬 Session 저장과 리플레이
- 제한된 장단 프리셋 추천과 로컬 시퀀싱
- 데이터 출처/검증 근거를 보여주는 데모 인스펙터

Out of scope for MVP:

- DAW 수준의 타임라인 편집
- 생성형 오디오 AI 반주
- 계정, 클라우드 저장, 커뮤니티 피드
- 25현 가야금과 타 국악기 확장
- 정간보 편집기
- 실시간 원격 합주

## Terms To Avoid

- "가야금 버튼": `현`, `현 중심 악기 엔진`을 사용한다.
- "AI 반주 생성": MVP에서는 `장단 추천` 또는 `로컬 장단 시퀀싱`을 사용한다.
- "공공데이터 원본 탑재": `공공데이터 기반 에셋`, `분석 참조`, `검증 기준`으로 구분한다.
- "DAW": Studio는 MVP에서 DAW가 아니다.


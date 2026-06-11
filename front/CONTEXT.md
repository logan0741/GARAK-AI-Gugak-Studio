# GARAK Context

이 파일은 에이전트가 작업을 시작할 때 읽는 짧은 프로젝트 컨텍스트다. 어떤 질문의 최종 기준이 어느 문서인지는 `docs/document-authority-index.md`를 따른다.

## Product Identity

정식 서비스명은 `GARAK`이고, 부제는 `AI GUGAK STUDIO`다.

GARAK은 가야금 전용 앱이 아니라 모바일 국악 창작 앱이다. MVP에서 사용자가 직접 다루는 악기는 가야금, 장구, 대금이다.

MVP의 첫 품질 기준은 로그인이나 피드가 아니라 악기를 고르고 바로 연주해 저장 가능한 `Session`을 만드는 경험이다.

## Agent Read Order

1. `AGENTS.md`: 작업 규칙, 언어, 안전 가드레일
2. `docs/document-authority-index.md`: 질문별 최종 기준 문서
3. `docs/product/garak-product-brief.md`: 제품 정체성과 MVP 범위
4. `docs/product/screen-flow/current-screen-flow.md`: 화면 구조, CTA, 데이터 흐름
5. 작업 성격에 따라 도메인, 아키텍처, 구현 계획, QA 문서 선택

## Domain Principles

- 가야금은 버튼 배열이 아니라 현 중심 악기 엔진이다.
- 장구와 대금도 같은 `Session` 안에서 악기별 `PerformanceEvent`를 만든다.
- Session의 기준 데이터는 오디오 파일이 아니라 `PerformanceEvent` 로그다.
- Recording은 Session에서 파생된 선택 산출물이다.
- 정상 연주 경로는 외부 AI API나 공공데이터 사이트의 실시간 호출에 의존하지 않는다.
- 공공데이터는 재생 에셋, 분석 참조, 검증 기준으로 분리한다.
- AI는 MVP에서 오디오 파형을 생성하지 않는다. 사용자의 이벤트 스트림을 분석해 장단 프리셋을 추천한다.
- 장단 추천은 자동 적용하지 않는다. 사용자가 미리듣고 수락해야 한다.
- 로그인은 앱 사용의 선행 조건이 아니다. 보관함 동기화나 계정 저장곡 불러오기가 필요할 때 제안한다.

## MVP Boundaries

In scope:

- 가야금, 장구, 대금 선택이 가능한 홈 허브
- 악기별 자유연주 화면과 입력 모델
- `PerformanceEvent` 기반 로컬 Session 저장과 리플레이
- 제한된 장단 프리셋 추천과 로컬 시퀀싱
- 민요 따라하기와 결과 피드백
- 보관함, 공유 준비, 선택 로그인과 동기화

Out of scope for MVP:

- DAW 수준의 타임라인 편집
- 생성형 오디오 AI 반주
- 필수 로그인, 필수 클라우드 저장, 커뮤니티 피드
- 25현 가야금과 MVP 범위 밖 국악기 확장
- 정간보 편집기
- 실시간 원격 합주
- 공공 음원 사이트를 앱 런타임에서 직접 호출하는 구조
- 모든 화면에 고정되는 전역 하단 탭

## Terms To Avoid

- "가야금 버튼": `현`, `현 중심 악기 엔진`을 사용한다.
- "가야금 앱": `국악 창작 앱`, `가야금/장구/대금 MVP`를 사용한다.
- "AI 반주 생성": MVP에서는 `장단 추천` 또는 `로컬 장단 시퀀싱`을 사용한다.
- "공공데이터 원본 탑재": `공공데이터 기반 에셋`, `분석 참조`, `검증 기준`으로 구분한다.
- "DAW": Studio는 MVP에서 DAW가 아니다.
- "로그인 없이 시작하기 화면": 앱은 기본적으로 게스트 상태로 홈에 진입한다.


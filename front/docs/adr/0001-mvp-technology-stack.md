# ADR 0001: MVP 기술 스택 확정

작성일: 2026-06-08  
상태: Accepted

## Context

GARAK 저장소에는 이미 다음 방향이 문서화되어 있다.

- 제품의 1차 정체성은 국악 악기 시뮬레이터다.
- MVP는 12현 가야금의 30초 코어 루프를 먼저 검증한다.
- 세션의 기준 데이터는 오디오 파일이 아니라 `PerformanceEvent` 로그다.
- 정상 연주 경로는 외부 서버, 공공데이터 API, 생성형 오디오 AI에 의존하지 않는다.
- 장단 추천은 사용자 이벤트를 분석해 로컬 프리셋/시퀀서를 제안하는 보조 계층이다.

첨부 기술 스택은 저지연 오디오와 모바일 인터랙션 방향은 맞지만 FastAPI, MySQL, Google 인증, Claude API, Google 번역 API, Markov Chain 반주 생성, 서버 업로드까지 한 번에 포함하고 있어 현재 MVP 경계보다 넓다.

## Decision

MVP 기술 스택은 다음으로 확정한다.

- 앱: `Expo + React Native + TypeScript`
- UI/입력: `react-native-gesture-handler`, `react-native-reanimated`, `@shopify/react-native-skia`
- 상태: `zustand`
- 다국어: `react-i18next`를 정적 UI 문자열에 한정해 채택 가능
- 오디오 경계: `SamplerEngine` 인터페이스
- 오디오 1순위 구현: `react-native-audio-api`
- 오디오 fallback/비교 후보: `expo-audio`
- 테스트: `vitest` + 실제 기기 오디오 QA
- 데이터: 로컬 `Session` JSON, `SampleAssetManifest`, `DataReferenceManifest`
- AI/장단: 로컬 TypeScript `JangdanMatcher` + `LocalSequencer`

MVP에서는 다음을 구현하지 않는다.

- FastAPI 서버
- SQLAlchemy/MySQL
- Google Sign-In 및 서버 토큰 검증
- Claude API
- Google 번역 API
- Markov Chain 기반 반주 생성
- 서버 파일 업로드 및 공유 링크
- Firestore 또는 Firebase 기반 저장소

`react-native-audio-recorder-player`는 npm registry 기준 deprecated이므로 채택하지 않는다.

## Consequences

- 구현은 순수 TypeScript 도메인 모델과 `SamplerEngine` 경계부터 시작한다.
- `react-native-audio-api`가 Day 5 실제 기기 QA를 통과하지 못해도 도메인, 세션, UI 이벤트 모델은 유지된다.
- 백엔드/DB/인증 없이도 MVP를 실행할 수 있다.
- 공공데이터 활용은 앱 런타임 호출이 아니라 에셋/분석/검증 매니페스트로 관리된다.
- 반주 다양성, 계정 기반 저장, 공유, 텍스트 피드백은 MVP 이후 별도 ADR로 다시 결정한다.

## Source Of Truth

세부 스택과 적용 규칙은 `docs/architecture/tech-stack.md`를 따른다.

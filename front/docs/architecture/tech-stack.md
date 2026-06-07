# GUKAK STUDIO 기술 스택 확정안

작성일: 2026-06-08  
상태: MVP 기준 확정  
적용 범위: 12현 가야금 모바일 MVP, 30초 코어 루프, 로컬 세션, 데모용 장단 추천

이 문서는 GUKAK STUDIO의 기술 스택 소스 오브 트루스다. 기존 제안서, 리뷰, 구현 계획, 외부에서 붙여넣은 기술 스택 설명이 이 문서와 충돌하면 기술 스택 판단은 이 문서를 따른다. 도메인 용어와 제품 불변조건은 `../domain/README.md`와 `../../CONTEXT.md`를 따른다.

문서 책임: dependency, 프레임워크, 서버/DB/API 채택 여부, 기술 보류/제외 판단을 관리한다. 도메인 용어 정의는 `../domain/README.md`에 둔다.

---

## 1. 결론

첨부 기술 스택은 모바일 악기 앱의 방향성, 저지연 오디오, Skia/Reanimated 기반 인터랙션, Zustand, i18n, Python 분석 스택의 장기 확장 가능성은 기존 기획과 대체로 맞다.

다만 현재 MVP 기획과 충돌하는 항목이 있다. FastAPI, MySQL, Google 로그인, Claude API, Google 번역 API, Markov Chain 반주 생성, 서버 업로드, 공유 링크, Firestore 기반 저장 흐름은 현재 MVP 범위가 아니다. MVP는 네트워크 없는 로컬 악기 경험과 이벤트 중심 세션 모델을 먼저 검증한다.

따라서 확정 방향은 다음과 같다.

- MVP는 `Expo + React Native + TypeScript` 기반의 로컬 우선 모바일 앱으로 만든다.
- 정상 연주 경로는 서버, DB, 외부 AI API, 공공데이터 실시간 호출에 의존하지 않는다.
- 오디오 실행은 `SamplerEngine` 인터페이스 뒤에 격리한다.
- `react-native-audio-api`를 저지연 샘플러의 1순위 구현 대상으로 둔다.
- `expo-audio`는 단순 녹음/재생 fallback 또는 비교 후보로 둔다.
- `react-native-audio-recorder-player`는 npm 기준 deprecated이므로 채택하지 않는다.
- 장단 추천은 MVP에서 로컬 TypeScript 규칙 엔진으로 처리한다.
- Python/FastAPI/DB/Claude/Google 인증/번역은 MVP 이후 확장 스택으로 보류한다.

---

## 2. 기존 기획과 첨부 스택 대조

| 영역 | 첨부 스택 | 기존 기획 | 확정 판단 |
| --- | --- | --- | --- |
| 앱 프레임워크 | React Native 전제 | Expo + React Native + TypeScript | 일치. Expo dev build 기반으로 확정 |
| 오디오 재생 | `react-native-audio-api` | `SamplerEngine` 뒤에서 `react-native-audio-api`/`expo-audio` 비교 | 방향 일치. `react-native-audio-api`를 1순위로 확정하되 Day 5 기기 QA 통과 필요 |
| 녹음 | `react-native-audio-recorder-player` | 녹음은 선택적이며 이벤트 세션이 기준 데이터 | 불일치. 해당 패키지는 deprecated라 제외. `react-native-audio-api` 또는 `expo-audio`로 검증 |
| 시각 렌더링 | `react-native-skia` | 명시 스택은 없지만 현 중심 UI 필요 | 패키지명은 `@shopify/react-native-skia`로 보정해 채택 |
| 애니메이션 | `react-native-reanimated` | 구현 계획 dependency에 포함 | 일치. 채택 |
| 상태 관리 | Zustand | 구현 계획에는 미명시 | 채택. 단, 도메인 모델의 원천은 `Session`/`PerformanceEvent` |
| i18n | `react-i18next` + Google 번역 API | 기존 MVP에는 미명시 | `react-i18next`는 채택 가능. Google 번역 API는 보류 |
| 인증 | Google Sign-In SDK + 서버 검증 | MVP ERD에서 `User/AuthProvider` 제외 | MVP 제외. 이후 계정 기능 시 재검토 |
| 백엔드 | FastAPI | 기존 MVP는 로컬 우선, 서버 없음 | MVP 제외. 이후 공유/계정/분석 서버가 필요할 때 채택 후보 |
| DB | SQLAlchemy + MySQL | ERD는 저장소 독립 모델, MVP 로컬 JSON 가능 | MVP 제외. MySQL은 확장 후보일 뿐 현재 확정 아님 |
| AI 반주 | Markov Chain + `.pkl` | MVP는 생성형 오디오/서버 반주가 아니라 로컬 장단 추천/시퀀싱 | MVP 불일치. Markov Chain은 R&D/Phase 2로 보류 |
| 조/장단 분석 | 코사인 유사도, DTW, librosa | MVP는 BPM/밀도 기반 장단 추천 | DTW/코사인/librosa는 이후 고도화 후보. MVP는 로컬 규칙 기반 |
| AI 텍스트 | Claude API | MVP 핵심 아님 | 보류. 데모 문구/피드백 기능이 필요할 때만 서버 기능으로 검토 |
| 데이터 저장 흐름 | 서버 업로드, Firestore 언급 | 로컬 세션 우선, 클라우드 제외 | Firestore 언급은 폐기. DB/클라우드 저장은 MVP 이후 |

---

## 3. MVP 확정 스택

### 3.1 모바일 런타임

| 목적 | 확정 기술 | 적용 규칙 |
| --- | --- | --- |
| 앱 프레임워크 | `Expo`, `React Native`, `TypeScript` | Expo Go가 아니라 native audio 검증 가능한 Expo dev build를 기준으로 한다. |
| 라우팅 | `expo-router` | 화면이 늘어나는 시점부터 사용한다. 초기 단일 화면도 동일 진입점을 따른다. |
| 제스처 | `react-native-gesture-handler` | raw gesture는 도메인에 직접 저장하지 않고 `GestureMapper`를 거친다. |
| 애니메이션 | `react-native-reanimated` | 현 진동, 지음 감쇠, 가이드 하이라이트 같은 UI 반응에 사용한다. |
| 그래픽 | `@shopify/react-native-skia` | 12현 악기 캔버스, 세밀한 터치 영역, 현 진동 표현에 사용한다. 일반 앱 레이아웃은 기본 React Native 컴포넌트를 쓴다. |
| 상태 관리 | `zustand` | 현재 세션, 선택 악기, 장단 추천 후보, UI 인스펙터 상태를 관리한다. 영속 데이터의 기준은 `Session` 직렬화 모델이다. |
| 정적 다국어 | `react-i18next` | 한국어/영어 UI 문자열이 실제로 필요해지는 시점에 도입한다. 국악 용어는 수동 번역 JSON으로 관리한다. |

### 3.2 오디오

| 목적 | 확정 기술 | 적용 규칙 |
| --- | --- | --- |
| 오디오 경계 | `SamplerEngine` 인터페이스 | UI, 세션, 장단 분석은 실제 오디오 라이브러리를 직접 호출하지 않는다. |
| 저지연 샘플 재생 | `react-native-audio-api` 1순위 | `AudioBuffer`를 사전 로드하고, 발음 시 source node를 새로 만들어 같은 buffer를 재사용하는 구조를 우선 검증한다. |
| 볼륨/믹싱 | `react-native-audio-api` | `GainNode` 등 노드 그래프 기반 믹싱을 `SamplerEngine` 구현 내부에 숨긴다. |
| 녹음 | `react-native-audio-api` `AudioRecorder` 1순위, `expo-audio` fallback | 녹음은 선택 기능이다. 실패해도 `PerformanceEvent[]` 세션 저장은 유지되어야 한다. |
| fallback 재생/녹음 | `expo-audio` | 단순 파일 재생/녹음 검증용 또는 `react-native-audio-api` 실패 시 비교 후보로 유지한다. |
| 제외 | `react-native-audio-recorder-player` | npm registry 기준 deprecated이므로 새 프로젝트 dependency로 채택하지 않는다. |

오디오 엔진의 라이브러리명은 확정하되, 최종 사용 여부는 Day 5 실제 기기 QA 기준을 통과해야 한다. 통과 기준은 터치-발음 지연 50ms 이하, 8보이스 이상 동시 발음, 끊김 없는 pitch bend, 글리산도 누락 없음, 지음 release 감쇠, 10초 이상 녹음 또는 이벤트 리플레이 fallback이다.

### 3.3 도메인/데이터 모델

| 목적 | 확정 기술/형태 | 적용 규칙 |
| --- | --- | --- |
| 도메인 언어 | TypeScript type/module | `PerformanceEvent`, `Session`, `Recording`, `SampleAssetManifest`, `DataReferenceManifest`를 코드의 핵심 계약으로 둔다. |
| 세션 저장 | 로컬 직렬화 JSON | MVP에서는 클라우드 동기화 없이 로컬 세션으로 충분하다. 오디오 파일보다 이벤트 로그가 기준 데이터다. |
| 재생 에셋 | `SampleAssetManifest` + 로컬 오디오 파일 | 정상 연주 중 외부 API 또는 파일 I/O에 의존하지 않도록 악기 화면 진입 전에 preload한다. |
| 분석/검증 참조 | `DataReferenceManifest` | 공공데이터, AI Hub, 검증 기준은 재생 에셋과 분리한다. |
| 장단 추천 | 로컬 TypeScript `JangdanMatcher` | MVP는 BPM, 터치 밀도, 박자 안정성 기반의 설명 가능한 규칙 엔진으로 시작한다. |
| 장단 재생 | `LocalSequencer` | 추천된 `JangdanPreset`은 사용자가 미리듣고 수락한 뒤 로컬 샘플로 재생한다. |

### 3.4 테스트/검증

| 목적 | 확정 기술/방식 | 적용 규칙 |
| --- | --- | --- |
| 순수 도메인 테스트 | `vitest` | gesture mapping, event model, session serialization, jangdan matcher를 기기 없이 검증한다. |
| 타입 안정성 | TypeScript strict mode | 도메인 모델은 strict TypeScript를 기준으로 작성한다. |
| 오디오 QA | 실제 Android/iOS 기기 수동 체크리스트 | 에뮬레이터는 오디오 지연 판정에 사용하지 않는다. |
| 시각 QA | 실제 기기/화면 캡처 | 현 터치 영역, 라벨, 인스펙터가 겹치지 않는지 확인한다. |

---

## 4. MVP 이후 보류 스택

아래 항목은 폐기하지 않는다. 다만 30초 가야금 코어 루프 검증 전에는 구현하지 않는다.

| 항목 | 보류 기술 | 보류 사유 | 재검토 시점 |
| --- | --- | --- | --- |
| 백엔드 API | FastAPI | 현재 MVP 정상 경로에 서버가 필요 없다. | 공유 링크, 계정, 서버 분석이 실제 요구될 때 |
| DB | SQLAlchemy + MySQL | MVP ERD는 저장소 독립 모델이며 로컬 JSON으로 충분하다. | 다중 사용자/클라우드 세션 저장 시작 시 |
| 인증 | Google Sign-In SDK + `google-auth` | MVP에서 `User`/`AuthProvider` 엔티티를 제외했다. | 계정 기반 라이브러리/공유 기능 시작 시 |
| AI 텍스트 | Claude API | 악기 코어 품질과 독립적인 부가 기능이다. | 완주 피드백 화면이 MVP 통과 이후 필요할 때 |
| 동적 번역 | Google 번역 API | 국악 용어 오역 리스크가 있고 MVP에는 정적 UI 번역이면 충분하다. | 사용자 생성/AI 생성 텍스트를 다국어로 제공할 때 |
| 고급 음악 분석 | Python, librosa, numpy, scikit-learn-extra, dtaidistance | MVP는 이벤트 기반 장단 추천으로 충분하다. | 실제 음원/연주 분석 고도화 단계 |
| Markov Chain 반주 | Python 학습 파이프라인 + `.pkl` | 기존 기획의 "AI는 오디오 파형을 직접 만들지 않는다" 원칙과 MVP 범위에 비해 과하다. | 로컬 장단 프리셋 MVP가 통과하고, 반주 다양성 문제가 명확해질 때 |
| 서버 파일 업로드 | FastAPI static/audio, object storage | MVP 기준 데이터는 `Session` 이벤트 로그다. | 외부 공유/내보내기 기능이 제품 요구로 확정될 때 |

---

## 5. 명시적으로 제외하거나 정정한 항목

- `react-native-skia`라는 패키지명은 `@shopify/react-native-skia`로 정정한다.
- `react-native-audio-recorder-player`는 npm registry에서 deprecated로 표시되어 있어 신규 dependency로 쓰지 않는다.
- Firestore는 현재 확정 스택이 아니다. 첨부 텍스트의 Firestore 언급은 SQLAlchemy/MySQL 설명과도 충돌하므로 폐기한다.
- MVP에서는 `FastAPI /docs`와 프로젝트 문서의 `/docs`를 혼동하지 않는다. 현재 `/docs`는 저장소 문서 폴더다.
- `Claude API`는 반주 생성에 관여하지 않는다. 이후 도입하더라도 사용자 설명/피드백 텍스트 생성 용도에 한정한다.
- 공공데이터 API는 앱 런타임 정상 연주 경로에서 호출하지 않는다.

---

## 6. 버전 관리 원칙

문서에는 패키지명을 확정하고, 정확한 semver는 프로젝트 scaffold 시점의 lockfile로 고정한다.

2026-06-08 확인 스냅샷:

| 패키지 | 확인 버전 | 메모 |
| --- | --- | --- |
| `react-native-audio-api` | `0.12.2` | Web Audio API 유사 구조, Expo plugin 제공 |
| `expo-audio` | `56.0.11` | Expo 공식 playback/recording 라이브러리 |
| `@shopify/react-native-skia` | `2.6.4` | React Native 그래픽스 |
| `react-native-reanimated` | `4.4.1` | UI thread 애니메이션 |
| `zustand` | `5.0.14` | React 상태 관리 |
| `react-i18next` | `17.0.8` | 정적 UI 다국어 |
| `react-native-audio-recorder-player` | `4.5.0` | deprecated. 사용하지 않음 |

Expo 패키지는 `npx expo install <package>`로 설치해 현재 Expo SDK와 맞춘다. 비 Expo 패키지는 lockfile 생성 뒤 임의 업그레이드하지 않는다.

---

## 7. 구현 적용 규칙

1. 먼저 순수 TypeScript 도메인 모듈을 만든다.
2. `PerformanceEvent`, `Session`, `SampleAssetManifest`, `SamplerEngine` 경계를 먼저 고정한다.
3. UI는 gesture를 직접 저장하지 않고 `GestureMapper`로 정규화한다.
4. 오디오 라이브러리는 `SamplerEngine` 구현체 내부에서만 import한다.
5. 첫 오디오 구현은 `react-native-audio-api`로 시도한다.
6. 녹음 실패는 제품 실패가 아니다. 이벤트 세션 리플레이가 fallback이다.
7. 서버, DB, 인증, 외부 AI API는 MVP 코드에 넣지 않는다.
8. 장단 추천은 자동 적용하지 않는다. 추천, 미리듣기, 수락 흐름을 지킨다.
9. 공공데이터 원본은 재생 에셋, 분석 참조, 검증 기준으로 분리한다.
10. 구현 계획 문서의 예시 버전이 이 문서와 충돌하면 이 문서를 따른다.

---

## 8. 참고 기준

- 기존 기획 기준: `CONTEXT.md`, `docs/product/gukak-studio-proposal.md`, `docs/domain/README.md`, `docs/architecture/gukak-studio-erd.md`
- 구현 계획 기준: `docs/plans/implementation/2026-06-02-gukak-studio-mvp-light-spec.md`
- 외부 공식 문서:
  - React Native Audio API: https://docs.swmansion.com/react-native-audio-api/
  - Expo Audio: https://docs.expo.dev/versions/latest/sdk/audio/
  - React Native Skia: https://shopify.github.io/react-native-skia/docs/getting-started/installation/

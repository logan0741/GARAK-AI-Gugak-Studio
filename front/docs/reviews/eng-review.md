# GUKAK STUDIO Eng Review

대상 문서: `docs/product/gukak-studio-proposal.md`  
작성일: 2026-06-02  
리뷰 관점: 3주 모바일 프로토타입 구현 가능성, 아키텍처, 테스트/검증, 실패 모드

## 핵심 판정

**SCOPE_REDUCED**

현재 기획서는 방향이 맞다. 특히 `30초 가야금 코어 루프`, 공공데이터의 `에셋/분석/검증 레이어 분리`, `Day 5 오디오 엔진 통과 기준`은 구현팀이 붙잡을 수 있는 좋은 기준이다.

다만 3주 프로토타입 기준으로는 스튜디오 확장 기능을 제품 기능처럼 완성하려 하면 위험하다. MVP는 **가야금 12현 로컬 샘플러 + 터치 제스처 + 단일 세션 이벤트 기록 + 데모용 장단 프리셋**까지만 확정하고, 녹음/데이터 증명/장단 추천은 코어 루프가 Day 5 기준을 통과한 뒤 붙이는 데모 레이어로 제한해야 한다.

## 주요 Findings

1. **[P1] (confidence: 8/10) `docs/product/gukak-studio-proposal.md:44` — 오디오 데이터 플로우가 아직 문서화되지 않아 Day 5 통과 기준을 구현 구조로 검증하기 어렵다.**  
   현재는 사용자 경험과 통과 기준은 명확하지만, 터치 입력이 어떤 이벤트로 바뀌고, 어떤 샘플러 상태를 거쳐, 어떤 오디오 노드/플레이어로 출력되는지 빠져 있다. 이 빈틈이 있으면 `expo-audio`와 `react-native-audio-api` 비교가 기능 목록 비교로 흐르고, 실제 레이턴시/동시 보이스/피치 변경 검증이 늦어진다.

2. **[P1] (confidence: 8/10) `docs/product/gukak-studio-proposal.md:224` — 샘플러와 세션 데이터 모델이 없어서 녹음, 장단 추천, 데이터 증명 UI가 서로 다른 이벤트 해석을 만들 가능성이 높다.**  
   3주 안에 제일 피해야 할 것은 오디오 엔진, UI, 장단 분석, 녹음이 각자 이벤트 포맷을 갖는 것이다. 하나의 `PerformanceEvent` 스트림을 코어 루프 재생, 세션 리플레이, BPM/밀도 추정, 데모 인스펙터가 같이 써야 한다.

3. **[P1] (confidence: 7/10) `docs/product/gukak-studio-proposal.md:213` — Day 5가 “엔진 선택” 기준은 되지만 실패 시 fallback 의사결정이 부족하다.**  
   오디오 후보가 피치 벤드, 8보이스, 녹음 캡처를 동시에 만족하지 못할 가능성이 있다. Day 5에 실패하면 Week 2로 그대로 넘어가면 안 된다. `Week 3 확장 제거`, `녹음 대신 이벤트 리플레이`, `실시간 bend 축소`, `엔진 조합` 같은 fallback이 문서에 박혀 있어야 한다.

4. **[P2] (confidence: 7/10) `docs/product/gukak-studio-proposal.md:197` — 테스트/검증 계획이 데모 리허설 중심이고 자동화 가능한 검증 단위가 부족하다.**  
   현재 저장소에는 코드, 패키지 설정, 테스트 프레임워크가 없다. 구현 시작 시 최소한 이벤트 리듀서, BPM/밀도 분류, 세션 직렬화, 샘플 매니페스트 검증은 단위 테스트로 잡아야 한다. 오디오 품질은 자동화가 어렵더라도 기기 QA 체크리스트와 로그 기준이 필요하다.

5. **[P2] (confidence: 7/10) `docs/product/gukak-studio-proposal.md:236` — 3주차 “스튜디오 확장 데모”가 MVP 기능으로 오해될 수 있다.**  
   3주차는 단일 녹음 트랙, 장구 프리셋 시퀀싱, 데이터 출처 표시를 보여주는 데모 레이어여야 한다. 멀티트랙 편집, 공유, 커뮤니티, 고급 믹싱은 MVP 외부로 명시해야 코어 루프 품질을 보호할 수 있다.

## What already exists

- `30초 가야금 코어 루프`: 이미 문서의 가장 강한 기준이다. 구현팀은 이 루프를 기능 우선순위와 테스트 우선순위의 최상단으로 유지해야 한다.
- `공공데이터 활용 구조`: 에셋, 분석, UX, 검증 레이어 분리가 이미 있다. 신규 데이터 아키텍처는 이 구조를 재사용하고, 원본 데이터 직접 탑재에 의존하지 않아야 한다.
- `Day 5 엔진 픽스 통과 기준`: 레이턴시, polyphony, pitch bend, glissando, mute, 녹음 가능성 기준이 이미 있다. 보강안은 이 기준을 측정 가능한 플로우와 fallback 결정으로 연결한다.
- `AI/장단 반주 MVP`: 생성형 오디오가 아니라 BPM/밀도 기반 로컬 시퀀싱으로 좁혀져 있다. 이 방향은 3주 프로토타입에 적합하다.
- 구현 코드, 패키지 설정, 테스트 설정은 현재 저장소에 없다. 따라서 이 리뷰는 코드 수정이 아니라 구현 전 설계 보강안이다.

## NOT in MVP scope

- 생성형 오디오 AI 반주: 레이턴시, 음질, 권리, 비용 리스크가 커서 3주 프로토타입에는 부적합하다.
- DAW급 편집/믹싱: 멀티트랙 타임라인, 믹서, 이펙트 체인은 30초 악기다움 검증을 방해한다.
- 클라우드 저장, 공유, 커뮤니티 피드: 네트워크와 계정/권한 범위가 생겨 오디오 코어 검증과 독립적이지 않다.
- 25현 가야금 및 타 국악기 확장: 12현 가야금 샘플러와 제스처 검증 이후 확장해야 한다.
- 정간보 편집기와 정규 교육 커리큘럼: 제품 포지션상 MVP의 핵심 가치가 아니다.
- 공공데이터 원본 음원 대량 내장: 권리와 품질 검증이 끝난 샘플만 에셋화하고, 나머지는 분석/검증 참조로 둔다.
- 실시간 멀티플레이어 합주: 오디오 레이턴시와 네트워크 동기화가 새 문제를 만든다.

## 문서에 추가할 섹션 초안: 오디오/데이터 플로우 아키텍처

권장 위치: `5. 공공데이터 활용 구조` 뒤 또는 `10. 3주 프로토타입 로드맵` 앞.

````markdown
## 오디오/데이터 플로우 아키텍처

MVP의 연주 경로는 네트워크를 타지 않는 로컬 경로로 고정한다. 공공데이터 API와 분석 데이터는 앱 실행 중 실시간 호출 대상이 아니라, 개발 단계에서 샘플 매니페스트와 검증 기준을 만드는 입력으로 사용한다.

### 런타임 플로우

```text
Public/own source data
        |
        v
Asset preprocessing
  - rights check
  - mono/stereo decision
  - trim/normalize
  - loop/release metadata
        |
        v
SampleAssetManifest.json  +  local audio files
        |
        v
App startup preload
        |
        +------------------------------+
        |                              |
        v                              v
Touch input                    Data inspector
  tap/swipe/hold                 source/license/quality
        |
        v
Gesture interpreter
        |
        v
PerformanceEvent stream
        |
        +------------------+--------------------+
        |                  |                    |
        v                  v                    v
Voice scheduler      Session recorder     Jangdan analyzer
        |                  |                    |
        v                  v                    v
Sampler engine       Session JSON         Local jangdan preset
        |                                       |
        +------------------+--------------------+
                           v
                    Audio output
```

### 원칙

- 연주 중 오디오 출력은 로컬 샘플 파일과 로컬 시퀀서만 사용한다.
- 공공데이터 API 실패는 연주 실패로 이어지면 안 된다.
- 터치 입력은 먼저 `PerformanceEvent`로 정규화한 뒤 오디오, 녹음, 장단 분석, 인스펙터가 같은 이벤트를 읽는다.
- Day 5 이후 선택된 오디오 엔진은 `SamplerEngine` 인터페이스 뒤에 둔다. UI와 세션 저장 로직은 특정 오디오 라이브러리에 직접 의존하지 않는다.
- 오디오 엔진 후보 비교는 기능 존재 여부가 아니라 같은 이벤트 스트림을 넣었을 때의 지연, 동시 보이스, 피치 변화, mute 품질로 측정한다.
````

## 문서에 추가할 섹션 초안: 샘플러 및 세션 데이터 모델

권장 위치: `오디오/데이터 플로우 아키텍처` 바로 뒤.

````markdown
## 샘플러 및 세션 데이터 모델

MVP는 하나의 이벤트 모델을 중심으로 구성한다. 같은 `PerformanceEvent` 스트림이 실시간 재생, 세션 녹음, 장단 추천, 데모 인스펙터의 공통 입력이어야 한다.

### 핵심 모델

```ts
type SourceLayer = 'public_asset' | 'own_asset' | 'analysis_reference' | 'validation_reference';

type SampleAsset = {
  id: string;
  instrument: 'gayageum_12';
  stringIndex: number;
  pitchName: string;
  pitchHz: number;
  fileUri: string;
  sourceLayer: SourceLayer;
  sourceName: string;
  licenseNote: string;
  quality: {
    normalized: boolean;
    hasCleanAttack: boolean;
    hasNaturalDecay: boolean;
    noiseRisk: 'low' | 'medium' | 'high';
  };
  envelope: {
    attackMs: number;
    releaseMs: number;
    naturalDecayMs: number;
  };
};

type StringSpec = {
  index: number;
  openPitchName: string;
  openPitchHz: number;
  sampleAssetId: string;
  touchRegion: { x: number; y: number; width: number; height: number };
};

type PerformanceEvent =
  | { type: 'string_pluck'; tsMs: number; pointerId: string; stringIndex: number; velocity: number }
  | { type: 'string_bend'; tsMs: number; pointerId: string; stringIndex: number; cents: number }
  | { type: 'string_mute'; tsMs: number; pointerId: string; stringIndex: number; strength: number }
  | { type: 'glissando_step'; tsMs: number; pointerId: string; stringIndex: number; velocity: number }
  | { type: 'string_release'; tsMs: number; pointerId: string; stringIndex: number };

type VoiceState = {
  voiceId: string;
  stringIndex: number;
  sampleAssetId: string;
  startedAtMs: number;
  pitchBendCents: number;
  gain: number;
  envelopeState: 'attack' | 'sustain' | 'release' | 'ended';
};

type Session = {
  id: string;
  createdAt: string;
  assetManifestVersion: string;
  durationMs: number;
  events: PerformanceEvent[];
  bpmEstimate?: number;
  densityEstimate?: 'low' | 'medium' | 'high';
  jangdanRecommendation?: 'jungmori' | 'gutgeori' | 'jajinmori';
};
```

### MVP 저장 원칙

- 실시간 연주 중에는 `VoiceState`를 메모리에서 관리한다.
- 세션 녹음은 먼저 `PerformanceEvent[]`를 저장한다. 오디오 파일 캡처는 가능하면 붙이되, 실패해도 이벤트 리플레이는 남아야 한다.
- 장단 추천은 오디오 분석이 아니라 이벤트 간격과 밀도에서 계산한다.
- 데이터 증명 UI는 세션 이벤트와 `SampleAssetManifest`를 읽어 어떤 에셋/분석 기준이 사용됐는지 보여준다.
- MVP에서는 클라우드 동기화 없이 로컬 JSON 세션으로 충분하다.
````

## 문서에 추가할 섹션 초안: 실패 모드 및 fallback

권장 위치: `8. 리스크 관리` 안에 `데이터 수급 리스크` 다음.

````markdown
## 실패 모드 및 fallback

MVP는 오디오 품질 실패가 전체 데모 실패로 번지지 않도록 Day 5에 명시적인 fallback 결정을 내린다.

| 실패 모드 | 감지 기준 | fallback | MVP 판정 |
| --- | --- | --- | --- |
| 공공 음원이 단음 샘플로 부적합 | 어택이 겹치거나 잔향/합주가 분리되지 않음 | 자체 보완 샘플을 재생 에셋으로 사용하고 공공데이터는 분석/검증 참조로 유지 | 진행 |
| 오디오 엔진 A가 8보이스 또는 pitch bend를 통과하지 못함 | Day 5 기준에서 끊김, 클릭 노이즈, 50ms 초과 발생 | 엔진 B로 전환하거나, 재생 엔진과 녹음 엔진을 분리 | 진행 가능 |
| 어떤 엔진도 30초 코어 루프를 통과하지 못함 | 탭, 글리산도, bend, mute 중 2개 이상 핵심 제스처 실패 | Week 3 확장 전부 중단. 1주 추가 스파이크 또는 MVP no-go 판정 | 중단 |
| 샘플 preload가 느리거나 메모리 사용량이 높음 | 앱 시작 지연, 중간 로딩, 재생 시 파일 로드 발생 | 12현 필수 샘플만 preload, 고급 변형 샘플 제외, mono/압축 샘플 사용 | 진행 |
| 녹음 권한 거부 또는 캡처 실패 | 마이크 권한 없음, 네이티브 캡처 실패, 파일 저장 실패 | 오디오 파일 대신 이벤트 세션 저장 및 리플레이 제공 | 진행 |
| Bluetooth/헤드폰 연결 해제 | 출력 장치 변경 후 오디오 중단 또는 지연 급증 | 연주 일시정지, 사용자에게 출력 장치 변경 안내, 세션 이벤트는 계속 보존 | 진행 |
| 장단 추천이 부정확함 | BPM/밀도 추정이 데모 입력과 맞지 않음 | 추천을 자동 확정하지 않고 상위 1개 프리셋을 “데모 추천”으로 표시 | 진행 |
| 데이터 API 또는 외부 출처 접근 실패 | 개발/발표 중 네트워크 불가 | 앱에는 사전 생성된 매니페스트와 출처 메타데이터를 포함 | 진행 |

### Day 5 의사결정

- `PASS`: 30초 코어 루프 기준을 모두 통과하면 Week 2 구현으로 이동한다.
- `PASS_WITH_LIMITS`: 녹음 또는 장단 추천만 불안정하면 Week 2는 진행하되 Week 3 확장을 데모-only로 축소한다.
- `FAIL`: 탭 발음, 8보이스, bend, mute 중 핵심 항목이 실패하면 Week 3 범위는 시작하지 않는다.
````

## 테스트 및 검증 보강안

현재 저장소에는 테스트 프레임워크가 없다. 구현 시작 시 다음 검증 단위를 먼저 잡는 것이 맞다.

```text
CODE PATHS / MODEL PATHS                       USER FLOWS
[GAP] Gesture interpreter                       [GAP] 0~30초 첫 연주 루프
  ├── tap -> string_pluck                         ├── 한 현 탭 후 자연 감쇠
  ├── swipe -> glissando_step                     ├── 여러 현 스와이프 후 8보이스 유지
  ├── hold drag -> string_bend                    ├── 홀드 드래그 중 클릭 노이즈 없음
  └── long press/two finger -> string_mute        └── 지음 후 자연스러운 release

[GAP] Session/event model                       [GAP] 세션 녹음 fallback
  ├── event serialization                         ├── 오디오 캡처 성공 시 파일 + 이벤트 저장
  ├── event replay                                └── 캡처 실패 시 이벤트 리플레이 저장
  └── corrupt/missing asset handling

[GAP] Jangdan analyzer                          [GAP] 장단 추천 데모
  ├── BPM estimate                                ├── 낮은 BPM -> 중모리
  ├── density estimate                            ├── 중간 BPM -> 굿거리
  └── unknown input fallback                      └── 높은 BPM -> 자진모리
```

권장 테스트:

- 단위 테스트: `PerformanceEvent` 생성/정규화, bend cents clamp, glissando 현 매핑, mute strength 매핑.
- 단위 테스트: 세션 JSON 직렬화/역직렬화, asset manifest 누락 시 fallback.
- 단위 테스트: BPM/밀도 기반 장단 추천 규칙.
- 기기 QA: Android/iOS dev build에서 50ms 이하 체감 지연, 8보이스 스와이프, bend 클릭 노이즈, mute release, 10초 세션 저장.
- 실패 모드 QA: 샘플 파일 누락, 녹음 권한 거부, 출력 장치 변경, 네트워크 없음 상태.

## 성능 및 운영 리스크

- 오디오 재생 경로에서 파일 I/O가 발생하면 50ms 목표를 맞추기 어렵다. 12현 필수 샘플은 앱 시작 또는 악기 화면 진입 시 preload해야 한다.
- 이벤트 스트림은 저비용이어야 한다. 연주 중 매 프레임마다 세션 파일에 쓰지 말고 메모리 버퍼에 쌓은 뒤 구간 종료 시 저장한다.
- 고급 피치 보정은 처리 지연을 만들 수 있다. 실시간 bend는 기능 가능 여부보다 지연과 클릭 노이즈가 우선 판단 기준이다.
- 발표 장비 출력은 별도 리스크다. 실제 발표 스피커/오디오 인터페이스/폰 모델로 리허설해야 한다.

## 병렬화 전략

첫 2일은 병렬화하지 않는 것이 맞다. `PerformanceEvent`, `SampleAssetManifest`, `SamplerEngine` 경계를 먼저 고정해야 이후 작업이 엇갈리지 않는다.

| Lane | 작업 | 의존성 |
| --- | --- | --- |
| A | 오디오 엔진 스파이크, 샘플 preload, 8보이스/bend/mute 검증 | 공통 이벤트 모델 |
| B | 12현 UI, 터치 제스처 정규화, 데모용 레이턴시 로그 | 공통 이벤트 모델 |
| C | 세션 JSON, 장단 추천 규칙, 데이터 인스펙터 | 공통 이벤트 모델, 샘플 매니페스트 |

권장 순서:

1. 공통 이벤트/샘플 매니페스트를 먼저 확정한다.
2. Lane A와 Lane B를 병렬 진행한다.
3. Day 5 판정 후 Lane C를 붙인다.

충돌 플래그: Lane A와 Lane B 모두 `SamplerEngine` 호출 규약을 건드릴 수 있으므로 인터페이스를 먼저 고정하지 않으면 병합 충돌보다 의미 충돌이 난다.

## 참고한 외부 기술 문서

- [Expo Audio 공식 문서](https://docs.expo.dev/versions/latest/sdk/audio/) — `expo-audio`는 playback/recording API와 config plugin을 제공하지만, 앱 config와 권한/백그라운드 설정이 빌드 단계 결정에 영향을 준다.
- [React Native Audio API BaseAudioContext 문서](https://docs.swmansion.com/react-native-audio-api/docs/core/base-audio-context/) — 오디오 그래프, source/effect/destination node 구조를 제공한다.
- [React Native Audio API AudioBufferSourceNode 문서](https://docs.swmansion.com/react-native-audio-api/docs/sources/audio-buffer-source-node/) — 같은 버퍼를 재사용하되 source node는 새로 만들어 재생하는 구조와 pitch correction 지연 리스크를 확인했다.

## 완료 요약

- Step 0 Scope Challenge: 스튜디오 확장을 demo-only로 축소하는 `SCOPE_REDUCED` 권장.
- Architecture Review: 3개 핵심 이슈, 오디오/데이터 플로우 초안 작성.
- Code Quality Review: 구현 전 기준으로 공통 이벤트 모델과 엔진 인터페이스 분리 권장.
- Test Review: 자동화 가능한 모델 테스트와 실제 기기 QA 경로 제안.
- Performance Review: preload, 이벤트 버퍼링, 피치 처리 지연 리스크 지적.
- NOT in MVP scope: 작성 완료.
- What already exists: 작성 완료.
- Failure modes: 8개 실패 모드와 fallback 작성.
- Parallelization: 공통 모델 선확정 후 3개 lane 가능.

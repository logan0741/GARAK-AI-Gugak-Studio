# S05 자유연주 백로그

범위: S05 자유창작 화면에서 사용자가 진입 직후 악기를 직접 연주할 때의 입력, 발음, 악기별 인터랙션을 제품 수준으로 올리기 위한 작업 목록.

관련 문서: `../../architecture/free-play-performance-flow.md`, `../../architecture/free-play-recording-flow.md`, `../../architecture/runtime-architecture.md`, `../../domain/README.md`, `../../qa/day-5-audio-engine-checklist.md`

## 완료된 항목

| ID | 항목 | 현재 상태 | 기준 문서 |
| --- | --- | --- | --- |
| PERF-DONE-01 | S05 진입 직후 입력 캡처 활성화 | `captureEnabled = true`로 녹음 전에도 `PerformanceEvent[]`가 생성된다 | `../../architecture/free-play-performance-flow.md` |
| PERF-DONE-02 | 기본 연주와 녹음 저장 분리 | 녹음 전 이벤트는 live playback으로만 가고, 녹음 중 이벤트만 `pendingFreePlayTake.events`에 저장된다 | `../../architecture/free-play-recording-flow.md` |

## 다음 구현 후보

| ID | 항목 | 현재 상태 | 구현 방향 | 검증 |
| --- | --- | --- | --- | --- |
| PERF-01 | 저지연 live 발음 경로 분리 | S05 이벤트 발음은 UI callback과 product service boundary를 거친다 | 터치 핸들러에서 live audio adapter를 먼저 호출하고 state dispatch는 저장용으로 분리한다 | capture callback과 dispatch 호출 순서를 테스트한다 |
| PERF-02 | 제품 엔트리에 오디오 서비스 주입 | `GarakScreenFlowApp` 기본값은 noop service를 사용할 수 있다 | runtime product service factory를 만들고 엔트리에서 명시 주입한다 | service factory 단위 테스트와 엔트리 계약 테스트 |
| PERF-03 | live audio 실패/준비 상태 모델링 | `playPerformanceEvents` 실패가 사용자 상태로 충분히 드러나지 않는다 | `livePerformanceReadiness` 상태를 추가하고 unavailable/error를 S05 안내에 연결한다 | reducer/model 테스트 |
| PERF-04 | S05 touch layout calibration | 고정 좌표 기반 layout을 사용한다 | 악기별 stage artwork 기준 hit 영역 모델을 분리한다 | 악기별 좌표가 예상 이벤트로 매핑되는 테스트 |
| PERF-05 | 연주 실패 UX | 샘플 미보유, 권한, audio context 실패 안내가 부족하다 | 연주는 계속 조작 가능하게 두고 소리 준비 상태만 작게 노출한다 | S05 notice/copy 테스트 |
| PERF-06 | 삼각형 버튼 의미 정리 | 녹음 전/중 액션이 버튼 하나에 묶여 있다 | “연주 시작”이 아니라 녹음 설정/완료 컨트롤임을 시각적으로 구분한다 | 디자인 기준 확정 후 UI 테스트 |
| PERF-07 | 라이브 장단과 직접 연주 동시 발음 | 장단 가이드는 설정 상태 중심이다 | S10A 장단을 S05에서 metronome/accompaniment로 재생할지 결정한다 | audio mixer 경로 설계 |
| PERF-08 | 장구 전용 입력 모델 | 현재 입력 모델은 12현 가야금 기준 이벤트를 공유한다 | 장구 타격면, 열채/궁굴채 mapping, 샘플 asset을 분리한다 | `JangguTouchModel` 테스트 |
| PERF-09 | 대금 전용 입력 모델 | 현재 입력 모델은 관악기 breath/holes 특성을 반영하지 못한다 | 대금 구멍, 호흡, pitch bend 이벤트 schema를 정의한다 | `DaegeumTouchModel` 테스트 |
| PERF-10 | 실제 악기 샘플 asset 적용 | release 수준 샘플 manifest가 부족하다 | 악기별 `SampleAssetManifest`, preload/cache UI를 연결한다 | 샘플 로딩 QA |

## 작업 원칙

1. 기준 문서에서 현재 입력/발음 경계를 먼저 확인한다.
2. 변경 파일은 UI capture, product services, audio adapter, touch model 중 실제 수정 경로를 명시한다.
3. 이벤트 schema를 바꾸는 작업은 저장/재생/공유 문서와 함께 갱신한다.
4. 프론트 구현 후 `npm run typecheck`, 관련 vitest, 필요한 경우 전체 `npm test`를 실행한다.

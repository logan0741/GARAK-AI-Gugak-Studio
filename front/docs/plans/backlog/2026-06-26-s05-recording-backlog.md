# S05 녹음 백로그

범위: S05 자유연주 화면의 녹음 기능을 이벤트 저장 중심에서 제품 녹음 경험으로 확장하기 위한 작업 목록.

관련 문서: `../../architecture/free-play-recording-flow.md`, `../../architecture/free-play-performance-flow.md`, `../../architecture/runtime-architecture.md`, `../../domain/README.md`

## 완료된 항목

| ID | 항목 | 현재 상태 | 검증 |
| --- | --- | --- | --- |
| REC-DONE-01 | 녹음 중 중복 시작 방지 | `startPerformanceRecording`은 기존 `pendingFreePlayTake`를 덮어쓰지 않는다 | reducer 테스트 |
| REC-DONE-02 | `completePerformance(events)` override 제한 | 완료 시 action payload가 아니라 `pendingFreePlayTake.events`를 저장한다 | reducer 테스트 |
| REC-DONE-03 | 녹음 시작 시점 저장 | `pendingFreePlayTake.startedAtMs`를 기록한다 | 상태 테스트 |
| REC-DONE-04 | 실제 take 길이 계산 | 이벤트 timestamp와 BPM 기준으로 `durationBeats`를 계산한다 | 저장 테스트 |

## 다음 구현 후보

| ID | 항목 | 현재 상태 | 구현 방향 | 검증 |
| --- | --- | --- | --- | --- |
| REC-05 | 빈 take 완료 정책 | 이벤트가 없는 take를 저장할지 막을지 제품 결정이 필요하다 | 빈 take 저장 허용 여부를 확정하고 notice/reducer를 맞춘다 | reducer/UI notice 테스트 |
| REC-06 | 녹음 중 상태 표시 | 완료 컨트롤은 있지만 진행 시간/beat 표시가 약하다 | 녹음 시간, 박자, 이벤트 수를 작게 표시한다 | S05 model/UI 테스트 |
| REC-07 | 녹음 취소와 화면 이탈 정책 | 뒤로가기, 설정 열기, 다른 화면 이동 시 동작이 불명확하다 | 작성 중 take 손실 가능성을 알리는 확인 UI를 추가한다 | 화면 전이 테스트 |
| REC-08 | 진행 중 take 복구 | reload 또는 앱 종료 시 draft 복구 정책이 없다 | 긴 녹음은 draft autosave, 짧은 즉흥 녹음은 메모리 유지로 구분한다 | storage adapter 및 복구 UX 테스트 |
| REC-09 | 오디오 파일 녹음 또는 렌더링 | 현재는 event recording이며 `recordingUri`를 만들지 않는다 | export/capture API와 최종 오디오 렌더링 경로를 설계한다 | S07 재생/내보내기 연결 테스트 |
| REC-10 | 악기별 녹음 이벤트 모델 | 장구/대금도 현재 공통 이벤트를 공유한다 | 악기별 event schema와 replay planner를 확장한다 | 악기별 touch model과 replay 테스트 |

## 상태 기준

| 상태 | 의미 |
| --- | --- |
| `pendingFreePlayTake === undefined` | 자유연주는 가능하지만 저장 중인 take는 없다 |
| `pendingFreePlayTake !== undefined` | 녹음 중이며 이후 이벤트가 `Take.events`로 누적된다 |
| `freePlayNotice = 'missingTake'` | 완료했지만 저장할 take가 없어 안내만 표시한다 |

## 작업 원칙

1. 기준 문서 `free-play-recording-flow.md`에서 현재 동작과 불변 조건을 확인한다.
2. 변경 파일은 reducer, UI, effect, studio model 중 실제 경로를 명시한다.
3. 완료 기준에는 상태 테스트와 화면 전이 테스트를 포함한다.
4. `npm run typecheck`, 관련 vitest, 필요한 경우 전체 `npm test`를 실행한다.

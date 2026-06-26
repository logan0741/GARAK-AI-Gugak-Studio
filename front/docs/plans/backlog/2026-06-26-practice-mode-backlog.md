# 따라하기 모드 백로그

범위: S03 `자유창작모드`에서 당장 미구현으로 결정한 `따라하기` 모드를 UI에서 선택하지 못하게 유지하고, 나중에 S13-S16 흐름을 다시 열기 위한 작업을 추적한다.

관련 문서: `../../product/garak-product-brief.md`, `../../product/screen-flow/current-screen-flow.md`

## 현재 결정

따라하기 모드는 현재 제품 범위에서 미구현이다. UI에는 기능의 존재를 보여줄 수 있지만, 사용자가 토글하거나 다음 화면으로 진입할 수 있으면 안 된다.

## 완료된 항목

| ID | 항목 | 현재 상태 | 기준 문서 |
| --- | --- | --- | --- |
| PRACTICE-DONE-01 | S03 따라하기 선택 비활성화 | 따라하기 버튼은 disabled 상태로 노출된다 | `../../product/screen-flow/current-screen-flow.md` |
| PRACTICE-DONE-02 | S03 상태 보호 | `selectIntroGuideMode`에 `practice` option이 들어와도 자유창작 상태를 유지한다 | `../../product/screen-flow/current-screen-flow.md` |

## 재개 전 필요한 작업

| ID | 항목 | 현재 상태 | 완료 조건 |
| --- | --- | --- | --- |
| PRACTICE-01 | 따라하기 재활성화 조건 정의 | S13-S16 화면은 존재하지만 제품 흐름에서 닫혀 있다 | 민요 샘플, 악기별 가이드, 결과 피드백 기준을 확정한다 |
| PRACTICE-02 | S03 -> S13 라우팅 복구 | `NEXT`는 자유창작 흐름으로 이동한다 | 따라하기 선택 상태에서 S13 `민요 선택`으로 이동한다 |
| PRACTICE-03 | disabled copy와 접근성 정리 | 준비 중 상태만 표시한다 | 스크린리더 라벨과 시각적 disabled affordance를 확정한다 |
| PRACTICE-04 | 민요별 가이드 데이터 | S15 연습 기준 데이터가 확정되지 않았다 | song guide event, BPM, 지원 악기 데이터를 정의한다 |
| PRACTICE-05 | 정확도 피드백 산정 | S16 결과 산식이 확정되지 않았다 | timing, pitch, rhythm 평가 모델을 정의한다 |
| PRACTICE-06 | 결과 저장 및 공유 | 결과가 보관/공유 대상인지 일부만 정리되어 있다 | S16 결과를 `PracticeResult`로 저장하고 S17-S21 공유 흐름에 연결한다 |

## 작업 원칙

1. 기준 문서에서 S03, S13-S16의 실제 진입 가능 상태를 먼저 갱신한다.
2. 변경 파일은 reducer, S03 UI, S13-S16 screen, practice model 중 실제 수정 경로를 명시한다.
3. 따라하기가 다시 열릴 때는 자유창작 흐름과 회귀 테스트를 함께 갱신한다.
4. 샘플/가이드가 없는 상태에서 따라하기 흐름이 열리지 않도록 QA한다.

# AI 모델 파이프라인 데이터 계약 초안

상태: 계약 초안, 백엔드/AI 확정 필요
작성일: 2026-06-19
문서 책임: 프론트가 모델 서버에 보낼 입력과 모델 서버에서 받을 출력의 데이터 경계를 정리한다.

관련 문서: `runtime-architecture.md`, `gukak-studio-erd.md`, `ai-auto-accompaniment-generation.md`, `../product/screen-flow/current-screen-flow.md`

## 원칙

- 정상 악기 연주와 녹음은 모델 서버에 의존하지 않는다.
- 모델 서버 호출은 사용자의 명시적 행동 이후에만 시작한다.
- S05 녹음 완료 직후 자동으로 파일을 업로드하지 않는다.
- 모델 출력은 저장된 작업을 자동 변경하지 않는다. 사용자가 미리듣고 수락해야 Work에 반영한다.
- 모델 서버 실패, 시간 초과, 포트 미정 상태에서도 수동 장단/반주 추가와 로컬 보관함은 동작해야 한다.

## 1차 연동 후보 지점

| 화면 | 사용자 행동 | 프론트 요청 후보 | 프론트 표시 후보 |
| --- | --- | --- | --- |
| S10B 반주 트랙 만들기 | AI 추천 또는 반주 만들기 | 현재 Work, 선택 Track/Take, BPM, 박자, 장단 후보 | 반주 트랙 후보, 미리듣기, 적용 |
| S07 트랙/레이어 편집 | 여러 레이어를 합쳐 편곡 요청 | Work 전체 또는 선택 트랙 묶음 | 편곡 후보, 새 Track 후보, 실패 fallback |
| S16 결과 / AI 피드백 | 따라하기 결과 피드백 | PracticeAttempt, 정확도/타이밍 지표 | 피드백 문장, 다시 연습 제안 |

## 모델 서버 입력 후보

```json
{
  "requestId": "ai_request_001",
  "source": "s10b_accompaniment",
  "work": {
    "id": "work_001",
    "title": "무제 작업 2026.06.19 21:00",
    "meter": "12/8",
    "bpm": 84,
    "tracks": [
      {
        "id": "track_001",
        "kind": "instrument",
        "instrumentId": "gayageum",
        "startedAtBeat": 1,
        "takes": [
          {
            "id": "take_001",
            "startedAtBeat": 1,
            "durationBeats": 16,
            "bpm": 84,
            "meter": "12/8",
            "jangdanPresetId": "semachi",
            "events": []
          }
        ]
      }
    ]
  },
  "audioRefs": [
    {
      "takeId": "take_001",
      "recordingUri": "local-or-uploaded-uri",
      "uploadRequired": false
    }
  ],
  "requestOptions": {
    "outputKind": "accompaniment_track_candidate",
    "maxCandidates": 3
  }
}
```

- `events`는 `PerformanceEvent[]` 직렬화다.
- `recordingUri`는 선택값이다. Recording이 없어도 이벤트 기반 요청이 가능해야 한다.
- 서버가 실제 파일 URI를 요구한다면 업로드 선행 절차와 완료 URI를 백엔드 계약에서 정의해야 한다.
- 로컬 URI를 그대로 모델 서버에 전달할 수 없으면 프론트는 업로드 상태를 별도로 표시한다.

## 모델 서버 출력 후보

```json
{
  "requestId": "ai_request_001",
  "status": "ok",
  "candidates": [
    {
      "id": "candidate_001",
      "kind": "accompaniment_track",
      "jangdanPresetId": "semachi",
      "bpm": 84,
      "meter": "12/8",
      "confidence": 0.82,
      "reason": "녹음 전 설정과 이벤트 밀도가 세마치 범위에 가깝습니다.",
      "previewUri": "optional-preview-uri",
      "trackDraft": {
        "kind": "accompaniment",
        "startedAtBeat": 1,
        "volume": 0.8
      }
    }
  ]
}
```

- 프론트는 후보를 바로 Work에 적용하지 않고 미리듣기/수락 UI를 보여준다.
- `previewUri`가 없으면 로컬 `LocalSequencer`로 미리듣기를 구성한다.
- `trackDraft`는 사용자가 수락했을 때만 S07의 새 Track으로 변환한다.

## 확정 필요 질문

| 질문 | 필요한 결정 |
| --- | --- |
| 모델 서버 포트와 엔드포인트는 무엇인가? | 개발/시연 환경별 base URL |
| 입력은 JSON 이벤트만 받는가, 오디오 파일도 받는가? | `PerformanceEvent[]`, `Recording`, 둘 다 중 무엇인지 |
| 오디오 파일이 필요하면 언제 업로드하는가? | S10B 요청 직전, S07 내보내기 후, 보관함 동기화 후 중 선택 |
| 모델 출력은 트랙 데이터인가, 오디오 파일인가? | 프론트가 렌더링할 UI와 저장 모델 결정 |
| 실패 fallback은 무엇인가? | 로컬 장단 프리셋, 로컬 템플릿 피드백, 재시도 |
| 모델 요청 결과를 서버에 저장하는가? | Work 히스토리, 추천 로그, 심사용 근거 여부 |

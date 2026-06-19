# 작업과 보관함 데이터 모델 구현 계획

상태: 구현 전 실행 기준  
작성일: 2026-06-18  
문서 책임: 화면 흐름에서 사용하는 작업, 트랙, 테이크, 내보낸 음원, 따라하기 결과 모델을 구현하는 기준이다.

관련 문서: `README.md`, `../../../domain/README.md`, `../../../architecture/gukak-studio-erd.md`, `../../../product/screen-flow/current-screen-flow.md`

## 입력

- `Session`의 기준 데이터는 `PerformanceEvent[]`
- `Recording`은 선택 산출물
- 자동 저장된 작업은 공유 가능한 음원이 아님
- 보관함은 작업과 내보낸 음원/결과를 구분함

## 출력

- `src/studio/studioTypes.ts`
- `src/studio/studioLibrary.ts`
- `src/studio/__tests__/studioLibrary.test.ts`

## 모델

### Work

작업은 편집 가능한 단위다.

- `id`
- `title`
- `createdAt`
- `updatedAt`
- `tracks`
- `source`
- `syncState`

### Track

트랙은 작업 안에 쌓이는 레이어다.

- 악기 트랙: 가야금, 장구, 대금
- 반주 트랙: 장단 프리셋, BPM, 볼륨
- 참조 트랙: 공유 곡 리믹스에서 복사된 참조

### Take

테이크는 녹음 시도 단위다.

- `events`
- `recordingUri`
- `startedAtBeat`
- `durationBeats`
- `liveJangdanGuide`

### ExportedAudio

내보낸 음원은 공유 가능한 산출물이다.

- `id`
- `workId`
- `title`
- `durationSeconds`
- `instrumentNames`
- `createdAt`
- `audioUri`
- `shareState`

### PracticeResult

따라하기 결과는 자유창작 작업으로 자동 변환하지 않는다.

- `id`
- `songId`
- `instrument`
- `accuracyScore`
- `timingScore`
- `feedback`
- `createdAt`
- `shareState`

## 순수 함수

- `createLocalWork`
- `addInstrumentTrack`
- `addAccompanimentTrack`
- `autoSaveTakeAsWork`
- `exportWorkAudioPlaceholder`
- `createPracticeResult`
- `selectLibrarySections`
- `mergeAccountLibraryPreview`

## 테스트 기준

`studioLibrary.test.ts`에서 다음을 검증한다.

- S05 완료 시 테이크가 작업으로 자동 저장된다.
- 자동 저장된 작업은 `shareState`를 갖지 않는다.
- S10B 반주 추가 시 새 반주 트랙이 현재 작업에 추가된다.
- S09 추가 녹음은 현재 재생 헤드 위치를 트랙 시작점으로 사용한다.
- 재생 헤드가 없으면 1마디 1박을 사용한다.
- 내보내기 후에만 공유 가능한 `ExportedAudio`가 생긴다.
- 보관함 섹션은 `작업`과 `내보낸 음원/결과`를 분리한다.
- 로그인 동기화 미리보기는 로컬 항목을 삭제하지 않는다.

## 구현 제약

- 도메인 순수 함수는 React Native API에 의존하지 않는다.
- 날짜와 ID는 테스트에서 주입 가능하게 만든다.
- 실제 오디오 인코딩은 이번 범위에서 구현하지 않고, 내보낸 음원 placeholder를 만들어 화면 흐름을 검증한다.

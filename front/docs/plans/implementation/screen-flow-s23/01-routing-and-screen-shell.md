# 라우팅과 화면 셸 구현 계획

상태: 구현 전 실행 기준
작성일: 2026-06-18
문서 책임: S01-S23 화면 정의와 앱 내부 라우팅 상태를 구현하는 기준이다.

관련 문서: `README.md`, `../../../product/screen-flow/current-screen-flow.md`, `../../../product/screen-flow/screen-composition-standards.md`

## 입력

- `current-screen-flow.md`의 화면 인벤토리와 화면별 다음 화면 연결
- `screen-composition-standards.md`의 정보 위계, 상태, 접근성 기준
- 현재 Expo Router 구조: `app/index.tsx` 단일 진입점

## 출력

- `src/screen-flow/screenDefinitions.ts`
- `src/screen-flow/screenFlowMachine.ts`
- `src/screen-flow/__tests__/screenFlowMachine.test.ts`
- `src/product/GarakScreenFlowApp.tsx`
- `app/index.tsx`의 진입 컴포넌트 교체

## 화면 정의

`screenDefinitions.ts`는 화면 ID, 이름, MVP 상태, 주요 CTA, 허용 전환을 데이터로 가진다.

필수 구현 화면:

- S01 홈
- S02 언어 전환 상태
- S03 홈-자유창작모드 / 연주 모드 선택
- S04 악기 선택
- S04A 연주 기본 설정
- S05 악기 자유연주
- S07 트랙/레이어 편집
- S08 트랙 추가
- S09 추가 악기 녹음
- S10A 라이브 장단 가이드
- S10B 반주 트랙 만들기
- S13 민요 선택
- S14 따라하기 악기 선택
- S15 따라하기 연주
- S16 결과 / AI 피드백
- S17 공유 준비
- S18 보관함
- S19 연주 상세 / 플레이어
- S20 쉐어 / 둘러보기
- S21 공유 곡 상세
- S22 마이 / 설정
- S23 로그인 / 보관함 동기화

제외 화면:

- S06 연주 완료 확인
- S11 반주 적용 후 트랙/레이어 편집
- S12 따라하기 모드 상태

## 상태 전이 규칙

- S01 `PLAY` -> S03 `홈-자유창작모드` / 연주 모드 선택
- S03 `자유창작 모드` 선택 후 `NEXT` -> S04
- S03 `따라하기 모드` 선택 후 `NEXT` -> S13
- S05 `완료` -> 작업 자동 저장 -> S07
- S07 `트랙 추가` -> S08
- S08 `악기 연주 추가` -> S09
- S08 `장단/반주 추가` -> S10B
- S10A `적용하고 연주로 돌아가기` -> S05
- S10B `반주 트랙 추가` -> S07
- S15 `완주` 또는 결과 보기 -> S16
- S16 `공유` -> S17
- S18 `작업 열기` -> S07
- S18 `결과 상세` -> S19
- S19 `공유` -> S17
- S22 `로그인하고 내 곡 불러오기` -> S23

## 앱 셸

`GarakScreenFlowApp`은 다음 공통 구조를 제공한다.

- 상단: GARAK 로고, 현재 화면명, 뒤로가기
- 본문: 화면별 콘텐츠
- 하단: 현재 화면의 주요 CTA 영역
- 홈 빠른 접근: 마이, 홈, 쉐어

전역 하단 탭은 만들지 않는다. 홈 빠른 접근 UI는 S01 중심의 이동 보조로 구현한다.

## 테스트 기준

`screenFlowMachine.test.ts`에서 다음을 검증한다.

- 제외 화면은 직접 이동 대상에 포함되지 않는다.
- S01 `PLAY`가 S03으로 이동하고, S03 모드별 `NEXT` 전환이 S04/S13으로 갈라진다.
- S05 완료가 S06을 거치지 않고 S07로 간다.
- S10B 반주 추가가 S11을 거치지 않고 S07로 간다.
- S22 로그인 CTA가 S23으로 이동한다.

## 수동 점검

- 앱 실행 시 S01 홈이 보인다.
- S01에서 PLAY를 누르면 S03으로 이동한다.
- S03에서 자유창작과 따라하기 토글을 바꾸면 설명과 NEXT 목적지가 바뀐다.
- 뒤로가기는 이전 화면으로 돌아간다.
- 제외 화면은 화면 목록이나 CTA에서 노출되지 않는다.

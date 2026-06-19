# GARAK 디자인 시스템

상태: 현재 Figma 스냅샷 기반 기준 후보
작성일: 2026-06-19
문서 책임: GARAK 프론트엔드가 참고할 브랜드 색, 로고 후보, 기초 UI 요소, Figma 해석 기준을 관리한다.
관련 문서: `../document-authority-index.md`, `../product/screen-flow/current-screen-flow.md`, `../product/screen-flow/screen-composition-standards.md`

## 먼저 지켜야 할 전제

현재 Figma 와이어프레임과 디자인 시스템은 완성본이 아니다. 이 문서는 지금 확인된 디자인 의도를 구현자가 같은 방식으로 해석하기 위한 기준 후보이며, 현재 디자인이 최선이라는 뜻이 아니다.

구현자는 이 문서를 최종 시안 승인서로 다루지 않는다. 화면을 실제 코드로 옮기기 전에는 목적, 흐름, 접근성, 기기 제약, 오디오/연주 몰입도를 다시 확인한다. Figma와 제품 문서가 충돌하면 충돌을 숨기지 않고 이 문서의 "충돌 감지" 기준에 따라 기록한다.

## 1. 출처와 신뢰도

| 출처 | 이 문서에서 쓰는 범위 | 신뢰도 |
| --- | --- | --- |
| 2026-06-19 첨부 Figma 스크린샷 | 색 계열, 로고 후보, 화면별 구성 방향, 컴포넌트 종류 | 중간 |
| 기존 `figma-6-10-section.png` / `figma-6-10-wireframe.png` | 이전 와이어프레임 흐름과 브랜드 탐색 맥락 | 보조 |
| 실제 Figma 레이어 값 | 현재 문서에는 없음 | 낮음 |

- 색상 hex는 스크린샷 픽셀에서 읽은 근사값이다.
- 프로덕션 구현 전에는 Figma 변수, 스타일, export 파일로 다시 검증한다.
- 스크린샷을 잘라 앱 에셋으로 쓰지 않는다. 실제 에셋은 Figma 원본에서 SVG 또는 3x PNG로 export한다.

## 2. 디자인 방향

- 배경은 순백보다 따뜻한 off-white를 기본으로 한다.
- 주요 CTA와 강조 컨트롤은 deep navy를 사용한다.
- GARAK 로고와 강한 브랜드 신호에는 red, amber, white 조합을 쓴다.
- 회색은 와이어프레임 placeholder 또는 보조 면으로만 사용한다. 최종 UI가 회색 계열만으로 끝나면 현재 브랜드 방향과 맞지 않는다.
- 화면은 모바일 세로 우선이며, 정보 위계는 `../product/screen-flow/screen-composition-standards.md`를 따른다.
- 장식보다 연주, 선택, 저장, 공유의 현재 상태와 다음 행동을 먼저 보여준다.

## 3. 색상 토큰 후보

| 토큰 | 근사 hex | 역할 | 사용 기준 |
| --- | --- | --- | --- |
| `color.brand.red` | `#B51A14` | 기본 GARAK wordmark, 강한 브랜드 신호 | 로고, 온보딩 `logo1`, `logo3` 배경 |
| `color.brand.navy` | `#1A1C2D` | 기본 primary CTA, dark surface | 주요 버튼, 선택된 모드, dark onboarding |
| `color.brand.amber` | `#E59100` | 보조 브랜드 강조 | 선택된 홈 quick access, `logo2` wordmark, accent dot |
| `color.surface.canvas` | `#F9F7F3` | 앱 기본 배경 | 화면 배경, splash/off-white logo 배경 |
| `color.surface.card` | `#FFFFFF` | 카드와 입력면 | 실제 콘텐츠 카드, 모달형 도구 |
| `color.surface.soft` | `#ECECE4` | 비활성/보조 컨트롤 | secondary button, inactive segment |
| `color.surface.wire` | `#C4C4C4` | 와이어프레임 placeholder | 구현 전 skeleton, 회색 시안 표시 |
| `color.text.primary` | `#1A1C2D` | 본문과 제목의 기본 ink | off-white/white 배경 위 텍스트 |
| `color.text.secondary` | `#707070` | 보조 설명 | 설명, 메타데이터, 비활성 라벨 |
| `color.ink.black` | `#000000` | 고대비 보정 | 작은 아이콘, 특수 상태 |

Red는 기본적으로 오류 색이 아니라 브랜드 색이다. 오류/위험 상태는 별도 의미 색을 정하기 전까지 텍스트, 아이콘, 상태 문구를 함께 써서 구분한다.

## 4. 로고와 에셋 이름

| 에셋 이름 | Figma에서 보이는 형태 | 우선 용도 | 주의 |
| --- | --- | --- | --- |
| `logo1` | off-white 배경 + red `GARAK` | 기본 splash, 문서/앱 소개, 빈 상태 브랜드 신호 | 앱 시작을 막는 온보딩 게이트로 해석하지 않는다. |
| `logo2` | deep navy 배경 + amber `GARAK` | dark splash, loading, 고대비 브랜드 순간 | 본문 화면 전체 배경으로 반복 사용하지 않는다. |
| `logo3` | red 배경 + white `GARAK` | 캠페인성 splash, 강한 완료/공유 순간 | 오류 색과 혼동되지 않게 상태 문구를 함께 둔다. |
| `logo-wordmark-red` | 배경 없는 red `GARAK` wordmark | 상단 브랜드, 홈 카드 | header에서는 작은 크기에서도 읽혀야 한다. |
| `logo-wordmark-amber` | 배경 없는 amber `GARAK` wordmark | dark surface 위 브랜드 | dark 배경 전용으로 둔다. |
| `logo-wordmark-white` | 배경 없는 white `GARAK` wordmark | red/navy surface 위 브랜드 | 투명 배경 export가 필요하다. |

실제 export 위치를 정할 때는 `assets/brand/logo1.*`, `assets/brand/logo2.*`, `assets/brand/logo3.*`처럼 관리한다. 파일 포맷은 벡터 원본이 가능하면 SVG를 우선하고, 배경이 포함된 splash 이미지는 PNG를 허용한다.

## 5. 기초 UI 요소

### App Shell

- 기본 화면은 off-white 배경의 모바일 phone frame이다.
- 상단에는 상태바 아래 중앙 `GARAK` wordmark를 둔다.
- 뒤로가기, 언어, 설정 같은 보조 액션은 작은 원형 아이콘 버튼으로 둔다.
- 화면 제목은 큰 설명문보다 사용자가 지금 고르는 대상이나 해야 할 행동을 먼저 말한다.

### Segmented Control

- 홈의 1차 선택은 `자유창작 모드 / 따라하기 모드` segmented control이다.
- active segment는 navy 또는 dark fill, inactive segment는 soft/off-white fill을 쓴다.
- segmented control은 홈의 모드 선택에 우선 사용하고, 전역 내비게이션으로 확장하지 않는다.

### Buttons

- Primary button은 deep navy fill, white text, 44px 이상 터치 높이를 기본으로 한다.
- Secondary button은 soft fill 또는 outline으로 낮춘다.
- 비활성 버튼은 opacity만 낮추지 말고 라벨, 위치, 상태 설명으로 사용 불가 이유를 보완한다.
- Figma에 `Next`, `Play`, `Mix` 같은 영어 라벨이 보이더라도 실제 노출 언어는 화면 명세와 i18n 기준을 따른다.

### Cards And Panels

- 큰 선택 카드와 입력 panel은 부드러운 둥근 모서리를 쓴다.
- 카드 안에 다시 카드를 중첩하지 않는다.
- 회색 카드 면은 와이어프레임 placeholder일 수 있으므로 실제 구현에서는 `surface.card`, `surface.canvas`, 브랜드 accent를 함께 적용한다.
- 연주면은 카드 장식보다 악기 입력면 자체가 먼저 보여야 한다.

### Home Quick Access

- `마이 / 홈 / 쉐어`는 홈 주변 빠른 접근 UI다.
- 모든 화면에 고정되는 전역 하단 탭으로 구현하지 않는다.
- active home 상태는 amber accent를 사용할 수 있다.

### Progress And Bottom Actions

- 모드/악기/따라하기 선택 흐름에는 하단 progress indicator와 primary action을 둘 수 있다.
- S05/S09 같은 연주 화면의 하단 UI는 전역 이동보다 녹음, 장단, 레이어, 완료 같은 연주 컨트롤을 담당한다.

## 6. 화면별 해석

| Figma에서 보이는 화면 | 현재 해석 | 연결 문서 |
| --- | --- | --- |
| 온보딩 3종 `GARAK` 화면 | 로고/splash 에셋 후보. 앱 사용 전 필수 관문으로 확정하지 않는다. | 이 문서 4장, `../product/garak-product-brief.md` |
| 로그인 화면 | 선택 로그인 또는 S23 동기화 흐름의 참고. 첫 실행 관문으로 쓰지 않는다. | `../product/screen-flow/current-screen-flow.md` S22/S23 |
| 홈 | S01 홈. 모드 segmented control, 큰 단일 카드, home quick access를 유지한다. | `../product/screen-flow/current-screen-flow.md` S01 |
| 자유창작/따라하기 선택 | S01 상태 또는 S04/S13 진입 전 선택 화면의 참고. 독립 중복 화면을 만들지 않는다. | `../product/screen-flow/current-screen-flow.md` S01/S04/S13 |
| 악기 선택 | S04/S14 참고. MVP 3악기와 잠금 확장 슬롯을 구분한다. | `../product/screen-flow/current-screen-flow.md` S04/S14 |
| 가야금 연주면 | S05/S09 가야금 입력면 참고. 가야금은 버튼 배열이 아니라 현 중심 입력면이다. | `../domain/README.md`, `../product/screen-flow/current-screen-flow.md` S05/S09 |
| Mix / 플레이어 / 보관함 화면 | S07/S17/S18/S19/S20 계열 참고. 자동 저장 Work와 공유 가능한 산출물을 구분한다. | `../product/screen-flow/current-screen-flow.md` S07/S17-S20 |

## 7. 충돌 감지

| 감지한 부분 | Figma에서 보이는 내용 | 기존 문서 기준 | 현재 처리 |
| --- | --- | --- | --- |
| 온보딩 3종 | 앱 시작 전 splash처럼 보이는 3개 화면 | 앱은 게스트 상태로 바로 홈에 진입한다. | `logo1`-`logo3` 브랜드 에셋 후보로만 관리한다. 필수 온보딩 관문으로 승격하지 않는다. |
| 로그인 화면 | Google 로그인과 `Guest Mode`가 전면 화면으로 보인다. | 로그인은 앱 시작 조건이 아니며 S22/S23에서 필요할 때 제안한다. | 로그인 UI는 선택 로그인 참고로만 둔다. 첫 실행 게이트로 구현하지 않는다. |
| `마이 / 홈 / 쉐어` | 하단 pill 내비게이션처럼 보인다. | 전역 하단 탭은 MVP에서 사용하지 않는다. | 홈 quick access로 유지한다. 전 화면 고정 탭으로 확장하지 않는다. |
| 외부 AI 메모 | 디자인 메모에 Claude API/AI 관련 문맥이 보인다. | MVP AI는 외부 API 의존 없이 로컬 템플릿 fallback이 가능해야 한다. | 외부 AI 호출은 디자인만 보고 구현하지 않는다. S16/S10B는 로컬 fallback을 유지한다. |
| 영어 UI 라벨 | `Next`, `Play`, `Mix`, `Google`, `Guest Mode`가 보인다. | 제품 문서와 화면 명세는 한국어 기본이며 필요한 경우만 병기한다. | 실제 라벨은 화면 명세와 i18n 결정이 우선한다. |
| 회색 중심 와이어프레임 | 이전 구현/와이어프레임이 회색 placeholder 중심이다. | 새 디자인 시스템은 red/navy/amber/off-white 브랜드 방향을 드러낸다. | 회색은 placeholder로 낮추고, 새 구현은 디자인 토큰 후보를 기준으로 보정한다. |
| 최종성 오해 | 더 구체화된 화면이 많아 확정안처럼 보일 수 있다. | 현재 화면 흐름도 계속 검증 대상이다. | 이 문서는 현재 스냅샷을 기준 후보로만 둔다. 구현 전 검토를 유지한다. |

## 8. 구현 반영 기준

- 새 UI 구현은 색상 문자열을 화면마다 직접 흩뿌리지 않고 토큰으로 모은다.
- 실제 Figma export를 받기 전에는 `logo1`-`logo3` 실파일을 만들지 않는다.
- 코드에 반영할 때는 최소한 `brand`, `surface`, `text`, `action`, `state` 계층으로 토큰을 나눈다.
- 디자인 수치가 문서의 화면 흐름과 충돌하면 화면 흐름을 임의로 바꾸지 말고 이 문서의 충돌 표를 갱신한 뒤 제품 기준 문서를 확인한다.
- 이 문서의 색상 근사값은 팀 리뷰용이다. Figma 변수 값이 확인되면 같은 토큰 이름을 유지한 채 값만 갱신한다.

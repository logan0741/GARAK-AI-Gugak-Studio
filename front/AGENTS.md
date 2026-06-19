# AGENTS.md

## Personal Defaults

- 응답은 기본적으로 한국어로 한다.
- 구현 요청은 제안만 하지 말고 가능한 범위에서 직접 수행한다.
- 불필요한 대형 프로세스 문서를 만들지 않는다. 다만 이 프로젝트는 에이전트 협업과 DDD 문서가 핵심이므로 문서 책임을 엄격히 유지한다.

## Required Read Order

새 작업을 시작할 때는 다음 순서로 읽는다.

1. `CONTEXT.md`
2. `docs/document-authority-index.md`
3. `docs/product/garak-product-brief.md`
4. `docs/product/screen-flow/current-screen-flow.md`
5. `docs/domain/README.md`
6. `docs/system/conventions.md`
7. 작업 성격에 맞는 세부 문서:
   - 제품/공모전/시장: `docs/product/garak-product-brief.md`, `docs/product/gukak-studio-proposal.md`
   - 화면 흐름/CTA/데이터 흐름: `docs/product/screen-flow/current-screen-flow.md`
   - 도메인 모델/용어: `docs/domain/README.md`
   - ERD/직렬화 구조: `docs/architecture/gukak-studio-erd.md`
   - 기술 스택: `docs/architecture/tech-stack.md`
   - 구현 실행: `docs/plans/implementation/2026-06-02-gukak-studio-mvp-light-spec.md`
   - 이전 리뷰 맥락: `docs/reviews/`

## DDD Rules

- 도메인 용어는 `docs/domain/README.md`를 기준으로 한다.
- UI gesture 이름을 저장 모델에 직접 넣지 않는다. 반드시 `PerformanceEvent`로 정규화한다.
- `Session`은 기준 데이터이고 `Recording`은 파생 산출물이다.
- `SampleAssetManifest`와 `DataReferenceManifest`는 섞지 않는다.
- 기술 구현 세부사항은 도메인 문서에 넣지 않는다. 도메인 문서는 국악/제품 언어와 불변조건을 유지한다.

## Documentation Rules

- 문서 하나는 하나의 책임만 가진다.
- 어떤 질문의 최종 기준 문서가 무엇인지는 `docs/document-authority-index.md`를 따른다.
- `README.md`는 외부에 보여줄 서비스 소개와 최소 실행 안내를 담으며, 내부 기준 문서로 쓰지 않는다.
- 제안서는 제품/심사 설득용이다. 구현 지시는 계획 문서에 둔다.
- ADR은 되돌리기 어렵고, 맥락 없이 보면 이상하며, 실제 대안이 있었던 결정만 기록한다.
- 구현 계획은 에이전트가 실행할 수 있게 파일 경로, 명령, 검증 방법, fallback을 포함한다.
- 리뷰 문서는 당시 판단의 스냅샷이다. 새로운 기준으로 승격하려면 해당 책임 문서에 반영한다.

## Git And Code Conventions

- 브랜치 이름과 커밋 메시지는 `docs/system/conventions.md`를 따른다.
- 프론트엔드 산출물은 `front/` 하위에 둔다.
- 코드 구현 전에는 `docs/system/conventions.md`, `docs/domain/README.md`, `docs/architecture/tech-stack.md`를 확인한다.

## Verification

- 문서 변경 후에는 최소한 파일 존재, 링크/경로, 금지 표식(`TBD`, `TODO`)을 검증한다.
- 코드 변경 후에는 가장 좁은 의미 있는 테스트부터 실행한다.
- 프론트엔드 변경은 실제 화면 또는 스크린샷으로 확인한다.
- 오디오 품질은 에뮬레이터가 아니라 실제 기기에서 판단한다.

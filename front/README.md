# GUKAK STUDIO

GUKAK STUDIO는 국악 데이터를 단순 재생하지 않고, 모바일에서 직접 만질 수 있는 12현 가야금 악기 경험으로 바꾸는 프로젝트다.

MVP는 기능 수보다 첫 30초의 악기다움에 집중한다. 사용자가 현을 뜯고, 쓸고, 흔들고, 지음으로 여운을 끊는 코어 루프가 통과해야 녹음, 장단 추천, 데이터 증명 UI가 의미를 가진다.

## Start Here

에이전트와 개발자는 아래 순서로 읽는다.

1. `AGENTS.md`: 작업 규칙과 안전 가드레일
2. `CONTEXT.md`: 프로젝트 핵심 원칙 요약
3. `docs/README.md`: 문서 구조와 책임
4. `docs/domain/README.md`: DDD 도메인 모델과 용어
5. `docs/architecture/tech-stack.md`: MVP 확정 기술 스택

## Current MVP Stack

- App: Expo, React Native, TypeScript
- Interaction/UI: React Native Gesture Handler, Reanimated, React Native Skia
- Audio: `SamplerEngine` boundary, `react-native-audio-api` first, `expo-audio` fallback
- State: Zustand
- Tests: Vitest for pure domain modules, physical-device QA for audio
- Data: local `Session` JSON, `SampleAssetManifest`, `DataReferenceManifest`

## Documentation

문서별 책임은 `docs/README.md`에 고정한다. 새 문서를 만들거나 기존 내용을 옮길 때는 그 문서의 책임 범위와 맞는지 먼저 확인한다.


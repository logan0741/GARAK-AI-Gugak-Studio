# 2026-06-25 S01 Home Hero Entry

## Decision

- S01 home follows the Figma MCP node `258:98` as a single hero entry screen.
- S01 removes the previous `free creation / practice` mode toggle.
- S01에서 모드 토글을 제거한다.
- The hero `PLAY` action opens S03 `home-free-creation mode` from Figma MCP node `258:132`.
- S03 owns the `free creation / practice` mode selection and routes `NEXT` to S04 or S13.
- S03 has no standalone skip CTA in the current Figma MCP structure.

## Reason

The latest Figma source separates home entry from mode selection. The app should not treat user screenshots as the authority; implementation and documentation should use the Figma MCP node structure as the source of truth.

## Impact

- Home quick access stays home-scoped and is not expanded into a global bottom tab.
- Free creation instrument selection starts after S03, not directly from S01.
- Existing state callers that still send `selectMode` from S01 are routed through S03 for compatibility, but the UI no longer exposes mode selection on S01.

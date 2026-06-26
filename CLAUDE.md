
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GARAK — AI GUGAK STUDIO** — A Korean traditional music (국악) mobile creation app for the 문화체육관광부 AI·데이터 활용 공모전. Users play virtual gugak instruments (가야금, 장구, 대금), receive jangdan recommendations, and get Claude-powered practice feedback.

The repo has three independent modules:

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `front/` | Expo (React Native) | Mobile app (iOS/Android) |
| `back/` | FastAPI + MySQL | REST API server |
| `AI/` | Python (librosa, sklearn) | ML training pipelines and model files |

## Development Commands

**Backend (FastAPI) — run from `back/`:**
```bash
cd back
uvicorn app.main:app --reload          # Dev server
uvicorn app.main:app --host 0.0.0.0    # Production
# API docs at /docs
```

**Backend tests — run from `back/`:**
```bash
cd back
BYPASS_AUTH=true pytest                # All tests (DB_URL env must be set)
BYPASS_AUTH=true pytest tests/test_sessions.py   # Single test file
BYPASS_AUTH=true pytest -k "test_health"         # Single test by name
```
Default test DB from `conftest.py`: `mysql+aiomysql://root:password@localhost:3306/gukak_test`

**Frontend (Expo) — run from `front/`:**
```bash
cd front
npm install
npm start                  # Expo dev server (Metro)
npm run android            # Build + run Android
npm run ios                # Build + run iOS
npm test                   # Vitest (unit tests, no device needed)
npm run test:watch         # Vitest watch
npm run typecheck          # tsc --noEmit
```

**AI pipelines — run from `AI/`:**
```bash
cd AI
python pipeline/02_training/train_markov.py      # Train → .pkl files
python pipeline/01_preprocessing/audio_preprocess.py <file>
```

## Architecture

### Product Identity (Important)
- Official name: **GARAK**, subtitle: **AI GUGAK STUDIO**
- MVP instruments: 가야금, 장구, 대금
- **Session** (PerformanceEvent log) is the primary data unit; Recording/Export are derived
- AI does not synthesize audio — it analyzes the event stream to recommend 장단 presets
- 장단 recommendations are never auto-applied — user must preview and accept
- Login is optional (guest flow by default; login required only for cloud sync)

### Backend (`back/app/`)

```
back/app/
  api/          # FastAPI route handlers (one file per domain)
  core/         # Config (Settings via pydantic-settings), auth dependency
  db/           # Async SQLAlchemy session factory
  models/       # ORM models: Session, PerformanceEvent, Recording, Track,
                #   JangdanRecommendation, ShareLink, FolkSong, SampleAsset,
                #   DataReference, Instrument
  repositories/ # DB query functions (async SQLAlchemy)
  schemas/      # Pydantic request/response schemas
  services/     # Business logic: ai_client.py (stub → AI module),
                #   claude_client.py (Anthropic API), translate_service.py,
                #   session_service.py, auth_service.py
```

**All API routes** (prefix `/api`):

| Route | Method | Purpose |
|-------|--------|---------|
| `/auth/google` | POST | Exchange Google ID token for JWT |
| `/instruments` | GET | List available instruments |
| `/jangdan-presets` | GET | List jangdan presets |
| `/sessions` | POST/GET | Create/list sessions |
| `/sessions/{id}` | GET/PATCH/DELETE | Session CRUD + PerformanceEvents |
| `/tracks` | POST/GET | Track management |
| `/analyze` | POST | Detect 조 + 장단 from PerformanceEvents |
| `/accompaniment` | POST | Generate Markov-chain jangdan recommendation |
| `/audio-exports` | POST/GET | Export session audio |
| `/feedback` | POST | Claude API practice feedback |
| `/share` | POST | Create share link |
| `/folk-songs` | GET | Folk song reference data |

**Authentication:** `Authorization: Bearer {JWT}` (issued by `/api/auth/google`). Set `BYPASS_AUTH=true` in `.env` for local dev/tests. Public: `/`, `/docs`, `/health`.

### Frontend (`front/src/`)

```
front/src/
  domain/       # Core domain types: PerformanceEvent, Session, Jangdan,
                #   SampleManifest, DataReferenceManifest, ReplayPlanner
  product/      # Product state machine + all screen content components
  screen-flow/  # Screen FSM: screenFlowMachine + screenDefinitions (S01–S23)
  studio/       # Work/Track/Take data model and studioLibrary helpers
  audio/        # Sampler engine abstractions + Expo and RNAA implementations
  interaction/  # Touch/gesture models for instrument surfaces
  prototype/    # Prototype/QA tooling (handoff, session replay, probe controllers)
  config/       # Build config
  qa/           # QA script commands (readiness reports, smoke tests)
```

**State Management:** Redux-style reducer (`applyProductAction`) + async effects (`runGarakProductEffect`). No Zustand/Redux library — pure functions. State is `GarakProductState`, actions are `GarakProductAction`.

**Service layer pattern:** `garakProductServices.ts` defines the `GarakProductServices` interface (AI, audio, share, library, account). Implementations:
- `garakHttpProductServices.ts` — HTTP implementation for production
- `createNoopGarakProductServices()` — no-op stubs for development without a backend

**Screen content files** (in `front/src/product/`):
- `freeCreationScreens.tsx` — S03–S10B (free play, layer editor, accompaniment)
- `practiceScreens.tsx` — S13–S16 (song select, performance, result)
- `libraryScreens.tsx` — S17–S18 (library, player detail)
- `shareScreens.tsx` — S19–S21 (share feed, detail, prepare)
- `settingsScreens.tsx` — S02, S22–S23 (language, login sync, settings)
- `authScreens.tsx` — auth flow screens

**Main wiring:** `GarakScreenFlowApp.tsx` owns state, instantiates the sampler engine, and routes screen IDs to content components.

**Screen IDs:** S01 (Home) → S03 (Mode select) → S04/S04A (Instrument select) → S05 (Free play) → S07 (Layer editor) → S13–S16 (Practice) → S17–S21 (Share/Library) → S22–S23 (Account). Use `screenFlowMachine.ts` for transitions; never hard-navigate by ID without going through `transitionScreenFlow`.

**Audio architecture:**
- `react-native-audio-api`: low-latency WAV playback node graph (sample → GainNode → speaker), <10ms tap-to-sound
- `expo-audio`: recording to AAC (must coordinate with audio-api on iOS to avoid session conflicts)
- Sampler engine is abstracted behind `samplerEngine.ts` — swap Expo/RNAA implementations without touching the rest of the codebase

### AI Integration
`ai_client.py` (in `back/app/services/`) is the bridge. CPU-bound calls must use `asyncio.to_thread()` or `loop.run_in_executor()` to avoid blocking the event loop. `AI/` models (`.pkl` files) are loaded at server startup; paths are configured via `AI_MODULE_PATH`, `MODELS_DIR`, `SEGMENTS_DIR` env vars.

### Domain Terminology
- **장단** (jangdan): rhythmic pattern; 9 types (자진모리, 굿거리, 중모리, 중중모리, 휘모리, 엇모리, 엇중모리, 세마치, 진양조)
- **조** (key): 평조 or 계면조 (detected by cosine similarity to scale templates)
- **PerformanceEvent**: the canonical representation of any user input (pluck, hit, tone hole)
- **Session**: ordered log of PerformanceEvents with metadata
- **Work**: local multi-track composition (tracks = instrument recordings + accompaniment tracks)
- **Take**: a single recorded segment within a track

## Key Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `DB_URL` | `back/.env` | `mysql+aiomysql://user:pw@host/gukak` |
| `GOOGLE_CLIENT_ID` | `back/.env` | Verify Google ID tokens for JWT issuance |
| `JWT_SECRET_KEY` | `back/.env` | Sign/verify JWTs (must be strong in prod) |
| `JWT_EXPIRE_MINUTES` | `back/.env` | Access token TTL (default 60) |
| `JWT_REFRESH_EXPIRE_DAYS` | `back/.env` | Refresh token TTL (default 30) |
| `CLAUDE_API_KEY` | `back/.env` | Anthropic API for practice feedback |
| `GOOGLE_TRANSLATE_API_KEY` | `back/.env` | Translate AI-generated text at runtime |
| `SERVER_BASE_URL` | `back/.env` | Audio file URL prefix (default `http://localhost:8000`) |
| `AI_MODULE_PATH` | `back/.env` | Path to AI module (default `../ai`) |
| `MODELS_DIR` | `back/.env` | Markov `.pkl` files (default `../AI/models`) |
| `BYPASS_AUTH` | `back/.env` | Skip JWT verification for dev/tests |

## Coding Conventions

**Git branches:** `<type>/<issue-number>-<short-keyword>` (e.g. `feat/12-login`). Feature branches target `develop`; `main` is deploy-only.

**Commit messages:** `<type>: <summary>` (e.g. `feat: 장단 추천 API 연동`). Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `revert`.

**Frontend rules (enforced by convention, not tooling):**
- Domain code (`front/src/domain/`) must not import from React Native APIs
- UI gestures must go through `GestureMapper` → `PerformanceEvent`; never stored raw
- Audio library imports are only allowed inside `SamplerEngine` implementation files
- TypeScript strict mode is always on

## i18n Strategy
- Fixed UI strings: `react-i18next` with hand-written JSON — Korean gugak terms must be manually translated
- Dynamic AI-generated text: Google Translate API at runtime
- `front/src/product/garakProductState.ts` carries `language: 'ko' | 'en'` in state

## File Upload Constraint
Audio uploads capped at 10 MB. Static files served from `/static/audio/` (created at startup by lifespan hook in `app/main.py`).

## Agent Read Order (frontend)
For frontend tasks, read in this order before editing:
1. `front/CONTEXT.md`
2. `front/docs/document-authority-index.md`
3. `front/docs/product/garak-product-brief.md`
4. `front/docs/product/screen-flow/current-screen-flow.md`
5. `front/docs/domain/README.md`
6. `front/docs/system/conventions.md`

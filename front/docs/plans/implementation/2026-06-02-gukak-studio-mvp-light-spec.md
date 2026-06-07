# GUKAK STUDIO MVP Light Spec Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first testable skeleton for the GUKAK STUDIO 12-string gayageum MVP: event-driven session data, gesture-to-performance mapping, sample manifests, jangdan recommendation, and a prototype shell ready for real audio-engine validation.

**Architecture:** Start with pure TypeScript domain modules that can be tested without a device. Keep UI, audio library implementation, and public-data preprocessing behind narrow interfaces so Day 5 audio engine decisions can swap implementation without rewriting the domain model.

**Tech Stack:** Expo + React Native + TypeScript, Vitest for pure domain tests, `expo-audio` and `react-native-audio-api` as later spike candidates behind `SamplerEngine`.

> Stack source of truth: `docs/architecture/tech-stack.md`. This implementation plan was written before the MVP stack was finalized; if package names, version examples, or scope notes conflict with `docs/architecture/tech-stack.md`, follow `docs/architecture/tech-stack.md`.

> Documentation source of truth: `docs/README.md`. Before executing this plan, read `CONTEXT.md`, `docs/domain/README.md`, `docs/architecture/runtime-architecture.md`, and `docs/architecture/tech-stack.md`.

> Day 5 hard gate: do not expand into studio/demo work until real-device QA confirms touch-to-sound latency, 8-voice polyphony, pitch bend, glissando, mute release, and session fallback criteria.

---

## Scope

This is a light implementation spec, not the full production build. It creates the smallest code structure that protects the core product decisions from `CONTEXT.md`.

### In Scope

- Type-safe `PerformanceEvent` vocabulary
- `Session` vs `Recording` separation
- `SampleAssetManifest` and `DataReferenceManifest` separation
- Pure `GestureMapper`
- Pure `JangdanMatcher`
- `SamplerEngine` interface and `FakeSamplerEngine`
- Minimal Expo prototype screen wiring 12 strings to events
- Day 5 device QA checklist

### Out of Scope

- Real gayageum sample sourcing
- Real audio engine implementation
- Cloud storage and auth
- DAW timeline editing
- Generated audio AI
- Internal community or sharing backend

---

## File Structure

```text
package.json
app.json
tsconfig.json
vitest.config.ts
app/index.tsx
src/domain/performanceEvent.ts
src/domain/session.ts
src/domain/sampleManifest.ts
src/domain/dataReferenceManifest.ts
src/domain/jangdan.ts
src/domain/__tests__/performanceEvent.test.ts
src/domain/__tests__/session.test.ts
src/domain/__tests__/sampleManifest.test.ts
src/domain/__tests__/jangdan.test.ts
src/interaction/gestureMapper.ts
src/interaction/__tests__/gestureMapper.test.ts
src/audio/samplerEngine.ts
src/audio/fakeSamplerEngine.ts
src/audio/__tests__/fakeSamplerEngine.test.ts
src/prototype/GayageumPrototypeScreen.tsx
docs/qa/day-5-audio-engine-checklist.md
```

Responsibilities:

- `src/domain/*`: Pure domain vocabulary and deterministic rules.
- `src/interaction/gestureMapper.ts`: Converts raw UI gestures into `PerformanceEvent`.
- `src/audio/*`: Defines the audio execution boundary, without choosing the real engine yet.
- `src/prototype/*`: Minimal UI shell for manual/device testing.
- `docs/qa/*`: Human-run validation criteria for latency and audio behavior.

---

## Task 1: Scaffold Expo + Test Harness

**Files:**
- Create: `package.json`
- Create: `app.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `app/index.tsx`

- [ ] **Step 1: Create the initial Expo app files**

Create `package.json`:

```json
{
  "name": "gukak-studio",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@expo/metro-runtime": "^6.1.2",
    "expo": "^54.0.0",
    "expo-router": "^6.0.0",
    "react": "^19.1.0",
    "react-native": "^0.81.0",
    "react-native-gesture-handler": "^2.28.0",
    "react-native-reanimated": "^4.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "typescript": "^5.9.0",
    "vitest": "^3.2.0"
  }
}
```

Create `app.json`:

```json
{
  "expo": {
    "name": "GUKAK STUDIO",
    "slug": "gukak-studio",
    "scheme": "gukakstudio",
    "orientation": "landscape",
    "plugins": ["expo-router"],
    "android": {
      "package": "com.gukakstudio.prototype"
    },
    "ios": {
      "bundleIdentifier": "com.gukakstudio.prototype"
    }
  }
}
```

Create `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["app", "src", "vitest.config.ts"]
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

Create `app/index.tsx`:

```tsx
import { GayageumPrototypeScreen } from '../src/prototype/GayageumPrototypeScreen';

export default function Index() {
  return <GayageumPrototypeScreen />;
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: dependencies install without peer dependency errors that block Expo startup.

- [ ] **Step 3: Run tests to verify harness**

Run:

```bash
npm test
```

Expected: Vitest runs and reports no test files or no tests yet. This confirms the test runner starts.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json tsconfig.json vitest.config.ts app/index.tsx
git commit -m "chore: scaffold expo prototype"
```

---

## Task 2: Define PerformanceEvent Vocabulary

**Files:**
- Create: `src/domain/performanceEvent.ts`
- Test: `src/domain/__tests__/performanceEvent.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/domain/__tests__/performanceEvent.test.ts`:

```ts
import { clampBendCents, createStringPluck, createStringBend } from '../performanceEvent';

test('creates string pluck events with timestamp and string index', () => {
  const event = createStringPluck({ tsMs: 120, stringIndex: 4, velocity: 0.8 });

  expect(event).toEqual({
    type: 'string_pluck',
    tsMs: 120,
    stringIndex: 4,
    velocity: 0.8,
  });
});

test('clamps bend cents to the MVP safe range', () => {
  expect(clampBendCents(180)).toBe(120);
  expect(clampBendCents(-180)).toBe(-120);
  expect(clampBendCents(35)).toBe(35);
});

test('creates string bend events with clamped cents', () => {
  const event = createStringBend({ tsMs: 240, stringIndex: 7, cents: 160 });

  expect(event).toEqual({
    type: 'string_bend',
    tsMs: 240,
    stringIndex: 7,
    cents: 120,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test src/domain/__tests__/performanceEvent.test.ts
```

Expected: FAIL because `../performanceEvent` does not exist.

- [ ] **Step 3: Implement the domain event module**

Create `src/domain/performanceEvent.ts`:

```ts
export type PerformanceEvent =
  | { type: 'string_pluck'; tsMs: number; stringIndex: number; velocity: number }
  | { type: 'string_bend'; tsMs: number; stringIndex: number; cents: number }
  | { type: 'string_mute'; tsMs: number; stringIndex: number; strength: number }
  | { type: 'glissando_step'; tsMs: number; stringIndex: number; velocity: number }
  | { type: 'string_release'; tsMs: number; stringIndex: number };

export const MIN_STRING_INDEX = 1;
export const MAX_STRING_INDEX = 12;
export const MAX_BEND_CENTS = 120;

export function assertStringIndex(stringIndex: number): void {
  if (!Number.isInteger(stringIndex) || stringIndex < MIN_STRING_INDEX || stringIndex > MAX_STRING_INDEX) {
    throw new Error(`stringIndex must be an integer from 1 to 12. Received: ${stringIndex}`);
  }
}

export function clampBendCents(cents: number): number {
  return Math.max(-MAX_BEND_CENTS, Math.min(MAX_BEND_CENTS, cents));
}

export function createStringPluck(input: {
  tsMs: number;
  stringIndex: number;
  velocity: number;
}): PerformanceEvent {
  assertStringIndex(input.stringIndex);
  return {
    type: 'string_pluck',
    tsMs: input.tsMs,
    stringIndex: input.stringIndex,
    velocity: Math.max(0, Math.min(1, input.velocity)),
  };
}

export function createStringBend(input: {
  tsMs: number;
  stringIndex: number;
  cents: number;
}): PerformanceEvent {
  assertStringIndex(input.stringIndex);
  return {
    type: 'string_bend',
    tsMs: input.tsMs,
    stringIndex: input.stringIndex,
    cents: clampBendCents(input.cents),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test src/domain/__tests__/performanceEvent.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/performanceEvent.ts src/domain/__tests__/performanceEvent.test.ts
git commit -m "feat: define performance event vocabulary"
```

---

## Task 3: Define Sample and Data Reference Manifests

**Files:**
- Create: `src/domain/sampleManifest.ts`
- Create: `src/domain/dataReferenceManifest.ts`
- Test: `src/domain/__tests__/sampleManifest.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/domain/__tests__/sampleManifest.test.ts`:

```ts
import { validateSampleAssetManifest } from '../sampleManifest';
import { validateDataReferenceManifest } from '../dataReferenceManifest';

test('sample manifest only allows playable asset layers', () => {
  const manifest = validateSampleAssetManifest({
    version: '2026-06-02-dev',
    assets: [
      {
        id: 'gayageum-01',
        instrument: 'gayageum_12',
        stringIndex: 1,
        pitchHz: 196,
        fileUri: 'asset://gayageum/01.wav',
        sourceLayer: 'public_asset',
        sourceName: 'NIGAK digital sound candidate',
        licenseNote: 'Public use candidate; verify before release',
      },
    ],
  });

  expect(manifest.assets[0].sourceLayer).toBe('public_asset');
});

test('sample manifest rejects analysis references as playable assets', () => {
  expect(() =>
    validateSampleAssetManifest({
      version: 'bad',
      assets: [
        {
          id: 'analysis-only',
          instrument: 'gayageum_12',
          stringIndex: 1,
          pitchHz: 196,
          fileUri: 'asset://bad.wav',
          sourceLayer: 'analysis_reference',
          sourceName: 'AI Hub',
          licenseNote: 'not playable',
        },
      ],
    }),
  ).toThrow('sourceLayer must be public_asset or own_asset');
});

test('data reference manifest allows analysis and validation references', () => {
  const manifest = validateDataReferenceManifest({
    version: '2026-06-02-dev',
    references: [
      {
        id: 'aihub-gugak-score-audio',
        referenceLayer: 'analysis_reference',
        sourceName: 'AI Hub 국악 악보 및 음원 데이터',
        usage: 'pitch/envelope/jangdan analysis reference',
      },
    ],
  });

  expect(manifest.references[0].referenceLayer).toBe('analysis_reference');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test src/domain/__tests__/sampleManifest.test.ts
```

Expected: FAIL because manifest modules do not exist.

- [ ] **Step 3: Implement manifest modules**

Create `src/domain/sampleManifest.ts`:

```ts
import { assertStringIndex } from './performanceEvent';

export type SampleSourceLayer = 'public_asset' | 'own_asset';

export type SampleAsset = {
  id: string;
  instrument: 'gayageum_12';
  stringIndex: number;
  pitchHz: number;
  fileUri: string;
  sourceLayer: SampleSourceLayer;
  sourceName: string;
  licenseNote: string;
};

export type SampleAssetManifest = {
  version: string;
  assets: SampleAsset[];
};

export function validateSampleAssetManifest(manifest: SampleAssetManifest): SampleAssetManifest {
  if (!manifest.version) {
    throw new Error('SampleAssetManifest.version is required');
  }
  if (!Array.isArray(manifest.assets)) {
    throw new Error('SampleAssetManifest.assets must be an array');
  }

  for (const asset of manifest.assets) {
    assertStringIndex(asset.stringIndex);
    if (asset.sourceLayer !== 'public_asset' && asset.sourceLayer !== 'own_asset') {
      throw new Error('sourceLayer must be public_asset or own_asset');
    }
    if (!asset.fileUri) {
      throw new Error(`SampleAsset ${asset.id} must include fileUri`);
    }
  }

  return manifest;
}
```

Create `src/domain/dataReferenceManifest.ts`:

```ts
export type ReferenceLayer = 'analysis_reference' | 'validation_reference';

export type DataReference = {
  id: string;
  referenceLayer: ReferenceLayer;
  sourceName: string;
  usage: string;
};

export type DataReferenceManifest = {
  version: string;
  references: DataReference[];
};

export function validateDataReferenceManifest(manifest: DataReferenceManifest): DataReferenceManifest {
  if (!manifest.version) {
    throw new Error('DataReferenceManifest.version is required');
  }
  if (!Array.isArray(manifest.references)) {
    throw new Error('DataReferenceManifest.references must be an array');
  }

  for (const reference of manifest.references) {
    if (reference.referenceLayer !== 'analysis_reference' && reference.referenceLayer !== 'validation_reference') {
      throw new Error('referenceLayer must be analysis_reference or validation_reference');
    }
    if (!reference.sourceName || !reference.usage) {
      throw new Error(`DataReference ${reference.id} must include sourceName and usage`);
    }
  }

  return manifest;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test src/domain/__tests__/sampleManifest.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/sampleManifest.ts src/domain/dataReferenceManifest.ts src/domain/__tests__/sampleManifest.test.ts
git commit -m "feat: separate sample and data reference manifests"
```

---

## Task 4: Implement GestureMapper

**Files:**
- Create: `src/interaction/gestureMapper.ts`
- Test: `src/interaction/__tests__/gestureMapper.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/interaction/__tests__/gestureMapper.test.ts`:

```ts
import { mapTap, mapHoldDrag, mapSwipeAcrossStrings, mapCover } from '../gestureMapper';

test('maps a tap to string_pluck', () => {
  expect(mapTap({ tsMs: 100, stringIndex: 3 })).toEqual({
    type: 'string_pluck',
    tsMs: 100,
    stringIndex: 3,
    velocity: 1,
  });
});

test('maps hold drag distance to clamped string_bend cents', () => {
  expect(mapHoldDrag({ tsMs: 200, stringIndex: 3, normalizedDelta: 2 })).toEqual({
    type: 'string_bend',
    tsMs: 200,
    stringIndex: 3,
    cents: 120,
  });
});

test('maps a swipe path to glissando steps', () => {
  expect(mapSwipeAcrossStrings({ tsMs: 300, stringIndexes: [2, 3, 4] })).toEqual([
    { type: 'glissando_step', tsMs: 300, stringIndex: 2, velocity: 1 },
    { type: 'glissando_step', tsMs: 316, stringIndex: 3, velocity: 1 },
    { type: 'glissando_step', tsMs: 332, stringIndex: 4, velocity: 1 },
  ]);
});

test('maps cover to string_mute', () => {
  expect(mapCover({ tsMs: 400, stringIndex: 5, area: 0.8 })).toEqual({
    type: 'string_mute',
    tsMs: 400,
    stringIndex: 5,
    strength: 0.8,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test src/interaction/__tests__/gestureMapper.test.ts
```

Expected: FAIL because `gestureMapper` does not exist.

- [ ] **Step 3: Implement GestureMapper**

Create `src/interaction/gestureMapper.ts`:

```ts
import { PerformanceEvent, assertStringIndex, clampBendCents, createStringPluck } from '../domain/performanceEvent';

export function mapTap(input: { tsMs: number; stringIndex: number; velocity?: number }): PerformanceEvent {
  return createStringPluck({
    tsMs: input.tsMs,
    stringIndex: input.stringIndex,
    velocity: input.velocity ?? 1,
  });
}

export function mapHoldDrag(input: {
  tsMs: number;
  stringIndex: number;
  normalizedDelta: number;
}): PerformanceEvent {
  assertStringIndex(input.stringIndex);
  return {
    type: 'string_bend',
    tsMs: input.tsMs,
    stringIndex: input.stringIndex,
    cents: clampBendCents(input.normalizedDelta * 60),
  };
}

export function mapSwipeAcrossStrings(input: {
  tsMs: number;
  stringIndexes: number[];
  velocity?: number;
}): PerformanceEvent[] {
  return input.stringIndexes.map((stringIndex, index) => {
    assertStringIndex(stringIndex);
    return {
      type: 'glissando_step',
      tsMs: input.tsMs + index * 16,
      stringIndex,
      velocity: Math.max(0, Math.min(1, input.velocity ?? 1)),
    };
  });
}

export function mapCover(input: {
  tsMs: number;
  stringIndex: number;
  area: number;
}): PerformanceEvent {
  assertStringIndex(input.stringIndex);
  return {
    type: 'string_mute',
    tsMs: input.tsMs,
    stringIndex: input.stringIndex,
    strength: Math.max(0, Math.min(1, input.area)),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test src/interaction/__tests__/gestureMapper.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/interaction/gestureMapper.ts src/interaction/__tests__/gestureMapper.test.ts
git commit -m "feat: map gestures to performance events"
```

---

## Task 5: Implement Session Model

**Files:**
- Create: `src/domain/session.ts`
- Test: `src/domain/__tests__/session.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/domain/__tests__/session.test.ts`:

```ts
import { createEmptySession, appendPerformanceEvent } from '../session';

test('creates a session with manifest version and no recording requirement', () => {
  const session = createEmptySession({
    id: 'session-1',
    createdAt: '2026-06-02T00:00:00.000Z',
    sampleAssetManifestVersion: '2026-06-02-dev',
  });

  expect(session.recordingUri).toBeUndefined();
  expect(session.events).toEqual([]);
});

test('appends performance events without requiring audio capture', () => {
  const session = createEmptySession({
    id: 'session-1',
    createdAt: '2026-06-02T00:00:00.000Z',
    sampleAssetManifestVersion: '2026-06-02-dev',
  });

  const next = appendPerformanceEvent(session, {
    type: 'string_pluck',
    tsMs: 100,
    stringIndex: 1,
    velocity: 1,
  });

  expect(next.events).toHaveLength(1);
  expect(next.recordingUri).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test src/domain/__tests__/session.test.ts
```

Expected: FAIL because `session` does not exist.

- [ ] **Step 3: Implement Session model**

Create `src/domain/session.ts`:

```ts
import { PerformanceEvent } from './performanceEvent';

export type Session = {
  id: string;
  createdAt: string;
  sampleAssetManifestVersion: string;
  events: PerformanceEvent[];
  recordingUri?: string;
  bpmEstimate?: number;
  densityEstimate?: 'low' | 'medium' | 'high';
  jangdanRecommendation?: 'jungmori' | 'gutgeori' | 'jajinmori';
};

export function createEmptySession(input: {
  id: string;
  createdAt: string;
  sampleAssetManifestVersion: string;
}): Session {
  return {
    id: input.id,
    createdAt: input.createdAt,
    sampleAssetManifestVersion: input.sampleAssetManifestVersion,
    events: [],
  };
}

export function appendPerformanceEvent(session: Session, event: PerformanceEvent): Session {
  return {
    ...session,
    events: [...session.events, event],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test src/domain/__tests__/session.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/session.ts src/domain/__tests__/session.test.ts
git commit -m "feat: define event-first session model"
```

---

## Task 6: Implement JangdanMatcher

**Files:**
- Create: `src/domain/jangdan.ts`
- Test: `src/domain/__tests__/jangdan.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/domain/__tests__/jangdan.test.ts`:

```ts
import { recommendJangdan } from '../jangdan';
import { PerformanceEvent } from '../performanceEvent';

function plucks(tsValues: number[]): PerformanceEvent[] {
  return tsValues.map((tsMs, index) => ({
    type: 'string_pluck',
    tsMs,
    stringIndex: (index % 12) + 1,
    velocity: 1,
  }));
}

test('recommends jungmori for slow sparse playing', () => {
  const result = recommendJangdan(plucks([0, 900, 1800, 2700]));

  expect(result.jangdan).toBe('jungmori');
  expect(result.reason).toContain('slow tempo');
});

test('recommends gutgeori for medium tempo playing', () => {
  const result = recommendJangdan(plucks([0, 650, 1300, 1950, 2600]));

  expect(result.jangdan).toBe('gutgeori');
});

test('recommends jajinmori for fast dense playing', () => {
  const result = recommendJangdan(plucks([0, 300, 600, 900, 1200, 1500, 1800]));

  expect(result.jangdan).toBe('jajinmori');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test src/domain/__tests__/jangdan.test.ts
```

Expected: FAIL because `jangdan` does not exist.

- [ ] **Step 3: Implement JangdanMatcher**

Create `src/domain/jangdan.ts`:

```ts
import { PerformanceEvent } from './performanceEvent';

export type JangdanName = 'jungmori' | 'gutgeori' | 'jajinmori';

export type JangdanRecommendation = {
  jangdan: JangdanName;
  score: number;
  bpmEstimate: number;
  density: 'low' | 'medium' | 'high';
  reason: string;
};

export function estimateBpm(events: PerformanceEvent[]): number {
  const pluckTimes = events
    .filter((event) => event.type === 'string_pluck' || event.type === 'glissando_step')
    .map((event) => event.tsMs)
    .sort((a, b) => a - b);

  if (pluckTimes.length < 2) {
    return 80;
  }

  const intervals = pluckTimes.slice(1).map((time, index) => time - pluckTimes[index]);
  const averageIntervalMs = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  return Math.round(60000 / averageIntervalMs);
}

export function estimateDensity(events: PerformanceEvent[]): 'low' | 'medium' | 'high' {
  const pluckLikeEvents = events.filter((event) => event.type === 'string_pluck' || event.type === 'glissando_step');
  if (pluckLikeEvents.length <= 4) return 'low';
  if (pluckLikeEvents.length <= 6) return 'medium';
  return 'high';
}

export function recommendJangdan(events: PerformanceEvent[]): JangdanRecommendation {
  const bpmEstimate = estimateBpm(events);
  const density = estimateDensity(events);

  if (bpmEstimate <= 75 && density === 'low') {
    return {
      jangdan: 'jungmori',
      score: 0.8,
      bpmEstimate,
      density,
      reason: 'slow tempo and low density suggest jungmori',
    };
  }

  if (bpmEstimate >= 160 || density === 'high') {
    return {
      jangdan: 'jajinmori',
      score: 0.75,
      bpmEstimate,
      density,
      reason: 'fast tempo or high density suggest jajinmori',
    };
  }

  return {
    jangdan: 'gutgeori',
    score: 0.7,
    bpmEstimate,
    density,
    reason: 'medium tempo and density suggest gutgeori',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test src/domain/__tests__/jangdan.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/jangdan.ts src/domain/__tests__/jangdan.test.ts
git commit -m "feat: add explainable jangdan matcher"
```

---

## Task 7: Define SamplerEngine Boundary

**Files:**
- Create: `src/audio/samplerEngine.ts`
- Create: `src/audio/fakeSamplerEngine.ts`
- Test: `src/audio/__tests__/fakeSamplerEngine.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/audio/__tests__/fakeSamplerEngine.test.ts`:

```ts
import { FakeSamplerEngine } from '../fakeSamplerEngine';

test('records pluck and bend commands from performance events', () => {
  const engine = new FakeSamplerEngine();

  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 });
  engine.handleEvent({ type: 'string_bend', tsMs: 120, stringIndex: 1, cents: 40 });

  expect(engine.commands).toEqual([
    'pluck:string=1:velocity=1',
    'bend:string=1:cents=40',
  ]);
});

test('tracks voice budget with voice stealing', () => {
  const engine = new FakeSamplerEngine({ maxVoices: 2 });

  engine.handleEvent({ type: 'string_pluck', tsMs: 0, stringIndex: 1, velocity: 1 });
  engine.handleEvent({ type: 'string_pluck', tsMs: 10, stringIndex: 2, velocity: 1 });
  engine.handleEvent({ type: 'string_pluck', tsMs: 20, stringIndex: 3, velocity: 1 });

  expect(engine.activeVoices).toHaveLength(2);
  expect(engine.commands).toContain('steal:voice=voice-1');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test src/audio/__tests__/fakeSamplerEngine.test.ts
```

Expected: FAIL because audio modules do not exist.

- [ ] **Step 3: Implement SamplerEngine and fake engine**

Create `src/audio/samplerEngine.ts`:

```ts
import { PerformanceEvent } from '../domain/performanceEvent';

export type VoiceState = {
  voiceId: string;
  stringIndex: number;
  startedAtMs: number;
  pitchBendCents: number;
  gain: number;
  envelopeState: 'attack' | 'sustain' | 'release' | 'ended';
};

export interface SamplerEngine {
  handleEvent(event: PerformanceEvent): void;
}
```

Create `src/audio/fakeSamplerEngine.ts`:

```ts
import { PerformanceEvent } from '../domain/performanceEvent';
import { SamplerEngine, VoiceState } from './samplerEngine';

export class FakeSamplerEngine implements SamplerEngine {
  readonly commands: string[] = [];
  readonly activeVoices: VoiceState[] = [];
  private readonly maxVoices: number;
  private nextVoiceNumber = 1;

  constructor(input: { maxVoices?: number } = {}) {
    this.maxVoices = input.maxVoices ?? 8;
  }

  handleEvent(event: PerformanceEvent): void {
    if (event.type === 'string_pluck' || event.type === 'glissando_step') {
      this.allocateVoice(event.stringIndex, event.tsMs);
      this.commands.push(`pluck:string=${event.stringIndex}:velocity=${event.velocity}`);
      return;
    }

    if (event.type === 'string_bend') {
      this.commands.push(`bend:string=${event.stringIndex}:cents=${event.cents}`);
      return;
    }

    if (event.type === 'string_mute') {
      this.commands.push(`mute:string=${event.stringIndex}:strength=${event.strength}`);
      return;
    }

    this.commands.push(`release:string=${event.stringIndex}`);
  }

  private allocateVoice(stringIndex: number, startedAtMs: number): void {
    if (this.activeVoices.length >= this.maxVoices) {
      const stolen = this.activeVoices.shift();
      if (stolen) {
        this.commands.push(`steal:voice=${stolen.voiceId}`);
      }
    }

    this.activeVoices.push({
      voiceId: `voice-${this.nextVoiceNumber++}`,
      stringIndex,
      startedAtMs,
      pitchBendCents: 0,
      gain: 1,
      envelopeState: 'attack',
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test src/audio/__tests__/fakeSamplerEngine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/audio/samplerEngine.ts src/audio/fakeSamplerEngine.ts src/audio/__tests__/fakeSamplerEngine.test.ts
git commit -m "feat: define sampler engine boundary"
```

---

## Task 8: Add Minimal Prototype Screen

**Files:**
- Create: `src/prototype/GayageumPrototypeScreen.tsx`

- [ ] **Step 1: Create prototype screen**

Create `src/prototype/GayageumPrototypeScreen.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FakeSamplerEngine } from '../audio/fakeSamplerEngine';
import { PerformanceEvent } from '../domain/performanceEvent';
import { appendPerformanceEvent, createEmptySession } from '../domain/session';
import { mapTap } from '../interaction/gestureMapper';

const STRING_COUNT = 12;

export function GayageumPrototypeScreen() {
  const engine = useMemo(() => new FakeSamplerEngine(), []);
  const [session, setSession] = useState(() =>
    createEmptySession({
      id: 'local-prototype-session',
      createdAt: new Date().toISOString(),
      sampleAssetManifestVersion: 'prototype-empty-manifest',
    }),
  );

  function handleStringPress(stringIndex: number) {
    const event = mapTap({ tsMs: Date.now(), stringIndex });
    engine.handleEvent(event);
    setSession((current) => appendPerformanceEvent(current, event));
  }

  const latestEvent: PerformanceEvent | undefined = session.events.at(-1);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>GUKAK STUDIO 12-String Prototype</Text>
      <View style={styles.instrument}>
        {Array.from({ length: STRING_COUNT }, (_, index) => {
          const stringIndex = index + 1;
          return (
            <Pressable
              key={stringIndex}
              accessibilityRole="button"
              accessibilityLabel={`Gayageum string ${stringIndex}`}
              onPress={() => handleStringPress(stringIndex)}
              style={styles.string}
            >
              <Text style={styles.stringLabel}>{stringIndex}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView style={styles.inspector}>
        <Text style={styles.inspectorTitle}>Prototype Inspector</Text>
        <Text>Events: {session.events.length}</Text>
        <Text>Latest: {latestEvent ? JSON.stringify(latestEvent) : 'none'}</Text>
        <Text>Audio commands: {engine.commands.join(' | ') || 'none'}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#15120f',
    padding: 24,
    gap: 16,
  },
  title: {
    color: '#f7efe3',
    fontSize: 22,
    fontWeight: '700',
  },
  instrument: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: '#241a13',
    borderRadius: 8,
    padding: 18,
  },
  string: {
    height: 18,
    borderRadius: 9,
    backgroundColor: '#d6b26b',
    justifyContent: 'center',
    paddingLeft: 10,
  },
  stringLabel: {
    color: '#16110d',
    fontSize: 11,
    fontWeight: '700',
  },
  inspector: {
    maxHeight: 120,
    backgroundColor: '#f7efe3',
    borderRadius: 8,
    padding: 12,
  },
  inspectorTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
});
```

- [ ] **Step 2: Run domain tests**

Run:

```bash
npm test
```

Expected: all domain and fake audio tests pass.

- [ ] **Step 3: Run prototype on a physical device**

Run:

```bash
npm run android
```

Expected: the app opens on a physical Android device or dev client. Pressing strings increments event count and inspector shows `string_pluck` events.

- [ ] **Step 4: Commit**

```bash
git add src/prototype/GayageumPrototypeScreen.tsx
git commit -m "feat: add gayageum prototype screen"
```

---

## Task 9: Add Day 5 QA Checklist

**Files:**
- Create: `docs/qa/day-5-audio-engine-checklist.md`

- [ ] **Step 1: Create QA checklist**

Create `docs/qa/day-5-audio-engine-checklist.md`:

```markdown
# Day 5 Audio Engine Checklist

Target: choose the real SamplerEngine implementation only after physical-device validation.

## Device Setup

- Device model:
- OS version:
- Wired headphones/speaker:
- Bluetooth disabled during primary latency test:
- Build type: Expo dev build / native debug / native release

## Pass Criteria

| Check | Pass Criteria | Result |
| --- | --- | --- |
| Touch-to-sound latency | Perceived delay is absent; target <= 50ms |  |
| Polyphony | 8 simultaneous voices play without dropouts |  |
| Pitch bend | hold-drag bend has no click noise or abrupt jumps |  |
| Glissando | swiping across 12 strings triggers every string in order |  |
| Mute | cover/mute fades out without pop noise |  |
| Preload | no file I/O or loading spinner during normal play |  |
| Session fallback | event log remains available if audio capture fails |  |

## Decision

- PASS: all core loop criteria pass.
- PASS_WITH_LIMITS: core loop passes, recording or jangdan is unstable.
- FAIL: tap, polyphony, bend, or mute fails.

## Notes

Record exact failure symptoms and device conditions here.
```

- [ ] **Step 2: Commit**

```bash
git add docs/qa/day-5-audio-engine-checklist.md
git commit -m "docs: add day 5 audio engine checklist"
```

---

## Self-Review

### Spec Coverage

- `CONTEXT.md` product identity: covered by scope and MVP boundaries.
- Gayageum as instrument engine, not buttons: covered by `PerformanceEvent`, `GestureMapper`, `SamplerEngine`.
- Session vs Recording: covered by `Session` model and optional `recordingUri`.
- Public Asset vs Analysis Reference: covered by separate manifests.
- AI/Jangdan: covered by explainable `JangdanMatcher`.
- MVP boundaries: covered by out-of-scope and fake engine boundary.

### Placeholder Scan

No `TBD`, `TODO`, or “implement later” placeholders are allowed in this plan. Every code-producing step includes explicit file content.

### Type Consistency

Use these exact names across tasks:

- `PerformanceEvent`
- `SampleAssetManifest`
- `DataReferenceManifest`
- `Session`
- `JangdanRecommendation`
- `SamplerEngine`
- `FakeSamplerEngine`
- `GayageumPrototypeScreen`

---

## Execution Handoff

Plan complete and saved to `docs/plans/implementation/2026-06-02-gukak-studio-mvp-light-spec.md`. Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - execute tasks in this session using superpowers:executing-plans, batch execution with checkpoints.

Do not start implementation without choosing an execution mode.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| Garry Tan Plan Review | `/plan-ceo-review` style | Scope, source-of-truth, execution risk | 1 | FIXED | HOLD SCOPE; documentation gates, moved source-of-truth paths, Day 5 hard gate added |
| Eng Review | existing review | Architecture and tests | 1 | APPLIED | Prior architecture/data model gaps were folded into proposal and canonical docs |
| CEO Review | existing review | Product validation | 1 | APPLIED | User/market validation gates were folded into proposal |

- **UNRESOLVED:** 0 known documentation-structure blockers.
- **VERDICT:** Documentation gates added; plan is ready for implementation only after reading `docs/README.md`, `docs/domain/README.md`, and `docs/architecture/tech-stack.md`.

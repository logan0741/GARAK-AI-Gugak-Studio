import { expect, test } from 'vitest';
import { EngineDispatchFailure, SessionReplayDispatchResult } from '../gayageumPrototypeController';
import {
  clearPrototypeSessionReplayDispatchStatus,
  createInitialPrototypeSessionReplayDispatchStatus,
  createPrototypeSessionReplayDispatchStatus,
  formatPrototypeSessionReplayDispatchStatus,
} from '../prototypeSessionReplayDispatchStatus';

test('starts with no replay dispatch evidence', () => {
  const status = createInitialPrototypeSessionReplayDispatchStatus();

  expect(status).toEqual({
    status: 'none',
    text: 'none',
  });
  expect(formatPrototypeSessionReplayDispatchStatus(status)).toBe('none');
});

test('formats successful replay dispatch with event count', () => {
  const status = createPrototypeSessionReplayDispatchStatus({
    dispatch: {
      handledEvents: 12,
      ok: true,
      totalEvents: 12,
    },
    events: new Array(12).fill({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 }),
    ok: true,
    schedule: {
      durationMs: 176,
      items: [],
      sampleAssetManifestVersion: 'manifest-v1',
      sessionId: 'session-1',
    },
    status: 'dispatched',
  } as SessionReplayDispatchResult);

  expect(status).toEqual({
    eventCount: 12,
    status: 'dispatched',
    text: 'Replay dispatched: 12 events',
  });
  expect(formatPrototypeSessionReplayDispatchStatus(status)).toBe(
    'Replay dispatched: 12 events',
  );
});

test('formats replay planning failure without dispatch evidence', () => {
  const status = createPrototypeSessionReplayDispatchStatus({
    errorMessage: 'SampleAssetManifest version mismatch',
    events: [],
    ok: false,
    status: 'planning_failed',
  });

  expect(status).toEqual({
    errorMessage: 'SampleAssetManifest version mismatch',
    status: 'failed',
    text: 'Replay failed: SampleAssetManifest version mismatch',
  });
});

test('formats replay dispatch failure from the engine failure message', () => {
  const dispatchFailure: EngineDispatchFailure = {
    errorMessage: 'voice allocation failed',
    failedEvent: { type: 'string_mute', tsMs: 180, stringIndex: 1, strength: 1 },
    failedEventIndex: 1,
    handledEvents: 1,
    ok: false,
    totalEvents: 2,
  };

  const status = createPrototypeSessionReplayDispatchStatus({
    dispatch: dispatchFailure,
    errorMessage: 'voice allocation failed',
    events: [
      { type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 },
      { type: 'string_mute', tsMs: 180, stringIndex: 1, strength: 1 },
    ],
    ok: false,
    schedule: {
      durationMs: 80,
      items: [],
      sampleAssetManifestVersion: 'manifest-v1',
      sessionId: 'session-1',
    },
    status: 'dispatch_failed',
  });

  expect(status).toEqual({
    errorMessage:
      'failed after 1/2 events at index 1: voice allocation failed; event={"type":"string_mute","tsMs":180,"stringIndex":1,"strength":1}',
    status: 'failed',
    text: 'Replay failed: failed after 1/2 events at index 1: voice allocation failed; event={"type":"string_mute","tsMs":180,"stringIndex":1,"strength":1}',
  });
});

test('clears stale replay dispatch evidence after new session events are appended', () => {
  expect(clearPrototypeSessionReplayDispatchStatus()).toEqual({
    status: 'none',
    text: 'none',
  });
});

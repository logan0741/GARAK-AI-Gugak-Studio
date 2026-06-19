import { expect, test } from 'vitest';
import { FakeSamplerEngine } from '../fakeSamplerEngine';

test('records pluck and bend commands from performance events', () => {
  const engine = new FakeSamplerEngine();

  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: 1 });
  engine.handleEvent({ type: 'string_bend', tsMs: 120, stringIndex: 1, cents: 40 });

  expect(engine.commands).toEqual(['pluck:string=1:velocity=1', 'bend:string=1:cents=40']);
  expect(engine.activeVoices[0]).toMatchObject({
    stringIndex: 1,
    pitchBendCents: 40,
    envelopeState: 'attack',
  });
});

test('tracks voice budget with voice stealing', () => {
  const engine = new FakeSamplerEngine({ maxVoices: 2 });

  engine.handleEvent({ type: 'string_pluck', tsMs: 0, stringIndex: 1, velocity: 1 });
  engine.handleEvent({ type: 'string_pluck', tsMs: 10, stringIndex: 2, velocity: 1 });
  engine.handleEvent({ type: 'string_pluck', tsMs: 20, stringIndex: 3, velocity: 1 });

  expect(engine.activeVoices).toHaveLength(2);
  expect(engine.activeVoices.map((voice) => voice.stringIndex)).toEqual([2, 3]);
  expect(engine.commands).toContain('steal:voice=voice-1');
});

test('rejects invalid fake voice budgets before prototype counter setup', () => {
  for (const maxVoices of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
    expect(() => new FakeSamplerEngine({ maxVoices })).toThrow(
      'maxVoices must be a positive integer',
    );
  }
});

test('rejects non-finite fake playback controls before updating prototype counters', () => {
  const engine = new FakeSamplerEngine();

  expect(() =>
    engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 1, velocity: Number.NaN }),
  ).toThrow('velocity must be finite');
  expect(() =>
    engine.handleEvent({ type: 'string_bend', tsMs: 110, stringIndex: 1, cents: Number.POSITIVE_INFINITY }),
  ).toThrow('cents must be finite');
  expect(() =>
    engine.handleEvent({ type: 'string_mute', tsMs: 120, stringIndex: 1, strength: Number.NaN }),
  ).toThrow('strength must be finite');

  expect(engine.commands).toEqual([]);
  expect(engine.activeVoices).toEqual([]);
});

test('rejects invalid fake performance event identity before updating prototype counters', () => {
  const engine = new FakeSamplerEngine();

  expect(() =>
    engine.handleEvent({ type: 'string_pluck', tsMs: Number.NaN, stringIndex: 1, velocity: 1 }),
  ).toThrow('tsMs must be finite');
  expect(() =>
    engine.handleEvent({ type: 'string_bend', tsMs: 110, stringIndex: 13, cents: 20 }),
  ).toThrow('stringIndex must be an integer from 1 to 12. Received: 13');

  expect(engine.commands).toEqual([]);
  expect(engine.activeVoices).toEqual([]);
});

test('maps mute and release events to release envelope state', () => {
  const engine = new FakeSamplerEngine();

  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 5, velocity: 0.9 });
  engine.handleEvent({ type: 'string_mute', tsMs: 140, stringIndex: 5, strength: 0.7 });
  engine.handleEvent({ type: 'string_release', tsMs: 180, stringIndex: 5 });

  expect(engine.commands).toEqual([
    'pluck:string=5:velocity=0.9',
    'mute:string=5:strength=0.7',
    'release:string=5',
  ]);
  expect(engine.activeVoices[0].envelopeState).toBe('release');
  expect(engine.activeVoices[0].gain).toBe(0.3);
});

test('exposes commands and active voices as immutable snapshots', () => {
  const engine = new FakeSamplerEngine();

  engine.handleEvent({ type: 'string_pluck', tsMs: 100, stringIndex: 5, velocity: 0.9 });

  const commands = engine.commands;
  const voices = engine.activeVoices;
  commands.push('external-mutation');
  voices[0].gain = 0;

  expect(engine.commands).toEqual(['pluck:string=5:velocity=0.9']);
  expect(engine.activeVoices[0].gain).toBe(1);
});

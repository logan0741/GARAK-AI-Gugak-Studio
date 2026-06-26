import { expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  AudioContext: vi.fn(function FakeAudioContext(this: { options: unknown }, options: unknown) {
    this.options = options;
  }),
}));

vi.mock('react-native-audio-api', () => ({
  AudioContext: mocks.AudioContext,
}));

test('creates a react-native-audio-api runtime backed by the installed package', async () => {
  const { createReactNativeAudioApiRuntimePort } = await import('../reactNativeAudioApiRuntime');
  const runtime = createReactNativeAudioApiRuntimePort({ sampleRate: 48_000 });

  const context = runtime.createAudioContext();

  expect(mocks.AudioContext).toHaveBeenCalledWith({ sampleRate: 48_000 });
  expect(context).toBeInstanceOf(mocks.AudioContext);
});

test('uses a 44100 Hz context by default for the Week 1 candidate', async () => {
  const { createReactNativeAudioApiRuntimePort } = await import('../reactNativeAudioApiRuntime');
  const runtime = createReactNativeAudioApiRuntimePort();

  runtime.createAudioContext();

  expect(mocks.AudioContext).toHaveBeenLastCalledWith({ sampleRate: 44_100 });
});

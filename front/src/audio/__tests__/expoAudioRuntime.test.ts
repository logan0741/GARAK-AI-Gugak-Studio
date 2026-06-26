import { expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const recorderConstructor = vi.fn(function FakeRecorder(this: { options: unknown }, options: unknown) {
    this.options = options;
  });

  return {
    createAudioPlayer: vi.fn(() => ({ play: vi.fn() })),
    requestRecordingPermissionsAsync: vi.fn(async () => ({ granted: true })),
    setAudioModeAsync: vi.fn(async () => undefined),
    recordingPreset: { extension: '.m4a' },
    processedRecordingPreset: { extension: '.m4a', audioQuality: 127 },
    recorderConstructor,
    createRecordingOptions: vi.fn(),
    resolveSourceWithDownload: vi.fn(),
  };
});

vi.mock('expo-audio', () => ({
  createAudioPlayer: mocks.createAudioPlayer,
  requestRecordingPermissionsAsync: mocks.requestRecordingPermissionsAsync,
  setAudioModeAsync: mocks.setAudioModeAsync,
  RecordingPresets: {
    HIGH_QUALITY: mocks.recordingPreset,
  },
}));

vi.mock('expo-audio/build/utils/options', () => ({
  createRecordingOptions: mocks.createRecordingOptions,
}));

vi.mock('expo-audio/build/utils/resolveSource', () => ({
  resolveSourceWithDownload: mocks.resolveSourceWithDownload,
}));

vi.mock('expo-audio/build/AudioModule', () => ({
  default: {
    AudioRecorder: mocks.recorderConstructor,
  },
}));

test('creates an Expo Audio runtime port backed by the installed package', async () => {
  mocks.createRecordingOptions.mockReturnValue(mocks.processedRecordingPreset);
  mocks.resolveSourceWithDownload.mockResolvedValue({ uri: 'file://cached/gayageum/01.wav' });
  const { createExpoAudioRuntimePort } = await import('../expoAudioRuntime');
  const runtime = createExpoAudioRuntimePort();
  const mode = {
    allowsBackgroundRecording: false,
    allowsRecording: false,
    interruptionMode: 'mixWithOthers' as const,
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  };

  await runtime.setAudioModeAsync(mode);
  const player = runtime.createAudioPlayer(
    { uri: 'asset://gayageum/01.wav' },
    { downloadFirst: false, keepAudioSessionActive: true, updateInterval: 50 },
  );
  const downloaded = await runtime.downloadAudioSource({ uri: 'asset://gayageum/01.wav' });
  const permission = await runtime.requestRecordingPermissionsAsync();
  const recorder = runtime.createAudioRecorder();

  expect(mocks.setAudioModeAsync).toHaveBeenCalledWith(mode);
  expect(mocks.createAudioPlayer).toHaveBeenCalledWith(
    { uri: 'asset://gayageum/01.wav' },
    { downloadFirst: false, keepAudioSessionActive: true, updateInterval: 50 },
  );
  expect(mocks.resolveSourceWithDownload).toHaveBeenCalledWith({ uri: 'asset://gayageum/01.wav' });
  expect(downloaded).toEqual({ uri: 'file://cached/gayageum/01.wav' });
  expect(player).toEqual({ play: expect.any(Function) });
  expect(permission).toEqual({ granted: true });
  expect(mocks.createRecordingOptions).toHaveBeenCalledWith(mocks.recordingPreset);
  expect(mocks.recorderConstructor).toHaveBeenCalledWith(mocks.processedRecordingPreset);
  expect(recorder).toBeInstanceOf(mocks.recorderConstructor);
});

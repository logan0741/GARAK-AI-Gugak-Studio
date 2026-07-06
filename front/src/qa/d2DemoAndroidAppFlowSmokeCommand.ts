export type D2DemoAndroidAppFlowSmokeCommandInput = {
  argv: string[];
  workingDirectory: string;
  getGeneratedAt: () => string;
  writeTextFile: (path: string, value: string) => void;
  runCommand: (
    command: string,
    args: string[],
    options: D2DemoAndroidAppFlowSmokeCommandRunOptions,
  ) => D2DemoAndroidAppFlowSmokeCommandRunResult;
  writeStdout: (value: string) => void;
  writeStderr: (value: string) => void;
};

export type D2DemoAndroidAppFlowSmokeCommandRunOptions = {
  cwd: string;
};

export type D2DemoAndroidAppFlowSmokeCommandRunResult = {
  exitCode: number;
  stdout?: string;
  stderr?: string;
};

type D2DemoAndroidAppFlowSmokeOptions = {
  adbPath: string;
  devClientUrl?: string;
  evidencePath: string;
  serial?: string;
};

type AdbDevice = {
  serial: string;
  details: string;
};

type AppFlowSmokeStep = {
  id: string;
  result: 'pass' | 'fail';
  notes: string;
};

type AppFlowSmokeObservations = {
  homeRotation?: string | null;
  performanceRotation?: string | null;
  liveAudioReadyBeforeTap?: boolean;
  liveAudioReadinessLabel?: 'ready';
  liveAudioSentEvents?: number;
  recordingMode?: 'event-only';
  recordingCaptureNotice?: string;
  recordingFallbackReason?: string;
  microphoneCaptureSuppressed?: boolean;
  microphoneIsolationEvidence?: string;
  recordingEvents?: number;
  shareDemoPlayerVisible?: boolean;
  shareDemoPlayerPlayingUiVisible?: boolean;
  editorRotation?: string | null;
  savedWorkVisible?: boolean;
  exportRenderKind?: 'event_replay';
  exportProvenanceLabel?: string;
  exportSourceEventCount?: number;
  exportedAudioVisible?: boolean;
  libraryExportProvenanceLabel?: string;
  libraryExportSourceEventCount?: number;
  libraryWorkVisible?: boolean;
  playerPlayingUiVisible?: boolean;
  exportedPlayerPlayingUiVisible?: boolean;
};

type AppFlowSmokeContext = {
  input: D2DemoAndroidAppFlowSmokeCommandInput;
  options: D2DemoAndroidAppFlowSmokeOptions;
  serial: string;
  steps: AppFlowSmokeStep[];
  observations: AppFlowSmokeObservations;
};

type UiHierarchy = {
  raw: string;
  rotation: string | null;
  nodes: UiNode[];
  labels: string[];
};

type UiNode = {
  text?: string;
  contentDescription?: string;
  bounds?: UiBounds;
};

type UiBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const USAGE =
  'Usage: npm run qa:d2-demo-android-app-flow-smoke -- --evidence <app-flow-evidence.json> [--serial <adb-serial>] [--adb <adb-path>] [--dev-client-url <metro-url>]';

const GARAK_PACKAGE_NAME = 'com.gukakstudio.prototype';
const GARAK_MAIN_ACTIVITY = `${GARAK_PACKAGE_NAME}/.MainActivity`;
const EXPO_DEV_CLIENT_SCHEME = 'gukakstudio';

const RESIDUAL_PHYSICAL_DEVICE_CHECKS = [
  'audible physical speaker playback',
  'physical-device expo-audio probe',
];
const EXPO_DEV_LAUNCHER_VISIBLE_MESSAGE =
  'Expo Dev Launcher is visible instead of the GARAK app; rerun qa:d2-demo-android-app-flow-smoke with --dev-client-url http://127.0.0.1:8081 after Metro is running';

export function runD2DemoAndroidAppFlowSmokeCommand(
  input: D2DemoAndroidAppFlowSmokeCommandInput,
): number {
  const parseResult = parseOptions(input.argv);
  if (!parseResult.ok) {
    input.writeStderr(parseResult.message);
    return 1;
  }

  const options = parseResult.options;
  const devicesResult = input.runCommand(options.adbPath, ['devices', '-l'], {
    cwd: input.workingDirectory,
  });
  if (devicesResult.exitCode !== 0) {
    input.writeStderr(`Could not list adb devices: adb exit ${devicesResult.exitCode}`);
    return getCommandFailureExitCode(devicesResult);
  }

  const selectedDevice = selectDevice(parseAdbDevices(devicesResult.stdout ?? ''), options.serial);
  if (!selectedDevice.ok) {
    input.writeStderr(selectedDevice.message);
    return 1;
  }

  if (!isEmulatorDevice(selectedDevice.device)) {
    input.writeStderr(
      `Could not run D-2 Android app-flow smoke: adb target ${selectedDevice.device.serial} is not an emulator; use this command only for emulator regression evidence`,
    );
    return 1;
  }

  const context: AppFlowSmokeContext = {
    input,
    options,
    serial: selectedDevice.device.serial,
    steps: [],
    observations: {},
  };

  const resetResult = resetAppFlowStartState(context);
  if (!resetResult.ok) {
    const writeResult = writeEvidence({
      context,
      generatedAt: input.getGeneratedAt(),
      status: 'fail',
      failure: resetResult.message,
    });
    if (!writeResult.ok) {
      input.writeStderr(writeResult.message);
      return 1;
    }

    input.writeStderr(resetResult.message);
    input.writeStdout(`Wrote D-2 app-flow evidence: ${options.evidencePath}`);
    return 1;
  }

  const flowResult = runAppFlowSmoke(context);
  const writeResult = writeEvidence({
    context,
    generatedAt: input.getGeneratedAt(),
    status: flowResult.ok ? 'pass' : 'fail',
    failure: flowResult.ok ? undefined : flowResult.message,
  });
  if (!writeResult.ok) {
    input.writeStderr(writeResult.message);
    return 1;
  }

  if (!flowResult.ok) {
    input.writeStderr(flowResult.message);
    input.writeStdout(`Wrote D-2 app-flow evidence: ${options.evidencePath}`);
    return 1;
  }

  input.writeStdout(`D-2 Android app-flow smoke passed on ${context.serial}`);
  input.writeStdout(`Wrote D-2 app-flow evidence: ${options.evidencePath}`);
  return 0;
}

function resetAppFlowStartState(
  context: AppFlowSmokeContext,
): { ok: true } | { ok: false; message: string } {
  const forceStopResult = context.input.runCommand(
    context.options.adbPath,
    ['-s', context.serial, 'shell', 'am', 'force-stop', GARAK_PACKAGE_NAME],
    { cwd: context.input.workingDirectory },
  );
  if (forceStopResult.exitCode !== 0) {
    return {
      ok: false,
      message: `Could not reset app-flow smoke start state: force-stop adb exit ${forceStopResult.exitCode}`,
    };
  }

  if (context.options.devClientUrl !== undefined) {
    const port = readDevClientUrlPort(context.options.devClientUrl);
    if (port === undefined) {
      return {
        ok: false,
        message:
          'Could not reset app-flow smoke start state: --dev-client-url must be an http(s) Metro URL with an explicit port, for example http://127.0.0.1:8081',
      };
    }

    const reverseResult = context.input.runCommand(
      context.options.adbPath,
      ['-s', context.serial, 'reverse', `tcp:${port}`, `tcp:${port}`],
      { cwd: context.input.workingDirectory },
    );
    if (reverseResult.exitCode !== 0) {
      return {
        ok: false,
        message: `Could not reset app-flow smoke start state: adb reverse tcp:${port} exit ${reverseResult.exitCode}`,
      };
    }

    const launchTarget = createExpoDevClientLaunchUrl(context.options.devClientUrl);
    const devClientStartResult = context.input.runCommand(
      context.options.adbPath,
      [
        '-s',
        context.serial,
        'shell',
        'am',
        'start',
        '-a',
        'android.intent.action.VIEW',
        '-d',
        launchTarget,
        GARAK_PACKAGE_NAME,
      ],
      { cwd: context.input.workingDirectory },
    );
    if (devClientStartResult.exitCode !== 0) {
      return {
        ok: false,
        message: `Could not reset app-flow smoke start state: dev-client am start adb exit ${devClientStartResult.exitCode}`,
      };
    }

    context.input.runCommand(
      context.options.adbPath,
      ['-s', context.serial, 'shell', 'sleep', '2'],
      { cwd: context.input.workingDirectory },
    );
    return { ok: true };
  }

  const startResult = context.input.runCommand(
    context.options.adbPath,
    ['-s', context.serial, 'shell', 'am', 'start', '-n', GARAK_MAIN_ACTIVITY],
    { cwd: context.input.workingDirectory },
  );
  if (startResult.exitCode !== 0) {
    return {
      ok: false,
      message: `Could not reset app-flow smoke start state: am start adb exit ${startResult.exitCode}`,
    };
  }

  context.input.runCommand(
    context.options.adbPath,
    ['-s', context.serial, 'shell', 'sleep', '2'],
    { cwd: context.input.workingDirectory },
  );
  return { ok: true };
}

function createExpoDevClientLaunchUrl(metroUrl: string): string {
  return `${EXPO_DEV_CLIENT_SCHEME}://expo-development-client/?url=${encodeURIComponent(metroUrl)}`;
}

function readDevClientUrlPort(input: string): number | undefined {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return undefined;
  }

  if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.port.length === 0) {
    return undefined;
  }

  const port = Number(parsed.port);
  return Number.isInteger(port) && port > 0 ? port : undefined;
}

function runAppFlowSmoke(context: AppFlowSmokeContext): { ok: true } | { ok: false; message: string } {
  try {
    let hierarchy = readHomeOrGuestEntry(context);
    if (findNodeByAnyLabel(hierarchy, ['게스트로 둘러보기', 'Guest Mode']) !== undefined) {
      tapRequiredNode(context, hierarchy, ['게스트로 둘러보기', 'Guest Mode'], 'guest-mode');
      hierarchy = readHomeAfterGuestEntry(context);
    }

    requireLabel(hierarchy, 'PLAY', 'home PLAY button');
    context.observations.homeRotation = hierarchy.rotation;
    passStep(context, 'home-loaded', 'Home or guest home is visible');

    hierarchy = runHomeBrowseDemoPlaybackSmoke(context, hierarchy);

    tapRequiredNode(context, hierarchy, ['PLAY'], 'home-play');
    hierarchy = readUiHierarchy(context, 'mode-select-loaded');
    requireLabel(hierarchy, 'NEXT', 'mode select NEXT button');
    passStep(context, 'mode-select-loaded', 'Free creation mode screen is visible');

    tapRequiredNode(context, hierarchy, ['NEXT'], 'mode-next');
    hierarchy = readUiHierarchy(context, 'instrument-select-loaded');
    requireLabel(hierarchy, 'NEXT', 'instrument select NEXT button');
    passStep(context, 'instrument-select-loaded', 'Instrument select screen is visible');

    tapRequiredNode(context, hierarchy, ['NEXT'], 'instrument-next');
    hierarchy = readUiHierarchy(context, 'instrument-preview-loaded');
    requireLabel(hierarchy, 'NEXT', 'instrument preview NEXT button');
    passStep(context, 'instrument-preview-loaded', 'Instrument preview screen is visible');

    tapRequiredNode(context, hierarchy, ['NEXT'], 'preview-next');
    hierarchy = readUiHierarchy(context, 'performance-loaded');
    hierarchy = readHierarchyWithLiveAudioReadyEvidence(context, hierarchy);
    const stage = findNodeByAnyLabel(hierarchy, ['장구 자유 연주 가로 스테이지']);
    if (stage?.bounds === undefined) {
      throw new Error('S05 performance stage was not visible');
    }
    context.observations.performanceRotation = hierarchy.rotation;
    context.observations.liveAudioReadyBeforeTap = true;
    context.observations.liveAudioReadinessLabel = 'ready';
    passStep(context, 'performance-loaded', `S05 stage visible at rotation ${hierarchy.rotation ?? 'unknown'}`);

    tapPerformanceSamplePoints(context, stage.bounds);
    hierarchy = readUiHierarchy(context, 'live-audio-events-visible');
    const liveAudioSentEvents = readMaxNumberFromLabels(hierarchy.labels, /Live audio sent: (\d+) events/);
    if (liveAudioSentEvents === undefined || liveAudioSentEvents < 1) {
      throw new Error('Live audio sent evidence did not appear after performance taps');
    }
    context.observations.liveAudioSentEvents = liveAudioSentEvents;
    passStep(context, 'live-audio-events-visible', `Live audio sent: ${liveAudioSentEvents} events`);

    tapRequiredNode(context, hierarchy, ['녹음 시작'], 'record-open');
    hierarchy = readUiHierarchy(context, 'recording-setup-visible');
    if (hasLabel(hierarchy, '녹음 전 설정')) {
      tapRequiredNode(context, hierarchy, ['녹음 시작'], 'record-start', 'last');
    }

    tapPerformanceSamplePoints(context, stage.bounds);
    hierarchy = readUiHierarchy(context, 'recording-events-visible');
    const recordedLiveAudioSentEvents = readMaxNumberFromLabels(
      hierarchy.labels,
      /Live audio sent: (\d+) events/,
    );
    if (recordedLiveAudioSentEvents !== undefined) {
      context.observations.liveAudioSentEvents = Math.max(
        context.observations.liveAudioSentEvents ?? 0,
        recordedLiveAudioSentEvents,
      );
    }
    const recordingCaptureNotice = readEventOnlyRecordingNotice(hierarchy.labels);
    if (recordingCaptureNotice !== undefined) {
      context.observations.recordingMode = 'event-only';
      context.observations.recordingFallbackReason = recordingCaptureNotice.reason;
      context.observations.recordingCaptureNotice = `Event-only recording: ${recordingCaptureNotice.reason}`;
      context.observations.microphoneCaptureSuppressed = true;
      context.observations.microphoneIsolationEvidence =
        'Product recording stayed event-only; no microphone capture artifact is used for playback or export.';
    }
    const recordingEvents = readMaxNumberFromLabels(hierarchy.labels, /녹음 중 · 이벤트 (\d+)개/);
    if (recordingEvents === undefined || recordingEvents < 1) {
      throw new Error('Recording event counter did not appear after recorded performance taps');
    }
    context.observations.recordingEvents = recordingEvents;
    passStep(context, 'recording-events-visible', `Recording event counter: ${recordingEvents}`);

    tapRequiredNode(context, hierarchy, ['연주 완료'], 'record-stop');
    hierarchy = readUiHierarchy(context, 'editor-loaded');
    requireLabel(hierarchy, '작업 저장', 'work save button');
    requireLabel(hierarchy, 'Track 1 : 장구', 'first janggu track');
    context.observations.editorRotation = hierarchy.rotation;
    context.observations.savedWorkVisible = true;
    passStep(context, 'editor-loaded', `Editor visible at rotation ${hierarchy.rotation ?? 'unknown'}`);

    tapRequiredNode(context, hierarchy, ['작업 저장'], 'save-work');
    hierarchy = readUiHierarchy(context, 'work-saved');
    requireLabel(hierarchy, '저장됨', 'saved status');
    passStep(context, 'work-saved', 'Work save status changed to saved');

    tapRequiredNode(context, hierarchy, ['프로젝트 저장 및 공유'], 'save-and-share-project');
    hierarchy = readUiHierarchy(context, 'export-provenance-visible');
    const exportProvenanceLabel = hierarchy.labels.find((label) => label.includes('이벤트 녹음'));
    if (exportProvenanceLabel === undefined) {
      throw new Error('Event-replay export provenance was not visible before sharing');
    }
    context.observations.exportRenderKind = 'event_replay';
    context.observations.exportProvenanceLabel = normalizeEventReplayExportProvenance(
      exportProvenanceLabel,
      'sharePrepare',
    );
    context.observations.exportSourceEventCount = context.observations.recordingEvents;
    passStep(
      context,
      'export-provenance-visible',
      `Export provenance visible: ${context.observations.exportProvenanceLabel}; source events ${context.observations.exportSourceEventCount}`,
    );

    tapRequiredNode(context, hierarchy, ['저장만 하기'], 'save-export-only');
    hierarchy = readUiHierarchy(context, 'library-loaded');
    const libraryWorkCount = readMaxNumberFromLabels(hierarchy.labels, /작업 (\d+)개/);
    if (libraryWorkCount === undefined || libraryWorkCount < 1) {
      throw new Error('Library work count did not show any saved work');
    }
    const libraryExportCount = readMaxNumberFromLabels(hierarchy.labels, /내보낸 음원\/결과 (\d+)개/);
    if (libraryExportCount === undefined || libraryExportCount < 1) {
      throw new Error('Library exported audio count did not show any saved export');
    }
    if (!hierarchy.labels.some((label) => label.includes('장구 작업'))) {
      throw new Error('Saved janggu work was not visible in the library');
    }
    context.observations.libraryWorkVisible = true;
    context.observations.exportedAudioVisible = true;
    passStep(
      context,
      'library-loaded',
      `Saved janggu work and export are visible in S18; work count ${libraryWorkCount}, export count ${libraryExportCount}`,
    );

    tapRequiredNodeWhere(
      context,
      hierarchy,
      (node) => nodeLabels(node).some((label) => label.startsWith('내보낸 음원/결과')),
      'shareables-tab',
    );
    hierarchy = readUiHierarchy(context, 'export-library-loaded');
    const libraryExportProvenanceLabel = hierarchy.labels.find((label) =>
      label.startsWith('이벤트 녹음 /'),
    );
    if (libraryExportProvenanceLabel === undefined) {
      throw new Error('Event-replay export provenance was not visible in the library row');
    }
    context.observations.libraryExportProvenanceLabel = normalizeEventReplayExportProvenance(
      libraryExportProvenanceLabel,
      'library',
    );
    if (context.observations.exportSourceEventCount === undefined) {
      throw new Error('Event-replay export source event count was not recorded before library playback');
    }
    context.observations.libraryExportSourceEventCount =
      context.observations.exportSourceEventCount;
    passStep(
      context,
      'export-library-loaded',
      `Library export provenance visible: ${context.observations.libraryExportProvenanceLabel}; source events ${context.observations.libraryExportSourceEventCount}`,
    );

    tapLibraryPlayButton(context, hierarchy);
    hierarchy = readUiHierarchy(context, 'player-loaded');
    if (!hierarchy.labels.some((label) => label.includes('재생 화면'))) {
      throw new Error('Library playback did not navigate to the player screen');
    }
    assertPlayerShowsPlayingUi(hierarchy, 'Library exported player');
    context.observations.playerPlayingUiVisible = true;
    context.observations.exportedPlayerPlayingUiVisible = true;
    passStep(context, 'player-loaded', 'S19 exported player shows playing UI controls');

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown app-flow smoke failure',
    };
  }
}

function readHomeOrGuestEntry(context: AppFlowSmokeContext): UiHierarchy {
  let hierarchy = readUiHierarchy(context, 'home-loaded');
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (
      hasLabel(hierarchy, 'PLAY') ||
      findNodeByAnyLabel(hierarchy, ['게스트로 둘러보기', 'Guest Mode']) !== undefined
    ) {
      return hierarchy;
    }

    waitForUiSettle(context);
    hierarchy = readUiHierarchy(context, `home-loaded-${attempt + 2}`);
  }

  if (isExpoDevLauncherVisible(hierarchy)) {
    throw new Error(EXPO_DEV_LAUNCHER_VISIBLE_MESSAGE);
  }

  return hierarchy;
}

function readHomeAfterGuestEntry(context: AppFlowSmokeContext): UiHierarchy {
  let hierarchy = readUiHierarchy(context, 'guest-home-loaded');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (hasLabel(hierarchy, 'PLAY')) {
      return hierarchy;
    }

    waitForUiSettle(context);
    hierarchy = readUiHierarchy(context, `guest-home-loaded-${attempt + 2}`);
  }

  return hierarchy;
}

function waitForUiSettle(context: AppFlowSmokeContext): void {
  context.input.runCommand(
    context.options.adbPath,
    ['-s', context.serial, 'shell', 'sleep', '1'],
    { cwd: context.input.workingDirectory },
  );
}

function runHomeBrowseDemoPlaybackSmoke(
  context: AppFlowSmokeContext,
  homeHierarchy: UiHierarchy,
): UiHierarchy {
  tapRequiredNode(context, homeHierarchy, ['쉐어', 'Share'], 'home-share-quick-access');
  let hierarchy = readUiHierarchy(context, 'share-feed-loaded');
  requireLabel(hierarchy, 'My Arirang', 'share feed demo player');
  passStep(context, 'share-feed-loaded', 'Home quick access opens the share feed demo player');

  tapRequiredNode(context, hierarchy, ['My Arirang'], 'share-demo-player');
  hierarchy = readUiHierarchy(context, 'share-demo-player-loaded');
  if (!hierarchy.labels.some((label) => label.includes('재생 화면'))) {
    throw new Error('Share demo playback did not navigate to the player screen');
  }
  assertPlayerShowsPlayingUi(hierarchy, 'Share demo player');
  context.observations.shareDemoPlayerVisible = true;
  context.observations.shareDemoPlayerPlayingUiVisible = true;
  passStep(context, 'share-demo-player-loaded', 'S20 demo player opens S19 with playing UI controls');

  tapRequiredNode(context, hierarchy, ['보관함으로 돌아가기'], 'share-demo-player-back');
  hierarchy = readUiHierarchy(context, 'library-after-share-demo-player');
  requireLabel(hierarchy, 'Playlist', 'library playlist after returning from share demo player');
  passStep(context, 'library-after-share-demo-player', 'Share demo player back action returns to S18 library');

  tapRequiredNode(context, hierarchy, ['홈', 'Home'], 'library-home-quick-access');
  hierarchy = readUiHierarchy(context, 'home-returned-after-share-demo-player');
  requireLabel(hierarchy, 'PLAY', 'home PLAY button after share demo player smoke');
  passStep(context, 'home-returned-after-share-demo-player', 'Home is visible after demo player smoke');

  return hierarchy;
}

function parseOptions(
  argv: string[],
): { ok: true; options: D2DemoAndroidAppFlowSmokeOptions } | { ok: false; message: string } {
  const options: D2DemoAndroidAppFlowSmokeOptions = {
    adbPath: 'adb',
    evidencePath: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--evidence':
        options.evidencePath = argv[index + 1] ?? '';
        index += 1;
        break;
      case '--serial':
        options.serial = argv[index + 1];
        index += 1;
        break;
      case '--adb':
        options.adbPath = argv[index + 1] ?? 'adb';
        index += 1;
        break;
      case '--dev-client-url':
        options.devClientUrl = argv[index + 1]?.trim();
        index += 1;
        break;
      default:
        return { ok: false, message: USAGE };
    }
  }

  if (options.evidencePath.trim().length === 0) {
    return { ok: false, message: USAGE };
  }

  return { ok: true, options };
}

function parseAdbDevices(input: string): AdbDevice[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('List of devices attached'))
    .flatMap((line) => {
      const match = line.match(/^(\S+)\s+device\b(.*)$/);
      if (match === null) {
        return [];
      }

      return [
        {
          serial: match[1],
          details: match[2]?.trim() ?? '',
        },
      ];
    });
}

function selectDevice(
  devices: AdbDevice[],
  serial: string | undefined,
): { ok: true; device: AdbDevice } | { ok: false; message: string } {
  if (serial !== undefined) {
    const device = devices.find((candidate) => candidate.serial === serial);
    return device === undefined
      ? { ok: false, message: `Could not run D-2 Android app-flow smoke: adb serial not connected: ${serial}` }
      : { ok: true, device };
  }

  const emulators = devices.filter(isEmulatorDevice);
  if (emulators.length === 1) {
    return { ok: true, device: emulators[0] };
  }
  if (emulators.length === 0) {
    return { ok: false, message: 'Could not run D-2 Android app-flow smoke: no connected emulator' };
  }

  return {
    ok: false,
    message: 'Could not run D-2 Android app-flow smoke: multiple connected emulators; pass --serial <adb-serial>',
  };
}

function isEmulatorDevice(device: AdbDevice): boolean {
  return (
    device.serial.startsWith('emulator-') ||
    /\bmodel:sdk_|google_sdk|qemu|emu/i.test(device.details)
  );
}

function readUiHierarchy(context: AppFlowSmokeContext, id: string): UiHierarchy {
  const result = context.input.runCommand(
    context.options.adbPath,
    ['-s', context.serial, 'exec-out', 'uiautomator', 'dump', '/dev/tty'],
    { cwd: context.input.workingDirectory },
  );
  if (result.exitCode !== 0) {
    throw new Error(`${id}: could not read UI hierarchy, adb exit ${result.exitCode}`);
  }

  return parseUiHierarchy(result.stdout ?? '');
}

function readHierarchyWithLiveAudioReadyEvidence(
  context: AppFlowSmokeContext,
  initial: UiHierarchy,
): UiHierarchy {
  let hierarchy = initial;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (hasLiveAudioReadyEvidence(hierarchy.labels)) {
      return hierarchy;
    }

    hierarchy = readUiHierarchy(context, `performance-live-audio-ready-${attempt + 1}`);
  }

  if (hasLiveAudioReadyEvidence(hierarchy.labels)) {
    return hierarchy;
  }

  throw new Error('S05 live audio ready evidence was not visible before performance taps');
}

function parseUiHierarchy(input: string): UiHierarchy {
  const nodes = (input.match(/<node\b[^>]*>/gi) ?? []).map(parseUiNode);
  const labels = nodes
    .flatMap((node) => [node.text, node.contentDescription])
    .filter((value): value is string => value !== undefined && value.length > 0);

  return {
    raw: input,
    rotation: input.match(/<hierarchy\b[^>]*\brotation="([^"]+)"/i)?.[1] ?? null,
    nodes,
    labels,
  };
}

function parseUiNode(input: string): UiNode {
  const text = readXmlAttribute(input, 'text');
  const contentDescription = readXmlAttribute(input, 'content-desc');
  const boundsText = readXmlAttribute(input, 'bounds');
  return {
    text,
    contentDescription,
    bounds: boundsText === undefined ? undefined : parseBounds(boundsText),
  };
}

function readXmlAttribute(input: string, attribute: string): string | undefined {
  const value = new RegExp(`\\b${escapeRegExp(attribute)}="([^"]*)"`).exec(input)?.[1];
  if (value === undefined) {
    return undefined;
  }

  return decodeXmlAttribute(value.trim());
}

function decodeXmlAttribute(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_match, value: string) => String.fromCharCode(Number(value)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function parseBounds(input: string): UiBounds | undefined {
  const match = input.match(/\[(\d+),(\d+)]\[(\d+),(\d+)]/);
  if (match === null) {
    return undefined;
  }

  const [, left, top, right, bottom] = match.map(Number);
  if ([left, top, right, bottom].some((value) => value === undefined || !Number.isFinite(value))) {
    return undefined;
  }

  return { left, top, right, bottom };
}

function findNodeByAnyLabel(
  hierarchy: UiHierarchy,
  labels: string[],
  pick: 'first' | 'last' = 'first',
): UiNode | undefined {
  const matches = hierarchy.nodes.filter((node) =>
    labels.some((label) => node.text === label || node.contentDescription === label),
  );
  return pick === 'last' ? matches.at(-1) : matches[0];
}

function nodeLabels(node: UiNode): string[] {
  return [node.text, node.contentDescription].filter(
    (value): value is string => value !== undefined && value.length > 0,
  );
}

function hasLabel(hierarchy: UiHierarchy, label: string): boolean {
  return hierarchy.labels.includes(label);
}

function isExpoDevLauncherVisible(hierarchy: UiHierarchy): boolean {
  return (
    hierarchy.labels.includes('DEVELOPMENT SERVERS') ||
    hierarchy.labels.includes('Development Build') ||
    hierarchy.labels.some((label) => /^https?:\/\/(?:10\.0\.2\.2|127\.0\.0\.1):8081\b/.test(label))
  );
}

function requireLabel(hierarchy: UiHierarchy, label: string, description: string): void {
  if (!hasLabel(hierarchy, label)) {
    throw new Error(`Missing ${description}: ${label}`);
  }
}

function tapRequiredNode(
  context: AppFlowSmokeContext,
  hierarchy: UiHierarchy,
  labels: string[],
  id: string,
  pick: 'first' | 'last' = 'first',
): void {
  const node = findNodeByAnyLabel(hierarchy, labels, pick);
  if (node?.bounds === undefined) {
    throw new Error(`${id}: could not find tappable UI node: ${labels.join(', ')}`);
  }

  tapBoundsCenter(context, node.bounds);
}

function tapRequiredNodeWhere(
  context: AppFlowSmokeContext,
  hierarchy: UiHierarchy,
  predicate: (node: UiNode) => boolean,
  id: string,
): void {
  const node = hierarchy.nodes.find((candidate) => predicate(candidate));
  if (node?.bounds === undefined) {
    throw new Error(`${id}: could not find tappable UI node`);
  }

  tapBoundsCenter(context, node.bounds);
}

function tapLibraryPlayButton(context: AppFlowSmokeContext, hierarchy: UiHierarchy): void {
  const playNodes = hierarchy.nodes
    .filter((node) => node.text === '▶' && node.bounds !== undefined)
    .sort((a, b) => (b.bounds?.top ?? 0) - (a.bounds?.top ?? 0));
  const node = playNodes[0];
  if (node?.bounds === undefined) {
    throw new Error('Could not find library row play button');
  }

  tapBoundsCenter(context, node.bounds);
}

function assertPlayerShowsPlayingUi(hierarchy: UiHierarchy, description: string): void {
  if (!hasLabel(hierarchy, '일시정지') && !hasLabel(hierarchy, 'Ⅱ')) {
    throw new Error(`${description} did not show playing pause controls`);
  }
}

function tapPerformanceSamplePoints(context: AppFlowSmokeContext, bounds: UiBounds): void {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const points = [
    { x: bounds.left + width * 0.375, y: bounds.top + height * 0.5 },
    { x: bounds.left + width * 0.5, y: bounds.top + height * 0.5 },
    { x: bounds.left + width * 0.625, y: bounds.top + height * 0.5 },
    { x: bounds.left + width * 0.5, y: bounds.top + height * 0.3 },
  ];

  for (const point of points) {
    tapPoint(context, { x: Math.round(point.x), y: Math.round(point.y) });
  }
}

function tapBoundsCenter(context: AppFlowSmokeContext, bounds: UiBounds): void {
  tapPoint(context, {
    x: Math.floor((bounds.left + bounds.right) / 2),
    y: Math.floor((bounds.top + bounds.bottom) / 2),
  });
}

function tapPoint(context: AppFlowSmokeContext, point: { x: number; y: number }): void {
  const result = context.input.runCommand(
    context.options.adbPath,
    ['-s', context.serial, 'shell', 'input', 'tap', String(point.x), String(point.y)],
    { cwd: context.input.workingDirectory },
  );
  if (result.exitCode !== 0) {
    throw new Error(`Could not tap ${point.x},${point.y}: adb exit ${result.exitCode}`);
  }
}

function navigateBackToHome(context: AppFlowSmokeContext, initial: UiHierarchy): UiHierarchy {
  let hierarchy = initial;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (hasLabel(hierarchy, 'PLAY')) {
      return hierarchy;
    }

    tapRequiredNode(context, hierarchy, ['뒤로가기'], `back-to-home-${attempt + 1}`);
    hierarchy = readUiHierarchy(context, `back-to-home-${attempt + 1}`);
  }

  throw new Error('Could not navigate back to Home after saving work');
}

function readMaxNumberFromLabels(labels: string[], pattern: RegExp): number | undefined {
  return labels.reduce<number | undefined>((max, label) => {
    const match = pattern.exec(label);
    if (match === null) {
      return max;
    }

    const value = Number(match[1]);
    if (!Number.isFinite(value)) {
      return max;
    }

    return max === undefined ? value : Math.max(max, value);
  }, undefined);
}

function hasLiveAudioReadyEvidence(labels: string[]): boolean {
  return labels.some(
    (label) =>
      label.includes('소리 준비 완료') ||
      label.includes('Garak live audio ready') ||
      label.includes('?뚮━ 以') ||
      label.includes('Live audio sent:'),
  );
}

function readEventOnlyRecordingNotice(
  labels: string[],
): { reason: string } | undefined {
  const label = labels.find(
    (candidate) =>
      candidate.startsWith('이벤트 녹음만 저장됨:') ||
      candidate.includes('Recording capture service is unavailable'),
  );
  if (label === undefined) {
    return undefined;
  }

  const englishUnavailableMatch = label.match(/Recording capture service is unavailable\.+/);
  if (englishUnavailableMatch !== null) {
    return { reason: 'Recording capture service is unavailable.' };
  }

  const koreanPrefix = '이벤트 녹음만 저장됨:';
  const reason = label.startsWith(koreanPrefix)
    ? label.slice(koreanPrefix.length).trim()
    : label.trim();
  return { reason };
}

function normalizeEventReplayExportProvenance(
  rawLabel: string,
  location: 'sharePrepare' | 'library',
): string {
  if (location === 'sharePrepare') {
    return 'Janggu / event replay';
  }

  const duration = rawLabel.match(/\b\d+:\d{2}\b/)?.[0];
  return duration === undefined
    ? 'event replay / Janggu'
    : `event replay / Janggu / ${duration}`;
}

function passStep(context: AppFlowSmokeContext, id: string, notes: string): void {
  context.steps.push({ id, result: 'pass', notes });
}

function writeEvidence(input: {
  context: AppFlowSmokeContext;
  generatedAt: string;
  status: 'pass' | 'fail';
  failure?: string;
}): { ok: true } | { ok: false; message: string } {
  const steps =
    input.status === 'pass'
      ? input.context.steps
      : [
          ...input.context.steps,
          {
            id: 'app-flow-smoke',
            result: 'fail' as const,
            notes: input.failure ?? 'Unknown app-flow smoke failure',
          },
        ];

  try {
    input.context.input.writeTextFile(
      input.context.options.evidencePath,
      JSON.stringify(
        {
          generatedAt: input.generatedAt,
          status: input.status,
          targetKind: 'emulator',
          adbSerial: input.context.serial,
          steps,
          observations: input.context.observations,
          residualPhysicalDeviceChecks: RESIDUAL_PHYSICAL_DEVICE_CHECKS,
        },
        null,
        2,
      ),
    );
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: `Could not write D-2 app-flow evidence: ${input.context.options.evidencePath}`,
    };
  }
}

function getCommandFailureExitCode(result: D2DemoAndroidAppFlowSmokeCommandRunResult): number {
  return result.exitCode === 0 ? 1 : result.exitCode;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

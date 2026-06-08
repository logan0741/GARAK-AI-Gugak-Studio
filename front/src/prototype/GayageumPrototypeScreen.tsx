import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import { FakeSamplerEngine } from '../audio/fakeSamplerEngine';
import { VoiceState } from '../audio/samplerEngine';
import { PerformanceEvent } from '../domain/performanceEvent';
import { createEmptySession } from '../domain/session';
import { createTouchModel, TouchFrame } from '../interaction/touchModel';
import {
  appendEventsToSession,
  planGlissando,
  safelyDispatchEventsToCurrentEngine,
} from './gayageumPrototypeController';
import {
  getPrototypeInstrumentMinimumHeight,
  PROTOTYPE_INSTRUMENT_VERTICAL_PADDING,
  PROTOTYPE_STRING_COUNT,
  PROTOTYPE_STRING_LINE_HEIGHT,
  PROTOTYPE_STRING_ROW_MIN_HEIGHT,
} from './prototypeLayout';
import {
  countPrototypeAudibleVoices,
  createInitialPrototypeQaSnapshot,
  formatPrototypeProbeDraftForInspector,
  updatePrototypeQaSnapshot,
} from './prototypeQaSnapshot';
import {
  PrototypeRecordingProbeStartResult,
  PrototypeRecordingProbeStopResult,
  startPrototypeRecordingProbe,
  stopPrototypeRecordingProbe,
} from './prototypeRecordingProbeController';
import { shouldStartPrototypeNativeAudioCandidate } from './prototypePlatform';
import { createAndPreloadPrototypeNativeSamplerEngine } from './prototypeNativeSamplerEngineFactory';
import {
  createPrototypeSamplerEngineHost,
  PrototypeNativeCandidateState,
} from './prototypeSamplerEngineHost';
import {
  PROTOTYPE_GAYAGEUM_SAMPLE_MANIFEST_VERSION,
  prototypeGayageumSampleManifest,
} from './prototypeSampleManifest';

const ALL_STRINGS = Array.from({ length: PROTOTYPE_STRING_COUNT }, (_, index) => index + 1);
const FALLBACK_INSTRUMENT_HEIGHT = getPrototypeInstrumentMinimumHeight({
  stringCount: PROTOTYPE_STRING_COUNT,
});
const PRIMARY_POINTER_ID = 'primary-touch';
const DEFAULT_PROBE_CANDIDATE: AudioEngineCandidateId = 'react-native-audio-api';
const DEFAULT_DEVICE_LABEL = 'replace-with-physical-device-model';
const PROBE_CANDIDATES: AudioEngineCandidateId[] = ['react-native-audio-api', 'expo-audio'];
const RECORDING_PROBE_SECONDS = 10;
const CAN_START_NATIVE_AUDIO_CANDIDATE = shouldStartPrototypeNativeAudioCandidate(Platform.OS);
const NATIVE_AUDIO_UNAVAILABLE_REASON = 'native audio candidate requires Expo dev build on iOS or Android';

type NativeCandidateLoadState = {
  candidate: AudioEngineCandidateId;
  state: PrototypeNativeCandidateState;
};

type RecordingProbeUiState =
  | { status: 'idle' }
  | PrototypeRecordingProbeStartResult
  | PrototypeRecordingProbeStopResult;

export function GayageumPrototypeScreen() {
  const [probeCandidate, setProbeCandidate] = useState<AudioEngineCandidateId>(DEFAULT_PROBE_CANDIDATE);
  const [nativeCandidateLoadState, setNativeCandidateLoadState] = useState<NativeCandidateLoadState>(() => ({
    candidate: DEFAULT_PROBE_CANDIDATE,
    state: CAN_START_NATIVE_AUDIO_CANDIDATE
      ? { status: 'preloading' }
      : { status: 'failed', errorMessage: NATIVE_AUDIO_UNAVAILABLE_REASON },
  }));
  useEffect(() => {
    let cancelled = false;

    if (!CAN_START_NATIVE_AUDIO_CANDIDATE) {
      setNativeCandidateLoadState({
        candidate: probeCandidate,
        state: { status: 'failed', errorMessage: NATIVE_AUDIO_UNAVAILABLE_REASON },
      });
      return () => {
        cancelled = true;
      };
    }

    setNativeCandidateLoadState({
      candidate: probeCandidate,
      state: { status: 'preloading' },
    });

    createAndPreloadPrototypeNativeSamplerEngine({
      candidate: probeCandidate,
      manifest: prototypeGayageumSampleManifest,
    })
      .then((engine) => {
        if (!cancelled) {
          setNativeCandidateLoadState({
            candidate: probeCandidate,
            state: { status: 'ready', engine },
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setNativeCandidateLoadState({
            candidate: probeCandidate,
            state: { status: 'failed', errorMessage: getErrorMessage(error) },
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [probeCandidate]);
  const nativeCandidateState =
    nativeCandidateLoadState.candidate === probeCandidate
      ? nativeCandidateLoadState.state
      : ({ status: 'preloading' } satisfies PrototypeNativeCandidateState);
  const engineHost = useMemo(
    () =>
      createPrototypeSamplerEngineHost({
        requestedCandidate: probeCandidate,
        manifest: prototypeGayageumSampleManifest,
        nativeCandidate: nativeCandidateState,
        createFakeEngine: () => new FakeSamplerEngine(),
      }),
    [nativeCandidateState, probeCandidate],
  );
  const engine = engineHost.engine;
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const [recordingProbeState, setRecordingProbeState] = useState<RecordingProbeUiState>({
    status: 'idle',
  });
  useEffect(() => {
    setRecordingProbeState({ status: 'idle' });
  }, [engineHost.activeRuntime, engineHost.requestedCandidate, engineHost.status]);
  const [instrumentHeight, setInstrumentHeight] = useState(FALLBACK_INSTRUMENT_HEIGHT);
  const touchModel = useMemo(
    () =>
      createTouchModel({
        layout: {
          topY: 0,
          height: instrumentHeight,
          stringCount: PROTOTYPE_STRING_COUNT,
        },
      }),
    [instrumentHeight],
  );
  const [session, setSession] = useState(() =>
    createEmptySession({
      id: 'local-prototype-session',
      createdAt: new Date().toISOString(),
      sampleAssetManifestVersion: PROTOTYPE_GAYAGEUM_SAMPLE_MANIFEST_VERSION,
    }),
  );
  const [qaSnapshot, setQaSnapshot] = useState(() =>
    createInitialPrototypeQaSnapshot({
      candidate: DEFAULT_PROBE_CANDIDATE,
      deviceLabel: DEFAULT_DEVICE_LABEL,
      measuredAt: new Date().toISOString(),
    }),
  );
  const [audioError, setAudioError] = useState<string | undefined>();

  function applyPerformanceEvents(events: PerformanceEvent[]) {
    if (events.length === 0) {
      return;
    }
    setSession((current) => appendEventsToSession(current, events));
    const result = safelyDispatchEventsToCurrentEngine(engineRef, events);
    const currentEngine = engineRef.current;
    setAudioError(result.ok ? undefined : result.errorMessage);
    setQaSnapshot((current) =>
      updatePrototypeQaSnapshot(current, {
        activeVoiceCount: countPrototypeAudibleVoices(getFakeEngineSnapshot(currentEngine).activeVoices),
        audioDispatchOk: result.ok,
        events,
        measuredAt: new Date().toISOString(),
      }),
    );
  }

  function handleProbeCandidatePress(candidate: AudioEngineCandidateId) {
    setProbeCandidate(candidate);
    setQaSnapshot(
      createInitialPrototypeQaSnapshot({
        candidate,
        deviceLabel: DEFAULT_DEVICE_LABEL,
        measuredAt: new Date().toISOString(),
      }),
    );
  }

  function handleGlissandoPress() {
    const events = planGlissando({
      nowMs: Date.now(),
      stringIndexes: ALL_STRINGS,
    });

    applyPerformanceEvents(events);
  }

  async function handleStartRecordingProbe() {
    const result = await startPrototypeRecordingProbe(engineRef.current, RECORDING_PROBE_SECONDS);
    setRecordingProbeState(result);
  }

  async function handleStopRecordingProbe() {
    const result = await stopPrototypeRecordingProbe(engineRef.current);
    setRecordingProbeState(result);
  }

  function handleTouchFrame(phase: TouchFrame['phase'], event: GestureResponderEvent, gestureState: PanResponderGestureState) {
    applyPerformanceEvents(
      touchModel.handleFrame({
        phase,
        pointerId: PRIMARY_POINTER_ID,
        tsMs: Date.now(),
        x: event.nativeEvent.locationX,
        y: event.nativeEvent.locationY,
        contactArea: gestureState.numberActiveTouches >= 2 ? 1 : undefined,
        force: getTouchForce(event),
      }),
    );
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event, gestureState) => handleTouchFrame('start', event, gestureState),
        onPanResponderStart: (event, gestureState) => handleTouchFrame('move', event, gestureState),
        onPanResponderMove: (event, gestureState) => handleTouchFrame('move', event, gestureState),
        onPanResponderRelease: (event, gestureState) => handleTouchFrame('end', event, gestureState),
        onPanResponderTerminate: (event, gestureState) => handleTouchFrame('cancel', event, gestureState),
      }),
    [touchModel],
  );

  const latestEvent: PerformanceEvent | undefined = session.events.at(-1);
  const fakeEngineSnapshot = getFakeEngineSnapshot(engine);
  const activeVoices = fakeEngineSnapshot.activeVoices;
  const audibleVoiceCount = countPrototypeAudibleVoices(activeVoices);
  const commands = fakeEngineSnapshot.commands;
  const probeDraftText = formatPrototypeProbeDraftForInspector(qaSnapshot);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>GUKAK STUDIO</Text>
          <Text style={styles.subtitle}>12-string gayageum spike</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play glissando across all strings"
          onPress={handleGlissandoPress}
          style={styles.glissandoButton}
        >
          <Text style={styles.glissandoButtonText}>Glissando</Text>
        </Pressable>
      </View>

      <View style={styles.probeControls}>
        {PROBE_CANDIDATES.map((candidate) => (
          <Pressable
            key={candidate}
            accessibilityRole="button"
            accessibilityLabel={`Set probe draft candidate to ${candidate}`}
            onPress={() => handleProbeCandidatePress(candidate)}
            style={[
              styles.candidateButton,
              probeCandidate === candidate ? styles.candidateButtonSelected : undefined,
            ]}
          >
            <Text
              style={[
                styles.candidateButtonText,
                probeCandidate === candidate ? styles.candidateButtonTextSelected : undefined,
              ]}
            >
              {candidate === 'react-native-audio-api' ? 'RN Audio API' : 'Expo Audio'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.recordingControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start 10 second recording probe"
          onPress={handleStartRecordingProbe}
          style={styles.recordingButton}
        >
          <Text style={styles.recordingButtonText}>Rec 10s</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stop recording probe"
          onPress={handleStopRecordingProbe}
          style={[styles.recordingButton, styles.recordingStopButton]}
        >
          <Text style={styles.recordingButtonText}>Stop Rec</Text>
        </Pressable>
      </View>

      <View
        {...panResponder.panHandlers}
        onLayout={(event) => setInstrumentHeight(event.nativeEvent.layout.height)}
        style={styles.instrument}
      >
        {ALL_STRINGS.map((stringIndex) => (
          <View
            key={stringIndex}
            pointerEvents="none"
            accessibilityLabel={`Gayageum string ${stringIndex}`}
            style={styles.stringRow}
          >
            <Text style={styles.stringLabel}>{stringIndex}</Text>
            <View style={styles.stringLine} />
          </View>
        ))}
      </View>

      <ScrollView style={styles.inspector} contentContainerStyle={styles.inspectorContent}>
        <Text style={styles.inspectorTitle}>Prototype Inspector</Text>
        <Text style={styles.inspectorText}>Requested candidate: {engineHost.requestedCandidate}</Text>
        <Text style={styles.inspectorText}>Active runtime: {engineHost.activeRuntime}</Text>
        <Text style={styles.inspectorText}>Runtime status: {engineHost.status}</Text>
        <Text style={styles.inspectorText}>
          Manifest version: {engineHost.manifestVersion ?? 'none'}
        </Text>
        <Text style={styles.inspectorText}>Native preload: {formatNativePreloadStatus(engineHost)}</Text>
        <Text style={styles.inspectorText}>
          Recording probe: {formatRecordingProbeState(recordingProbeState)}
        </Text>
        <Text style={styles.inspectorText}>
          Missing sample strings: {engineHost.missingStringIndexes.join(', ') || 'none'}
        </Text>
        <Text style={styles.inspectorText}>Events: {session.events.length}</Text>
        <Text style={styles.inspectorText}>Audible fake voices: {audibleVoiceCount}</Text>
        <Text style={styles.inspectorText}>Audio status: {audioError ? `failed: ${audioError}` : 'ok'}</Text>
        <Text style={styles.inspectorText}>Latest: {latestEvent ? JSON.stringify(latestEvent) : 'none'}</Text>
        <Text style={styles.inspectorText}>Commands: {commands.join(' | ') || 'none'}</Text>
        <Text style={styles.inspectorTitle}>Probe draft (estimate only, fake engine counters)</Text>
        <Text selectable style={styles.probeDraftText}>
          {probeDraftText}
        </Text>
      </ScrollView>
    </View>
  );
}

function getTouchForce(event: GestureResponderEvent): number | undefined {
  const nativeEvent = event.nativeEvent as GestureResponderEvent['nativeEvent'] & { force?: unknown };
  return typeof nativeEvent.force === 'number' ? nativeEvent.force : undefined;
}

function getFakeEngineSnapshot(engine: unknown): {
  activeVoices: VoiceState[];
  commands: string[];
} {
  if (engine instanceof FakeSamplerEngine) {
    return {
      activeVoices: engine.activeVoices,
      commands: engine.commands,
    };
  }

  return {
    activeVoices: [],
    commands: [],
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatNativePreloadStatus(host: {
  status: string;
  preloadErrorMessage?: string;
}): string {
  if (host.status === 'native_candidate_failed') {
    return `failed: ${host.preloadErrorMessage ?? 'unknown error'}`;
  }

  if (host.status === 'native_candidate_ready') {
    return 'ready';
  }

  if (host.status === 'native_candidate_preloading') {
    return 'preloading';
  }

  return 'not started';
}

function formatRecordingProbeState(state: RecordingProbeUiState): string {
  switch (state.status) {
    case 'idle':
      return 'idle';
    case 'recording':
      return `recording ${state.requestedDurationSeconds}s`;
    case 'captured':
      return `captured ${state.capturedSeconds}s ${state.recordingUri ?? 'no uri'}`;
    case 'unsupported':
      return state.reason;
    case 'failed':
      return `failed: ${state.errorMessage}`;
    default:
      return assertNever(state);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled recording probe state: ${JSON.stringify(value)}`);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#101418',
    padding: 24,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 56,
  },
  headerText: {
    flexShrink: 1,
    minWidth: 0,
  },
  title: {
    color: '#f6f1e8',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#80b8aa',
    fontSize: 14,
  },
  glissandoButton: {
    alignItems: 'center',
    backgroundColor: '#d7b65d',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 118,
    paddingHorizontal: 14,
  },
  glissandoButtonText: {
    color: '#101418',
    fontSize: 14,
    fontWeight: '700',
  },
  probeControls: {
    flexDirection: 'row',
    gap: 8,
  },
  recordingControls: {
    flexDirection: 'row',
    gap: 8,
  },
  candidateButton: {
    alignItems: 'center',
    borderColor: '#80b8aa',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 116,
    paddingHorizontal: 12,
  },
  candidateButtonSelected: {
    backgroundColor: '#80b8aa',
  },
  candidateButtonText: {
    color: '#f6f1e8',
    fontSize: 12,
    fontWeight: '700',
  },
  candidateButtonTextSelected: {
    color: '#101418',
  },
  recordingButton: {
    alignItems: 'center',
    backgroundColor: '#80b8aa',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 96,
    paddingHorizontal: 12,
  },
  recordingStopButton: {
    backgroundColor: '#b55d4c',
  },
  recordingButtonText: {
    color: '#101418',
    fontSize: 12,
    fontWeight: '700',
  },
  instrument: {
    backgroundColor: '#1c2320',
    borderColor: '#3a4a42',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: PROTOTYPE_INSTRUMENT_VERTICAL_PADDING,
  },
  stringRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: PROTOTYPE_STRING_ROW_MIN_HEIGHT,
  },
  stringLabel: {
    color: '#f6f1e8',
    fontSize: 12,
    fontWeight: '700',
    width: 24,
  },
  stringLine: {
    backgroundColor: '#d7b65d',
    borderRadius: 3,
    flex: 1,
    height: PROTOTYPE_STRING_LINE_HEIGHT,
  },
  inspector: {
    backgroundColor: '#eef3ef',
    borderRadius: 8,
    flexGrow: 0,
    maxHeight: 196,
  },
  inspectorContent: {
    gap: 4,
    padding: 12,
  },
  inspectorTitle: {
    color: '#101418',
    fontSize: 14,
    fontWeight: '700',
  },
  inspectorText: {
    color: '#101418',
    fontSize: 12,
  },
  probeDraftText: {
    color: '#101418',
    fontFamily: 'monospace',
    fontSize: 10,
  },
});

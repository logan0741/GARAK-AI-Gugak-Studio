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
  TextInput,
  View,
} from 'react-native';
import { AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import { FakeSamplerEngine } from '../audio/fakeSamplerEngine';
import { VoiceState } from '../audio/samplerEngine';
import { PerformanceEvent } from '../domain/performanceEvent';
import { attachRecordingUriToSession, createEmptySession } from '../domain/session';
import { createTouchModel, TouchFrame } from '../interaction/touchModel';
import {
  appendEventsToSession,
  planGlissando,
  planMuteProbe,
  planPitchBendProbe,
  planPolyphonyBurst,
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
  formatPrototypeProbeHandoffTemplateForInspector,
  formatPrototypeProbeDraftForInspector,
  PROTOTYPE_DEVICE_LABEL_PLACEHOLDER,
  recordPrototypeRecordingCapture,
  recordPrototypeRecordingFallback,
  recordPrototypeRecordingPlayback,
  recordPrototypeRecordingStart,
  updatePrototypeQaDeviceLabel,
  updatePrototypeQaSnapshot,
} from './prototypeQaSnapshot';
import { createPrototypeRuntimeObservation } from './prototypeRuntimeObservation';
import {
  playCapturedPrototypeRecordingProbe,
  startPrototypeRecordingProbe,
  stopPrototypeRecordingProbe,
} from './prototypeRecordingProbeController';
import {
  formatRecordingProbeState,
  getRecordingProbeFallbackReason,
  selectPlayableRecordingUri,
  type RecordingProbeUiState,
} from './prototypeRecordingProbeUi';
import { shouldStartPrototypeNativeAudioCandidate } from './prototypePlatform';
import { createAndPreloadPrototypeNativeSamplerEngine } from './prototypeNativeSamplerEngineFactory';
import {
  createPrototypeSamplerEngineHost,
  type PrototypeNativeCandidateState,
} from './prototypeSamplerEngineHost';
import {
  PROTOTYPE_GAYAGEUM_SAMPLE_MANIFEST_VERSION,
  prototypeGayageumSampleManifest,
} from './prototypeSampleManifest';
import { formatPrototypeSessionFallbackForInspector } from './prototypeSessionFallback';

const ALL_STRINGS = Array.from({ length: PROTOTYPE_STRING_COUNT }, (_, index) => index + 1);
const POLYPHONY_BURST_STRINGS = ALL_STRINGS.slice(0, 8);
const EXPRESSIVE_PROBE_STRING_INDEX = 6;
const FALLBACK_INSTRUMENT_HEIGHT = getPrototypeInstrumentMinimumHeight({
  stringCount: PROTOTYPE_STRING_COUNT,
});
const PRIMARY_POINTER_ID = 'primary-touch';
const DEFAULT_PROBE_CANDIDATE: AudioEngineCandidateId = 'react-native-audio-api';
const PROBE_CANDIDATES: AudioEngineCandidateId[] = ['react-native-audio-api', 'expo-audio'];
const RECORDING_PROBE_SECONDS = 10;
const CAN_START_NATIVE_AUDIO_CANDIDATE = shouldStartPrototypeNativeAudioCandidate(Platform.OS);
const NATIVE_AUDIO_UNAVAILABLE_REASON = 'native audio candidate requires Expo dev build on iOS or Android';

type NativeCandidateLoadState = {
  candidate: AudioEngineCandidateId;
  state: PrototypeNativeCandidateState;
};

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
  const [deviceLabelInput, setDeviceLabelInput] = useState('');
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
      deviceLabel: PROTOTYPE_DEVICE_LABEL_PLACEHOLDER,
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
    const dispatchedAtMs = Date.now();
    const currentEngine = engineRef.current;
    setAudioError(result.ok ? undefined : result.errorMessage);
    setQaSnapshot((current) =>
      updatePrototypeQaSnapshot(current, {
        activeVoiceCount: countPrototypeAudibleVoices(getFakeEngineSnapshot(currentEngine).activeVoices),
        audioDispatchOk: result.ok,
        dispatchedAtMs,
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
        deviceLabel: deviceLabelInput.trim() || PROTOTYPE_DEVICE_LABEL_PLACEHOLDER,
        measuredAt: new Date().toISOString(),
      }),
    );
  }

  function handleDeviceLabelChange(deviceLabel: string) {
    setDeviceLabelInput(deviceLabel);
    setQaSnapshot((current) =>
      updatePrototypeQaDeviceLabel(current, {
        deviceLabel,
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

  function handlePolyphonyBurstPress() {
    const events = planPolyphonyBurst({
      nowMs: Date.now(),
      stringIndexes: POLYPHONY_BURST_STRINGS,
    });

    applyPerformanceEvents(events);
  }

  function handlePitchBendProbePress() {
    const events = planPitchBendProbe({
      nowMs: Date.now(),
      stringIndex: EXPRESSIVE_PROBE_STRING_INDEX,
    });

    applyPerformanceEvents(events);
  }

  function handleMuteProbePress() {
    const events = planMuteProbe({
      nowMs: Date.now(),
      stringIndex: EXPRESSIVE_PROBE_STRING_INDEX,
    });

    applyPerformanceEvents(events);
  }

  async function handleStartRecordingProbe() {
    const result = await startPrototypeRecordingProbe(engineRef.current, RECORDING_PROBE_SECONDS);
    setRecordingProbeState(result);
    if (result.status === 'recording') {
      setQaSnapshot((current) =>
        recordPrototypeRecordingStart(current, {
          measuredAt: new Date().toISOString(),
        }),
      );
    }
    recordRecordingProbeFallback(result);
  }

  async function handleStopRecordingProbe() {
    const result = await stopPrototypeRecordingProbe(engineRef.current);
    setRecordingProbeState(result);
    if (result.status === 'captured') {
      const { recordingUri } = result;
      setQaSnapshot((current) =>
        recordPrototypeRecordingCapture(current, {
          capturedSeconds: result.capturedSeconds,
          measuredAt: new Date().toISOString(),
          recordingUri,
        }),
      );
      if (typeof recordingUri === 'string') {
        setSession((current) => attachRecordingUriToSession(current, recordingUri));
      }
    } else {
      recordRecordingProbeFallback(result);
    }
  }

  async function handlePlayRecordingProbe() {
    const recordingUri = selectPlayableRecordingUri({
      recordingProbeState,
    });
    if (recordingUri === null) {
      const result = { status: 'failed', errorMessage: 'recording_playback_uri_missing' } as const;
      setRecordingProbeState(result);
      recordRecordingProbeFallback(result);
      return;
    }

    const result = await playCapturedPrototypeRecordingProbe(engineRef.current, recordingUri);
    setRecordingProbeState(result);
    recordRecordingProbeFallback(result);
    setQaSnapshot((current) =>
      recordPrototypeRecordingPlayback(current, {
        measuredAt: new Date().toISOString(),
        playbackConfirmed: result.status === 'playing',
      }),
    );
  }

  function recordRecordingProbeFallback(state: RecordingProbeUiState) {
    const fallbackReason = getRecordingProbeFallbackReason(state);
    if (fallbackReason === null) {
      return;
    }

    setQaSnapshot((current) =>
      recordPrototypeRecordingFallback(current, {
        fallbackReason,
        measuredAt: new Date().toISOString(),
      }),
    );
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
  const runtimeObservation = createPrototypeRuntimeObservation(engineHost);
  const probeDraftText = formatPrototypeProbeDraftForInspector(qaSnapshot, runtimeObservation);
  const prototypeHandoffText = formatPrototypeProbeHandoffTemplateForInspector(
    qaSnapshot,
    runtimeObservation,
  );
  const sessionFallbackText = formatPrototypeSessionFallbackForInspector(session);
  const playableRecordingUri = selectPlayableRecordingUri({
    recordingProbeState,
  });

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play eight voice polyphony burst"
          onPress={handlePolyphonyBurstPress}
          style={styles.polyphonyButton}
        >
          <Text style={styles.glissandoButtonText}>8 Voice</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play pitch bend probe"
          onPress={handlePitchBendProbePress}
          style={styles.pitchBendButton}
        >
          <Text style={styles.glissandoButtonText}>Bend</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play mute probe"
          onPress={handleMuteProbePress}
          style={styles.muteProbeButton}
        >
          <Text style={styles.glissandoButtonText}>Mute</Text>
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

      <TextInput
        accessibilityLabel="Physical device and OS label for probe draft"
        autoCapitalize="words"
        onChangeText={handleDeviceLabelChange}
        placeholder="Device / OS"
        placeholderTextColor="#6f7b76"
        style={styles.deviceLabelInput}
        value={deviceLabelInput}
      />

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play captured recording probe"
          disabled={playableRecordingUri === null}
          onPress={handlePlayRecordingProbe}
          style={[
            styles.recordingButton,
            styles.recordingPlaybackButton,
            playableRecordingUri === null ? styles.recordingDisabledButton : undefined,
          ]}
        >
          <Text style={styles.recordingButtonText}>Play Rec</Text>
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
        <Text style={styles.inspectorText}>
          Duplicate sample strings: {engineHost.duplicateStringIndexes.join(', ') || 'none'}
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
        <Text style={styles.inspectorTitle}>Prototype handoff JSON</Text>
        <Text selectable style={styles.probeDraftText}>
          {prototypeHandoffText}
        </Text>
        <Text style={styles.inspectorTitle}>Session fallback (copyable)</Text>
        <Text selectable style={styles.probeDraftText}>
          {sessionFallbackText}
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
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
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
  polyphonyButton: {
    alignItems: 'center',
    backgroundColor: '#80b8aa',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 118,
    paddingHorizontal: 14,
  },
  pitchBendButton: {
    alignItems: 'center',
    backgroundColor: '#c98f65',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 92,
    paddingHorizontal: 14,
  },
  muteProbeButton: {
    alignItems: 'center',
    backgroundColor: '#b55d4c',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 92,
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
  deviceLabelInput: {
    alignSelf: 'stretch',
    backgroundColor: '#eef3ef',
    borderColor: '#80b8aa',
    borderRadius: 8,
    borderWidth: 1,
    color: '#101418',
    fontSize: 12,
    maxWidth: 340,
    minHeight: 36,
    minWidth: 0,
    paddingHorizontal: 10,
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
  recordingPlaybackButton: {
    backgroundColor: '#d7b65d',
  },
  recordingDisabledButton: {
    opacity: 0.45,
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

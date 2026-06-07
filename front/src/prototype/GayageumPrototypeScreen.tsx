import { useMemo, useState } from 'react';
import {
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AudioEngineCandidateId } from '../audio/audioEngineEvaluation';
import { FakeSamplerEngine } from '../audio/fakeSamplerEngine';
import { PerformanceEvent } from '../domain/performanceEvent';
import { createEmptySession } from '../domain/session';
import { createTouchModel, TouchFrame } from '../interaction/touchModel';
import {
  appendEventsToSession,
  planGlissando,
  safelyDispatchEventsToEngine,
} from './gayageumPrototypeController';
import {
  countPrototypeAudibleVoices,
  createInitialPrototypeQaSnapshot,
  formatPrototypeProbeDraftForInspector,
  updatePrototypeQaSnapshot,
} from './prototypeQaSnapshot';

const STRING_COUNT = 12;
const ALL_STRINGS = Array.from({ length: STRING_COUNT }, (_, index) => index + 1);
const FALLBACK_INSTRUMENT_HEIGHT = 312;
const PRIMARY_POINTER_ID = 'primary-touch';
const DEFAULT_PROBE_CANDIDATE: AudioEngineCandidateId = 'react-native-audio-api';
const DEFAULT_DEVICE_LABEL = 'replace-with-physical-device-model';
const PROBE_CANDIDATES: AudioEngineCandidateId[] = ['react-native-audio-api', 'expo-audio'];

export function GayageumPrototypeScreen() {
  const engine = useMemo(() => new FakeSamplerEngine(), []);
  const [probeCandidate, setProbeCandidate] = useState<AudioEngineCandidateId>(DEFAULT_PROBE_CANDIDATE);
  const [instrumentHeight, setInstrumentHeight] = useState(FALLBACK_INSTRUMENT_HEIGHT);
  const touchModel = useMemo(
    () =>
      createTouchModel({
        layout: {
          topY: 0,
          height: instrumentHeight,
          stringCount: STRING_COUNT,
        },
      }),
    [instrumentHeight],
  );
  const [session, setSession] = useState(() =>
    createEmptySession({
      id: 'local-prototype-session',
      createdAt: new Date().toISOString(),
      sampleAssetManifestVersion: 'prototype-empty-manifest',
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
    const result = safelyDispatchEventsToEngine(engine, events);
    setAudioError(result.ok ? undefined : result.errorMessage);
    setQaSnapshot((current) =>
      updatePrototypeQaSnapshot(current, {
        activeVoiceCount: countPrototypeAudibleVoices(engine.activeVoices),
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
  const activeVoices = engine.activeVoices;
  const audibleVoiceCount = countPrototypeAudibleVoices(activeVoices);
  const commands = engine.commands;
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
  instrument: {
    backgroundColor: '#1c2320',
    borderColor: '#3a4a42',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  stringRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 26,
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
    height: 6,
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

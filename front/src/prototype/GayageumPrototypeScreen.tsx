import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FakeSamplerEngine } from '../audio/fakeSamplerEngine';
import { PerformanceEvent } from '../domain/performanceEvent';
import { createEmptySession } from '../domain/session';
import {
  appendEventsToSession,
  planGlissando,
  planStringPlay,
  safelyDispatchEventsToEngine,
} from './gayageumPrototypeController';

const STRING_COUNT = 12;
const ALL_STRINGS = Array.from({ length: STRING_COUNT }, (_, index) => index + 1);

export function GayageumPrototypeScreen() {
  const engine = useMemo(() => new FakeSamplerEngine(), []);
  const [session, setSession] = useState(() =>
    createEmptySession({
      id: 'local-prototype-session',
      createdAt: new Date().toISOString(),
      sampleAssetManifestVersion: 'prototype-empty-manifest',
    }),
  );
  const [audioError, setAudioError] = useState<string | undefined>();

  function handleStringPress(stringIndex: number) {
    const events = planStringPlay({
      nowMs: Date.now(),
      stringIndex,
    });

    setSession((current) => appendEventsToSession(current, events));
    const result = safelyDispatchEventsToEngine(engine, events);
    setAudioError(result.ok ? undefined : result.errorMessage);
  }

  function handleGlissandoPress() {
    const events = planGlissando({
      nowMs: Date.now(),
      stringIndexes: ALL_STRINGS,
    });

    setSession((current) => appendEventsToSession(current, events));
    const result = safelyDispatchEventsToEngine(engine, events);
    setAudioError(result.ok ? undefined : result.errorMessage);
  }

  const latestEvent: PerformanceEvent | undefined = session.events.at(-1);
  const activeVoices = engine.activeVoices;
  const commands = engine.commands;

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

      <View style={styles.instrument}>
        {ALL_STRINGS.map((stringIndex) => (
          <Pressable
            key={stringIndex}
            accessibilityRole="button"
            accessibilityLabel={`Gayageum string ${stringIndex}`}
            onPress={() => handleStringPress(stringIndex)}
            style={({ pressed }) => [styles.stringRow, pressed && styles.stringRowPressed]}
          >
            <Text style={styles.stringLabel}>{stringIndex}</Text>
            <View style={styles.stringLine} />
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.inspector} contentContainerStyle={styles.inspectorContent}>
        <Text style={styles.inspectorTitle}>Prototype Inspector</Text>
        <Text style={styles.inspectorText}>Events: {session.events.length}</Text>
        <Text style={styles.inspectorText}>Active voices: {activeVoices.length}</Text>
        <Text style={styles.inspectorText}>Audio status: {audioError ? `failed: ${audioError}` : 'ok'}</Text>
        <Text style={styles.inspectorText}>Latest: {latestEvent ? JSON.stringify(latestEvent) : 'none'}</Text>
        <Text style={styles.inspectorText}>Commands: {commands.join(' | ') || 'none'}</Text>
      </ScrollView>
    </View>
  );
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
  stringRowPressed: {
    opacity: 0.68,
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
    maxHeight: 148,
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
});

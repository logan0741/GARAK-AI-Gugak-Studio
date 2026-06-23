import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AccompanimentTrackContent,
  AddTrackContent,
  ExtraInstrumentRecordContent,
  FreePlayContent,
  HomeScreenContent,
  InstrumentSelectContent,
  InstrumentSettingsContent,
  LiveJangdanContent,
  TrackLayerEditorContent,
} from './freeCreationScreens';
import {
  applyProductAction,
  createInitialGarakProductState,
  GarakProductAction,
  GarakProductState,
  getCurrentScreenSummary,
} from './garakProductState';
import { LibraryContent, PlayerDetailContent } from './libraryScreens';
import {
  PracticeInstrumentSelectContent,
  PracticePerformanceContent,
  PracticeResultContent,
  PracticeSongSelectContent,
} from './practiceScreens';
import { GARAK_COLORS, GARAK_RADII, GARAK_SPACING } from './designTokens';
import { GARAK_BRAND } from './productFixtures';
import { ShareFeedContent, SharedDetailContent, SharePrepareContent } from './shareScreens';
import {
  IntroGuideContent,
  LanguageContent,
  LoginSyncContent,
  SettingsContent,
} from './settingsScreens';

export function GarakScreenFlowApp() {
  const [state, setState] = useState(() => createInitialGarakProductState());
  const summary = useMemo(() => getCurrentScreenSummary(state), [state]);
  const canOpenLanguage =
    state.screenFlow.currentScreen === 'S01' || state.screenFlow.currentScreen === 'S22';

  function dispatch(action: GarakProductAction) {
    setState((current) => applyProductAction(current, action));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'back' })}
            style={styles.headerButton}
          >
            <Text style={styles.headerButtonText}>‹</Text>
          </Pressable>
          <View style={styles.logoBlock}>
            <Text style={styles.logo}>{GARAK_BRAND.serviceName}</Text>
            <Text style={styles.subtitle}>{GARAK_BRAND.subtitle}</Text>
          </View>
          {canOpenLanguage ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => dispatch({ type: 'navigate', target: 'S02' })}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>◎</Text>
            </Pressable>
          ) : (
            <View style={styles.headerButtonSpacer} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>{summary.eyebrow}</Text>
            <Text style={styles.screenTitle}>{summary.title}</Text>
            <Text style={styles.description}>{summary.description}</Text>
          </View>
          {renderScreenContent(state, dispatch)}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function renderScreenContent(
  state: GarakProductState,
  dispatch: (action: GarakProductAction) => void,
) {
  switch (state.screenFlow.currentScreen) {
    case 'S01':
      return <HomeScreenContent state={state} dispatch={dispatch} />;
    case 'S02':
      return <LanguageContent />;
    case 'S03':
      return <IntroGuideContent state={state} dispatch={dispatch} />;
    case 'S04':
      return <InstrumentSelectContent state={state} dispatch={dispatch} />;
    case 'S04A':
      return <InstrumentSettingsContent state={state} dispatch={dispatch} />;
    case 'S05':
      return <FreePlayContent state={state} dispatch={dispatch} />;
    case 'S07':
      return <TrackLayerEditorContent state={state} dispatch={dispatch} />;
    case 'S08':
      return <AddTrackContent state={state} dispatch={dispatch} />;
    case 'S09':
      return <ExtraInstrumentRecordContent state={state} dispatch={dispatch} />;
    case 'S10A':
      return <LiveJangdanContent dispatch={dispatch} />;
    case 'S10B':
      return <AccompanimentTrackContent dispatch={dispatch} />;
    case 'S13':
      return <PracticeSongSelectContent state={state} dispatch={dispatch} />;
    case 'S14':
      return <PracticeInstrumentSelectContent state={state} dispatch={dispatch} />;
    case 'S15':
      return <PracticePerformanceContent state={state} dispatch={dispatch} />;
    case 'S16':
      return <PracticeResultContent state={state} dispatch={dispatch} />;
    case 'S17':
      return <SharePrepareContent state={state} dispatch={dispatch} />;
    case 'S18':
      return <LibraryContent state={state} dispatch={dispatch} />;
    case 'S19':
      return <PlayerDetailContent state={state} dispatch={dispatch} />;
    case 'S20':
      return <ShareFeedContent state={state} dispatch={dispatch} />;
    case 'S21':
      return <SharedDetailContent state={state} dispatch={dispatch} />;
    case 'S22':
      return <SettingsContent state={state} dispatch={dispatch} />;
    case 'S23':
      return <LoginSyncContent state={state} dispatch={dispatch} />;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: GARAK_COLORS.brand.navy,
    flex: 1,
  },
  phoneFrame: {
    alignSelf: 'center',
    backgroundColor: GARAK_COLORS.neutral.app,
    flex: 1,
    maxWidth: 430,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.neutral.canvas,
    borderBottomColor: GARAK_COLORS.neutral.muted,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 76,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.circle,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  headerButtonSpacer: {
    height: 34,
    width: 34,
  },
  headerButtonText: {
    color: GARAK_COLORS.brand.navy,
    fontSize: 20,
    fontWeight: '700',
  },
  logoBlock: {
    alignItems: 'center',
  },
  logo: {
    color: GARAK_COLORS.brand.red,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: GARAK_COLORS.brand.navy,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0,
  },
  content: {
    gap: GARAK_SPACING.lg,
    padding: GARAK_SPACING.xl,
    paddingBottom: 36,
  },
  titleBlock: {
    gap: GARAK_SPACING.xs,
  },
  eyebrow: {
    color: GARAK_COLORS.brand.amber,
    fontSize: 12,
    fontWeight: '700',
  },
  screenTitle: {
    color: GARAK_COLORS.text.primary,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  description: {
    color: GARAK_COLORS.text.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
});

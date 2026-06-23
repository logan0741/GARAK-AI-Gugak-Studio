import { useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
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
} from './garakProductState';
import { LibraryContent, PlayerDetailContent } from './libraryScreens';
import {
  PracticeInstrumentSelectContent,
  PracticePerformanceContent,
  PracticeResultContent,
  PracticeSongSelectContent,
} from './practiceScreens';
import { ShareFeedContent, SharedDetailContent, SharePrepareContent } from './shareScreens';
import {
  IntroGuideContent,
  LanguageContent,
  LoginSyncContent,
  SettingsContent,
} from './settingsScreens';
import { GARAK_COLORS, GARAK_LAYOUT } from './garakDesignSystem';
import { GARAK_SCREEN_ASSETS, GarakWordmark } from './garakUi';

export function GarakScreenFlowApp() {
  const [state, setState] = useState(() => createInitialGarakProductState());
  const currentScreen = state.screenFlow.currentScreen;
  const isHome = currentScreen === 'S01';
  const isLibrary = currentScreen === 'S18';
  const isShare = currentScreen === 'S20';
  const canOpenLanguage =
    currentScreen === 'S01' || currentScreen === 'S22';

  function dispatch(action: GarakProductAction) {
    setState((current) => applyProductAction(current, action));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>9:41</Text>
          <View style={styles.statusIconGroup}>
            <View style={styles.signalBars}>
              <View style={[styles.signalBar, styles.signalBarSmall]} />
              <View style={[styles.signalBar, styles.signalBarMedium]} />
              <View style={[styles.signalBar, styles.signalBarLarge]} />
            </View>
            <View style={styles.wifiGlyph}>
              <View style={styles.wifiDot} />
            </View>
            <View style={styles.batteryGlyph}>
              <View style={styles.batteryFill} />
            </View>
            <View style={styles.batteryCap} />
          </View>
        </View>
        <View style={styles.header}>
          <View style={[styles.headerLeftSlot, isLibrary ? styles.headerWideSlot : undefined]}>
            {isHome ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => dispatch({ type: 'navigate', target: 'S03' })}
                style={styles.headerButton}
              >
                <Image source={GARAK_SCREEN_ASSETS.shell.homeEntryButton} style={styles.headerIconImage} />
              </Pressable>
            ) : isLibrary || isShare ? null : (
              <Pressable
                accessibilityRole="button"
                onPress={() => dispatch({ type: 'back' })}
                style={styles.headerButton}
              >
                <Text style={styles.headerButtonText}>‹</Text>
              </Pressable>
            )}
          </View>
          <GarakWordmark small />
          <View style={[styles.headerRightSlot, isLibrary ? styles.headerWideSlot : undefined]}>
            {isHome || isShare ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => dispatch({ type: 'navigate', target: 'S22' })}
                style={styles.avatarButton}
              >
                <Image source={GARAK_SCREEN_ASSETS.shell.profileAvatar} style={styles.avatarImage} />
              </Pressable>
            ) : isLibrary ? (
              <View style={styles.headerActionGroup}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => dispatch({ type: 'navigate', target: 'S22' })}
                  style={styles.headerButton}
                >
                  <Text style={styles.headerButtonText}>...</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => dispatch({ type: 'navigate', target: 'S01' })}
                  style={styles.headerButton}
                >
                  <Text style={styles.headerButtonText}>+</Text>
                </Pressable>
              </View>
            ) : canOpenLanguage ? (
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
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, isHome ? styles.homeContent : undefined]}
          showsVerticalScrollIndicator={false}
        >
          {renderScreenContent(state, dispatch)}
        </ScrollView>
        <View style={styles.homeIndicator} />
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
    backgroundColor: GARAK_COLORS.surfaceSoft,
    flex: 1,
  },
  phoneFrame: {
    alignSelf: 'center',
    backgroundColor: GARAK_COLORS.surfaceApp,
    flex: 1,
    maxHeight: GARAK_LAYOUT.figmaPhoneHeight,
    maxWidth: GARAK_LAYOUT.figmaPhoneWidth,
    overflow: 'hidden',
    width: '100%',
  },
  statusBar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 50,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 14,
  },
  statusTime: {
    color: GARAK_COLORS.inkBlack,
    fontSize: 14,
    fontWeight: '700',
  },
  statusIconGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  signalBars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 2,
    height: 12,
  },
  signalBar: {
    backgroundColor: GARAK_COLORS.inkBlack,
    borderRadius: 1,
    width: 3,
  },
  signalBarSmall: {
    height: 5,
  },
  signalBarMedium: {
    height: 8,
  },
  signalBarLarge: {
    height: 11,
  },
  wifiGlyph: {
    borderColor: GARAK_COLORS.inkBlack,
    borderRadius: 8,
    borderTopWidth: 3,
    height: 10,
    justifyContent: 'flex-end',
    width: 14,
  },
  wifiDot: {
    alignSelf: 'center',
    backgroundColor: GARAK_COLORS.inkBlack,
    borderRadius: 2,
    height: 3,
    width: 3,
  },
  batteryGlyph: {
    borderColor: GARAK_COLORS.inkBlack,
    borderRadius: 3,
    borderWidth: 1,
    height: 11,
    justifyContent: 'center',
    padding: 1,
    width: 21,
  },
  batteryFill: {
    backgroundColor: GARAK_COLORS.inkBlack,
    borderRadius: 2,
    flex: 1,
  },
  batteryCap: {
    backgroundColor: GARAK_COLORS.inkBlack,
    borderRadius: 1,
    height: 4,
    marginLeft: -4,
    width: 2,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: GARAK_LAYOUT.horizontalPadding,
  },
  headerLeftSlot: {
    alignItems: 'flex-start',
    width: GARAK_LAYOUT.headerIconSize,
  },
  headerRightSlot: {
    alignItems: 'flex-end',
    width: GARAK_LAYOUT.headerIconSize,
  },
  headerWideSlot: {
    width: 76,
  },
  headerActionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 17,
    height: GARAK_LAYOUT.headerIconSize,
    justifyContent: 'center',
    width: GARAK_LAYOUT.headerIconSize,
  },
  headerButtonSpacer: {
    height: GARAK_LAYOUT.headerIconSize,
    width: GARAK_LAYOUT.headerIconSize,
  },
  headerButtonText: {
    color: GARAK_COLORS.brandNavy,
    fontSize: 18,
    fontWeight: '700',
  },
  headerIconImage: {
    height: GARAK_LAYOUT.headerIconSize,
    width: GARAK_LAYOUT.headerIconSize,
  },
  avatarButton: {
    borderRadius: 17,
    height: GARAK_LAYOUT.headerIconSize,
    overflow: 'hidden',
    width: GARAK_LAYOUT.headerIconSize,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  content: {
    gap: 18,
    paddingHorizontal: GARAK_LAYOUT.horizontalPadding,
    paddingTop: 23,
    paddingBottom: 72,
  },
  homeContent: {
    paddingTop: 69,
  },
  homeIndicator: {
    alignSelf: 'center',
    backgroundColor: GARAK_COLORS.inkBlack,
    borderRadius: 2,
    bottom: 8,
    height: 4,
    position: 'absolute',
    width: 135,
  },
});

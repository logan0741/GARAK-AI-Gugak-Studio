import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
  AccountState,
  applyProductAction,
  createInitialGarakProductState,
  GarakProductAction,
  GarakProductState,
} from './garakProductState';
import { runGarakProductEffect } from './garakProductEffects';
import {
  createNoopGarakProductServices,
  type GarakProductServices,
} from './garakProductServices';
import type { InstrumentSampleReadinessInput } from './instrumentSampleReadiness';
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
import { GARAK_SCREEN_ASSETS } from './garakScreenAssets';
import {
  GarakScreenFrameMode,
  getGarakScreenFrameConfig,
  usesImmersivePortraitScreen,
  usesEmbeddedLandscapeArtworkHeader,
} from './garakScreenFrame';
import { GarakWordmark, QuickAccessNav } from './garakUi';
import { getHomeScreenViewModel } from './homeScreenModel';
import { GarakText as Text } from './garakTypography';

export type GarakScreenFlowAppProps = {
  account?: AccountState;
  onLogout?: () => void;
  sampleManifests?: InstrumentSampleReadinessInput['sampleManifests'];
  sampleFallbackInstruments?: InstrumentSampleReadinessInput['fallbackInstruments'];
  services?: GarakProductServices;
};

type PendingProductEffect = {
  id: number;
  state: GarakProductState;
  action: GarakProductAction;
};

type GarakProductRuntimeState = {
  productState: GarakProductState;
  pendingEffects: PendingProductEffect[];
  nextEffectId: number;
};

export function GarakScreenFlowApp({
  account,
  onLogout,
  sampleManifests,
  sampleFallbackInstruments,
  services,
}: GarakScreenFlowAppProps = {}) {
  const handledEffectIdsRef = useRef<Set<number>>(new Set());
  const [runtimeState, setRuntimeState] = useState<GarakProductRuntimeState>(() => ({
    productState: createInitialGarakProductState({
      account,
      sampleManifests,
      sampleFallbackInstruments,
    }),
    pendingEffects: [],
    nextEffectId: 1,
  }));
  const productServices = useMemo(
    () => services ?? createNoopGarakProductServices(),
    [services],
  );
  const state = runtimeState.productState;
  const currentScreen = state.screenFlow.currentScreen;
  const isHome = currentScreen === 'S01';
  const isLibrary = currentScreen === 'S18';
  const isShare = currentScreen === 'S20';
  const isHomeBrowsingSurface = isHome || isLibrary || isShare;
  const homeModel = getHomeScreenViewModel(state);
  const canOpenLanguage =
    currentScreen === 'S01' || currentScreen === 'S22';
  const frameConfig = getGarakScreenFrameConfig(currentScreen);
  const isLandscapeFrame = frameConfig.mode === 'landscape';
  const usesEmbeddedHeader = isLandscapeFrame && usesEmbeddedLandscapeArtworkHeader(currentScreen);
  const usesImmersiveFrame = frameConfig.mode === 'portrait' && usesImmersivePortraitScreen(currentScreen);
  const landscapeContentStyle = usesEmbeddedHeader ? styles.embeddedLandscapeContent : styles.landscapeContent;
  const contentStyle = isLandscapeFrame
    ? landscapeContentStyle
    : usesImmersiveFrame
      ? styles.immersiveContent
      : undefined;

  const dispatch = useCallback((action: GarakProductAction) => {
    setRuntimeState((current) => {
      const next = applyProductAction(current.productState, action);
      const pendingEffect: PendingProductEffect = {
        id: current.nextEffectId,
        state: next,
        action,
      };

      return {
        productState: next,
        pendingEffects: [...current.pendingEffects, pendingEffect],
        nextEffectId: current.nextEffectId + 1,
      };
    });
  }, []);

  useEffect(() => {
    const effectsToRun = runtimeState.pendingEffects.filter(
      ({ id }) => !handledEffectIdsRef.current.has(id),
    );

    if (effectsToRun.length === 0) {
      return;
    }

    effectsToRun.forEach(({ id }) => handledEffectIdsRef.current.add(id));
    const effectIds = new Set(effectsToRun.map(({ id }) => id));

    setRuntimeState((current) => ({
      ...current,
      pendingEffects: current.pendingEffects.filter(({ id }) => !effectIds.has(id)),
    }));

    effectsToRun.forEach(({ state: effectState, action }) => {
      void runGarakProductEffect({
        state: effectState,
        action,
        services: productServices,
      }).then((followUpActions) => {
        followUpActions.forEach(dispatch);
      });
    });
  }, [dispatch, productServices, runtimeState.pendingEffects]);

  return (
    <SafeAreaProvider style={styles.provider}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={[styles.appFrame, isLandscapeFrame ? styles.landscapeFrame : styles.phoneFrame]}>
        {!usesEmbeddedHeader && !usesImmersiveFrame ? (
          <View style={[styles.header, isLandscapeFrame ? styles.landscapeHeader : undefined]}>
            <View style={[styles.headerLeftSlot, isLibrary ? styles.headerWideSlot : undefined]}>
              {isHome ? (
                <Pressable
                  accessibilityLabel="언어 변경"
                  accessibilityRole="button"
                  onPress={() => dispatch({ type: 'navigate', target: 'S02' })}
                  style={styles.headerButton}
                >
                  <Image source={GARAK_SCREEN_ASSETS.shell.homeEntryButton} style={styles.headerIconImage} />
                </Pressable>
              ) : isLibrary || isShare ? null : (
                <Pressable
                  accessibilityLabel="뒤로가기"
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
                  accessibilityLabel="마이 및 설정"
                  accessibilityRole="button"
                  onPress={() => dispatch({ type: 'navigate', target: 'S22' })}
                  style={styles.avatarButton}
                >
                  <Image source={GARAK_SCREEN_ASSETS.shell.profileAvatar} style={styles.avatarImage} />
                </Pressable>
              ) : isLibrary ? (
                <View style={styles.headerActionGroup}>
                  <Pressable
                    accessibilityLabel="마이 및 설정"
                    accessibilityRole="button"
                    onPress={() => dispatch({ type: 'navigate', target: 'S22' })}
                    style={styles.headerButton}
                  >
                    <Text style={styles.headerButtonText}>...</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="새 작업 시작"
                    accessibilityRole="button"
                    onPress={() => dispatch({ type: 'navigate', target: 'S01' })}
                    style={styles.headerButton}
                  >
                    <Text style={styles.headerButtonText}>+</Text>
                  </Pressable>
                </View>
              ) : canOpenLanguage ? (
                <Pressable
                  accessibilityLabel="언어 변경"
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
        ) : null}

        {frameConfig.scrollable ? (
          <ScrollView
            key={currentScreen}
            contentContainerStyle={[
              styles.content,
              isHome ? styles.homeContent : undefined,
              isHomeBrowsingSurface ? styles.homeBrowsingContent : undefined,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {renderScreenContent(state, dispatch, frameConfig.mode, onLogout)}
          </ScrollView>
        ) : (
          <View key={currentScreen} style={[styles.content, contentStyle]}>
            {renderScreenContent(state, dispatch, frameConfig.mode, onLogout)}
          </View>
        )}
        {isHomeBrowsingSurface ? (
          <QuickAccessNav
            active={isLibrary ? 'library' : isShare ? 'share' : 'home'}
            labels={homeModel.quickAccessLabels}
            onLibrary={() => dispatch({ type: 'navigate', target: 'S18' })}
            onHome={() => dispatch({ type: 'navigate', target: 'S01' })}
            onShare={() => dispatch({ type: 'navigate', target: 'S20' })}
            style={styles.floatingQuickAccess}
          />
        ) : null}
      </View>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

function renderScreenContent(
  state: GarakProductState,
  dispatch: (action: GarakProductAction) => void,
  frameMode: GarakScreenFrameMode,
  onLogout?: () => void,
) {
  switch (state.screenFlow.currentScreen) {
    case 'S01':
      return <HomeScreenContent state={state} dispatch={dispatch} />;
    case 'S02':
      return <LanguageContent state={state} dispatch={dispatch} />;
    case 'S03':
      return <IntroGuideContent state={state} dispatch={dispatch} />;
    case 'S04':
      return <InstrumentSelectContent state={state} dispatch={dispatch} />;
    case 'S04A':
      return <InstrumentSettingsContent state={state} dispatch={dispatch} />;
    case 'S05':
      return <FreePlayContent state={state} dispatch={dispatch} frameMode={frameMode} />;
    case 'S07':
      return <TrackLayerEditorContent state={state} dispatch={dispatch} />;
    case 'S08':
      return <AddTrackContent state={state} dispatch={dispatch} />;
    case 'S09':
      return <ExtraInstrumentRecordContent state={state} dispatch={dispatch} frameMode={frameMode} />;
    case 'S10A':
      return <LiveJangdanContent state={state} dispatch={dispatch} />;
    case 'S10B':
      return <AccompanimentTrackContent state={state} dispatch={dispatch} />;
    case 'S13':
      return <PracticeSongSelectContent state={state} dispatch={dispatch} />;
    case 'S14':
      return <PracticeInstrumentSelectContent state={state} dispatch={dispatch} />;
    case 'S15':
      return <PracticePerformanceContent state={state} dispatch={dispatch} frameMode={frameMode} />;
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
      return <SettingsContent state={state} dispatch={dispatch} onLogout={onLogout} />;
    case 'S23':
      return <LoginSyncContent state={state} dispatch={dispatch} />;
  }
}

const styles = StyleSheet.create({
  provider: {
    flex: 1,
    width: '100%',
  },
  safeArea: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceSoft,
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  appFrame: {
    alignSelf: 'center',
    backgroundColor: GARAK_COLORS.surfaceApp,
    flex: 1,
    overflow: 'hidden',
    width: '100%',
  },
  phoneFrame: {
    maxHeight: GARAK_LAYOUT.figmaPhoneHeight,
    maxWidth: GARAK_LAYOUT.figmaPhoneWidth,
  },
  landscapeFrame: {
    maxHeight: GARAK_LAYOUT.figmaPhoneWidth,
    maxWidth: GARAK_LAYOUT.figmaPhoneHeight,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: GARAK_LAYOUT.horizontalPadding,
  },
  landscapeHeader: {
    height: 48,
    paddingHorizontal: 28,
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
  homeBrowsingContent: {
    paddingBottom: GARAK_LAYOUT.quickAccessHeight + 118,
  },
  landscapeContent: {
    flex: 1,
    gap: 0,
    paddingBottom: 18,
    paddingHorizontal: 28,
    paddingTop: 12,
  },
  embeddedLandscapeContent: {
    flex: 1,
    gap: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  immersiveContent: {
    flex: 1,
    gap: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  homeContent: {
    paddingTop: 69,
  },
  floatingQuickAccess: {
    bottom: 36,
    left: '50%',
    marginLeft: -GARAK_LAYOUT.quickAccessWidth / 2,
    position: 'absolute',
    zIndex: 10,
  },
});

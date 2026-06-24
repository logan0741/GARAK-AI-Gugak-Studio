import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  GARAK_AUTH_BUTTON_LAYOUT,
  GARAK_COLORS,
} from './garakDesignSystem';
import { GarakLogo } from './GarakLogo';
import { GarakProductAction, GarakProductState } from './garakProductState';
import {
  PrimaryPillButton,
  ProgressSteps,
  QuickAccessNav,
  ScreenHeading,
  garakCardShadow,
} from './garakUi';
import { getLoginSyncViewModel } from './loginSyncScreenModel';

type ProductDispatch = (action: GarakProductAction) => void;
const FREE_CREATION_GUIDE_STEPS = ['악기 선택', '연주 & 녹음', '트랙추가', '믹싱', 'AI 반주 추가', '저장 및 공유'] as const;

export function LanguageContent() {
  return (
    <View style={styles.stack}>
      <ScreenHeading title="언어 전환" compact />
      <SettingRow label="한국어" value="선택됨" />
      <SettingRow label="English" value="Available" />
    </View>
  );
}

export function IntroGuideContent({ dispatch }: { state: GarakProductState; dispatch: ProductDispatch }) {
  const { height } = useWindowDimensions();
  const isCompactHeight = height < 820;

  return (
    <View style={styles.modeGuideScreen}>
      <Text style={[styles.modeGuideTitle, isCompactHeight ? styles.modeGuideTitleCompact : undefined]}>
        원하는 <Text style={styles.modeGuideTitleStrong}>연주모드</Text>를{'\n'}선택해요.
      </Text>
      <View style={[styles.modeToggleRow, isCompactHeight ? styles.modeToggleRowCompact : undefined]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: true }}
          onPress={() => undefined}
          style={[styles.modeToggleButton, styles.modeToggleButtonActive]}
        >
          <Text style={[styles.modeToggleText, styles.modeToggleTextActive]}>자유창작 모드</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: false }}
          onPress={() => dispatch({ type: 'navigate', target: 'S13' })}
          style={styles.modeToggleButton}
        >
          <Text style={styles.modeToggleText}>따라하기 모드</Text>
        </Pressable>
      </View>
      <View style={[styles.modeGuidePanel, isCompactHeight ? styles.modeGuidePanelCompact : undefined]}>
        <Text style={styles.modeGuideDescription}>
          자유창작 모드에서는 악기를{'\n'}자유롭게 연주 할 수 있습니다.
        </Text>
        <View style={[styles.modeGuideSteps, isCompactHeight ? styles.modeGuideStepsCompact : undefined]}>
          {FREE_CREATION_GUIDE_STEPS.map((step, index) => (
            <View key={step} style={styles.modeGuideStepGroup}>
              <View style={styles.modeGuideStepPill}>
                <Text style={styles.modeGuideStepText}>{step}</Text>
              </View>
              {index < FREE_CREATION_GUIDE_STEPS.length - 1 ? (
                <View
                  style={[
                    styles.modeGuideStepConnector,
                    isCompactHeight ? styles.modeGuideStepConnectorCompact : undefined,
                  ]}
                />
              ) : null}
            </View>
          ))}
        </View>
        <View style={[styles.modeGuideBottom, isCompactHeight ? styles.modeGuideBottomCompact : undefined]}>
          <ProgressSteps step={0} />
          <PrimaryPillButton label="NEXT" onPress={() => dispatch({ type: 'navigate', target: 'S04' })} />
        </View>
      </View>
    </View>
  );
}

export function SettingsContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  return (
    <View style={styles.stack}>
      <ScreenHeading title="마이 / 설정" compact description="게스트 상태에서도 보관함과 언어 설정을 사용할 수 있습니다." />
      <View style={styles.settingsCard}>
        <SettingRow label="현재 상태" value={state.account.status === 'guest' ? '게스트' : '로그인'} />
        <SettingRow label="로컬 작업" value={`${state.library.works.length}개`} />
        <SettingRow label="언어" value="한국어" />
      </View>
      <View style={styles.settingsActionRow}>
        <SettingsActionButton
          label="언어 변경"
          onPress={() => dispatch({ type: 'navigate', target: 'S02' })}
        />
        <SettingsActionButton
          label="보관함 관리"
          onPress={() => dispatch({ type: 'navigate', target: 'S18' })}
        />
      </View>
      <PrimaryPillButton
        label="로그인하고 내 곡 불러오기"
        onPress={() => dispatch({ type: 'loginAndLoadMySongs' })}
      />
      <QuickAccessNav
        active="library"
        onLibrary={() => dispatch({ type: 'navigate', target: 'S18' })}
        onHome={() => dispatch({ type: 'navigate', target: 'S01' })}
        onShare={() => dispatch({ type: 'navigate', target: 'S20' })}
      />
    </View>
  );
}

export function LoginSyncContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const model = getLoginSyncViewModel(state);

  return (
    <View style={[styles.stack, styles.loginScreenStack]}>
      <View style={styles.loginHero}>
        <GarakLogo width={118} />
        <Text style={styles.loginTagline}>AI와 함께 만드는 나만의 국악, GARAK</Text>
      </View>
      <View style={styles.syncCard}>
        <Text style={styles.cardTitle}>보관함 동기화 미리보기</Text>
        <Text style={styles.bodyText}>{model.statusLabel}</Text>
        <View style={styles.syncPreviewStack}>
          <SyncPreviewRow label="로컬 보관함" value={model.localSummary} />
          <SyncPreviewRow label="계정 보관함" value={model.accountSummary} />
          <SyncPreviewRow label="충돌 항목" value={model.conflictLabel} />
          <SyncPreviewRow label="동기화 결과" value={model.syncPreviewLabel} />
        </View>
        {model.emptyAccountMessage === undefined ? null : (
          <Text style={styles.syncEmptyText}>{model.emptyAccountMessage}</Text>
        )}
      </View>
      <View style={styles.loginActions}>
        <LoginCapsuleButton
          accessibilityLabel="Google로 로그인"
          onPress={() => dispatch(model.actions.login)}
        >
          <GoogleIcon />
        </LoginCapsuleButton>
        <View style={styles.syncActionGrid}>
          <SyncActionButton
            label="동기화"
            onPress={() => dispatch(model.actions.sync)}
          />
          <SyncActionButton
            label="선택해서 가져오기"
            onPress={() => dispatch(model.actions.importSelected)}
          />
          <SyncActionButton
            label="건너뛰기"
            onPress={() => dispatch(model.actions.skip)}
            wide
          />
        </View>
      </View>
    </View>
  );
}

function SyncActionButton({
  label,
  onPress,
  wide,
}: {
  label: string;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.syncActionButton,
        wide ? styles.syncActionButtonWide : undefined,
        pressed ? styles.pressedCapsuleButton : undefined,
      ]}
    >
      <Text numberOfLines={1} style={styles.syncActionButtonText}>{label}</Text>
    </Pressable>
  );
}

function SyncPreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.syncPreviewRow}>
      <Text style={styles.syncPreviewLabel}>{label}</Text>
      <Text style={styles.syncPreviewValue}>{value}</Text>
    </View>
  );
}

function LoginCapsuleButton({
  accessibilityLabel,
  children,
  onPress,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.loginCapsuleButton, pressed ? styles.pressedCapsuleButton : undefined]}
    >
      {children}
    </Pressable>
  );
}

function GoogleIcon() {
  return (
    <Svg
      accessibilityLabel="Google"
      height={GARAK_AUTH_BUTTON_LAYOUT.googleIconSize}
      viewBox="0 0 24 24"
      width={GARAK_AUTH_BUTTON_LAYOUT.googleIconSize}
    >
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84C3.96 20.53 7.68 23 12 23Z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.15A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.15 4.94l3.69-2.84Z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.68 1 3.96 3.47 2.15 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
  );
}

function SettingsActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.settingsActionButton, pressed ? styles.pressedCapsuleButton : undefined]}
    >
      <Text style={styles.settingsActionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 18,
  },
  modeGuideScreen: {
    gap: 0,
  },
  modeGuideTitle: {
    color: '#606060',
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 34,
    marginTop: 27,
  },
  modeGuideTitleCompact: {
    fontSize: 27,
    lineHeight: 32,
    marginTop: 18,
  },
  modeGuideTitleStrong: {
    color: '#191919',
    fontWeight: '800',
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 41,
  },
  modeToggleRowCompact: {
    marginTop: 30,
  },
  modeToggleButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 17,
    flex: 1,
    height: 27,
    justifyContent: 'center',
    ...garakCardShadow,
  },
  modeToggleButtonActive: {
    backgroundColor: GARAK_COLORS.brandNavy,
  },
  modeToggleText: {
    color: '#ACACAC',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0,
  },
  modeToggleTextActive: {
    color: GARAK_COLORS.surfaceCard,
    fontWeight: '700',
  },
  modeGuidePanel: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCanvas,
    borderColor: 'rgba(0,0,0,0.04)',
    borderRadius: 40,
    borderWidth: 1,
    marginTop: 34,
    minHeight: 540,
    paddingHorizontal: 0,
    paddingTop: 39,
    ...garakCardShadow,
  },
  modeGuidePanelCompact: {
    marginTop: 22,
    minHeight: 464,
    paddingTop: 30,
  },
  modeGuideDescription: {
    color: 'rgba(25,25,25,0.7)',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 17,
    textAlign: 'center',
  },
  modeGuideSteps: {
    alignItems: 'center',
    marginTop: 35,
  },
  modeGuideStepsCompact: {
    marginTop: 26,
  },
  modeGuideStepGroup: {
    alignItems: 'center',
  },
  modeGuideStepPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(229,145,0,0.3)',
    borderColor: GARAK_COLORS.brandAmber,
    borderRadius: 15,
    borderWidth: 1,
    height: 29,
    justifyContent: 'center',
    width: 116,
  },
  modeGuideStepText: {
    color: '#191919',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 19,
    textAlign: 'center',
  },
  modeGuideStepConnector: {
    backgroundColor: GARAK_COLORS.brandAmber,
    height: 23,
    width: 3,
  },
  modeGuideStepConnectorCompact: {
    height: 17,
  },
  modeGuideBottom: {
    alignSelf: 'stretch',
    gap: 13,
    marginTop: 54,
  },
  modeGuideBottomCompact: {
    marginTop: 26,
  },
  bodyText: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  settingsCard: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 24,
    overflow: 'hidden',
    ...garakCardShadow,
  },
  settingRow: {
    alignItems: 'center',
    borderBottomColor: GARAK_COLORS.lineSoft,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 18,
  },
  settingLabel: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  settingValue: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  settingsActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  settingsActionButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderColor: GARAK_COLORS.lineSoft,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 12,
    ...garakCardShadow,
  },
  settingsActionText: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  loginHero: {
    alignItems: 'center',
    gap: 12,
    minHeight: 190,
    justifyContent: 'center',
  },
  loginScreenStack: {
    minHeight: 650,
  },
  loginTagline: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  syncCard: {
    alignSelf: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 24,
    gap: 8,
    maxWidth: GARAK_AUTH_BUTTON_LAYOUT.buttonWidth,
    padding: 18,
    width: '100%',
  },
  cardTitle: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  syncPreviewStack: {
    borderColor: GARAK_COLORS.lineSoft,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  syncPreviewRow: {
    borderBottomColor: GARAK_COLORS.lineSoft,
    borderBottomWidth: 1,
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  syncPreviewLabel: {
    color: GARAK_COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  syncPreviewValue: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  syncEmptyText: {
    color: GARAK_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  loginActions: {
    alignSelf: 'center',
    gap: 12,
    maxWidth: GARAK_AUTH_BUTTON_LAYOUT.buttonWidth,
    width: '100%',
  },
  loginCapsuleButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: GARAK_AUTH_BUTTON_LAYOUT.cornerRadius,
    height: GARAK_AUTH_BUTTON_LAYOUT.buttonHeight,
    justifyContent: 'center',
    width: '100%',
    ...garakCardShadow,
  },
  syncActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  syncActionButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderColor: GARAK_COLORS.lineSoft,
    borderRadius: 23,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    height: 46,
    justifyContent: 'center',
    paddingHorizontal: 10,
    ...garakCardShadow,
  },
  syncActionButtonWide: {
    flexBasis: '100%',
  },
  syncActionButtonText: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  pressedCapsuleButton: {
    opacity: 0.82,
  },
});

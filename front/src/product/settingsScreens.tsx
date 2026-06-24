import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  GARAK_AUTH_BUTTON_LAYOUT,
  GARAK_COLORS,
  GARAK_ONBOARDING_LOGOS,
} from './garakDesignSystem';
import { GarakLogo, GarakLogoVariant } from './GarakLogo';
import { GarakProductAction, GarakProductState } from './garakProductState';
import {
  PrimaryPillButton,
  QuickAccessNav,
  ScreenHeading,
  garakCardShadow,
} from './garakUi';

type ProductDispatch = (action: GarakProductAction) => void;

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
  return (
    <View style={styles.onboardingStack}>
      <View style={styles.onboardingHero}>
        <OnboardingLogoSurface fileName="logo1.svg" size="large" />
        <View style={styles.onboardingLogoRow}>
          <OnboardingLogoSurface fileName="logo2.svg" size="small" />
          <OnboardingLogoSurface fileName="logo3.svg" size="small" />
        </View>
      </View>
      <ScreenHeading
        title="GARAK에 오신 것을 환영해요"
        compact
        description="AI와 함께 만드는 나만의 국악을 바로 연주해볼 수 있어요."
      />
      <PrimaryPillButton label="다음 단계로" onPress={() => dispatch({ type: 'navigate', target: 'S05' })} />
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
  return (
    <View style={[styles.stack, styles.loginScreenStack]}>
      <View style={styles.loginHero}>
        <GarakLogo width={118} />
        <Text style={styles.loginTagline}>AI와 함께 만드는 나만의 국악, GARAK</Text>
      </View>
      <View style={styles.syncCard}>
        <Text style={styles.cardTitle}>로컬 보관함 유지</Text>
        <Text style={styles.bodyText}>
          현재 로컬 작업 {state.library.works.length}개를 유지한 채 계정에 저장된 곡을 불러옵니다.
        </Text>
      </View>
      <View style={styles.loginActions}>
        <LoginCapsuleButton
          accessibilityLabel="Google로 로그인"
          onPress={() => dispatch({ type: 'navigate', target: 'S18' })}
        >
          <GoogleIcon />
        </LoginCapsuleButton>
        <LoginCapsuleButton
          accessibilityLabel="Guest Mode"
          onPress={() => dispatch({ type: 'navigate', target: 'S22' })}
        >
          <Text style={styles.guestButtonText}>Guest Mode</Text>
        </LoginCapsuleButton>
      </View>
    </View>
  );
}

function OnboardingLogoSurface({
  fileName,
  size,
}: {
  fileName: (typeof GARAK_ONBOARDING_LOGOS)[number]['fileName'];
  size: 'large' | 'small';
}) {
  const logo = GARAK_ONBOARDING_LOGOS.find((candidate) => candidate.fileName === fileName);

  if (!logo) {
    return null;
  }

  return (
    <View
      accessibilityLabel={fileName.replace('.svg', '')}
      style={[
        styles.onboardingLogoSurface,
        size === 'large' ? styles.onboardingLogoSurfaceLarge : styles.onboardingLogoSurfaceSmall,
        { backgroundColor: logo.backgroundColor },
      ]}
    >
      <GarakLogo variant={getLogoVariant(fileName)} width={size === 'large' ? 122 : 82} />
    </View>
  );
}

function getLogoVariant(fileName: (typeof GARAK_ONBOARDING_LOGOS)[number]['fileName']): GarakLogoVariant {
  switch (fileName) {
    case 'logo2.svg':
      return 'amber';
    case 'logo3.svg':
      return 'light';
    case 'logo1.svg':
      return 'red';
  }
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

const styles = StyleSheet.create({
  stack: {
    gap: 18,
  },
  onboardingStack: {
    gap: 18,
  },
  onboardingHero: {
    gap: 12,
  },
  onboardingLogoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  onboardingLogoSurface: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...garakCardShadow,
  },
  onboardingLogoSurfaceLarge: {
    borderRadius: 36,
    minHeight: 220,
    width: '100%',
  },
  onboardingLogoSurfaceSmall: {
    borderRadius: 24,
    flex: 1,
    minHeight: 116,
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
  loginHero: {
    alignItems: 'center',
    gap: 12,
    minHeight: 240,
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
  loginActions: {
    alignSelf: 'center',
    gap: GARAK_AUTH_BUTTON_LAYOUT.gap,
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
  pressedCapsuleButton: {
    opacity: 0.82,
  },
  guestButtonText: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
});

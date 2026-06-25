import { Pressable, StyleSheet, View } from 'react-native';
import { GarakLogo } from './GarakLogo';
import { GARAK_COLORS, GARAK_RADII, GARAK_SPACING, GARAK_TYPOGRAPHY } from './designTokens';
import { GarakText as Text } from './garakTypography';

export type GarakOnboardingStep = 'canvasRed' | 'navyAmber' | 'redLight' | 'intro';

type GarakOnboardingScreenProps = {
  step: GarakOnboardingStep;
};

export function GarakOnboardingScreen({ step }: GarakOnboardingScreenProps) {
  const surface = getOnboardingSurface(step);

  return (
    <View style={[styles.screen, { backgroundColor: surface.backgroundColor }]}>
      <View style={styles.centerBrand}>
        <GarakLogo variant={surface.logoVariant} width={102} />
        {step === 'intro' ? (
          <Text style={styles.introSubtitle}>AI와 함께 만드는 나만의 국악, 가락</Text>
        ) : null}
      </View>
      <View style={styles.homeIndicator} />
    </View>
  );
}

type GarakLoginScreenProps = {
  isSubmitting: boolean;
  errorMessage?: string;
  onGooglePress: () => void;
  onGuestPress: () => void;
};

export function GarakLoginScreen({
  isSubmitting,
  errorMessage,
  onGooglePress,
  onGuestPress,
}: GarakLoginScreenProps) {
  return (
    <View style={styles.loginScreen}>
      <View style={styles.loginBrand}>
        <GarakLogo variant="red" width={96} />
        <Text style={styles.introSubtitle}>AI와 함께 만드는 나만의 국악, 가락</Text>
      </View>

      <View style={styles.loginActions}>
        {errorMessage ? (
          <Text selectable style={styles.errorText}>
            {errorMessage}
          </Text>
        ) : null}
        <AuthButton disabled={isSubmitting} label="Google로 계속하기" mark="G" onPress={onGooglePress} />
        <AuthButton disabled={isSubmitting} label="Guest Mode" onPress={onGuestPress} />
      </View>
      <View style={styles.homeIndicator} />
    </View>
  );
}

export function GarakAuthLoadingScreen() {
  return (
    <View style={styles.loginScreen}>
      <View style={styles.loginBrand}>
        <GarakLogo variant="red" width={96} />
        <Text style={styles.introSubtitle}>로그인 상태 확인 중</Text>
      </View>
      <View style={styles.homeIndicator} />
    </View>
  );
}

function AuthButton({
  disabled,
  label,
  mark,
  onPress,
}: {
  disabled: boolean;
  label: string;
  mark?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.authButton,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {mark ? (
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.googleMark}
        >
          {mark}
        </Text>
      ) : (
        <View style={styles.markSpacer} />
      )}
      <Text style={styles.authButtonText}>{disabled ? '처리 중' : label}</Text>
      <View style={styles.markSpacer} />
    </Pressable>
  );
}

function getOnboardingSurface(step: GarakOnboardingStep): {
  backgroundColor: string;
  logoVariant: 'red' | 'amber' | 'light';
} {
  switch (step) {
    case 'navyAmber':
      return {
        backgroundColor: GARAK_COLORS.brand.navy,
        logoVariant: 'amber',
      };
    case 'redLight':
      return {
        backgroundColor: GARAK_COLORS.brand.red,
        logoVariant: 'light',
      };
    case 'intro':
    case 'canvasRed':
      return {
        backgroundColor: GARAK_COLORS.neutral.canvas,
        logoVariant: 'red',
      };
  }
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  centerBrand: {
    alignItems: 'center',
    gap: GARAK_SPACING.md,
  },
  introSubtitle: {
    color: GARAK_COLORS.text.primary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  loginScreen: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.neutral.canvas,
    flex: 1,
    gap: 104,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loginBrand: {
    alignItems: 'center',
    gap: GARAK_SPACING.sm,
  },
  loginActions: {
    gap: GARAK_SPACING.md,
    maxWidth: 360,
    width: '100%',
  },
  authButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.neutral.card,
    borderRadius: GARAK_RADII.button,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.58,
  },
  googleMark: {
    color: '#4285F4',
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 16,
    fontWeight: '800',
    width: 24,
  },
  markSpacer: {
    width: 24,
  },
  authButtonText: {
    color: GARAK_COLORS.text.primary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: GARAK_COLORS.brand.red,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  homeIndicator: {
    backgroundColor: GARAK_COLORS.text.black,
    borderRadius: GARAK_RADII.circle,
    bottom: 9,
    height: 3,
    opacity: 0.9,
    position: 'absolute',
    width: 68,
  },
});

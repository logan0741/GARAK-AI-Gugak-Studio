import { useFonts } from 'expo-font';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { createGarakAuthApi } from './authApi';
import { GARAK_GOOGLE_WEB_CLIENT_ID } from './authConfig';
import { restoreAuthSession, signInWithGoogle } from './authFlow';
import { GarakAuthLoadingScreen, GarakLoginScreen, GarakOnboardingScreen } from './authScreens';
import { createAuthSessionStore } from './authSessionStore';
import { createDefaultAuthStorage } from './authStorage';
import { GARAK_COLORS, GARAK_TYPOGRAPHY } from './designTokens';
import { AccountState } from './garakProductState';
import { GarakScreenFlowApp } from './GarakScreenFlowApp';
import {
  PRODUCT_SAMPLE_FALLBACK_INSTRUMENTS,
  PRODUCT_SAMPLE_MANIFESTS,
} from './productSampleReadinessConfig';
import { createRuntimeGoogleIdentityProvider } from './runtimeGoogleIdentity';

const ONBOARDING_STEPS = ['canvasRed', 'navyAmber', 'redLight', 'intro'] as const;

type AuthEntryState =
  | {
      status: 'booting';
    }
  | {
      status: 'onboarding';
      stepIndex: number;
    }
  | {
      status: 'login';
      isSubmitting: boolean;
      errorMessage?: string;
    }
  | {
      status: 'product';
      account: AccountState;
    };

export function GarakAuthEntryApp() {
  const [fontsLoaded] = useFonts({
    [GARAK_TYPOGRAPHY.fontFamily]: require('../../assets/fonts/PretendardVariable.ttf'),
  });
  const sessionStore = useMemo(() => createAuthSessionStore(createDefaultAuthStorage()), []);
  const [entryState, setEntryState] = useState<AuthEntryState>({ status: 'booting' });

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const restored = await restoreAuthSession({
          authApi: createGarakAuthApi(),
          sessionStore,
        });

        if (!isMounted) {
          return;
        }

        setEntryState(
          restored === null
            ? {
                status: 'onboarding',
                stepIndex: 0,
              }
            : {
                status: 'product',
                account: restored.account,
              },
        );
      } catch {
        if (isMounted) {
          setEntryState({
            status: 'onboarding',
            stepIndex: 0,
          });
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [sessionStore]);

  useEffect(() => {
    if (entryState.status !== 'onboarding') {
      return undefined;
    }

    const isLastStep = entryState.stepIndex >= ONBOARDING_STEPS.length - 1;
    const timeout = setTimeout(
      () =>
        setEntryState(
          isLastStep
            ? {
                status: 'login',
                isSubmitting: false,
              }
            : {
                status: 'onboarding',
                stepIndex: entryState.stepIndex + 1,
              },
        ),
      isLastStep ? 900 : 650,
    );

    return () => clearTimeout(timeout);
  }, [entryState]);

  async function handleGooglePress() {
    setEntryState({
      status: 'login',
      isSubmitting: true,
    });

    try {
      const googleIdentity = await createRuntimeGoogleIdentityProvider(GARAK_GOOGLE_WEB_CLIENT_ID);
      const result = await signInWithGoogle({
        googleIdentity,
        authApi: createGarakAuthApi(),
        sessionStore,
      });

      setEntryState({
        status: 'product',
        account: result.account,
      });
    } catch (error) {
      setEntryState({
        status: 'login',
        isSubmitting: false,
        errorMessage: getAuthErrorMessage(error),
      });
    }
  }

  async function handleGuestPress() {
    await sessionStore.clear();
    setEntryState({
      status: 'product',
      account: {
        status: 'guest',
      },
    });
  }

  async function handleLogout() {
    await sessionStore.clear();
    setEntryState({
      status: 'login',
      isSubmitting: false,
    });
  }

  if (!fontsLoaded) {
    return <SafeAreaView style={styles.safeArea} />;
  }

  if (entryState.status === 'product') {
    return (
      <GarakScreenFlowApp
        key={entryState.account.status === 'loggedIn' ? entryState.account.userId : 'guest'}
        account={entryState.account}
        onLogout={handleLogout}
        sampleManifests={PRODUCT_SAMPLE_MANIFESTS}
        sampleFallbackInstruments={PRODUCT_SAMPLE_FALLBACK_INSTRUMENTS}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        {renderAuthEntryState(entryState, handleGooglePress, handleGuestPress)}
      </View>
    </SafeAreaView>
  );
}

function renderAuthEntryState(
  entryState: Exclude<AuthEntryState, { status: 'product' }>,
  onGooglePress: () => void,
  onGuestPress: () => void,
) {
  switch (entryState.status) {
    case 'booting':
      return <GarakAuthLoadingScreen />;
    case 'onboarding':
      return <GarakOnboardingScreen step={ONBOARDING_STEPS[entryState.stepIndex]} />;
    case 'login':
      return (
        <GarakLoginScreen
          errorMessage={entryState.errorMessage}
          isSubmitting={entryState.isSubmitting}
          onGooglePress={onGooglePress}
          onGuestPress={onGuestPress}
        />
      );
  }
}

function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return '로그인 중 문제가 발생했습니다.';
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: GARAK_COLORS.brand.navy,
    flex: 1,
  },
  phoneFrame: {
    alignSelf: 'center',
    backgroundColor: GARAK_COLORS.neutral.canvas,
    flex: 1,
    maxWidth: 430,
    width: '100%',
  },
});

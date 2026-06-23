import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GARAK_COLORS } from './garakDesignSystem';
import { GarakProductAction, GarakProductState } from './garakProductState';
import {
  GarakWordmark,
  PrimaryPillButton,
  QuickAccessNav,
  ScreenHeading,
  SecondaryPillButton,
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
    <View style={styles.stack}>
      <ScreenHeading title="입문 가이드" compact description="농현, 추성, 퇴성의 기본 움직임을 짧게 확인합니다." />
      <View style={styles.guideCard}>
        <Text style={styles.guideMark}>GARAK</Text>
        <Text style={styles.bodyText}>현을 누르고, 밀고, 놓는 동작이 PerformanceEvent로 기록됩니다.</Text>
      </View>
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
    <View style={styles.stack}>
      <View style={styles.loginHero}>
        <GarakWordmark />
        <Text style={styles.loginTagline}>AI와 함께 만드는 나만의 국악, 가락</Text>
      </View>
      <View style={styles.syncCard}>
        <Text style={styles.cardTitle}>로컬 보관함 유지</Text>
        <Text style={styles.bodyText}>
          현재 로컬 작업 {state.library.works.length}개를 유지한 채 계정에 저장된 곡을 불러옵니다.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'navigate', target: 'S18' })}
        style={styles.googleButton}
      >
        <Text style={styles.googleDot}>G</Text>
        <Text style={styles.googleButtonText}>Google로 로그인</Text>
      </Pressable>
      <View style={styles.buttonRow}>
        <SecondaryPillButton label="동기화" onPress={() => dispatch({ type: 'navigate', target: 'S18' })} />
        <SecondaryPillButton label="Guest Mode" onPress={() => dispatch({ type: 'navigate', target: 'S22' })} />
      </View>
    </View>
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
  guideCard: {
    backgroundColor: GARAK_COLORS.brandNavy,
    borderRadius: 26,
    gap: 16,
    minHeight: 220,
    padding: 24,
  },
  guideMark: {
    color: GARAK_COLORS.brandAmber,
    fontSize: 28,
    fontWeight: '800',
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
  loginTagline: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  syncCard: {
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 24,
    gap: 8,
    padding: 18,
  },
  cardTitle: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.surfaceCard,
    borderRadius: 30,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 60,
    ...garakCardShadow,
  },
  googleDot: {
    color: '#4285F7',
    fontSize: 18,
    fontWeight: '800',
  },
  googleButtonText: {
    color: GARAK_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
});

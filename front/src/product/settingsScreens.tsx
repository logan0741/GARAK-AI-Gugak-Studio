import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GARAK_COLORS, GARAK_RADII, GARAK_SPACING } from './designTokens';
import { GarakProductAction, GarakProductState } from './garakProductState';

type ProductDispatch = (action: GarakProductAction) => void;

export function LanguageContent() {
  return (
    <View style={styles.stack}>
      <SettingRow label="한국어" value="선택됨" />
      <SettingRow label="English" value="Available" />
    </View>
  );
}

export function IntroGuideContent({ dispatch }: { state: GarakProductState; dispatch: ProductDispatch }) {
  return (
    <View style={styles.stack}>
      <View style={styles.panel}>
        <Text style={styles.title}>입문 가이드</Text>
        <Text style={styles.bodyText}>농현, 추성, 퇴성의 기본 움직임을 짧게 확인합니다.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'navigate', target: 'S05' })}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>다음 단계로</Text>
      </Pressable>
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
      <SettingRow label="현재 상태" value={state.account.status === 'guest' ? '게스트' : '로그인'} />
      <SettingRow label="로컬 작업" value={`${state.library.works.length}개`} />
      <SettingRow label="언어" value="한국어" />
      <Pressable
        accessibilityRole="button"
        onPress={() => dispatch({ type: 'loginAndLoadMySongs' })}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>로그인하고 내 곡 불러오기</Text>
      </Pressable>
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
      <View style={styles.panel}>
        <Text style={styles.title}>로컬 보관함 유지</Text>
        <Text style={styles.bodyText}>
          현재 로컬 작업 {state.library.works.length}개를 유지한 채 계정에 저장된 곡을 불러옵니다.
        </Text>
      </View>
      <View style={styles.buttonRow}>
        <SecondaryButton label="로그인" onPress={() => dispatch({ type: 'navigate', target: 'S18' })} />
        <SecondaryButton label="동기화" onPress={() => dispatch({ type: 'navigate', target: 'S18' })} />
        <SecondaryButton label="건너뛰기" onPress={() => dispatch({ type: 'navigate', target: 'S22' })} />
      </View>
    </View>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.title}>{label}</Text>
      <Text style={styles.valueText}>{value}</Text>
    </View>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondaryButton}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: GARAK_SPACING.md,
  },
  panel: {
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.card,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  settingRow: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.card,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 16,
  },
  title: {
    color: GARAK_COLORS.text.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  valueText: {
    color: GARAK_COLORS.brand.amber,
    fontSize: 13,
  },
  bodyText: {
    color: GARAK_COLORS.text.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.brand.navy,
    borderRadius: GARAK_RADII.button,
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonText: {
    color: GARAK_COLORS.text.inverse,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: GARAK_COLORS.neutral.soft,
    borderColor: GARAK_COLORS.neutral.border,
    borderRadius: GARAK_RADII.button,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryButtonText: {
    color: GARAK_COLORS.text.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});

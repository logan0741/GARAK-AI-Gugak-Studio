import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GARAK_COLORS, GARAK_RADII, GARAK_SPACING, GARAK_TYPOGRAPHY } from './designTokens';
import { GarakProductAction, GarakProductState } from './garakProductState';

type ProductDispatch = (action: GarakProductAction) => void;

export function SharePrepareContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const hasShareable =
    state.library.exportedAudios.length > 0 || state.library.practiceResults.length > 0;

  return (
    <View style={styles.stack}>
      <View style={styles.previewPanel}>
        <Text style={styles.title}>{hasShareable ? '공유 미리보기' : '공유할 결과가 필요해요'}</Text>
        <Text style={styles.bodyText}>
          {hasShareable
            ? '제목, 길이, 사용 악기를 확인한 뒤 공유할 수 있습니다.'
            : '작업을 내보내거나 따라하기 결과를 저장하면 공유할 수 있습니다.'}
        </Text>
      </View>
      <View style={styles.buttonRow}>
        <SecondaryButton
          disabled={!hasShareable}
          label="공유하기"
          onPress={() => dispatch({ type: 'navigate', target: 'S20' })}
        />
        <SecondaryButton
          disabled={!hasShareable}
          label="저장만 하기"
          onPress={() => dispatch({ type: 'navigate', target: 'S18' })}
        />
      </View>
    </View>
  );
}

export function ShareFeedContent({ dispatch }: { state: GarakProductState; dispatch: ProductDispatch }) {
  return (
    <View style={styles.stack}>
      {['아침의 아리랑', '중모리 위의 대금', '장구 레이어 데모'].map((title) => (
        <Pressable
          accessibilityRole="button"
          key={title}
          onPress={() => dispatch({ type: 'navigate', target: 'S21' })}
          style={styles.feedItem}
        >
          <Text style={[styles.title, styles.feedTitle]}>{title}</Text>
          <Text style={[styles.bodyText, styles.feedBodyText]}>GARAK 데모 피드 · 재생 · 리믹스</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SharedDetailContent({ dispatch }: { state: GarakProductState; dispatch: ProductDispatch }) {
  return (
    <View style={styles.stack}>
      <View style={styles.previewPanel}>
        <Text style={styles.title}>아침의 아리랑</Text>
        <Text style={styles.bodyText}>공유 곡을 듣고 새 작업의 참조 트랙으로 리믹스할 수 있습니다.</Text>
      </View>
      <View style={styles.buttonRow}>
        <SecondaryButton label="리믹스" onPress={() => dispatch({ type: 'navigate', target: 'S07' })} />
        <SecondaryButton label="저장" onPress={() => dispatch({ type: 'navigate', target: 'S18' })} />
      </View>
    </View>
  );
}

function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.secondaryButton, disabled ? styles.disabledButton : undefined]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: GARAK_SPACING.md,
  },
  previewPanel: {
    backgroundColor: GARAK_COLORS.brand.navy,
    borderRadius: GARAK_RADII.card,
    gap: 12,
    minHeight: 220,
    padding: 20,
  },
  title: {
    color: GARAK_COLORS.text.inverse,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 16,
    fontWeight: '700',
  },
  bodyText: {
    color: GARAK_COLORS.neutral.canvas,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 13,
    lineHeight: 19,
  },
  feedItem: {
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.card,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  feedTitle: {
    color: GARAK_COLORS.text.primary,
  },
  feedBodyText: {
    color: GARAK_COLORS.text.secondary,
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
  disabledButton: {
    opacity: 0.5,
  },
  secondaryButtonText: {
    color: GARAK_COLORS.text.primary,
    fontFamily: GARAK_TYPOGRAPHY.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
});

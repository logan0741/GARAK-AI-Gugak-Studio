import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GARAK_COLORS, GARAK_RADII, GARAK_SPACING } from './designTokens';
import { GarakProductAction, GarakProductState } from './garakProductState';
import { getInstrumentName } from './productFixtures';

type ProductDispatch = (action: GarakProductAction) => void;

export function LibraryContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  return (
    <View style={styles.stack}>
      <Text style={styles.sectionTitle}>작업</Text>
      {state.library.works.length === 0 ? (
        <EmptyState label="아직 만든 작업이 없어요." />
      ) : (
        state.library.works.map((work) => (
          <Pressable
            accessibilityRole="button"
            key={work.id}
            onPress={() => dispatch({ type: 'openWork', workId: work.id })}
            style={styles.listItem}
          >
            <Text style={styles.itemTitle}>{work.title}</Text>
            <Text style={styles.itemMeta}>{work.tracks.length} tracks · 로컬</Text>
          </Pressable>
        ))
      )}
      <Text style={styles.sectionTitle}>내보낸 음원 / 결과</Text>
      {[...state.library.exportedAudios, ...state.library.practiceResults].length === 0 ? (
        <EmptyState label="아직 내보낸 음원이나 결과가 없어요." />
      ) : (
        [...state.library.exportedAudios, ...state.library.practiceResults].map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.id}
            onPress={() => dispatch({ type: 'navigate', target: 'S19' })}
            style={styles.listItem}
          >
            <Text style={styles.itemTitle}>
              {item.kind === 'exported_audio' ? item.title : `${getInstrumentName(item.instrument)} 연습 결과`}
            </Text>
            <Text style={styles.itemMeta}>{item.shareState}</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

export function PlayerDetailContent({
  state,
  dispatch,
}: {
  state: GarakProductState;
  dispatch: ProductDispatch;
}) {
  const exported = state.library.exportedAudios[0];

  return (
    <View style={styles.stack}>
      <View style={styles.playerPanel}>
        <Text style={styles.itemTitle}>{exported?.title ?? '연주 상세'}</Text>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
        <Text style={styles.itemMeta}>사용 악기 {exported?.instrumentNames.join(', ') || '가야금'}</Text>
      </View>
      <View style={styles.buttonRow}>
        <SecondaryButton label="편집으로 열기" onPress={() => dispatch({ type: 'navigate', target: 'S07' })} />
        <SecondaryButton label="공유" onPress={() => dispatch({ type: 'navigate', target: 'S17' })} />
      </View>
    </View>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.itemMeta}>{label}</Text>
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
  sectionTitle: {
    color: GARAK_COLORS.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  listItem: {
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.card,
    borderWidth: 1,
    gap: 5,
    padding: 16,
  },
  itemTitle: {
    color: GARAK_COLORS.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  itemMeta: {
    color: GARAK_COLORS.text.secondary,
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: GARAK_COLORS.neutral.muted,
    borderRadius: GARAK_RADII.card,
    padding: 16,
  },
  playerPanel: {
    backgroundColor: GARAK_COLORS.neutral.card,
    borderColor: GARAK_COLORS.neutral.soft,
    borderRadius: GARAK_RADII.card,
    borderWidth: 1,
    gap: 18,
    padding: 20,
  },
  progressBar: {
    backgroundColor: GARAK_COLORS.neutral.muted,
    borderRadius: 4,
    height: 8,
  },
  progressFill: {
    backgroundColor: GARAK_COLORS.brand.amber,
    borderRadius: 4,
    height: 8,
    width: '38%',
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

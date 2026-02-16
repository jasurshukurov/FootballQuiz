import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import GlassCard from '@/components/ui/GlassCard';
import { colors, spacing, fonts } from '@/constants/theme';
import { HintButton } from '@/components/career/HintButton';

interface HintPanelProps {
  unlockedHints: string[];
  onUnlockHint: (hintId: string) => void;
  freeHintsRemaining: number;
}

const HINTS = [
  { hintId: 'SORT', label: 'Sort Timeline', icon: 'sort' },
  { hintId: 'NATIONALITY', label: 'Nationality', icon: 'flag' },
  { hintId: 'POSITION', label: 'Position', icon: 'futbol-o' },
  { hintId: 'YEARS', label: 'Years', icon: 'calendar' },
] as const;

function HintPanelInner({ unlockedHints, onUnlockHint, freeHintsRemaining }: HintPanelProps) {
  const unlockedSet = useMemo(() => new Set(unlockedHints), [unlockedHints]);
  const isPremium = freeHintsRemaining <= 0;

  const handlePress = useCallback((hintId: string) => () => onUnlockHint(hintId), [onUnlockHint]);

  const renderHint = useCallback(
    (hint: (typeof HINTS)[number]) => {
      const isUnlocked = unlockedSet.has(hint.hintId);
      const isLocked = hint.hintId === 'YEARS' && !unlockedSet.has('SORT');

      return (
        <HintButton
          key={hint.hintId}
          hintId={hint.hintId}
          label={hint.label}
          icon={hint.icon}
          isUnlocked={isUnlocked}
          isLocked={isLocked}
          isPremium={isPremium && !isUnlocked}
          onPress={handlePress(hint.hintId)}
          disabled={isLocked}
        />
      );
    },
    [unlockedSet, isPremium, handlePress],
  );

  const hasFreeHints = freeHintsRemaining > 0;

  return (
    <GlassCard style={styles.container}>
      <Text
        style={[styles.freeText, { color: hasFreeHints ? colors.pitchGreen : colors.cardYellow }]}>
        {hasFreeHints
          ? `${freeHintsRemaining} free hint${freeHintsRemaining !== 1 ? 's' : ''} left`
          : 'Watch ad to unlock hints'}
      </Text>
      <View style={styles.separator} />
      <View style={styles.row}>
        {renderHint(HINTS[0])}
        <View style={styles.gap} />
        {renderHint(HINTS[1])}
      </View>
      <View style={styles.rowGap} />
      <View style={styles.row}>
        {renderHint(HINTS[2])}
        <View style={styles.gap} />
        {renderHint(HINTS[3])}
      </View>
    </GlassCard>
  );
}

export const HintPanel = React.memo(HintPanelInner);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  freeText: {
    fontSize: 13,
    fontFamily: fonts.scoreboard,
    textAlign: 'center',
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(5,242,108,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  gap: {
    width: spacing.sm,
    backgroundColor: 'transparent',
  },
  rowGap: {
    height: spacing.sm,
    backgroundColor: 'transparent',
  },
});

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import GlassCard from '@/components/ui/GlassCard';
import { spacing, type } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { HintButton } from '@/components/career/HintButton';

interface HintPanelProps {
  unlockedHints: string[];
  onUnlockHint: (hintId: string) => void;
  freeHintsRemaining: number;
}

// Short labels: the four hints share ONE row on phones (a 2x2 grid cost the
// timeline a whole club card of height), so every label must fit ~72pt.
const HINTS = [
  { hintId: 'SORT', label: 'Sort', icon: 'sort' },
  { hintId: 'NATIONALITY', label: 'Nation', icon: 'flag' },
  { hintId: 'POSITION', label: 'Position', icon: 'futbol-o' },
  { hintId: 'YEARS', label: 'Years', icon: 'calendar' },
] as const;

function HintPanelInner({ unlockedHints, onUnlockHint, freeHintsRemaining }: HintPanelProps) {
  const { colors } = useTheme();
  const unlockedSet = useMemo(() => new Set(unlockedHints), [unlockedHints]);
  // No ad SDK ships, so no hint is ever ad-gated: the play-circle "watch ad"
  // badge is retired until real rewarded ads land.
  const isPremium = false;

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
      <Text style={[styles.freeText, { color: hasFreeHints ? colors.accent : colors.streak }]}>
        {hasFreeHints
          ? `${freeHintsRemaining} free hint${freeHintsRemaining !== 1 ? 's' : ''} left`
          : 'Hints are on the house'}
      </Text>
      <View style={styles.row}>
        {renderHint(HINTS[0])}
        <View style={styles.gap} />
        {renderHint(HINTS[1])}
        <View style={styles.gap} />
        {renderHint(HINTS[2])}
        <View style={styles.gap} />
        {renderHint(HINTS[3])}
      </View>
    </GlassCard>
  );
}

export const HintPanel = React.memo(HintPanelInner);

// Theme-independent since the separator went; plain module-scope styles.
// Compact: this panel + search + Give Up share a phone screen with the
// timeline; every point saved here is another visible career stint (a 2x2
// grid cost ~52pt — one whole club card).
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  freeText: {
    ...type.micro,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  gap: {
    width: spacing.sm,
    backgroundColor: 'transparent',
  },
});

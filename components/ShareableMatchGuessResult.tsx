import React from 'react';
import { View, StyleSheet } from 'react-native';

import { spacing, borderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import ShareCardShell from '@/components/ShareCardShell';

interface ShareableMatchGuessResultProps {
  won: boolean;
  namesRevealed: number;
  totalNames: number;
  matchLabel: string;
}

export default function ShareableMatchGuessResult({
  won,
  namesRevealed,
  totalNames,
}: ShareableMatchGuessResultProps) {
  const { colors } = useTheme();
  const filled = won ? namesRevealed : totalNames;

  return (
    <ShareCardShell
      title="Guess the Match"
      verdict={won ? `${namesRevealed}/${totalNames} NAMED` : `${totalNames} NAMES`}
      won={won}>
      <View style={styles.dots}>
        {Array.from({ length: totalNames }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i < filled ? colors.accent : colors.textMuted }]}
          />
        ))}
      </View>
    </ShareCardShell>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    maxWidth: 320,
  },
  dot: {
    height: 20,
    width: 20,
    borderRadius: borderRadius.sm,
  },
});

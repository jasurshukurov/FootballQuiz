import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { type, spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import ShareCardShell from '@/components/ShareCardShell';

interface ShareableMissing11ResultProps {
  teamName: string;
  found: number;
  revealedSlots: Set<number>;
}

export default function ShareableMissing11Result({
  teamName,
  found,
  revealedSlots,
}: ShareableMissing11ResultProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ShareCardShell title="Missing XI" verdict={`${found}/11`} won={found === 11}>
      {/* The team is the clue shown to the player, not the hidden answer. */}
      <Text style={styles.subtitle}>{teamName}</Text>
      <View style={styles.circles}>
        {Array.from({ length: 11 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.circle,
              { backgroundColor: revealedSlots.has(i) ? colors.accent : colors.textMuted },
            ]}
          />
        ))}
      </View>
    </ShareCardShell>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    subtitle: {
      ...type.captionBold,
      color: c.textSecondary,
      marginBottom: spacing.md,
    },
    circles: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      maxWidth: 260,
    },
    circle: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.full,
    },
  });

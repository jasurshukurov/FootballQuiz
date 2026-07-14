import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { type, spacing } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import ShareCardShell from '@/components/ShareCardShell';

interface ShareableMarketMoversResultProps {
  streak: number;
}

export default function ShareableMarketMoversResult({ streak }: ShareableMarketMoversResultProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ShareCardShell title="Market Movers" verdict={`${streak} STREAK`} won={streak > 0}>
      <View style={styles.content}>
        <Text style={styles.label}>TRANSFER STREAK</Text>
        <Text style={styles.value}>{streak}</Text>
      </View>
    </ShareCardShell>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: {
      alignItems: 'center',
    },
    label: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 3,
      marginBottom: spacing.sm,
    },
    value: {
      ...type.scoreLarge,
      color: c.accentBright,
    },
  });

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { type, spacing } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import ShareCardShell from '@/components/ShareCardShell';

interface ShareableTopListsResultProps {
  title: string;
  found: number;
  total: number;
  livesUsed: number;
  slots: boolean[];
}

export default function ShareableTopListsResult({
  title,
  found,
  total,
  livesUsed,
  slots,
}: ShareableTopListsResultProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const row = slots.map((f) => (f ? '🟩' : '⬜')).join('');

  return (
    <ShareCardShell title="Top Lists" verdict={`${found}/${total} FOUND`} won={found === total}>
      <View style={styles.content}>
        <Text style={styles.listTitle}>{title}</Text>
        <Text style={styles.row}>{row}</Text>
        <Text style={styles.lives}>
          {livesUsed} {livesUsed === 1 ? 'life' : 'lives'} used
        </Text>
      </View>
    </ShareCardShell>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: {
      alignItems: 'center',
    },
    listTitle: {
      ...type.captionBold,
      color: c.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    row: {
      ...type.h2,
      marginBottom: spacing.sm,
    },
    lives: {
      ...type.caption,
      color: c.textMuted,
    },
  });

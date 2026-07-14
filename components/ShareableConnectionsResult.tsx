import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { ConnectionsCategory } from '@/lib/connectionsGenerator';
import { connectionsGroupColor } from '@/components/games/ConnectionsTile';
import { spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import ShareCardShell from '@/components/ShareCardShell';

interface ShareableConnectionsResultProps {
  categories: ConnectionsCategory[];
  solvedOrder: string[];
  mistakes: number;
}

export default function ShareableConnectionsResult({
  categories,
  solvedOrder,
  mistakes,
}: ShareableConnectionsResultProps) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Show the category bars in the order the player solved them (like the NYT
  // Connections share grid), with any unsolved categories appended after.
  const orderedCategories = [
    ...solvedOrder
      .map((name) => categories.find((c) => c.name === name))
      .filter((c): c is ConnectionsCategory => c !== undefined),
    ...categories.filter((c) => !solvedOrder.includes(c.name)),
  ];

  const won = solvedOrder.length === categories.length;

  return (
    <ShareCardShell
      title="Connections"
      verdict={mistakes === 0 ? '0 MISTAKES' : `${mistakes} MISTAKE${mistakes !== 1 ? 'S' : ''}`}
      won={won}>
      <View style={styles.grid}>
        {orderedCategories.map((cat) => (
          // Group hue is derived from the semantic difficulty index (0..3) via
          // the same theme-aware map the board uses — not a theme token.
          <View
            key={cat.name}
            style={[
              styles.bar,
              { backgroundColor: connectionsGroupColor(cat.difficulty, theme.dark).bg },
            ]}
          />
        ))}
      </View>
    </ShareCardShell>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    grid: {
      gap: spacing.sm,
      width: '100%',
      alignItems: 'center',
    },
    bar: {
      height: 28,
      width: 200,
      borderRadius: borderRadius.sm,
      // Keep the fixed category colors legible on light themes too.
      borderWidth: 1,
      borderColor: c.border,
    },
  });

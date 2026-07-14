import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { ConnectionsCategory } from '@/lib/connectionsGenerator';
import { connectionsGroupColor } from '@/components/games/ConnectionsTile';
import { type, spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

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
  const { colors, gradients } = theme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = new Date().toISOString().split('T')[0];
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  // Show the category bars in the order the player solved them (like the NYT
  // Connections share grid), with any unsolved categories appended after.
  const orderedCategories = [
    ...solvedOrder
      .map((name) => categories.find((c) => c.name === name))
      .filter((c): c is ConnectionsCategory => c !== undefined),
    ...categories.filter((c) => !solvedOrder.includes(c.name)),
  ];

  return (
    <LinearGradient colors={gradients.cardBg} style={styles.container}>
      <View style={styles.header}>
        <FontAwesome name="link" size={18} color={colors.accent} />
        <Text style={styles.branding}>FOOTBALL DAILY</Text>
      </View>
      <Text style={styles.title}>Connections · {today}</Text>
      <Text style={styles.score}>
        {mistakes === 0 ? 'Flawless!' : `${mistakes} mistake${mistakes !== 1 ? 's' : ''}`}
      </Text>
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
      {currentStreak > 0 && <Text style={styles.streak}>🔥 {currentStreak} day streak</Text>}
      <Text style={styles.cta}>Play at footballquiz.app</Text>
    </LinearGradient>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: c.border,
      // Solid canvas under the translucent cardBg gradient — react-native-view-shot
      // captures must never end up with a transparent background.
      backgroundColor: c.bgBase,
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
      minWidth: 320,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    branding: {
      ...type.h3,
      color: c.accent,
      letterSpacing: 2,
    },
    title: {
      ...type.h3,
      color: c.textPrimary,
      marginBottom: spacing.xs,
    },
    score: {
      ...type.h2,
      color: c.accentBright,
      marginBottom: spacing.lg,
    },
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
    streak: {
      ...type.captionBold,
      color: c.streak,
      marginTop: spacing.lg,
    },
    cta: {
      ...type.caption,
      color: c.textMuted,
      marginTop: spacing.md,
      textAlign: 'center',
    },
  });

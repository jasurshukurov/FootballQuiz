import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import Screen from '@/components/ui/Screen';
import RetroButton from '@/components/ui/RetroButton';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { useTheme } from '@/hooks/useTheme';
import { type ThemeColors } from '@/constants/themes';
import { spacing, type } from '@/constants/theme';

export default function ShareScreen() {
  const { puzzleId } = useLocalSearchParams<{ puzzleId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const id = puzzleId ? parseInt(puzzleId, 10) : NaN;
  const todayNumber = getDailyNumber();
  const isToday = id === todayNumber;

  useEffect(() => {
    if (isToday) {
      router.replace('/(tabs)');
    }
  }, [isToday, router]);

  if (isToday) {
    return null;
  }

  return (
    <Screen scroll={false} withTabBar={false} contentStyle={layout.content}>
      <View style={layout.body}>
        <Text style={layout.emoji}>{'⚽'}</Text>
        <Text style={styles.title}>Football Daily #{isNaN(id) ? '?' : id}</Text>
        <Text style={styles.subtitle}>
          This was a past puzzle. Play today&apos;s puzzle instead!
        </Text>
        <View style={layout.button}>
          <RetroButton title="Play Today's Puzzle" onPress={() => router.replace('/(tabs)')} />
        </View>
      </View>
    </Screen>
  );
}

const layout = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  body: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emoji: {
    ...type.display,
    marginBottom: spacing.xs,
  },
  button: {
    minWidth: 220,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    title: {
      ...type.h1,
      color: c.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      ...type.body,
      color: c.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
  });

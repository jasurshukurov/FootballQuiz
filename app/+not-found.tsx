import React, { useMemo } from 'react';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import Screen from '@/components/ui/Screen';
import { useTheme } from '@/hooks/useTheme';
import { type ThemeColors } from '@/constants/themes';
import { spacing, type } from '@/constants/theme';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Screen scroll={false} withTabBar={false} contentStyle={layout.content}>
        <View style={layout.body}>
          <Text style={layout.emoji}>{'⚽'}</Text>
          <Text style={styles.title}>This screen doesn&apos;t exist.</Text>
          <Link href="/" style={layout.link}>
            <Text style={styles.linkText}>Go to the Today screen</Text>
          </Link>
        </View>
      </Screen>
    </>
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
    marginBottom: spacing.sm,
  },
  link: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    title: {
      ...type.h3,
      color: c.textPrimary,
      textAlign: 'center',
    },
    linkText: {
      ...type.bodyBold,
      color: c.accent,
    },
  });

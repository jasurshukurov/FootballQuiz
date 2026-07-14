import React, { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';

import Screen from '@/components/ui/Screen';
import { useTheme } from '@/hooks/useTheme';
import { type ThemeColors } from '@/constants/themes';
import { spacing, type } from '@/constants/theme';

export default function ModalScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Screen scroll={false} withTabBar={false} contentStyle={layout.content}>
      <View style={layout.body}>
        <Text style={styles.title}>Football Trivia</Text>
        <Text style={styles.subtitle}>A new player every day.</Text>
      </View>
      {/* Light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
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
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    title: {
      ...type.h1,
      color: c.textPrimary,
    },
    subtitle: {
      ...type.body,
      color: c.textSecondary,
    },
  });

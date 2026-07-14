import React, { useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { useProStore } from '@/hooks/useProStore';
import { borderRadius, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

const ADS_ENABLED = false;

export default function BannerAd() {
  const isPro = useProStore((s) => s.isPro);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!ADS_ENABLED || isPro) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.text}>Ad Placeholder</Text>
      </View>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.bgElevated,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    placeholder: {
      height: 53,
      width: 320,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.borderStrong,
      backgroundColor: c.bgCard,
    },
    text: {
      ...type.micro,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: c.textMuted,
    },
  });

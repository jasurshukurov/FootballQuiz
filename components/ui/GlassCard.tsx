import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  glow?: boolean;
}

function GlassCard({ children, style, intensity = 20, glow = false }: GlassCardProps) {
  const theme = useTheme();
  const { colors, shadows } = theme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const glowStyle = glow ? shadows.neonGlow : undefined;

  if (Platform.OS === 'web') {
    return <View style={[styles.container, styles.webFallback, glowStyle, style]}>{children}</View>;
  }

  return (
    <View style={[styles.container, glowStyle, style]}>
      <BlurView
        intensity={intensity}
        tint={theme.dark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View style={layout.content}>{children}</View>
    </View>
  );
}

export default React.memo(GlassCard);

const layout = StyleSheet.create({
  content: {},
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
      overflow: 'hidden',
    },
    webFallback: {
      backgroundColor: c.bgElevated,
    },
  });

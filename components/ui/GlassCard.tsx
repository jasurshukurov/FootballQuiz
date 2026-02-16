import React from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { borderRadius, colors, shadows } from '@/constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  glow?: boolean;
}

function GlassCard({ children, style, intensity = 20, glow = false }: GlassCardProps) {
  const glowStyle = glow ? shadows.neonGlow : undefined;

  if (Platform.OS === 'web') {
    return <View style={[styles.container, styles.webFallback, glowStyle, style]}>{children}</View>;
  }

  return (
    <View style={[styles.container, glowStyle, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export default React.memo(GlassCard);

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  webFallback: {
    backgroundColor: 'rgba(17,17,40,0.85)',
  },
  content: {},
});

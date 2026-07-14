import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradient?: readonly string[];
}

export default function ScreenBackground({ children, style, gradient }: ScreenBackgroundProps) {
  const theme = useTheme();
  const stops = gradient ?? theme.gradients.screenBg;

  return (
    <LinearGradient
      colors={stops as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

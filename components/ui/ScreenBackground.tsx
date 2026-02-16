import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/constants/theme';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradient?: readonly string[];
}

export default function ScreenBackground({
  children,
  style,
  gradient = gradients.screenBg,
}: ScreenBackgroundProps) {
  return (
    <LinearGradient
      colors={gradient as [string, string, ...string[]]}
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

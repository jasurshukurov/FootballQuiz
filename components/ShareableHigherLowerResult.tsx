import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients } from '@/constants/theme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

interface ShareableHigherLowerResultProps {
  streak: number;
}

export default function ShareableHigherLowerResult({ streak }: ShareableHigherLowerResultProps) {
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Text style={styles.branding}>FOOTBALL QUIZ</Text>
      <Text style={styles.title}>Higher / Lower</Text>
      <Text style={styles.streakLabel}>STREAK</Text>
      <Text style={styles.streakValue}>{streak}</Text>
      {currentStreak > 0 && <Text style={styles.dailyStreak}>{currentStreak} day streak</Text>}
      <Text style={styles.cta}>Can you beat my score? Play at footballquiz.app</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    minWidth: 320,
  },
  branding: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    marginBottom: 16,
    letterSpacing: 2,
  },
  title: {
    marginBottom: 16,
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
  },
  streakLabel: {
    fontSize: 12,
    fontFamily: fonts.subheading,
    color: 'rgba(245,245,240,0.6)',
    letterSpacing: 3,
  },
  streakValue: {
    fontSize: 72,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    marginBottom: 8,
  },
  dailyStreak: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: colors.pitchGreen,
  },
  cta: {
    marginTop: 16,
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.steelGray,
    textAlign: 'center',
  },
});

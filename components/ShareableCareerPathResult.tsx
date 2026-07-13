import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients } from '@/constants/theme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

interface ShareableCareerPathResultProps {
  playerName: string;
  isWin: boolean;
  attemptsUsed: number;
  totalAttempts: number;
}

export default function ShareableCareerPathResult({
  playerName,
  isWin,
  attemptsUsed,
  totalAttempts,
}: ShareableCareerPathResultProps) {
  const remaining = Math.max(0, totalAttempts - attemptsUsed);
  const hearts = '❤️'.repeat(remaining) + '🖤'.repeat(totalAttempts - remaining);
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Text style={styles.branding}>FOOTBALL QUIZ</Text>
      <Text style={styles.title}>Career Path</Text>
      <Text style={styles.result}>{isWin ? 'SOLVED!' : 'MISSED IT'}</Text>
      <Text style={styles.playerName}>{playerName}</Text>
      <Text style={styles.hearts}>{hearts}</Text>
      {currentStreak > 0 && <Text style={styles.streak}>{currentStreak} day streak</Text>}
      <Text style={styles.cta}>Can you name them? Play at footballquiz.app</Text>
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
    marginBottom: 8,
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
  },
  result: {
    fontSize: 32,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    letterSpacing: 1,
    marginBottom: 8,
  },
  playerName: {
    marginBottom: 16,
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
  },
  hearts: {
    fontSize: 24,
    marginBottom: 8,
  },
  streak: {
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

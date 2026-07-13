import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients } from '@/constants/theme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

interface ShareableMatchGuessResultProps {
  won: boolean;
  namesRevealed: number;
  totalNames: number;
  matchLabel: string;
}

export default function ShareableMatchGuessResult({
  won,
  namesRevealed,
  totalNames,
  matchLabel,
}: ShareableMatchGuessResultProps) {
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Text style={styles.branding}>FOOTBALL QUIZ</Text>
      <Text style={styles.title}>Guess the Match</Text>
      <Text style={styles.result}>{won ? 'SOLVED!' : 'MISSED IT'}</Text>
      <Text style={styles.matchLabel}>{matchLabel}</Text>
      <Text style={styles.detail}>
        {won ? `Got it after ${namesRevealed}/${totalNames} names` : `${totalNames} names shown`}
      </Text>
      {currentStreak > 0 && <Text style={styles.streak}>{currentStreak} day streak</Text>}
      <Text style={styles.cta}>Can you spot it? Play at footballquiz.app</Text>
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
  matchLabel: {
    fontSize: 15,
    fontFamily: fonts.subheading,
    color: colors.chalkWhite,
    textAlign: 'center',
    marginBottom: 8,
  },
  detail: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: 'rgba(245,245,240,0.7)',
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

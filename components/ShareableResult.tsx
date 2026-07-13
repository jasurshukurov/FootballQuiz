import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { GuessResult, AttributeStatus } from '@/types/game';
import { colors, fonts, gradients } from '@/constants/theme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { whoAreYaStatusRows } from '@/lib/shareText';

interface ShareableResultProps {
  dailyNumber: number;
  guesses: GuessResult[];
  maxGuesses: number;
  won: boolean;
}

const STATUS_COLORS: Record<AttributeStatus, string> = {
  CORRECT: colors.matchGreen,
  HIGHER: colors.cardYellow,
  LOWER: colors.cardYellow,
  WRONG: colors.steelGray,
};

export default function ShareableResult({
  dailyNumber,
  guesses,
  maxGuesses,
  won,
}: ShareableResultProps) {
  const currentStreak = useDailyStateStore((s) => s.currentStreak);
  const statusRows = useMemo(() => whoAreYaStatusRows(guesses), [guesses]);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Text style={styles.branding}>FOOTBALL QUIZ</Text>
      <Text style={styles.title}>My name is... #{dailyNumber}</Text>
      <Text style={styles.score}>
        {won ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`}
      </Text>
      <View style={styles.grid}>
        {statusRows.map((statuses, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {statuses.map((status, colIndex) => (
              <View
                key={colIndex}
                style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]}
              />
            ))}
          </View>
        ))}
      </View>
      {currentStreak > 0 && <Text style={styles.streak}>{currentStreak} day streak</Text>}
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
    marginBottom: 4,
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
  },
  score: {
    marginBottom: 16,
    fontSize: 14,
    fontFamily: fonts.body,
    color: 'rgba(245,245,240,0.8)',
  },
  grid: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 36,
    width: 36,
    borderRadius: 6,
  },
  streak: {
    marginTop: 16,
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

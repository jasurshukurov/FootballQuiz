import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients } from '@/constants/theme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

type CellState = 'empty' | 'selected' | 'correct' | 'wrong';

interface ShareableGridResultProps {
  cellStates: CellState[][];
  score: number;
}

const STATE_COLORS: Record<CellState, string> = {
  correct: colors.matchGreen,
  wrong: colors.cardRed,
  empty: colors.steelGray,
  selected: colors.steelGray,
};

export default function ShareableGridResult({ cellStates, score }: ShareableGridResultProps) {
  const today = new Date().toISOString().split('T')[0];
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Text style={styles.branding}>FOOTBALL QUIZ</Text>
      <Text style={styles.title}>Football Grid #{today}</Text>
      <Text style={styles.score}>{score}/9</Text>
      <View style={styles.grid}>
        {cellStates.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((state, colIdx) => (
              <View key={colIdx} style={[styles.cell, { backgroundColor: STATE_COLORS[state] }]} />
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
  cell: {
    height: 44,
    width: 44,
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

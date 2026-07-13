import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import Confetti from '@/components/ui/Confetti';
import StreakBadge from '@/components/ui/StreakBadge';
import NextPuzzleCountdown from '@/components/ui/NextPuzzleCountdown';

interface GameOverExtrasProps {
  /** Fire the confetti burst (true on a genuine win/strong result). */
  win: boolean;
}

/** The shared game-over flourish: confetti on a win, the current streak badge,
 *  and the live countdown to the next daily puzzle. Drop one of these into each
 *  mode's completed/game-over state. */
export default function GameOverExtras({ win }: GameOverExtrasProps) {
  const streak = useDailyStateStore((s) => s.currentStreak);

  return (
    <>
      {win && <Confetti />}
      <View style={styles.stack}>
        <StreakBadge streak={streak} />
        <NextPuzzleCountdown />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});

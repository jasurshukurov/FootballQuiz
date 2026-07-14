import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { GameStatus, GuessResult } from '@/types/game';
import { buildShareText, whoAreYaStatusRows } from '@/lib/sharing';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import ShareableResult from '@/components/ShareableResult';
import GameOverSheet, { GlyphStatus } from './GameOverSheet';

interface ResultModalProps {
  visible: boolean;
  status: GameStatus;
  targetName: string;
  guessCount: number;
  maxGuesses: number;
  dailyNumber: number;
  guesses: GuessResult[];
  /** Today's daily solve time for the share text (null on practice runs). */
  solveTimeMs?: number | null;
  onClose: () => void;
  /** Starts a practice replay (store-flagged; never touches XP/streak). */
  onPlayAgain?: () => void;
}

/** Who Are Ya's game-over surface — the GameOverSheet bottom sheet over the
 *  finished guess board. Dismiss (scrim / grab handle) to inspect the board. */
export default function ResultModal({
  visible,
  status,
  targetName,
  guessCount,
  maxGuesses,
  dailyNumber,
  guesses,
  solveTimeMs = null,
  onClose,
  onPlayAgain,
}: ResultModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isWin = status === 'won';
  const shareRef = useRef<View>(null);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);

  const shareText = buildShareText({
    mode: 'who-are-ya',
    dailyNumber,
    dailyStreak,
    won: isWin,
    maxGuesses,
    statusRows: whoAreYaStatusRows(guesses),
    solveTimeMs,
  });

  // One square per guess: the winning guess is green, a miss that still hit
  // some attribute (right team/league/...) reads "warm" amber, cold misses red.
  const glyphs: GlyphStatus[] = useMemo(
    () =>
      guesses.map((g, i) => {
        if (isWin && i === guesses.length - 1) return 'correct';
        const row = whoAreYaStatusRows([g])[0] ?? [];
        return row.some((s) => s === 'CORRECT') ? 'close' : 'wrong';
      }),
    [guesses, isWin],
  );

  return (
    <GameOverSheet
      visible={visible}
      win={isWin}
      verdict={isWin ? `GOT IT IN ${guessCount}` : 'FULL TIME'}
      subtitle={
        <Text style={styles.subtitle}>
          The answer was <Text style={styles.targetName}>{targetName}</Text>
        </Text>
      }
      glyphs={glyphs}
      shareRef={shareRef}
      shareText={shareText}
      onPlayAgain={onPlayAgain}
      playAgainLabel="Practice again"
      onDismiss={onClose}
      currentModeKey="who-are-ya"
      offscreenCapture={
        <View ref={shareRef} collapsable={false}>
          <ShareableResult
            dailyNumber={dailyNumber}
            guesses={guesses}
            maxGuesses={maxGuesses}
            won={isWin}
          />
        </View>
      }
    />
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    subtitle: {
      ...type.body,
      textAlign: 'center',
      color: c.textSecondary,
    },
    targetName: {
      ...type.bodyBold,
      color: c.accent,
    },
  });

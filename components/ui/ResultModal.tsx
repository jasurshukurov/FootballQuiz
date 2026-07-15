import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';

import { GameStatus, GuessResult } from '@/types/game';
import { buildShareText, whoAreYaStatusRows } from '@/lib/sharing';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { getPlayerPhoto } from '@/lib/playerPhotos';
import PlayerPhoto from '@/components/ui/PlayerPhoto';
import ShareableResult from '@/components/ShareableResult';
import GameOverSheet, { GlyphStatus } from './GameOverSheet';

interface ResultModalProps {
  visible: boolean;
  status: GameStatus;
  targetName: string;
  /** players_db id of the answer — reveals the sharp portrait + CC credit. */
  targetPlayerId?: string | number | null;
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
  targetPlayerId,
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
  const photo = getPlayerPhoto(targetPlayerId);

  const shareText = buildShareText({
    mode: 'who-are-ya',
    dailyNumber,
    dailyStreak,
    won: isWin,
    maxGuesses,
    statusRows: whoAreYaStatusRows(guesses),
    solveTimeMs,
  });

  // One square per guess: the winning guess is green, a miss matching 2+
  // attributes (e.g. right team AND position) reads "warm" amber, the rest
  // red. One shared attribute is too common among famous names to be "warm".
  const glyphs: GlyphStatus[] = useMemo(
    () =>
      guesses.map((g, i) => {
        if (isWin && i === guesses.length - 1) return 'correct';
        const row = whoAreYaStatusRows([g])[0] ?? [];
        return row.filter((s) => s === 'CORRECT').length >= 2 ? 'close' : 'wrong';
      }),
    [guesses, isWin],
  );

  return (
    <GameOverSheet
      visible={visible}
      win={isWin}
      verdict={isWin ? `GOT IT IN ${guessCount}` : 'FULL TIME'}
      subtitle={
        <View style={styles.reveal}>
          {targetPlayerId != null && (
            <PlayerPhoto playerId={targetPlayerId} name={targetName} size={96} />
          )}
          <Text style={styles.subtitle}>
            The answer was <Text style={styles.targetName}>{targetName}</Text>
          </Text>
          {photo?.credit != null && (
            <Text
              style={styles.photoCredit}
              onPress={() => Linking.openURL(photo.credit!.url).catch(() => {})}
              accessibilityRole="link">
              {photo.credit.label}
            </Text>
          )}
        </View>
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
    reveal: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    subtitle: {
      ...type.body,
      textAlign: 'center',
      color: c.textSecondary,
    },
    targetName: {
      ...type.bodyBold,
      color: c.accent,
    },
    photoCredit: {
      ...type.micro,
      color: c.textMuted,
      textAlign: 'center',
    },
  });

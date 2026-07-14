import React, { useMemo, useRef } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { GameStatus, GuessResult } from '@/types/game';
import { buildShareText, whoAreYaStatusRows } from '@/lib/sharing';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { motion, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import ShareableResult from '@/components/ShareableResult';
import RetroButton from './RetroButton';
import GameOverActions from './GameOverActions';
import GameOverExtras from './GameOverExtras';
import GlassCard from './GlassCard';

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
  onPlayAgain: () => void;
}

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
  const isGameOver = status === 'won' || status === 'lost';
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(motion.base)} style={layout.cardWrap}>
          <GlassCard style={layout.card} intensity={60}>
            <Text style={layout.emoji}>{isWin ? '⚽' : '🏁'}</Text>
            <Text style={styles.title}>{isWin ? 'You Got It!' : 'Full Time'}</Text>
            <Text style={styles.subtitle}>
              The answer was <Text style={styles.targetName}>{targetName}</Text>
            </Text>
            {isWin && (
              <Text style={styles.winText}>
                Solved in {guessCount}/{maxGuesses} guesses
              </Text>
            )}
            {!isWin && <Text style={styles.loseText}>Back tomorrow for the next one.</Text>}
            <View style={layout.buttons}>
              {isGameOver ? (
                <GameOverActions
                  shareRef={shareRef}
                  shareText={shareText}
                  win={isWin}
                  onPlayAgain={onPlayAgain}
                  includeExtras={false}
                  currentModeKey="who-are-ya"
                />
              ) : (
                <RetroButton title="Play Again" onPress={onPlayAgain} />
              )}
              <RetroButton title="Close" onPress={onClose} variant="secondary" />
            </View>
          </GlassCard>
        </Animated.View>

        {isGameOver && <GameOverExtras win={isWin} currentModeKey="who-are-ya" />}

        {/* Offscreen shareable view for capture */}
        <View style={layout.offscreen}>
          <View ref={shareRef} collapsable={false}>
            <ShareableResult
              dailyNumber={dailyNumber}
              guesses={guesses}
              maxGuesses={maxGuesses}
              won={isWin}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const layout = StyleSheet.create({
  cardWrap: {
    width: '100%',
    maxWidth: 384,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emoji: {
    marginBottom: spacing.sm,
    fontSize: type.display.fontSize,
  },
  buttons: {
    width: '100%',
    gap: spacing.md,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.scrim,
      paddingHorizontal: spacing.xl,
    },
    title: {
      ...type.h2,
      marginBottom: spacing.lg,
      textAlign: 'center',
      color: c.textPrimary,
    },
    subtitle: {
      ...type.body,
      marginBottom: spacing.sm,
      textAlign: 'center',
      color: c.textSecondary,
    },
    targetName: {
      ...type.bodyBold,
      color: c.accent,
    },
    winText: {
      ...type.caption,
      marginBottom: spacing.xl,
      textAlign: 'center',
      color: c.streak,
    },
    loseText: {
      ...type.caption,
      marginBottom: spacing.xl,
      textAlign: 'center',
      color: c.textSecondary,
    },
  });

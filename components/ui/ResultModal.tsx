import React, { useRef } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';

import { GameStatus, GuessResult } from '@/types/game';
import { buildShareText, whoAreYaStatusRows } from '@/lib/sharing';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { colors } from '@/constants/theme';
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
  onClose,
  onPlayAgain,
}: ResultModalProps) {
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
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <GlassCard style={styles.card} intensity={60}>
          <Text style={styles.emoji}>{isWin ? '\u26BD' : '\uD83D\uDFE5'}</Text>
          <Text style={styles.title}>{isWin ? 'You Got It!' : 'Game Over'}</Text>
          <Text style={styles.subtitle}>
            The player was <Text style={styles.targetName}>{targetName}</Text>
          </Text>
          {isWin && (
            <Text style={styles.winText}>
              Solved in {guessCount}/{maxGuesses} guesses
            </Text>
          )}
          {!isWin && <Text style={styles.loseText}>Better luck next time!</Text>}
          <View style={styles.buttons}>
            {isGameOver ? (
              <GameOverActions
                shareRef={shareRef}
                shareText={shareText}
                win={isWin}
                onPlayAgain={onPlayAgain}
                includeExtras={false}
              />
            ) : (
              <RetroButton title="Play Again" onPress={onPlayAgain} />
            )}
            <RetroButton title="Close" onPress={onClose} variant="secondary" />
          </View>
        </GlassCard>

        {isGameOver && <GameOverExtras win={isWin} />}

        {/* Offscreen shareable view for capture */}
        <View style={styles.offscreen}>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 384,
    alignItems: 'center',
    padding: 32,
  },
  emoji: {
    marginBottom: 8,
    fontSize: 36,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 24,
    fontFamily: 'BarlowCondensed-Bold',
    color: colors.chalkWhite,
  },
  subtitle: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 16,
    color: 'rgba(245,245,240,0.8)',
  },
  targetName: {
    fontWeight: 'bold',
    color: colors.matchGreen,
  },
  winText: {
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 14,
    color: colors.cardYellow,
  },
  loseText: {
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 14,
    color: colors.cardRed,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

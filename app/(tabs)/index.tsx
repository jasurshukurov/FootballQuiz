import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

import { Player } from '@/types/player';
import { triggerImpact, triggerNotification } from '@/lib/haptics';
import { getAllPlayersWithCareer } from '@/lib/playerData';
import { getModeSeed } from '@/lib/dailySeed';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { colors, spacing, fonts } from '@/constants/theme';
import { useCareerGameStore } from '@/hooks/useCareerGameStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { TimelineView } from '@/components/career/TimelineView';
import { HintPanel } from '@/components/career/HintPanel';
import PlayerSearchAutocomplete from '@/components/ui/PlayerSearchAutocomplete';
import { TierBadge } from '@/components/career/TierBadge';
import LifeSegments from '@/components/career/LifeSegments';
import GiveUpButton from '@/components/career/GiveUpButton';
import GameOverCard from '@/components/career/GameOverCard';
import LastChanceHint from '@/components/ui/LastChanceHint';
import GameOverActions from '@/components/ui/GameOverActions';
import TutorialOverlay from '@/components/ui/TutorialOverlay';
import ShareableCareerPathResult from '@/components/ShareableCareerPathResult';
import { buildShareText } from '@/lib/sharing';
import { playWhistle } from '@/lib/sounds';

const MAX_ATTEMPTS = 3;

const TAB_BAR_HEIGHT = 80;

export default function CareerScreen() {
  const {
    currentPlayer,
    scrambledCareer,
    unlockedHints,
    gameStatus,
    attemptsLeft,
    guessResult,
    startDailyGame,
    makeGuess,
    attemptUnlockHint,
    resetGame,
    giveUp,
  } = useCareerGameStore();

  const insets = useSafeAreaInsets();

  const allPlayers = useMemo(() => getAllPlayersWithCareer(), []);
  const shareRef = useRef<View>(null);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);

  useEffect(() => {
    startDailyGame(getModeSeed('careerpath'));
    playWhistle();
  }, [startDailyGame]);

  // Record streak/XP/daily-progress once the daily puzzle ends.
  useEffect(() => {
    if (gameStatus === 'won') {
      const xp = 50 + attemptsLeft * 15;
      useManagerStore.getState().addXp('careerpath', xp);
      useDailyProgressStore.getState().markCompleted('careerpath', attemptsLeft);
    } else if (gameStatus === 'lost') {
      useManagerStore.getState().addXp('careerpath', 10);
      useDailyProgressStore.getState().markCompleted('careerpath', 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus]);

  const shakeX = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handleSelectPlayer = useCallback(
    (player: Player) => {
      triggerImpact(ImpactFeedbackStyle.Medium);
      makeGuess(player.name);
    },
    [makeGuess],
  );

  useEffect(() => {
    if (guessResult === 'wrong') {
      triggerNotification(NotificationFeedbackType.Error);
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [guessResult, attemptsLeft, shakeX]);

  const showYears = unlockedHints.includes('YEARS');
  const isSorted = unlockedHints.includes('SORT');
  const showNationality = unlockedHints.includes('NATIONALITY');
  const showPosition = unlockedHints.includes('POSITION');
  const freeHintsRemaining = Math.max(0, 2 - unlockedHints.length);

  const isPlaying = gameStatus === 'playing';
  const isWon = gameStatus === 'won';
  const isLost = gameStatus === 'lost';
  const isLastChance = isPlaying && attemptsLeft === 1;

  const shareText = useMemo(
    () =>
      buildShareText({
        mode: 'careerpath',
        dailyNumber: getDailyNumber(),
        dailyStreak,
        won: isWon,
        attemptsUsed: MAX_ATTEMPTS - attemptsLeft,
        totalAttempts: MAX_ATTEMPTS,
        playerName: currentPlayer?.name ?? '',
      }),
    [dailyStreak, isWon, attemptsLeft, currentPlayer],
  );

  return (
    <LinearGradient
      colors={['#0D1B2A', '#1B0A2E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}>
      <View style={[styles.container, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Career Path</Text>
          {currentPlayer && <TierBadge tier={currentPlayer.tier} />}
        </View>

        {(showNationality || showPosition) && (
          <View style={styles.hintsRow}>
            {showNationality && currentPlayer && (
              <View style={styles.hintChip}>
                <Text style={styles.hintChipText}>{currentPlayer.nationality}</Text>
              </View>
            )}
            {showPosition && currentPlayer && (
              <View style={styles.hintChip}>
                <Text style={styles.hintChipText}>{currentPlayer.position}</Text>
              </View>
            )}
          </View>
        )}

        <TimelineView career={scrambledCareer} showYears={showYears} isSorted={isSorted} />

        {isPlaying && (
          <View style={styles.bottomSection}>
            <HintPanel
              unlockedHints={unlockedHints}
              onUnlockHint={attemptUnlockHint}
              freeHintsRemaining={freeHintsRemaining}
            />

            {isLastChance && <LastChanceHint />}

            <Animated.View style={shakeStyle}>
              <PlayerSearchAutocomplete
                players={allPlayers}
                onSelectPlayer={handleSelectPlayer}
                placeholder="Guess the player..."
                dropDirection="up"
              />
              <View style={styles.attemptsRow}>
                <LifeSegments total={3} remaining={attemptsLeft} />
                <GiveUpButton onGiveUp={giveUp} />
              </View>
            </Animated.View>
          </View>
        )}

        {(isWon || isLost) && (
          <>
            <GameOverCard
              playerName={currentPlayer?.name ?? ''}
              playerImage={currentPlayer?.image_url}
              isWin={isWon}
              onNextPlayer={resetGame}
            />
            <GameOverActions
              shareRef={shareRef}
              shareText={shareText}
              win={isWon}
              shareVariant="secondary"
            />
            {/* Offscreen shareable view */}
            <View style={styles.offscreen}>
              <View ref={shareRef} collapsable={false}>
                <ShareableCareerPathResult
                  playerName={currentPlayer?.name ?? ''}
                  isWin={isWon}
                  attemptsUsed={MAX_ATTEMPTS - attemptsLeft}
                  totalAttempts={MAX_ATTEMPTS}
                />
              </View>
            </View>
          </>
        )}
        <TutorialOverlay
          modeKey="careerpath"
          title="Career Path"
          description="Guess the mystery player from their scrambled career history. Unlock hints to reveal clues. You have 3 guesses!"
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  hintsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hintChip: {
    backgroundColor: 'rgba(5,242,108,0.15)',
    borderWidth: 1,
    borderColor: colors.pitchGreen,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  hintChipText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.pitchGreen,
  },
  bottomSection: {
    gap: spacing.md,
  },
  attemptsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

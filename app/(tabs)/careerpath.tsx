import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
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
import { spacing, type, borderRadius, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
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
import ProximityChips from '@/components/career/ProximityChips';
import RankBadge from '@/components/ui/RankBadge';
import { SolveTimeResult } from '@/components/ui/SolveTimeChip';
import { useSolveTimeStore, useTodaySolveTime } from '@/hooks/useSolveTimeStore';
import { careerClueRank } from '@/lib/careerHelpers';
import ShareableCareerPathResult from '@/components/ShareableCareerPathResult';
import Screen from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { buildShareText } from '@/lib/sharing';
import { playWhistle } from '@/lib/sounds';

const MAX_ATTEMPTS = 3;

export default function CareerScreen() {
  const {
    currentPlayer,
    scrambledCareer,
    unlockedHints,
    gameStatus,
    attemptsLeft,
    guessResult,
    lastProximity,
    startDailyGame,
    makeGuess,
    attemptUnlockHint,
    resetGame,
    giveUp,
  } = useCareerGameStore();

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const allPlayers = useMemo(() => getAllPlayersWithCareer(), []);
  const shareRef = useRef<View>(null);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);
  const dailyNumber = getDailyNumber();

  useEffect(() => {
    startDailyGame(getModeSeed('careerpath'));
    playWhistle();
  }, [startDailyGame]);

  // Record streak/XP/daily-progress once the daily puzzle ends.
  useEffect(() => {
    if (gameStatus === 'won') {
      const xp = 50 + attemptsLeft * 15;
      // Award at most once per local day; Play-Again the same day earns nothing.
      useManagerStore.getState().awardDailyXp('careerpath', xp);
      useDailyProgressStore.getState().markCompleted('careerpath', attemptsLeft);
      useSolveTimeStore.getState().markCompleted('careerpath', { countsForBest: true });
    } else if (gameStatus === 'lost') {
      useManagerStore.getState().awardDailyXp('careerpath', 10);
      useDailyProgressStore.getState().markCompleted('careerpath', 0);
      // Losses never set a time PB.
      useSolveTimeStore.getState().markCompleted('careerpath', { countsForBest: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus]);

  const shakeX = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handleSelectPlayer = useCallback(
    (player: Player) => {
      // Solve-time stopwatch starts on the first real guess (no-ops after).
      useSolveTimeStore.getState().markStarted('careerpath');
      triggerImpact(ImpactFeedbackStyle.Medium);
      makeGuess(player.name);
    },
    [makeGuess],
  );

  const handleUnlockHint = useCallback(
    (hintId: string) => {
      // A hint unlock is a meaningful first interaction too.
      useSolveTimeStore.getState().markStarted('careerpath');
      attemptUnlockHint(hintId);
    },
    [attemptUnlockHint],
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

  // Clue-economy rank: solving with fewer attempts/hints spent = higher tier.
  const clueRank = useMemo(
    () => careerClueRank(isWon, MAX_ATTEMPTS - attemptsLeft, unlockedHints.length),
    [isWon, attemptsLeft, unlockedHints.length],
  );

  const solveTimeMs = useTodaySolveTime('careerpath');

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
        solveTimeMs,
      }),
    [dailyStreak, isWon, attemptsLeft, currentPlayer, solveTimeMs],
  );

  return (
    <Screen scroll={false}>
      <ScreenHeader
        eyebrow={`Daily #${dailyNumber}`}
        title="Career Path"
        modeKey="careerpath"
        right={currentPlayer ? <TierBadge tier={currentPlayer.tier} /> : undefined}
      />

      {(showNationality || showPosition) && (
        <View style={styles.hintsRow}>
          {showNationality && currentPlayer && (
            <Animated.View entering={FadeIn.duration(motion.base)} style={styles.hintChip}>
              <Text style={styles.hintChipText}>{currentPlayer.nationality}</Text>
            </Animated.View>
          )}
          {showPosition && currentPlayer && (
            <Animated.View entering={FadeIn.duration(motion.base)} style={styles.hintChip}>
              <Text style={styles.hintChipText}>{currentPlayer.position}</Text>
            </Animated.View>
          )}
        </View>
      )}

      <TimelineView career={scrambledCareer} showYears={showYears} isSorted={isSorted} />

      {isPlaying && (
        <View style={styles.bottomSection}>
          <HintPanel
            unlockedHints={unlockedHints}
            onUnlockHint={handleUnlockHint}
            freeHintsRemaining={freeHintsRemaining}
          />

          {guessResult === 'wrong' && lastProximity && <ProximityChips data={lastProximity} />}

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
          <Animated.View entering={FadeIn.delay(150).duration(motion.base)}>
            <RankBadge rank={clueRank} unit="clues" />
          </Animated.View>
          <SolveTimeResult mode="careerpath" />
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
    </Screen>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hintsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    hintChip: {
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentBorder,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    hintChipText: {
      ...type.captionBold,
      color: c.accent,
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

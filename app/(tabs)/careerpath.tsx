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
import PlayerSearchAutocomplete, {
  PlayerSearchAutocompleteHandle,
} from '@/components/ui/PlayerSearchAutocomplete';
import { TierBadge } from '@/components/career/TierBadge';
import LivesIndicator from '@/components/ui/LivesIndicator';
import GiveUpButton from '@/components/ui/GiveUpButton';
import GameOverCard from '@/components/career/GameOverCard';
import CareerResultSummary from '@/components/career/CareerResultSummary';
import LastChanceHint from '@/components/ui/LastChanceHint';
import GameOverActions from '@/components/ui/GameOverActions';
import GameOverExtras from '@/components/ui/GameOverExtras';
import FloodlightSweep from '@/components/ui/FloodlightSweep';
import RetroButton from '@/components/ui/RetroButton';
import ProximityChips from '@/components/career/ProximityChips';
import { useSolveTimeStore, useTodaySolveTime } from '@/hooks/useSolveTimeStore';
import { careerClueRank, normalizeGuess } from '@/lib/careerHelpers';
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
    isPractice,
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
  // Clears the guess box after a typed full name auto-solves.
  const searchRef = useRef<PlayerSearchAutocompleteHandle>(null);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);
  const dailyNumber = getDailyNumber();

  useEffect(() => {
    const seed = getModeSeed('careerpath');
    const store = useCareerGameStore.getState();
    const dailyDone = useDailyProgressStore.getState().isCompleted('careerpath');
    if (dailyDone && store.dailySeed !== seed) {
      // Daily already completed and its board was replaced by a Play-Again
      // practice run. Never re-deal the finished daily as playable: keep the
      // in-flight practice board, or deal a fresh practice player.
      if (store.gameStatus !== 'playing' || !store.currentPlayer) {
        store.resetGame();
      } else if (!store.isPractice) {
        // Rehydrated mid-practice board: isPractice is transient (not
        // persisted), so stamp it back — the eyebrow must read PRACTICE and
        // this board's result must never record over the finished daily.
        useCareerGameStore.setState({ isPractice: true });
      }
    } else {
      // Deals today's daily, or restores it (finished or mid-run) via the
      // store's dailySeed guard.
      startDailyGame(seed);
    }
    playWhistle();
  }, [startDailyGame]);

  // Record streak/XP/daily-progress once the daily puzzle ends. Practice
  // boards (Play Again, or the post-daily re-entry deal) record nothing —
  // otherwise a practice result would overwrite the official daily score.
  useEffect(() => {
    if (useCareerGameStore.getState().isPractice) return;
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

  // Type-to-solve: when the typed text folds exactly to the answer's FULL name,
  // submit it as a correct guess with no suggestion tap. Full-name only — a
  // surname shortcut would make this single-answer mode brute-typeable. A wrong
  // name never auto-fires here and still costs an attempt only when its
  // suggestion is explicitly picked. Mirrors handleSelectPlayer's correct path.
  const handleQueryChange = useCallback(
    (text: string) => {
      if (gameStatus !== 'playing' || !currentPlayer) return;
      const folded = normalizeGuess(text);
      if (folded.length < 2) return; // also swallows the clear()-fired onQueryChange('')
      if (folded !== normalizeGuess(currentPlayer.name)) return;
      useSolveTimeStore.getState().markStarted('careerpath');
      triggerImpact(ImpactFeedbackStyle.Medium);
      makeGuess(currentPlayer.name);
      searchRef.current?.clear();
    },
    [gameStatus, currentPlayer, makeGuess],
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

  // Progression stats for the game-over summary.
  const cluesUsed = MAX_ATTEMPTS - attemptsLeft + unlockedHints.length;
  const xpEarned = isWon ? 50 + attemptsLeft * 15 : 10;
  const playedCount = useDailyProgressStore((s) => s.getCompletedCount());
  const totalCount = useDailyProgressStore((s) => s.getTotalModes());

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
        eyebrow={isPractice ? 'Practice' : `Daily #${dailyNumber}`}
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

      <View style={styles.timelineWrap}>
        <TimelineView career={scrambledCareer} showYears={showYears} isSorted={isSorted} />
        {isWon && <FloodlightSweep />}
      </View>

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
              ref={searchRef}
              players={allPlayers}
              onSelectPlayer={handleSelectPlayer}
              onQueryChange={handleQueryChange}
              placeholder="Guess the player..."
              dropDirection="up"
            />
            <View style={styles.attemptsRow}>
              <LivesIndicator total={3} remaining={attemptsLeft} />
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
            nationality={currentPlayer?.nationality}
            position={currentPlayer?.position}
            isWin={isWon}
          />
          <Animated.View entering={FadeIn.delay(150).duration(motion.base)}>
            <CareerResultSummary
              clueRank={clueRank}
              cluesUsed={cluesUsed}
              xpEarned={xpEarned}
              animateXp={!isPractice}
              streak={dailyStreak}
              playedCount={playedCount}
              totalCount={totalCount}
            />
          </Animated.View>
          <GameOverActions
            shareRef={shareRef}
            shareText={shareText}
            win={isWon}
            shareVariant="secondary"
            includeExtras={false}
          />
          {/* Streak now lives in the progression column, so drop the duplicate
              badge here — keep confetti + NEXT UP + countdown. */}
          <GameOverExtras win={isWon} showStreak={false} currentModeKey="careerpath" />
          {/* Keep-playing path: deals a fresh random player. Practice only — the
              caption keeps that honest so it never reads as a daily re-run. */}
          <View style={styles.replayButton}>
            <RetroButton title="Play Again" variant="secondary" onPress={resetGame} />
            <Text style={styles.replayCaption}>Practice round, no effect on your streak</Text>
          </View>
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
    timelineWrap: {
      flex: 1,
      position: 'relative',
    },
    replayButton: {
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      gap: spacing.xs,
    },
    replayCaption: {
      ...type.micro,
      color: c.textMuted,
      textAlign: 'center',
    },
    offscreen: {
      position: 'absolute',
      left: -9999,
    },
  });

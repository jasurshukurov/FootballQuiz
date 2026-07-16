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
import { getPhotoCredit } from '@/lib/photoCredits';
import CareerResultSummary from '@/components/career/CareerResultSummary';
import LastChanceHint from '@/components/ui/LastChanceHint';
import GameOverActions from '@/components/ui/GameOverActions';
import GameOverExtras from '@/components/ui/GameOverExtras';
import FloodlightSweep from '@/components/ui/FloodlightSweep';
import RetroButton from '@/components/ui/RetroButton';
import ProximityChips from '@/components/career/ProximityChips';
import { useTodaySolveTime } from '@/hooks/useSolveTimeStore';
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
  // Endless summary shows the mode's own consecutive-wins streak, not the daily streak.
  const careerWinStreak = useCareerGameStore((s) => s.currentStreak);

  // ENDLESS mode (owner call 2026-07-15): Career Path left the daily set. On
  // entry, keep an in-flight board, else deal a fresh random player; a
  // finished board deals fresh too — the run is continuous, "Next" is the loop.
  useEffect(() => {
    const decide = () => {
      const store = useCareerGameStore.getState();
      if (store.gameStatus !== 'playing' || !store.currentPlayer) {
        store.resetGame();
      } else if (!store.isPractice) {
        // Rehydrated board from before the endless switch: stamp it so
        // nothing downstream treats it as an official daily.
        useCareerGameStore.setState({ isPractice: true });
      }
      playWhistle();
    };

    // Wait for rehydration — deciding from empty defaults on a cold start
    // would discard a mid-run board.
    const p = useCareerGameStore.persist;
    if (p.hasHydrated()) {
      decide();
      return;
    }
    return p.onFinishHydration(decide);
  }, []);

  // Endless rounds never touch daily progress, streaks or solve times. XP
  // still rewards play — awardDailyXp is internally capped at once per mode
  // per local day, so grinding rounds can't inflate it.
  useEffect(() => {
    if (gameStatus === 'won') {
      useManagerStore.getState().awardDailyXp('careerpath', 50 + attemptsLeft * 15);
    } else if (gameStatus === 'lost') {
      useManagerStore.getState().awardDailyXp('careerpath', 10);
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

  // Typing never auto-guesses (owner call 2026-07-15): a guess is made ONLY
  // by tapping a suggestion row.

  const handleUnlockHint = useCallback(
    (hintId: string) => {
      // A hint unlock is a meaningful first interaction too.
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
    // Playing: fixed layout (timeline scrolls internally, search dropup).
    // Finished: the result stack (card + summary + actions + Next) is taller
    // than a phone, so the page itself must scroll or Next is unreachable.
    <Screen scroll={isWon || isLost}>
      <ScreenHeader
        eyebrow="Endless"
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

      {/* Playing: the timeline takes all free height (flex). Finished: the
          page scrolls, where flex:1 collapses — pin a compact recap height
          instead (it scrolls internally if the career is long). */}
      <View style={isPlaying ? styles.timelineWrap : styles.timelineWrapDone}>
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
            photoCredit={getPhotoCredit(currentPlayer?.id)}
            nationality={currentPlayer?.nationality}
            position={currentPlayer?.position}
            isWin={isWon}
          />
          {/* The endless loop's primary CTA comes right after the reveal so it
              lands inside the first viewport — buried under the summary +
              share row + NEXT UP card it was ~2 screens of scrolling away
              (user feedback 2026-07-15). */}
          <View style={styles.replayButton}>
            <RetroButton title="Next Player" onPress={resetGame} />
          </View>
          <Animated.View entering={FadeIn.delay(150).duration(motion.base)}>
            <CareerResultSummary
              clueRank={clueRank}
              cluesUsed={cluesUsed}
              xpEarned={xpEarned}
              animateXp={true}
              streak={careerWinStreak}
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
      gap: spacing.sm,
    },
    attemptsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    timelineWrap: {
      flex: 1,
      position: 'relative',
    },
    timelineWrapDone: {
      height: 172,
      position: 'relative',
      marginBottom: spacing.sm,
    },
    replayButton: {
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
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

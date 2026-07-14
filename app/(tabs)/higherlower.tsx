import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { triggerImpact, triggerNotification } from '@/lib/haptics';
import { Player } from '@/types/player';
import { spacing, borderRadius, type, motion } from '@/constants/theme';
import { ThemeColors, ThemeShadows } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import Tappable from '@/components/ui/Tappable';
import SolveTimeChip, { SolveTimeResult } from '@/components/ui/SolveTimeChip';
import {
  generatePlayerQueue,
  formatMarketValue,
  getPlayerDifficulty,
  isHigherLowerCorrect,
} from '@/lib/higherLowerGenerator';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useSolveTimeStore, useTodaySolveTime } from '@/hooks/useSolveTimeStore';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { getModeSeed } from '@/lib/dailySeed';
import { getStreakRank, STREAK_MILESTONES } from '@/lib/rankLadder';
import Screen from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import StatCard from '@/components/games/StatCard';
import GameOverActions from '@/components/ui/GameOverActions';
import RankBadge from '@/components/ui/RankBadge';
import Confetti from '@/components/ui/Confetti';
import ShakeView from '@/components/ui/ShakeView';
import { useManagerStore } from '@/hooks/useManagerStore';
import ShareableHigherLowerResult from '@/components/ShareableHigherLowerResult';
import { buildShareText } from '@/lib/sharing';
import { playCrossbar } from '@/lib/sounds';

const HIGH_SCORE_KEY = '@higherlower_highscore';
const QUEUE_SIZE = 100;

type CelebrationIntensity = 'low' | 'med' | 'high';

/** Confetti intensity for each streak milestone (5 → low, 10 → med, 15/21 → high). */
const MILESTONE_INTENSITY: CelebrationIntensity[] = ['low', 'med', 'high', 'high'];

/** Deterministic seed for the Nth mid-run queue extension, derived from the run's
 *  base seed so a long daily stays reproducible. */
function extensionSeed(baseSeed: number, extIndex: number): number {
  return (baseSeed + extIndex * 0x9e3779b1) >>> 0;
}

/** Relative gap between two values as a whole-number percent (of the smaller). */
function gapPercent(a: number, b: number): number {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (lo <= 0) return 0;
  return Math.round(((hi - lo) / lo) * 100);
}

type GameState = 'playing' | 'revealing' | 'sliding' | 'gameover';

export default function HigherLowerScreen() {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [queue, setQueue] = useState<Player[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [showChallengerValue, setShowChallengerValue] = useState(false);
  const [shakeWrong, setShakeWrong] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationIntensity | null>(null);
  const [pbFlash, setPbFlash] = useState(false);
  // Daily re-entry restoration: if today's daily result is already recorded at
  // MOUNT time, show a restored result panel instead of dealing a fresh run.
  // Mount-only (useState initializer) so finishing a live run never swaps its
  // own game-over for the restored panel.
  const [restoredDaily, setRestoredDaily] = useState(() =>
    useDailyProgressStore.getState().isCompleted('higherlower'),
  );
  const dailyScore = useDailyProgressStore((s) => s.scoresByMode['higherlower'] ?? 0);
  const seedRef = useRef(Date.now());
  const isFirstGame = useRef(true);
  const pbBeatenRef = useRef(false);
  const shareRef = useRef<View>(null);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);

  const slideX = useSharedValue(0);
  const challengerOpacity = useSharedValue(1);
  const screenWidth = Dimensions.get('window').width;

  const currentPlayer = queue[currentIndex];
  const challengerPlayer = queue[currentIndex + 1];

  // Load high score on mount
  useEffect(() => {
    AsyncStorage.getItem(HIGH_SCORE_KEY).then((val) => {
      if (val) setHighScore(parseInt(val, 10));
    });
  }, []);

  // Initialize game
  const startGame = useCallback(() => {
    const seed = isFirstGame.current ? getModeSeed('higherlower') : Date.now();
    isFirstGame.current = false;
    seedRef.current = seed;
    const players = generatePlayerQueue(seed, QUEUE_SIZE);
    setQueue(players);
    setCurrentIndex(0);
    setStreak(0);
    setGameState('playing');
    setShowChallengerValue(false);
    setShakeWrong(false);
    setCelebration(null);
    setPbFlash(false);
    pbBeatenRef.current = false;
    slideX.value = 0;
    challengerOpacity.value = 1;
  }, [slideX, challengerOpacity]);

  useEffect(() => {
    if (restoredDaily) {
      // Completed daily re-entry: keep the recorded result on screen; PLAY
      // AGAIN deals a practice run (random seed, guarded stat writes).
      isFirstGame.current = false;
      return;
    }
    startGame();
  }, [startGame, restoredDaily]);

  // Animate challenger entrance on index change
  useEffect(() => {
    if (currentIndex > 0) {
      challengerOpacity.value = 0;
      challengerOpacity.value = withTiming(1, { duration: motion.base });
    }
  }, [currentIndex, challengerOpacity]);

  const saveHighScore = useCallback(
    async (newStreak: number) => {
      if (newStreak > highScore) {
        setHighScore(newStreak);
        await AsyncStorage.setItem(HIGH_SCORE_KEY, newStreak.toString());
      }
    },
    [highScore],
  );

  const finishSlide = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
    setShowChallengerValue(false);
    setPbFlash(false);
    slideX.value = 0;
    setGameState('playing');

    // If running low, extend the queue: seed the extension deterministically from
    // the run's base seed, continue the difficulty ramp from the current length
    // (don't reset to "easy"), and gap-check the seam against the previous tail.
    setQueue((prev) => {
      if (currentIndex + 3 < prev.length) return prev;
      const extIndex = Math.floor(prev.length / QUEUE_SIZE);
      const tailValue = prev[prev.length - 1]?.market_value ?? null;
      const morePlayers = generatePlayerQueue(
        extensionSeed(seedRef.current, extIndex),
        QUEUE_SIZE,
        undefined,
        prev.length,
        tailValue,
      );
      return [...prev, ...morePlayers];
    });
  }, [currentIndex, slideX]);

  const handleGuess = useCallback(
    (guess: 'higher' | 'lower') => {
      if (gameState !== 'playing' || !currentPlayer || !challengerPlayer) return;

      // Solve-time stopwatch starts on the first real guess (no-ops after).
      useSolveTimeStore.getState().markStarted('higherlower');

      setGameState('revealing');
      setShowChallengerValue(true);

      const currentVal = currentPlayer.market_value;
      const challengerVal = challengerPlayer.market_value;

      const isCorrect = isHigherLowerCorrect(guess, currentVal, challengerVal);

      if (isCorrect) {
        triggerNotification(NotificationFeedbackType.Success);
        const newStreak = streak + 1;
        setStreak(newStreak);
        saveHighScore(newStreak);

        // Escalating celebration ONLY at milestones (never every round).
        const milestoneIdx = STREAK_MILESTONES.indexOf(
          newStreak as (typeof STREAK_MILESTONES)[number],
        );
        if (milestoneIdx >= 0) {
          const intensity = MILESTONE_INTENSITY[milestoneIdx];
          setCelebration(intensity);
          triggerImpact(
            intensity === 'high'
              ? ImpactFeedbackStyle.Heavy
              : intensity === 'med'
                ? ImpactFeedbackStyle.Medium
                : ImpactFeedbackStyle.Light,
          );
          setTimeout(() => setCelebration(null), 2200);
        } else if (highScore > 0 && newStreak > highScore && !pbBeatenRef.current) {
          // Passing your personal best is its own one-time moment.
          pbBeatenRef.current = true;
          setPbFlash(true);
          triggerImpact(ImpactFeedbackStyle.Medium);
        }

        // After a brief delay, slide transition
        setTimeout(() => {
          setGameState('sliding');
          slideX.value = withTiming(-screenWidth, { duration: motion.slow }, (finished) => {
            if (finished) {
              runOnJS(finishSlide)();
            }
          });
        }, 1000);
      } else {
        triggerNotification(NotificationFeedbackType.Error);
        setShakeWrong(true);
        saveHighScore(streak);
        // Daily XP only — awardDailyXp no-ops on same-day replays.
        useManagerStore.getState().awardDailyXp('higher-lower', streak * 10);
        useDailyProgressStore.getState().markCompleted('higherlower', streak);
        // Streak mode: a fast run isn't a "best", so never record a time PB.
        useSolveTimeStore.getState().markCompleted('higherlower', { countsForBest: false });
        playCrossbar();
        setTimeout(() => {
          setGameState('gameover');
        }, 1200);
      }
    },
    [
      gameState,
      currentPlayer,
      challengerPlayer,
      streak,
      highScore,
      saveHighScore,
      slideX,
      screenWidth,
      finishSlide,
    ],
  );

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  const challengerAnimStyle = useAnimatedStyle(() => ({
    opacity: challengerOpacity.value,
  }));

  const solveTimeMs = useTodaySolveTime('higherlower');

  // The restored panel shares the recorded daily streak, not the live run's 0.
  const shareStreak = restoredDaily ? dailyScore : streak;
  const shareText = useMemo(
    () =>
      buildShareText({
        mode: 'higherlower',
        dailyNumber: getDailyNumber(),
        dailyStreak,
        streak: shareStreak,
        solveTimeMs,
      }),
    [dailyStreak, shareStreak, solveTimeMs],
  );

  if (restoredDaily) {
    // Restored result panel — same anatomy as the live game-over. The exact
    // losing pair isn't persisted, so the reveal detail block is omitted.
    return (
      <Screen scroll={false}>
        <View style={styles.gameOverContainer}>
          <Animated.View entering={FadeIn.duration(motion.base)}>
            <Text style={styles.gameOverTitle}>ALREADY PLAYED TODAY</Text>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(100).duration(motion.base)}>
            <View style={styles.streakBlock}>
              <Text style={styles.gameOverStreak}>{dailyScore}</Text>
              <Text style={styles.gameOverStreakLabel}>STREAK</Text>
            </View>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(200).duration(motion.base)}>
            <RankBadge rank={getStreakRank(dailyScore)} />
          </Animated.View>
          <SolveTimeResult mode="higherlower" showBest={false} />
          {highScore > 0 && <Text style={styles.gameOverHighScore}>Best {highScore}</Text>}
          <GameOverActions
            shareRef={shareRef}
            shareText={shareText}
            win={dailyScore >= 10}
            onPlayAgain={() => setRestoredDaily(false)}
            playAgainLabel="PLAY AGAIN"
            currentModeKey="higherlower"
          />
        </View>
        {/* Offscreen shareable view (streak is persisted, so sharing works) */}
        <View style={styles.offscreen}>
          <View ref={shareRef} collapsable={false}>
            <ShareableHigherLowerResult streak={dailyScore} />
          </View>
        </View>
      </Screen>
    );
  }

  if (!currentPlayer || !challengerPlayer) {
    return (
      <Screen scroll={false}>
        <View style={styles.centerFill}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  if (gameState === 'gameover') {
    const gap = gapPercent(currentPlayer.market_value, challengerPlayer.market_value);
    const gapText = gap <= 10 ? `So close, within ${gap}%!` : `Off by ${gap}%`;
    return (
      <Screen scroll={false}>
        <View style={styles.gameOverContainer}>
          <Animated.View entering={FadeIn.duration(motion.base)}>
            <Text style={styles.gameOverTitle}>GAME OVER</Text>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(100).duration(motion.base)}>
            <View style={styles.streakBlock}>
              <Text style={styles.gameOverStreak}>{streak}</Text>
              <Text style={styles.gameOverStreakLabel}>STREAK</Text>
            </View>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(200).duration(motion.base)}>
            <RankBadge rank={getStreakRank(streak)} />
          </Animated.View>
          <SolveTimeResult mode="higherlower" showBest={false} />
          <Text style={styles.gameOverHighScore}>Best {highScore}</Text>
          {/* Teach on loss: both values revealed, with the gap that beat them. */}
          <Animated.View
            entering={FadeIn.delay(250).duration(motion.base)}
            style={styles.gameOverDetails}>
            <Text style={styles.gapText}>{gapText}</Text>
            <Text style={styles.gameOverDetail}>
              {currentPlayer.name}: {formatMarketValue(currentPlayer.market_value)}
            </Text>
            <Text style={styles.gameOverDetail}>
              {challengerPlayer.name}: {formatMarketValue(challengerPlayer.market_value)}
            </Text>
          </Animated.View>
          <GameOverActions
            shareRef={shareRef}
            shareText={shareText}
            win={streak >= 10}
            onPlayAgain={startGame}
            playAgainLabel="PLAY AGAIN"
          />
        </View>
        {/* Offscreen shareable view */}
        <View style={styles.offscreen}>
          <View ref={shareRef} collapsable={false}>
            <ShareableHigherLowerResult streak={streak} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScreenHeader
        eyebrow={`Daily #${getDailyNumber()}`}
        title="Higher or Lower"
        modeKey="higherlower"
        right={
          <View style={styles.headerStats}>
            <Text style={styles.streakValue}>{streak}</Text>
            {highScore > 0 && (
              <Text style={[styles.bestValue, pbFlash && styles.bestValueFlash]}>
                {pbFlash ? 'NEW BEST!' : `BEST ${highScore}`}
              </Text>
            )}
            <SolveTimeChip mode="higherlower" />
          </View>
        }
      />

      {/* Cards */}
      <ShakeView shake={shakeWrong}>
        <Animated.View style={[styles.cardsContainer, slideStyle]}>
          <View style={styles.cardWrapper}>
            <Text style={styles.cardLabel}>CURRENT</Text>
            <StatCard
              player={currentPlayer}
              showValue={true}
              stat="Market Value"
              formattedValue={formatMarketValue(currentPlayer.market_value)}
              difficulty={getPlayerDifficulty(currentPlayer)}
            />
          </View>
          <View style={styles.vsContainer}>
            <View style={styles.vsPill}>
              <Text style={styles.vsText}>VS</Text>
            </View>
          </View>
          <Animated.View style={[styles.cardWrapper, challengerAnimStyle]}>
            <Text style={styles.cardLabel}>CHALLENGER</Text>
            <StatCard
              player={challengerPlayer}
              showValue={showChallengerValue}
              stat="Market Value"
              formattedValue={formatMarketValue(challengerPlayer.market_value)}
              difficulty={getPlayerDifficulty(challengerPlayer)}
            />
          </Animated.View>
        </Animated.View>
      </ShakeView>

      {/* Buttons — result haptics fire in handleGuess, so no per-tap haptic here */}
      <View style={styles.buttonsContainer}>
        <Tappable
          haptic="none"
          style={[
            styles.bigButton,
            styles.higherButton,
            gameState !== 'playing' && styles.bigButtonDisabled,
          ]}
          hoverStyle={{ backgroundColor: colors.accentBright }}
          onPress={() => handleGuess('higher')}
          disabled={gameState !== 'playing'}>
          <Text style={styles.higherArrow}>{'↑'}</Text>
          <Text style={styles.higherText}>HIGHER</Text>
        </Tappable>
        <Tappable
          haptic="none"
          style={[
            styles.bigButton,
            styles.lowerButton,
            gameState !== 'playing' && styles.bigButtonDisabled,
          ]}
          hoverStyle={{ backgroundColor: colors.dangerBright }}
          onPress={() => handleGuess('lower')}
          disabled={gameState !== 'playing'}>
          <Text style={styles.lowerArrow}>{'↓'}</Text>
          <Text style={styles.lowerText}>LOWER</Text>
        </Tappable>
      </View>
      {celebration && <Confetti intensity={celebration} />}
    </Screen>
  );
}

const createStyles = (c: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
    centerFill: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...type.h3,
      color: c.textPrimary,
      textAlign: 'center',
    },
    headerStats: {
      alignItems: 'flex-end',
    },
    streakValue: {
      ...type.scoreLarge,
      color: c.accent,
    },
    bestValue: {
      ...type.micro,
      color: c.textMuted,
      marginTop: 2,
      letterSpacing: 1,
    },
    bestValueFlash: {
      color: c.streakBright,
    },
    cardsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xl,
    },
    cardWrapper: {
      flex: 1,
      minWidth: 150,
    },
    cardLabel: {
      ...type.captionBold,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    vsContainer: {
      paddingHorizontal: spacing.sm,
    },
    vsPill: {
      backgroundColor: c.accentSoft,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: c.accentBorder,
      marginTop: spacing.xl,
    },
    vsText: {
      ...type.h1,
      color: c.textPrimary,
      textShadowColor: c.accent,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 12,
    },
    buttonsContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingVertical: spacing.xl,
    },
    bigButton: {
      flex: 1,
      minHeight: 72,
      borderRadius: borderRadius.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      ...shadows.cardShadow,
    },
    higherButton: {
      backgroundColor: c.accent,
    },
    lowerButton: {
      backgroundColor: c.danger,
    },
    bigButtonDisabled: {
      opacity: 0.4,
    },
    higherArrow: {
      ...type.h1,
      color: c.textOnAccent,
      userSelect: 'none',
    },
    higherText: {
      ...type.h2,
      letterSpacing: 3,
      textTransform: 'uppercase',
      color: c.textOnAccent,
      userSelect: 'none',
    },
    lowerArrow: {
      ...type.h1,
      color: c.textOnAccent,
      userSelect: 'none',
    },
    lowerText: {
      ...type.h2,
      letterSpacing: 3,
      textTransform: 'uppercase',
      color: c.textOnAccent,
      userSelect: 'none',
    },
    gameOverContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.lg,
    },
    gameOverTitle: {
      ...type.h1,
      color: c.textSecondary,
    },
    streakBlock: {
      alignItems: 'center',
    },
    gameOverStreak: {
      ...type.display,
      color: c.accent,
    },
    gameOverStreakLabel: {
      ...type.micro,
      color: c.textSecondary,
      letterSpacing: 2,
      marginTop: -spacing.xs,
    },
    gameOverHighScore: {
      ...type.captionBold,
      color: c.streak,
    },
    gameOverDetails: {
      marginTop: spacing.md,
      gap: spacing.sm,
      alignItems: 'center',
    },
    gapText: {
      ...type.bodyBold,
      color: c.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    gameOverDetail: {
      ...type.body,
      color: c.textSecondary,
      textAlign: 'center',
    },
    offscreen: {
      position: 'absolute',
      left: -9999,
    },
  });

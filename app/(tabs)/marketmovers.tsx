// ⚠️ DEPRECATED MODE — Market Movers (2026-07).
// Removed from the product surface because it duplicated Higher/Lower: the
// same binary higher/lower loop, just on transfer fees instead of market
// value — and fee knowledge is already exercised by the Transfer Agent mode.
// The screen is intentionally kept fully functional (dormant, not deleted):
// it is hidden from the hub/daily rotation by its removal from
// lib/modeRegistry.ts GAME_MODES and from useDailyProgressStore's
// DAILY_MODE_KEYS, but direct navigation to /(tabs)/marketmovers still works
// (the href: null entry in app/(tabs)/_layout.tsx keeps it off the tab bar).
// To revive: re-add the GAME_MODES entry, the DAILY_MODE_KEYS key, the
// RECAP_MODES line in lib/shareText.ts, and re-register
// scripts/qa/e2e/modes/marketmovers.mjs in the e2e runner.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { spacing, borderRadius, touch, type, motion } from '@/constants/theme';
import { ThemeColors, ThemeShadows } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { triggerImpact, triggerNotification } from '@/lib/haptics';
import { getModeSeed } from '@/lib/dailySeed';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { generateFeeQueue, FeeTransfer } from '@/lib/feeHigherLowerGenerator';
import { isHigherLowerCorrect } from '@/lib/higherLowerGenerator';
import { getStreakRank, STREAK_MILESTONES } from '@/lib/rankLadder';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import { useSolveTimeStore, useTodaySolveTime } from '@/hooks/useSolveTimeStore';
import SolveTimeChip, { SolveTimeResult } from '@/components/ui/SolveTimeChip';
import ShakeView from '@/components/ui/ShakeView';
import GameOverActions from '@/components/ui/GameOverActions';
import RankBadge from '@/components/ui/RankBadge';
import Confetti from '@/components/ui/Confetti';
import Screen, { TAB_BAR_HEIGHT } from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Tappable from '@/components/ui/Tappable';
import ShareableMarketMoversResult from '@/components/ShareableMarketMoversResult';
import { buildShareText } from '@/lib/sharing';
import { playCrossbar } from '@/lib/sounds';

const HIGH_SCORE_KEY = '@marketmovers_highscore';
const QUEUE_SIZE = 100;

type CelebrationIntensity = 'low' | 'med' | 'high';

/** Confetti intensity for each streak milestone (5 → low, 10 → med, 15/21 → high). */
const MILESTONE_INTENSITY: CelebrationIntensity[] = ['low', 'med', 'high', 'high'];

/** Deterministic seed for the Nth mid-run queue extension, derived from the run's
 *  base seed so a long daily stays reproducible. */
function extensionSeed(baseSeed: number, extIndex: number): number {
  return (baseSeed + extIndex * 0x9e3779b1) >>> 0;
}

/** Relative gap between two fees as a whole-number percent (of the smaller). */
function gapPercent(a: number, b: number): number {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (lo <= 0) return 0;
  return Math.round(((hi - lo) / lo) * 100);
}

type GameState = 'playing' | 'revealing' | 'gameover';

type Styles = ReturnType<typeof createStyles>;

function TransferInfo({
  transfer,
  showFee,
  styles,
}: {
  transfer: FeeTransfer;
  showFee: boolean;
  styles: Styles;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.playerName} numberOfLines={1}>
        {transfer.playerName}
      </Text>
      <Text style={styles.clubs} numberOfLines={2}>
        {transfer.fromClub} {'→'} {transfer.toClub}
      </Text>
      <Text style={styles.year}>{transfer.year}</Text>
      <View style={styles.feeWrap}>
        {showFee ? (
          <Text style={styles.fee}>{transfer.feeDisplay}</Text>
        ) : (
          <Text style={styles.feeHidden}>???</Text>
        )}
      </View>
    </View>
  );
}

export default function MarketMoversScreen() {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [queue, setQueue] = useState<FeeTransfer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [showChallengerFee, setShowChallengerFee] = useState(false);
  const [shakeWrong, setShakeWrong] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationIntensity | null>(null);
  const [pbFlash, setPbFlash] = useState(false);
  // Daily re-entry restoration: recorded result at MOUNT time shows a restored
  // panel instead of dealing a fresh run (mount-only so a live game-over is
  // never swapped out from under the player).
  const [restoredDaily, setRestoredDaily] = useState(() =>
    useDailyProgressStore.getState().isCompleted('marketmovers'),
  );
  const dailyScore = useDailyProgressStore((s) => s.scoresByMode['marketmovers'] ?? 0);
  const shareRef = useRef<View>(null);
  const isFirstGame = useRef(true);
  const seedRef = useRef(Date.now());
  const pbBeatenRef = useRef(false);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);

  const current = queue[currentIndex];
  const challenger = queue[currentIndex + 1];

  // Load personal best on mount.
  useEffect(() => {
    AsyncStorage.getItem(HIGH_SCORE_KEY).then((val) => {
      if (val) setHighScore(parseInt(val, 10));
    });
  }, []);

  const startGame = useCallback(() => {
    const seed = isFirstGame.current ? getModeSeed('marketmovers') : Date.now();
    isFirstGame.current = false;
    seedRef.current = seed;
    setQueue(generateFeeQueue(seed, QUEUE_SIZE));
    setCurrentIndex(0);
    setStreak(0);
    setGameState('playing');
    setShowChallengerFee(false);
    setShakeWrong(false);
    setCelebration(null);
    setPbFlash(false);
    pbBeatenRef.current = false;
  }, []);

  useEffect(() => {
    if (restoredDaily) {
      // Completed daily re-entry: keep the recorded result on screen; PLAY
      // AGAIN deals a practice run (random seed, guarded stat writes).
      isFirstGame.current = false;
      return;
    }
    startGame();
  }, [startGame, restoredDaily]);

  const saveHighScore = useCallback(
    (newStreak: number) => {
      if (newStreak > highScore) {
        setHighScore(newStreak);
        AsyncStorage.setItem(HIGH_SCORE_KEY, newStreak.toString());
      }
    },
    [highScore],
  );

  const endGame = useCallback((finalStreak: number) => {
    // Daily XP only — awardDailyXp no-ops on same-day replays.
    useManagerStore.getState().awardDailyXp('marketmovers', finalStreak * 10);
    useDailyProgressStore.getState().markCompleted('marketmovers', finalStreak);
    // Streak mode: a fast run isn't a "best", so never record a time PB.
    useSolveTimeStore.getState().markCompleted('marketmovers', { countsForBest: false });
  }, []);

  const handleGuess = useCallback(
    (guess: 'higher' | 'lower') => {
      if (gameState !== 'playing' || !current || !challenger) return;

      // Solve-time stopwatch starts on the first real guess (no-ops after).
      useSolveTimeStore.getState().markStarted('marketmovers');

      setGameState('revealing');
      setShowChallengerFee(true);

      const isCorrect = isHigherLowerCorrect(guess, current.fee, challenger.fee);

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

        setTimeout(() => {
          // Extend the queue if we're running low: seed the extension
          // deterministically from the run's base seed, continue the difficulty
          // ramp from the current length (don't reset to easy), and gap-check the
          // seam against the previous tail fee.
          setQueue((prev) => {
            if (currentIndex + 3 < prev.length) return prev;
            const extIndex = Math.floor(prev.length / QUEUE_SIZE);
            const tailFee = prev[prev.length - 1]?.fee ?? null;
            return [
              ...prev,
              ...generateFeeQueue(
                extensionSeed(seedRef.current, extIndex),
                QUEUE_SIZE,
                prev.length,
                undefined,
                tailFee,
              ),
            ];
          });
          setCurrentIndex((i) => i + 1);
          setShowChallengerFee(false);
          setPbFlash(false);
          setGameState('playing');
        }, 900);
      } else {
        triggerNotification(NotificationFeedbackType.Error);
        setShakeWrong(true);
        playCrossbar();
        endGame(streak);
        setTimeout(() => setGameState('gameover'), 1100);
      }
    },
    [gameState, current, challenger, streak, highScore, saveHighScore, currentIndex, endGame],
  );

  const solveTimeMs = useTodaySolveTime('marketmovers');

  // The restored panel shares the recorded daily streak, not the live run's 0.
  const shareText = buildShareText({
    mode: 'marketmovers',
    dailyNumber: getDailyNumber(),
    dailyStreak,
    streak: restoredDaily ? dailyScore : streak,
    solveTimeMs,
  });

  if (restoredDaily) {
    // Restored result panel — same anatomy as the live game-over. The exact
    // losing pair isn't persisted, so the reveal detail block is omitted.
    return (
      <Screen>
        <ScreenHeader
          eyebrow={`Daily #${getDailyNumber()}`}
          title="Market Movers"
          subtitle="Already played today"
        />
        <Animated.View
          entering={FadeIn.duration(motion.base)}
          style={layoutStyles.gameOverContainer}>
          <Text style={styles.gameOverStreak}>{dailyScore}</Text>
          <Text style={styles.gameOverStreakLabel}>STREAK</Text>
          <RankBadge rank={getStreakRank(dailyScore)} />
          <SolveTimeResult mode="marketmovers" showBest={false} />
          {highScore > 0 && <Text style={styles.gameOverBest}>Best {highScore}</Text>}
          <GameOverActions
            shareRef={shareRef}
            shareText={shareText}
            win={dailyScore >= 10}
            onPlayAgain={() => setRestoredDaily(false)}
            playAgainLabel="PLAY AGAIN"
            currentModeKey="marketmovers"
          />
        </Animated.View>
        {/* Keep the last game-over card clear of the floating tab bar. */}
        <View style={layoutStyles.bottomSpacer} />
        <View style={layoutStyles.offscreen}>
          <View ref={shareRef} collapsable={false}>
            <ShareableMarketMoversResult streak={dailyScore} />
          </View>
        </View>
      </Screen>
    );
  }

  if (!current || !challenger) {
    return (
      <Screen scroll={false}>
        <Text style={styles.loadingText}>Loading...</Text>
      </Screen>
    );
  }

  if (gameState === 'gameover') {
    const gap = gapPercent(current.fee, challenger.fee);
    const gapText = gap <= 10 ? `So close, within ${gap}%!` : `Off by ${gap}%`;
    return (
      <Screen>
        <ScreenHeader
          eyebrow={`Daily #${getDailyNumber()}`}
          title="Market Movers"
          subtitle="Full time"
        />
        <Animated.View
          entering={FadeIn.duration(motion.base)}
          style={layoutStyles.gameOverContainer}>
          <Text style={styles.gameOverStreak}>{streak}</Text>
          <Text style={styles.gameOverStreakLabel}>STREAK</Text>
          <RankBadge rank={getStreakRank(streak)} />
          <SolveTimeResult mode="marketmovers" showBest={false} />
          <Text style={styles.gameOverBest}>Best {highScore}</Text>
          {/* Teach on loss: both fees revealed, with the gap that beat them. */}
          <View style={layoutStyles.gameOverDetails}>
            <Text style={styles.gapText}>{gapText}</Text>
            <Text style={styles.gameOverDetail}>
              {current.playerName}: {current.feeDisplay}
            </Text>
            <Text style={styles.gameOverDetail}>
              {challenger.playerName}: {challenger.feeDisplay}
            </Text>
          </View>
          <GameOverActions
            shareRef={shareRef}
            shareText={shareText}
            win={streak >= 10}
            onPlayAgain={startGame}
            playAgainLabel="PLAY AGAIN"
          />
        </Animated.View>
        {/* Keep the last game-over card clear of the floating tab bar. */}
        <View style={layoutStyles.bottomSpacer} />
        <View style={layoutStyles.offscreen}>
          <View ref={shareRef} collapsable={false}>
            <ShareableMarketMoversResult streak={streak} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScreenHeader
        eyebrow={`Daily #${getDailyNumber()}`}
        title="Market Movers"
        right={
          <View style={layoutStyles.streakPill}>
            <Text style={styles.streakValue}>{streak}</Text>
            {highScore > 0 ? (
              <Text style={[styles.bestValue, pbFlash && styles.bestValueFlash]}>
                {pbFlash ? 'NEW BEST!' : `BEST ${highScore}`}
              </Text>
            ) : (
              <Text style={styles.streakLabel}>STREAK</Text>
            )}
            <SolveTimeChip mode="marketmovers" />
          </View>
        }
      />

      <View style={layoutStyles.body}>
        <ShakeView shake={shakeWrong}>
          <View style={layoutStyles.cardsRow}>
            <View style={layoutStyles.cardWrapper}>
              <Text style={styles.cardLabel}>TRANSFER FEE</Text>
              <TransferInfo transfer={current} showFee styles={styles} />
            </View>
            <View style={styles.vsPill}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            <View style={layoutStyles.cardWrapper}>
              <Text style={styles.cardLabel}>FEE?</Text>
              <TransferInfo transfer={challenger} showFee={showChallengerFee} styles={styles} />
            </View>
          </View>
        </ShakeView>

        <Text style={styles.prompt}>Was the second fee higher or lower?</Text>
      </View>

      {/* Result haptics fire in handleGuess, so no per-tap haptic here. */}
      <View style={layoutStyles.buttonsRow}>
        <Tappable
          haptic="none"
          style={[
            styles.bigButton,
            styles.higherButton,
            gameState !== 'playing' && layoutStyles.disabled,
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
            gameState !== 'playing' && layoutStyles.disabled,
          ]}
          hoverStyle={{ backgroundColor: colors.bgCardPressed }}
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

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  streakPill: {
    alignItems: 'center',
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  cardWrapper: {
    flex: 1,
    minWidth: 140,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  disabled: { opacity: 0.4 },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gameOverDetails: {
    marginTop: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  bottomSpacer: {
    height: TAB_BAR_HEIGHT + spacing.lg,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

const createStyles = (c: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
    loadingText: {
      ...type.h2,
      color: c.textPrimary,
      textAlign: 'center',
      marginTop: 100,
    },
    streakValue: {
      ...type.scoreLarge,
      color: c.streak,
    },
    streakLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1.5,
    },
    bestValue: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1,
      marginTop: 2,
    },
    bestValueFlash: {
      color: c.streakBright,
    },
    cardLabel: {
      ...type.micro,
      color: c.textSecondary,
      letterSpacing: 2,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    card: {
      backgroundColor: c.bgCard,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.md,
      alignItems: 'center',
      gap: spacing.xs,
      minHeight: 160,
      justifyContent: 'center',
      ...shadows.cardShadow,
    },
    playerName: {
      ...type.h3,
      color: c.textPrimary,
      textAlign: 'center',
    },
    clubs: {
      ...type.caption,
      color: c.textSecondary,
      textAlign: 'center',
    },
    year: {
      ...type.score,
      color: c.streak,
    },
    feeWrap: {
      marginTop: spacing.xs,
      minHeight: 30,
      justifyContent: 'center',
    },
    fee: {
      ...type.scoreLarge,
      color: c.accent,
    },
    feeHidden: {
      ...type.scoreLarge,
      color: c.textMuted,
    },
    vsPill: {
      backgroundColor: c.accentSoft,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    vsText: {
      ...type.h3,
      color: c.textPrimary,
    },
    prompt: {
      ...type.bodyBold,
      color: c.textPrimary,
      textAlign: 'center',
      marginVertical: spacing.md,
    },
    bigButton: {
      flex: 1,
      minHeight: touch.cta,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.xl,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      ...shadows.cardShadow,
    },
    higherButton: { backgroundColor: c.accent },
    lowerButton: {
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    higherArrow: { ...type.h1, color: c.textOnAccent, userSelect: 'none' },
    higherText: {
      ...type.h2,
      letterSpacing: 3,
      color: c.textOnAccent,
      userSelect: 'none',
    },
    lowerArrow: { ...type.h1, color: c.accent, userSelect: 'none' },
    lowerText: {
      ...type.h2,
      letterSpacing: 3,
      color: c.accent,
      userSelect: 'none',
    },
    gameOverStreak: {
      ...type.display,
      color: c.streak,
    },
    gameOverStreakLabel: {
      ...type.micro,
      color: c.textSecondary,
      letterSpacing: 2,
      marginBottom: spacing.sm,
    },
    gameOverBest: {
      ...type.captionBold,
      color: c.streak,
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
  });

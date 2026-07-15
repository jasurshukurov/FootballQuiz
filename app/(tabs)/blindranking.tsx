import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Player } from '@/types/player';
import { spacing, borderRadius, type, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import {
  generateBlindRankingPuzzle,
  scoreRanking,
  rankingSlotStatuses,
  getRevealValue,
  MAX_RANKING_POINTS,
  BlindRankingPuzzle,
  SlotStatus,
} from '@/lib/blindRankingGenerator';
import RankBadge from '@/components/ui/RankBadge';
import { getRank } from '@/lib/rankLadder';
import { getModeSeed } from '@/lib/dailySeed';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyResultsStore } from '@/hooks/useDailyResultsStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import { useSolveTimeStore, useTodaySolveTime } from '@/hooks/useSolveTimeStore';
import ChallengerCard from '@/components/games/ChallengerCard';
import RankSlot from '@/components/games/RankSlot';
import GameOverActions from '@/components/ui/GameOverActions';
import GiveUpButton from '@/components/ui/GiveUpButton';
import { SolveTimeResult } from '@/components/ui/SolveTimeChip';
import Screen, { TAB_BAR_HEIGHT } from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { todayBandDisplay } from '@/components/ui/DifficultyBanner';
import ShareableBlindRankingResult from '@/components/ShareableBlindRankingResult';
import { buildShareText } from '@/lib/sharing';
import { playCheer, playCrossbar } from '@/lib/sounds';

type Phase = 'placing' | 'revealing' | 'complete';

export default function BlindRankingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [puzzle, setPuzzle] = useState<BlindRankingPuzzle | null>(null);
  const [slots, setSlots] = useState<(Player | null)[]>([null, null, null, null, null]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('placing');
  const [score, setScore] = useState(0);
  const [breakdown, setBreakdown] = useState<{ exact: number; adjacent: number }>({
    exact: 0,
    adjacent: 0,
  });
  const [correctSlots, setCorrectSlots] = useState<(SlotStatus | undefined)[]>([
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
  ]);
  const shareRef = useRef<View>(null);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);

  const isFirstGame = useRef(true);
  /** True while the current run IS the official daily (blob writes gate on it). */
  const isDailyRun = useRef(true);
  // Daily re-entry restoration: recorded result at MOUNT time restores the
  // reveal panel instead of dealing the daily again (mount-only by design).
  const [restoredDaily] = useState(() =>
    useDailyProgressStore.getState().isCompleted('blindranking'),
  );
  // Whether the restored panel can show the exact/adjacent breakdown (persisted
  // detail blob present; completions from before the blob existed hide it).
  const [showBreakdown, setShowBreakdown] = useState(true);

  const solveTimeMs = useTodaySolveTime('blindranking');

  const shareText = useMemo(
    () =>
      puzzle
        ? buildShareText({
            mode: 'blindranking',
            dailyNumber: getDailyNumber(),
            dailyStreak,
            score,
            total: MAX_RANKING_POINTS,
            categoryTitle: puzzle.category.title,
            solveTimeMs,
          })
        : '',
    [puzzle, dailyStreak, score, solveTimeMs],
  );

  const startGame = useCallback(() => {
    const seed = isFirstGame.current ? getModeSeed('blindranking') : Date.now();
    isDailyRun.current = isFirstGame.current;
    isFirstGame.current = false;
    const p = generateBlindRankingPuzzle(seed);
    setPuzzle(p);
    setSlots([null, null, null, null, null]);
    setCurrentIdx(0);
    setPhase('placing');
    setScore(0);
    setBreakdown({ exact: 0, adjacent: 0 });
    setShowBreakdown(true);
    setCorrectSlots([undefined, undefined, undefined, undefined, undefined]);
  }, []);

  useEffect(() => {
    if (restoredDaily) {
      // Completed daily re-entry: rebuild the deterministic daily puzzle and
      // show the recorded result; "Play Again" deals a practice run.
      isFirstGame.current = false;
      isDailyRun.current = false;
      setPuzzle(generateBlindRankingPuzzle(getModeSeed('blindranking')));
      setScore(useDailyProgressStore.getState().scoresByMode['blindranking'] ?? 0);
      const blob = useDailyResultsStore
        .getState()
        .getResult<{ exact: number; adjacent: number }>('blindranking');
      if (blob) setBreakdown(blob);
      else setShowBreakdown(false);
      setPhase('complete');
      return;
    }
    startGame();
  }, [startGame, restoredDaily]);

  // Shared finish bookkeeping: sound, XP, daily completion, solve-time PB, and
  // the persisted breakdown blob (DAILY run only). Called by both the staggered
  // full-reveal and the give-up path, so the two can never drift apart.
  const recordCompletion = useCallback((points: number, exact: number, adjacent: number) => {
    if (points >= MAX_RANKING_POINTS * 0.7) {
      playCheer();
    } else {
      playCrossbar();
    }
    useManagerStore.getState().awardDailyXp('blindranking', points * 10);
    useDailyProgressStore.getState().markCompleted('blindranking', points);
    // Time PB only counts on a winning ranking (>= 70% of points).
    useSolveTimeStore.getState().markCompleted('blindranking', {
      countsForBest: points >= MAX_RANKING_POINTS * 0.7,
    });
    if (isDailyRun.current) {
      useDailyResultsStore.getState().setResult('blindranking', { exact, adjacent });
    }
  }, []);

  // Give up: end today's game now, scoring only the slots placed so far. Unplaced
  // slots score nothing (scoreRanking tolerates the null ids) and the game-over
  // surface reveals the true order. No staggered board reveal — we jump straight
  // to the result. Only reachable during active placing (button is placing-only).
  const handleGiveUp = useCallback(() => {
    if (phase !== 'placing' || !puzzle) return;
    const userRanking = slots.map((p) => p?.id ?? null);
    const { points, exact, adjacent } = scoreRanking(userRanking, puzzle.correctOrder);
    setScore(points);
    setBreakdown({ exact, adjacent });
    setPhase('complete');
    recordCompletion(points, exact, adjacent);
  }, [phase, puzzle, slots, recordCompletion]);

  // Placement haptic fires inside RankSlot's Tappable — no extra impact here.
  const handleSlotPress = useCallback(
    (slotIndex: number) => {
      if (phase !== 'placing' || !puzzle || currentIdx >= puzzle.players.length) return;
      if (slots[slotIndex] !== null) return;

      // Solve-time stopwatch starts on the first placement (no-ops after).
      useSolveTimeStore.getState().markStarted('blindranking');

      const player = puzzle.players[currentIdx];
      const newSlots = [...slots];
      newSlots[slotIndex] = player;
      setSlots(newSlots);

      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);

      if (nextIdx >= 5) {
        // All placed, start revealing
        setTimeout(() => {
          const userRanking = newSlots.map((p) => p!.id);
          const { points, exact, adjacent } = scoreRanking(userRanking, puzzle.correctOrder);
          setScore(points);
          setBreakdown({ exact, adjacent });
          setPhase('revealing');

          // Staggered reveal
          const statuses = rankingSlotStatuses(userRanking, puzzle.correctOrder);
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              setCorrectSlots((prev) => {
                const next = [...prev];
                next[i] = statuses[i];
                return next;
              });

              if (i === 4) {
                // All revealed
                setTimeout(() => {
                  setPhase('complete');
                  recordCompletion(points, exact, adjacent);
                }, 400);
              }
            }, i * 400);
          }
        }, 500);
      }
    },
    [phase, puzzle, currentIdx, slots, recordCompletion],
  );

  if (!puzzle) {
    return (
      <Screen scroll={false}>
        <Text style={styles.loadingText}>Loading...</Text>
      </Screen>
    );
  }

  if (phase === 'complete') {
    return (
      <Screen>
        <ScreenHeader
          eyebrow={`Daily #${getDailyNumber()}`}
          title="Blind Ranking"
          modeKey="blindranking"
          difficulty={todayBandDisplay()}
          subtitle={puzzle.category.title}
        />
        <View style={layoutStyles.resultContainer}>
          <Animated.View entering={FadeIn.duration(motion.base)}>
            <View style={layoutStyles.resultHero}>
              <Text style={styles.resultTitle}>
                {score >= 8 ? 'BRILLIANT!' : score >= 4 ? 'NICE TRY!' : 'TOUGH LUCK!'}
              </Text>
              <Text style={styles.scoreText}>
                {score}/{MAX_RANKING_POINTS} pts
              </Text>
              {showBreakdown && (
                <Text style={styles.breakdownText}>
                  {breakdown.exact} exact · {breakdown.adjacent} adjacent
                </Text>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(150).duration(motion.base)}>
            <RankBadge rank={getRank(score, MAX_RANKING_POINTS)} unit="pts" />
          </Animated.View>

          <SolveTimeResult mode="blindranking" />

          {/* Show correct order */}
          <View style={layoutStyles.correctOrderSection}>
            <Text style={styles.correctOrderTitle}>CORRECT ORDER</Text>
            {puzzle.correctOrder.map((id, i) => {
              const player = puzzle.players.find((p) => p.id === id)!;
              const value = getRevealValue(player, puzzle.category);
              return (
                <Animated.View
                  key={id}
                  entering={FadeIn.delay(i * 40).duration(motion.base)}
                  style={styles.correctRow}>
                  <Text style={styles.correctRank}>#{i + 1}</Text>
                  <Text style={styles.correctName} numberOfLines={1}>
                    {player.name}
                  </Text>
                  <Text style={styles.correctValue}>{value}</Text>
                </Animated.View>
              );
            })}
          </View>

          <GameOverActions
            shareRef={shareRef}
            shareText={shareText}
            win={score >= MAX_RANKING_POINTS * 0.7}
            onPlayAgain={startGame}
          />
        </View>

        {/* Keep the last game-over card (NEXT UP / countdown) scrollable clear of
            the floating tab bar — extra clearance beyond Screen's tab-bar padding. */}
        <View style={layoutStyles.bottomSpacer} />

        {/* Offscreen shareable view */}
        <View style={layoutStyles.offscreen}>
          <View ref={shareRef} collapsable={false}>
            <ShareableBlindRankingResult
              score={breakdown.exact}
              categoryTitle={puzzle.category.title}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const currentPlayer = currentIdx < 5 ? puzzle.players[currentIdx] : null;

  return (
    <Screen>
      <ScreenHeader
        eyebrow={`Daily #${getDailyNumber()}`}
        title="Blind Ranking"
        modeKey="blindranking"
        difficulty={todayBandDisplay()}
        right={
          <View style={layoutStyles.progressPill}>
            <Text style={styles.progressValue}>
              {phase === 'placing' ? Math.min(currentIdx + 1, 5) : 5}/5
            </Text>
            <Text style={styles.progressLabel}>{phase === 'placing' ? 'PLACING' : 'REVEAL'}</Text>
          </View>
        }
      />

      {/* The GIVEN, made unmistakable (mirrors Guess the Match's team banner):
          today's category is the focal card, with the direction spelled out. */}
      <View style={styles.categoryBanner}>
        <View style={styles.categoryIconSquare}>
          <FontAwesome name="sort-amount-desc" size={20} color={colors.accent} />
        </View>
        <View style={layoutStyles.categoryText}>
          <Text style={styles.categoryTitle} numberOfLines={2}>
            {puzzle.category.title.toUpperCase()}
          </Text>
          <Text style={styles.categoryCaption}>
            Rank all five · {puzzle.category.topLabel.toLowerCase()} at #1
          </Text>
        </View>
      </View>

      {/* Current player card */}
      {currentPlayer && phase === 'placing' && (
        <ChallengerCard player={currentPlayer} visible={true} eyebrow="Where do they rank?" />
      )}

      {/* Rank slots */}
      <View style={layoutStyles.slotsContainer}>
        <Text style={styles.slotsLabel}>
          {phase === 'placing' ? 'TAP A SLOT TO PLACE' : 'YOUR RANKING'}
        </Text>
        {slots.map((player, i) => (
          <Animated.View key={i} entering={FadeIn.delay(i * 40).duration(motion.base)}>
            <RankSlot
              rank={i + 1}
              player={player}
              onPress={() => handleSlotPress(i)}
              disabled={phase !== 'placing' || player !== null}
              isRevealing={phase === 'revealing'}
              status={correctSlots[i]}
              endLabel={
                i === 0
                  ? puzzle.category.topLabel
                  : i === slots.length - 1
                    ? puzzle.category.bottomLabel
                    : undefined
              }
            />
          </Animated.View>
        ))}
      </View>

      {/* Give up during active placing: ends the game now, scoring the slots
          filled so far and revealing the true order on the game-over surface. */}
      {phase === 'placing' && (
        <View style={layoutStyles.giveUpRow}>
          <GiveUpButton onGiveUp={handleGiveUp} />
        </View>
      )}
    </Screen>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  progressPill: {
    alignItems: 'center',
  },
  categoryText: {
    flex: 1,
  },
  slotsContainer: {
    marginTop: spacing.lg,
  },
  giveUpRow: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resultContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  resultHero: {
    alignItems: 'center',
    gap: spacing.md,
  },
  correctOrderSection: {
    width: '100%',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  bottomSpacer: {
    height: TAB_BAR_HEIGHT + spacing.lg,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    loadingText: {
      ...type.h2,
      color: c.textPrimary,
      textAlign: 'center',
      marginTop: 100,
    },
    categoryBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.bgElevated,
      marginBottom: spacing.md,
    },
    categoryIconSquare: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentSoft,
    },
    categoryTitle: {
      ...type.h2,
      color: c.textPrimary,
    },
    categoryCaption: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: 2,
    },
    progressValue: {
      ...type.score,
      color: c.accent,
    },
    progressLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1.5,
    },
    slotsLabel: {
      ...type.micro,
      color: c.textSecondary,
      letterSpacing: 2,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    resultTitle: {
      ...type.display,
      color: c.accent,
      textAlign: 'center',
    },
    scoreText: {
      ...type.scoreLarge,
      color: c.textPrimary,
      textAlign: 'center',
    },
    breakdownText: {
      ...type.caption,
      color: c.textSecondary,
      letterSpacing: 1,
      textAlign: 'center',
    },
    correctOrderTitle: {
      ...type.micro,
      color: c.textSecondary,
      letterSpacing: 2,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    correctRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    correctRank: {
      ...type.score,
      color: c.accent,
      width: 32,
    },
    correctName: {
      flex: 1,
      ...type.bodyBold,
      color: c.textPrimary,
    },
    correctValue: {
      ...type.score,
      color: c.accent,
    },
  });

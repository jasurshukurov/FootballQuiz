import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { NotificationFeedbackType } from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { triggerNotification } from '@/lib/haptics';

import { spacing, borderRadius, touch, type, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { generateDailyAgentGame, AgentRound } from '@/lib/agentGameGenerator';
import { getModeSeed } from '@/lib/dailySeed';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyResultsStore } from '@/hooks/useDailyResultsStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useSolveTimeStore, useTodaySolveTime } from '@/hooks/useSolveTimeStore';
import TransferCard from '@/components/games/TransferCard';
import GlassCard from '@/components/ui/GlassCard';
import { SolveTimeResult } from '@/components/ui/SolveTimeChip';
import GameOverActions from '@/components/ui/GameOverActions';
import GameOverExtras from '@/components/ui/GameOverExtras';
import Screen, { TAB_BAR_HEIGHT } from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Tappable from '@/components/ui/Tappable';
import { useManagerStore } from '@/hooks/useManagerStore';
import { playCheer } from '@/lib/sounds';
import ShareableAgentResult from '@/components/ShareableAgentResult';
import { buildShareText } from '@/lib/sharing';
import RankBadge from '@/components/ui/RankBadge';
import { getRank } from '@/lib/rankLadder';

const MAX_HINTS = 3;
/** Staggered entrance cap for list rows. */
const MAX_ENTRANCE = 12;

type RoundResult = {
  round: AgentRound;
  selectedId: number;
  correct: boolean;
};

export default function AgentScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(MAX_HINTS);
  const [combo, setCombo] = useState(0);
  const [gameKey, setGameKey] = useState(() => String(getModeSeed('agent')));
  // Daily re-entry restoration: recorded result at MOUNT time restores the
  // game-over panel instead of dealing the daily again (mount-only so a live
  // game-over is never swapped out from under the player).
  const [restoredDaily] = useState(() => useDailyProgressStore.getState().isCompleted('agent'));
  const shareRef = useRef<View>(null);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);

  const rounds = useMemo(() => generateDailyAgentGame(gameKey), [gameKey]);
  /** gameKey of the official daily run — blob writes are gated on it. */
  const dailyGameKey = useMemo(() => String(getModeSeed('agent')), []);

  useEffect(() => {
    if (!restoredDaily) return;
    // Rounds are deterministic from the daily seed; the pick pattern comes from
    // the persisted daily-result blob (older completions restore score-only).
    const dailyScore = useDailyProgressStore.getState().scoresByMode['agent'] ?? 0;
    const blob = useDailyResultsStore.getState().getResult<{ correct: boolean[] }>('agent');
    setScore(dailyScore);
    if (blob) {
      setResults(
        blob.correct.slice(0, rounds.length).map((correct, i) => ({
          round: rounds[i],
          selectedId: correct ? rounds[i].correctPlayerId : -1,
          correct,
        })),
      );
    }
    setGameOver(true);
    // Mount-only restoration by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const round = rounds[currentRound] ?? null;
  const totalRounds = rounds.length;

  const solveTimeMs = useTodaySolveTime('agent');

  const shareText = useMemo(
    () =>
      buildShareText({
        mode: 'agent',
        dailyNumber: getDailyNumber(),
        dailyStreak,
        score,
        totalRounds,
        results: results.map((r) => r.correct),
        solveTimeMs,
      }),
    [dailyStreak, score, totalRounds, results, solveTimeMs],
  );

  const handleSelect = useCallback(
    (playerId: number) => {
      if (answered || !round) return;

      // Solve-time stopwatch starts on the first real pick (no-ops after).
      useSolveTimeStore.getState().markStarted('agent');

      setSelectedId(playerId);
      setAnswered(true);

      const isCorrect = playerId === round.correctPlayerId;
      if (isCorrect) {
        setScore((s) => s + 1);
        setCombo((c) => c + 1);
        triggerNotification(NotificationFeedbackType.Success);
      } else {
        setCombo(0);
        triggerNotification(NotificationFeedbackType.Error);
      }

      setResults((prev) => [...prev, { round, selectedId: playerId, correct: isCorrect }]);

      // Auto-advance after delay — reset hint for next round
      setTimeout(() => {
        setHintUsed(false);
        if (currentRound + 1 >= totalRounds) {
          const finalScore = isCorrect ? score + 1 : score;
          useManagerStore.getState().awardDailyXp('agent', finalScore * 15);
          setGameOver(true);
          if (finalScore >= 7) {
            playCheer();
          }
          useDailyProgressStore.getState().markCompleted('agent', finalScore);
          // Time PB only counts on a winning window (>= 60% of deals).
          useSolveTimeStore.getState().markCompleted('agent', {
            countsForBest: finalScore >= Math.ceil(totalRounds * 0.6),
          });
          // Persist the pick pattern (DAILY run only — Play-Again practice runs
          // use a random gameKey) so re-entry can restore the solve list.
          if (gameKey === dailyGameKey) {
            useDailyResultsStore.getState().setResult('agent', {
              correct: [...results.map((r) => r.correct), isCorrect],
            });
          }
        } else {
          setCurrentRound((r) => r + 1);
          setSelectedId(null);
          setAnswered(false);
        }
      }, 1500);
    },
    [answered, round, currentRound, totalRounds, score, results, gameKey, dailyGameKey],
  );

  // Tap haptic fires inside Tappable — no extra impact here.
  const handleHint = useCallback(() => {
    if (hintUsed || answered || hintsRemaining <= 0 || !round) return;
    // A hint is a meaningful first interaction too.
    useSolveTimeStore.getState().markStarted('agent');
    setHintUsed(true);
    setHintsRemaining((h) => h - 1);
  }, [hintUsed, answered, hintsRemaining, round]);

  const handlePlayAgain = useCallback(() => {
    setGameKey(String(Date.now()));
    setCurrentRound(0);
    setScore(0);
    setSelectedId(null);
    setAnswered(false);
    setGameOver(false);
    setResults([]);
    setHintUsed(false);
    setHintsRemaining(MAX_HINTS);
    setCombo(0);
  }, []);

  if (rounds.length === 0) {
    return (
      <Screen scroll={false}>
        <View style={layoutStyles.centerContainer}>
          <Text style={styles.emptyText}>No transfer data available</Text>
        </View>
      </Screen>
    );
  }

  if (gameOver) {
    const win = score >= Math.ceil(totalRounds * 0.6);
    const perfect = score === totalRounds;
    return (
      <Screen>
        <ScreenHeader
          eyebrow={`Daily #${getDailyNumber()}`}
          title="Transfer Agent"
          modeKey="agent"
          subtitle={
            restoredDaily && gameKey === dailyGameKey ? 'Already played today' : 'Full time'
          }
        />
        <Animated.View entering={FadeIn.duration(motion.base)}>
          <View style={layoutStyles.gameOverContainer}>
            {perfect && (
              <View style={styles.flawlessBanner}>
                <FontAwesome name="trophy" size={16} color={colors.streakBright} />
                <Text style={styles.flawlessText}>FLAWLESS WINDOW</Text>
              </View>
            )}
            <Text style={[styles.scoreDisplay, perfect && styles.scoreDisplayPerfect]}>
              {score}/{totalRounds}
            </Text>
            <Text style={styles.scoreLabel}>
              {perfect
                ? 'Every deal, nailed.'
                : score >= 7
                  ? 'Top agent!'
                  : score >= 4
                    ? 'Decent scout.'
                    : 'Back to the academy.'}
            </Text>

            <Animated.View entering={FadeIn.delay(150).duration(motion.base)}>
              <RankBadge rank={getRank(score, totalRounds)} unit="deals" />
            </Animated.View>

            <SolveTimeResult mode="agent" />

            <View style={layoutStyles.resultsList}>
              {results.map((r, i) => (
                <Animated.View
                  key={i}
                  entering={
                    i < MAX_ENTRANCE ? FadeIn.delay(i * 40).duration(motion.base) : undefined
                  }
                  style={layoutStyles.resultRow}>
                  <Text
                    style={[
                      styles.resultDot,
                      { color: r.correct ? colors.accent : colors.danger },
                    ]}>
                    {r.correct ? '✓' : '✗'}
                  </Text>
                  <Text style={styles.resultText} numberOfLines={2}>
                    {r.round.targetFee} — {r.round.correctPlayerName}
                  </Text>
                </Animated.View>
              ))}
            </View>

            <GameOverActions
              shareRef={shareRef}
              shareText={shareText}
              win={win}
              onPlayAgain={handlePlayAgain}
              includeExtras={false}
            />
          </View>
        </Animated.View>
        <GameOverExtras win={win} />
        {/* Keep the last game-over card (NEXT UP / countdown) scrollable clear of
            the floating tab bar — extra clearance beyond Screen's tab-bar padding. */}
        <View style={layoutStyles.bottomSpacer} />
        {/* Offscreen shareable view */}
        <View style={layoutStyles.offscreen}>
          <View ref={shareRef} collapsable={false}>
            <ShareableAgentResult score={score} totalRounds={totalRounds} results={results} />
          </View>
        </View>
      </Screen>
    );
  }

  if (!round) return null;

  const formatFee = (fee: string): string => {
    return fee.toUpperCase();
  };

  const missedPick =
    answered && selectedId !== null && selectedId !== round.correctPlayerId
      ? (round.options.find((o) => o.playerId === selectedId) ?? null)
      : null;

  return (
    <Screen scroll={false}>
      <ScreenHeader
        eyebrow={`Daily #${getDailyNumber()}`}
        title="Transfer Agent"
        modeKey="agent"
        subtitle={`Round ${currentRound + 1}/${totalRounds}`}
        right={
          <View style={layoutStyles.scorePill}>
            <Text style={styles.scorePillValue}>
              {score}/{totalRounds}
            </Text>
            <Text style={styles.scorePillLabel}>SCORE</Text>
          </View>
        }
      />

      <View style={layoutStyles.body}>
        {/* Fee Display */}
        <View style={layoutStyles.feeCard}>
          {combo >= 2 && !answered && (
            <View style={styles.comboPill}>
              <FontAwesome name="fire" size={12} color={colors.streak} />
              <Text style={styles.comboText}>{combo} IN A ROW</Text>
            </View>
          )}
          <Text style={styles.feeAmount}>{formatFee(round.targetFee)}</Text>
          <Text style={styles.feeSubtitle}>Which player was transferred for this fee?</Text>
        </View>

        {/* Hint: transfer direction */}
        {hintUsed && !answered && (
          <Animated.View entering={FadeIn.duration(motion.base)}>
            <View style={styles.hintCard}>
              <FontAwesome name="exchange" size={14} color={colors.streak} />
              <Text style={styles.hintText}>
                {round.correctClubFrom} {'→'} {round.correctClubTo}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Options — re-keyed per round so the entrance replays for new deals */}
        <View style={layoutStyles.optionsList}>
          {round.options.map((option, i) => {
            const isCorrectOption = option.playerId === round.correctPlayerId;
            const isSelected = selectedId === option.playerId;
            const showCorrect = answered && isCorrectOption;
            const showWrong = answered && isSelected && !isCorrectOption;

            return (
              <Animated.View
                key={option.playerId}
                entering={FadeIn.delay(i * 40).duration(motion.base)}>
                <TransferCard
                  playerName={option.playerName}
                  selected={isSelected}
                  correct={showCorrect}
                  wrong={showWrong}
                  onPress={() => handleSelect(option.playerId)}
                  disabled={answered}
                />
              </Animated.View>
            );
          })}
        </View>

        {/* Transfer detail reveal — teach on miss */}
        {answered && (
          <Animated.View entering={FadeIn.delay(200).duration(motion.base)}>
            <GlassCard style={layoutStyles.revealCard}>
              <Text style={styles.revealLabel}>CORRECT</Text>
              <Text style={styles.revealText} numberOfLines={1}>
                {round.correctPlayerName}
              </Text>
              <Text style={styles.revealSub} numberOfLines={1}>
                {round.correctClubFrom} {'→'} {round.correctClubTo}
              </Text>
              {missedPick && (
                <View style={styles.teachRow}>
                  <Text style={styles.teachLabel}>
                    {missedPick.playerName.toUpperCase()} WENT FOR
                  </Text>
                  <Text style={styles.teachSub} numberOfLines={1}>
                    {formatFee(missedPick.fee)} · {missedPick.clubFrom} {'→'} {missedPick.clubTo}
                  </Text>
                </View>
              )}
            </GlassCard>
          </Animated.View>
        )}
      </View>

      {/* Hint button — bottom-anchored */}
      {!answered && !hintUsed && (
        <Tappable
          onPress={handleHint}
          disabled={hintsRemaining <= 0}
          hoverStyle={{ backgroundColor: colors.streakSoft }}
          style={[styles.hintButton, hintsRemaining <= 0 && layoutStyles.hintButtonDisabled]}>
          <FontAwesome
            name="lightbulb-o"
            size={16}
            color={hintsRemaining > 0 ? colors.streak : colors.textMuted}
          />
          <Text
            style={[styles.hintButtonText, hintsRemaining <= 0 && styles.hintButtonTextDisabled]}>
            Show Transfer ({hintsRemaining}/{MAX_HINTS})
          </Text>
        </Tappable>
      )}
    </Screen>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  scorePill: {
    alignItems: 'center',
  },
  feeCard: {
    marginBottom: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  hintButtonDisabled: {
    opacity: 0.3,
  },
  optionsList: {
    gap: spacing.md,
  },
  revealCard: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  gameOverContainer: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  resultsList: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
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
    emptyText: {
      ...type.h3,
      color: c.textSecondary,
    },
    scorePillValue: {
      ...type.score,
      color: c.accent,
    },
    scorePillLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1.5,
    },
    comboPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: c.streakSoft,
      borderWidth: 1,
      borderColor: c.streak,
      borderRadius: borderRadius.full,
      paddingVertical: spacing.xs / 2,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    comboText: {
      ...type.micro,
      color: c.streak,
      letterSpacing: 1.5,
    },
    feeAmount: {
      ...type.scoreLarge,
      color: c.accent,
      letterSpacing: 2,
    },
    feeSubtitle: {
      marginTop: spacing.sm,
      ...type.caption,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      textAlign: 'center',
    },
    hintCard: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: spacing.sm,
      backgroundColor: c.streakSoft,
      borderWidth: 1,
      borderColor: c.streak,
      borderRadius: borderRadius.full,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    hintText: {
      ...type.bodyBold,
      color: c.streak,
      letterSpacing: 0.5,
    },
    hintButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      gap: spacing.sm,
      minHeight: touch.min,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: c.streak,
      backgroundColor: c.streakSoft,
    },
    hintButtonText: {
      ...type.captionBold,
      color: c.streak,
      letterSpacing: 0.5,
      userSelect: 'none',
    },
    hintButtonTextDisabled: {
      color: c.textMuted,
    },
    revealLabel: {
      ...type.micro,
      color: c.accent,
      letterSpacing: 2,
      marginBottom: spacing.xs,
    },
    revealText: {
      ...type.h3,
      color: c.textPrimary,
      letterSpacing: 1,
    },
    revealSub: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: 2,
    },
    teachRow: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
      alignItems: 'center',
      width: '100%',
    },
    teachLabel: {
      ...type.micro,
      color: c.danger,
      letterSpacing: 1.5,
    },
    teachSub: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: 2,
    },
    flawlessBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.streakSoft,
      borderWidth: 1,
      borderColor: c.streak,
      borderRadius: borderRadius.full,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    flawlessText: {
      ...type.h3,
      color: c.streakBright,
      letterSpacing: 2,
    },
    scoreDisplayPerfect: {
      color: c.streakBright,
    },
    scoreDisplay: {
      ...type.scoreLarge,
      color: c.accent,
      marginBottom: spacing.sm,
    },
    scoreLabel: {
      ...type.h3,
      color: c.textSecondary,
      marginBottom: spacing.xl,
    },
    resultDot: {
      ...type.bodyBold,
      width: 20,
    },
    resultText: {
      flex: 1,
      ...type.caption,
      color: c.textPrimary,
    },
  });

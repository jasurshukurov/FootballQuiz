import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { NotificationFeedbackType } from 'expo-haptics';

import { spacing, borderRadius, type, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { triggerNotification } from '@/lib/haptics';
import { getModeSeed } from '@/lib/dailySeed';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { generateMatchGuessPuzzle, MatchGuessPuzzle } from '@/lib/matchGuessGenerator';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import { useSolveTimeStore, useTodaySolveTime } from '@/hooks/useSolveTimeStore';
import { SolveTimeResult } from '@/components/ui/SolveTimeChip';
import ShakeView from '@/components/ui/ShakeView';
import GameOverActions from '@/components/ui/GameOverActions';
import RetroButton from '@/components/ui/RetroButton';
import Tappable from '@/components/ui/Tappable';
import Screen, { TAB_BAR_HEIGHT } from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ShareableMatchGuessResult from '@/components/ShareableMatchGuessResult';
import { buildShareText } from '@/lib/sharing';
import { playCheer, playCrossbar } from '@/lib/sounds';
import RankBadge from '@/components/ui/RankBadge';
import { getRank } from '@/lib/rankLadder';

const TOTAL_NAMES = 11;
const MAX_WRONG = 3;
/** RankBadge denominator: a solve on the very first name is the ceiling. */
const MAX_SCORE = 12;
/** Staggered entrance cap for list rows. */
const MAX_ENTRANCE = 12;

type Phase = 'playing' | 'won' | 'lost';

/** score = points for guessing with the fewest names revealed (11 down to 1). */
function scoreFor(revealedCount: number): number {
  return Math.max(1, TOTAL_NAMES + 1 - revealedCount);
}

export default function GuessMatchScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [puzzle, setPuzzle] = useState<MatchGuessPuzzle | null>(null);
  const [revealedCount, setRevealedCount] = useState(1);
  const [phase, setPhase] = useState<Phase>('playing');
  const [score, setScore] = useState(0);
  const [wrongPicks, setWrongPicks] = useState(0);
  const [shakeWrong, setShakeWrong] = useState(false);
  const shareRef = useRef<View>(null);
  const isFirstGame = useRef(true);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);
  // Daily re-entry restoration: recorded result at MOUNT time restores the
  // result panel instead of dealing the daily again (mount-only by design).
  const [restoredDaily] = useState(() =>
    useDailyProgressStore.getState().isCompleted('guessmatch'),
  );

  const startGame = useCallback(() => {
    const seed = isFirstGame.current ? getModeSeed('guessmatch') : Date.now();
    isFirstGame.current = false;
    setPuzzle(generateMatchGuessPuzzle(seed));
    setRevealedCount(1);
    setPhase('playing');
    setScore(0);
    setWrongPicks(0);
    setShakeWrong(false);
  }, []);

  useEffect(() => {
    if (restoredDaily) {
      // Completed daily re-entry: the puzzle is deterministic and the whole end
      // state derives from the recorded score (a win always scores >= 1 and
      // used 12 - score reveals; a loss scores 0 with everything revealed).
      isFirstGame.current = false;
      const dailyScore = useDailyProgressStore.getState().scoresByMode['guessmatch'] ?? 0;
      setPuzzle(generateMatchGuessPuzzle(getModeSeed('guessmatch')));
      setScore(dailyScore);
      setRevealedCount(
        dailyScore > 0 ? Math.min(TOTAL_NAMES, TOTAL_NAMES + 1 - dailyScore) : TOTAL_NAMES,
      );
      setPhase(dailyScore > 0 ? 'won' : 'lost');
      return;
    }
    startGame();
  }, [startGame, restoredDaily]);

  const finish = useCallback((phaseResult: Phase, finalScore: number) => {
    setPhase(phaseResult);
    setScore(finalScore);
    useManagerStore.getState().awardDailyXp('guessmatch', finalScore * 5);
    useDailyProgressStore.getState().markCompleted('guessmatch', finalScore);
    // Losses never set a time PB.
    useSolveTimeStore.getState().markCompleted('guessmatch', {
      countsForBest: phaseResult === 'won',
    });
    if (phaseResult === 'won') playCheer();
    else playCrossbar();
  }, []);

  // Tap haptic fires inside RetroButton's Tappable — no extra impact here.
  const revealNext = useCallback(() => {
    if (phase !== 'playing') return;
    // A reveal is a meaningful first interaction (no-ops after the first).
    useSolveTimeStore.getState().markStarted('guessmatch');
    setRevealedCount((c) => Math.min(TOTAL_NAMES, c + 1));
  }, [phase]);

  const handlePick = useCallback(
    (option: string) => {
      if (phase !== 'playing' || !puzzle) return;

      // Solve-time stopwatch starts on the first pick (no-ops after).
      useSolveTimeStore.getState().markStarted('guessmatch');

      if (option === puzzle.answer) {
        triggerNotification(NotificationFeedbackType.Success);
        finish('won', scoreFor(revealedCount));
        return;
      }

      // Wrong: costs an attempt but does NOT disable the option or reveal a free
      // name — elimination is no longer a free path to the answer. Revealing a
      // name (the paid hint) stays a deliberate, score-lowering choice.
      triggerNotification(NotificationFeedbackType.Error);
      setShakeWrong(true);
      setTimeout(() => setShakeWrong(false), 450);
      const nextWrong = wrongPicks + 1;
      setWrongPicks(nextWrong);
      if (nextWrong >= MAX_WRONG) {
        finish('lost', 0);
      }
    },
    [phase, puzzle, revealedCount, wrongPicks, finish],
  );

  const solveTimeMs = useTodaySolveTime('guessmatch');

  const shareText = puzzle
    ? buildShareText({
        mode: 'guessmatch',
        dailyNumber: getDailyNumber(),
        dailyStreak,
        won: phase === 'won',
        namesRevealed: revealedCount,
        totalNames: TOTAL_NAMES,
        solveTimeMs,
      })
    : '';

  if (!puzzle) {
    return (
      <Screen scroll={false}>
        <Text style={styles.loadingText}>Loading...</Text>
      </Screen>
    );
  }

  if (phase === 'won' || phase === 'lost') {
    return (
      <Screen>
        <ScreenHeader
          eyebrow={`Daily #${getDailyNumber()}`}
          title="Guess the Match"
          modeKey="guessmatch"
          subtitle="Full time"
        />
        <Animated.View entering={FadeIn.duration(motion.base)} style={layoutStyles.resultContainer}>
          <Text style={[layoutStyles.resultTitle, phase === 'won' ? styles.won : styles.lost]}>
            {phase === 'won' ? 'GOT IT!' : 'FULL TIME'}
          </Text>
          <Text style={styles.resultScore}>
            {phase === 'won' ? `+${score} points` : 'No points'}
          </Text>
          {/* Game-over anatomy: verdict → score → rank → time → details. */}
          <RankBadge rank={getRank(score, MAX_SCORE)} unit="pts" />
          <SolveTimeResult mode="guessmatch" />
          <Text style={styles.answerLabel}>{puzzle.answer}</Text>
          {phase === 'won' ? (
            <Text style={styles.resultDetail}>
              Solved after {revealedCount}/{TOTAL_NAMES} names
            </Text>
          ) : (
            <Text style={styles.resultDetail}>Out of guesses</Text>
          )}
          <GameOverActions
            shareRef={shareRef}
            shareText={shareText}
            win={phase === 'won'}
            onPlayAgain={startGame}
            playAgainLabel="PLAY AGAIN"
          />
        </Animated.View>
        {/* Keep the last game-over card (NEXT UP / countdown) scrollable clear of
            the floating tab bar — extra clearance beyond Screen's tab-bar padding. */}
        <View style={layoutStyles.bottomSpacer} />
        <View style={layoutStyles.offscreen}>
          <View ref={shareRef} collapsable={false}>
            <ShareableMatchGuessResult
              won={phase === 'won'}
              namesRevealed={revealedCount}
              totalNames={TOTAL_NAMES}
              matchLabel={puzzle.answer}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        eyebrow={`Daily #${getDailyNumber()}`}
        title="Guess the Match"
        modeKey="guessmatch"
        subtitle={`${puzzle.teamName}'s starting XI`}
        right={
          <View style={layoutStyles.metaPill}>
            <Text style={styles.metaValue}>{scoreFor(revealedCount)}</Text>
            <Text style={styles.metaLabel}>PTS</Text>
          </View>
        }
      />

      <Text style={styles.meta}>
        {revealedCount}/{TOTAL_NAMES} revealed
      </Text>

      <ShakeView shake={shakeWrong}>
        <View style={layoutStyles.lineup}>
          {puzzle.revealOrder.map((name, i) => {
            const revealed = i < revealedCount;
            return (
              // Mount-only stagger (stable keys) — reveals must not re-animate.
              <Animated.View
                key={i}
                entering={i < MAX_ENTRANCE ? FadeIn.delay(i * 40).duration(motion.base) : undefined}
                style={[styles.nameChip, revealed && styles.nameChipRevealed]}>
                <Text style={[styles.nameText, !revealed && styles.nameHidden]} numberOfLines={1}>
                  {revealed ? name : '• • •'}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </ShakeView>

      {revealedCount < TOTAL_NAMES && (
        <View style={layoutStyles.revealButton}>
          <RetroButton title="Reveal next name" onPress={revealNext} variant="secondary" />
        </View>
      )}

      <View style={layoutStyles.promptRow}>
        <Text style={styles.prompt}>Which match is this?</Text>
        <Text style={layoutStyles.attempts}>
          {'❤️'.repeat(MAX_WRONG - wrongPicks) + '🖤'.repeat(wrongPicks)}
        </Text>
      </View>
      <View style={layoutStyles.options}>
        {puzzle.options.map((option, i) => (
          <Animated.View key={option} entering={FadeIn.delay(i * 40).duration(motion.base)}>
            {/* Result haptics fire in handlePick, so no per-tap haptic here. */}
            <Tappable
              haptic="none"
              onPress={() => handlePick(option)}
              hoverStyle={{ backgroundColor: colors.bgCardPressed }}
              style={styles.option}>
              <Text style={styles.optionText}>{option}</Text>
            </Tappable>
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  metaPill: {
    alignItems: 'center',
  },
  lineup: {
    gap: spacing.xs,
    marginVertical: spacing.md,
  },
  revealButton: {
    alignSelf: 'center',
    minWidth: 220,
    marginBottom: spacing.md,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  attempts: {
    ...type.caption,
  },
  options: {
    gap: spacing.sm,
  },
  resultContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultTitle: {
    ...type.display,
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
    metaValue: {
      ...type.scoreLarge,
      color: c.accent,
    },
    metaLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1.5,
    },
    meta: {
      ...type.caption,
      color: c.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    nameChip: {
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      minHeight: 44,
      justifyContent: 'center',
    },
    nameChipRevealed: {
      borderColor: c.accentBorder,
      backgroundColor: c.accentSoft,
    },
    nameText: {
      ...type.bodyBold,
      color: c.textPrimary,
      textAlign: 'center',
    },
    nameHidden: {
      color: c.textMuted,
      letterSpacing: 4,
    },
    prompt: {
      ...type.bodyBold,
      color: c.textPrimary,
      textAlign: 'center',
    },
    option: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.bgCard,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 44,
      justifyContent: 'center',
    },
    optionText: {
      ...type.bodyBold,
      color: c.textPrimary,
      textAlign: 'center',
      // Fast/double clicks on web must not select the option label.
      userSelect: 'none',
    },
    won: { color: c.accent },
    lost: { color: c.danger },
    resultScore: {
      ...type.scoreLarge,
      color: c.textPrimary,
    },
    answerLabel: {
      ...type.h3,
      color: c.textPrimary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    resultDetail: {
      ...type.caption,
      color: c.textSecondary,
    },
  });

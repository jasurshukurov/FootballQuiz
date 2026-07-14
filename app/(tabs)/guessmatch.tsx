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
import LivesIndicator from '@/components/ui/LivesIndicator';
import GiveUpButton from '@/components/career/GiveUpButton';
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
  // The option just picked wrong — briefly flashed red, then cleared. Never
  // disables the option (you can pick it again).
  const [wrongOption, setWrongOption] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
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
    setWrongOption(null);
    setGaveUp(false);
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

      // Wrong: costs an attempt and flashes the tapped option red, but does NOT
      // disable it — you can pick it again. Revealing a name (the paid hint)
      // stays the only deliberate, score-lowering path to the answer.
      triggerNotification(NotificationFeedbackType.Error);
      setShakeWrong(true);
      setWrongOption(option);
      setTimeout(() => {
        setShakeWrong(false);
        setWrongOption(null);
      }, 500);
      const nextWrong = wrongPicks + 1;
      setWrongPicks(nextWrong);
      if (nextWrong >= MAX_WRONG) {
        finish('lost', 0);
      }
    },
    [phase, puzzle, revealedCount, wrongPicks, finish],
  );

  const handleGiveUp = useCallback(() => {
    if (phase !== 'playing') return;
    setGaveUp(true);
    finish('lost', 0);
  }, [phase, finish]);

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
          {/* Game-over anatomy: verdict → score → rank → time → answer reveal. */}
          <RankBadge rank={getRank(score, MAX_SCORE)} unit="pts" />
          <SolveTimeResult mode="guessmatch" />
          {/* Losses get a graceful reveal, never shame. */}
          {phase === 'lost' && <Text style={styles.answerEyebrow}>THE MATCH WAS</Text>}
          <Text style={styles.answerLabel}>{puzzle.answer}</Text>
          {phase === 'won' ? (
            <Text style={styles.resultDetail}>
              Solved after {revealedCount}/{TOTAL_NAMES} names
            </Text>
          ) : (
            <Text style={styles.resultDetail}>
              {gaveUp ? 'You revealed the answer' : 'Out of guesses'}
            </Text>
          )}
          <GameOverActions
            shareRef={shareRef}
            shareText={shareText}
            win={phase === 'won'}
            currentModeKey="guessmatch"
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

  const revealedNames = puzzle.revealOrder.slice(0, revealedCount);
  const hiddenCount = TOTAL_NAMES - revealedCount;

  return (
    <Screen>
      <ScreenHeader
        eyebrow={`Daily #${getDailyNumber()}`}
        title="Guess the Match"
        modeKey="guessmatch"
        subtitle={`${puzzle.teamName}'s starting XI`}
        right={<LivesIndicator total={MAX_WRONG} remaining={MAX_WRONG - wrongPicks} />}
      />

      {/* Consolidated status: how far you have revealed and what a guess is worth
          right now — replaces the old scattered pill + caption + hearts. */}
      <View style={layoutStyles.statusRow}>
        <View style={styles.statusChip}>
          <Text style={styles.statusValue}>
            {revealedCount}/{TOTAL_NAMES}
          </Text>
          <Text style={styles.statusLabel}>REVEALED</Text>
        </View>
        <View style={styles.statusChip}>
          <Text style={[styles.statusValue, styles.statusValueAccent]}>
            {scoreFor(revealedCount)}
          </Text>
          <Text style={styles.statusLabel}>PTS IF YOU GUESS NOW</Text>
        </View>
      </View>

      {/* Revealed names grow as a readable list; the still-hidden players collapse
          into a compact pip row so the match options stay above the fold. */}
      <View style={layoutStyles.lineup}>
        {revealedNames.map((name, i) => (
          <Animated.View
            key={name}
            entering={FadeIn.duration(motion.base)}
            style={[styles.nameChip, i === revealedCount - 1 && styles.nameChipLatest]}>
            <Text style={styles.nameText} numberOfLines={1}>
              {name}
            </Text>
          </Animated.View>
        ))}
        {hiddenCount > 0 && (
          <View style={layoutStyles.hiddenBlock}>
            <View style={layoutStyles.hiddenPips}>
              {Array.from({ length: hiddenCount }, (_, i) => (
                <View key={i} style={styles.hiddenPip} />
              ))}
            </View>
            <Text style={styles.hiddenLabel}>{hiddenCount} still hidden</Text>
          </View>
        )}
      </View>

      {revealedCount < TOTAL_NAMES && (
        <View style={layoutStyles.revealButton}>
          <RetroButton title="Reveal next name" onPress={revealNext} variant="secondary" />
        </View>
      )}

      <Text style={styles.prompt}>Which match is this?</Text>
      <ShakeView shake={shakeWrong}>
        <View style={layoutStyles.options}>
          {puzzle.options.map((option, i) => {
            const isWrong = option === wrongOption;
            return (
              <Animated.View key={option} entering={FadeIn.delay(i * 40).duration(motion.base)}>
                {/* Result haptics fire in handlePick, so no per-tap haptic here. */}
                <Tappable
                  haptic="none"
                  onPress={() => handlePick(option)}
                  testID={`match-option-${i}`}
                  hoverStyle={{ backgroundColor: colors.bgCardPressed }}
                  style={[styles.option, isWrong && styles.optionWrong]}>
                  <Text style={styles.optionText}>{option}</Text>
                </Tappable>
              </Animated.View>
            );
          })}
        </View>
      </ShakeView>

      <View style={layoutStyles.giveUpRow}>
        <GiveUpButton onGiveUp={handleGiveUp} />
      </View>
    </Screen>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  lineup: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  hiddenBlock: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  hiddenPips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  revealButton: {
    alignSelf: 'center',
    minWidth: 220,
    marginBottom: spacing.md,
  },
  options: {
    gap: spacing.sm,
  },
  giveUpRow: {
    alignItems: 'center',
    marginTop: spacing.lg,
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
    statusChip: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    statusValue: {
      ...type.scoreLarge,
      color: c.textPrimary,
    },
    statusValueAccent: {
      color: c.accent,
    },
    statusLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1,
      textAlign: 'center',
    },
    nameChip: {
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.accentSoft,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      minHeight: 44,
      justifyContent: 'center',
    },
    nameChipLatest: {
      borderColor: c.accent,
    },
    nameText: {
      ...type.bodyBold,
      color: c.textPrimary,
      textAlign: 'center',
    },
    hiddenPip: {
      width: 26,
      height: 8,
      borderRadius: borderRadius.sm / 2,
      backgroundColor: c.border,
    },
    hiddenLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1,
    },
    prompt: {
      ...type.bodyBold,
      color: c.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.md,
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
    optionWrong: {
      borderColor: c.danger,
      backgroundColor: c.dangerSoft,
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
    answerEyebrow: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1.5,
      marginTop: spacing.sm,
    },
    answerLabel: {
      ...type.h3,
      color: c.textPrimary,
      textAlign: 'center',
    },
    resultDetail: {
      ...type.caption,
      color: c.textSecondary,
    },
  });

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NotificationFeedbackType } from 'expo-haptics';

import { colors, fonts, spacing, borderRadius, gradients } from '@/constants/theme';
import { triggerImpact, triggerNotification } from '@/lib/haptics';
import { getModeSeed } from '@/lib/dailySeed';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { generateMatchGuessPuzzle, MatchGuessPuzzle } from '@/lib/matchGuessGenerator';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import ShakeView from '@/components/ui/ShakeView';
import GameOverActions from '@/components/ui/GameOverActions';
import TutorialOverlay from '@/components/ui/TutorialOverlay';
import RetroButton from '@/components/ui/RetroButton';
import ShareableMatchGuessResult from '@/components/ShareableMatchGuessResult';
import { buildShareText } from '@/lib/sharing';
import { playCheer, playCrossbar } from '@/lib/sounds';

const TOTAL_NAMES = 11;

type Phase = 'playing' | 'won' | 'lost';

/** score = points for guessing with the fewest names revealed (11 down to 1). */
function scoreFor(revealedCount: number): number {
  return Math.max(1, TOTAL_NAMES + 1 - revealedCount);
}

export default function GuessMatchScreen() {
  const [puzzle, setPuzzle] = useState<MatchGuessPuzzle | null>(null);
  const [revealedCount, setRevealedCount] = useState(1);
  const [phase, setPhase] = useState<Phase>('playing');
  const [score, setScore] = useState(0);
  const [wrongOptions, setWrongOptions] = useState<Set<string>>(new Set());
  const [shakeWrong, setShakeWrong] = useState(false);
  const shareRef = useRef<View>(null);
  const isFirstGame = useRef(true);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);

  const startGame = useCallback(() => {
    const seed = isFirstGame.current ? getModeSeed('guessmatch') : Date.now();
    isFirstGame.current = false;
    setPuzzle(generateMatchGuessPuzzle(seed));
    setRevealedCount(1);
    setPhase('playing');
    setScore(0);
    setWrongOptions(new Set());
    setShakeWrong(false);
  }, []);

  useEffect(() => {
    startGame();
  }, [startGame]);

  const finish = useCallback((phaseResult: Phase, finalScore: number) => {
    setPhase(phaseResult);
    setScore(finalScore);
    useManagerStore.getState().addXp('guessmatch', finalScore * 5);
    useDailyProgressStore.getState().markCompleted('guessmatch', finalScore);
    if (phaseResult === 'won') playCheer();
    else playCrossbar();
  }, []);

  const revealNext = useCallback(() => {
    if (phase !== 'playing') return;
    triggerImpact();
    setRevealedCount((c) => Math.min(TOTAL_NAMES, c + 1));
  }, [phase]);

  const handlePick = useCallback(
    (option: string) => {
      if (phase !== 'playing' || !puzzle) return;

      if (option === puzzle.answer) {
        triggerNotification(NotificationFeedbackType.Success);
        finish('won', scoreFor(revealedCount));
        return;
      }

      // Wrong: disable option, reveal one more name; lose when all are shown.
      triggerNotification(NotificationFeedbackType.Error);
      setShakeWrong(true);
      setTimeout(() => setShakeWrong(false), 450);
      setWrongOptions((prev) => new Set(prev).add(option));

      if (revealedCount >= TOTAL_NAMES) {
        finish('lost', 0);
      } else {
        setRevealedCount((c) => c + 1);
      }
    },
    [phase, puzzle, revealedCount, finish],
  );

  const shareText = puzzle
    ? buildShareText({
        mode: 'guessmatch',
        dailyNumber: getDailyNumber(),
        dailyStreak,
        won: phase === 'won',
        namesRevealed: revealedCount,
        totalNames: TOTAL_NAMES,
      })
    : '';

  if (!puzzle) {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <Text style={styles.loadingText}>Loading...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (phase === 'won' || phase === 'lost') {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.resultContainer}>
            <Text style={[styles.resultTitle, phase === 'won' ? styles.won : styles.lost]}>
              {phase === 'won' ? 'GOT IT!' : 'FULL TIME'}
            </Text>
            <Text style={styles.resultScore}>
              {phase === 'won' ? `+${score} points` : 'No points'}
            </Text>
            <Text style={styles.answerLabel}>{puzzle.answer}</Text>
            <Text style={styles.answerScore}>Final score: {puzzle.score}</Text>
            {phase === 'won' && (
              <Text style={styles.resultDetail}>
                Solved after {revealedCount}/{TOTAL_NAMES} names
              </Text>
            )}
            <GameOverActions
              shareRef={shareRef}
              shareText={shareText}
              win={score >= 7}
              onPlayAgain={startGame}
              playAgainLabel="PLAY AGAIN"
            />
          </View>
          <View style={styles.offscreen}>
            <View ref={shareRef} collapsable={false}>
              <ShareableMatchGuessResult
                won={phase === 'won'}
                namesRevealed={revealedCount}
                totalNames={TOTAL_NAMES}
                matchLabel={puzzle.answer}
              />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>GUESS THE MATCH</Text>
            <Text style={styles.subtitle}>{puzzle.teamName}&apos;s starting XI</Text>
            <Text style={styles.meta}>
              {revealedCount}/{TOTAL_NAMES} revealed · worth {scoreFor(revealedCount)} pts
            </Text>
          </View>

          <ShakeView shake={shakeWrong}>
            <View style={styles.lineup}>
              {puzzle.revealOrder.map((name, i) => {
                const revealed = i < revealedCount;
                return (
                  <View key={i} style={[styles.nameChip, revealed && styles.nameChipRevealed]}>
                    <Text
                      style={[styles.nameText, !revealed && styles.nameHidden]}
                      numberOfLines={1}>
                      {revealed ? name : '• • •'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ShakeView>

          {revealedCount < TOTAL_NAMES && (
            <View style={styles.revealButton}>
              <RetroButton title="Reveal next name" onPress={revealNext} variant="secondary" />
            </View>
          )}

          <Text style={styles.prompt}>Which match is this?</Text>
          <View style={styles.options}>
            {puzzle.options.map((option) => {
              const used = wrongOptions.has(option);
              return (
                <Pressable
                  key={option}
                  style={[styles.option, used && styles.optionWrong]}
                  disabled={used}
                  onPress={() => handlePick(option)}>
                  <Text style={[styles.optionText, used && styles.optionTextWrong]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <TutorialOverlay
          modeKey="guessmatch"
          title="Guess the Match"
          description="A famous match's starting XI is revealed one player at a time — obscure names first, stars last. Name the fixture in as few reveals as you can. Fewer names = more points!"
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: 100 },
  scroll: { paddingBottom: spacing.xl },
  loadingText: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.chalkWhite,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.pitchGreen,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.chalkWhite,
    marginTop: 4,
  },
  meta: {
    fontFamily: fonts.subheading,
    fontSize: 12,
    color: colors.steelGray,
    marginTop: 4,
  },
  lineup: {
    gap: 6,
    marginVertical: spacing.md,
  },
  nameChip: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(17,17,40,0.6)',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  nameChipRevealed: {
    borderColor: 'rgba(5,242,108,0.3)',
    backgroundColor: 'rgba(5,242,108,0.08)',
  },
  nameText: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.chalkWhite,
    textAlign: 'center',
  },
  nameHidden: {
    color: colors.steelGray,
    letterSpacing: 4,
  },
  revealButton: {
    alignSelf: 'center',
    minWidth: 220,
    marginBottom: spacing.md,
  },
  prompt: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.chalkWhite,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(5,242,108,0.3)',
    backgroundColor: 'rgba(17,17,40,0.7)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  optionWrong: {
    borderColor: colors.cardRed,
    backgroundColor: 'rgba(230,57,70,0.12)',
    opacity: 0.6,
  },
  optionText: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.chalkWhite,
    textAlign: 'center',
  },
  optionTextWrong: {
    color: colors.cardRed,
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  resultTitle: {
    fontFamily: fonts.heading,
    fontSize: 40,
  },
  won: { color: colors.pitchGreen },
  lost: { color: colors.cardRed },
  resultScore: {
    fontFamily: fonts.scoreboard,
    fontSize: 22,
    color: colors.chalkWhite,
  },
  answerLabel: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.chalkWhite,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  answerScore: {
    fontFamily: fonts.subheading,
    fontSize: 14,
    color: colors.cardYellow,
  },
  resultDetail: {
    fontFamily: fonts.subheading,
    fontSize: 13,
    color: colors.steelGray,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

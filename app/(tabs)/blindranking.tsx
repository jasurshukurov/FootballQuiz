import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ImpactFeedbackStyle } from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { triggerImpact } from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Player } from '@/types/player';
import { colors, fonts, spacing, gradients } from '@/constants/theme';
import {
  generateBlindRankingPuzzle,
  calculateScore,
  getRevealValue,
  BlindRankingPuzzle,
} from '@/lib/blindRankingGenerator';
import { getModeSeed } from '@/lib/dailySeed';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import ChallengerCard from '@/components/games/ChallengerCard';
import RankSlot from '@/components/games/RankSlot';
import GameOverActions from '@/components/ui/GameOverActions';
import ShareableBlindRankingResult from '@/components/ShareableBlindRankingResult';
import { buildShareText } from '@/lib/sharing';
import { playCheer, playCrossbar } from '@/lib/sounds';
import TutorialOverlay from '@/components/ui/TutorialOverlay';

type Phase = 'placing' | 'revealing' | 'complete';

export default function BlindRankingScreen() {
  const [puzzle, setPuzzle] = useState<BlindRankingPuzzle | null>(null);
  const [slots, setSlots] = useState<(Player | null)[]>([null, null, null, null, null]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('placing');
  const [score, setScore] = useState(0);
  const [correctSlots, setCorrectSlots] = useState<(boolean | undefined)[]>([
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
  ]);
  const shareRef = useRef<View>(null);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);

  const isFirstGame = useRef(true);

  const shareText = useMemo(
    () =>
      puzzle
        ? buildShareText({
            mode: 'blindranking',
            dailyNumber: getDailyNumber(),
            dailyStreak,
            score,
            total: 5,
            categoryTitle: puzzle.category.title,
          })
        : '',
    [puzzle, dailyStreak, score],
  );

  const startGame = useCallback(() => {
    const seed = isFirstGame.current ? getModeSeed('blindranking') : Date.now();
    isFirstGame.current = false;
    const p = generateBlindRankingPuzzle(seed);
    setPuzzle(p);
    setSlots([null, null, null, null, null]);
    setCurrentIdx(0);
    setPhase('placing');
    setScore(0);
    setCorrectSlots([undefined, undefined, undefined, undefined, undefined]);
  }, []);

  useEffect(() => {
    startGame();
  }, [startGame]);

  const handleSlotPress = useCallback(
    (slotIndex: number) => {
      if (phase !== 'placing' || !puzzle || currentIdx >= puzzle.players.length) return;
      if (slots[slotIndex] !== null) return;

      triggerImpact(ImpactFeedbackStyle.Medium);

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
          const finalScore = calculateScore(userRanking, puzzle.correctOrder);
          setScore(finalScore);
          setPhase('revealing');

          // Staggered reveal
          const results = newSlots.map((p, i) => p!.id === puzzle.correctOrder[i]);
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              setCorrectSlots((prev) => {
                const next = [...prev];
                next[i] = results[i];
                return next;
              });

              if (i === 4) {
                // All revealed
                setTimeout(() => {
                  setPhase('complete');
                  if (finalScore >= 4) {
                    playCheer();
                  } else {
                    playCrossbar();
                  }
                  useManagerStore.getState().addXp('blindranking', finalScore * 20);
                  useDailyProgressStore.getState().markCompleted('blindranking', finalScore);
                }, 400);
              }
            }, i * 400);
          }
        }, 500);
      }
    },
    [phase, puzzle, currentIdx, slots],
  );

  if (!puzzle) {
    return (
      <LinearGradient
        colors={gradients.screenBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <Text style={styles.loadingText}>Loading...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (phase === 'complete') {
    return (
      <LinearGradient
        colors={gradients.screenBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.resultContainer}>
            <Text style={styles.resultTitle}>
              {score >= 4 ? 'BRILLIANT!' : score >= 2 ? 'NICE TRY!' : 'TOUGH LUCK!'}
            </Text>
            <Text style={styles.scoreText}>{score}/5 Correct</Text>
            <Text style={styles.categoryText}>{puzzle.category.title}</Text>

            {/* Show correct order */}
            <View style={styles.correctOrderSection}>
              <Text style={styles.correctOrderTitle}>CORRECT ORDER</Text>
              {puzzle.correctOrder.map((id, i) => {
                const player = puzzle.players.find((p) => p.id === id)!;
                const value = getRevealValue(player, puzzle.category);
                return (
                  <View key={id} style={styles.correctRow}>
                    <Text style={styles.correctRank}>#{i + 1}</Text>
                    <Text style={styles.correctName} numberOfLines={1}>
                      {player.name}
                    </Text>
                    <Text style={styles.correctValue}>{value}</Text>
                  </View>
                );
              })}
            </View>

            <GameOverActions
              shareRef={shareRef}
              shareText={shareText}
              win={score >= 4}
              onPlayAgain={startGame}
            />
          </ScrollView>

          {/* Offscreen shareable view */}
          <View style={styles.offscreen}>
            <View ref={shareRef} collapsable={false}>
              <ShareableBlindRankingResult score={score} categoryTitle={puzzle.category.title} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const currentPlayer = currentIdx < 5 ? puzzle.players[currentIdx] : null;

  return (
    <LinearGradient
      colors={gradients.screenBg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>BLIND RANKING</Text>
            <Text style={styles.headerDesc}>{puzzle.category.description}</Text>
          </View>

          {/* Progress */}
          <Text style={styles.progress}>
            {phase === 'placing' ? `Player ${Math.min(currentIdx + 1, 5)} of 5` : `Revealing...`}
          </Text>

          {/* Current player card */}
          {currentPlayer && phase === 'placing' && (
            <ChallengerCard
              player={currentPlayer}
              visible={true}
              categoryTitle={puzzle.category.title}
            />
          )}

          {/* Rank slots */}
          <View style={styles.slotsContainer}>
            <Text style={styles.slotsLabel}>
              {phase === 'placing' ? 'PLACE IN RANK' : 'YOUR RANKING'}
            </Text>
            {slots.map((player, i) => (
              <RankSlot
                key={i}
                rank={i + 1}
                player={player}
                onPress={() => handleSlotPress(i)}
                disabled={phase !== 'placing' || player !== null}
                isRevealing={phase === 'revealing'}
                isCorrect={correctSlots[i]}
              />
            ))}
          </View>
        </ScrollView>
        <TutorialOverlay
          modeKey="blindranking"
          title="Blind Ranking"
          description="Place 5 players in the correct order based on the category shown. Tap a slot to place!"
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingBottom: 100,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingText: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.chalkWhite,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.pitchGreen,
    letterSpacing: 3,
  },
  headerDesc: {
    fontFamily: fonts.subheading,
    fontSize: 14,
    color: colors.steelGray,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  progress: {
    fontFamily: fonts.scoreboard,
    fontSize: 16,
    color: colors.chalkWhite,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  slotsContainer: {
    marginTop: spacing.lg,
  },
  slotsLabel: {
    fontFamily: fonts.subheading,
    fontSize: 12,
    color: colors.steelGray,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  resultTitle: {
    fontFamily: fonts.heading,
    fontSize: 36,
    color: colors.pitchGreen,
  },
  scoreText: {
    fontFamily: fonts.scoreboard,
    fontSize: 32,
    color: colors.chalkWhite,
  },
  categoryText: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.steelGray,
  },
  correctOrderSection: {
    width: '100%',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  correctOrderTitle: {
    fontFamily: fonts.subheading,
    fontSize: 12,
    color: colors.steelGray,
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
    borderBottomColor: 'rgba(108,117,125,0.15)',
  },
  correctRank: {
    fontFamily: fonts.scoreboard,
    fontSize: 14,
    color: colors.pitchGreen,
    width: 32,
  },
  correctName: {
    flex: 1,
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.chalkWhite,
  },
  correctValue: {
    fontFamily: fonts.scoreboard,
    fontSize: 14,
    color: colors.pitchGreen,
  },
  buttonGroup: {
    marginTop: spacing.xl,
    gap: spacing.lg,
    minWidth: 200,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

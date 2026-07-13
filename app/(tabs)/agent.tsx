import React, { useCallback, useMemo, useState, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { triggerImpact, triggerNotification } from '@/lib/haptics';

import { colors, fonts, spacing } from '@/constants/theme';
import { generateDailyAgentGame, AgentRound } from '@/lib/agentGameGenerator';
import { getModeSeed } from '@/lib/dailySeed';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import TransferCard from '@/components/games/TransferCard';
import GlassCard from '@/components/ui/GlassCard';
import PopInView from '@/components/ui/PopInView';
import GameOverActions from '@/components/ui/GameOverActions';
import GameOverExtras from '@/components/ui/GameOverExtras';
import { useManagerStore } from '@/hooks/useManagerStore';
import { playCheer } from '@/lib/sounds';
import ShareableAgentResult from '@/components/ShareableAgentResult';
import { buildShareText } from '@/lib/sharing';
import TutorialOverlay from '@/components/ui/TutorialOverlay';

const MAX_HINTS = 3;

type RoundResult = {
  round: AgentRound;
  selectedId: number;
  correct: boolean;
};

export default function AgentScreen() {
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(MAX_HINTS);
  const [gameKey, setGameKey] = useState(() => String(getModeSeed('agent')));
  const shareRef = useRef<View>(null);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);

  const rounds = useMemo(() => generateDailyAgentGame(gameKey), [gameKey]);

  const round = rounds[currentRound] ?? null;
  const totalRounds = rounds.length;

  const shareText = useMemo(
    () =>
      buildShareText({
        mode: 'agent',
        dailyNumber: getDailyNumber(),
        dailyStreak,
        score,
        totalRounds,
        results: results.map((r) => r.correct),
      }),
    [dailyStreak, score, totalRounds, results],
  );

  const handleSelect = useCallback(
    (playerId: number) => {
      if (answered || !round) return;

      setSelectedId(playerId);
      setAnswered(true);

      const isCorrect = playerId === round.correctPlayerId;
      if (isCorrect) {
        setScore((s) => s + 1);
        triggerNotification(NotificationFeedbackType.Success);
      } else {
        triggerNotification(NotificationFeedbackType.Error);
      }

      setResults((prev) => [...prev, { round, selectedId: playerId, correct: isCorrect }]);

      // Auto-advance after delay — reset hint for next round
      setTimeout(() => {
        setHintUsed(false);
        if (currentRound + 1 >= totalRounds) {
          const finalScore = isCorrect ? score + 1 : score;
          useManagerStore.getState().addXp('agent', finalScore * 15);
          setGameOver(true);
          if (finalScore >= 7) {
            playCheer();
          }
          useDailyProgressStore.getState().markCompleted('agent', finalScore);
        } else {
          setCurrentRound((r) => r + 1);
          setSelectedId(null);
          setAnswered(false);
        }
      }, 1500);
    },
    [answered, round, currentRound, totalRounds],
  );

  const handleHint = useCallback(() => {
    if (hintUsed || answered || hintsRemaining <= 0 || !round) return;
    setHintUsed(true);
    setHintsRemaining((h) => h - 1);
    triggerImpact(ImpactFeedbackStyle.Light);
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
  }, []);

  if (rounds.length === 0) {
    return (
      <LinearGradient
        colors={['#0D1B2A', '#1B0A2E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No transfer data available</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (gameOver) {
    return (
      <LinearGradient
        colors={['#0D1B2A', '#1B0A2E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          {/* All 10 result rows + actions overflow a fixed View on phone
              heights, hiding PLAY AGAIN behind the tab bar — must scroll. */}
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.gameOverScroll}
            showsVerticalScrollIndicator={false}>
            <PopInView>
              <View style={styles.gameOverContainer}>
                <Text style={styles.gameOverTitle}>FULL TIME</Text>
                <Text style={styles.scoreDisplay}>
                  {score}/{totalRounds}
                </Text>
                <Text style={styles.scoreLabel}>
                  {score === totalRounds
                    ? 'Perfect deal-making!'
                    : score >= 7
                      ? 'Top agent!'
                      : score >= 4
                        ? 'Decent scout.'
                        : 'Back to the academy.'}
                </Text>

                <View style={styles.resultsList}>
                  {results.map((r, i) => (
                    <View key={i} style={styles.resultRow}>
                      <Text
                        style={[
                          styles.resultDot,
                          { color: r.correct ? colors.pitchGreen : colors.cardRed },
                        ]}>
                        {r.correct ? '\u2713' : '\u2717'}
                      </Text>
                      <Text style={styles.resultText} numberOfLines={2}>
                        {r.round.targetFee} — {r.round.correctPlayerName}
                      </Text>
                    </View>
                  ))}
                </View>

                <GameOverActions
                  shareRef={shareRef}
                  shareText={shareText}
                  win={score >= Math.ceil(totalRounds * 0.6)}
                  onPlayAgain={handlePlayAgain}
                  includeExtras={false}
                />
              </View>
            </PopInView>
            <GameOverExtras win={score >= Math.ceil(totalRounds * 0.6)} />
            {/* Offscreen shareable view */}
            <View style={styles.offscreen}>
              <View ref={shareRef} collapsable={false}>
                <ShareableAgentResult score={score} totalRounds={totalRounds} results={results} />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!round) return null;

  const formatFee = (fee: string): string => {
    return fee.toUpperCase();
  };

  return (
    <LinearGradient
      colors={['#0D1B2A', '#1B0A2E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.roundText}>
              Round {currentRound + 1}/{totalRounds}
            </Text>
            <Text style={styles.scoreText}>
              Score: {score}/{totalRounds}
            </Text>
          </View>

          {/* Fee Display */}
          <View style={styles.feeCard}>
            <View style={styles.feeInner}>
              <Text style={styles.feeAmount}>{formatFee(round.targetFee)}</Text>
              <Text style={styles.feeSubtitle}>Which player was transferred for this fee?</Text>
            </View>
          </View>

          {/* Hint: transfer direction */}
          {hintUsed && !answered && (
            <PopInView>
              <View style={styles.hintCard}>
                <FontAwesome name="exchange" size={14} color={colors.cardYellow} />
                <Text style={styles.hintText}>
                  {round.correctClubFrom} {'\u2192'} {round.correctClubTo}
                </Text>
              </View>
            </PopInView>
          )}

          {/* Options */}
          <View style={styles.optionsList}>
            {round.options.map((option) => {
              const isCorrectOption = option.playerId === round.correctPlayerId;
              const isSelected = selectedId === option.playerId;
              const showCorrect = answered && isCorrectOption;
              const showWrong = answered && isSelected && !isCorrectOption;

              return (
                <View key={option.playerId} style={styles.optionItem}>
                  <TransferCard
                    playerName={option.playerName}
                    selected={isSelected}
                    correct={showCorrect}
                    wrong={showWrong}
                    onPress={() => handleSelect(option.playerId)}
                    disabled={answered}
                  />
                </View>
              );
            })}
          </View>

          {/* Hint button */}
          {!answered && !hintUsed && (
            <Pressable
              onPress={handleHint}
              disabled={hintsRemaining <= 0}
              style={({ pressed }) => [
                styles.hintButton,
                pressed && styles.hintButtonPressed,
                hintsRemaining <= 0 && styles.hintButtonDisabled,
              ]}>
              <FontAwesome
                name="lightbulb-o"
                size={16}
                color={hintsRemaining > 0 ? colors.cardYellow : colors.steelGray}
              />
              <Text
                style={[
                  styles.hintButtonText,
                  hintsRemaining <= 0 && styles.hintButtonTextDisabled,
                ]}>
                Show Transfer ({hintsRemaining}/{MAX_HINTS})
              </Text>
            </Pressable>
          )}

          {/* Transfer detail reveal */}
          {answered && (
            <PopInView delay={200}>
              <GlassCard style={styles.revealCard}>
                <View style={styles.revealInner}>
                  <Text style={styles.revealText}>
                    {round.correctClubFrom} {'\u2192'} {round.correctClubTo}
                  </Text>
                </View>
              </GlassCard>
            </PopInView>
          )}
          <TutorialOverlay
            modeKey="agent"
            title="Transfer Agent"
            description="Match the transfer fee to the correct player. Test your transfer market knowledge!"
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 100,
  },
  gameOverScroll: {
    paddingBottom: 120,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.steelGray,
    fontSize: 16,
    fontFamily: fonts.subheading,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  roundText: {
    fontSize: 14,
    fontFamily: fonts.scoreboard,
    color: colors.steelGray,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  scoreText: {
    fontSize: 14,
    fontFamily: fonts.scoreboard,
    color: colors.pitchGreen,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  feeCard: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  feeInner: {
    paddingVertical: 28,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  feeAmount: {
    fontSize: 64,
    fontFamily: fonts.scoreboard,
    color: colors.pitchGreen,
    letterSpacing: 2,
    textShadowColor: 'rgba(5,242,108,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  feeSubtitle: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: colors.steelGray,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(244,162,97,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244,162,97,0.3)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: spacing.md,
  },
  hintText: {
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: colors.cardYellow,
    letterSpacing: 0.5,
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(244,162,97,0.3)',
    backgroundColor: 'rgba(244,162,97,0.08)',
  },
  hintButtonPressed: {
    opacity: 0.6,
  },
  hintButtonDisabled: {
    opacity: 0.3,
  },
  hintButtonText: {
    fontSize: 13,
    fontFamily: fonts.subheading,
    color: colors.cardYellow,
    letterSpacing: 0.5,
  },
  hintButtonTextDisabled: {
    color: colors.steelGray,
  },
  optionsList: {
    gap: spacing.lg,
  },
  optionItem: {
    // wrapper for each card
  },
  revealCard: {
    marginTop: spacing.lg,
  },
  revealInner: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  revealText: {
    fontSize: 16,
    fontFamily: fonts.subheading,
    color: colors.chalkWhite,
    letterSpacing: 1,
  },
  gameOverContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  gameOverTitle: {
    fontSize: 36,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: spacing.lg,
  },
  scoreDisplay: {
    fontSize: 72,
    fontFamily: fonts.scoreboard,
    color: colors.pitchGreen,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(5,242,108,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  scoreLabel: {
    fontSize: 18,
    fontFamily: fonts.subheading,
    color: colors.steelGray,
    marginBottom: spacing.xxl,
  },
  resultsList: {
    width: '100%',
    marginBottom: spacing.xxl,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: spacing.sm,
  },
  resultDot: {
    fontSize: 16,
    fontFamily: fonts.heading,
    width: 20,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.scoreboard,
    color: colors.chalkWhite,
  },
  gameOverButtons: {
    gap: spacing.sm,
    width: '100%',
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

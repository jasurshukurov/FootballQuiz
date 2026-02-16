import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { colors, fonts, spacing } from '@/constants/theme';
import { generateDailyBadgeGame, BadgeRound } from '@/lib/badgeGameGenerator';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import PixelatedBadge from '@/components/games/PixelatedBadge';
import GlassCard from '@/components/ui/GlassCard';
import RetroButton from '@/components/ui/RetroButton';
import PopInView from '@/components/ui/PopInView';
import ShakeView from '@/components/ui/ShakeView';
import { useManagerStore } from '@/hooks/useManagerStore';
import { playCheer } from '@/lib/sounds';
import ShareableBadgeResult from '@/components/ShareableBadgeResult';
import { captureAndShare } from '@/lib/sharing';

type GamePhase = 'playing' | 'revealed' | 'finished';

export default function BadgeScreen() {
  const [gameKey, setGameKey] = useState(Date.now());

  const rounds = useMemo(() => {
    return generateDailyBadgeGame(String(gameKey));
  }, [gameKey]);

  const [currentRound, setCurrentRound] = useState(0);
  const [pixelLevel, setPixelLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [shakingOption, setShakingOption] = useState<string | null>(null);
  const shareRef = useRef<View>(null);
  const [disabledOptions, setDisabledOptions] = useState<Set<string>>(new Set());

  const round: BadgeRound | undefined = rounds[currentRound];

  useEffect(() => {
    setPixelLevel(1);
    setPhase(currentRound >= 5 ? 'finished' : 'playing');
    setShakingOption(null);
    setDisabledOptions(new Set());
  }, [currentRound]);

  const handleGuess = useCallback(
    (team: string) => {
      if (!round || phase !== 'playing') return;

      if (team === round.correctTeam) {
        const points = 6 - pixelLevel; // 5 pts at level 1, 1 pt at level 5
        setScore((s) => s + points);
        setPixelLevel(5);
        setPhase('revealed');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setShakingOption(team);
        setDisabledOptions((prev) => new Set(prev).add(team));
        setTimeout(() => setShakingOption(null), 500);

        if (pixelLevel >= 4) {
          // Max wrong guesses reached, reveal
          setPixelLevel(5);
          setPhase('revealed');
        } else {
          setPixelLevel((l) => l + 1);
        }
      }
    },
    [round, phase, pixelLevel],
  );

  const handleNext = useCallback(() => {
    setCurrentRound((r) => r + 1);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setGameKey(Date.now());
    setCurrentRound(0);
    setScore(0);
  }, []);

  useEffect(() => {
    if (phase === 'finished' || currentRound >= 5) {
      useManagerStore.getState().addXp('badge', score * 5);
      useDailyProgressStore.getState().markCompleted('badge', score);
      if (score >= 20) {
        playCheer();
      }
    }
  }, [phase, currentRound, score]);

  if (phase === 'finished' || currentRound >= 5) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.container}>
          <Text style={styles.title}>GUESS THE BADGE</Text>
          <PopInView>
            <GlassCard style={styles.resultCard}>
              <Text style={styles.resultTitle}>GAME OVER</Text>
              <Text style={styles.scoreTextLarge}>{score} / 25</Text>
              <Text style={styles.resultSub}>
                {score >= 20 ? 'Badge expert!' : score >= 10 ? 'Good eye!' : 'Keep practising!'}
              </Text>
              <View style={styles.playAgainButton}>
                <RetroButton title="Share Result" onPress={() => captureAndShare(shareRef)} />
              </View>
              <View style={styles.playAgainButton}>
                <RetroButton title="Play Again" onPress={handlePlayAgain} />
              </View>
            </GlassCard>
          </PopInView>
          {/* Offscreen shareable view */}
          <View style={styles.offscreen}>
            <View ref={shareRef} collapsable={false}>
              <ShareableBadgeResult score={score} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>GUESS THE BADGE</Text>

        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Round {currentRound + 1}/5</Text>
          <Text style={styles.statusText}>Score: {score}/25</Text>
        </View>

        <View style={styles.badgeContainer}>
          <GlassCard style={styles.badgeCard}>
            {phase === 'revealed' ? (
              <PopInView>
                <PixelatedBadge teamName={round.correctTeam} pixelLevel={5} size={180} />
              </PopInView>
            ) : (
              <PixelatedBadge teamName={round.correctTeam} pixelLevel={pixelLevel} size={180} />
            )}
          </GlassCard>
        </View>

        {phase === 'revealed' && (
          <View style={styles.revealedInfo}>
            <Text style={styles.teamNameText}>{round.correctTeam}</Text>
            <View style={styles.nextButton}>
              <RetroButton
                title={currentRound < 4 ? 'Next Round' : 'See Results'}
                onPress={handleNext}
              />
            </View>
          </View>
        )}

        {phase === 'playing' && (
          <View style={styles.optionsGrid}>
            {round.options.map((team) => {
              const isDisabled = disabledOptions.has(team);
              const isShaking = shakingOption === team;

              return (
                <ShakeView key={team} shake={isShaking}>
                  <View style={styles.optionButton}>
                    <RetroButton
                      title={team}
                      onPress={() => handleGuess(team)}
                      variant="secondary"
                      disabled={isDisabled}
                    />
                  </View>
                </ShakeView>
              );
            })}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.retroBlack,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statusText: {
    fontSize: 16,
    fontFamily: fonts.subheading,
    color: colors.chalkWhite,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  badgeCard: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsGrid: {
    gap: spacing.sm,
  },
  optionButton: {
    marginBottom: spacing.xs,
  },
  revealedInfo: {
    alignItems: 'center',
    gap: spacing.md,
  },
  teamNameText: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.floodlightWhite,
    textAlign: 'center',
  },
  nextButton: {
    marginTop: spacing.sm,
  },
  resultCard: {
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: 40,
  },
  resultTitle: {
    fontSize: 32,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    marginBottom: spacing.md,
  },
  scoreTextLarge: {
    fontSize: 48,
    fontFamily: fonts.heading,
    color: colors.floodlightWhite,
    marginBottom: spacing.md,
  },
  resultSub: {
    fontSize: 18,
    fontFamily: fonts.subheading,
    color: colors.chalkWhite,
    marginBottom: spacing.xl,
  },
  playAgainButton: {
    marginTop: spacing.md,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

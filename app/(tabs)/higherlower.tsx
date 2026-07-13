import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { NotificationFeedbackType } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { triggerNotification } from '@/lib/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Player } from '@/types/player';
import { colors, fonts, spacing, borderRadius, shadows, gradients } from '@/constants/theme';
import {
  generatePlayerQueue,
  formatMarketValue,
  getPlayerDifficulty,
} from '@/lib/higherLowerGenerator';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { getModeSeed } from '@/lib/dailySeed';
import StatCard from '@/components/games/StatCard';
import GameOverActions from '@/components/ui/GameOverActions';
import ShakeView from '@/components/ui/ShakeView';
import { useManagerStore } from '@/hooks/useManagerStore';
import ShareableHigherLowerResult from '@/components/ShareableHigherLowerResult';
import { buildShareText } from '@/lib/sharing';
import { playCrossbar } from '@/lib/sounds';
import TutorialOverlay from '@/components/ui/TutorialOverlay';

const HIGH_SCORE_KEY = '@higherlower_highscore';
const QUEUE_SIZE = 100;

type GameState = 'playing' | 'revealing' | 'sliding' | 'gameover';

export default function HigherLowerScreen() {
  const [queue, setQueue] = useState<Player[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [showChallengerValue, setShowChallengerValue] = useState(false);
  const [shakeWrong, setShakeWrong] = useState(false);
  const seedRef = useRef(Date.now());
  const isFirstGame = useRef(true);
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
    slideX.value = 0;
    challengerOpacity.value = 1;
  }, [slideX, challengerOpacity]);

  useEffect(() => {
    startGame();
  }, [startGame]);

  // Animate challenger entrance on index change
  useEffect(() => {
    if (currentIndex > 0) {
      challengerOpacity.value = 0;
      challengerOpacity.value = withTiming(1, { duration: 250 });
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
    slideX.value = 0;
    setGameState('playing');

    // If running low on queue, extend it
    if (currentIndex + 3 >= queue.length) {
      const morePlayers = generatePlayerQueue(Date.now(), QUEUE_SIZE);
      setQueue((prev) => [...prev, ...morePlayers]);
    }
  }, [currentIndex, queue.length, slideX]);

  const handleGuess = useCallback(
    (guess: 'higher' | 'lower') => {
      if (gameState !== 'playing' || !currentPlayer || !challengerPlayer) return;

      setGameState('revealing');
      setShowChallengerValue(true);

      const currentVal = currentPlayer.market_value;
      const challengerVal = challengerPlayer.market_value;

      const isCorrect =
        (guess === 'higher' && challengerVal >= currentVal) ||
        (guess === 'lower' && challengerVal <= currentVal);

      if (isCorrect) {
        triggerNotification(NotificationFeedbackType.Success);
        const newStreak = streak + 1;
        setStreak(newStreak);
        saveHighScore(newStreak);

        // After a brief delay, slide transition
        setTimeout(() => {
          setGameState('sliding');
          slideX.value = withTiming(-screenWidth, { duration: 300 }, (finished) => {
            if (finished) {
              runOnJS(finishSlide)();
            }
          });
        }, 1000);
      } else {
        triggerNotification(NotificationFeedbackType.Error);
        setShakeWrong(true);
        saveHighScore(streak);
        useManagerStore.getState().addXp('higher-lower', streak * 10);
        useDailyProgressStore.getState().markCompleted('higherlower', streak);
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

  const shareText = useMemo(
    () =>
      buildShareText({
        mode: 'higherlower',
        dailyNumber: getDailyNumber(),
        dailyStreak,
        streak,
      }),
    [dailyStreak, streak],
  );

  if (!currentPlayer || !challengerPlayer) {
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

  if (gameState === 'gameover') {
    return (
      <LinearGradient
        colors={gradients.screenBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.gameOverContainer}>
            <Text style={styles.gameOverTitle}>GAME OVER</Text>
            <Text style={styles.gameOverStreak}>Streak: {streak}</Text>
            <Text style={styles.gameOverHighScore}>High Score: {highScore}</Text>
            <View style={styles.gameOverDetails}>
              <Text style={styles.gameOverDetail}>
                {currentPlayer.name}: {formatMarketValue(currentPlayer.market_value)}
              </Text>
              <Text style={styles.gameOverDetail}>
                {challengerPlayer.name}: {formatMarketValue(challengerPlayer.market_value)}
              </Text>
            </View>
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
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={gradients.screenBg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.streakText}>Streak: {streak}</Text>
          <Text style={styles.highScoreText}>Best: {highScore}</Text>
        </View>

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

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <Pressable
            style={[
              styles.bigButton,
              styles.higherButton,
              gameState !== 'playing' && styles.bigButtonDisabled,
            ]}
            onPress={() => handleGuess('higher')}
            disabled={gameState !== 'playing'}>
            <Text style={styles.higherArrow}>{'\u2191'}</Text>
            <Text style={styles.higherText}>HIGHER</Text>
          </Pressable>
          <Pressable
            style={[
              styles.bigButton,
              styles.lowerButton,
              gameState !== 'playing' && styles.bigButtonDisabled,
            ]}
            onPress={() => handleGuess('lower')}
            disabled={gameState !== 'playing'}>
            <Text style={styles.lowerArrow}>{'\u2193'}</Text>
            <Text style={styles.lowerText}>LOWER</Text>
          </Pressable>
        </View>
        <TutorialOverlay
          modeKey="higherlower"
          title="Higher or Lower"
          description="Is the next player worth more or less? Build the longest streak you can!"
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
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  loadingText: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.chalkWhite,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  streakText: {
    fontFamily: fonts.scoreboard,
    fontSize: 28,
    color: colors.pitchGreen,
  },
  highScoreText: {
    fontFamily: fonts.scoreboard,
    fontSize: 18,
    color: colors.steelGray,
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
    fontFamily: fonts.subheading,
    fontSize: 12,
    color: colors.steelGray,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  vsContainer: {
    paddingHorizontal: spacing.sm,
  },
  vsPill: {
    backgroundColor: 'rgba(5,242,108,0.15)',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(5,242,108,0.3)',
    marginTop: spacing.xl,
  },
  vsText: {
    fontFamily: fonts.heading,
    fontSize: 36,
    color: colors.chalkWhite,
    textShadowColor: 'rgba(5,242,108,0.6)',
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
    gap: 12,
    ...shadows.cardShadow,
  },
  higherButton: {
    backgroundColor: colors.pitchGreen,
  },
  lowerButton: {
    backgroundColor: colors.cardRed,
  },
  bigButtonDisabled: {
    opacity: 0.4,
  },
  higherArrow: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.retroBlack,
  },
  higherText: {
    fontSize: 22,
    fontFamily: fonts.heading,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.retroBlack,
  },
  lowerArrow: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
  },
  lowerText: {
    fontSize: 22,
    fontFamily: fonts.heading,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.chalkWhite,
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  gameOverTitle: {
    fontFamily: fonts.heading,
    fontSize: 40,
    color: colors.cardRed,
  },
  gameOverStreak: {
    fontFamily: fonts.scoreboard,
    fontSize: 32,
    color: colors.chalkWhite,
    shadowColor: '#05F26C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  gameOverHighScore: {
    fontFamily: fonts.scoreboard,
    fontSize: 20,
    color: colors.pitchGreen,
  },
  gameOverDetails: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  gameOverDetail: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.steelGray,
    textAlign: 'center',
  },
  playAgainButton: {
    marginTop: spacing.xl,
    minWidth: 200,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

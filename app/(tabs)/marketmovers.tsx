import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NotificationFeedbackType } from 'expo-haptics';

import { colors, fonts, spacing, borderRadius, shadows, gradients } from '@/constants/theme';
import { triggerNotification } from '@/lib/haptics';
import { getModeSeed } from '@/lib/dailySeed';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { generateFeeQueue, FeeTransfer } from '@/lib/feeHigherLowerGenerator';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import ShakeView from '@/components/ui/ShakeView';
import GameOverActions from '@/components/ui/GameOverActions';
import TutorialOverlay from '@/components/ui/TutorialOverlay';
import ShareableMarketMoversResult from '@/components/ShareableMarketMoversResult';
import { buildShareText } from '@/lib/sharing';
import { playCrossbar } from '@/lib/sounds';

const QUEUE_SIZE = 100;

type GameState = 'playing' | 'revealing' | 'gameover';

function TransferInfo({ transfer, showFee }: { transfer: FeeTransfer; showFee: boolean }) {
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
  const [queue, setQueue] = useState<FeeTransfer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gameState, setGameState] = useState<GameState>('playing');
  const [showChallengerFee, setShowChallengerFee] = useState(false);
  const [shakeWrong, setShakeWrong] = useState(false);
  const shareRef = useRef<View>(null);
  const isFirstGame = useRef(true);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);

  const current = queue[currentIndex];
  const challenger = queue[currentIndex + 1];

  const startGame = useCallback(() => {
    const seed = isFirstGame.current ? getModeSeed('marketmovers') : Date.now();
    isFirstGame.current = false;
    setQueue(generateFeeQueue(seed, QUEUE_SIZE));
    setCurrentIndex(0);
    setStreak(0);
    setGameState('playing');
    setShowChallengerFee(false);
    setShakeWrong(false);
  }, []);

  useEffect(() => {
    startGame();
  }, [startGame]);

  const endGame = useCallback((finalStreak: number) => {
    useManagerStore.getState().addXp('marketmovers', finalStreak * 10);
    useDailyProgressStore.getState().markCompleted('marketmovers', finalStreak);
  }, []);

  const handleGuess = useCallback(
    (guess: 'higher' | 'lower') => {
      if (gameState !== 'playing' || !current || !challenger) return;

      setGameState('revealing');
      setShowChallengerFee(true);

      const isCorrect =
        (guess === 'higher' && challenger.fee >= current.fee) ||
        (guess === 'lower' && challenger.fee <= current.fee);

      if (isCorrect) {
        triggerNotification(NotificationFeedbackType.Success);
        const newStreak = streak + 1;
        setStreak(newStreak);
        setTimeout(() => {
          // Extend the queue if we're running low, continuing the difficulty
          // ramp from the current position (don't reset to easy mid-run).
          setQueue((prev) => {
            if (currentIndex + 3 >= prev.length) {
              return [...prev, ...generateFeeQueue(Date.now(), QUEUE_SIZE, prev.length)];
            }
            return prev;
          });
          setCurrentIndex((i) => i + 1);
          setShowChallengerFee(false);
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
    [gameState, current, challenger, streak, currentIndex, endGame],
  );

  const shareText = buildShareText({
    mode: 'marketmovers',
    dailyNumber: getDailyNumber(),
    dailyStreak,
    streak,
  });

  if (!current || !challenger) {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <Text style={styles.loadingText}>Loading...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (gameState === 'gameover') {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.gameOverContainer}>
            <Text style={styles.gameOverTitle}>FULL TIME</Text>
            <Text style={styles.gameOverStreak}>Streak: {streak}</Text>
            <Text style={styles.gameOverDetail}>
              {challenger.playerName}: {challenger.feeDisplay}
            </Text>
            <GameOverActions
              shareRef={shareRef}
              shareText={shareText}
              win={streak >= 10}
              onPlayAgain={startGame}
              playAgainLabel="PLAY AGAIN"
            />
          </View>
          <View style={styles.offscreen}>
            <View ref={shareRef} collapsable={false}>
              <ShareableMarketMoversResult streak={streak} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>MARKET MOVERS</Text>
          <Text style={styles.streakText}>Streak: {streak}</Text>
        </View>

        <ShakeView shake={shakeWrong}>
          <View style={styles.cardsRow}>
            <View style={styles.cardWrapper}>
              <Text style={styles.cardLabel}>TRANSFER FEE</Text>
              <TransferInfo transfer={current} showFee />
            </View>
            <View style={styles.vsPill}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            <View style={styles.cardWrapper}>
              <Text style={styles.cardLabel}>FEE?</Text>
              <TransferInfo transfer={challenger} showFee={showChallengerFee} />
            </View>
          </View>
        </ShakeView>

        <Text style={styles.prompt}>Was the second fee higher or lower?</Text>

        <View style={styles.buttonsRow}>
          <Pressable
            style={[
              styles.bigButton,
              styles.higherButton,
              gameState !== 'playing' && styles.disabled,
            ]}
            onPress={() => handleGuess('higher')}
            disabled={gameState !== 'playing'}>
            <Text style={styles.higherArrow}>{'↑'}</Text>
            <Text style={styles.higherText}>HIGHER</Text>
          </Pressable>
          <Pressable
            style={[
              styles.bigButton,
              styles.lowerButton,
              gameState !== 'playing' && styles.disabled,
            ]}
            onPress={() => handleGuess('lower')}
            disabled={gameState !== 'playing'}>
            <Text style={styles.lowerArrow}>{'↓'}</Text>
            <Text style={styles.lowerText}>LOWER</Text>
          </Pressable>
        </View>

        <TutorialOverlay
          modeKey="marketmovers"
          title="Market Movers"
          description="Two real transfers. You see the first fee — guess whether the second was HIGHER or LOWER. Build the longest streak you can!"
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: 100 },
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
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.pitchGreen,
    letterSpacing: 2,
  },
  streakText: {
    fontFamily: fonts.scoreboard,
    fontSize: 20,
    color: colors.chalkWhite,
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
  cardLabel: {
    fontFamily: fonts.subheading,
    fontSize: 11,
    color: colors.steelGray,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: 'rgba(17,17,40,0.85)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
    minHeight: 160,
    justifyContent: 'center',
    ...shadows.cardShadow,
  },
  playerName: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.chalkWhite,
    textAlign: 'center',
  },
  clubs: {
    fontFamily: fonts.subheading,
    fontSize: 12,
    color: colors.steelGray,
    textAlign: 'center',
  },
  year: {
    fontFamily: fonts.scoreboard,
    fontSize: 13,
    color: colors.cardYellow,
  },
  feeWrap: {
    marginTop: 4,
    minHeight: 30,
    justifyContent: 'center',
  },
  fee: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.pitchGreen,
  },
  feeHidden: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.steelGray,
  },
  vsPill: {
    backgroundColor: 'rgba(5,242,108,0.15)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(5,242,108,0.3)',
  },
  vsText: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.chalkWhite,
  },
  prompt: {
    fontFamily: fonts.subheading,
    fontSize: 14,
    color: colors.chalkWhite,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
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
  higherButton: { backgroundColor: colors.pitchGreen },
  lowerButton: { backgroundColor: colors.cardRed },
  disabled: { opacity: 0.4 },
  higherArrow: { fontSize: 28, fontFamily: fonts.heading, color: colors.retroBlack },
  higherText: {
    fontSize: 22,
    fontFamily: fonts.heading,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.retroBlack,
  },
  lowerArrow: { fontSize: 28, fontFamily: fonts.heading, color: colors.chalkWhite },
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
  },
  gameOverDetail: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.steelGray,
    textAlign: 'center',
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

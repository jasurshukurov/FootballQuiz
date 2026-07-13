import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { colors, fonts, spacing, gradients } from '@/constants/theme';
import { triggerImpact, triggerNotification } from '@/lib/haptics';
import { getModeSeed } from '@/lib/dailySeed';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import {
  generateCareerTimelinePuzzle,
  getAllClubs,
  clubNamesMatch,
  TimelineNode,
  CareerTimelinePuzzle,
} from '@/lib/careerTimelineGenerator';
import CareerTimeline from '@/components/games/CareerTimeline';
import ClubSearchAutocomplete from '@/components/ui/ClubSearchAutocomplete';
import GameOverActions from '@/components/ui/GameOverActions';
import GiveUpButton from '@/components/career/GiveUpButton';
import ShakeView from '@/components/ui/ShakeView';
import ShareableCareerTimelineResult from '@/components/ShareableCareerTimelineResult';
import { useManagerStore } from '@/hooks/useManagerStore';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { buildShareText } from '@/lib/sharing';
import { playCheer, playCrossbar } from '@/lib/sounds';
import TutorialOverlay from '@/components/ui/TutorialOverlay';

type GamePhase = 'playing' | 'won' | 'lost';
const MAX_LIVES = 3;

export default function CareerTimelineScreen() {
  const [puzzle, setPuzzle] = useState<CareerTimelinePuzzle | null>(null);
  const [nodes, setNodes] = useState<TimelineNode[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [lives, setLives] = useState(MAX_LIVES);
  const [guessedCount, setGuessedCount] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [shakeWrong, setShakeWrong] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const shareRef = useRef<View>(null);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);

  const clubs = useMemo(() => getAllClubs(), []);

  const shareText = useMemo(
    () =>
      puzzle
        ? buildShareText({
            mode: 'careertimeline',
            dailyNumber: getDailyNumber(),
            dailyStreak,
            guessedCount,
            totalHidden: puzzle.totalHidden,
            livesRemaining: lives,
            totalLives: MAX_LIVES,
            playerName: puzzle.playerName,
          })
        : '',
    [puzzle, dailyStreak, guessedCount, lives],
  );

  const initGame = useCallback((seed: number, dayIndex?: number) => {
    const p = generateCareerTimelinePuzzle(seed, dayIndex);
    setPuzzle(p);
    setNodes(p.nodes.map((n) => ({ ...n })));
    setActiveIdx(null);
    setLives(MAX_LIVES);
    setGuessedCount(0);
    setPhase('playing');
    setShakeWrong(false);
    setHintsUsed(0);
  }, []);

  useEffect(() => {
    const seed = getModeSeed('careertimeline');
    initGame(seed, getDailyNumber());
  }, [initGame]);

  const handleNodePress = useCallback(
    (index: number) => {
      if (phase !== 'playing') return;
      const node = nodes[index];
      if (!node.isHidden || node.isGuessed) return;
      setActiveIdx(index);
    },
    [phase, nodes],
  );

  const handleHintPress = useCallback(
    (index: number) => {
      if (phase !== 'playing') return;
      const node = nodes[index];
      if (!node.isHidden || node.isGuessed || node.hintRevealed) return;

      triggerImpact(ImpactFeedbackStyle.Light);
      const newNodes = nodes.map((n, i) => (i === index ? { ...n, hintRevealed: true } : n));
      setNodes(newNodes);
      setHintsUsed((prev) => prev + 1);
    },
    [phase, nodes],
  );

  const handleClubSelect = useCallback(
    (clubName: string) => {
      if (activeIdx === null || phase !== 'playing' || !puzzle) return;

      const targetNode = nodes[activeIdx];
      if (!targetNode.isHidden || targetNode.isGuessed) return;

      if (clubNamesMatch(clubName, targetNode.club)) {
        // Correct guess
        triggerNotification(NotificationFeedbackType.Success);
        playCheer();
        const newNodes = nodes.map((n, i) => (i === activeIdx ? { ...n, isGuessed: true } : n));
        setNodes(newNodes);
        const newGuessedCount = guessedCount + 1;
        setGuessedCount(newGuessedCount);
        setActiveIdx(null);

        // Check win condition
        if (newGuessedCount >= puzzle.totalHidden) {
          setPhase('won');
          const xp = Math.max(0, newGuessedCount * 25 + lives * 10 - hintsUsed * 5);
          useManagerStore.getState().addXp('careertimeline', xp);
          useDailyProgressStore.getState().markCompleted('careertimeline', newGuessedCount);
        }
      } else {
        // Wrong guess
        triggerNotification(NotificationFeedbackType.Error);
        playCrossbar();
        setShakeWrong(true);
        setTimeout(() => setShakeWrong(false), 500);
        const newLives = lives - 1;
        setLives(newLives);

        if (newLives <= 0) {
          // Reveal all hidden clubs
          const revealedNodes = nodes.map((n) => (n.isHidden ? { ...n, isGuessed: true } : n));
          setNodes(revealedNodes);
          setPhase('lost');
          setActiveIdx(null);
          const xp = Math.max(0, guessedCount * 25 - hintsUsed * 5);
          useManagerStore.getState().addXp('careertimeline', xp);
          useDailyProgressStore.getState().markCompleted('careertimeline', guessedCount);
        }
      }
    },
    [activeIdx, phase, puzzle, nodes, guessedCount, lives],
  );

  const handleGiveUp = useCallback(() => {
    if (phase !== 'playing' || !puzzle) return;
    triggerNotification(NotificationFeedbackType.Warning);
    playCrossbar();
    const revealedNodes = nodes.map((n) => (n.isHidden ? { ...n, isGuessed: true } : n));
    setNodes(revealedNodes);
    setPhase('lost');
    setActiveIdx(null);
    const xp = Math.max(0, guessedCount * 25 - hintsUsed * 5);
    useManagerStore.getState().addXp('careertimeline', xp);
    useDailyProgressStore.getState().markCompleted('careertimeline', guessedCount);
  }, [phase, puzzle, nodes, guessedCount, hintsUsed]);

  const handlePlayAgain = useCallback(() => {
    initGame(Date.now());
  }, [initGame]);

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

  const heartsDisplay = '\u2764\uFE0F'.repeat(lives) + '\uD83D\uDDA4'.repeat(MAX_LIVES - lives);

  if (phase === 'won' || phase === 'lost') {
    return (
      <LinearGradient
        colors={gradients.screenBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.resultContainer}>
            <Text
              style={[styles.resultTitle, phase === 'won' ? styles.wonTitle : styles.lostTitle]}>
              {phase === 'won' ? 'COMPLETE!' : 'GAME OVER'}
            </Text>
            <Text style={styles.resultPlayer}>{puzzle.playerName}</Text>
            <Text style={styles.resultScore}>
              {guessedCount}/{puzzle.totalHidden} clubs guessed
            </Text>
            <Text style={styles.resultHearts}>{heartsDisplay}</Text>

            <CareerTimeline nodes={nodes} activeNodeIndex={null} onNodePress={() => {}} />

            <GameOverActions
              shareRef={shareRef}
              shareText={shareText}
              win={phase === 'won'}
              onPlayAgain={handlePlayAgain}
              playAgainLabel="PLAY AGAIN"
            />
          </View>

          {/* Offscreen shareable view */}
          <View style={styles.offscreen}>
            <View ref={shareRef} collapsable={false}>
              <ShareableCareerTimelineResult
                playerName={puzzle.playerName}
                guessedCount={guessedCount}
                totalHidden={puzzle.totalHidden}
                livesRemaining={lives}
              />
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
          <View style={styles.headerLeft}>
            <Text style={styles.playerName}>{puzzle.playerName}</Text>
            <Text style={styles.playerNationality}>{puzzle.playerNationality}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.livesRow}>
              <Text style={styles.hearts}>{heartsDisplay}</Text>
              <Text style={styles.progressText}>
                {guessedCount}/{puzzle.totalHidden}
              </Text>
            </View>
            <GiveUpButton onGiveUp={handleGiveUp} />
          </View>
        </View>

        {/* Timeline */}
        <ShakeView shake={shakeWrong}>
          <CareerTimeline
            nodes={nodes}
            activeNodeIndex={activeIdx}
            onNodePress={handleNodePress}
            onHintPress={handleHintPress}
          />
        </ShakeView>

        {/* Club search - slides up when a node is active */}
        {activeIdx !== null && (
          <View style={styles.searchContainer}>
            <Text style={styles.searchLabel}>
              Which club? ({nodes[activeIdx].from} - {nodes[activeIdx].to})
            </Text>
            <ClubSearchAutocomplete
              clubs={clubs}
              onSelectClub={handleClubSelect}
              placeholder="Search club..."
              autoFocus
              dropDirection="up"
            />
          </View>
        )}
        <TutorialOverlay
          modeKey="careertimeline"
          title="Career Timeline"
          description="Complete the player's career history. Guess the hidden clubs using the search bar!"
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
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  playerName: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.chalkWhite,
  },
  playerNationality: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.steelGray,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  livesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hearts: {
    fontSize: 20,
  },
  progressText: {
    fontFamily: fonts.scoreboard,
    fontSize: 16,
    color: colors.pitchGreen,
  },
  searchContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchLabel: {
    fontFamily: fonts.subheading,
    fontSize: 14,
    color: colors.chalkWhite,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  resultContainer: {
    flex: 1,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  resultTitle: {
    fontFamily: fonts.heading,
    fontSize: 36,
    textAlign: 'center',
  },
  wonTitle: {
    color: colors.pitchGreen,
  },
  lostTitle: {
    color: colors.cardRed,
  },
  resultPlayer: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.chalkWhite,
    textAlign: 'center',
  },
  resultScore: {
    fontFamily: fonts.scoreboard,
    fontSize: 18,
    color: colors.pitchGreen,
    textAlign: 'center',
  },
  resultHearts: {
    fontSize: 24,
    textAlign: 'center',
  },
  buttonRow: {
    marginTop: spacing.md,
    alignItems: 'center',
    minWidth: 200,
    alignSelf: 'center',
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

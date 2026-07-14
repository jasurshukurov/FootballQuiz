import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { NotificationFeedbackType } from 'expo-haptics';
import { spacing, type, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { triggerNotification } from '@/lib/haptics';
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
import Screen, { TAB_BAR_HEIGHT } from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ShareableCareerTimelineResult from '@/components/ShareableCareerTimelineResult';
import { useManagerStore } from '@/hooks/useManagerStore';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyResultsStore } from '@/hooks/useDailyResultsStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useSolveTimeStore, useTodaySolveTime } from '@/hooks/useSolveTimeStore';
import { SolveTimeResult } from '@/components/ui/SolveTimeChip';
import { buildShareText } from '@/lib/sharing';
import { playCheer, playCrossbar } from '@/lib/sounds';
import RankBadge from '@/components/ui/RankBadge';
import { getRank } from '@/lib/rankLadder';

type GamePhase = 'playing' | 'won' | 'lost';
type Feedback = null | 'wrong' | 'rightClubWrongYears';
const MAX_LIVES = 3;

export default function CareerTimelineScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [puzzle, setPuzzle] = useState<CareerTimelinePuzzle | null>(null);
  const [nodes, setNodes] = useState<TimelineNode[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [lives, setLives] = useState(MAX_LIVES);
  const [guessedCount, setGuessedCount] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [shakeWrong, setShakeWrong] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const shareRef = useRef<View>(null);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);
  /** True while the current run IS the official daily (blob writes gate on it). */
  const isDailyRun = useRef(true);
  // Daily re-entry restoration: recorded result at MOUNT time restores the
  // reveal panel instead of dealing the daily again (mount-only by design).
  const [restoredDaily] = useState(() =>
    useDailyProgressStore.getState().isCompleted('careertimeline'),
  );

  const clubs = useMemo(() => getAllClubs(), []);

  const solveTimeMs = useTodaySolveTime('careertimeline');

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
            solveTimeMs,
          })
        : '',
    [puzzle, dailyStreak, guessedCount, lives, solveTimeMs],
  );

  const initGame = useCallback((seed: number, dayIndex?: number) => {
    isDailyRun.current = dayIndex !== undefined;
    const p = generateCareerTimelinePuzzle(seed, dayIndex);
    setPuzzle(p);
    setNodes(p.nodes.map((n) => ({ ...n })));
    setActiveIdx(null);
    setLives(MAX_LIVES);
    setGuessedCount(0);
    setPhase('playing');
    setShakeWrong(false);
    setHintsUsed(0);
    setFeedback(null);
  }, []);

  useEffect(() => {
    const seed = getModeSeed('careertimeline');
    if (restoredDaily) {
      // Completed daily re-entry: rebuild the deterministic daily puzzle in its
      // revealed end state; "Play Again" deals a practice run. Lives come from
      // the persisted daily-result blob (older completions show none).
      isDailyRun.current = false;
      const p = generateCareerTimelinePuzzle(seed, getDailyNumber());
      setPuzzle(p);
      setNodes(p.nodes.map((n) => (n.isHidden ? { ...n, isGuessed: true } : { ...n })));
      const guessed = useDailyProgressStore.getState().scoresByMode['careertimeline'] ?? 0;
      const blob = useDailyResultsStore.getState().getResult<{ lives: number }>('careertimeline');
      setGuessedCount(guessed);
      setLives(blob?.lives ?? 0);
      setPhase(guessed >= p.totalHidden ? 'won' : 'lost');
      return;
    }
    initGame(seed, getDailyNumber());
  }, [initGame, restoredDaily]);

  const handleNodePress = useCallback(
    (index: number) => {
      if (phase !== 'playing') return;
      const node = nodes[index];
      if (!node.isHidden || node.isGuessed) return;
      // Solve-time stopwatch starts on the first node pick (no-ops after).
      useSolveTimeStore.getState().markStarted('careertimeline');
      setFeedback(null);
      setActiveIdx(index);
    },
    [phase, nodes],
  );

  const handleHintPress = useCallback(
    (index: number) => {
      if (phase !== 'playing') return;
      const node = nodes[index];
      if (!node.isHidden || node.isGuessed || node.hintRevealed) return;

      // A hint is a meaningful first interaction too.
      useSolveTimeStore.getState().markStarted('careertimeline');

      // Tap haptic fires inside the node's Tappable — no extra impact here.
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
        setFeedback(null);
        const newNodes = nodes.map((n, i) => (i === activeIdx ? { ...n, isGuessed: true } : n));
        setNodes(newNodes);
        const newGuessedCount = guessedCount + 1;
        setGuessedCount(newGuessedCount);
        setActiveIdx(null);

        // Check win condition
        if (newGuessedCount >= puzzle.totalHidden) {
          setPhase('won');
          const xp = Math.max(0, newGuessedCount * 25 + lives * 10 - hintsUsed * 5);
          useManagerStore.getState().awardDailyXp('careertimeline', xp);
          useDailyProgressStore.getState().markCompleted('careertimeline', newGuessedCount);
          useSolveTimeStore.getState().markCompleted('careertimeline', { countsForBest: true });
          // Persist lives (DAILY run only) so re-entry restores the hearts row.
          if (isDailyRun.current) {
            useDailyResultsStore.getState().setResult('careertimeline', { lives });
          }
        }
      } else {
        // Wrong guess. Distinguish "right club, wrong years" — the guessed club
        // IS somewhere in this career, just not the active stint — from a plain
        // miss, so the softer feedback rewards partial knowledge.
        const rightClubElsewhere = nodes.some(
          (n, i) => i !== activeIdx && clubNamesMatch(clubName, n.club),
        );
        setFeedback(rightClubElsewhere ? 'rightClubWrongYears' : 'wrong');
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
          useManagerStore.getState().awardDailyXp('careertimeline', xp);
          useDailyProgressStore.getState().markCompleted('careertimeline', guessedCount);
          // Losses never set a time PB.
          useSolveTimeStore.getState().markCompleted('careertimeline', { countsForBest: false });
          if (isDailyRun.current) {
            useDailyResultsStore.getState().setResult('careertimeline', { lives: 0 });
          }
        }
      }
    },
    [activeIdx, phase, puzzle, nodes, guessedCount, lives, hintsUsed],
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
    useManagerStore.getState().awardDailyXp('careertimeline', xp);
    useDailyProgressStore.getState().markCompleted('careertimeline', guessedCount);
    // Giving up never sets a time PB.
    useSolveTimeStore.getState().markCompleted('careertimeline', { countsForBest: false });
    if (isDailyRun.current) {
      useDailyResultsStore.getState().setResult('careertimeline', { lives });
    }
  }, [phase, puzzle, nodes, guessedCount, hintsUsed, lives]);

  const handlePlayAgain = useCallback(() => {
    initGame(Date.now());
  }, [initGame]);

  if (!puzzle) {
    return (
      <Screen scroll={false}>
        <Text style={styles.loadingText}>Loading...</Text>
      </Screen>
    );
  }

  const heartsDisplay = '❤️'.repeat(lives) + '🖤'.repeat(MAX_LIVES - lives);

  if (phase === 'won' || phase === 'lost') {
    return (
      <Screen>
        <ScreenHeader
          eyebrow={`Daily #${getDailyNumber()}`}
          title="Career Timeline"
          modeKey="careertimeline"
          subtitle={puzzle.playerName}
        />
        <Animated.View entering={FadeIn.duration(motion.base)} style={layoutStyles.resultContainer}>
          <Text
            style={[
              layoutStyles.resultTitle,
              phase === 'won' ? styles.wonTitle : styles.lostTitle,
            ]}>
            {phase === 'won' ? 'COMPLETE!' : 'GAME OVER'}
          </Text>
          <Text style={styles.resultScore}>
            {guessedCount}/{puzzle.totalHidden} clubs guessed
          </Text>
          <Text style={layoutStyles.resultHearts}>{heartsDisplay}</Text>

          <RankBadge rank={getRank(guessedCount, puzzle.totalHidden)} unit="clubs" />

          <SolveTimeResult mode="careertimeline" />

          <CareerTimeline nodes={nodes} activeNodeIndex={null} onNodePress={() => {}} />

          <GameOverActions
            shareRef={shareRef}
            shareText={shareText}
            win={phase === 'won'}
            onPlayAgain={handlePlayAgain}
            playAgainLabel="PLAY AGAIN"
          />
        </Animated.View>

        {/* Keep the last game-over card (NEXT UP / countdown) scrollable clear of
            the floating tab bar — extra clearance beyond Screen's tab-bar padding. */}
        <View style={layoutStyles.bottomSpacer} />

        {/* Offscreen shareable view */}
        <View style={layoutStyles.offscreen}>
          <View ref={shareRef} collapsable={false}>
            <ShareableCareerTimelineResult
              playerName={puzzle.playerName}
              guessedCount={guessedCount}
              totalHidden={puzzle.totalHidden}
              livesRemaining={lives}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScreenHeader
        eyebrow={`Daily #${getDailyNumber()}`}
        title="Career Timeline"
        modeKey="careertimeline"
        subtitle={`${puzzle.playerName} · ${puzzle.playerNationality}`}
        right={
          <View style={layoutStyles.headerRight}>
            <View style={layoutStyles.livesRow}>
              <Text style={layoutStyles.hearts}>{heartsDisplay}</Text>
              <Text style={styles.progressText}>
                {guessedCount}/{puzzle.totalHidden}
              </Text>
            </View>
            <GiveUpButton onGiveUp={handleGiveUp} />
          </View>
        }
      />

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
        <View style={layoutStyles.searchContainer}>
          <Text style={styles.searchLabel}>
            Which club? ({nodes[activeIdx].from} - {nodes[activeIdx].to})
          </Text>
          {feedback && (
            <Text
              style={[
                layoutStyles.feedbackText,
                feedback === 'rightClubWrongYears' ? styles.feedbackAmber : styles.feedbackRed,
              ]}>
              {feedback === 'rightClubWrongYears'
                ? 'Right club, wrong years — try another stint'
                : 'Not this one'}
            </Text>
          )}
          <ClubSearchAutocomplete
            clubs={clubs}
            onSelectClub={handleClubSelect}
            placeholder="Search club..."
            autoFocus
            dropDirection="up"
          />
        </View>
      )}
    </Screen>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
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
    ...type.h3,
  },
  searchContainer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  feedbackText: {
    ...type.caption,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  resultContainer: {
    gap: spacing.md,
  },
  resultTitle: {
    ...type.display,
    textAlign: 'center',
  },
  resultHearts: {
    ...type.h2,
    textAlign: 'center',
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
    progressText: {
      ...type.score,
      color: c.accent,
    },
    searchLabel: {
      ...type.bodyBold,
      color: c.textPrimary,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    feedbackAmber: {
      color: c.streak,
    },
    feedbackRed: {
      color: c.danger,
    },
    wonTitle: {
      color: c.accent,
    },
    lostTitle: {
      color: c.danger,
    },
    resultScore: {
      ...type.score,
      color: c.accent,
      textAlign: 'center',
    },
  });

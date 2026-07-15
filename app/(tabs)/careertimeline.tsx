import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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
import ClubSearchAutocomplete, {
  ClubSearchAutocompleteHandle,
} from '@/components/ui/ClubSearchAutocomplete';
import GameOverActions from '@/components/ui/GameOverActions';
import GiveUpButton from '@/components/ui/GiveUpButton';
import LivesIndicator from '@/components/ui/LivesIndicator';
import ShakeView from '@/components/ui/ShakeView';
import Screen, { TAB_BAR_HEIGHT } from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { todayBandDisplay } from '@/components/ui/DifficultyBanner';
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
  // Clears the club box after a typed name auto-fills its stint.
  const searchRef = useRef<ClubSearchAutocompleteHandle>(null);
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

  // Single correct-fill path — reused by an explicit suggestion pick AND by a
  // typed name that exactly matches a hidden stint. All the scoring/win/solve-
  // time bookkeeping lives here so both entry points stay in lockstep.
  const fillStint = useCallback(
    (index: number) => {
      if (phase !== 'playing' || !puzzle) return;
      const node = nodes[index];
      if (!node.isHidden || node.isGuessed) return;

      triggerNotification(NotificationFeedbackType.Success);
      playCheer();
      setFeedback(null);
      setNodes(nodes.map((n, i) => (i === index ? { ...n, isGuessed: true } : n)));
      const newGuessedCount = guessedCount + 1;
      setGuessedCount(newGuessedCount);
      setActiveIdx(null);
      searchRef.current?.clear();

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
    },
    [phase, puzzle, nodes, guessedCount, lives, hintsUsed],
  );

  const handleClubSelect = useCallback(
    (clubName: string) => {
      if (activeIdx === null || phase !== 'playing' || !puzzle) return;

      const targetNode = nodes[activeIdx];
      if (!targetNode.isHidden || targetNode.isGuessed) return;

      if (clubNamesMatch(clubName, targetNode.club)) {
        // Correct guess
        fillStint(activeIdx);
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
    [activeIdx, phase, puzzle, nodes, guessedCount, lives, hintsUsed, fillStint],
  );

  // Type-to-fill: on every keystroke, if the folded text exactly names a still-
  // hidden stint's club, drop it in as a correct answer with no suggestion tap.
  // Typing is ALWAYS free — a non-match does nothing and never costs a life
  // (wrong clubs only cost when a suggestion is explicitly picked).
  const handleQueryChange = useCallback(
    (text: string) => {
      if (phase !== 'playing' || !puzzle) return;
      if (text.trim().length < 2) return;

      // Hidden, still-unsolved stints the typed text names. clubNamesMatch is
      // the mode's own validator (canonical + alias groups), so it already
      // accepts a club's shortened display name; no new fuzzy matcher here.
      const matches = nodes
        .map((node, index) => ({ node, index }))
        .filter(({ node }) => node.isHidden && !node.isGuessed && clubNamesMatch(text, node.club));
      if (matches.length === 0) return; // no match: typing costs nothing

      // Unambiguous fill only: exactly one hidden stint wears this club, or the
      // same club sits in several and one of them is the active stint (prefer
      // it). Otherwise stay inert so we never fill the wrong repeated stint.
      const target =
        matches.length === 1 ? matches[0] : matches.find(({ index }) => index === activeIdx);
      if (!target) return;

      fillStint(target.index);
    },
    [phase, puzzle, nodes, activeIdx, fillStint],
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

  if (phase === 'won' || phase === 'lost') {
    const isWon = phase === 'won';
    // Graceful, never-shame verdict: a loss still celebrates what was found and
    // frames the reveal below as "here's the answer", not a failure.
    const verdict = isWon ? 'COMPLETE!' : guessedCount > 0 ? 'GOOD RUN!' : 'FULL-TIME';

    return (
      <Screen>
        <ScreenHeader
          eyebrow={`Daily #${getDailyNumber()}`}
          title="Career Timeline"
          modeKey="careertimeline"
          difficulty={todayBandDisplay()}
          subtitle={puzzle.playerName}
        />
        <View style={layoutStyles.resultContainer}>
          <Animated.View entering={FadeIn.duration(motion.base)} style={layoutStyles.resultHero}>
            <Text style={[styles.resultTitle, !isWon && styles.resultTitleLost]}>{verdict}</Text>
            <Text style={styles.scoreText}>
              {guessedCount}/{puzzle.totalHidden}
            </Text>
            <Text style={styles.scoreLabel}>CLUBS FOUND</Text>
            <LivesIndicator total={MAX_LIVES} remaining={lives} />
          </Animated.View>

          <Animated.View entering={FadeIn.delay(150).duration(motion.base)}>
            <RankBadge rank={getRank(guessedCount, puzzle.totalHidden)} unit="clubs" />
          </Animated.View>

          <SolveTimeResult mode="careertimeline" />

          {/* Answer reveal — the full career, hidden stints now shown. */}
          <View style={layoutStyles.revealSection}>
            <Text style={styles.revealLabel}>THE FULL CAREER</Text>
            <CareerTimeline nodes={nodes} activeNodeIndex={null} onNodePress={() => {}} />
          </View>

          <GameOverActions
            shareRef={shareRef}
            shareText={shareText}
            win={isWon}
            onPlayAgain={handlePlayAgain}
            playAgainLabel="PLAY AGAIN"
            currentModeKey="careertimeline"
          />
        </View>

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
    // scroll={false}: the board scrolls INTERNALLY so the search + lives/give-up
    // controls stay pinned above the floating tab bar (never occluded).
    <Screen scroll={false}>
      <ScreenHeader
        eyebrow={`Daily #${getDailyNumber()}`}
        title="Career Timeline"
        modeKey="careertimeline"
        difficulty={todayBandDisplay()}
        subtitle={`${puzzle.playerName} · ${puzzle.playerNationality}`}
        right={
          <View style={layoutStyles.progressPill}>
            <Text style={styles.progressValue}>
              {guessedCount}/{puzzle.totalHidden}
            </Text>
            <Text style={styles.progressLabel}>FOUND</Text>
          </View>
        }
      />

      {/* Timeline — fills remaining height and scrolls when the career is long. */}
      <ScrollView
        style={layoutStyles.board}
        contentContainerStyle={layoutStyles.boardContent}
        showsVerticalScrollIndicator={false}>
        <ShakeView shake={shakeWrong}>
          <CareerTimeline
            nodes={nodes}
            activeNodeIndex={activeIdx}
            onNodePress={handleNodePress}
            onHintPress={handleHintPress}
          />
        </ShakeView>
      </ScrollView>

      {/* Club search - appears when a hidden stint is active */}
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
                ? 'Right club, wrong years. Try another stint'
                : 'Not this one'}
            </Text>
          )}
          <ClubSearchAutocomplete
            ref={searchRef}
            clubs={clubs}
            onSelectClub={handleClubSelect}
            onQueryChange={handleQueryChange}
            placeholder="Search club..."
            autoFocus
            dropDirection="up"
          />
        </View>
      )}

      {/* Lives + give-up, bottom-anchored below the board (never at the top). */}
      <View style={layoutStyles.controlBar}>
        <LivesIndicator total={MAX_LIVES} remaining={lives} />
        <GiveUpButton onGiveUp={handleGiveUp} />
      </View>
    </Screen>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  progressPill: {
    alignItems: 'center',
  },
  board: {
    flex: 1,
  },
  boardContent: {
    paddingBottom: spacing.sm,
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
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resultContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  resultHero: {
    alignItems: 'center',
    gap: spacing.md,
  },
  revealSection: {
    width: '100%',
    marginTop: spacing.md,
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
    progressValue: {
      ...type.score,
      color: c.accent,
    },
    progressLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1.5,
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
    resultTitle: {
      ...type.display,
      color: c.accent,
      textAlign: 'center',
    },
    resultTitleLost: {
      color: c.textPrimary,
    },
    scoreText: {
      ...type.scoreLarge,
      color: c.textPrimary,
      textAlign: 'center',
    },
    scoreLabel: {
      ...type.micro,
      color: c.textSecondary,
      letterSpacing: 2,
      textAlign: 'center',
    },
    revealLabel: {
      ...type.micro,
      color: c.textSecondary,
      letterSpacing: 2,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
  });

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { NotificationFeedbackType } from 'expo-haptics';
import RankBadge from '@/components/ui/RankBadge';

import {
  generateConnectionsPuzzle,
  ConnectionsPuzzle,
  bestGroupOverlap,
  connectionsRank,
} from '@/lib/connectionsGenerator';
import {
  getModeSeed,
  createSeededRandom,
  seededShuffle,
  getTodayDateString,
} from '@/lib/dailySeed';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { triggerNotification } from '@/lib/haptics';
import { getRank } from '@/lib/rankLadder';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyResultsStore } from '@/hooks/useDailyResultsStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useSolveTimeStore, useTodaySolveTime } from '@/hooks/useSolveTimeStore';
import { SolveTimeResult } from '@/components/ui/SolveTimeChip';
import ConnectionsBoard, { TileData, SolvedCategory } from '@/components/games/ConnectionsBoard';
import { connectionsGroupColor } from '@/components/games/ConnectionsTile';
import RetroButton from '@/components/ui/RetroButton';
import GameOverSheet from '@/components/ui/GameOverSheet';
import PopInView from '@/components/ui/PopInView';
import Screen from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { todayBandDisplay } from '@/components/ui/DifficultyBanner';
import LivesIndicator from '@/components/ui/LivesIndicator';
import GiveUpButton from '@/components/ui/GiveUpButton';
import { spacing, borderRadius, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useManagerStore } from '@/hooks/useManagerStore';
import ShareableConnectionsResult from '@/components/ShareableConnectionsResult';
import PracticePill from '@/components/ui/PracticePill';
import { buildShareText } from '@/lib/sharing';
import { playCheer } from '@/lib/sounds';

const MAX_MISTAKES = 4;
/** Hints per game. Hint 1 reveals a group's theme; hint 2 also seeds 2 members. */
const MAX_HINTS = 2;

/** Parse a YYYY-MM-DD practice date to a local Date for puzzle-number display. */
function practiceDateToDate(dateStr?: string): Date | undefined {
  return dateStr ? new Date(`${dateStr}T00:00:00`) : undefined;
}

export default function ConnectionsScreen() {
  const { practiceDate } = useLocalSearchParams<{ practiceDate?: string }>();
  const isPractice = !!practiceDate;
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [puzzle, setPuzzle] = useState<ConnectionsPuzzle | null>(null);
  const [tileNames, setTileNames] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [solvedCategories, setSolvedCategories] = useState<SolvedCategory[]>([]);
  const [solvedNames, setSolvedNames] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  // Near-miss ladder on a wrong submit: 3 = classic "One away…", 2 = a pair
  // belonged together. null = plain miss.
  const [nearMiss, setNearMiss] = useState<2 | 3 | null>(null);
  const [flashingDotIdx, setFlashingDotIdx] = useState<number | null>(null);
  // Hints used this game (0..MAX_HINTS). hintTheme is the revealed group title —
  // it stays pinned as a banner chip for the rest of the game once shown.
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintTheme, setHintTheme] = useState<string | null>(null);
  const shareRef = useRef<View>(null);
  const isFirstGame = useRef(true);
  /** True while the current run IS the official daily (blob writes gate on it). */
  const isDailyRun = useRef(false);
  const shuffleRng = useRef<() => number>(() => Math.random());
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);
  // Daily re-entry restoration: recorded result at MOUNT time re-opens the
  // result modal over the finished board instead of dealing the daily again.
  // Archive/practice entries are exempt (they play a different day's board).
  const [restoredDaily] = useState(
    () => !practiceDate && useDailyProgressStore.getState().isCompleted('connections'),
  );
  // True when restoring a completion recorded before the daily-result blob
  // existed — the end state is unknown, so the modal shows a neutral panel.
  const [restoredUnknown, setRestoredUnknown] = useState(false);

  const initPuzzle = useCallback(() => {
    // Practice/archive: seed deterministically from the chosen past date.
    const seed = practiceDate
      ? getModeSeed('connections', practiceDate)
      : isFirstGame.current
        ? getModeSeed('connections')
        : Date.now();
    isDailyRun.current = !practiceDate && isFirstGame.current;
    isFirstGame.current = false;
    shuffleRng.current = createSeededRandom(seed);
    const p = generateConnectionsPuzzle(seed, practiceDate ?? getTodayDateString());
    setPuzzle(p);
    setTileNames(p.shuffledNames);
    setSelected(new Set());
    setSolvedCategories([]);
    setSolvedNames(new Set());
    setMistakes(0);
    setShaking(false);
    setShowModal(false);
    setGameOver(false);
    setNearMiss(null);
    setFlashingDotIdx(null);
    setHintsUsed(0);
    setHintTheme(null);
  }, [practiceDate]);

  useEffect(() => {
    if (restoredDaily) {
      // Completed daily re-entry: rebuild the deterministic daily board in its
      // finished state and re-open the result modal. "Play Again" still deals
      // a practice board via initPuzzle.
      const seed = getModeSeed('connections');
      isFirstGame.current = false;
      isDailyRun.current = false;
      shuffleRng.current = createSeededRandom(seed);
      const p = generateConnectionsPuzzle(seed, getTodayDateString());
      setPuzzle(p);
      setTileNames(p.shuffledNames);
      const blob = useDailyResultsStore
        .getState()
        .getResult<{ mistakes: number; solvedOrder: string[]; hintsUsed?: number }>('connections');
      if (blob) {
        const solved: SolvedCategory[] = blob.solvedOrder
          .map((name) => p.categories.find((c) => c.name === name))
          .filter((c): c is NonNullable<typeof c> => !!c)
          .map((c) => ({ name: c.name, difficulty: c.difficulty, playerNames: c.playerNames }));
        setSolvedCategories(solved);
        setSolvedNames(new Set(solved.flatMap((s) => s.playerNames)));
        setMistakes(blob.mistakes);
        // hintsUsed is additive on the blob — older completions read as 0.
        setHintsUsed(blob.hintsUsed ?? 0);
      } else {
        setRestoredUnknown(true);
      }
      setGameOver(true);
      setShowModal(true);
      return;
    }
    initPuzzle();
  }, [initPuzzle, restoredDaily]);

  // Tap haptic fires inside ConnectionsTile — no extra impact here.
  const handleTilePress = useCallback(
    (name: string) => {
      if (gameOver) return;
      // Solve-time stopwatch starts on the first tile select (no-ops after).
      // Practice/archive runs never touch the daily stopwatch.
      if (!isPractice) useSolveTimeStore.getState().markStarted('connections');
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(name)) {
          next.delete(name);
        } else if (next.size < 4) {
          next.add(name);
        }
        return next;
      });
    },
    [gameOver, isPractice],
  );

  const handleSubmit = useCallback(() => {
    if (!puzzle || selected.size !== 4) return;

    const selectedArr = Array.from(selected);
    const matchedCategory = puzzle.categories.find(
      (cat) =>
        !solvedCategories.some((s) => s.name === cat.name) &&
        cat.playerNames.every((name) => selectedArr.includes(name)),
    );

    if (matchedCategory) {
      triggerNotification(NotificationFeedbackType.Success);
      const newSolved: SolvedCategory = {
        name: matchedCategory.name,
        difficulty: matchedCategory.difficulty,
        playerNames: matchedCategory.playerNames,
      };
      const updatedSolved = [...solvedCategories, newSolved];
      setSolvedCategories(updatedSolved);
      setSolvedNames((prev) => {
        const next = new Set(prev);
        matchedCategory.playerNames.forEach((n) => next.add(n));
        return next;
      });
      setSelected(new Set());

      if (updatedSolved.length >= 4) {
        setGameOver(true);
        playCheer();
        // Practice/archive runs never touch progress, XP or streak.
        if (!isPractice) {
          // The flawless bonus requires BOTH a clean sheet and no hints, so a
          // no-hint solve stays worth more than a hint-assisted one.
          useManagerStore
            .getState()
            .awardDailyXp('connections', 4 * 25 + (mistakes === 0 && hintsUsed === 0 ? 50 : 0));
          useDailyProgressStore.getState().markCompleted('connections', 4 - mistakes);
          // Wins can set a time PB.
          useSolveTimeStore.getState().markCompleted('connections', { countsForBest: true });
          // Persist the end state (DAILY run only) for re-entry restoration.
          if (isDailyRun.current) {
            useDailyResultsStore.getState().setResult('connections', {
              mistakes,
              solvedOrder: updatedSolved.map((s) => s.name),
              hintsUsed,
            });
          }
        }
        setTimeout(() => setShowModal(true), 600);
      }
    } else {
      // "One away!" — exactly 3 of the 4 selected belong to one unsolved group.
      // Distinct near-miss feedback (Warning haptic + non-spoiler banner) is the
      // single highest feel-per-effort mechanic in NYT Connections.
      const overlap = bestGroupOverlap(
        selectedArr,
        puzzle.categories,
        solvedCategories.map((s) => s.name),
      );
      triggerNotification(
        overlap === 3 ? NotificationFeedbackType.Warning : NotificationFeedbackType.Error,
      );
      if (overlap >= 2) {
        setNearMiss(overlap as 2 | 3);
        setTimeout(() => setNearMiss(null), 1800);
      }
      setShaking(true);
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);

      // Flash the dot being lost
      const dotIdx = MAX_MISTAKES - newMistakes;
      setFlashingDotIdx(dotIdx);
      setTimeout(() => setFlashingDotIdx(null), 300);

      setTimeout(() => {
        setShaking(false);
        setSelected(new Set());
      }, 400);

      if (newMistakes >= MAX_MISTAKES) {
        setGameOver(true);
        if (!isPractice) {
          useManagerStore.getState().awardDailyXp('connections', solvedCategories.length * 25);
          useDailyProgressStore.getState().markCompleted('connections', solvedCategories.length);
          // Losses never set a time PB.
          useSolveTimeStore.getState().markCompleted('connections', { countsForBest: false });
          if (isDailyRun.current) {
            useDailyResultsStore.getState().setResult('connections', {
              mistakes: newMistakes,
              solvedOrder: solvedCategories.map((s) => s.name),
              hintsUsed,
            });
          }
        }
        setTimeout(() => setShowModal(true), 600);
      }
    }
  }, [puzzle, selected, solvedCategories, mistakes, isPractice, hintsUsed]);

  const handleDeselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  // Tap haptic fires inside RetroButton — no extra impact here.
  const handleShuffle = useCallback(() => {
    setTileNames((prev) => {
      const remaining = prev.filter((n) => !solvedNames.has(n));
      // Unbiased Fisher-Yates (a random comparator is biased and engine-dependent).
      const shuffled = seededShuffle(remaining, shuffleRng.current);
      const solved = prev.filter((n) => solvedNames.has(n));
      return [...solved, ...shuffled];
    });
  }, [solvedNames]);

  // Hint: reveal the easiest still-unsolved group's theme (hint 1), and on the
  // second press also pre-select two of its members so the player finishes the
  // other two. The target is the lowest-difficulty unsolved category, so it is
  // deterministic for the day and free of Math.random.
  const handleHint = useCallback(() => {
    if (gameOver || hintsUsed >= MAX_HINTS || !puzzle) return;
    const solvedNameSet = new Set(solvedCategories.map((s) => s.name));
    const target = puzzle.categories
      .filter((c) => !solvedNameSet.has(c.name))
      .sort((a, b) => a.difficulty - b.difficulty)[0];
    if (!target) return;
    // A hint is a meaningful first interaction — start the daily stopwatch too.
    if (!isPractice) useSolveTimeStore.getState().markStarted('connections');
    triggerNotification(NotificationFeedbackType.Success);
    const next = hintsUsed + 1;
    setHintsUsed(next);
    setHintTheme(target.name);
    if (next >= MAX_HINTS) {
      // Seed two still-available members (deterministic tile order) so the user
      // completes the group. Clears any current selection first.
      const seed = target.playerNames.filter((n) => !solvedNames.has(n)).slice(0, 2);
      setSelected(new Set(seed));
    }
  }, [gameOver, hintsUsed, puzzle, solvedCategories, solvedNames, isPractice]);

  // Give up: end today's game as a loss and reveal every remaining group — the
  // same path as running out of mistakes. Solved groups stay, unsolved
  // categories reveal in the sheet, and the score is the groups solved so far.
  const handleGiveUp = useCallback(() => {
    if (gameOver) return;
    setGameOver(true);
    // Practice/archive runs never touch progress, XP or streak.
    if (!isPractice) {
      useManagerStore.getState().awardDailyXp('connections', solvedCategories.length * 25);
      useDailyProgressStore.getState().markCompleted('connections', solvedCategories.length);
      // Losses never set a time PB.
      useSolveTimeStore.getState().markCompleted('connections', { countsForBest: false });
      if (isDailyRun.current) {
        useDailyResultsStore.getState().setResult('connections', {
          mistakes,
          solvedOrder: solvedCategories.map((s) => s.name),
          hintsUsed,
        });
      }
    }
    setTimeout(() => setShowModal(true), 600);
  }, [gameOver, isPractice, solvedCategories, mistakes, hintsUsed]);

  const tiles: TileData[] = useMemo(() => {
    return tileNames.map((name) => ({
      name,
      selected: selected.has(name),
      solved: solvedNames.has(name),
    }));
  }, [tileNames, selected, solvedNames]);

  const won = solvedCategories.length >= 4;

  // Shortest mobile-web viewports (Safari's URL bar eats ~180pt): the fixed
  // layout can't fit the board + controls, so fall back to a scrolling page —
  // otherwise Give Up ends up painted (unreachably) under the floating tab bar.
  const { height: winHeight } = useWindowDimensions();
  const shortViewport = winHeight < 600;

  const solveTimeMs = useTodaySolveTime('connections');

  const shareText = useMemo(
    () =>
      puzzle
        ? buildShareText({
            mode: 'connections',
            dailyNumber: getDailyNumber(practiceDateToDate(practiceDate)),
            dailyStreak,
            mistakes,
            maxMistakes: MAX_MISTAKES,
            solvedDifficulties: solvedCategories.map(
              (s) => puzzle.categories.find((c) => c.name === s.name)?.difficulty ?? 0,
            ),
            hintsUsed,
            // Practice shares never carry the daily's solve time.
            solveTimeMs: isPractice ? null : solveTimeMs,
          })
        : '',
    [
      puzzle,
      dailyStreak,
      mistakes,
      solvedCategories,
      practiceDate,
      isPractice,
      solveTimeMs,
      hintsUsed,
    ],
  );

  if (!puzzle) {
    return (
      <Screen scroll={false}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading puzzle...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={shortViewport}>
      <ScreenHeader
        eyebrow={
          isPractice ? 'Practice' : `Daily #${getDailyNumber(practiceDateToDate(practiceDate))}`
        }
        title="Connections"
        modeKey="connections"
        difficulty={isPractice ? undefined : todayBandDisplay()}
        subtitle="Find 4 groups of 4 players"
      />
      {isPractice && <PracticePill date={practiceDate} />}

      <ConnectionsBoard
        tiles={tiles}
        solvedCategories={solvedCategories}
        onTilePress={handleTilePress}
        shaking={shaking}
        disabled={gameOver}
      />

      {/* Hint theme chip — pinned once revealed, names one group but not who's in it. */}
      {hintTheme !== null && !gameOver && (
        <View style={styles.hintBanner}>
          <Text style={styles.hintText}>{`Hint: one group is “${hintTheme}”`}</Text>
        </View>
      )}

      {/* One-away near-miss banner (non-spoiler) */}
      {nearMiss !== null && !gameOver && (
        <View style={styles.oneAwayBanner}>
          <Text style={styles.oneAwayText}>
            {nearMiss === 3 ? 'One away…' : 'Two of these belong together'}
          </Text>
        </View>
      )}

      {/* Mistakes remaining — shared lives indicator (flashes the dot lost). */}
      <View style={styles.mistakesRow}>
        <Text style={styles.mistakesLabel}>Mistakes remaining:</Text>
        <LivesIndicator
          size="sm"
          total={MAX_MISTAKES}
          remaining={MAX_MISTAKES - mistakes}
          flashIndex={flashingDotIdx}
          label="Mistakes remaining"
        />
      </View>

      {/* Push controls to the bottom of the screen */}
      <View style={styles.spacer} />

      {/* One control row: Hint / Shuffle / Clear / Submit. Stacking Hint on
          its own row pushed Give Up under the floating tab bar on phones. */}
      {!gameOver && (
        <View style={styles.buttonRow}>
          <View style={styles.buttonWrapper}>
            <RetroButton
              title={hintsUsed === 0 ? 'Hint' : `Hint (${MAX_HINTS - hintsUsed})`}
              onPress={handleHint}
              variant="secondary"
              compact
              disabled={hintsUsed >= MAX_HINTS}
            />
          </View>
          <View style={styles.buttonWrapper}>
            <RetroButton title="Shuffle" onPress={handleShuffle} variant="secondary" compact />
          </View>
          <View style={styles.buttonWrapper}>
            <RetroButton
              title="Clear"
              onPress={handleDeselectAll}
              variant="secondary"
              compact
              disabled={selected.size === 0}
            />
          </View>
          <View style={styles.buttonWrapper}>
            <RetroButton
              title="Submit"
              onPress={handleSubmit}
              variant="primary"
              compact
              disabled={selected.size !== 4}
            />
          </View>
        </View>
      )}

      {/* Hold-to-confirm give up — ends the daily as a loss, reveals the groups. */}
      {!gameOver && (
        <View style={styles.giveUpRow}>
          <GiveUpButton onGiveUp={handleGiveUp} />
        </View>
      )}

      {/* Result sheet — over the finished board */}
      <GameOverSheet
        visible={showModal}
        win={won && !restoredUnknown}
        verdict={restoredUnknown ? 'ALREADY PLAYED' : won ? 'WELL PLAYED!' : 'FULL TIME'}
        subtitle={
          restoredUnknown
            ? 'Come back tomorrow for a new board'
            : won
              ? `You solved it with ${mistakes} mistake${mistakes !== 1 ? 's' : ''}!`
              : 'Better luck next time'
        }
        glyphs={
          restoredUnknown
            ? undefined
            : [
                ...solvedCategories.map(() => 'correct' as const),
                ...Array.from({ length: mistakes }, () => 'wrong' as const),
              ]
        }
        shareRef={shareRef}
        shareText={shareText}
        onPlayAgain={initPuzzle}
        onDismiss={() => setShowModal(false)}
        currentModeKey="connections">
        <PopInView delay={150}>
          {restoredUnknown ? (
            // End state unknown (pre-blob completion): rank the recorded score.
            <RankBadge
              rank={getRank(useDailyProgressStore.getState().scoresByMode['connections'] ?? 0, 4)}
              unit="groups"
            />
          ) : (
            <RankBadge rank={connectionsRank(solvedCategories.length, mistakes)} unit="groups" />
          )}
        </PopInView>
        {!isPractice && <SolveTimeResult mode="connections" />}

        {/* Show all categories */}
        <View style={styles.modalCategories}>
          {puzzle.categories.map((cat) => {
            const group = connectionsGroupColor(cat.difficulty, theme.dark);
            return (
              <View key={cat.name} style={[styles.modalCatRow, { backgroundColor: group.bg }]}>
                <Text style={[styles.modalCatName, { color: group.text }]}>{cat.name}</Text>
                <Text style={[styles.modalCatPlayers, { color: group.text }]}>
                  {cat.playerNames.join(', ')}
                </Text>
              </View>
            );
          })}
        </View>
      </GameOverSheet>

      {/* Offscreen shareable view */}
      <View style={styles.offscreen}>
        <View ref={shareRef} collapsable={false}>
          <ShareableConnectionsResult
            categories={puzzle.categories}
            solvedOrder={solvedCategories.map((s) => s.name)}
            mistakes={mistakes}
          />
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      ...type.h3,
      color: c.textPrimary,
    },
    oneAwayBanner: {
      alignSelf: 'center',
      marginTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: c.streakSoft,
      borderWidth: 1,
      borderColor: c.streak,
    },
    oneAwayText: {
      ...type.captionBold,
      color: c.streakBright,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    hintBanner: {
      alignSelf: 'center',
      marginTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accent,
    },
    hintText: {
      ...type.captionBold,
      color: c.accentBright,
      textAlign: 'center',
    },
    mistakesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    mistakesLabel: {
      ...type.caption,
      color: c.textSecondary,
    },
    spacer: {
      flex: 1,
      minHeight: spacing.sm,
      // Capped: uncapped flex parked the controls at the very bottom of tall
      // phones — a dead band above them, Give Up kissing the tab bar.
      maxHeight: spacing.xxl * 2,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
    },
    buttonWrapper: {
      flex: 1,
    },
    giveUpRow: {
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    modalCategories: {
      width: '100%',
      gap: spacing.sm,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    modalCatRow: {
      borderRadius: borderRadius.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
    },
    modalCatName: {
      ...type.captionBold,
      textTransform: 'uppercase',
      letterSpacing: 1,
      // Longer archetype titles wrap — keep them centered.
      textAlign: 'center',
    },
    modalCatPlayers: {
      ...type.micro,
      marginTop: 2,
      textAlign: 'center',
    },
    offscreen: {
      position: 'absolute',
      left: -9999,
    },
  });

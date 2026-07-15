import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { NotificationFeedbackType } from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams } from 'expo-router';

import { triggerNotification } from '@/lib/haptics';
import { getAllPlayers, getFameForPlayer } from '@/lib/playerData';
import {
  DailyGrid,
  generateDailyGrid,
  generateGridFromSeed,
  hintForCell,
  scoreCorrectPick,
} from '@/lib/gridEngine';
import { getRank } from '@/lib/rankLadder';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { getModeSeed, getTodayDateString } from '@/lib/dailySeed';
import { resolveSkillTier } from '@/lib/difficultyCurve';
import { Player } from '@/types/player';
import { spacing, borderRadius, type, motion, touch } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useSolveTimeStore, useTodaySolveTime } from '@/hooks/useSolveTimeStore';
import { useGridGameStore, GridPlacement } from '@/hooks/useGridGameStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import SolveTimeChip, { SolveTimeResult } from '@/components/ui/SolveTimeChip';
import Screen from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import GridCell from '@/components/ui/GridCell';
import GridHeaderCell, { ROW_HEADER_WIDTH } from '@/components/ui/GridHeaderCell';
import RankBadge from '@/components/ui/RankBadge';
import Tappable from '@/components/ui/Tappable';
import PlayerSearchAutocomplete from '@/components/ui/PlayerSearchAutocomplete';
import GameOverActions from '@/components/ui/GameOverActions';
import GiveUpButton from '@/components/ui/GiveUpButton';
import ShareableGridResult from '@/components/ShareableGridResult';
import { buildShareText } from '@/lib/sharing';
import { playCheer } from '@/lib/sounds';

const TOTAL_GUESSES = 9;
const TOTAL_HINTS = 3;

function practiceDateToDate(dateStr?: string): Date | undefined {
  return dateStr ? new Date(`${dateStr}T00:00:00`) : undefined;
}

const cellKey = (row: number, col: number) => `${row}-${col}`;

export default function ExploreScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { practiceDate } = useLocalSearchParams<{ practiceDate?: string }>();
  const isPractice = !!practiceDate;

  // Daily persistence hydration gate — the board must not render (or bind a
  // fresh day) until yesterday's/today's stored placements are loaded.
  const [hydrated, setHydrated] = useState(() => useGridGameStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    const unsub = useGridGameStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, [hydrated]);

  // Replay seed: null = the real daily/practice grid; a number = a fresh
  // post-completion "Play Again" board (never persisted).
  const [replaySeed, setReplaySeed] = useState<number | null>(null);

  const [grid, setGrid] = useState<DailyGrid | null>(null);

  // Board state (mirrors useGridGameStore for the daily run; purely local for
  // practice and replays).
  const [placements, setPlacements] = useState<Record<string, GridPlacement>>({});
  const [usedIds, setUsedIds] = useState<Set<number>>(new Set());
  // Wrong guesses per cell ("row-col" -> playerIds): a wrong pick costs a guess
  // but keeps the square open, and the same player can't be re-wasted on it.
  const [wrongByCell, setWrongByCell] = useState<Record<string, number[]>>({});
  const [guessesUsed, setGuessesUsed] = useState(0);
  const [points, setPoints] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wrongFlashKey, setWrongFlashKey] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [hintName, setHintName] = useState<string | null>(null);

  const shareRef = useRef<View>(null);
  const wrongFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);
  const todaySolveMs = useTodaySolveTime('grid');
  const allPlayers = useMemo(() => getAllPlayers(), []);

  // The daily board persists; replays/practice start clean.
  const isDailyRun = !isPractice && replaySeed === null;

  // Build the grid + bind/restore board state.
  useEffect(() => {
    if (!hydrated && !isPractice && replaySeed === null) return;

    let nextGrid: DailyGrid;
    if (replaySeed !== null) {
      nextGrid = generateGridFromSeed(replaySeed, getTodayDateString(), 0);
    } else if (isPractice) {
      // Practice/archive: deterministic from the practice date, neutral tier,
      // so every player sees the same past puzzle.
      nextGrid = generateDailyGrid(practiceDate!, 0);
    } else {
      const today = getTodayDateString();
      // Lock the tier for the day: completing the daily trains the skill
      // rating, and a re-entry must restore THIS grid, not a re-tiered one.
      const tier = useGridGameStore.getState().lockTier(today, resolveSkillTier('grid'));
      nextGrid = generateDailyGrid(today, tier);
      useGridGameStore.getState().bindDaily(today, nextGrid.id, tier);
    }

    setGrid(nextGrid);
    if (replaySeed === null && !isPractice) {
      // Restore today's placed answers (empty object on a fresh day).
      const s = useGridGameStore.getState();
      setPlacements({ ...s.placements });
      setUsedIds(new Set(s.usedPlayerIds));
      setWrongByCell({ ...(s.wrongByCell ?? {}) });
      setGuessesUsed(s.guessesUsed);
      setPoints(s.points);
      setHintsUsed(s.hintsUsed);
    } else {
      setPlacements({});
      setUsedIds(new Set());
      setWrongByCell({});
      setGuessesUsed(0);
      setPoints(0);
      setHintsUsed(0);
    }
    setActiveCell(null);
    setHintName(null);
    setWrongFlashKey(null);
  }, [hydrated, isPractice, practiceDate, replaySeed]);

  useEffect(
    () => () => {
      if (wrongFlashTimer.current) clearTimeout(wrongFlashTimer.current);
    },
    [],
  );

  const score = Object.keys(placements).length;
  const guessesLeft = TOTAL_GUESSES - guessesUsed;
  const gameOver = guessesLeft <= 0 || score === 9;
  const deepCutCount = Object.values(placements).filter((p) => p.deepCut).length;

  const shareText = useMemo(() => {
    const correctCells = Array.from({ length: 3 }, (_, r) =>
      Array.from({ length: 3 }, (_, c) => !!placements[cellKey(r, c)]),
    );
    return buildShareText({
      mode: 'grid',
      dailyNumber: getDailyNumber(practiceDateToDate(practiceDate)),
      dailyStreak,
      score,
      correctCells,
      // Practice shares must not carry today's daily time.
      solveTimeMs: isPractice ? null : todaySolveMs,
    });
  }, [placements, score, dailyStreak, practiceDate, isPractice, todaySolveMs]);

  // Daily XP is awarded once, at game over (awardDailyXp is itself guarded to
  // once per mode per local day, so replays and re-entries add nothing).
  useEffect(() => {
    if (gameOver && isDailyRun && grid) {
      useManagerStore.getState().awardDailyXp('grid', Math.max(points, score));
    }
  }, [gameOver, isDailyRun, grid, points, score]);

  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (gameOver) return;
      // Solve-time stopwatch starts on the first cell open (daily runs only).
      if (isDailyRun) useSolveTimeStore.getState().markStarted('grid');
      setHintName(null);
      setActiveCell({ row, col });
    },
    [gameOver, isDailyRun],
  );

  const closeSheet = useCallback(() => {
    setActiveCell(null);
    setHintName(null);
  }, []);

  const handleSelectPlayer = useCallback(
    (player: Player) => {
      if (!activeCell || !grid || gameOver) return;
      const { row, col } = activeCell;
      const key = cellKey(row, col);
      const cell = grid.cells[row][col];
      // Reject a player already placed (used up) or already tried wrong on THIS
      // cell — a duplicate must never silently burn a guess.
      if (usedIds.has(player.id) || (wrongByCell[key] ?? []).includes(player.id)) {
        closeSheet();
        return;
      }
      const isCorrect = cell.matches(player);
      const nextGuessesUsed = guessesUsed + 1;

      setGuessesUsed(nextGuessesUsed);

      let nextScore = score;
      if (isCorrect) {
        triggerNotification(NotificationFeedbackType.Success);
        // A correct pick fills the square and uses the player up board-wide.
        setUsedIds((prev) => new Set(prev).add(player.id));
        // Rarity proxy: an obscure correct pick is a "deep cut" worth bonus
        // points on top of the base square. XP is awarded once at game over.
        const pick = scoreCorrectPick(getFameForPlayer(player)?.fame_score);
        const placement: GridPlacement = {
          playerId: player.id,
          playerName: player.name,
          deepCut: pick.deepCut,
        };
        setPlacements((prev) => ({ ...prev, [key]: placement }));
        setPoints((p) => p + pick.total);
        nextScore = score + 1;
        if (nextScore === 9) playCheer();
        if (isDailyRun) useGridGameStore.getState().recordCorrect(key, placement, pick.total);
      } else {
        triggerNotification(NotificationFeedbackType.Error);
        // The square stays OPEN — retry it with someone else. The guess is what's
        // spent; the wrong player is barred from this square only (may answer
        // another).
        setWrongByCell((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), player.id] }));
        setWrongFlashKey(key);
        if (wrongFlashTimer.current) clearTimeout(wrongFlashTimer.current);
        wrongFlashTimer.current = setTimeout(() => setWrongFlashKey(null), 700);
        if (isDailyRun) useGridGameStore.getState().recordWrong(key, player.id);
      }

      // Practice/replay runs never touch progress, XP or streak.
      if (isDailyRun && (nextScore === 9 || nextGuessesUsed >= TOTAL_GUESSES)) {
        useDailyProgressStore.getState().markCompleted('grid', nextScore);
        // Time PB only counts on a perfect grid (a fast partial isn't a best).
        useSolveTimeStore.getState().markCompleted('grid', { countsForBest: nextScore === 9 });
      }

      closeSheet();
    },
    [activeCell, grid, gameOver, guessesUsed, score, isDailyRun, usedIds, wrongByCell, closeSheet],
  );

  const handleHint = useCallback(() => {
    if (!activeCell || !grid || hintsUsed >= TOTAL_HINTS) return;
    const hint = hintForCell(grid.cells[activeCell.row][activeCell.col], usedIds);
    if (!hint) return;
    setHintName(hint.name);
    setHintsUsed((h) => h + 1);
    if (isDailyRun) useGridGameStore.getState().recordHint();
  }, [activeCell, grid, hintsUsed, usedIds, isDailyRun]);

  // Give up: end the run now with the squares filled so far, taking the exact
  // same finish path as running out of guesses — spend every remaining guess
  // (which flips gameOver and lets the XP effect fire once), and for the daily
  // run record completion + persist so re-entry restores the finished board.
  const handleGiveUp = useCallback(() => {
    if (gameOver) return;
    closeSheet();
    setGuessesUsed(TOTAL_GUESSES);
    if (isDailyRun) {
      useGridGameStore.getState().giveUp(TOTAL_GUESSES);
      useDailyProgressStore.getState().markCompleted('grid', score);
      // A given-up grid is never perfect, so it can't set a solve-time best.
      useSolveTimeStore.getState().markCompleted('grid', { countsForBest: false });
    }
  }, [gameOver, isDailyRun, score, closeSheet]);

  const handleNewGame = useCallback(() => {
    // Practice keeps replaying the same past-day puzzle deterministically (the
    // grid stays; only the board resets); daily "Play Again" deals a fresh
    // random board (never persisted).
    if (isPractice) {
      setPlacements({});
      setUsedIds(new Set());
      setWrongByCell({});
      setGuessesUsed(0);
      setPoints(0);
      setHintsUsed(0);
      setActiveCell(null);
      setHintName(null);
    } else {
      setReplaySeed(Date.now() ^ getModeSeed('grid'));
    }
  }, [isPractice]);

  if (!grid) {
    return (
      <Screen scroll={false}>
        <ScreenHeader eyebrow={isPractice ? 'Practice' : 'Daily'} title="The Grid" modeKey="grid" />
        <View style={layoutStyles.loadingWrap}>
          <Text style={styles.loadingText}>Setting up the board…</Text>
        </View>
      </Screen>
    );
  }

  const activeRowCat = activeCell ? grid.rows[activeCell.row] : null;
  const activeColCat = activeCell ? grid.cols[activeCell.col] : null;
  const activeCellWrongIds = activeCell
    ? (wrongByCell[cellKey(activeCell.row, activeCell.col)] ?? [])
    : [];
  const hintsLeft = TOTAL_HINTS - hintsUsed;

  return (
    <Screen>
      <ScreenHeader
        eyebrow={
          isPractice ? 'Practice' : `Daily #${getDailyNumber(practiceDateToDate(practiceDate))}`
        }
        title="The Grid"
        modeKey="grid"
        right={
          <View style={layoutStyles.headerStats}>
            <Text style={styles.scoreValue}>{score}/9</Text>
            <Text style={styles.guessesValue}>
              {guessesLeft} {guessesLeft === 1 ? 'guess' : 'guesses'} left
            </Text>
            {!isPractice && <SolveTimeChip mode="grid" />}
          </View>
        }
      />

      {/* Board — column headers */}
      <Animated.View entering={FadeIn.duration(motion.base)}>
        <View style={layoutStyles.headerRow}>
          <View style={layoutStyles.cornerSpacer} />
          {grid.cols.map((cat) => (
            <GridHeaderCell key={cat.key} category={cat} axis="col" />
          ))}
        </View>

        {/* Rows */}
        {grid.cells.map((row, rowIdx) => (
          <View key={grid.rows[rowIdx].key} style={layoutStyles.gridRow}>
            <GridHeaderCell category={grid.rows[rowIdx]} axis="row" />
            {row.map((_, colIdx) => {
              const key = cellKey(rowIdx, colIdx);
              const placed = placements[key];
              return (
                <GridCell
                  key={key}
                  state={
                    placed
                      ? 'correct'
                      : wrongFlashKey === key
                        ? 'wrong'
                        : activeCell?.row === rowIdx && activeCell?.col === colIdx
                          ? 'selected'
                          : 'empty'
                  }
                  playerName={placed?.playerName}
                  deepCut={placed?.deepCut}
                  onPress={() => handleCellPress(rowIdx, colIdx)}
                  disabled={gameOver || !!placed}
                />
              );
            })}
          </View>
        ))}

        {/* Guess pips + rarity meter — always visible under the board */}
        <View style={styles.statusStrip}>
          <View style={layoutStyles.pipRow}>
            {Array.from({ length: TOTAL_GUESSES }, (_, i) => (
              <View
                key={i}
                style={[styles.pip, i < guessesUsed ? styles.pipUsed : styles.pipFree]}
              />
            ))}
          </View>
          <Text style={styles.rarityText}>
            {points} pts
            {deepCutCount > 0 ? ` · ${deepCutCount} deep cut${deepCutCount === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
      </Animated.View>

      {/* One-guess-left tension: a nudge, never guilt. */}
      {!gameOver && guessesLeft === 1 && (
        <Text style={styles.tensionLine}>Last guess. Make it count.</Text>
      )}

      {/* Give up — active play only, hidden while the search sheet is open. */}
      {!gameOver && !activeCell && (
        <View style={layoutStyles.giveUpRow}>
          <GiveUpButton onGiveUp={handleGiveUp} />
        </View>
      )}

      {/* Game over */}
      {gameOver && (
        <Animated.View entering={FadeIn.duration(motion.base)} style={layoutStyles.gameOverSection}>
          <View style={styles.verdictBanner}>
            <Text style={styles.verdictTitle}>{score === 9 ? 'PERFECT GRID!' : 'FULL TIME'}</Text>
            <Text style={styles.verdictScore}>{score}/9</Text>
            <Text style={styles.verdictSubtitle}>
              {score === 9 ? 'All nine, flawless.' : `You filled ${score} of 9 squares.`}
            </Text>
            <RankBadge
              rank={getRank(score, 9)}
              unit={getRank(score, 9).toNext === 1 ? 'square' : 'squares'}
            />
            {isDailyRun && <SolveTimeResult mode="grid" />}
            <Text style={styles.pointsLine}>{points} pts (deep cuts count double)</Text>
          </View>
          <GameOverActions
            shareRef={shareRef}
            shareText={shareText}
            win={score === 9}
            onPlayAgain={handleNewGame}
            currentModeKey="grid"
          />
        </Animated.View>
      )}

      {/* Cell search sheet */}
      <Modal
        visible={!!activeCell && !gameOver}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}>
        <View style={styles.sheetScrim}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={layoutStyles.sheetAvoider}>
            <View style={styles.sheetPanel}>
              <Text style={styles.sheetKicker}>FIND A PLAYER WHO…</Text>
              {activeRowCat && activeColCat && (
                <Text style={styles.sheetTitle}>
                  {activeRowCat.clause}
                  {'  ·  '}
                  {activeColCat.clause}
                </Text>
              )}
              <PlayerSearchAutocomplete
                players={allPlayers}
                onSelectPlayer={handleSelectPlayer}
                filter={(p) => !usedIds.has(p.id) && !activeCellWrongIds.includes(p.id)}
                placeholder="Search any player…"
                autoFocus
              />
              <View style={layoutStyles.sheetFooter}>
                <Tappable
                  onPress={handleHint}
                  disabled={hintsLeft <= 0}
                  haptic="none"
                  hoverStyle={{ backgroundColor: colors.streakSoft }}
                  style={[styles.hintButton, hintsLeft <= 0 && layoutStyles.hintButtonDisabled]}>
                  <FontAwesome
                    name="lightbulb-o"
                    size={14}
                    color={hintsLeft > 0 ? colors.streak : colors.textMuted}
                  />
                  <Text
                    style={[styles.hintButtonText, hintsLeft <= 0 && styles.hintButtonTextMuted]}>
                    Hint ({hintsLeft}/{TOTAL_HINTS})
                  </Text>
                </Tappable>
                {hintName ? <Text style={styles.hintSuggestion}>Try: {hintName}</Text> : null}
                <View style={layoutStyles.footerSpacer} />
                <Tappable
                  onPress={closeSheet}
                  haptic="none"
                  hoverStyle={{ backgroundColor: colors.bgCardPressed }}
                  style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Tappable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Offscreen shareable view */}
      <View style={layoutStyles.offscreen}>
        <View ref={shareRef} collapsable={false}>
          <ShareableGridResult
            cellStates={Array.from({ length: 3 }, (_, r) =>
              Array.from({ length: 3 }, (_, c) =>
                placements[cellKey(r, c)] ? 'correct' : 'empty',
              ),
            )}
            score={score}
          />
        </View>
      </View>
    </Screen>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  headerStats: {
    alignItems: 'flex-end',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cornerSpacer: {
    width: ROW_HEADER_WIDTH,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  pipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  gameOverSection: {
    marginTop: spacing.lg,
  },
  giveUpRow: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  sheetAvoider: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  footerSpacer: {
    flex: 1,
  },
  hintButtonDisabled: {
    opacity: 0.35,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    loadingText: {
      ...type.body,
      color: c.textSecondary,
    },
    scoreValue: {
      ...type.score,
      color: c.accent,
    },
    guessesValue: {
      ...type.micro,
      color: c.textSecondary,
      marginTop: 2,
    },
    statusStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    pip: {
      width: 8,
      height: 8,
      borderRadius: borderRadius.full,
    },
    pipFree: {
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    pipUsed: {
      backgroundColor: c.textMuted,
    },
    rarityText: {
      ...type.micro,
      color: c.textSecondary,
    },
    tensionLine: {
      ...type.captionBold,
      color: c.streak,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    pointsLine: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: spacing.xs,
    },
    verdictBanner: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.accentSoft,
    },
    verdictTitle: {
      ...type.h2,
      color: c.accent,
      textTransform: 'uppercase',
    },
    verdictScore: {
      ...type.scoreLarge,
      color: c.textPrimary,
      marginTop: spacing.xs,
    },
    verdictSubtitle: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    sheetScrim: {
      flex: 1,
      backgroundColor: c.scrim,
    },
    sheetPanel: {
      marginTop: spacing.xxl * 2,
      marginHorizontal: spacing.lg,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
    },
    sheetKicker: {
      ...type.micro,
      color: c.accent,
      letterSpacing: 1.5,
    },
    sheetTitle: {
      ...type.bodyBold,
      color: c.textPrimary,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    hintButton: {
      minHeight: touch.min,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.streak,
      backgroundColor: c.streakSoft,
    },
    hintButtonText: {
      ...type.captionBold,
      color: c.streak,
    },
    hintButtonTextMuted: {
      color: c.textMuted,
    },
    hintSuggestion: {
      ...type.caption,
      fontStyle: 'italic',
      color: c.streak,
      flexShrink: 1,
    },
    cancelButton: {
      minHeight: touch.min,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
    },
    cancelText: {
      ...type.captionBold,
      color: c.textSecondary,
    },
  });

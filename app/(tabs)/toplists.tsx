import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { NotificationFeedbackType } from 'expo-haptics';

import { Player } from '@/types/player';
import { getAllPlayersWithCareer } from '@/lib/playerData';
import PlayerSearchAutocomplete, {
  PlayerSearchAutocompleteHandle,
} from '@/components/ui/PlayerSearchAutocomplete';
import { spacing, borderRadius, type, touch, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import Tappable from '@/components/ui/Tappable';
import PopInView from '@/components/ui/PopInView';
import { triggerImpact, triggerNotification } from '@/lib/haptics';
import { getRank } from '@/lib/rankLadder';
import RankBadge from '@/components/ui/RankBadge';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { getDailyTopList, matchGuess } from '@/lib/topListsGenerator';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyResultsStore } from '@/hooks/useDailyResultsStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import { useSolveTimeStore, useTodaySolveTime } from '@/hooks/useSolveTimeStore';
import { SolveTimeResult } from '@/components/ui/SolveTimeChip';
import Screen, { TAB_BAR_HEIGHT } from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ShakeView from '@/components/ui/ShakeView';
import LivesIndicator from '@/components/ui/LivesIndicator';
import GiveUpButton from '@/components/ui/GiveUpButton';
import GameOverActions from '@/components/ui/GameOverActions';
import NextPuzzleCountdown from '@/components/ui/NextPuzzleCountdown';
import ShareableTopListsResult from '@/components/ShareableTopListsResult';
import { buildShareText } from '@/lib/sharing';
import { playCheer, playCrossbar } from '@/lib/sounds';

const MAX_LIVES = 4;

export default function TopListsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const list = useMemo(() => getDailyTopList(), []);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);
  const shareRef = useRef<View>(null);
  const searchRef = useRef<PlayerSearchAutocompleteHandle>(null);
  // Suggestion pool includes retired career-path legends — Top Lists ranks
  // historic players (all-time scorers etc.), not just the active DB.
  const allPlayers = useMemo(() => getAllPlayersWithCareer(), []);

  // Strict once-per-day: if today's puzzle is already recorded, open straight
  // into the reveal state (no replay).
  const [alreadyPlayed] = useState(() => useDailyProgressStore.getState().isCompleted('toplists'));
  // Restored end state (found slots + lives) persisted at completion, so the
  // ALREADY PLAYED panel shows the real result. Null for completions recorded
  // before the blob existed (falls back to a score-only panel).
  const [restoredResult] = useState(() =>
    alreadyPlayed
      ? useDailyResultsStore.getState().getResult<{ found: number[]; lives: number }>('toplists')
      : null,
  );

  const [foundIndices, setFoundIndices] = useState<Set<number>>(
    () => new Set(restoredResult?.found ?? []),
  );
  const [lives, setLives] = useState(restoredResult ? restoredResult.lives : MAX_LIVES);
  const [guess, setGuess] = useState('');
  const [shakeWrong, setShakeWrong] = useState(false);
  const [finished, setFinished] = useState(false);

  const total = list.entries.length;
  const allFound = foundIndices.size === total;
  const revealAll = alreadyPlayed || finished;

  const finishRun = useCallback(
    (found: Set<number>, livesLeft: number) => {
      setFinished(true);
      const foundCount = found.size;
      const won = foundCount === total;
      // Award at most once per local day (Top Lists has no replay, but keep the
      // guard consistent with the other daily modes).
      useManagerStore.getState().awardDailyXp('toplists', foundCount * 10 + (won ? 50 : 0));
      useDailyProgressStore.getState().markCompleted('toplists', foundCount);
      // Solve time: losses never set a PB. (Top Lists has no practice mode, so
      // every finishRun IS the daily run.)
      useSolveTimeStore.getState().markCompleted('toplists', { countsForBest: won });
      // Persist the end state so re-entry restores the real result panel.
      useDailyResultsStore
        .getState()
        .setResult('toplists', { found: Array.from(found), lives: livesLeft });
      if (won) playCheer();
      else playCrossbar();
    },
    [total],
  );

  // One submit path for both entry modes: tapping an autocomplete suggestion
  // (canonical player name) and the raw-text GUESS button. Match semantics
  // (matchGuess), lives and scoring are unchanged.
  const submitText = useCallback(
    (raw: string) => {
      if (revealAll) return;
      const text = raw.trim();
      if (!text) return;

      // Solve-time stopwatch starts on the first real guess (no-ops after).
      useSolveTimeStore.getState().markStarted('toplists');

      const idx = matchGuess(list, text);
      setGuess('');
      searchRef.current?.clear();

      if (idx == null) {
        // Wrong guess costs a life. Compute the next value outside the setState
        // updater — finishRun sets state on this and other stores, and calling it
        // from inside an updater is a setState-during-render violation.
        triggerNotification(NotificationFeedbackType.Error);
        setShakeWrong(true);
        setTimeout(() => setShakeWrong(false), 450);
        const nextLives = Math.max(0, lives - 1);
        setLives(nextLives);
        if (nextLives <= 0) finishRun(foundIndices, 0);
        return;
      }

      // Duplicate correct guess is a free no-op.
      if (foundIndices.has(idx)) {
        triggerImpact();
        return;
      }

      triggerNotification(NotificationFeedbackType.Success);
      const nextFound = new Set(foundIndices).add(idx);
      setFoundIndices(nextFound);
      if (nextFound.size === total) finishRun(nextFound, lives);
    },
    [revealAll, list, lives, foundIndices, total, finishRun],
  );

  const submitGuess = useCallback(() => submitText(guess), [submitText, guess]);

  const handleSelectPlayer = useCallback((player: Player) => submitText(player.name), [submitText]);

  // Give up: reveal every remaining name and finish with what was found — a
  // graceful exit for a stalled board, scored on the names already named.
  const handleGiveUp = useCallback(() => {
    if (revealAll) return;
    finishRun(foundIndices, lives);
  }, [revealAll, finishRun, foundIndices, lives]);

  const solveTimeMs = useTodaySolveTime('toplists');

  const livesUsed = MAX_LIVES - lives;
  const slots = list.entries.map((_, i) => foundIndices.has(i));
  const shareText = buildShareText({
    mode: 'toplists',
    dailyNumber: getDailyNumber(),
    dailyStreak,
    found: foundIndices.size,
    total,
    livesUsed,
    slots,
    solveTimeMs,
  });
  // Restored score for the already-played panel: prefer the blob's slots, fall
  // back to the recorded daily score (pre-blob completions).
  const restoredScore = restoredResult
    ? foundIndices.size
    : (useDailyProgressStore.getState().scoresByMode['toplists'] ?? 0);
  const resultScore = finished ? foundIndices.size : restoredScore;

  return (
    <Screen>
      <ScreenHeader
        eyebrow={`Daily #${getDailyNumber()}`}
        title="Top Lists"
        modeKey="toplists"
        right={
          !revealAll ? (
            <View style={styles.headerStats}>
              <Text style={styles.foundValue}>
                {foundIndices.size}/{total}
              </Text>
              <View style={styles.livesWrap}>
                <LivesIndicator size="sm" total={MAX_LIVES} remaining={lives} />
              </View>
            </View>
          ) : undefined
        }
      />

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{list.title}</Text>
        {list.as_of ? <Text style={styles.asOf}>as of {list.as_of}</Text> : null}
      </View>

      {/* Live rank ladder (goal-gradient): current tier + names to the next rank,
          so a long list never feels like all-or-nothing. */}
      {!revealAll && <RankBadge rank={getRank(foundIndices.size, total)} unit="names" />}

      <ShakeView shake={shakeWrong}>
        <View style={styles.list}>
          {list.entries.map((entry, i) => {
            const revealed = revealAll || foundIndices.has(i);
            return (
              // Staggered one-time entrance (mount only) — reveals just restyle
              // the row in place, so guessing never re-runs the animation.
              <Animated.View
                key={i}
                entering={i < 12 ? FadeIn.delay(i * 40).duration(motion.base) : undefined}
                style={[styles.row, revealed && styles.rowRevealed]}>
                <Text style={styles.rank}>{entry.rank}</Text>
                <Text style={[styles.name, !revealed && styles.nameHidden]} numberOfLines={1}>
                  {revealed ? entry.name : '???'}
                </Text>
                <Text style={styles.value}>
                  {entry.value}
                  {entry.unit ? ` ${entry.unit}` : ''}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </ShakeView>

      {!revealAll && (
        <View style={styles.inputRow}>
          {/* Type-ahead suggestions (shared fame-blended search); the GUESS
              button still submits the raw text so names outside the player DB
              (or partial surnames) keep working exactly as before. */}
          <View style={layoutStyles.searchWrap}>
            <PlayerSearchAutocomplete
              ref={searchRef}
              players={allPlayers}
              onSelectPlayer={handleSelectPlayer}
              onQueryChange={setGuess}
              placeholder="Name a player..."
              dropDirection="up"
            />
          </View>
          <Tappable
            haptic="none"
            style={styles.submitButton}
            hoverStyle={{ backgroundColor: colors.accentBright }}
            onPress={submitGuess}
            testID="toplists-guess">
            <Text style={styles.submitText}>GUESS</Text>
          </Tappable>
        </View>
      )}

      {!revealAll && (
        <View style={styles.giveUpRow}>
          <GiveUpButton onGiveUp={handleGiveUp} />
        </View>
      )}

      {revealAll && (
        <Animated.View entering={FadeIn.duration(motion.base)} style={styles.resultBlock}>
          <Text style={[styles.resultTitle, resultScore === total ? styles.won : styles.lost]}>
            {alreadyPlayed && !finished
              ? 'ALREADY PLAYED TODAY'
              : allFound
                ? 'FULL MARKS!'
                : 'FULL TIME'}
          </Text>
          <Text style={styles.resultScoreLine}>
            {resultScore}/{total} named
          </Text>
          <PopInView delay={150}>
            <RankBadge rank={getRank(resultScore, total)} unit="names" />
          </PopInView>
          <SolveTimeResult mode="toplists" />
          {finished || restoredResult ? (
            // Live game-over AND blob-restored re-entries get the full action
            // stack (no Play Again — Top Lists is strictly once per day).
            <GameOverActions
              shareRef={shareRef}
              shareText={shareText}
              win={resultScore === total}
            />
          ) : (
            // Pre-blob restored fallback: score-only panel with the countdown.
            <View style={styles.countdownWrap}>
              <NextPuzzleCountdown />
            </View>
          )}
        </Animated.View>
      )}

      {/* Keep the last game-over card clear of the floating tab bar. */}
      {revealAll && <View style={layoutStyles.bottomSpacer} />}

      {(finished || restoredResult) && (
        <View style={styles.offscreen}>
          <View ref={shareRef} collapsable={false}>
            <ShareableTopListsResult
              title={list.title}
              found={foundIndices.size}
              total={total}
              livesUsed={livesUsed}
              slots={slots}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

// Layout-only styles stay module-scope (see DESIGN_SYSTEM.md).
const layoutStyles = StyleSheet.create({
  searchWrap: {
    flex: 1,
  },
  bottomSpacer: {
    height: TAB_BAR_HEIGHT + spacing.lg,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    headerStats: {
      alignItems: 'flex-end',
    },
    foundValue: {
      ...type.score,
      color: c.accent,
    },
    livesWrap: {
      marginTop: spacing.xs,
    },
    listHeader: {
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    listTitle: {
      ...type.h3,
      color: c.textPrimary,
      textAlign: 'center',
    },
    asOf: {
      ...type.micro,
      color: c.textMuted,
      marginTop: 2,
    },
    list: {
      gap: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    rowRevealed: {
      borderColor: c.accentBorder,
      backgroundColor: c.accentSoft,
    },
    rank: {
      ...type.score,
      color: c.textSecondary,
      width: 22,
    },
    name: {
      flex: 1,
      ...type.bodyBold,
      color: c.textPrimary,
    },
    nameHidden: {
      color: c.textMuted,
      letterSpacing: 2,
    },
    value: {
      ...type.score,
      color: c.streak,
    },
    inputRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
      zIndex: 10,
    },
    submitButton: {
      minHeight: touch.min,
      borderRadius: borderRadius.md,
      backgroundColor: c.accent,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    submitText: {
      ...type.bodyBold,
      color: c.textOnAccent,
      letterSpacing: 1,
      // Fast/double clicks on web must not select the button label.
      userSelect: 'none',
    },
    giveUpRow: {
      alignItems: 'center',
      marginTop: spacing.md,
    },
    resultBlock: {
      alignItems: 'center',
      marginTop: spacing.xl,
      gap: spacing.md,
    },
    resultTitle: {
      ...type.h1,
    },
    resultScoreLine: {
      ...type.score,
      color: c.textPrimary,
    },
    won: { color: c.accent },
    lost: { color: c.danger },
    countdownWrap: {
      marginTop: spacing.sm,
    },
    offscreen: {
      position: 'absolute',
      left: -9999,
    },
  });

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, UIManager, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useLocalSearchParams } from 'expo-router';
import { NotificationFeedbackType } from 'expo-haptics';

import { Player } from '@/types/player';
import { triggerNotification } from '@/lib/haptics';
import { getRank } from '@/lib/rankLadder';
import { targetHasAgeSignal } from '@/lib/comparePlayers';
import RankBadge from '@/components/ui/RankBadge';
import { useGuessGameStore } from '@/hooks/useGuessGameStore';
import { getAllPlayers } from '@/lib/playerData';
import { spacing, borderRadius, type, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import PopInView from '@/components/ui/PopInView';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useSolveTimeStore, useTodaySolveTime } from '@/hooks/useSolveTimeStore';
import { SolveTimeResult } from '@/components/ui/SolveTimeChip';
import Screen from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import PlayerSearchAutocomplete, {
  PlayerSearchAutocompleteHandle,
} from '@/components/ui/PlayerSearchAutocomplete';
import LastChanceHint from '@/components/ui/LastChanceHint';
import PracticePill from '@/components/ui/PracticePill';
import PlayerCard from '@/components/ui/PlayerCard';
import PlayerPhoto from '@/components/ui/PlayerPhoto';
import { getPlayerPhoto } from '@/lib/playerPhotos';
import ResultModal from '@/components/ui/ResultModal';
import RetroButton from '@/components/ui/RetroButton';
import { useManagerStore } from '@/hooks/useManagerStore';
import { playCheer, playCrossbar } from '@/lib/sounds';
import GiveUpButton from '@/components/ui/GiveUpButton';
import { TierBadge } from '@/components/career/TierBadge';
import { getPlayerDifficultyTier } from '@/lib/dailyPuzzle';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function WhoAreYaScreen() {
  const {
    guesses,
    gameStatus,
    targetPlayer,
    maxGuesses,
    dailyNumber,
    initGame,
    initPracticeGame,
    makeGuess,
    giveUp,
    resetGame,
    isPractice: storeIsPractice,
  } = useGuessGameStore();

  const { practiceDate } = useLocalSearchParams<{ practiceDate?: string }>();
  // A run is practice if it entered from the archive (route param) OR became a
  // "Play Again" replay (store flag). Either way it must not touch XP/streak.
  const isPractice = !!practiceDate || storeIsPractice;

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showModal, setShowModal] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintText, setHintText] = useState('');
  // Free blurred-photo clue toggle; local to the screen like the hint state.
  const [showPhoto, setShowPhoto] = useState(false);

  // Hide the toggle entirely for players we have no licensed photo for.
  const hasPhoto = useMemo(() => getPlayerPhoto(targetPlayer?.id) != null, [targetPlayer?.id]);

  const allPlayers = useMemo(() => getAllPlayers(), []);
  // Clears the search box after a typed full name auto-solves.
  const searchRef = useRef<PlayerSearchAutocompleteHandle>(null);

  useEffect(() => {
    if (practiceDate) {
      initPracticeGame(practiceDate);
    } else {
      initGame();
    }
  }, [initGame, initPracticeGame, practiceDate]);

  // Hint state is local to the screen; clear it whenever the puzzle target
  // changes (day rollover, practice entry/exit) or a stale hint from the
  // previous game leaks into the new one.
  useEffect(() => {
    setHintUsed(false);
    setHintText('');
    setShowPhoto(false);
  }, [targetPlayer?.id]);

  useEffect(() => {
    if (gameStatus === 'won') {
      // Practice/archive runs never touch progress, XP or streak.
      if (!isPractice) {
        const xp = 50 + (maxGuesses - guesses.length) * 10;
        // awardDailyXp is guarded to once per mode per local day, so a same-day
        // replay that slips past isPractice still can't inflate the XP total.
        useManagerStore.getState().awardDailyXp('who-are-ya', xp);
        useDailyProgressStore.getState().markCompleted('who-are-ya', guesses.length);
        // Wins can set a time PB (no-ops on restored/replayed completions).
        useSolveTimeStore.getState().markCompleted('who-are-ya', { countsForBest: true });
      }
      playCheer();
      const timer = setTimeout(() => setShowModal(true), 500);
      return () => clearTimeout(timer);
    }
    if (gameStatus === 'lost') {
      if (!isPractice) {
        useManagerStore.getState().awardDailyXp('who-are-ya', 10);
        useDailyProgressStore.getState().markCompleted('who-are-ya', 0);
        // Losses never set a time PB.
        useSolveTimeStore.getState().markCompleted('who-are-ya', { countsForBest: false });
      }
      playCrossbar();
      const timer = setTimeout(() => setShowModal(true), 500);
      return () => clearTimeout(timer);
    }
    // Intentionally keyed on the status transition only (mirrors careerpath).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus]);

  const excludeIds = useMemo(() => new Set(guesses.map((g) => g.player.id)), [guesses]);

  const handleSelectPlayer = useCallback(
    (player: Player) => {
      // Solve-time stopwatch starts on the first real guess (no-ops after).
      // Practice/archive runs never touch the daily stopwatch.
      if (!isPractice) useSolveTimeStore.getState().markStarted('who-are-ya');
      const result = makeGuess(player);
      if (result?.isCorrect) {
        triggerNotification(NotificationFeedbackType.Success);
      } else {
        triggerNotification(NotificationFeedbackType.Error);
      }
    },
    [makeGuess, isPractice],
  );

  // Typing never auto-guesses (owner call 2026-07-15): a guess is made ONLY
  // by tapping a suggestion row.

  // Hints are free for launch: no ad SDK ships, so no ad gate (an "(Ad)"
  // button that never shows an ad is an App Store rejection). Re-gate on
  // rewarded ads only when a real SDK lands.
  const handleHint = useCallback(() => {
    if (!targetPlayer || hintUsed) return;

    // A hint is a meaningful first interaction too (daily runs only).
    if (!isPractice) useSolveTimeStore.getState().markStarted('who-are-ya');

    setHintUsed(true);
    setHintText(`Nationality: ${targetPlayer.nationality}`);
  }, [targetPlayer, hintUsed, isPractice]);

  const reversedGuesses = useMemo(() => [...guesses].reverse(), [guesses]);

  const isPlaying = gameStatus === 'playing';
  const isLastChance = isPlaying && guesses.length === maxGuesses - 1;

  // Map the result onto the universal rank ladder (getRank), monotonic in both
  // branches: a win ranks by how few guesses it took (never below mid-ladder), a
  // loss ranks by the most attribute columns any single guess confirmed.
  const resultRank = useMemo(() => {
    if (gameStatus === 'won') {
      const unused = maxGuesses - guesses.length; // 0..maxGuesses-1
      const score = Math.round(50 + (unused / Math.max(1, maxGuesses - 1)) * 50); // 50..100
      return getRank(score, 100);
    }
    if (gameStatus === 'lost') {
      const bestColumns = guesses.reduce((max, g) => {
        const correct = Object.values(g.comparisons).filter((c) => c.status === 'CORRECT').length;
        return Math.max(max, correct);
      }, 0);
      return getRank(bestColumns, 5); // 5 attribute columns
    }
    return null;
  }, [gameStatus, guesses, maxGuesses]);

  // When the target has no DOB the age column is a dead '?' for every guess, so
  // present it as informative-only (greyed) rather than a live clue.
  const ageColumnActive = targetPlayer ? targetHasAgeSignal(targetPlayer) : true;

  // Today's daily solve time for the share text (never attached to practice).
  const solveTimeMs = useTodaySolveTime('who-are-ya');

  return (
    <Screen scroll={false}>
      <ScreenHeader
        eyebrow={isPractice ? 'Practice' : `Daily #${dailyNumber}`}
        title="Who Are Ya?"
        modeKey="who-are-ya"
        right={
          <Text style={styles.guessCounterText}>
            {guesses.length}/{maxGuesses}
          </Text>
        }
      />

      {practiceDate && <PracticePill date={practiceDate} />}

      {targetPlayer &&
        (() => {
          const tier = getPlayerDifficultyTier(targetPlayer.id);
          return tier ? (
            <View style={styles.tierRow}>
              <TierBadge tier={tier} />
            </View>
          ) : null;
        })()}

      {isLastChance && <LastChanceHint />}

      {isPlaying && targetPlayer && hasPhoto && (
        // Row (photo beside its toggle), not a stack: on phones every point
        // of chrome height here comes straight out of the guess list below.
        <View style={styles.photoClue}>
          {/* The clue sharpens with every guess spent. Multiplicative decay
              (×0.7 per guess: 25, 18, 12, 9, 6, 4, 3, 2), not linear steps —
              25px vs 22px both read as identical mush, while a ~30% cut is
              visible every time. Floors at 2 so it NEVER renders fully sharp
              while playing. */}
          {showPhoto && (
            <Animated.View entering={FadeIn.duration(motion.base)} style={styles.photoClueImage}>
              <PlayerPhoto
                playerId={targetPlayer.id}
                name={targetPlayer.name}
                size={96}
                blur={Math.max(2, Math.round(25 * Math.pow(0.7, guesses.length)))}
              />
            </Animated.View>
          )}
          <RetroButton
            title={showPhoto ? 'Hide Photo' : 'Show Photo'}
            onPress={() => setShowPhoto((v) => !v)}
            variant="secondary"
          />
        </View>
      )}

      {isPlaying && (
        <View style={styles.searchContainer}>
          <PlayerSearchAutocomplete
            ref={searchRef}
            players={allPlayers}
            onSelectPlayer={handleSelectPlayer}
            excludeIds={excludeIds}
            placeholder="Search player..."
          />
        </View>
      )}

      {/* Hint + Give Up share one row — stacked they cost the guess list
          ~100pt of height on phones. */}
      {isPlaying && guesses.length >= 1 && (
        <View style={styles.actionsRow}>
          {!hintUsed && guesses.length >= 2 && (
            <RetroButton title="Get a Hint" onPress={handleHint} variant="secondary" />
          )}
          <GiveUpButton onGiveUp={giveUp} />
        </View>
      )}

      {hintUsed && hintText !== '' && (
        <Animated.View entering={FadeIn.duration(motion.base)} style={styles.hintBox}>
          <Text style={styles.hintText}>{hintText}</Text>
        </Animated.View>
      )}

      {!isPlaying && resultRank && (
        <PopInView delay={150}>
          <RankBadge rank={resultRank} />
          {!isPractice && <SolveTimeResult mode="who-are-ya" />}
        </PopInView>
      )}

      <View style={styles.columnHeaders}>
        {['Team', 'League', 'Nat', 'Pos', 'Age'].map((h) => {
          const dead = h === 'Age' && !ageColumnActive;
          return (
            <View key={h} style={[styles.columnHeaderItem, dead && styles.columnHeaderItemDead]}>
              <Text style={[styles.columnHeaderText, dead && styles.columnHeaderTextDead]}>
                {h}
              </Text>
            </View>
          );
        })}
      </View>

      <FlatList
        style={styles.list}
        data={reversedGuesses}
        keyExtractor={(item) => String(item.player.id)}
        renderItem={({ item }) => (
          // New guesses mount one at a time, so each new row animates in once;
          // existing rows never re-run the entrance.
          <Animated.View entering={FadeIn.duration(motion.base)}>
            <PlayerCard guess={item} />
          </Animated.View>
        )}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        contentContainerStyle={styles.flatListContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>{'⚽'}</Text>
            <Text style={styles.emptyText}>Search for a player to start guessing</Text>
          </View>
        }
      />

      <ResultModal
        visible={showModal}
        status={gameStatus}
        targetName={targetPlayer?.name ?? ''}
        targetPlayerId={targetPlayer?.id}
        guessCount={guesses.length}
        maxGuesses={maxGuesses}
        dailyNumber={dailyNumber}
        guesses={guesses}
        solveTimeMs={isPractice ? null : solveTimeMs}
        onClose={() => setShowModal(false)}
        onPlayAgain={() => {
          resetGame();
          setShowModal(false);
        }}
      />
    </Screen>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    guessCounterText: {
      ...type.score,
      color: c.accent,
    },
    tierRow: {
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    searchContainer: {
      position: 'relative',
      zIndex: 10,
      marginBottom: spacing.md,
    },
    photoClue: {
      marginBottom: spacing.md,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    photoClueImage: {
      alignItems: 'center',
    },
    actionsRow: {
      marginBottom: spacing.md,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    hintBox: {
      marginBottom: spacing.md,
      alignItems: 'center',
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: c.streak,
      backgroundColor: c.streakSoft,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    hintText: {
      ...type.bodyBold,
      color: c.streak,
    },
    columnHeaders: {
      marginBottom: spacing.sm,
      flexDirection: 'row',
      gap: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    columnHeaderItem: {
      flex: 1,
      alignItems: 'center',
      borderRadius: borderRadius.full,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    columnHeaderItemDead: {
      opacity: 0.5,
    },
    columnHeaderText: {
      ...type.micro,
      textTransform: 'uppercase',
      color: c.textSecondary,
    },
    columnHeaderTextDead: {
      color: c.textMuted,
    },
    list: {
      flex: 1,
    },
    flatListContent: {
      paddingBottom: spacing.lg,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxxl,
    },
    emptyEmoji: {
      ...type.display,
    },
    emptyText: {
      marginTop: spacing.lg,
      textAlign: 'center',
      ...type.body,
      color: c.textSecondary,
    },
  });

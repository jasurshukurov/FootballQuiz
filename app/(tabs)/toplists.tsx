import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NotificationFeedbackType } from 'expo-haptics';

import { colors, fonts, spacing, borderRadius, gradients } from '@/constants/theme';
import { triggerImpact, triggerNotification } from '@/lib/haptics';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { getDailyTopList, matchGuess } from '@/lib/topListsGenerator';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import ShakeView from '@/components/ui/ShakeView';
import GameOverActions from '@/components/ui/GameOverActions';
import NextPuzzleCountdown from '@/components/ui/NextPuzzleCountdown';
import TutorialOverlay from '@/components/ui/TutorialOverlay';
import ShareableTopListsResult from '@/components/ShareableTopListsResult';
import { buildShareText } from '@/lib/sharing';
import { playCheer, playCrossbar } from '@/lib/sounds';

const MAX_LIVES = 4;

export default function TopListsScreen() {
  const list = useMemo(() => getDailyTopList(), []);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);
  const shareRef = useRef<View>(null);

  // Strict once-per-day: if today's puzzle is already recorded, open straight
  // into the reveal state (no replay).
  const [alreadyPlayed] = useState(() => useDailyProgressStore.getState().isCompleted('toplists'));

  const [foundIndices, setFoundIndices] = useState<Set<number>>(new Set());
  const [lives, setLives] = useState(MAX_LIVES);
  const [guess, setGuess] = useState('');
  const [shakeWrong, setShakeWrong] = useState(false);
  const [finished, setFinished] = useState(false);

  const total = list.entries.length;
  const allFound = foundIndices.size === total;
  const revealAll = alreadyPlayed || finished;

  const finishRun = useCallback(
    (found: Set<number>) => {
      setFinished(true);
      const foundCount = found.size;
      const won = foundCount === total;
      useManagerStore.getState().addXp('toplists', foundCount * 10 + (won ? 50 : 0));
      useDailyProgressStore.getState().markCompleted('toplists', foundCount);
      if (won) playCheer();
      else playCrossbar();
    },
    [total],
  );

  const submitGuess = useCallback(() => {
    if (revealAll) return;
    const text = guess.trim();
    if (!text) return;

    const idx = matchGuess(list, text);
    setGuess('');

    if (idx == null) {
      // Wrong guess costs a life. Compute the next value outside the setState
      // updater — finishRun sets state on this and other stores, and calling it
      // from inside an updater is a setState-during-render violation.
      triggerNotification(NotificationFeedbackType.Error);
      setShakeWrong(true);
      setTimeout(() => setShakeWrong(false), 450);
      const nextLives = Math.max(0, lives - 1);
      setLives(nextLives);
      if (nextLives <= 0) finishRun(foundIndices);
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
    if (nextFound.size === total) finishRun(nextFound);
  }, [revealAll, guess, list, lives, foundIndices, total, finishRun]);

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
  });

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>TOP LISTS</Text>
            <Text style={styles.listTitle}>{list.title}</Text>
            {list.as_of ? <Text style={styles.asOf}>as of {list.as_of}</Text> : null}
          </View>

          {!revealAll && (
            <View style={styles.statusRow}>
              <Text style={styles.statusText}>
                {foundIndices.size}/{total} found
              </Text>
              <Text style={styles.livesText}>
                {'❤️'.repeat(lives) + '🖤'.repeat(MAX_LIVES - lives)}
              </Text>
            </View>
          )}

          <ShakeView shake={shakeWrong}>
            <View style={styles.list}>
              {list.entries.map((entry, i) => {
                const revealed = revealAll || foundIndices.has(i);
                return (
                  <View key={i} style={[styles.row, revealed && styles.rowRevealed]}>
                    <Text style={styles.rank}>{entry.rank}</Text>
                    <Text style={[styles.name, !revealed && styles.nameHidden]} numberOfLines={1}>
                      {revealed ? entry.name : '???'}
                    </Text>
                    <Text style={styles.value}>
                      {entry.value}
                      {entry.unit ? ` ${entry.unit}` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ShakeView>

          {!revealAll && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={guess}
                onChangeText={setGuess}
                placeholder="Name a player..."
                placeholderTextColor={colors.steelGray}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={submitGuess}
              />
              <Pressable style={styles.submitButton} onPress={submitGuess}>
                <Text style={styles.submitText}>GUESS</Text>
              </Pressable>
            </View>
          )}

          {revealAll && (
            <View style={styles.resultBlock}>
              <Text style={[styles.resultTitle, allFound ? styles.won : styles.lost]}>
                {alreadyPlayed && !finished
                  ? 'ALREADY PLAYED TODAY'
                  : allFound
                    ? 'FULL MARKS!'
                    : 'FULL TIME'}
              </Text>
              {finished && !alreadyPlayed ? (
                <GameOverActions shareRef={shareRef} shareText={shareText} win={allFound} />
              ) : (
                <View style={styles.countdownWrap}>
                  <NextPuzzleCountdown />
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {finished && !alreadyPlayed && (
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

        <TutorialOverlay
          modeKey="toplists"
          title="Top Lists"
          description="Name the players on today's list (e.g. 'World Cup all-time top scorers'). Each slot shows only the number until you guess it. 4 wrong guesses allowed!"
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg },
  scroll: { paddingBottom: 120, paddingTop: spacing.md },
  header: { alignItems: 'center', marginBottom: spacing.md },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.pitchGreen,
    letterSpacing: 3,
  },
  listTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.chalkWhite,
    textAlign: 'center',
    marginTop: 4,
  },
  asOf: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.steelGray,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusText: {
    fontFamily: fonts.scoreboard,
    fontSize: 16,
    color: colors.pitchGreen,
  },
  livesText: {
    fontSize: 16,
  },
  list: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(17,17,40,0.6)',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  rowRevealed: {
    borderColor: 'rgba(5,242,108,0.3)',
    backgroundColor: 'rgba(5,242,108,0.08)',
  },
  rank: {
    fontFamily: fonts.scoreboard,
    fontSize: 14,
    color: colors.steelGray,
    width: 22,
  },
  name: {
    flex: 1,
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.chalkWhite,
  },
  nameHidden: {
    color: colors.steelGray,
    letterSpacing: 2,
  },
  value: {
    fontFamily: fonts.scoreboard,
    fontSize: 14,
    color: colors.cardYellow,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.steelGray,
    backgroundColor: 'rgba(17,17,40,0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.chalkWhite,
    fontFamily: fonts.subheading,
    fontSize: 15,
  },
  submitButton: {
    borderRadius: borderRadius.md,
    backgroundColor: colors.pitchGreen,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.retroBlack,
    letterSpacing: 1,
  },
  resultBlock: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  resultTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    letterSpacing: 1,
  },
  won: { color: colors.pitchGreen },
  lost: { color: colors.cardRed },
  countdownWrap: {
    marginTop: spacing.sm,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

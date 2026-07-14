import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { NotificationFeedbackType } from 'expo-haptics';

import { Player } from '@/types/player';
import { triggerImpact, triggerNotification } from '@/lib/haptics';
import { shortenClubName } from '@/lib/clubNames';
import Tappable from '@/components/ui/Tappable';
import SoccerPitch from '@/components/games/SoccerPitch';
import GlassCard from '@/components/ui/GlassCard';
import PlayerSearchAutocomplete from '@/components/ui/PlayerSearchAutocomplete';
import RetroButton from '@/components/ui/RetroButton';
import TeamCrest from '@/components/ui/TeamCrest';
import Screen from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import RankBadge from '@/components/ui/RankBadge';
import { getRank } from '@/lib/rankLadder';
import { TierBadge } from '@/components/career/TierBadge';
import {
  getAllMatches,
  getPlayableMatches,
  getDailyMatch,
  getMatchTier,
  getMatchCategory,
  buildGuessPool,
  buildSlotIndex,
  resolveGuess,
} from '@/lib/matchData';
import { Match } from '@/types/match';
import { spacing, borderRadius, type, motion, touch } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { getModeSeed, createSeededRandom } from '@/lib/dailySeed';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import { useSolveTimeStore, useTodaySolveTime } from '@/hooks/useSolveTimeStore';
import { SolveTimeResult } from '@/components/ui/SolveTimeChip';
import { useProStore } from '@/hooks/useProStore';
import { showRewardedAd, loadRewardedAd } from '@/lib/ads';
import ShareableMissing11Result from '@/components/ShareableMissing11Result';
import GameOverActions from '@/components/ui/GameOverActions';
import GameOverExtras from '@/components/ui/GameOverExtras';
import LivesIndicator from '@/components/ui/LivesIndicator';
import GiveUpButton from '@/components/career/GiveUpButton';
import { buildShareText } from '@/lib/sharing';
import { playWhistle, playCheer, playCrossbar } from '@/lib/sounds';

type GameState = 'playing' | 'won' | 'lost';

// Full names for the 4-4-2 slots the pitch lays out (index-aligned to
// SoccerPitch's FORMATION_ROWS), used for the tap-a-slot position hint.
const POSITION_HINT: string[] = [
  'Goalkeeper',
  'Left-back',
  'Centre-back',
  'Centre-back',
  'Right-back',
  'Left midfield',
  'Central midfield',
  'Central midfield',
  'Right midfield',
  'Striker',
  'Striker',
];

export default function Missing11Screen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [match, setMatch] = useState<Match | null>(null);
  const [teamSide, setTeamSide] = useState<'a' | 'b'>('a');
  const [revealedSlots, setRevealedSlots] = useState<Set<number>>(new Set());
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<GameState>('playing');
  // Guesses found by the player before a loss reveals the remaining slots
  // (revealedSlots is overwritten with all 11 on loss, which misreported
  // "11/11 players found" on the game-over card).
  const [finalFound, setFinalFound] = useState<number | null>(null);
  const [focusedSlot, setFocusedSlot] = useState<number | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);
  // Game-over "View pitch" mode: hides the result card so the revealed XI can
  // be studied; a floating pill brings the card back.
  const [pitchView, setPitchView] = useState(false);
  const shareRef = useRef<View>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintText, setHintText] = useState('');
  // Seeded RNG for the current game: set to the daily mode seed on first play so
  // everyone gets the same match, side and hint; reseeded randomly on "Play again".
  const gameRng = useRef<() => number>(() => Math.random());
  // Daily re-entry restoration: recorded result at MOUNT time restores the
  // game-over panel over the revealed XI instead of dealing the daily again.
  const [restoredDaily] = useState(() => useDailyProgressStore.getState().isCompleted('missing11'));

  const isPro = useProStore((s) => s.isPro);

  useEffect(() => {
    loadRewardedAd();
  }, []);

  useEffect(() => {
    if (getAllMatches().length === 0) return;
    // Deterministic daily match: gated by the day's difficulty band over match
    // notability, then a rotation walk so it never repeats until the band cycles.
    const rng = createSeededRandom(getModeSeed('missing11'));
    gameRng.current = rng;
    const dailyMatch = getDailyMatch(getDailyNumber());
    const side = rng() < 0.5 ? 'a' : 'b';
    setMatch(dailyMatch);
    setTeamSide(side as 'a' | 'b');
    if (restoredDaily) {
      // Completed daily re-entry: restore the terminal panel over the fully
      // revealed XI (mirrors the live loss reveal; a win found all 11 anyway).
      // A loss can only end with 0 lives; a win means found === 11.
      const found = useDailyProgressStore.getState().scoresByMode['missing11'] ?? 0;
      const won = found >= 11;
      const allSlots = new Set<number>();
      for (let i = 0; i < 11; i++) allSlots.add(i);
      setRevealedSlots(allSlots);
      setFinalFound(found);
      if (!won) setLives(0);
      setGameState(won ? 'won' : 'lost');
      return;
    }
    playWhistle();
    // Mount-only initialization by design (restoredDaily is fixed at mount).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lineupNames = useMemo(() => {
    if (!match) return [];
    return teamSide === 'a' ? match.lineup_a_names : match.lineup_b_names;
  }, [match, teamSide]);

  const teamName = match ? (teamSide === 'a' ? match.opponent_a : match.opponent_b) : '';
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);

  const foundCount = finalFound ?? revealedSlots.size;

  const solveTimeMs = useTodaySolveTime('missing11');

  const shareText = useMemo(
    () =>
      buildShareText({
        mode: 'missing11',
        dailyNumber: getDailyNumber(),
        dailyStreak,
        found: foundCount,
        total: 11,
        teamName,
        solveTimeMs,
      }),
    [dailyStreak, foundCount, teamName, solveTimeMs],
  );

  // Autocomplete is fed the ENTIRE player universe (12k+), never the 11 answers,
  // so typing one letter can't list the lineup. buildSlotIndex maps a folded
  // name straight to the slot the player wore, enabling auto-placement.
  const guessPool = useMemo<Player[]>(() => buildGuessPool(lineupNames), [lineupNames]);
  // match_id activates the alias identity layer: picking the DB row of a
  // team-sheet name spelled differently ("Sergio Aguero" for "Aguero") counts.
  const slotIndex = useMemo(
    () => buildSlotIndex(lineupNames, match?.match_id),
    [lineupNames, match],
  );

  const finishGame = useCallback((won: boolean, found: number) => {
    setFinalFound(found);
    setGameState(won ? 'won' : 'lost');
    // Daily-only XP: rewards the count found, with a completion bonus. awardDailyXp
    // is guarded to once per mode per local day so replays add nothing.
    useManagerStore.getState().awardDailyXp('missing11', found * 20 + (won ? 50 : 0));
    useDailyProgressStore.getState().markCompleted('missing11', found);
    // Losses never set a time PB. Same-day Play-Again replays no-op in the store.
    useSolveTimeStore.getState().markCompleted('missing11', { countsForBest: won });
    if (won) {
      playCheer();
    } else {
      playCrossbar();
      const allSlots = new Set<number>();
      for (let i = 0; i < 11; i++) allSlots.add(i);
      setRevealedSlots(allSlots);
    }
  }, []);

  const handleGuessPlayer = useCallback(
    (player: Player) => {
      if (gameState !== 'playing') return;

      // Solve-time stopwatch starts on the first real guess (no-ops after; the
      // store also ignores post-daily Play-Again replays).
      useSolveTimeStore.getState().markStarted('missing11');

      // Pass the whole player: id-alias acceptance needs more than the name.
      const outcome = resolveGuess(player, slotIndex, revealedSlots);

      if (outcome.kind === 'already') {
        // Harmless re-guess of an already-placed player: no reward, no penalty.
        triggerImpact();
        return;
      }

      if (outcome.kind === 'correct') {
        triggerNotification(NotificationFeedbackType.Success);
        const newRevealed = new Set(revealedSlots);
        newRevealed.add(outcome.slot);
        setRevealedSlots(newRevealed);
        setFocusedSlot(null);
        if (newRevealed.size === 11) {
          finishGame(true, 11);
        }
        return;
      }

      // Wrong: the player never started this XI — costs a life.
      triggerNotification(NotificationFeedbackType.Error);
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 500);
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        finishGame(false, revealedSlots.size);
      }
    },
    [gameState, slotIndex, revealedSlots, lives, finishGame],
  );

  // Tapping a slot reveals its position (a free recall nudge), never a guess.
  const handleSlotPress = useCallback(
    (index: number) => {
      if (gameState !== 'playing' || revealedSlots.has(index)) return;
      // A slot peek is a meaningful first interaction too.
      useSolveTimeStore.getState().markStarted('missing11');
      triggerImpact();
      setFocusedSlot(index);
    },
    [gameState, revealedSlots],
  );

  const handleHint = useCallback(async () => {
    if (hintUsed || lineupNames.length === 0) return;

    const unrevealedIndices = lineupNames.map((_, i) => i).filter((i) => !revealedSlots.has(i));
    if (unrevealedIndices.length === 0) return;

    // A hint is a meaningful first interaction too.
    useSolveTimeStore.getState().markStarted('missing11');

    const giveHint = () => {
      const randomIndex =
        unrevealedIndices[Math.floor(gameRng.current() * unrevealedIndices.length)];
      const playerName = lineupNames[randomIndex];
      const firstLetter = playerName.charAt(0).toUpperCase();
      setHintUsed(true);
      setHintText(
        `Position ${randomIndex + 1} (${POSITION_HINT[randomIndex]}) starts with '${firstLetter}'`,
      );
    };

    if (isPro) {
      giveHint();
      return;
    }

    const rewarded = await showRewardedAd();
    if (rewarded) {
      giveHint();
      loadRewardedAd();
    } else {
      Alert.alert('Ad not available', 'Please try again later.');
    }
  }, [hintUsed, lineupNames, revealedSlots, isPro]);

  // Give up: reveal the full XI and end as a loss with what was found so far —
  // a graceful "here's the answer" exit, never a shaming one (finishGame fills
  // every slot on a loss).
  const handleGiveUp = useCallback(() => {
    if (gameState !== 'playing') return;
    finishGame(false, revealedSlots.size);
  }, [gameState, revealedSlots, finishGame]);

  const handleNewGame = useCallback(() => {
    const matches = getPlayableMatches();
    if (matches.length === 0) return;
    const rng = createSeededRandom(Date.now());
    gameRng.current = rng;
    const randomMatch = matches[Math.floor(rng() * matches.length)];
    const side = rng() < 0.5 ? 'a' : 'b';
    setMatch(randomMatch);
    setTeamSide(side as 'a' | 'b');
    setRevealedSlots(new Set());
    setLives(3);
    setFinalFound(null);
    setGameState('playing');
    setFocusedSlot(null);
    setWrongFlash(false);
    setPitchView(false);
    setHintUsed(false);
    setHintText('');
  }, []);

  if (!match) {
    return (
      <Screen scroll={false}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading match...</Text>
        </View>
      </Screen>
    );
  }

  const matchTitle = `${match.competition} ${match.season}`;
  const matchSubtitle = `${shortenClubName(match.opponent_a)} ${match.score} ${shortenClubName(match.opponent_b)}`;
  // Difficulty tier (shared vocabulary with Career Path / Who Are Ya) and the
  // category · era chip. Both are derived from data the header already shows —
  // structure, not extra reveals.
  const matchTier = getMatchTier(match);
  const matchCategory = getMatchCategory(match);

  return (
    <Screen>
      <ScreenHeader
        eyebrow={`Daily #${getDailyNumber()}`}
        title="Missing XI"
        modeKey="missing11"
        right={
          <View style={styles.headerStats}>
            <Text style={styles.foundValue}>{foundCount}/11</Text>
            <View style={styles.livesRow}>
              <LivesIndicator size="sm" total={3} remaining={lives} />
            </View>
          </View>
        }
      />

      {/* Match header (club names shortened for display only) */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <TierBadge tier={matchTier} />
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>
              {matchCategory.label} · {matchCategory.era}
            </Text>
          </View>
        </View>
        <Text style={styles.matchTitle}>{matchTitle}</Text>
        <View style={styles.matchTeams}>
          <TeamCrest teamName={match.opponent_a} size={18} />
          <Text style={styles.matchSubtitle}>{matchSubtitle}</Text>
          <TeamCrest teamName={match.opponent_b} size={18} />
        </View>
        <Text style={styles.guessTeamLabel}>Name the {shortenClubName(teamName)} starting XI</Text>
      </View>

      {/* Pitch */}
      <SoccerPitch
        match={match}
        teamSide={teamSide}
        revealedSlots={revealedSlots}
        shakingSlot={null}
        onSlotPress={handleSlotPress}
      />

      {/* Guess bar (auto-places into the matching slot) + hints */}
      {gameState === 'playing' && (
        <View style={styles.guessSection}>
          {focusedSlot !== null && (
            <Animated.View entering={FadeIn.duration(motion.base)}>
              <Text style={styles.slotHint}>
                Slot {focusedSlot + 1}: {POSITION_HINT[focusedSlot]}. Who wore it?
              </Text>
            </Animated.View>
          )}
          <PlayerSearchAutocomplete
            players={guessPool}
            onSelectPlayer={handleGuessPlayer}
            placeholder="Name any player from this XI..."
            dropDirection="up"
          />
          <View style={styles.guessMeta}>
            <Text style={[styles.wrongHint, wrongFlash && styles.wrongHintActive]}>
              {wrongFlash ? 'Not in this XI, life lost' : 'A wrong name costs a life'}
            </Text>
            {!hintUsed && revealedSlots.size < 11 && (
              <RetroButton
                title={isPro ? 'Hint' : 'Hint (Ad)'}
                onPress={handleHint}
                variant="secondary"
              />
            )}
          </View>
          {hintUsed && hintText !== '' && (
            <Animated.View entering={FadeIn.duration(motion.base)} style={styles.hintBox}>
              <Text style={styles.hintTextValue}>{hintText}</Text>
            </Animated.View>
          )}
          <View style={styles.giveUpRow}>
            <GiveUpButton onGiveUp={handleGiveUp} />
          </View>
        </View>
      )}

      {/* Game over overlay — translucent scrim keeps the revealed XI dimly
          visible; "View pitch" hides the card entirely so it can be studied,
          and a floating pill brings the results back. Gentle fades only. */}
      {gameState !== 'playing' && !pitchView && (
        <Animated.View entering={FadeIn.duration(motion.base)} style={styles.gameOverOverlay}>
          <Animated.View
            entering={FadeIn.delay(100).duration(motion.base)}
            style={styles.gameOverCardWrap}>
            <GlassCard style={styles.gameOverCard}>
              <View style={styles.gameOverContent}>
                <Text
                  style={[
                    styles.gameOverTitle,
                    gameState === 'won' ? styles.gameOverTitleWon : styles.gameOverTitleLost,
                  ]}>
                  {gameState === 'won' ? 'COMPLETE!' : 'FULL TIME'}
                </Text>
                <Text style={styles.gameOverScore}>{foundCount}/11 players named</Text>
                <RankBadge rank={getRank(foundCount, 11)} unit="players" />
                <SolveTimeResult mode="missing11" />
                <GameOverActions
                  shareRef={shareRef}
                  shareText={shareText}
                  win={gameState === 'won'}
                  onPlayAgain={handleNewGame}
                  playAgainLabel="PLAY AGAIN"
                  includeExtras={false}
                />
              </View>
            </GlassCard>
            <Tappable
              haptic="none"
              onPress={() => setPitchView(true)}
              accessibilityLabel="View pitch"
              style={styles.viewPitchButton}>
              <Text style={styles.viewPitchText}>View pitch</Text>
            </Tappable>
          </Animated.View>
          <GameOverExtras win={gameState === 'won'} />
        </Animated.View>
      )}
      {gameState !== 'playing' && pitchView && (
        <Animated.View
          entering={FadeIn.duration(motion.base)}
          pointerEvents="box-none"
          style={styles.showResultsWrap}>
          <Tappable
            haptic="none"
            onPress={() => setPitchView(false)}
            accessibilityLabel="Show results"
            style={styles.showResultsPill}>
            <Text style={styles.showResultsText}>Show results</Text>
          </Tappable>
        </Animated.View>
      )}

      {/* Offscreen shareable view */}
      <View style={styles.offscreen}>
        <View ref={shareRef} collapsable={false}>
          <ShareableMissing11Result
            teamName={teamName}
            found={foundCount}
            revealedSlots={revealedSlots}
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
    headerStats: {
      alignItems: 'flex-end',
    },
    foundValue: {
      ...type.score,
      color: c.accent,
      letterSpacing: 1,
    },
    livesRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    giveUpRow: {
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    header: {
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    categoryChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
    },
    categoryChipText: {
      ...type.captionBold,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    matchTitle: {
      ...type.captionBold,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    matchTeams: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    matchSubtitle: {
      ...type.h3,
      color: c.textPrimary,
    },
    guessTeamLabel: {
      marginTop: spacing.xs,
      ...type.captionBold,
      color: c.accent,
    },
    guessSection: {
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    slotHint: {
      ...type.captionBold,
      color: c.streak,
      textAlign: 'center',
    },
    guessMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    wrongHint: {
      ...type.caption,
      color: c.textMuted,
      flexShrink: 1,
    },
    wrongHintActive: {
      color: c.danger,
    },
    hintBox: {
      alignItems: 'center',
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: c.streak,
      backgroundColor: c.streakSoft,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    hintTextValue: {
      ...type.bodyBold,
      color: c.streak,
    },
    gameOverOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.scrim,
      zIndex: 10,
    },
    gameOverCardWrap: {
      width: '80%',
    },
    gameOverCard: {
      width: '100%',
    },
    gameOverContent: {
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.lg,
    },
    gameOverTitle: {
      ...type.h1,
      textTransform: 'uppercase',
    },
    gameOverTitleWon: {
      color: c.accent,
    },
    gameOverTitleLost: {
      color: c.danger,
    },
    gameOverScore: {
      ...type.h3,
      color: c.textPrimary,
    },
    viewPitchButton: {
      alignSelf: 'center',
      marginTop: spacing.md,
      minHeight: touch.min,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
    },
    viewPitchText: {
      ...type.captionBold,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      userSelect: 'none',
    },
    showResultsWrap: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: spacing.xxl,
      zIndex: 10,
    },
    showResultsPill: {
      minHeight: touch.min,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.bgElevated,
    },
    showResultsText: {
      ...type.captionBold,
      color: c.accent,
      textTransform: 'uppercase',
      letterSpacing: 1,
      userSelect: 'none',
    },
    offscreen: {
      position: 'absolute',
      left: -9999,
    },
  });

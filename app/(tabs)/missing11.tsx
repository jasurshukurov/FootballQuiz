import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NotificationFeedbackType } from 'expo-haptics';

import { Player } from '@/types/player';
import { triggerImpact, triggerNotification } from '@/lib/haptics';
import SoccerPitch from '@/components/games/SoccerPitch';
import GlassCard from '@/components/ui/GlassCard';
import PlayerSearchAutocomplete from '@/components/ui/PlayerSearchAutocomplete';
import RetroButton from '@/components/ui/RetroButton';
import TeamCrest from '@/components/ui/TeamCrest';
import { getAllMatches, getPlayableMatches, getDailyMatch } from '@/lib/matchData';
import { Match } from '@/types/match';
import { colors, fonts, gradients } from '@/constants/theme';
import { getModeSeed, createSeededRandom } from '@/lib/dailySeed';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import { useProStore } from '@/hooks/useProStore';
import { showRewardedAd, loadRewardedAd } from '@/lib/ads';
import ShareableMissing11Result from '@/components/ShareableMissing11Result';
import GameOverActions from '@/components/ui/GameOverActions';
import GameOverExtras from '@/components/ui/GameOverExtras';
import { buildShareText } from '@/lib/sharing';
import { playWhistle, playCheer, playCrossbar } from '@/lib/sounds';
import TutorialOverlay from '@/components/ui/TutorialOverlay';

type GameState = 'playing' | 'won' | 'lost';

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export default function Missing11Screen() {
  const [match, setMatch] = useState<Match | null>(null);
  const [teamSide, setTeamSide] = useState<'a' | 'b'>('a');
  const [revealedSlots, setRevealedSlots] = useState<Set<number>>(new Set());
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<GameState>('playing');
  // Guesses found by the player before a loss reveals the remaining slots
  // (revealedSlots is overwritten with all 11 on loss, which misreported
  // "11/11 players found" on the game-over card).
  const [finalFound, setFinalFound] = useState<number | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [shakingSlot, setShakingSlot] = useState<number | null>(null);
  const shareRef = useRef<View>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintText, setHintText] = useState('');
  // Seeded RNG for the current game: set to the daily mode seed on first play so
  // everyone gets the same match, side and hint; reseeded randomly on "Play again".
  const gameRng = useRef<() => number>(() => Math.random());

  const isPro = useProStore((s) => s.isPro);

  useEffect(() => {
    loadRewardedAd();
  }, []);

  useEffect(() => {
    if (getAllMatches().length === 0) return;
    // Deterministic no-repeat daily match (rotation walk), with a seeded RNG for
    // the side pick and hints so everyone gets the same board.
    const rng = createSeededRandom(getModeSeed('missing11'));
    gameRng.current = rng;
    const dailyMatch = getDailyMatch(getDailyNumber());
    const side = rng() < 0.5 ? 'a' : 'b';
    setMatch(dailyMatch);
    setTeamSide(side as 'a' | 'b');
    playWhistle();
  }, []);

  const lineupNames = useMemo(() => {
    if (!match) return [];
    return teamSide === 'a' ? match.lineup_a_names : match.lineup_b_names;
  }, [match, teamSide]);

  const teamName = match ? (teamSide === 'a' ? match.opponent_a : match.opponent_b) : '';
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);

  const shareText = useMemo(
    () =>
      buildShareText({
        mode: 'missing11',
        dailyNumber: getDailyNumber(),
        dailyStreak,
        found: finalFound ?? revealedSlots.size,
        total: 11,
        teamName,
      }),
    [dailyStreak, revealedSlots, teamName],
  );

  // Convert lineup names to Player objects for the autocomplete
  const lineupPlayers = useMemo<Player[]>(() => {
    return lineupNames.map((name, index) => ({
      id: index,
      name,
      normalized_name: normalize(name),
      nationality: '',
      current_team: teamName,
      league: '',
      position: '',
      market_value: 0,
      image_url: '',
    }));
  }, [lineupNames, teamName]);

  const revealedIds = useMemo(() => new Set(Array.from(revealedSlots)), [revealedSlots]);

  const handleSlotPress = useCallback(
    (index: number) => {
      if (gameState !== 'playing' || revealedSlots.has(index)) return;
      triggerImpact();
      setActiveSlot(index);
      setSearchVisible(true);
    },
    [gameState, revealedSlots],
  );

  const handleGuess = useCallback(
    (guessedName: string) => {
      if (activeSlot === null || !match) return;

      const targetName = lineupNames[activeSlot];
      const isCorrect = normalize(guessedName) === normalize(targetName);

      setSearchVisible(false);

      if (isCorrect) {
        triggerNotification(NotificationFeedbackType.Success);
        const newRevealed = new Set(revealedSlots);
        newRevealed.add(activeSlot);
        setRevealedSlots(newRevealed);

        if (newRevealed.size === 11) {
          useManagerStore.getState().addXp('missing-11', 11 * 20 + 50);
          setGameState('won');
          playCheer();
          useDailyProgressStore.getState().markCompleted('missing11', 11);
        }
      } else {
        triggerNotification(NotificationFeedbackType.Error);
        setShakingSlot(activeSlot);
        setTimeout(() => setShakingSlot(null), 500);

        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          useManagerStore.getState().addXp('missing-11', revealedSlots.size * 20);
          setFinalFound(revealedSlots.size);
          setGameState('lost');
          playCrossbar();
          // Reveal all remaining slots
          const allSlots = new Set<number>();
          for (let i = 0; i < 11; i++) allSlots.add(i);
          setRevealedSlots(allSlots);
          useDailyProgressStore.getState().markCompleted('missing11', revealedSlots.size);
        }
      }
      setActiveSlot(null);
    },
    [activeSlot, match, lineupNames, revealedSlots, lives],
  );

  const handleHint = useCallback(async () => {
    if (hintUsed || lineupNames.length === 0) return;

    const unrevealedIndices = lineupNames.map((_, i) => i).filter((i) => !revealedSlots.has(i));
    if (unrevealedIndices.length === 0) return;

    const giveHint = () => {
      const randomIndex =
        unrevealedIndices[Math.floor(gameRng.current() * unrevealedIndices.length)];
      const playerName = lineupNames[randomIndex];
      const firstLetter = playerName.charAt(0).toUpperCase();
      setHintUsed(true);
      setHintText(`Player in position ${randomIndex + 1} starts with '${firstLetter}'`);
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

  const handleGuessPlayer = useCallback(
    (player: Player) => {
      handleGuess(player.name);
    },
    [handleGuess],
  );

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
    setSearchVisible(false);
    setActiveSlot(null);
    setShakingSlot(null);
    setHintUsed(false);
    setHintText('');
  }, []);

  if (!match) {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.gradient}>
        <SafeAreaView style={styles.loadingContainer} edges={['bottom']}>
          <Text style={styles.loadingText}>Loading match...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const matchTitle = `${match.competition} ${match.season}`;
  const matchSubtitle = `${match.opponent_a} ${match.score} ${match.opponent_b}`;

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.container}>
          {/* Match header */}
          <View style={styles.header}>
            <Text style={styles.matchTitle}>{matchTitle}</Text>
            <View style={styles.matchTeams}>
              <TeamCrest teamName={match.opponent_a} size={18} />
              <Text style={styles.matchSubtitle}>{matchSubtitle}</Text>
              <TeamCrest teamName={match.opponent_b} size={18} />
            </View>
            <Text style={styles.guessTeamLabel}>Guess the {teamName} starting XI</Text>
          </View>

          {/* Score and lives */}
          <View style={styles.statusRow}>
            <Text style={styles.scoreText}>{finalFound ?? revealedSlots.size}/11 FOUND</Text>
            <View style={styles.livesRow}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Text key={i} style={[styles.lifeIcon, i >= lives && styles.lifeIconLost]}>
                  {i < lives ? '\u2764' : '\u2661'}
                </Text>
              ))}
            </View>
          </View>

          {/* Hint button */}
          {gameState === 'playing' && !hintUsed && revealedSlots.size < 11 && (
            <View style={styles.hintButton}>
              <RetroButton
                title={isPro ? 'Get a Hint' : 'Hint (Ad)'}
                onPress={handleHint}
                variant="secondary"
              />
            </View>
          )}

          {hintUsed && hintText !== '' && (
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>{hintText}</Text>
            </View>
          )}

          {/* Pitch */}
          <SoccerPitch
            match={match}
            teamSide={teamSide}
            revealedSlots={revealedSlots}
            shakingSlot={shakingSlot}
            onSlotPress={handleSlotPress}
          />

          {/* Game over overlay */}
          {gameState !== 'playing' && (
            <View style={styles.gameOverOverlay}>
              <GlassCard style={styles.gameOverCard}>
                <View style={styles.gameOverContent}>
                  <Text style={styles.gameOverTitle}>
                    {gameState === 'won' ? 'COMPLETE!' : 'GAME OVER'}
                  </Text>
                  <Text style={styles.gameOverScore}>
                    {finalFound ?? revealedSlots.size}/11 players found
                  </Text>
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
              <GameOverExtras win={gameState === 'won'} />
            </View>
          )}

          {/* Offscreen shareable view */}
          <View style={styles.offscreen}>
            <View ref={shareRef} collapsable={false}>
              <ShareableMissing11Result
                teamName={teamName}
                found={revealedSlots.size}
                revealedSlots={revealedSlots}
              />
            </View>
          </View>

          {/* Search modal */}
          <Modal
            visible={searchVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setSearchVisible(false)}>
            <KeyboardAvoidingView
              style={styles.modalOverlay}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Pressable
                style={styles.modalBackdrop}
                onPress={() => {
                  setSearchVisible(false);
                  setActiveSlot(null);
                }}
              />
              <GlassCard style={styles.modalCard}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Who plays in this position?</Text>
                  <PlayerSearchAutocomplete
                    players={lineupPlayers}
                    onSelectPlayer={handleGuessPlayer}
                    excludeIds={revealedIds}
                    placeholder="Search player name..."
                    autoFocus
                  />
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => {
                      setSearchVisible(false);
                      setActiveSlot(null);
                    }}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                </View>
              </GlassCard>
            </KeyboardAvoidingView>
          </Modal>
          <TutorialOverlay
            modeKey="missing11"
            title="Missing XI"
            description="Name all 11 players in a real match starting lineup. Tap a position to guess!"
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.chalkWhite,
    fontFamily: fonts.subheading,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  matchTitle: {
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: colors.steelGray,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  matchSubtitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
  },
  guessTeamLabel: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: fonts.subheading,
    color: colors.pitchGreen,
  },
  hintButton: {
    marginBottom: 8,
    alignItems: 'center',
  },
  hintBox: {
    marginBottom: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,162,97,0.5)',
    backgroundColor: 'rgba(244,162,97,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  hintText: {
    fontSize: 14,
    fontFamily: fonts.heading,
    color: colors.cardYellow,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 14,
    fontFamily: fonts.scoreboard,
    color: colors.pitchGreen,
    letterSpacing: 2,
  },
  livesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  lifeIcon: {
    fontSize: 18,
    color: colors.cardRed,
  },
  lifeIconLost: {
    opacity: 0.3,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26,26,46,0.85)',
    zIndex: 10,
  },
  gameOverCard: {
    width: '80%',
  },
  gameOverContent: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  gameOverTitle: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  gameOverScore: {
    fontSize: 16,
    fontFamily: fonts.subheading,
    color: colors.chalkWhite,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalCard: {
    marginHorizontal: 8,
    marginBottom: 8,
  },
  modalContent: {
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
    textAlign: 'center',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: colors.steelGray,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

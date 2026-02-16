import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Player } from '@/types/player';
import { useGuessGameStore } from '@/hooks/useGuessGameStore';
import { useProStore } from '@/hooks/useProStore';
import { getAllPlayers } from '@/lib/playerData';
import { showRewardedAd, loadRewardedAd } from '@/lib/ads';
import { colors } from '@/constants/theme';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import PlayerSearchAutocomplete from '@/components/ui/PlayerSearchAutocomplete';
import PlayerCard from '@/components/ui/PlayerCard';
import ResultModal from '@/components/ui/ResultModal';
import RetroButton from '@/components/ui/RetroButton';
import BannerAd from '@/components/ui/BannerAd';
import { useManagerStore } from '@/hooks/useManagerStore';
import { playCheer, playCrossbar } from '@/lib/sounds';

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
    makeGuess,
    resetGame,
  } = useGuessGameStore();

  const isPro = useProStore((s) => s.isPro);

  const [showModal, setShowModal] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintText, setHintText] = useState('');

  const allPlayers = useMemo(() => getAllPlayers(), []);

  useEffect(() => {
    initGame();
    loadRewardedAd();
  }, [initGame]);

  useEffect(() => {
    if (gameStatus === 'won') {
      const xp = 50 + (maxGuesses - guesses.length) * 10;
      useManagerStore.getState().addXp('who-are-ya', xp);
      useDailyProgressStore.getState().markCompleted('who-are-ya', guesses.length);
      playCheer();
      const timer = setTimeout(() => setShowModal(true), 500);
      return () => clearTimeout(timer);
    }
    if (gameStatus === 'lost') {
      useManagerStore.getState().addXp('who-are-ya', 10);
      useDailyProgressStore.getState().markCompleted('who-are-ya', 0);
      playCrossbar();
      const timer = setTimeout(() => setShowModal(true), 500);
      return () => clearTimeout(timer);
    }
  }, [gameStatus]);

  const excludeIds = useMemo(
    () => new Set(guesses.map((g) => g.player.id)),
    [guesses],
  );

  const handleSelectPlayer = useCallback(
    (player: Player) => {
      const result = makeGuess(player);
      if (result?.isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [makeGuess],
  );

  const handleHint = useCallback(async () => {
    if (!targetPlayer || hintUsed) return;

    if (isPro) {
      setHintUsed(true);
      setHintText(`Nationality: ${targetPlayer.nationality}`);
      return;
    }

    const rewarded = await showRewardedAd();
    if (rewarded) {
      setHintUsed(true);
      setHintText(`Nationality: ${targetPlayer.nationality}`);
      loadRewardedAd();
    } else {
      Alert.alert('Ad not available', 'Please try again later.');
    }
  }, [targetPlayer, hintUsed, isPro]);

  const reversedGuesses = useMemo(() => [...guesses].reverse(), [guesses]);

  const isPlaying = gameStatus === 'playing';

  return (
    <LinearGradient
      colors={['#0D1B2A', '#1B0A2E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.container}>
          <View style={styles.guessCounter}>
            <Text style={styles.guessCounterText}>
              Guess {guesses.length}/{maxGuesses}
            </Text>
          </View>

          {isPlaying && (
            <View style={styles.searchContainer}>
              <PlayerSearchAutocomplete
                players={allPlayers}
                onSelectPlayer={handleSelectPlayer}
                excludeIds={excludeIds}
                placeholder="Search player..."
              />
            </View>
          )}

          {isPlaying && !hintUsed && guesses.length >= 2 && (
            <View style={styles.hintButton}>
              <RetroButton
                title={isPro ? 'Get a Hint' : 'Get a Hint (Ad)'}
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

          <View style={styles.columnHeaders}>
            {['Team', 'League', 'Nat', 'Pos', 'Value'].map((h) => (
              <View key={h} style={styles.columnHeaderItem}>
                <Text style={styles.columnHeaderText}>{h}</Text>
              </View>
            ))}
          </View>

          <FlatList
            data={reversedGuesses}
            keyExtractor={(item) => String(item.player.id)}
            renderItem={({ item }) => <PlayerCard guess={item} />}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            windowSize={5}
            contentContainerStyle={styles.flatListContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>{'\u26BD'}</Text>
                <Text style={styles.emptyText}>Search for a player to start guessing</Text>
              </View>
            }
          />

          <ResultModal
            visible={showModal}
            status={gameStatus}
            targetName={targetPlayer?.name ?? ''}
            guessCount={guesses.length}
            maxGuesses={maxGuesses}
            dailyNumber={dailyNumber}
            guesses={guesses}
            onClose={() => setShowModal(false)}
            onPlayAgain={() => {
              resetGame();
              setShowModal(false);
            }}
          />
        </View>
        <BannerAd />
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
    paddingTop: 16,
    paddingBottom: 100,
  },
  guessCounter: {
    marginBottom: 12,
    alignItems: 'center',
  },
  guessCounterText: {
    fontSize: 14,
    fontFamily: 'SpaceMono-Bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#05F26C',
  },
  searchContainer: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 12,
  },
  hintButton: {
    marginBottom: 12,
    alignItems: 'center',
  },
  hintBox: {
    marginBottom: 12,
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
    fontWeight: 'bold',
    color: '#F4A261',
  },
  columnHeaders: {
    marginBottom: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
  },
  columnHeaderItem: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  columnHeaderText: {
    fontSize: 10,
    fontFamily: 'BarlowCondensed-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.steelGray,
  },
  flatListContent: {
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
    color: '#6C757D',
  },
});

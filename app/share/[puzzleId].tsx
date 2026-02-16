import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getDailyNumber } from '@/lib/dailyPuzzle';
import RetroButton from '@/components/ui/RetroButton';

export default function ShareScreen() {
  const { puzzleId } = useLocalSearchParams<{ puzzleId: string }>();
  const router = useRouter();
  const id = puzzleId ? parseInt(puzzleId, 10) : NaN;
  const todayNumber = getDailyNumber();
  const isToday = id === todayNumber;

  useEffect(() => {
    if (isToday) {
      router.replace('/(tabs)');
    }
  }, [isToday, router]);

  if (isToday) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{'⚽'}</Text>
      <Text style={styles.title}>Football Quiz #{isNaN(id) ? '?' : id}</Text>
      <Text style={styles.subtitle}>This was a past puzzle. Play today&apos;s puzzle instead!</Text>
      <RetroButton title="Play Today's Puzzle" onPress={() => router.replace('/(tabs)')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 24,
  },
  emoji: {
    marginBottom: 8,
    fontSize: 36,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F5F5F0',
  },
  subtitle: {
    marginBottom: 32,
    textAlign: 'center',
    fontSize: 16,
    color: 'rgba(245,245,240,0.7)',
  },
});

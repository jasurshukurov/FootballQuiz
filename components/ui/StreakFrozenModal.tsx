import React, { useState, useEffect, useCallback } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';

import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import RetroButton from './RetroButton';

export default function StreakFrozenModal() {
  const { streakFrozenAvailable, previousStreak, repairStreak } = useDailyStateStore();
  const [visible, setVisible] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (streakFrozenAvailable && previousStreak > 0) {
      setVisible(true);
    }
  }, [streakFrozenAvailable, previousStreak]);

  useEffect(() => {
    if (!repairing) return;

    if (countdown <= 0) {
      repairStreak();
      setRepairing(false);
      setVisible(false);
      setCountdown(3);
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [repairing, countdown, repairStreak]);

  const handleRepair = useCallback(() => {
    setRepairing(true);
    setCountdown(3);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>{'\u2744\uFE0F'}</Text>
          <Text style={styles.title}>Streak Frozen!</Text>
          <Text style={styles.subtitle}>
            You missed a day and lost your{' '}
            <Text style={styles.streakCount}>{previousStreak}-day</Text> streak.
          </Text>

          {repairing ? (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownLabel}>Restoring streak in...</Text>
              <Text style={styles.countdownNumber}>{countdown}</Text>
            </View>
          ) : (
            <View style={styles.adPrompt}>
              <Text style={styles.adPromptText}>Watch a short ad to repair your streak</Text>
            </View>
          )}

          <View style={styles.buttons}>
            <RetroButton
              title={repairing ? 'Restoring...' : 'Repair Streak'}
              onPress={handleRepair}
              disabled={repairing}
            />
            <RetroButton
              title="Continue Without Streak"
              onPress={handleDismiss}
              variant="secondary"
              disabled={repairing}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 384,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F4A261',
    backgroundColor: '#1A1A2E',
    padding: 32,
  },
  emoji: {
    marginBottom: 8,
    fontSize: 36,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F5F5F0',
  },
  subtitle: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
    color: 'rgba(245,245,240,0.7)',
  },
  streakCount: {
    fontWeight: 'bold',
    color: '#F4A261',
  },
  countdownContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 14,
    color: '#6C757D',
  },
  countdownNumber: {
    marginTop: 8,
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F4A261',
  },
  adPrompt: {
    marginBottom: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,162,97,0.3)',
    backgroundColor: 'rgba(244,162,97,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  adPromptText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#F4A261',
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
});

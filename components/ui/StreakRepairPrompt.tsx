import React, { useCallback, useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { NotificationFeedbackType } from 'expo-haptics';

import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { triggerNotification } from '@/lib/haptics';
import { colors, fonts, borderRadius } from '@/constants/theme';
import RetroButton from '@/components/ui/RetroButton';
import Confetti from '@/components/ui/Confetti';

/** Offered once (per mount) when the store has a repairable frozen streak.
 *  Wires the existing streakFrozenAvailable + repairStreak() store logic to UI
 *  and celebrates a successful repair. Mount on the home / daily menu screen. */
export default function StreakRepairPrompt() {
  const streakFrozenAvailable = useDailyStateStore((s) => s.streakFrozenAvailable);
  const previousStreak = useDailyStateStore((s) => s.previousStreak);
  const repairStreak = useDailyStateStore((s) => s.repairStreak);

  const [visible, setVisible] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (streakFrozenAvailable && previousStreak > 0) {
      setVisible(true);
    }
  }, [streakFrozenAvailable, previousStreak]);

  const handleRepair = useCallback(() => {
    repairStreak();
    triggerNotification(NotificationFeedbackType.Success);
    setCelebrating(true);
  }, [repairStreak]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setCelebrating(false);
  }, []);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {celebrating && <Confetti />}
        <View style={styles.card}>
          <Text style={styles.emoji}>{celebrating ? '🔥' : '💔'}</Text>
          <Text style={styles.title}>{celebrating ? 'Streak Restored!' : 'Streak Broke!'}</Text>
          <Text style={styles.subtitle}>
            {celebrating ? (
              <>
                Your <Text style={styles.streakCount}>{previousStreak}-day</Text> streak is back.
                Keep it going!
              </>
            ) : (
              <>
                You missed a day and your{' '}
                <Text style={styles.streakCount}>{previousStreak}-day</Text> streak reset. Repair
                it?
              </>
            )}
          </Text>

          <View style={styles.buttons}>
            {celebrating ? (
              <RetroButton title="Let's go!" onPress={handleClose} />
            ) : (
              <>
                <RetroButton title="Repair Streak" onPress={handleRepair} />
                <RetroButton title="No thanks" onPress={handleClose} variant="secondary" />
              </>
            )}
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
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.cardYellow,
    backgroundColor: colors.broadcasterDark,
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
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
    letterSpacing: 1,
  },
  subtitle: {
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: fonts.body,
    color: 'rgba(245,245,240,0.7)',
    lineHeight: 20,
  },
  streakCount: {
    fontFamily: fonts.heading,
    color: colors.cardYellow,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
});

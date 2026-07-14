import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { NotificationFeedbackType } from 'expo-haptics';

import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { triggerNotification } from '@/lib/haptics';
import { borderRadius, motion, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import RetroButton from '@/components/ui/RetroButton';
import Confetti from '@/components/ui/Confetti';

/** Offered once (per mount) when the store has a repairable frozen streak.
 *  Wires the existing streakFrozenAvailable + repairStreak() store logic to UI
 *  and celebrates a successful repair. Mount on the home / daily menu screen. */
export default function StreakRepairPrompt() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
        <Animated.View entering={FadeInDown.duration(motion.base)} style={styles.card}>
          <Text style={layout.emoji}>{celebrating ? '🔥' : '💔'}</Text>
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

          <View style={layout.buttons}>
            {celebrating ? (
              <RetroButton title="Let's go!" onPress={handleClose} />
            ) : (
              <>
                <RetroButton title="Repair Streak" onPress={handleRepair} />
                <RetroButton title="No thanks" onPress={handleClose} variant="secondary" />
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const layout = StyleSheet.create({
  emoji: {
    marginBottom: spacing.sm,
    fontSize: type.display.fontSize,
  },
  buttons: {
    width: '100%',
    gap: spacing.md,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.scrim,
      paddingHorizontal: spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 384,
      alignItems: 'center',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: c.streak,
      backgroundColor: c.bgElevated,
      padding: spacing.xxl,
    },
    title: {
      ...type.h2,
      marginBottom: spacing.sm,
      textAlign: 'center',
      color: c.textPrimary,
    },
    subtitle: {
      ...type.body,
      marginBottom: spacing.xl,
      textAlign: 'center',
      color: c.textSecondary,
    },
    streakCount: {
      ...type.bodyBold,
      color: c.streakBright,
    },
  });

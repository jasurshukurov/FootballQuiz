import React, { useMemo } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Tappable from '@/components/ui/Tappable';
import { borderRadius, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useNotificationPrefsStore } from '@/hooks/useNotificationPrefsStore';
import { applyNotificationSchedule } from '@/lib/notifications';
import { triggerImpact } from '@/lib/haptics';
import { NotificationFrequency } from '@/lib/notificationPlan';

const FREQUENCY_OPTIONS: {
  key: NotificationFrequency;
  label: string;
  caption: string;
  recommended?: boolean;
}[] = [
  { key: 'daily', label: 'Every day', caption: 'One reminder each day' },
  {
    key: 'fewPerWeek',
    label: 'A few times a week',
    caption: 'Monday, Thursday and Saturday',
    recommended: true,
  },
  { key: 'weekly', label: 'Once a week', caption: 'Saturdays only' },
  { key: 'off', label: 'Off', caption: 'No reminders at all' },
];

const HOUR_OPTIONS = [8, 10, 12, 18, 20];

function formatHour(hour: number): string {
  return `${hour}:00`;
}

/**
 * Notification preferences section for the Profile screen. Gentle by design:
 * changing anything re-applies the schedule immediately (and only a settings
 * interaction like this may surface the OS permission prompt).
 */
export default function NotificationSettings() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const frequency = useNotificationPrefsStore((s) => s.frequency);
  const reminderHour = useNotificationPrefsStore((s) => s.reminderHour);
  const streakSaver = useNotificationPrefsStore((s) => s.streakSaver);
  const setFrequency = useNotificationPrefsStore((s) => s.setFrequency);
  const setReminderHour = useNotificationPrefsStore((s) => s.setReminderHour);
  const setStreakSaver = useNotificationPrefsStore((s) => s.setStreakSaver);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webNote}>
        <FontAwesome name="bell-slash" size={14} color={colors.textMuted} />
        <Text style={styles.webNoteText}>Notifications aren&apos;t available on web</Text>
      </View>
    );
  }

  const reschedule = () => {
    // User interaction — the one place a first-time permission prompt is OK.
    applyNotificationSchedule({ interactive: true }).catch(() => {});
  };

  const handleFrequency = (key: NotificationFrequency) => {
    setFrequency(key);
    reschedule();
  };

  const handleHour = (hour: number) => {
    setReminderHour(hour);
    reschedule();
  };

  const handleStreakSaver = (value: boolean) => {
    triggerImpact();
    setStreakSaver(value);
    reschedule();
  };

  return (
    <View>
      {/* Frequency */}
      <View style={styles.optionGroup}>
        {FREQUENCY_OPTIONS.map((option, i) => {
          const selected = option.key === frequency;
          return (
            <Tappable
              key={option.key}
              onPress={() => handleFrequency(option.key)}
              accessibilityLabel={`Remind me: ${option.label}`}
              hoverStyle={{ backgroundColor: colors.bgCardPressed }}
              style={[
                styles.optionRow,
                i > 0 && styles.optionRowBorder,
                selected && styles.optionRowSelected,
              ]}>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
              <View style={styles.optionText}>
                <View style={styles.optionLabelRow}>
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {option.label}
                  </Text>
                  {option.recommended && (
                    <View style={styles.recommendedTag}>
                      <Text style={styles.recommendedText}>RECOMMENDED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.optionCaption}>{option.caption}</Text>
              </View>
            </Tappable>
          );
        })}
      </View>

      {frequency !== 'off' && (
        <>
          {/* Reminder time */}
          <Text style={styles.subLabel}>Reminder time</Text>
          <View style={styles.chipRow}>
            {HOUR_OPTIONS.map((hour) => {
              const selected = hour === reminderHour;
              return (
                <Tappable
                  key={hour}
                  onPress={() => handleHour(hour)}
                  accessibilityLabel={`Remind me at ${formatHour(hour)}`}
                  hoverStyle={{ backgroundColor: colors.bgCardPressed }}
                  style={[styles.chip, selected && styles.chipSelected]}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {formatHour(hour)}
                  </Text>
                </Tappable>
              );
            })}
          </View>

          {/* Streak saver */}
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchLabel}>Streak saver</Text>
              <Text style={styles.switchCaption}>
                One extra nudge at 20:30 if a streak is at risk. Cancelled automatically once
                you&apos;ve played.
              </Text>
            </View>
            <Switch
              value={streakSaver}
              onValueChange={handleStreakSaver}
              trackColor={{ false: colors.border, true: colors.accentBorder }}
              thumbColor={streakSaver ? colors.accent : colors.textMuted}
              accessibilityLabel="Streak saver"
            />
          </View>
        </>
      )}
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    webNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    webNoteText: {
      ...type.caption,
      color: c.textMuted,
    },
    optionGroup: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
      overflow: 'hidden',
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    optionRowBorder: {
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    optionRowSelected: {
      backgroundColor: c.accentSoft,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: borderRadius.full,
      borderWidth: 2,
      borderColor: c.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      borderColor: c.accent,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: borderRadius.full,
      backgroundColor: c.accent,
    },
    optionText: {
      flex: 1,
    },
    optionLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    optionLabel: {
      ...type.body,
      color: c.textPrimary,
    },
    optionLabelSelected: {
      ...type.bodyBold,
      color: c.textPrimary,
    },
    recommendedTag: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 1,
      borderRadius: borderRadius.sm,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    recommendedText: {
      ...type.micro,
      color: c.accent,
      letterSpacing: 0.5,
    },
    optionCaption: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: 1,
    },
    subLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    chipSelected: {
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
    },
    chipText: {
      ...type.caption,
      color: c.textSecondary,
    },
    chipTextSelected: {
      ...type.captionBold,
      color: c.accent,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    switchText: {
      flex: 1,
    },
    switchLabel: {
      ...type.bodyBold,
      color: c.textPrimary,
    },
    switchCaption: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: 2,
    },
  });

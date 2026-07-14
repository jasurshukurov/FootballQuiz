import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_REMINDER_HOUR, NotificationFrequency, clampHour } from '@/lib/notificationPlan';

interface NotificationPrefsState {
  frequency: NotificationFrequency;
  reminderHour: number;
  streakSaver: boolean;
}

interface NotificationPrefsActions {
  setFrequency: (frequency: NotificationFrequency) => void;
  setReminderHour: (hour: number) => void;
  setStreakSaver: (enabled: boolean) => void;
}

type NotificationPrefsStore = NotificationPrefsState & NotificationPrefsActions;

/**
 * User-facing notification preferences. The gentle default is a few
 * reminders per week (Mon/Thu/Sat) at 10:00 — never daily unless asked.
 */
export const useNotificationPrefsStore = create<NotificationPrefsStore>()(
  persist(
    (set) => ({
      frequency: 'fewPerWeek',
      reminderHour: DEFAULT_REMINDER_HOUR,
      streakSaver: true,

      setFrequency: (frequency: NotificationFrequency) => set({ frequency }),
      setReminderHour: (hour: number) => set({ reminderHour: clampHour(hour) }),
      setStreakSaver: (enabled: boolean) => set({ streakSaver: enabled }),
    }),
    {
      name: 'notification-prefs-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        frequency: state.frequency,
        reminderHour: state.reminderHour,
        streakSaver: state.streakSaver,
      }),
    },
  ),
);

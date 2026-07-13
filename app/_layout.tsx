import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import '../global.css';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useNotificationSetup } from '@/hooks/useNotificationSetup';
import { requestTrackingPermission } from '@/lib/tracking';
import { initPurchases } from '@/lib/purchases';
import { fetchRemoteConfig, RemoteConfig } from '@/lib/remoteConfig';
import { useRemoteConfigStore } from '@/hooks/useRemoteConfigStore';
import StreakRepairPrompt from '@/components/ui/StreakRepairPrompt';
import MaintenanceScreen from '@/components/ui/MaintenanceScreen';
import { colors } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const RetroTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.pitchGreen,
    background: colors.retroBlack,
    card: colors.broadcasterDark,
    text: colors.chalkWhite,
    border: colors.pitchGreen,
    notification: colors.cardRed,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'SpaceMono-Bold': require('../assets/fonts/SpaceMono-Bold.ttf'),
    'BarlowCondensed-Bold': require('../assets/fonts/BarlowCondensed-Bold.ttf'),
    'BarlowCondensed-SemiBold': require('../assets/fonts/BarlowCondensed-SemiBold.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const checkAndUpdateStreak = useDailyStateStore((s) => s.checkAndUpdateStreak);
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null);

  useNotificationSetup();

  useEffect(() => {
    checkAndUpdateStreak();
    initPurchases();

    // Request ATT permission before initializing ads
    requestTrackingPermission();

    fetchRemoteConfig().then((config) => {
      setRemoteConfig(config);
      // Expose globally so screens can read disabled_modes etc.
      useRemoteConfigStore.getState().setConfig(config);
    });
  }, [checkAndUpdateStreak]);

  if (remoteConfig?.maintenance_mode) {
    return <MaintenanceScreen message={remoteConfig.message} />;
  }

  return (
    <ThemeProvider value={RetroTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="games" options={{ headerShown: false }} />
        <Stack.Screen name="share/[puzzleId]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StreakRepairPrompt />
    </ThemeProvider>
  );
}

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import RouteSeo from '@/components/ui/RouteSeo';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import '../global.css';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useNotificationSetup } from '@/hooks/useNotificationSetup';
import { initPurchases } from '@/lib/purchases';
import { fetchRemoteConfig, onConfigRefresh, RemoteConfig } from '@/lib/remoteConfig';
import { useRemoteConfigStore } from '@/hooks/useRemoteConfigStore';
import StreakRepairPrompt from '@/components/ui/StreakRepairPrompt';
import MaintenanceScreen from '@/components/ui/MaintenanceScreen';
import { markThemeHydrated, useTheme } from '@/hooks/useTheme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'SpaceMono-Bold': require('../assets/fonts/SpaceMono-Bold.ttf'),
    'BarlowCondensed-Bold': require('../assets/fonts/BarlowCondensed-Bold.ttf'),
    'BarlowCondensed-SemiBold': require('../assets/fonts/BarlowCondensed-SemiBold.ttf'),
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
  const theme = useTheme();

  // Web: first client render matched the SSG (light) markup; this flip swaps
  // every useTheme subscriber to the real device/persisted theme post-
  // hydration. Without it, dark-scheme phones hydrated into a mixed UI.
  useEffect(() => {
    markThemeHydrated();
  }, []);

  useNotificationSetup();

  // Navigation chrome (backgrounds, headers, transitions) follows the theme.
  const navTheme = useMemo(() => {
    const base = theme.dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.accent,
        background: theme.colors.bgBase,
        card: theme.colors.bgElevated,
        text: theme.colors.textPrimary,
        border: theme.colors.border,
        notification: theme.colors.danger,
      },
    };
  }, [theme]);

  // On web the document body shows through during overscroll — keep it in sync.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = theme.colors.bgBase;
    }
  }, [theme]);

  useEffect(() => {
    checkAndUpdateStreak();
    initPurchases();

    // No ATT prompt: the app ships no ads and tracks nothing. Re-add the
    // expo-tracking-transparency plugin + NSUserTrackingUsageDescription +
    // this request TOGETHER with a real ad SDK, never before (5.1.2).

    fetchRemoteConfig().then((config) => {
      setRemoteConfig(config);
      // Expose globally so screens can read disabled_modes etc.
      useRemoteConfigStore.getState().setConfig(config);
    });
    // First load serves the cached config; when the background network
    // refresh lands, apply it live so flag flips don't need a second visit.
    onConfigRefresh((config) => {
      setRemoteConfig(config);
      useRemoteConfigStore.getState().setConfig(config);
    });
  }, [checkAndUpdateStreak]);

  if (remoteConfig?.maintenance_mode) {
    return <MaintenanceScreen message={remoteConfig.message} />;
  }

  return (
    <ThemeProvider value={navTheme}>
      {/* Web: pathname-keyed title/description/canonical/social tags on every
          statically exported page (lib/seo.ts map). No-op on native. */}
      <RouteSeo />
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
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

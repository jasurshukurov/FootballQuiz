import React, { useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { borderRadius, type, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  TAB_BAR_HEIGHT,
  WEB_CONTENT_MAX_WIDTH,
  useIsWideWeb,
  useIsDesktopWeb,
} from '@/components/ui/Screen';
import ScreenBackground from '@/components/ui/ScreenBackground';
import Sidebar from '@/components/ui/Sidebar';
import { triggerImpact } from '@/lib/haptics';

// On wide desktop web the floating pill is capped to the same centered column
// as screen content (Screen.tsx) instead of spanning the whole monitor.
// Matches the column width minus the pill's usual spacing.xl side insets.
const WIDE_TAB_BAR_WIDTH = WEB_CONTENT_MAX_WIDTH - spacing.xl * 2;

// No active-state dot: in the 56pt pill it collided with the label and read
// as a stray artifact (user report 2026-07-16). The accent tint on the
// focused icon + label is the active indicator.
function TabBarIcon({
  name,
  color,
}: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return (
    <View style={styles.iconContainer}>
      <FontAwesome size={18} name={name} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const theme = useTheme();
  const isWideWeb = useIsWideWeb();
  const isDesktopWeb = useIsDesktopWeb();

  const screenOptions = useMemo(
    () =>
      ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          ...type.micro,
          includeFontPadding: false,
          marginTop: 0,
          // Web: tab labels shouldn't be text-selectable when clicking around.
          // No-op on native (Text is non-selectable by default).
          userSelect: 'none' as const,
        },
        // No extra item padding: the 56pt pill leaves exactly enough for the
        // 24pt icon row + 14pt label after react-navigation's own 5pt paddings.
        tabBarItemStyle: {
          paddingTop: 0,
        },
        tabBarStyle: {
          // Desktop web hides the floating pill entirely — the sidebar navigates.
          ...(isDesktopWeb ? { display: 'none' as const } : {}),
          position: 'absolute' as const,
          bottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
          // Wide web: fixed-width pill centered under the content column.
          // Native / narrow web: unchanged full-width-minus-insets pill.
          ...(isWideWeb
            ? {
                width: WIDE_TAB_BAR_WIDTH,
                left: '50%' as const,
                marginLeft: -WIDE_TAB_BAR_WIDTH / 2,
              }
            : {
                left: spacing.xl,
                right: spacing.xl,
              }),
          height: TAB_BAR_HEIGHT,
          borderRadius: borderRadius.xxl,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.bgElevated,
          opacity: 0.94,
          paddingTop: spacing.xs / 2,
          paddingBottom: spacing.xs / 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 12,
        },
      }) as const,
    [theme, isWideWeb, isDesktopWeb],
  );

  const tabs = (
    <Tabs
      screenListeners={{
        tabPress: () => {
          triggerImpact();
        },
      }}
      screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar-check-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <TabBarIcon name="ellipsis-h" color={color} />,
        }}
      />
      {/* Hidden from the tab bar (href: null) but still reachable via router.navigate;
          give each a proper header title so it doesn't show the raw route name. */}
      <Tabs.Screen name="careerpath" options={{ href: null, title: 'Career Path' }} />
      <Tabs.Screen name="explore" options={{ href: null, title: 'Immaculate Grid' }} />
      <Tabs.Screen name="whoareya" options={{ href: null, title: 'My name is...' }} />
      <Tabs.Screen name="missing11" options={{ href: null, title: 'Missing XI' }} />
      <Tabs.Screen name="connections" options={{ href: null, title: 'Connections' }} />
      <Tabs.Screen name="toplists" options={{ href: null, title: 'Top Lists' }} />
      <Tabs.Screen name="higherlower" options={{ href: null, title: 'Higher / Lower' }} />
      <Tabs.Screen name="agent" options={{ href: null, title: 'Transfer Agent' }} />
      <Tabs.Screen name="blindranking" options={{ href: null, title: 'Blind Ranking' }} />
      <Tabs.Screen name="careertimeline" options={{ href: null, title: 'Career Timeline' }} />
      {/* DEPRECATED mode (removed from lib/modeRegistry.ts) — this entry must stay:
          expo-router auto-registers every file in app/(tabs)/, and href: null is
          what keeps the dormant screen out of the tab bar while direct navigation
          still works. */}
      <Tabs.Screen name="marketmovers" options={{ href: null, title: 'Market Movers' }} />
      <Tabs.Screen name="guessmatch" options={{ href: null, title: 'Guess the Match' }} />
      <Tabs.Screen name="archive" options={{ href: null, title: 'Archive' }} />
      <Tabs.Screen name="photocredits" options={{ href: null, title: 'Photo Credits' }} />
      <Tabs.Screen name="leaderboard" options={{ href: null, title: 'Leaderboard' }} />
    </Tabs>
  );

  // Desktop web (>= 920px): two-pane layout — persistent sidebar + content
  // column. The shared gradient sits behind both so the transparent sidebar
  // blends with the content. Mobile + all native fall through to the tab bar.
  if (isDesktopWeb) {
    return (
      <ScreenBackground>
        <View style={styles.desktopRow}>
          <Sidebar />
          <View style={styles.desktopMain}>{tabs}</View>
        </View>
      </ScreenBackground>
    );
  }

  return tabs;
}

const styles = StyleSheet.create({
  // Sidebar hugs the window edge (standard dashboard rail); the game column
  // centers itself in the remaining width via Screen's column cap.
  desktopRow: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopMain: {
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

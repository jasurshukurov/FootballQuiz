import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import FloatingTabBar from '@/components/ui/FloatingTabBar';
import { useIsDesktopWeb } from '@/components/ui/Screen';
import ScreenBackground from '@/components/ui/ScreenBackground';
import Sidebar from '@/components/ui/Sidebar';
import { triggerImpact } from '@/lib/haptics';

export default function TabLayout() {
  const isDesktopWeb = useIsDesktopWeb();

  const tabs = (
    <Tabs
      screenListeners={{
        tabPress: () => {
          triggerImpact();
        },
      }}
      // All bar presentation (float pill with scroll-minimize, classic flush
      // bar, wide-web width cap, desktop-web hidden) lives in FloatingTabBar.
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="profile" options={{ title: 'Stats' }} />
      <Tabs.Screen name="support" options={{ title: 'More' }} />
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
});

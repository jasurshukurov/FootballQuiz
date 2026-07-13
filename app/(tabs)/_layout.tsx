import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { colors, fonts, borderRadius } from '@/constants/theme';
import { triggerImpact } from '@/lib/haptics';

function TabBarIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <FontAwesome size={22} name={name} color={color} />
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          triggerImpact();
        },
      }}
      screenOptions={{
        tabBarActiveTintColor: colors.pitchGreen,
        tabBarInactiveTintColor: colors.steelGray,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: fonts.subheading,
          fontSize: 10,
          letterSpacing: 0.5,
          includeFontPadding: false,
          textAlignVertical: 'center',
        },
        tabBarItemStyle: {
          paddingBottom: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 20,
          right: 20,
          height: 76,
          borderRadius: borderRadius.xxl,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          backgroundColor: 'rgba(17,17,40,0.92)',
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 12,
        },
        headerStyle: {
          backgroundColor: colors.midnightNavy,
        },
        headerTintColor: colors.chalkWhite,
        headerTitleStyle: {
          fontFamily: fonts.heading,
          fontSize: 20,
          letterSpacing: 1,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="futbol-o" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="bar-chart" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: 'Support',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="heart" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="modes"
        options={{
          title: 'Modes',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="th-large" color={color} focused={focused} />
          ),
        }}
      />
      {/* Hidden from the tab bar (href: null) but still reachable via router.navigate;
          give each a proper header title so it doesn't show the raw route name. */}
      <Tabs.Screen name="explore" options={{ href: null, title: 'Immaculate Grid' }} />
      <Tabs.Screen name="whoareya" options={{ href: null, title: 'My name is...' }} />
      <Tabs.Screen name="missing11" options={{ href: null, title: 'Missing XI' }} />
      <Tabs.Screen name="connections" options={{ href: null, title: 'Connections' }} />
      <Tabs.Screen name="toplists" options={{ href: null, title: 'Top Lists' }} />
      <Tabs.Screen name="higherlower" options={{ href: null, title: 'Higher / Lower' }} />
      <Tabs.Screen name="agent" options={{ href: null, title: 'Transfer Agent' }} />
      <Tabs.Screen name="blindranking" options={{ href: null, title: 'Blind Ranking' }} />
      <Tabs.Screen name="careertimeline" options={{ href: null, title: 'Career Timeline' }} />
      <Tabs.Screen name="marketmovers" options={{ href: null, title: 'Market Movers' }} />
      <Tabs.Screen name="guessmatch" options={{ href: null, title: 'Guess the Match' }} />
      <Tabs.Screen name="archive" options={{ href: null, title: 'Archive' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  iconContainerActive: {},
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.pitchGreen,
    marginTop: 4,
    shadowColor: '#05F26C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
});

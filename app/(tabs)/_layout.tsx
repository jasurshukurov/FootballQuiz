import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { colors, fonts, borderRadius } from '@/constants/theme';

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
          title: 'Pro',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="star" color={color} focused={focused} />
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
      {/* Hide old game screens from tabs - they're now accessed via /games/ routes */}
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="career" options={{ href: null }} />
      <Tabs.Screen name="missing11" options={{ href: null }} />
      <Tabs.Screen name="connections" options={{ href: null }} />
      <Tabs.Screen name="badge" options={{ href: null }} />
      <Tabs.Screen name="higherlower" options={{ href: null }} />
      <Tabs.Screen name="agent" options={{ href: null }} />
      <Tabs.Screen name="blindranking" options={{ href: null }} />
      <Tabs.Screen name="careertimeline" options={{ href: null }} />
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

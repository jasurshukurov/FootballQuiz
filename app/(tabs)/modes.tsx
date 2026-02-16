import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

const GAME_MODES = [
  {
    id: 'who-are-ya',
    title: 'Who Are Ya?',
    icon: 'futbol-o' as const,
    route: '/games/who-are-ya',
    color: '#05F26C',
  },
  {
    id: 'grid',
    title: 'Immaculate Grid',
    icon: 'th' as const,
    route: '/games/grid',
    color: '#00BFFF',
  },
  {
    id: 'career',
    title: 'Career Path',
    icon: 'road' as const,
    route: '/games/career',
    color: '#FFD700',
  },
  {
    id: 'missing11',
    title: 'Missing XI',
    icon: 'users' as const,
    route: '/games/missing11',
    color: '#FF6B6B',
  },
  {
    id: 'connections',
    title: 'Connections',
    icon: 'link' as const,
    route: '/games/connections',
    color: '#F4A261',
  },
  {
    id: 'badge',
    title: 'Badge Quiz',
    icon: 'shield' as const,
    route: '/games/badge',
    color: '#52B788',
  },
  {
    id: 'higherlower',
    title: 'Higher / Lower',
    icon: 'arrows-v' as const,
    route: '/games/higherlower',
    color: '#E63946',
  },
  {
    id: 'agent',
    title: 'Transfer Agent',
    icon: 'money' as const,
    route: '/games/agent',
    color: '#9B5DE5',
  },
  {
    id: 'blindranking',
    title: 'Blind Ranking',
    icon: 'sort-amount-desc' as const,
    route: '/games/blindranking',
    color: '#F4A261',
  },
  {
    id: 'careertimeline',
    title: 'Career Timeline',
    icon: 'road' as const,
    route: '/games/careertimeline',
    color: '#00BFFF',
  },
];

function ModeCard({ mode }: { mode: (typeof GAME_MODES)[number] }) {
  const router = useRouter();
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={() => router.push(mode.route as never)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.card, pressed && styles.cardPressed]}>
      <View style={[styles.iconCircle, { backgroundColor: `${mode.color}22` }]}>
        <FontAwesome name={mode.icon} size={28} color={mode.color} />
      </View>
      <Text style={styles.cardTitle}>{mode.title}</Text>
    </Pressable>
  );
}

export default function ModesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Game Modes</Text>
        <Text style={styles.subtitle}>Choose your challenge</Text>
        <View style={styles.grid}>
          {GAME_MODES.map((mode) => (
            <ModeCard key={mode.id} mode={mode} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.retroBlack,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: colors.chalkWhite,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.steelGray,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: 'rgba(17,17,40,0.7)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.chalkWhite,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import { useDisabledModes } from '@/hooks/useRemoteConfigStore';

// modes.tsx uses `career` as the Career Path card id; its canonical mode key
// (matching disabled_modes / completion keys) is `careerpath`.
function configKeyFor(id: string): string {
  return id === 'career' ? 'careerpath' : id;
}

const GAME_MODES = [
  {
    id: 'who-are-ya',
    title: 'My name is...',
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
    id: 'toplists',
    title: 'Top Lists',
    icon: 'list-ol' as const,
    route: '/games/toplists',
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
  {
    id: 'marketmovers',
    title: 'Market Movers',
    icon: 'line-chart' as const,
    route: '/games/marketmovers',
    color: '#FFC300',
  },
  {
    id: 'guessmatch',
    title: 'Guess the Match',
    icon: 'flag-checkered' as const,
    route: '/games/guessmatch',
    color: '#4ECDC4',
  },
];

function ModeCard({ mode, disabled }: { mode: (typeof GAME_MODES)[number]; disabled: boolean }) {
  const router = useRouter();
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        router.push(mode.route as never);
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={[styles.card, pressed && styles.cardPressed, disabled && styles.cardDisabled]}>
      <View style={[styles.iconCircle, { backgroundColor: `${mode.color}22` }]}>
        <FontAwesome name={mode.icon} size={28} color={mode.color} />
      </View>
      <Text style={styles.cardTitle}>{mode.title}</Text>
      {disabled && <Text style={styles.unavailableText}>Temporarily unavailable</Text>}
    </Pressable>
  );
}

export default function ModesScreen() {
  const router = useRouter();
  const disabledModes = useDisabledModes();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Game Modes</Text>
        <Text style={styles.subtitle}>Choose your challenge</Text>

        <Pressable
          style={styles.archiveCard}
          onPress={() => router.push('/(tabs)/archive' as Href)}>
          <FontAwesome name="calendar" size={20} color={colors.pitchGreen} />
          <View style={styles.archiveTextWrap}>
            <Text style={styles.archiveTitle}>Archive</Text>
            <Text style={styles.archiveSubtitle}>Play past days — no effect on your streak</Text>
          </View>
          <FontAwesome name="chevron-right" size={14} color={colors.steelGray} />
        </Pressable>

        <View style={styles.grid}>
          {GAME_MODES.map((mode) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              disabled={disabledModes.includes(configKeyFor(mode.id))}
            />
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
  archiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(5,242,108,0.08)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(5,242,108,0.25)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  archiveTextWrap: {
    flex: 1,
  },
  archiveTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.chalkWhite,
    letterSpacing: 0.5,
  },
  archiveSubtitle: {
    fontFamily: fonts.subheading,
    fontSize: 12,
    color: colors.steelGray,
    marginTop: 2,
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
  cardDisabled: {
    opacity: 0.4,
  },
  unavailableText: {
    fontFamily: fonts.subheading,
    fontSize: 11,
    color: colors.steelGray,
    fontStyle: 'italic',
    textAlign: 'center',
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

import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useGuessGameStore } from '@/hooks/useGuessGameStore';
import { useProStore } from '@/hooks/useProStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import { purchasePro, restorePurchases } from '@/lib/purchases';
import { deleteUserAccount } from '@/lib/accountDeletion';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sounds';
import { isHapticsEnabled, setHapticsEnabled } from '@/lib/haptics';
import { isNotificationsEnabled, setNotificationsEnabled } from '@/lib/notifications';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import RetroButton from '@/components/ui/RetroButton';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedBar from '@/components/ui/AnimatedBar';
import ManagerCard from '@/components/games/ManagerCard';
import DailyMenu from '@/components/games/DailyMenu';
import BannerAd from '@/components/ui/BannerAd';
import { shadows } from '@/constants/theme';

function StatBox({ label, value }: { label: string; value: string }) {
  const glowStyle = value !== '0%' && value !== '0' ? shadows.neonGlow : undefined;
  return (
    <View style={[styles.statBox, glowStyle]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const MODE_LABELS: Record<string, string> = {
  'who-are-ya': 'My name is...',
  careerpath: 'Career Path',
  grid: 'Grid',
  'missing-11': 'Missing 11',
  connections: 'Connections',
  'higher-lower': 'Higher/Lower',
  agent: 'Agent',
  blindranking: 'Blind Ranking',
  careertimeline: 'Career Timeline',
  marketmovers: 'Market Movers',
  guessmatch: 'Guess the Match',
  toplists: 'Top Lists',
};

export default function ProfileScreen() {
  const { guesses, gameStatus } = useGuessGameStore();
  // Compute directly: the game store's dailyNumber is -1 until Who Are Ya
  // is first opened, which showed "Daily Puzzle #-1" here.
  const dailyNumber = getDailyNumber();
  const { currentStreak, maxStreak, gamesPlayed, gamesWon, guessDistribution } =
    useDailyStateStore();
  const isPro = useProStore((s) => s.isPro);
  const xpByMode = useManagerStore((s) => s.xpByMode);
  const perfectDays = useDailyProgressStore((s) => s.perfectDays);

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [hapticsOn, setHapticsOn] = useState(isHapticsEnabled());
  const [notificationsOn, setNotificationsOn] = useState(true);

  useEffect(() => {
    isNotificationsEnabled().then(setNotificationsOn);
  }, []);

  const handleToggleSound = async () => {
    const newVal = !soundOn;
    setSoundOn(newVal);
    await setSoundEnabled(newVal);
  };

  const handleToggleHaptics = async () => {
    const newVal = !hapticsOn;
    setHapticsOn(newVal);
    await setHapticsEnabled(newVal);
  };

  const handleToggleNotifications = async () => {
    const newVal = !notificationsOn;
    setNotificationsOn(newVal);
    await setNotificationsEnabled(newVal);
  };

  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
  const maxDistribution = Math.max(...guessDistribution, 0);

  const handleUpgrade = async () => {
    setPurchasing(true);
    const success = await purchasePro();
    setPurchasing(false);
    if (success) {
      Alert.alert('Welcome to Pro!', 'Ad-free experience and free hints unlocked.');
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const restored = await restorePurchases();
    setRestoring(false);
    Alert.alert(
      restored ? 'Restored!' : 'Nothing to Restore',
      restored ? 'Your Pro purchase has been restored.' : 'No previous purchase found.',
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete all your data including stats, streaks, and preferences. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteUserAccount();
            Alert.alert('Account Deleted', 'All your data has been removed.');
          },
        },
      ],
    );
  };

  return (
    <LinearGradient
      colors={['#0D1B2A', '#1B0A2E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <ManagerCard />
          <DailyMenu />

          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>{'\u26BD'}</Text>
            </View>
            <Text style={styles.headerTitle}>Your Stats</Text>
            <Text style={styles.headerSubtitle}>Daily Puzzle #{dailyNumber}</Text>
          </View>

          <View style={styles.statRow}>
            <StatBox label="Played" value={String(gamesPlayed)} />
            <StatBox label="Win %" value={`${winRate}%`} />
            <StatBox label={'\uD83D\uDD25 Streak'} value={String(currentStreak)} />
            <StatBox label="Best" value={String(maxStreak)} />
          </View>
          <Text style={styles.statsNote}>
            Streak counts any daily challenge. Played &amp; Win % are for &ldquo;My name
            is...&rdquo;
          </Text>

          <View style={styles.statRow}>
            <StatBox label={'🏆 Perfect Days'} value={String(perfectDays)} />
          </View>

          <GlassCard style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>My name is... Distribution</Text>
              <View style={styles.distList}>
                {guessDistribution.map((count, i) => (
                  <AnimatedBar
                    key={i}
                    label={String(i + 1)}
                    value={count}
                    maxValue={maxDistribution}
                    index={i}
                  />
                ))}
              </View>
            </View>
          </GlassCard>

          {Object.keys(xpByMode).length > 0 && (
            <GlassCard style={styles.xpBreakdownCard}>
              <View style={styles.xpBreakdownInner}>
                <Text style={styles.cardTitle}>XP Breakdown</Text>
                <View style={styles.distList}>
                  {Object.entries(xpByMode)
                    .sort(([, a], [, b]) => b - a)
                    .map(([mode, xp], idx) => (
                      <AnimatedBar
                        key={mode}
                        label={MODE_LABELS[mode] ?? mode}
                        value={xp}
                        maxValue={Math.max(...Object.values(xpByMode))}
                        index={idx}
                        labelWidth={80}
                      />
                    ))}
                </View>
              </View>
            </GlassCard>
          )}

          <GlassCard style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>Today&apos;s Game</Text>
              {gameStatus === 'playing' && (
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, styles.statusDotYellow]} />
                  <Text style={styles.statusText}>
                    In progress — {guesses.length} guesses so far
                  </Text>
                </View>
              )}
              {gameStatus === 'won' && (
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, styles.statusDotGreen]} />
                  <Text style={styles.statusText}>Solved in {guesses.length} guesses!</Text>
                </View>
              )}
              {gameStatus === 'lost' && (
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, styles.statusDotRed]} />
                  <Text style={styles.statusText}>Better luck tomorrow!</Text>
                </View>
              )}
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={styles.cardTitle}>Settings</Text>
              {!isPro && (
                <View style={styles.settingsButtonWrap}>
                  <RetroButton
                    title={purchasing ? 'Purchasing...' : 'Upgrade to Pro'}
                    onPress={handleUpgrade}
                    disabled={purchasing}
                  />
                </View>
              )}
              {isPro && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>Pro Member</Text>
                </View>
              )}
              <View style={styles.settingsButtonWrap}>
                <RetroButton
                  title={restoring ? 'Restoring...' : 'Restore Purchases'}
                  onPress={handleRestore}
                  variant="secondary"
                  disabled={restoring}
                />
              </View>
              <View style={styles.settingsButtonWrap}>
                <RetroButton
                  title={soundOn ? 'Sound: ON' : 'Sound: OFF'}
                  onPress={handleToggleSound}
                  variant="secondary"
                />
              </View>
              <View style={styles.settingsButtonWrap}>
                <RetroButton
                  title={hapticsOn ? 'Haptics: ON' : 'Haptics: OFF'}
                  onPress={handleToggleHaptics}
                  variant="secondary"
                />
              </View>
              <View style={styles.settingsButtonWrap}>
                <RetroButton
                  title={notificationsOn ? 'Notifications: ON' : 'Notifications: OFF'}
                  onPress={handleToggleNotifications}
                  variant="secondary"
                />
              </View>
              <RetroButton title="Delete Account" onPress={handleDeleteAccount} variant="danger" />
            </View>
          </GlassCard>

          <View style={styles.bottomSpacer} />
        </ScrollView>
        <BannerAd />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 100,
  },
  profileHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  avatar: {
    marginBottom: 12,
    height: 80,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: '#2D5A27',
    backgroundColor: 'rgba(45,90,39,0.2)',
  },
  avatarEmoji: {
    fontSize: 30,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'BarlowCondensed-Bold',
    color: '#F5F5F0',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6C757D',
  },
  statRow: {
    marginBottom: 8,
    flexDirection: 'row',
    gap: 12,
  },
  statsNote: {
    marginBottom: 16,
    fontSize: 11,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 15,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(17,17,40,0.85)',
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'SpaceMono-Bold',
    color: '#05F26C',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#6C757D',
  },
  card: {
    marginBottom: 16,
  },
  cardInner: {
    padding: 16,
  },
  cardTitle: {
    marginBottom: 12,
    fontSize: 14,
    fontFamily: 'BarlowCondensed-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#F5F5F0',
  },
  distList: {
    gap: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    height: 8,
    width: 8,
    borderRadius: 9999,
  },
  statusDotYellow: {
    backgroundColor: '#F4A261',
  },
  statusDotGreen: {
    backgroundColor: '#52B788',
  },
  statusDotRed: {
    backgroundColor: '#E63946',
  },
  statusText: {
    fontSize: 14,
    color: 'rgba(245,245,240,0.8)',
  },
  settingsButtonWrap: {
    marginBottom: 12,
  },
  proBadge: {
    marginBottom: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(82,183,136,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  proBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#52B788',
  },
  xpBreakdownCard: {
    marginBottom: 16,
  },
  xpBreakdownInner: {
    padding: 16,
  },
  bottomSpacer: {
    height: 16,
  },
});

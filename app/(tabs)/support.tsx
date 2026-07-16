import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { FEATURES } from '@/lib/featureFlags';
import Screen from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import RetroButton from '@/components/ui/RetroButton';
import Tappable from '@/components/ui/Tappable';
import { useTheme } from '@/hooks/useTheme';
import { type ThemeColors } from '@/constants/themes';
import { spacing, borderRadius, type, touch } from '@/constants/theme';
import { useProStore } from '@/hooks/useProStore';
import { purchasePro, restorePurchases } from '@/lib/purchases';
import { deleteUserAccount } from '@/lib/accountDeletion';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sounds';
import { useNavBarStore } from '@/hooks/useNavBarStore';
import { isHapticsEnabled, setHapticsEnabled } from '@/lib/haptics';
import { isNotificationsEnabled, setNotificationsEnabled } from '@/lib/notifications';

const PRIVACY_POLICY_URL = 'https://footballtrivia.app/privacy-policy.html';
const SUPPORT_EMAIL = 'support@footballtrivia.app';

// Only what Pro actually grants today.
const PRO_FEATURES = [
  { icon: 'lightbulb-o' as const, label: 'Free unlimited hints, never watch an ad for a clue' },
  { icon: 'ban' as const, label: 'No ads' },
  { icon: 'heart' as const, label: 'Support ongoing development' },
];

function useStyles() {
  const { colors } = useTheme();
  return { colors, styles: useMemo(() => createStyles(colors), [colors]) };
}

function SectionLabel({ children }: { children: string }) {
  const { styles } = useStyles();
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function LinkRow({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  sub?: string;
  onPress: () => void;
}) {
  const { colors, styles } = useStyles();
  return (
    <Tappable
      onPress={onPress}
      accessibilityLabel={label}
      hoverStyle={{ backgroundColor: colors.bgCardPressed }}
      style={styles.row}>
      <FontAwesome name={icon} size={16} color={colors.textSecondary} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <FontAwesome name="chevron-right" size={13} color={colors.textMuted} />
    </Tappable>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { colors, styles } = useStyles();
  return (
    <View style={styles.row}>
      <FontAwesome name={icon} size={16} color={colors.textSecondary} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, styles.rowText]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accentBorder }}
        thumbColor={value ? colors.accent : colors.textMuted}
      />
    </View>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const { colors, styles } = useStyles();
  const isPro = useProStore((s) => s.isPro);
  // Leaderboard UI removed 2026-07-15 (owner call: personal scores only).
  // Sync/identity plumbing stays behind FEATURES.leaderboard + remote config.
  const [loading, setLoading] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [hapticsOn, setHapticsOn] = useState(isHapticsEnabled());
  const navBarStyle = useNavBarStore((s) => s.style);
  const setNavBarStyle = useNavBarStore((s) => s.setStyle);
  const [notificationsOn, setNotificationsOn] = useState(true);

  useEffect(() => {
    isNotificationsEnabled().then(setNotificationsOn);
  }, []);

  const handleToggleSound = async (v: boolean) => {
    setSoundOn(v);
    await setSoundEnabled(v);
  };

  const handleToggleHaptics = async (v: boolean) => {
    setHapticsOn(v);
    await setHapticsEnabled(v);
  };

  const handleToggleNotifications = async (v: boolean) => {
    setNotificationsOn(v);
    await setNotificationsEnabled(v);
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const success = await purchasePro();
      if (success) {
        Alert.alert(
          'Thank you!',
          'Hints are on the house and ads are gone. Thanks for supporting Football Trivia!',
        );
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const restored = await restorePurchases();
      Alert.alert(
        restored ? 'Restored' : 'No Purchase Found',
        restored
          ? 'Your support has been restored. Hints and ad-free are back.'
          : 'We could not find a previous purchase to restore.',
      );
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
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
    <Screen>
      <ScreenHeader title="More" />

      {/* Support / donate — OFF for launch: purchases are a stub with no
          StoreKit behind them (see FEATURES.pro). */}
      {FEATURES.pro && (
        <View style={styles.supportCard}>
          <FontAwesome name="heart" size={28} color={colors.streak} />
          <Text style={styles.supportTitle}>
            {isPro ? 'Thanks for your support!' : 'Support the Game'}
          </Text>
          <Text style={styles.supportSub}>
            {isPro
              ? 'You have hints on the house and an ad-free experience.'
              : 'Football Trivia is free. Chip in to unlock perks and keep it growing.'}
          </Text>
          {!isPro && (
            <>
              <View style={styles.featureList}>
                {PRO_FEATURES.map((f) => (
                  <View key={f.label} style={styles.featureRow}>
                    <FontAwesome name={f.icon} size={14} color={colors.accent} />
                    <Text style={styles.featureLabel}>{f.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.supportButtons}>
                <RetroButton
                  title={loading ? 'Processing…' : 'Support the Game'}
                  onPress={handlePurchase}
                  disabled={loading}
                />
                <RetroButton
                  title="Restore Purchase"
                  onPress={handleRestore}
                  variant="secondary"
                  disabled={loading}
                />
              </View>
            </>
          )}
        </View>
      )}

      {/* Practice & Archive */}
      <SectionLabel>Practice</SectionLabel>
      <View style={styles.group}>
        <LinkRow
          icon="calendar"
          label="Archive"
          sub="Replay the last 30 days with no effect on your streak"
          onPress={() => {
            router.push('/(tabs)/archive' as Href);
          }}
        />
      </View>

      {/* Preferences */}
      <SectionLabel>Preferences</SectionLabel>
      <View style={styles.group}>
        <ToggleRow
          icon="bell"
          label="Notifications"
          value={notificationsOn}
          onValueChange={handleToggleNotifications}
        />
        <ToggleRow
          icon="volume-up"
          label="Sound"
          value={soundOn}
          onValueChange={handleToggleSound}
        />
        <ToggleRow
          icon="mobile"
          label="Haptics"
          value={hapticsOn}
          onValueChange={handleToggleHaptics}
        />
        {/* Classic = standard flush bottom bar; off = the floating pill that
            minimizes while you scroll (see FloatingTabBar). */}
        <ToggleRow
          icon="navicon"
          label="Classic tab bar"
          value={navBarStyle === 'classic'}
          onValueChange={(v) => setNavBarStyle(v ? 'classic' : 'float')}
        />
      </View>

      {/* About */}
      <SectionLabel>About</SectionLabel>
      <View style={styles.group}>
        <LinkRow
          icon="envelope"
          label="Contact support"
          sub={SUPPORT_EMAIL}
          onPress={() => {
            Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
          }}
        />
        <LinkRow
          icon="shield"
          label="Privacy Policy"
          onPress={() => {
            Linking.openURL(PRIVACY_POLICY_URL).catch(() => {});
          }}
        />
        <LinkRow
          icon="camera"
          label="Photo credits"
          sub="Player photos via Wikimedia Commons"
          onPress={() => {
            router.push('/(tabs)/photocredits' as Href);
          }}
        />
      </View>

      {/* Account */}
      <SectionLabel>Account</SectionLabel>
      <View style={styles.group}>
        <Tappable
          onPress={handleDeleteAccount}
          accessibilityLabel="Delete Account"
          hoverStyle={{ backgroundColor: colors.bgCardPressed }}
          style={styles.row}>
          <FontAwesome name="trash" size={16} color={colors.danger} style={styles.rowIcon} />
          <Text style={[styles.rowLabel, styles.rowText, styles.dangerLabel]}>Delete Account</Text>
        </Tappable>
      </View>

      {/* Credits */}
      <Text style={styles.credits}>
        This game was developed by Jasur Shukurov while playing it with his college friends Georgi,
        Alex and Ismail.
      </Text>
    </Screen>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    supportCard: {
      alignItems: 'center',
      padding: spacing.xl,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.streakSoft,
      backgroundColor: c.bgCard,
      marginBottom: spacing.xl,
    },
    supportTitle: {
      ...type.h2,
      color: c.textPrimary,
      marginTop: spacing.md,
      textAlign: 'center',
    },
    supportSub: {
      ...type.caption,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    featureList: {
      width: '100%',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    featureLabel: {
      ...type.caption,
      color: c.textPrimary,
      flex: 1,
    },
    supportButtons: {
      width: '100%',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    sectionLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    group: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
      marginBottom: spacing.xl,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: touch.min,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rowIcon: {
      width: 24,
      textAlign: 'center',
    },
    rowText: {
      flex: 1,
      marginLeft: spacing.sm,
    },
    rowLabel: {
      ...type.body,
      color: c.textPrimary,
    },
    rowSub: {
      ...type.caption,
      color: c.textMuted,
      marginTop: 1,
    },
    dangerLabel: {
      color: c.danger,
    },
    credits: {
      ...type.caption,
      color: c.textMuted,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xl,
    },
  });

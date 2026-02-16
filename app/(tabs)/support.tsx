import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import { useProStore } from '@/hooks/useProStore';
import { purchasePro, restorePurchases } from '@/lib/purchases';
import RetroButton from '@/components/ui/RetroButton';

const PRO_FEATURES = [
  { icon: 'ban' as const, label: 'Ad-free experience' },
  { icon: 'bar-chart' as const, label: 'Detailed stats & insights' },
  { icon: 'star' as const, label: 'Exclusive game modes' },
  { icon: 'paint-brush' as const, label: 'Custom themes' },
  { icon: 'trophy' as const, label: 'Leaderboard access' },
];

export default function SupportScreen() {
  const isPro = useProStore((s) => s.isPro);
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const success = await purchasePro();
      if (success) {
        Alert.alert('Welcome to Pro!', 'You now have access to all premium features.');
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
      if (restored) {
        Alert.alert('Restored', 'Your Pro subscription has been restored.');
      } else {
        Alert.alert('No Purchase Found', 'We could not find a previous purchase to restore.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Go Pro Section */}
        <View style={styles.proCard}>
          <FontAwesome name="star" size={36} color="#FFD700" style={styles.proIcon} />
          <Text style={styles.proTitle}>{isPro ? "You're a Pro!" : 'Go Pro'}</Text>
          <Text style={styles.proSubtitle}>
            {isPro ? 'Thanks for supporting Football Trivia!' : 'Unlock the full experience'}
          </Text>

          <View style={styles.featureList}>
            {PRO_FEATURES.map((feature) => (
              <View key={feature.label} style={styles.featureRow}>
                <FontAwesome name={feature.icon} size={16} color={colors.pitchGreen} />
                <Text style={styles.featureLabel}>{feature.label}</Text>
              </View>
            ))}
          </View>

          {!isPro && (
            <View style={styles.buttonGroup}>
              <RetroButton
                title={loading ? 'Processing...' : 'Upgrade to Pro'}
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
          )}
        </View>

        {/* Support Section */}
        <View style={styles.supportCard}>
          <Text style={styles.sectionTitle}>Support</Text>

          <View style={styles.supportItem}>
            <FontAwesome name="envelope" size={16} color={colors.steelGray} />
            <Text style={styles.supportText}>support@footballtrivia.app</Text>
          </View>

          <View style={styles.supportItem}>
            <FontAwesome name="question-circle" size={16} color={colors.steelGray} />
            <Text style={styles.supportText}>FAQ coming soon</Text>
          </View>
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
    gap: spacing.lg,
  },
  proCard: {
    backgroundColor: 'rgba(17,17,40,0.7)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    padding: spacing.xl,
    alignItems: 'center',
  },
  proIcon: {
    marginBottom: spacing.sm,
  },
  proTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.chalkWhite,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  proSubtitle: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.steelGray,
    marginBottom: spacing.lg,
  },
  featureList: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureLabel: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.chalkWhite,
  },
  buttonGroup: {
    width: '100%',
    gap: spacing.sm,
  },
  supportCard: {
    backgroundColor: 'rgba(17,17,40,0.7)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.chalkWhite,
    letterSpacing: 1,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  supportText: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.steelGray,
  },
});

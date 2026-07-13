import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import { useProStore } from '@/hooks/useProStore';
import { purchasePro, restorePurchases } from '@/lib/purchases';
import RetroButton from '@/components/ui/RetroButton';

// Only what Pro actually grants today. No detailed-stats / exclusive-modes /
// custom-themes / leaderboard claims — those don't exist.
const PRO_FEATURES = [
  { icon: 'lightbulb-o' as const, label: 'Free unlimited hints — never watch an ad for a clue' },
  { icon: 'ban' as const, label: 'No ads' },
  { icon: 'heart' as const, label: 'Support ongoing development' },
];

export default function SupportScreen() {
  const isPro = useProStore((s) => s.isPro);
  const [loading, setLoading] = useState(false);

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
      if (restored) {
        Alert.alert('Restored', 'Your support has been restored — hints and ad-free are back.');
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
        {/* Support / thank-you card */}
        <View style={styles.proCard}>
          <FontAwesome name="heart" size={36} color="#FFD700" style={styles.proIcon} />
          <Text style={styles.proTitle}>
            {isPro ? 'Thanks for your support!' : 'Support the Game'}
          </Text>
          <Text style={styles.proSubtitle}>
            {isPro
              ? 'You have hints on the house and an ad-free experience.'
              : 'Football Trivia is free. Chip in to unlock perks and keep it growing.'}
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
                title={loading ? 'Processing...' : 'Support the Game'}
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

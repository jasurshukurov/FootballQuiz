import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useManagerStore } from '@/hooks/useManagerStore';
import { getLevelForXp, getProgressToNextLevel } from '@/lib/managerLevels';
import GlassCard from '@/components/ui/GlassCard';
import PopInView from '@/components/ui/PopInView';
import { colors, fonts, spacing } from '@/constants/theme';

export default function ManagerCard() {
  const totalXp = useManagerStore((s) => s.totalXp);
  const level = getLevelForXp(totalXp);
  const progress = getProgressToNextLevel(totalXp);

  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withTiming(progress.progress, { duration: 800 });
  }, [progress.progress, barWidth]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  return (
    <PopInView>
      <GlassCard style={styles.card}>
        <View style={styles.content}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelNumber}>{level.level}</Text>
          </View>

          <View style={styles.info}>
            <Text style={styles.title}>{level.title}</Text>

            <View style={styles.progressBarBg}>
              <Animated.View style={[styles.progressBarFill, barStyle]} />
            </View>

            <Text style={styles.xpText}>{totalXp.toLocaleString()} XP total</Text>
          </View>
        </View>
      </GlassCard>
    </PopInView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.pitchGreen,
    backgroundColor: 'rgba(5,242,108,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(108,117,125,0.3)',
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.pitchGreen,
  },
  xpText: {
    fontSize: 12,
    fontFamily: fonts.subheading,
    color: colors.steelGray,
  },
});

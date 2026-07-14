import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useManagerStore } from '@/hooks/useManagerStore';
import { getLevelForXp, getProgressToNextLevel } from '@/lib/managerLevels';
import GlassCard from '@/components/ui/GlassCard';
import PopInView from '@/components/ui/PopInView';
import { type, spacing, borderRadius, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

export default function ManagerCard() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const totalXp = useManagerStore((s) => s.totalXp);
  const level = getLevelForXp(totalXp);
  const progress = getProgressToNextLevel(totalXp);

  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withTiming(progress.progress, { duration: motion.slow });
  }, [progress.progress, barWidth]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%`,
  }));

  return (
    <PopInView>
      <GlassCard style={layoutStyles.card}>
        <View style={layoutStyles.content}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelNumber}>{level.level}</Text>
          </View>

          <View style={layoutStyles.info}>
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

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  info: {
    flex: 1,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    levelBadge: {
      width: 60,
      height: 60,
      borderRadius: borderRadius.full,
      borderWidth: 2,
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    levelNumber: {
      ...type.h1,
      color: c.accent,
    },
    title: {
      ...type.h2,
      color: c.textPrimary,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    progressBarBg: {
      height: 8,
      borderRadius: borderRadius.full,
      backgroundColor: c.bgCard,
      overflow: 'hidden',
      marginBottom: spacing.xs,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: borderRadius.full,
      backgroundColor: c.accent,
    },
    xpText: {
      ...type.caption,
      color: c.textSecondary,
    },
  });

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';

import GlassCard from '@/components/ui/GlassCard';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { colors, fonts } from '@/constants/theme';

type GameMode = {
  key: string;
  label: string;
  route: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
};

const MODES: GameMode[] = [
  { key: 'who-are-ya', label: 'Who Are Ya?', route: '/(tabs)/', icon: 'futbol-o' },
  { key: 'grid', label: 'Grid', route: '/(tabs)/explore', icon: 'th' },
  { key: 'missing11', label: 'Missing 11', route: '/(tabs)/missing11', icon: 'users' },
  { key: 'connections', label: 'Connections', route: '/(tabs)/connections', icon: 'link' },
  { key: 'badge', label: 'Guess the Badge', route: '/(tabs)/badge', icon: 'shield' },
  { key: 'higherlower', label: 'Higher / Lower', route: '/(tabs)/higherlower', icon: 'arrows-v' },
  { key: 'agent', label: 'Agent', route: '/(tabs)/agent', icon: 'money' },
  { key: 'blindranking', label: 'Blind Ranking', route: '/(tabs)/blindranking', icon: 'sort-amount-desc' },
  { key: 'careertimeline', label: 'Career Timeline', route: '/(tabs)/careertimeline', icon: 'road' },
];

export default function DailyMenu() {
  const router = useRouter();
  const { completedModes, scoresByMode, checkAndResetForNewDay, getCompletedCount, getTotalModes } =
    useDailyProgressStore();

  useEffect(() => {
    checkAndResetForNewDay();
  }, [checkAndResetForNewDay]);

  const completedCount = getCompletedCount();
  const totalModes = getTotalModes();
  const progressPercent = totalModes > 0 ? (completedCount / totalModes) * 100 : 0;

  return (
    <GlassCard style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>TODAY&apos;S CHALLENGES</Text>

        {/* Progress summary */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {completedCount}/{totalModes} Complete
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        {/* Mode rows */}
        <View style={styles.modeList}>
          {MODES.map((mode) => {
            const done = !!completedModes[mode.key];
            const score = scoresByMode[mode.key];

            return (
              <Pressable
                key={mode.key}
                style={styles.modeRow}
                onPress={() => router.navigate(mode.route as any)}>
                <FontAwesome
                  name={mode.icon}
                  size={18}
                  color={done ? colors.pitchGreen : colors.steelGray}
                  style={styles.modeIcon}
                />
                <Text style={[styles.modeLabel, done && styles.modeLabelDone]} numberOfLines={1}>
                  {mode.label}
                </Text>
                {done ? (
                  <View style={styles.doneIndicator}>
                    {score !== undefined && <Text style={styles.scoreText}>{score}</Text>}
                    <FontAwesome name="check-circle" size={18} color={colors.pitchGreen} />
                  </View>
                ) : (
                  <View style={styles.playIndicator}>
                    <Text style={styles.playText}>PLAY</Text>
                    <FontAwesome name="chevron-right" size={12} color={colors.steelGray} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inner: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
  },
  progressRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: colors.chalkWhite,
    letterSpacing: 1,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(108,117,125,0.3)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.pitchGreen,
  },
  modeList: {
    gap: 2,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108,117,125,0.15)',
  },
  modeIcon: {
    width: 28,
    textAlign: 'center',
  },
  modeLabel: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontFamily: fonts.subheading,
    color: colors.chalkWhite,
  },
  modeLabelDone: {
    color: colors.steelGray,
  },
  doneIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreText: {
    fontSize: 13,
    fontFamily: fonts.subheading,
    color: colors.pitchGreen,
  },
  playIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playText: {
    fontSize: 12,
    fontFamily: fonts.subheading,
    color: colors.steelGray,
    letterSpacing: 1,
  },
});

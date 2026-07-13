import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, type Href } from 'expo-router';

import GlassCard from '@/components/ui/GlassCard';
import Confetti from '@/components/ui/Confetti';
import NextPuzzleCountdown from '@/components/ui/NextPuzzleCountdown';
import RetroButton from '@/components/ui/RetroButton';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useDisabledModes } from '@/hooks/useRemoteConfigStore';
import { colors, fonts } from '@/constants/theme';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { buildDailyRecapText } from '@/lib/sharing';
import { triggerImpact } from '@/lib/haptics';
import { playCheer } from '@/lib/sounds';

type GameMode = {
  key: string;
  label: string;
  route: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
};

const MODES: GameMode[] = [
  { key: 'careerpath', label: 'Career Path', route: '/(tabs)/', icon: 'road' },
  { key: 'who-are-ya', label: 'My name is...', route: '/(tabs)/whoareya', icon: 'futbol-o' },
  { key: 'grid', label: 'Grid', route: '/(tabs)/explore', icon: 'th' },
  { key: 'missing11', label: 'Missing 11', route: '/(tabs)/missing11', icon: 'users' },
  { key: 'connections', label: 'Connections', route: '/(tabs)/connections', icon: 'link' },
  { key: 'toplists', label: 'Top Lists', route: '/(tabs)/toplists', icon: 'list-ol' },
  { key: 'higherlower', label: 'Higher / Lower', route: '/(tabs)/higherlower', icon: 'arrows-v' },
  { key: 'agent', label: 'Agent', route: '/(tabs)/agent', icon: 'money' },
  {
    key: 'blindranking',
    label: 'Blind Ranking',
    route: '/(tabs)/blindranking',
    icon: 'sort-amount-desc',
  },
  {
    key: 'careertimeline',
    label: 'Career Timeline',
    route: '/(tabs)/careertimeline',
    icon: 'road',
  },
  {
    key: 'marketmovers',
    label: 'Market Movers',
    route: '/(tabs)/marketmovers',
    icon: 'line-chart',
  },
  {
    key: 'guessmatch',
    label: 'Guess the Match',
    route: '/(tabs)/guessmatch',
    icon: 'flag-checkered',
  },
];

export default function DailyMenu() {
  const router = useRouter();
  const { completedModes, scoresByMode, checkAndResetForNewDay, getCompletedCount, getTotalModes } =
    useDailyProgressStore();
  const recordPerfectDay = useDailyProgressStore((s) => s.recordPerfectDay);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);
  const disabledModes = useDisabledModes();

  const [showConfetti, setShowConfetti] = useState(false);

  const handleShareDay = useCallback(async () => {
    triggerImpact();
    const text = buildDailyRecapText({
      dailyNumber: getDailyNumber(),
      dailyStreak,
      totalModes: getTotalModes(),
      completedModes,
      scoresByMode,
    });
    try {
      // Copy as a fallback so the caption is available even if the OS share
      // sheet strips it; then open the native text share sheet.
      await Clipboard.setStringAsync(text);
    } catch {
      // best-effort
    }
    await Share.share({ message: text });
  }, [dailyStreak, getTotalModes, completedModes, scoresByMode]);

  useEffect(() => {
    checkAndResetForNewDay();
  }, [checkAndResetForNewDay]);

  const completedCount = getCompletedCount();
  const totalModes = getTotalModes();
  const progressPercent = totalModes > 0 ? (completedCount / totalModes) * 100 : 0;
  const isPerfect = completedCount > 0 && completedCount === totalModes;

  useEffect(() => {
    if (!isPerfect) return;
    // recordPerfectDay is date-guarded and returns true only the first time it
    // counts today, so the celebration fires exactly once per perfect day.
    if (!recordPerfectDay()) return;
    playCheer();
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, [isPerfect, recordPerfectDay]);

  return (
    <GlassCard style={styles.container}>
      {showConfetti && <Confetti />}
      <View style={styles.inner}>
        <Text style={styles.title}>TODAY&apos;S CHALLENGES</Text>

        {isPerfect && (
          <View style={styles.perfectBanner}>
            <Text style={styles.perfectText}>PERFECT DAY!</Text>
            <NextPuzzleCountdown />
            <View style={styles.shareDayButton}>
              <RetroButton title="Share your day" onPress={handleShareDay} />
            </View>
          </View>
        )}

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
            const disabled = disabledModes.includes(mode.key);

            return (
              <Pressable
                key={mode.key}
                style={[styles.modeRow, disabled && styles.modeRowDisabled]}
                disabled={disabled}
                onPress={() => {
                  if (disabled) return;
                  triggerImpact();
                  router.navigate(mode.route as Href);
                }}>
                <FontAwesome
                  name={mode.icon}
                  size={18}
                  color={done && !disabled ? colors.pitchGreen : colors.steelGray}
                  style={styles.modeIcon}
                />
                <Text style={[styles.modeLabel, done && styles.modeLabelDone]} numberOfLines={1}>
                  {mode.label}
                </Text>
                {disabled ? (
                  <Text style={styles.unavailableText}>Temporarily unavailable</Text>
                ) : done ? (
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
  perfectBanner: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(5,242,108,0.4)',
    backgroundColor: 'rgba(5,242,108,0.1)',
  },
  perfectText: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    letterSpacing: 3,
  },
  shareDayButton: {
    marginTop: 4,
    minWidth: 200,
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
  modeRowDisabled: {
    opacity: 0.4,
  },
  unavailableText: {
    fontSize: 11,
    fontFamily: fonts.subheading,
    color: colors.steelGray,
    fontStyle: 'italic',
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

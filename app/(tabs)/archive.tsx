import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, { FadeInDown } from 'react-native-reanimated';

import Screen from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Tappable from '@/components/ui/Tappable';
import { useTheme } from '@/hooks/useTheme';
import { type ThemeColors } from '@/constants/themes';
import { spacing, borderRadius, type, touch, motion } from '@/constants/theme';

/** Cap staggered entrances — no `entering` beyond this index. */
const STAGGER_CAP = 12;

// The modes wired for archive/practice play (their screens read ?practiceDate).
const PRACTICE_MODES = [
  { key: 'who-are-ya', icon: 'futbol-o' as const, route: '/(tabs)/whoareya' },
  { key: 'grid', icon: 'th' as const, route: '/(tabs)/explore' },
  { key: 'connections', icon: 'link' as const, route: '/(tabs)/connections' },
];

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ArchiveScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const days = useMemo(() => {
    const list: { dateStr: string; label: string }[] = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      list.push({ dateStr: toDateString(d), label: formatLabel(d) });
    }
    return list;
  }, []);

  const openPractice = (route: string, dateStr: string) => {
    router.push({ pathname: route, params: { practiceDate: dateStr } } as Href);
  };

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Practice"
        title="Archive"
        subtitle="Replay any of the last 30 days. Practice runs never affect your streak or stats."
      />
      {days.map((day, i) => {
        const row = (
          <View style={styles.row}>
            <View style={styles.dateWrap}>
              <Text style={styles.dateLabel}>{day.label}</Text>
              <Text style={styles.dateSub}>{day.dateStr}</Text>
            </View>
            <View style={styles.modeIcons}>
              {PRACTICE_MODES.map((m) => (
                <Tappable
                  key={m.key}
                  accessibilityLabel={`Practice ${m.key} on ${day.dateStr}`}
                  hoverStyle={{ backgroundColor: colors.bgCardPressed }}
                  style={styles.iconBtn}
                  onPress={() => openPractice(m.route, day.dateStr)}>
                  <FontAwesome name={m.icon} size={18} color={colors.accent} />
                </Tappable>
              ))}
            </View>
          </View>
        );
        return i < STAGGER_CAP ? (
          <Animated.View
            key={day.dateStr}
            entering={FadeInDown.delay(i * 40).duration(motion.base)}>
            {row}
          </Animated.View>
        ) : (
          <View key={day.dateStr}>{row}</View>
        );
      })}
    </Screen>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    dateWrap: {
      flex: 1,
    },
    dateLabel: {
      ...type.bodyBold,
      color: c.textPrimary,
    },
    dateSub: {
      ...type.caption,
      color: c.textMuted,
      marginTop: 2,
    },
    modeIcons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    iconBtn: {
      width: touch.min,
      height: touch.min,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.accentSoft,
    },
  });

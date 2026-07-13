import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { colors, fonts, spacing, borderRadius, gradients } from '@/constants/theme';
import { triggerImpact } from '@/lib/haptics';

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
    triggerImpact();
    router.push({ pathname: route, params: { practiceDate: dateStr } } as Href);
  };

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            Replay any of the last 30 days. Practice runs never affect your streak or stats.
          </Text>
          {days.map((day) => (
            <View key={day.dateStr} style={styles.row}>
              <View style={styles.dateWrap}>
                <Text style={styles.dateLabel}>{day.label}</Text>
                <Text style={styles.dateSub}>{day.dateStr}</Text>
              </View>
              <View style={styles.modeIcons}>
                {PRACTICE_MODES.map((m) => (
                  <Pressable
                    key={m.key}
                    style={styles.iconBtn}
                    onPress={() => openPractice(m.route, day.dateStr)}>
                    <FontAwesome name={m.icon} size={18} color={colors.pitchGreen} />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  intro: {
    fontFamily: fonts.subheading,
    fontSize: 13,
    color: colors.steelGray,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108,117,125,0.15)',
  },
  dateWrap: {
    flex: 1,
  },
  dateLabel: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.chalkWhite,
  },
  dateSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.steelGray,
    marginTop: 2,
  },
  modeIcons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(5,242,108,0.25)',
    backgroundColor: 'rgba(5,242,108,0.08)',
  },
});

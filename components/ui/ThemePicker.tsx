import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { borderRadius, spacing, type } from '@/constants/theme';
import { THEMES, ThemeColors, ThemeKey } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore } from '@/hooks/useThemeStore';
import Tappable from '@/components/ui/Tappable';

const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

/**
 * 2x2 grid of theme swatch cards. Each card previews its own theme
 * (bgBase surface + accent/streak/text dots) so the user sees what they
 * are picking; the active card gets an accent ring + checkmark.
 * Self-contained — drop into the Profile/More screen as <ThemePicker />.
 */
export default function ThemePicker() {
  const active = useTheme();
  const setTheme = useThemeStore((s) => s.setTheme);
  const styles = useMemo(() => createStyles(active.colors), [active.colors]);

  return (
    <View style={styles.grid}>
      {THEME_KEYS.map((key) => {
        const t = THEMES[key];
        const isActive = key === active.key;
        return (
          <Tappable
            key={key}
            haptic="success"
            onPress={() => setTheme(key)}
            accessibilityLabel={`Switch to ${t.label} theme`}
            hoverStyle={{ borderColor: active.colors.borderStrong }}
            style={[
              styles.card,
              {
                backgroundColor: t.colors.bgElevated,
                borderColor: isActive ? active.colors.accent : active.colors.border,
              },
            ]}>
            <View
              style={[
                styles.preview,
                { backgroundColor: t.colors.bgBase, borderColor: t.colors.border },
              ]}>
              <View style={[styles.previewCard, { backgroundColor: t.colors.bgCard }]} />
              <View style={styles.dotRow}>
                <View style={[styles.dot, { backgroundColor: t.colors.accent }]} />
                <View style={[styles.dot, { backgroundColor: t.colors.streak }]} />
                <View style={[styles.dot, { backgroundColor: t.colors.textPrimary }]} />
              </View>
            </View>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: t.colors.textPrimary }]} numberOfLines={1}>
                {t.label}
              </Text>
              {isActive && (
                <FontAwesome name="check-circle" size={16} color={active.colors.accent} />
              )}
            </View>
            <Text style={[styles.tagline, { color: t.colors.textSecondary }]} numberOfLines={2}>
              {t.tagline}
            </Text>
          </Tappable>
        );
      })}
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    card: {
      flexGrow: 1,
      flexBasis: '45%',
      borderWidth: 2,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    preview: {
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    previewCard: {
      height: 14,
      borderRadius: borderRadius.sm / 2,
      marginBottom: spacing.sm,
    },
    dotRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: borderRadius.full,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    label: {
      ...type.h3,
      flexShrink: 1,
    },
    tagline: {
      ...type.caption,
      marginTop: 2,
      color: c.textSecondary,
    },
  });

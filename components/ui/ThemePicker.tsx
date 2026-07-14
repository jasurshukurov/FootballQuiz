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
 * Grid of theme swatch cards. The first card is "Match device" (follow the OS
 * light/dark scheme); the rest each preview their own theme (bgBase surface +
 * accent/streak/text dots) so the user sees what they are picking. The card
 * matching the current *selection* gets an accent ring + checkmark — when the
 * selection is 'system' that is the Match-device card, not the resolved theme.
 * Self-contained — drop into the Profile/More screen as <ThemePicker />.
 */
export default function ThemePicker() {
  const active = useTheme();
  const selection = useThemeStore((s) => s.themeKey);
  const setTheme = useThemeStore((s) => s.setTheme);
  const styles = useMemo(() => createStyles(active.colors), [active.colors]);

  const systemActive = selection === 'system';

  return (
    <View style={styles.grid}>
      <Tappable
        key="system"
        haptic="success"
        onPress={() => setTheme('system')}
        accessibilityLabel="Match device appearance"
        testID="theme-option-system"
        hoverStyle={{ borderColor: active.colors.borderStrong }}
        style={[
          styles.card,
          {
            backgroundColor: active.colors.bgElevated,
            borderColor: systemActive ? active.colors.accent : active.colors.border,
          },
        ]}>
        <View style={[styles.systemPreview, { borderColor: active.colors.border }]}>
          <View style={[styles.systemHalf, { backgroundColor: THEMES.floodlit.colors.bgBase }]} />
          <View style={[styles.systemHalf, { backgroundColor: THEMES.daybreak.colors.bgBase }]} />
          <View style={styles.systemIconWrap}>
            <FontAwesome name="adjust" size={18} color={active.colors.accent} />
          </View>
        </View>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: active.colors.textPrimary }]} numberOfLines={1}>
            Match device
          </Text>
          {systemActive && (
            <FontAwesome name="check-circle" size={16} color={active.colors.accent} />
          )}
        </View>
        <Text style={[styles.tagline, { color: active.colors.textSecondary }]} numberOfLines={2}>
          Follows your light or dark setting
        </Text>
      </Tappable>

      {THEME_KEYS.map((key) => {
        const t = THEMES[key];
        const isActive = key === selection;
        return (
          <Tappable
            key={key}
            haptic="success"
            onPress={() => setTheme(key)}
            accessibilityLabel={`Switch to ${t.label} theme`}
            testID={`theme-option-${key}`}
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
    systemPreview: {
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.sm,
      height: 48,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    systemHalf: {
      flex: 1,
    },
    systemIconWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
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

import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  TAB_BAR_HEIGHT,
  WEB_CONTENT_MAX_WIDTH,
  useIsDesktopWeb,
  useIsWideWeb,
} from '@/components/ui/Screen';
import Tappable from '@/components/ui/Tappable';
import { borderRadius, motion, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useNavBarStore } from '@/hooks/useNavBarStore';
import { useTheme } from '@/hooks/useTheme';

/** Height of the minimized (icons-only) float pill. */
const COMPACT_HEIGHT = 40;

/** The three real tabs; every other registered route is href:null-hidden. */
const TAB_ICONS: Record<string, React.ComponentProps<typeof FontAwesome>['name']> = {
  index: 'calendar-check-o',
  profile: 'bar-chart',
  support: 'ellipsis-h',
};

// Wide web: pill capped to the content column, centered (matches Screen.tsx).
const WIDE_TAB_BAR_WIDTH = WEB_CONTENT_MAX_WIDTH - spacing.xl * 2;

/**
 * The one tab bar, replacing react-navigation's default. Two presentations,
 * user-selectable in More → Preferences:
 *  - float (default): the floating pill. While content scrolls down it
 *    minimizes to an icons-only 40pt bar (iOS/Instagram convention) and
 *    restores on scroll-up, back-at-top, or any tab press.
 *  - classic: flush full-width bottom bar, no rounding, no minimize.
 * Desktop web (>= 920) renders nothing — the sidebar navigates.
 */
export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const isWideWeb = useIsWideWeb();
  const isDesktopWeb = useIsDesktopWeb();
  const navStyle = useNavBarStore((s) => s.style);
  const collapsed = useNavBarStore((s) => s.collapsed) && navStyle === 'float';
  const reducedMotion = useReducedMotion();

  // Route changes always restore the pill: a fresh screen starts at the top.
  useEffect(() => {
    useNavBarStore.getState().setCollapsed(false);
  }, [state.index]);

  const progress = useSharedValue(0); // 0 = expanded, 1 = compact
  useEffect(() => {
    progress.value = withTiming(collapsed ? 1 : 0, {
      duration: reducedMotion ? 0 : motion.base,
    });
  }, [collapsed, progress, reducedMotion]);

  const barAnim = useAnimatedStyle(() => ({
    height: TAB_BAR_HEIGHT + (COMPACT_HEIGHT - TAB_BAR_HEIGHT) * progress.value,
  }));
  const labelAnim = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    height: type.micro.lineHeight * (1 - progress.value),
  }));

  if (isDesktopWeb) return null;

  const routes = state.routes.filter((r) => TAB_ICONS[r.name] !== undefined);
  const classic = navStyle === 'classic';

  const shell = classic
    ? [styles.shellClassic, { paddingBottom: insets.bottom }]
    : [
        styles.shellFloat,
        // Same offsets the pre-custom-bar pill used (proven on notched iPhones:
        // the home indicator area is why iOS floats higher).
        { bottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg },
        isWideWeb
          ? { width: WIDE_TAB_BAR_WIDTH, left: '50%' as const, marginLeft: -WIDE_TAB_BAR_WIDTH / 2 }
          : { left: spacing.xl, right: spacing.xl },
      ];

  return (
    <View style={shell} pointerEvents="box-none">
      <Animated.View style={[styles.row, classic ? styles.rowClassic : barAnim]}>
        {routes.map((route) => {
          const isFocused = state.routes[state.index].key === route.key;
          const { title } = descriptors[route.key].options;
          const tint = isFocused ? colors.accent : colors.textMuted;
          return (
            <Tappable
              key={route.key}
              haptic="none"
              accessibilityLabel={`${title} tab${isFocused ? ', selected' : ''}`}
              hitSlop={4}
              style={styles.item}
              onPress={() => {
                // A press on the minimized pill restores it either way.
                useNavBarStore.getState().setCollapsed(false);
                // Standard custom-bar contract: emit (fires the navigator's
                // tabPress listeners, e.g. the haptic) then navigate.
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}>
              <FontAwesome size={18} name={TAB_ICONS[route.name]} color={tint} />
              {classic ? (
                <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
                  {title}
                </Text>
              ) : (
                <Animated.View style={[styles.labelWrap, labelAnim]}>
                  <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
                    {title}
                  </Text>
                </Animated.View>
              )}
            </Tappable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    shellFloat: {
      position: 'absolute',
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
      opacity: 0.96,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
    shellClassic: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    rowClassic: {
      height: TAB_BAR_HEIGHT,
    },
    item: {
      flex: 1,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    labelWrap: {
      overflow: 'hidden',
    },
    label: {
      ...type.micro,
      userSelect: 'none',
    },
  });

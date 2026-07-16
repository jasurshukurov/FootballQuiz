import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '@/components/ui/ScreenBackground';
import { spacing } from '@/constants/theme';

// 56 (was 64): every point of chrome comes out of the play area on phones —
// the pill still fits its icon + label rows comfortably (2026-07-15 density pass).
export const TAB_BAR_HEIGHT = 56;

/**
 * Desktop-web content column. At wide web viewports screen content is capped
 * to a centered phone-ish column so game boards don't stretch across a
 * monitor; the gradient background still fills the full window. Native and
 * narrow web (< WEB_WIDE_BREAKPOINT) are completely unaffected.
 */
export const WEB_WIDE_BREAKPOINT = 720;
export const WEB_CONTENT_MAX_WIDTH = 600;

/**
 * At/above this width the web app switches to the two-pane desktop layout
 * (persistent sidebar + narrower content column); below it, and on ALL native,
 * the single-column + floating-tab-bar layout stands. The 720-919 band keeps
 * the wide centered column (WEB_CONTENT_MAX_WIDTH) with the tab bar.
 */
export const WEB_DESKTOP_BREAKPOINT = 920;

/** True only on web at desktop-ish widths. Safe to call on native (always false). */
export function useIsWideWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= WEB_WIDE_BREAKPOINT;
}

/**
 * True only on web wide enough for the two-pane sidebar layout (>= 920px).
 * Safe to call on native (always false). Implies useIsWideWeb().
 */
export function useIsDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= WEB_DESKTOP_BREAKPOINT;
}

interface ScreenProps {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Reserve space for the floating tab bar (default true). */
  withTabBar?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/**
 * Standard screen shell: gradient background + safe-area padding +
 * tab-bar clearance. Replaces the per-screen LinearGradient/insets
 * boilerplate — every route should render inside <Screen>.
 */
export default function Screen({
  children,
  scroll = true,
  withTabBar = true,
  style,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  // TAB_BAR_HEIGHT + spacing.lg clears the floating pill exactly (its bottom
  // offset is spacing.lg on web/Android); the extra spacing.md is breathing
  // room so the last row never kisses the pill at full scroll.
  const paddingBottom = withTabBar
    ? TAB_BAR_HEIGHT + insets.bottom + spacing.lg + spacing.md
    : insets.bottom;
  // Web has no notch inset, which left content glued to the browser edge —
  // give it a real top margin (md: mobile-web viewports are short, so the old
  // lg+sm=24pt band was play-area money). Native keeps the safe-area value.
  const paddingTop = Math.max(insets.top, Platform.OS === 'web' ? spacing.md : 0) + spacing.xs;
  // Wide desktop web only: center content in a phone-ish column. undefined on
  // native / narrow web so those style arrays stay byte-identical. One 600pt
  // column for ALL wide web (with or without the sidebar) — a narrower
  // desktop column made the game feel cramped next to the rail.
  const isWide = useIsWideWeb();
  const wideColumn = isWide ? styles.wideColumn : undefined;

  return (
    <ScreenBackground style={style}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingTop, paddingBottom },
            wideColumn,
            contentStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.flex,
            styles.content,
            { paddingTop, paddingBottom },
            wideColumn,
            contentStyle,
          ]}>
          {children}
        </View>
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  wideColumn: {
    width: '100%',
    maxWidth: WEB_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
});

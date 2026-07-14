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

export const TAB_BAR_HEIGHT = 64;

/**
 * Desktop-web content column. At wide web viewports screen content is capped
 * to a centered phone-ish column so game boards don't stretch across a
 * monitor; the gradient background still fills the full window. Native and
 * narrow web (< WEB_WIDE_BREAKPOINT) are completely unaffected.
 */
export const WEB_WIDE_BREAKPOINT = 720;
export const WEB_CONTENT_MAX_WIDTH = 600;

/** True only on web at desktop-ish widths. Safe to call on native (always false). */
export function useIsWideWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= WEB_WIDE_BREAKPOINT;
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
  const paddingBottom = withTabBar ? TAB_BAR_HEIGHT + insets.bottom + spacing.lg : insets.bottom;
  // Wide desktop web only: center content in a phone-ish column. undefined on
  // native / narrow web so those style arrays stay byte-identical.
  const wideColumn = useIsWideWeb() ? styles.wideColumn : undefined;

  return (
    <ScreenBackground style={style}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.sm, paddingBottom },
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
            { paddingTop: insets.top + spacing.sm, paddingBottom },
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

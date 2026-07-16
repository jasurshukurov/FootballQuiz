import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Tab bar presentation preference.
 *  - 'float'   — the floating pill; minimizes to an icons-only bar while the
 *                user scrolls content down and restores on scroll-up / top /
 *                any tab press (iOS 26 / Instagram-style behavior).
 *  - 'classic' — a standard flush, full-width bottom bar. Never minimizes.
 */
export type NavBarStyle = 'float' | 'classic';

interface NavBarState {
  /** Persisted user preference (More → Preferences → Classic tab bar). */
  style: NavBarStyle;
  /** Ephemeral: true while the float pill is minimized. Never persisted. */
  collapsed: boolean;
}

interface NavBarActions {
  setStyle: (style: NavBarStyle) => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useNavBarStore = create<NavBarState & NavBarActions>()(
  persist(
    (set) => ({
      style: 'float',
      collapsed: false,
      setStyle: (style) => set({ style, collapsed: false }),
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    {
      name: 'navbar-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      // The minimize state is a live scroll response, not a preference.
      partialize: (s) => ({ style: s.style }) as NavBarState & NavBarActions,
    },
  ),
);

/** Scroll offset where the pill always restores, whatever the direction. */
const TOP_ZONE = 12;
/** Direction dead-band so sub-pixel scroll jitter can't flap the bar. */
const JITTER = 3;

let lastY = 0;

/**
 * Scroll-linked minimize driver. Screen.tsx reports its ScrollView offset
 * here: scrolling down tucks the float pill away (content gets the room),
 * scrolling up or returning to the top brings it back. No-op in classic
 * style. Game screens with fixed layouts never scroll, so their bar simply
 * stays put.
 */
export function reportNavBarScroll(y: number) {
  const { style, collapsed, setCollapsed } = useNavBarStore.getState();
  const dy = y - lastY;
  lastY = y;
  if (style !== 'float') return;
  if (y <= TOP_ZONE) {
    if (collapsed) setCollapsed(false);
    return;
  }
  if (dy > JITTER && !collapsed) setCollapsed(true);
  else if (dy < -JITTER && collapsed) setCollapsed(false);
}

/** New scroll surface (screen focus/mount): re-baseline the direction delta. */
export function resetNavBarScrollBaseline(y = 0) {
  lastY = y;
}

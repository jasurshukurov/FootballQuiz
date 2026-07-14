# Floodlit Pitch — Design System v2

The UI revamp contract. Every screen and component must follow this. Tokens live in
`constants/theme.ts`; shared shells in `components/ui/Screen.tsx` and
`components/ui/ScreenHeader.tsx`.

## Direction

Dark-first, green-tinted near-black base (`colors.bgBase` #0A0F0C), floodlight-white
text, ONE electric green accent (`colors.accent`), ONE warm amber accent
(`colors.streak`) reserved for streaks/hints/fire. Mood: Champions League night game.
The old navy/purple "neo-retro broadcast" palette is retired — legacy token names now
map to the new palette, but migrated files must use the semantic names.

## Hard rules

1. **No hardcoded style values.** No hex literals, no `rgba(...)` literals, no raw
   `fontSize:` numbers in screens/components. Colors come from `colors.*`, text styles
   from `type.*` (spread: `{ ...type.h2, color: colors.textPrimary }`), spacing from
   `spacing.*`, radii from `borderRadius.*`, durations/springs from `motion.*`.
   Exception: `components/career/CareerClubCard.tsx` club-jersey color data map and
   `data/teamColors.ts` (real-world club colors are data, not theme).
2. **Every route renders inside `<Screen>`** (from `components/ui/Screen.tsx`) —
   delete per-screen `LinearGradient` + `useSafeAreaInsets` + local `TAB_BAR_HEIGHT`
   boilerplate. Import `TAB_BAR_HEIGHT` from Screen.tsx if needed.
   `<Screen scroll={false}>` for screens managing their own lists.
3. **Every game screen uses `<ScreenHeader>`** with `eyebrow` = "DAILY #N" (or
   "PRACTICE"), `title` = mode name, `right` = lives/streak/timer widget.
4. **Fonts:** `type.*` styles only. Barlow Condensed for headlines, Inter for UI text
   (`fonts.body/bodyMedium/bodySemiBold/bodyBold` — loaded in app/_layout.tsx),
   SpaceMono ONLY for scores/numbers/share text (`type.score`, `type.scoreLarge`).
   Never raw font-family strings.
5. **Touch targets:** every Pressable ≥ `touch.min` (44pt); primary CTAs
   `touch.cta` (56pt) tall, full-width, bottom-anchored on game screens. Submit/CTA
   never at the top of the screen.
6. **One accent per screen.** Green is the interactive/positive color. Amber only for
   streaks/hints. Red only for lives lost/wrong answers. Result states are the loudest
   element on the screen — nothing else competes.
7. **Contrast:** body text `colors.textPrimary` or `textSecondary` only (both pass
   4.5:1 on bgBase). `textMuted` for decorative/disabled only.
8. **Motion:** use `motion.spring` for reveals/settles, `motion.springBouncy` for
   celebration pops, `motion.fast/base/slow` durations. Haptics (lib/haptics.ts) only
   at result reveal and streak milestones — never on every tap. Respect
   `useReducedMotion()` from reanimated where a loop/large animation runs
   (swap for a simple fade).

## Navigation architecture (NYT Games model)

**3 visible tabs** (was 4): 
- **Today** (`index.tsx`) — the hub. Greeting + date + daily progress meter
  ("7/11 played"), then a vertical feed of state-aware game cards (one per
  registry mode — never hardcode the count) grouped:
  "Up next" (unplayed, full-size cards) → "Done today" (compact rows with result
  glyph). Each card: mode icon, name, one-line tease, state (unplayed CTA arrow /
  completed result glyph + score). Tapping a completed card re-opens its result.
  Archive/practice entry card at the bottom, visually subordinate (muted).
- **Stats** (`profile.tsx`) — hero streak number, per-mode stat cards, calendar-style
  played-days strip. Screenshot-worthy.
- **More** (`support.tsx`) — settings, notifications, support/donate, tutorial replays,
  archive link.

The Career Path game moves from `index.tsx` to a new hidden route
`app/(tabs)/careerpath.tsx` (+ `app/games/career.tsx` re-export updated). `modes.tsx`
is deleted (hub replaces it); any `router.push` to `/modes` → `/`. All game routes stay
hidden tabs (`href: null`) as today. Daily progress store mode keys DO NOT change.

Tab bar: keep the floating pill, restyle with v2 tokens (bgElevated at 0.94 opacity,
border `colors.border`, active = green icon + dot, inactive = textMuted).

## Game-over checklist (every mode)

Game-over must include, in order: verdict moment (win/partial/loss each designed —
losses get a graceful "the answer was…" reveal, never shame), solve-summary
visualization, streak/stats delta, share row (CopyResultButton emoji text + image
share), NextPuzzleCountdown, "Next up: [unplayed mode]" CTA (use
`getNextUnplayedMode()` helper — see below), practice link. Board stays visible where
layout allows; game-over content scrolls (never occluded by tab bar).
`components/ui/GameOverExtras.tsx` should render countdown + next-up CTA so every
screen gets this for free.

## Component notes

- `RetroButton` → restyle as the single button primitive: variants primary (green fill,
  `textOnAccent` label), secondary (bgCard + border), danger, ghost. 56pt primary.
- `GlassCard` → `bgCard` + `border`, radius `borderRadius.lg`.
- `StreakBadge` → amber flame + count, pops with `motion.springBouncy` on increment.
- `Confetti` → scale particle count with result quality (perfect > win > partial).
- Shareable* cards → re-skin with v2 palette; must include app name, "Football Daily
  #N", mode icon, result glyphs; NEVER the answer. Dark card, green accent — must look
  good in a WhatsApp feed.
- Legacy Expo boilerplate (`Themed.tsx`, `StyledText.tsx`, `EditScreenInfo.tsx`,
  `PlayerSearch.tsx`) — do not restyle; leave untouched (candidates for later removal).

## Theming & Interaction (v3)

The app is now multi-theme. Four themes live in `constants/themes.ts` — `floodlit`
("Floodlit Night", default, dark), `blackout` ("Blackout", AMOLED dark, volt accent),
`daybreak` ("Daybreak", light), `vintage` ("Vintage Kit", retro-paper light). All four
share one `Theme` shape: identical `ThemeColors` keys (semantic tokens AND legacy
aliases), `ThemeGradients`, `ThemeShadows`. The active theme persists via
`hooks/useThemeStore.ts` (zustand, key `theme-storage`) and is read with
`useTheme()` / `useThemeColors()` from `hooks/useTheme.ts`.

### Migration pattern (every component file)

1. Replace `import { colors, gradients, shadows } from '@/constants/theme'` with
   `const { colors } = useTheme()` (or `const colors = useThemeColors()`) inside the
   component. `spacing`, `borderRadius`, `type`, `fonts`, `motion`, `touch`, `opacity`
   stay as static imports — they are theme-independent forever.
2. Any module-scope `StyleSheet.create` that references colors becomes a factory:

   ```tsx
   const createStyles = (c: ThemeColors) =>
     StyleSheet.create({
       card: { backgroundColor: c.bgCard, borderColor: c.border },
     });

   // inside the component:
   const { colors } = useTheme();
   const styles = useMemo(() => createStyles(colors), [colors]);
   ```

   (`ThemeColors` is exported from `constants/themes.ts`.) Layout-only styles
   (flex, padding, sizes) may stay module-scope in a separate `StyleSheet.create`.
3. NEVER leave a static `colors`/`gradients`/`shadows` import in a component file.
   The static exports in `constants/theme.ts` are the floodlit fallback for
   non-React code only (share-text builders, notifications, scripts).
4. NO component may hardcode hex/rgba — a hardcoded color is invisible to theme
   switching. (Existing exceptions stand: club-jersey data maps and
   `data/teamColors.ts` are data, not theme.)
5. Glow shadows: use `useTheme().shadows.neonGlow` — its shadowColor is the theme
   accent, so a static import would glow the wrong color on other themes.

### Tappable (the pressable primitive)

All new touchables use `components/ui/Tappable.tsx` — never raw
`Pressable`/`TouchableOpacity` unless a style-function edge case requires it.
It provides the press-scale spring (0.97, `motion.spring`), haptics
(`haptic="impact" | "success" | "none"`, default impact), web hover +
cursor:pointer, and default hitSlop.

```tsx
<Tappable
  onPress={select}
  hoverStyle={{ backgroundColor: colors.bgCardPressed }}
  style={styles.card}>
  ...
</Tappable>
```

**Hover rule:** every tappable card gets
`hoverStyle={{ backgroundColor: colors.bgCardPressed }}`.

### Staggered entrances

Card lists animate in with reanimated entering transitions:

```tsx
<Animated.View entering={FadeInDown.delay(i * 40).duration(motion.base)}>
```

Don't animate more than the first 12 items (pass no `entering` beyond index 11).
Respect `useReducedMotion()` for loops/large animations as before.

### Other v3 primitives

- `components/ui/ProgressRing.tsx` — animated SVG progress ring
  (`{ size, strokeWidth, progress: 0..1, color, trackColor, children? }`).
- `components/ui/ThemePicker.tsx` — self-contained theme switcher grid for the
  settings/profile surface.

## Anti-patterns (do not introduce)

Guilt copy on losses/streak loss; interstitials before play; timers by default;
horizontal-scroll mode discovery; haptics/confetti on every tap; everything-is-colorful
screens; answer text in share output.

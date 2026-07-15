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

v3 (2026-07-15) additions:
- **Desktop web >= 920px** is two-pane: `components/ui/Sidebar.tsx` (280pt — wordmark,
  Today/Stats/More nav, ring card, NEXT DAILY IN) + 480pt game column; tab bar hidden.
  720-919 keeps the 600pt centered column + pill. Mobile/native untouched.
- **Weekday tier names** (ramp strip + hero chip, `DifficultyBanner.todayBandDisplay`):
  Warm-up / Standard / Standard / Tricky / Hard / Expert, Sunday = Classic. Fame
  windows stay in lib/difficultyCurve.ts.
- **Motion is ease-only** — no bouncy springs anywhere; flourish (Confetti,
  StreakFlame flicker, FloodlightSweep) must gate on `useReducedMotion()`.
- Career Path game-over = verdict card (answer + "nation · position") then TODAY'S
  RESULT (rank/time/clues) and YOUR PROGRESSION (+XP count-up, StreakFlame, X/N
  played) — see `components/career/CareerResultSummary.tsx`; wins fire
  `components/ui/FloodlightSweep.tsx` over the board. Fresh-day hub must stay
  <= 1.5 screens at 390x844.

## Game-over checklist (every mode)

Game-over must include, in order: verdict moment (win/partial/loss each designed —
losses get a graceful "the answer was…" reveal, never shame), solve-summary
visualization, streak/stats delta (a new all-time best shows "New best!" via
`useIsNewBestStreak`), share row (Share Result + CopyResultButton side by side —
`GameOverActions` lays this out), "Next up: [unplayed mode]" CTA (use
`getNextUnplayedMode()` helper — see below), NextPuzzleCountdown, practice link.
Board stays visible where layout allows; game-over content scrolls (never occluded
by tab bar). `components/ui/GameOverExtras.tsx` renders next-up + countdown so every
screen gets this for free.

Two sanctioned surfaces (v2.1, Claude Design "game-over" spec):

- **`components/ui/GameOverSheet.tsx`** — bottom sheet sliding up over the finished
  board (scrim keeps it visible): grab handle, condensed verdict (accentBright on
  win), staggered glyph row (green hit / amber warm / red miss), StreakBadge, action
  row, NEXT UP + countdown. Dismissing (scrim/handle) lets the player study the
  board. Use it when the finished board is the payoff: Who Are Ya, Connections,
  Missing XI.
- **Inline full-screen result block** — for reveal-heavy endings that need their own
  scroll real estate (Career Path, Grid, Top Lists, Higher/Lower, Transfer Agent,
  Blind Ranking, Career Timeline, Guess the Match). Same checklist order applies.

Rollback: each mode's sheet migration is a single commit; revert it to restore that
mode's previous modal (baseline tag `v2.0-floodlit`).

## Component notes

- `GiveUpButton` (`components/ui/GiveUpButton.tsx`) → the one give-up control,
  present in EVERY mode during active play (never on game over or a restored
  daily). Hold-to-confirm: a danger-tinted fill sweeps the pill for 700ms and
  fires on completion; early release drains it back. The fill is functional
  progress feedback, so it does not gate on reduced motion. Give-up routes into
  the mode's existing loss/finish path (graceful reveal, score-so-far, daily
  completion recorded) — never a bespoke end state.
- `RetroButton` → the single button primitive: variants primary (green fill,
  `textOnAccent` label), secondary (bgCard + border), danger, ghost. 56pt primary,
  16pt radius (`borderRadius.lg`, per the design system buttons spec).
- `GlassCard` → `bgCard` + `border`, radius `borderRadius.lg`.
- `StreakBadge` → amber flame + count, pops with `motion.springBouncy` on increment.
- `Confetti` → scale particle count with result quality (perfect > win > partial).
- Shareable* cards → all built on `components/ShareCardShell.tsx` (v2.1): card
  gradient + `accentBorder`, "⚽ FOOTBALL DAILY #N" badge with 🔥 streak top-right,
  condensed uppercase mode title, mode glyphs as children, footer verdict (scoreboard
  mono) + footballquiz.app; NEVER the answer. Must look good in a WhatsApp feed.
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

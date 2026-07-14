# Design Brief for Claude Design — Football Daily UX/Design Improvement

**Date:** 2026-07-14 · **State:** post "UI revamp v2" commit (`8c1eda7`)
**Audience:** a design-focused Claude session (or human designer) tasked with proposing
and implementing the next UX/design iteration.
**How to use this doc:** §1–3 tell you what exists and why; §4–7 are the audit —
observed friction, grounded in code/screens with file references; §8 is the prioritized
ask. §9 lists hard constraints you must not violate. Verify any claim against the code
before building on it.

---

## 1. Product snapshot

Football Daily is an Expo (SDK 54) / React Native 0.81 / expo-router 6 trivia app that
ships to iOS, Android, and **web from one codebase**. The core loop is NYT-Games-style:
**11 daily puzzle modes**, one puzzle per mode per local day, plus practice/archive for
some modes. Progression: per-run **rank ladder** (Kickoff → Ballon d'Or), cumulative
**XP**, daily **streak**, per-mode adaptive **skill tier** that quietly shifts
difficulty, and a Mon-easy → Sat-expert weekly difficulty ramp.

The 11 modes (registry order, `lib/modeRegistry.ts`): Career Path, My Name Is… (Who Are
Ya), The Grid, Missing XI, Connections, Top Lists, Higher/Lower, Transfer Agent, Blind
Ranking, Career Timeline, Guess the Match. (Market Movers was deprecated 2026-07-14 as
a duplicate of Higher/Lower; its screen is dormant but routable.)

Monetization surfaces that exist in the UI today: rewarded-ad-gated hints (several
modes), a Pro flag that ungates them, `BannerAd` component, support/donate screen.
Sharing (image + text) is fully built but **hidden behind `FEATURES.sharing = false`**
(`lib/featureFlags.ts`) pending a design pass.

## 2. Current design system (read `DESIGN_SYSTEM.md` first — it is the contract)

- **Tokens:** `constants/theme.ts` (spacing, radii, `type.*` scale, `motion.*`,
  `touch.*`) and `constants/themes.ts` (the 4-theme engine). Fonts: Barlow Condensed
  (headlines), Inter (UI), SpaceMono (scores only).
- **Themes:** 4 complete palettes — Floodlit (default, dark green-black), Blackout
  (pure dark), Daybreak (light), Vintage (cream/retro). Picker in Stats/More. Every
  migrated component takes colors via `useTheme()` + `createStyles(c)` factories; no
  hardcoded hex/rgba in screens.
- **Primitives:** `Tappable` (press-scale + haptic + web hover), `Screen` (gradient
  shell, safe areas, 600px web column), `ScreenHeader` (eyebrow/title/right-widget +
  the new "?" how-to-play slot), `RankBadge`, `TierBadge`, `StreakBadge`, `PopInView`,
  `ProgressRing`, `HowToPlaySheet`, `GameOverActions`/`GameOverExtras` (shared result
  stack), `PlayerSearchAutocomplete` (the one search component), `SolveTimeChip`.
- **Animation policy (owner-driven, non-negotiable):** no overshoot/bounce ("jumping")
  anywhere. The owner flagged this three separate times. Game-screen entrances are
  opacity-only `FadeIn`; `PopInView` scales 0.96→1; `springBouncy` is tuned to
  damping 26. Hub may use `FadeInDown`. Stable list keys so rows never remount and
  replay entrances mid-game (`components/games/CareerTimeline.tsx` regression is the
  cautionary tale).
- **Navigation:** 3 tabs — Today (hub feed), Stats, More. Game screens are tab-hidden
  routes. Web: content column max 600px, centered pill tab bar, `+html.tsx` shell.
- **Onboarding:** per-mode how-to-play sheet auto-shows on first visit
  (`hooks/useTutorialStore.ts`), reopenable from the header "?".

## 3. What is working well (keep, don't regress)

- One-accent-per-screen discipline; result states are the loudest element.
- The hub's Up-Next card + state-aware feed; completed cards re-open their result
  (daily re-entry restoration, `hooks/useDailyResultsStore.ts`).
- Unified game-over contract (rank, countdown, next-up) — enforced by e2e
  (`scripts/qa/e2e/assertions.mjs`).
- The how-to-play sheets: accurate, short, themed; solved the "lost user" problem.
- Search feels instant and surfaces famous players first without breaking exactness
  (`lib/playerSearch.ts` bucket design).
- 4-theme rendering is clean — a fresh visual playtest (4 themes × hub + game +
  rules sheet) showed zero console errors and no broken layouts.

## 4. Global friction points (observed, with evidence)

1. **Difficulty visibility is inconsistent.** TierBadge appears on only 3 modes
   (Career Path, Who Are Ya, Missing XI). The other 8 have real difficulty machinery
   (weekly ramp + adaptive skill) but show nothing. Users can't tell Saturday is
   "expert day" or that the app adapts to them — the how-to-play footer is the only
   hint. Opportunity: a single, subtle difficulty affordance across all modes (or a
   deliberate decision to show none — current half-state is the worst option).
2. **Two progression currencies confuse.** Rank badge = this run's score; XP = separate
   cumulative currency; streak = a third. Nothing on the game-over screen explains
   their relationship (the rules sheets now do, but only if opened). Consider a
   game-over layout that visually separates "today's result" from "your progression".
3. **Hint models differ per mode** (free-then-ad in Career Path, one-ad-hint in Who Are
   Ya/Missing XI, XP-cost in Career Timeline, free-count in Grid/Transfer Agent).
   Each is fine locally; together they erode learnability. A unified hint visual
   language (icon, cost display, count display) would help even if economics stay
   per-mode.
4. **Row-header text wrapping in The Grid:** "Midfielder" wraps mid-word ("Midfield
   er") in narrow row headers — observed in the Vintage theme playtest at 430px
   (`components/ui/GridHeaderCell.tsx`). Needs `adjustsFontSizeToFit`, a shorter label
   set ("MID"), or wider row-header column.
5. **Hub scroll length.** 11 full-size cards ≈ 3 screens of scrolling before "Done
   today". Once 5+ modes are played the feed self-compresses, but a fresh day is a
   wall. Ideas: 2-column compact grid on web/tablet widths, collapsible sections, or
   a "continue where you left off" ordering.
6. **Sharing re-enable needs design.** All share cards (`components/Shareable*.tsx`)
   predate the theme engine's polish and the flag-off decision. When sharing returns,
   the share image should be a designed, brand-consistent artifact (current cards are
   functional but visually dated) and the buttons need a less button-stack placement.
7. **The `modes.tsx` tab was removed; `archive.tsx` and practice entries are
   subordinate** — archive discovery is weak. Players who finish the day have no
   promoted "keep playing" path besides small links.
8. **Dead-state copy varies** ("ALREADY PLAYED TODAY" panel styles differ slightly per
   mode). Worth one shared `AlreadyPlayed` component.
9. **Notification settings** (`components/ui/NotificationSettings.tsx`) are functional
   but buried in More; a one-time, post-first-win soft prompt ("want a reminder
   tomorrow?") would convert better than a settings row — and is compliant with the
   no-launch-prompt policy.

## 5. Per-mode notes (friction → idea)

- **Career Path** — strongest mode UX (proximity chips, hint panel). Friction: hint
  panel takes vertical space on small phones before the timeline. Idea: collapse hints
  into a horizontal chip row.
- **Who Are Ya** — the 5-column feedback grid is dense at 430px; column labels
  truncate. Idea: bigger tap targets on past-guess rows, and a legend row that fades
  after the first guess.
- **The Grid** — new mixed-axis engine is good. Friction: #4 above; also the cell
  "?" placeholder and the header "?" info button use the same glyph (an e2e bug came
  from this — `scripts/qa/e2e/modes/grid.mjs`). Consider a different empty-cell mark.
- **Missing XI** — pitch layout is always 4-4-2 regardless of the real formation;
  fine for guessing but odd for football purists. TierBadge + category chip land in a
  header block that's getting crowded (daily number, tier, category, lives).
- **Connections** — tile text auto-shrinks for long names; two-word Brazilian names
  still tight. The "one away" toast is good; consider matching NYT's post-game
  recap board for shareability later.
- **Top Lists** — live RankBadge while typing is a delight moment; keep. No give-up
  is intentional (one attempt/day) but there's no way to concede and see answers —
  players who stall just leave. Consider "reveal & finish" after N wrong.
- **Higher/Lower** — sudden-death + milestone confetti works. The per-card
  Easy→Expert label is the only difficulty label in the app styled ad-hoc — align it
  with TierBadge vocabulary.
- **Transfer Agent** — reveal card teaches well. Auto-advance (~1.5s) can feel rushed
  when reading the lesson; consider tap-to-continue after a wrong pick.
- **Blind Ranking** — irreversible slots are the game, but accidental taps sting;
  a micro "place here?" confirm on first-ever placement (or undo-within-1s) would
  soften the top complaint risk.
- **Career Timeline** — hint costs XP but XP's value is invisible in-game; show the
  XP delta on the game-over screen.
- **Guess the Match** — reveal-order-by-fame is clever; make the "fewer reveals =
  more points" tradeoff visible near the reveal button (current: only in rules sheet).

## 6. Accessibility gaps (unaudited areas)

- Contrast is only verified for Floodlit's `textPrimary/textSecondary` on `bgBase`
  (per DESIGN_SYSTEM.md rule 7). **Daybreak and Vintage have had no contrast audit.**
- Dynamic type / font scaling: unhandled — large accessibility font sizes will break
  fixed-height cells (Grid, Connections tiles, tab pill).
- Screen-reader coverage: `Tappable` supports roles/labels and the "?" button has one,
  but game boards (Grid cells, Connections tiles, pitch slots) lack meaningful
  `accessibilityLabel`s.
- Reduced motion: honored where loops/confetti run, but not systematically verified.
- Web keyboard play: focus-visible rings exist; full keyboard operability of boards
  (arrow-key cell navigation) does not.

## 7. Web/desktop parity notes

- 600px column + centered tab pill works; wide-screen (>1100px) is just a narrow
  column in a void — an opportunity for a two-pane layout (board + sidebar with
  rank/streak/next-up) on desktop.
- Hover states exist on cards/buttons; board elements (tiles, cells, slots) got them
  via Tappable, but cursor affordances on drag-free boards are unverified.
- The how-to-play sheet dismisses via backdrop and Escape (good); other modals should
  match (check `app/modal.tsx`, GiveUp confirm).

## 8. Prioritized asks

**P0 (small, high-value, do first)**
1. Fix Grid row-header word-wrap (§4.4).
2. Unify the difficulty affordance across all 11 modes (§4.1) — includes aligning
   Higher/Lower's ad-hoc labels (§5).
3. Shared `AlreadyPlayed` end-state component (§4.8).

**P1 (medium)**
4. Game-over layout that separates run-result from progression (rank vs XP vs streak,
   §4.2), including Career Timeline's XP-delta visibility (§5).
5. Unified hint visual language (§4.3).
6. Hub density pass for fresh-day scroll length + desktop two-pane exploration
   (§4.5, §7).
7. Contrast audit of Daybreak + Vintage; fix failing tokens in `constants/themes.ts`
   (§6).

**P2 (larger/strategic)**
8. Share-card redesign + `FEATURES.sharing` re-enable plan (§4.6).
9. Archive/practice discovery surface (§4.7).
10. Accessibility: dynamic type strategy, board screen-reader labels, web keyboard
    board navigation (§6, §7).
11. Post-first-win notification soft prompt (§4.9).

## 9. Hard constraints (violating these fails review)

- **Everything in `DESIGN_SYSTEM.md`** — tokens only, Screen/ScreenHeader shells,
  one accent per screen, 44pt touch targets, bottom-anchored CTAs.
- **No bouncy/overshoot/vertical-slide animations on game screens.** Owner feedback,
  three times. FadeIn only; stable list keys.
- **Theme-complete:** every new color must exist in all 4 themes in
  `constants/themes.ts`; test in all 4.
- **Web parity:** every change must work in the 600px web column; e2e runs on web.
- **IP-free content only:** no club crests, kit designs, player likenesses, or
  licensed assets. Text, generic shapes, and verified-license images
  (`data/` attribution fields) only.
- **Never hardcode the mode count** — derive from `lib/modeRegistry.ts`.
- **The e2e gate is the contract:** `npm run qa:e2e` (12 modules) must stay green;
  game-over must keep rank + countdown + next-up and (currently) NO share/copy
  buttons. Unit gate: `npx jest`. Types: `npx tsc --noEmit`.
- **Persisted store keys** (`mode.key`, zustand `name:`s) must never change.

## 10. File map (fast orientation)

| Area | Files |
|---|---|
| Design contract | `DESIGN_SYSTEM.md` |
| Tokens/themes | `constants/theme.ts`, `constants/themes.ts` |
| Theme runtime | `hooks/useTheme.ts`, `hooks/useThemeStore.ts` |
| Shells/primitives | `components/ui/Screen.tsx`, `ScreenHeader.tsx`, `Tappable.tsx`, `HowToPlaySheet.tsx`, `RankBadge.tsx`, `GameOverActions.tsx` |
| Mode registry + rules copy | `lib/modeRegistry.ts`, `lib/howToPlay.ts` |
| Hub | `app/(tabs)/index.tsx`, `components/games/DailyMenu.tsx` |
| Game screens | `app/(tabs)/{careerpath,whoareya,explore,missing11,connections,toplists,higherlower,agent,blindranking,careertimeline,guessmatch}.tsx` |
| Difficulty/progression | `lib/difficultyCurve.ts`, `hooks/useSkillStore.ts`, `lib/rankLadder.ts`, `hooks/useDailyProgressStore.ts` |
| Feature flags | `lib/featureFlags.ts` |
| QA | `scripts/qa/e2e/` (runner, per-mode modules), `npm run qa:e2e` |

*Compiled from the 2026-07 revamp session: engineering reports, 4-theme visual
playtests, and the full e2e/jest/tsc gate at commit `8c1eda7`.*

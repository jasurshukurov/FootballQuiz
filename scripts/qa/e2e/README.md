# E2E regression gate

One command plays **every registered daily game mode to a genuine end state** against the
live Expo-web build, plus hub / stats / more / archive navigation, and asserts
the shared game-over contract + per-mode invariants. It exits non-zero on any
failure — wire it into CI or run it before shipping a UI/engine change.

## Run it

```bash
# 1. Start the Expo web dev server (separate terminal), serving on :8081
npm run web        # or: expo start --web

# 2. Run the gate
npm run qa:e2e
```

Options:

- **Different port / host:** `EXPO_URL=http://localhost:8082 npm run qa:e2e`
- **Subset of modes:** `node scripts/qa/e2e/runner.mjs higherlower agent`
  (accepts a mode key, a dash-stripped key, or a route basename — e.g.
  `whoareya` selects the `who-are-ya` mode). Passing any subset skips the hub
  checks unless you also pass `hub`.

Each mode runs in a **fresh, isolated browser context** so once-per-day
completion locks written to `localStorage` never cross-contaminate between
modes. Runtime is ~3–4 minutes for the full suite (headless Chromium, 430×932).

Failure screenshots land in `scripts/qa/e2e/artifacts/` (gitignored) as
`FAIL-<mode>.png`.

## What it asserts

### Shared game-over contract (every mode)

Applied after each mode is driven to its end state:

- Reaches a real game-over (next-puzzle countdown or an explicit end marker —
  **not** just a rank label, since some modes show the RankBadge live).
- Shows a **RankBadge** rank label — one of `KICKOFF`, `SQUAD ROTATION`,
  `FIRST TEAM`, `CAPTAIN`, `WORLD CLASS`, `BALLON D'OR`.
- Shows a **share/copy** row.
- Shows the **next-puzzle countdown**.
- Shows a **Next-up** card *or* the **all-done** note.
- **No raw `NaN` / `undefined` / `Infinity`** text.
- The last game-over element is **not hidden behind the tab bar** (hit-tested:
  it must paint on top, or the page must scroll it into view).
- **Zero console errors** and **zero page errors** during the whole session.

### Mode-specific invariants

| Mode | Invariant |
|------|-----------|
| missing11 | autocomplete is a **global** search — surfaces players not in the lineup |
| guessmatch | a wrong pick **does not disable** the option (re-tappable); 3 wrongs = loss |
| connections | one-away banner shown on a 3/4 near-miss (asserted only if triggered) |
| higherlower | streak **increments** on correct answers; losing reveal shows **both values + a gap %** |
| blindranking | reveal marks each pick **exact / adjacent** (partial scoring) |
| agent | game-over reveals the **actual transfer on each miss**; Show-Transfer hint reveals club → club |
| careertimeline | Give Up produces a graceful **career reveal** (club names) |
| toplists / grid / careerpath / whoareya | reach game-over via wrong-guess / guess exhaustion |

### Hub + navigation

- 3 tabs (Today / Stats / More) and a daily progress meter (`N/total`, total derived from the mode registry).
- Plays a mode **in the hub's own context**, then verifies the meter advances
  and the completed card moves into the **Done today** section.
- Stats tab shows streak/played content and no `NaN`; More tab shows
  settings/archive; the Archive link navigates.

## Adding a mode

1. Create `modes/<key>.mjs` exporting:
   - `meta = { key, title, route }`
   - `async function play(page, t)` — drive the game to its end state using the
     primitives in `helpers.mjs`, and record any mode-specific invariants with
     `t.check(name, cond, detail)` (truthy `cond` = pass) or `t.note(...)` for
     conditional observations.
2. Import it in `runner.mjs` and add it to the `MODES` array (registry order).
3. The runner applies the shared game-over contract automatically after `play`
   returns — you only write the interaction + the mode-specific invariants.

## How it stays robust

- **Text-based selectors** (visible strings, not CSS classes) survive restyles.
- **Raw mouse events** at element centres for RN-web Pressables; a labelled tap
  walks up to the nearest ≥40px tappable ancestor.
- **Deterministic play** where possible: Higher/Lower and Blind Ranking align to
  a re-implementation of the daily generators (`scripts/qa/playtest/sim.mjs`)
  across a ±3-day window (timezone-safe); other modes reach game-over by
  guess/heart/life exhaustion.
- **Bounded waits** everywhere; the autocomplete/tap helpers return booleans so a
  missed interaction fails a check rather than hanging.

## Files

- `runner.mjs` — orchestrator, summary table, exit code.
- `helpers.mjs` — interaction primitives, player DB, sim date window, game-over
  scraping, hit-tested occlusion check.
- `assertions.mjs` — the per-mode collector + shared game-over checklist.
- `modes/*.mjs` — one module per mode (+ `hub.mjs` for navigation checks).

# Player-data consumers & the `status` field

How the app reads `current_team`, `league`, `market_value`, and the new
`status` / `retired_year` fields, so a later agent can wire up anything the ETL
patches don't cover. Written for the patch pipeline in `scripts/etl/`.

Reference date for the refresh: **2026-07-12**. The daily-puzzle pool is
`fame_score >= 55` (see `lib/dailyPuzzle.ts`). fame_scores joins to players_db
**by normalized name** (accent-folded lowercase), NOT by id — `fame_scores.global_id`
is its own numbering system unrelated to `players_db.id`.

## What the patch pipeline writes

`scripts/etl/apply_player_patches.py` sets on each matched `players_db_v1.json` row:

| field | type | notes |
|---|---|---|
| `current_team` | string | resolved from the researcher's common name to the EXACT existing club string the Grid indexes on; unresolvable → left unchanged + logged to `research_patches/unresolved_clubs.json` |
| `league` | string | only overwritten with a league string **already present** in players_db; never `"Retired"` or a new value. Retired players keep their last league |
| `market_value` | number (EUR) | `0` for retired players |
| `status` | `"active"` \| `"retired"` | **NEW** |
| `retired_year` | number \| null | **NEW**, set only when retired |

`types/player.ts` already declares `status?` and `retired_year?`, so no type
change is needed. `status`/`market_value`/`retired_year` always apply on a
core-valid record; `current_team`/`league` apply only when they resolve/validate
(otherwise the row's existing value is kept), so a bad club name never blanks a
player.

## Field readers

### `current_team`
- `lib/comparePlayers.ts:37` — Guess the Player: exact string match of guess vs
  target team. A stale team makes the clue wrong.
- `lib/gridGenerator.ts` / `lib/playerData.ts` (`getPlayersByField`) — Immaculate
  Grid team axis. Uses **official long names** (e.g. `"FC Bayern München"`), with
  `TEAM_SHORT_NAMES` mapping long→short for labels.
- `lib/connectionsGenerator.ts:103` — groups players by team for Connections.
- `components/games/{StatCard,ChallengerCard,RankSlot}.tsx`, `PlayerSearch.tsx`,
  `PlayerSearchAutocomplete.tsx` — display the team string and pass it to
  `TeamCrest`.

### `league`
- `lib/comparePlayers.ts:38` — exact-match clue in Guess the Player.
- `lib/connectionsGenerator.ts:109`, `lib/gridGenerator.ts` league axis.
- Legal values today: `Premier League`, `La Liga`, `Serie A`, `Bundesliga`,
  `Ligue 1` (plus a handful of stray minor-league strings). The apply script
  overwrites league **only** with a value already present in players_db — never
  `"Retired"` or a new string, because Grid/Guess compare on it. A retired
  player therefore keeps their last league; `status`/`retired_year` carry the
  retirement fact instead.

### `market_value`
- `lib/higherLowerGenerator.ts` — Higher/Lower compares market values; filters to
  `market_value >= 1_000_000`.
- `lib/blindRankingGenerator.ts` — sorts/ranks by market value; filters
  `>= 5_000_000`.
- `app/(tabs)/higherlower.tsx` — the value shown and compared, via
  `formatMarketValue`.
- The `1_000_000` sentinel is the "unknown" default; ~25 gameplay-relevant
  players still carry it (Buffon, Beckham, Pirlo, Chiellini…). Setting a real
  value or `0`+`retired` removes them from the active pools.

### `status` / `retired_year` (already partly wired)
The seeding agents have **already** added `p.status !== 'retired'` filters, so
these generators exclude retired players the moment the patches land:
- `lib/higherLowerGenerator.ts:74`
- `lib/blindRankingGenerator.ts:147`
- `lib/connectionsGenerator.ts:144`

### `last_season`
- Used as a secondary activity filter in higherLower / blindRanking /
  connections (`last_season >= currentYear-1` or `>= 2024`). It is **absent for
  most rows**, so those filters only exclude, they don't require it. Once
  `status` is populated it is the more reliable signal; `last_season` can stay
  as-is.

## Still TODO app-side (NOT done by this pipeline — for a later agent)

1. **`comparePlayers.ts` retired display.** A retired player keeps their last
   club and last league (league is never `"Retired"`); the signal is the new
   `status`/`retired_year` fields. The clue cells still show the last club/league
   as normal strings. Consider surfacing a small `Retired (<year>)` badge from
   `status`/`retired_year` so it's obvious the club is historical rather than
   current, but no compare logic needs to change.
2. **Higher/Lower with retired players.** They're now filtered OUT of the active
   queue (`status !== 'retired'`). If a "legends" mode is wanted, it would need a
   separate peak-value metric — retired `market_value` is `0`.
3. **Team badges (`data/teamColors.ts`).** `TeamCrest` → `getTeamColors` falls
   back to a gray crest for unknown teams. ~475 gameplay-relevant players sit at
   teams with no badge — genuine gaps (Leeds, Burnley, Rennes, Bologna,
   Sunderland, Girona, Torino, Sassuolo…). Note the apply step resolves each
   patched club to the **majority (Grid-canonical) db string** — usually the
   official long form (e.g. `Real Madrid Club de Fútbol`), which also
   consolidates some of the ~91 clubs currently stored under two strings. So the
   badge follow-up should add missing clubs to `teamColors.ts` keyed to resolve
   from those canonical strings (via `getTeamColors`' existing short-name
   entries). This pipeline does not touch `teamColors.ts`.
4. **Legends not in players_db.** 82 fame>=70 entries (Zidane, Pelé, Maradona,
   Ronaldinho, Henry, Xavi…) have no players_db row — see
   `data/research_batches/unmatched_high_fame.json`. They can't be id-patched;
   they surface only via `career_paths.json` today. Wiring them into the guess
   pool would need new players_db rows, out of scope for this pipeline.

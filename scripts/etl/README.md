# Data Field Mapping Matrix - Football Trivia App

Generated: 2026-02-15

## 1. Field-to-Mode Mapping Table

| Data Field | Who Are Ya | Immaculate Grid | Career Path | Missing XI | Connections | Badge Quiz | Higher/Lower | Transfer Agent |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| name | X | X | X | | X | | X | X |
| nationality | X | X | X | | X | | | |
| current_team | X | X | | | X | | X | |
| league | X | X | | | X | | | |
| position | X | X | X | | X | | | |
| market_value | X | | | | | | X | |
| image_url | X | | X | | | | X | |
| career_history | | | X | | | | | |
| difficulty_tier | | | X | | | | | |
| transfer_history | | | | | | | | X |
| transfer_fees | | | | | | | | X |
| match_metadata | | | | X | | | | |
| match_lineups | | | | X | | | | |
| badge_colors | | | | | | X | | |

Modes not requiring player data: Stats/Profile (client state), Modes Hub (navigation), Pro/Support (UI only).

## 2. Gap Analysis with Priorities

### HIGH Priority Gaps

| Gap | Current | Target | Deficit | Affected Mode |
|---|---|---|---|---|
| Career history data | 120 players | 500 players | 380 | Career Path |
| Transfer history data | 106 players | 500 players | 394 | Transfer Agent |
| Match lineup data | 50 matches | 200 matches | 150 | Missing XI |

### MEDIUM Priority Gaps

| Gap | Current | Target | Deficit | Affected Mode |
|---|---|---|---|---|
| Badge color/pattern data | 73 teams | 176 teams | 103 | Badge Quiz |

### LOW Priority Gaps

| Gap | Current | Target | Deficit | Affected Mode |
|---|---|---|---|---|
| Market value (zero values) | 11,383 players | 12,173 players | 790 | Higher/Lower |
| Previous teams (enhancement) | 0 players | 12,173 players | 12,173 | Immaculate Grid, Connections |

### Detailed Gap Notes

**Career Path (120/500):** Tier distribution is uneven. Current breakdown:
- legendary: 18, world_class: 22, professional: 34, semi_pro: 17, amateur: 20, beginner: 9
- Beginner tier is critically underpopulated (9 vs ~83 target per tier for balanced distribution)
- Each entry requires: club name, start year, end year, plus editorial tier assignment

**Missing XI (50/200):** Competition coverage is heavily skewed:
- UCL Finals: 20, UCL Semi-Finals: 10, World Cup matches: 20
- Missing entirely: domestic league derbies, Euro Championship, Copa America, League Cup finals
- Need broader decade coverage (currently concentrated in 2000s-2020s)

**Transfer Agent (106/500):** 98 of 106 players have at least one paid transfer fee. 8 players have only free/null transfers. Need players with interesting multi-club histories and notable fees.

**Badge Quiz (73/176):** teamColors.ts has some alias duplicates (e.g., "Brighton" and "Brighton & Hove Albion"). After deduplication, effective unique coverage is ~60-65 teams. Needs cleanup and expansion.

## 3. Recommended Data Enrichment Strategy

### Phase 1: Career Paths (highest gameplay impact)
- **Source:** Wikipedia player pages (infobox career section), Transfermarkt career tables
- **Approach:** Scrape career tables for players already in players_db_v1.json, starting with well-known players from top 5 leagues
- **Tier assignment:** Use market_value as initial heuristic, then manual review
  - legendary: >50M value or historically iconic
  - world_class: 20-50M or established international players
  - professional: 5-20M
  - semi_pro: 1-5M
  - amateur: 100K-1M
  - beginner: <100K or lesser-known players

### Phase 2: Transfer Records (parallel with Phase 1)
- **Source:** Transfermarkt transfer history pages
- **Approach:** Prioritize players with 3+ club moves and at least one fee >5M for interesting gameplay
- **Fields needed:** club_name, club_id, date_joined, date_left, fee (parsed to numeric)

### Phase 3: Match Lineups (independent track)
- **Source:** Wikipedia match articles, Transfermarkt match pages
- **Approach:** Expand competition variety first, then backfill earlier decades
- **Priority competitions to add:** Premier League classics, El Clasicos, Euro finals, Copa America, FA Cup finals, domestic derbies

### Phase 4: Badge Colors + Market Values (polish)
- **Badge colors:** Add entries for remaining 103 teams from official club branding guides
- **Market values:** Refresh zero-value players from Transfermarkt current valuations

## 4. Estimated Effort per Gap

| Gap | Records Needed | Data Source Complexity | Curation Required | Estimated Effort |
|---|---|---|---|---|
| Career paths | 380 players | Medium (structured Wikipedia tables) | High (tier assignment) | Medium-High |
| Transfer records | 394 players | Medium (Transfermarkt structured data) | Low (mostly automated) | Medium |
| Match lineups | 150 matches | High (lineup data varies by source) | Medium (ID matching to players_db) | High |
| Badge colors | 103 teams | Low (hex codes from official sources) | Low (pattern assignment) | Low |
| Market values | 790 players | Low (single field update) | None | Low |
| Previous teams | 12,173 players | High (full career scan) | None | Deferred - derives from career_paths expansion |

## Current Data Inventory Summary

| File | Records | Key Fields | Status |
|---|---|---|---|
| players_db_v1.json | 12,173 | id, name, nationality, team, league, position, value, image | Complete |
| career_paths.json | 120 | id, name, nationality, career[], tier | Needs 4x expansion |
| transfers.json | 106 | player_id, player_name, transfers[] | Needs 5x expansion |
| matches_db.json | 50 | match_id, date, competition, lineups | Needs 4x expansion |
| teamColors.ts | 73 unique | primary, secondary, pattern | Needs 2.5x expansion |

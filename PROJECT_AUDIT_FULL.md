# Football Quiz App - Full Project Audit

> **Audit Date:** March 29, 2026
> **Last Active Development:** ~February 15, 2026 (~6 weeks ago)
> **Audited By:** 3-agent team (Code Auditor, Docs & Config Reviewer, Feature Mapper)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Game Modes — Feature Inventory](#4-game-modes--feature-inventory)
5. [Screen-by-Screen Breakdown](#5-screen-by-screen-breakdown)
6. [Core Systems Status](#6-core-systems-status)
7. [Infrastructure & Backend](#7-infrastructure--backend)
8. [Data Pipeline & Content](#8-data-pipeline--content)
9. [Known Bugs & Broken Functionality](#9-known-bugs--broken-functionality)
10. [Documentation vs. Reality](#10-documentation-vs-reality)
11. [Dependencies Audit](#11-dependencies-audit)
12. [Recommended Next Steps](#12-recommended-next-steps)

---

## 1. Executive Summary

The Football Quiz app is a React Native (Expo SDK 54) daily trivia game with **10 game modes**, all of which are **built and playable end-to-end**. The core gameplay loop works. However, several cross-cutting systems are incomplete:

- **4 of 9 daily modes are not deterministically seeded** (users get different puzzles)
- **Monetization is entirely mocked** (no real ad or IAP SDKs installed)
- **Cloud sync is stubbed** (all data is local-only via AsyncStorage)
- **Streak/stats tracking only covers Who Are Ya**, not all 9 modes
- **Deep linking is scaffolded but non-functional**

The app is in a **"playable prototype"** state — feature-complete for gameplay, but not production-ready for store launch.

---

## 2. Tech Stack & Dependencies

### Runtime
| Package | Version | Status |
|---------|---------|--------|
| React | 19.1.0 | Installed |
| React Native | 0.81.5 | Installed |
| Expo SDK | 54 | Installed |
| TypeScript | 5.9.2 | Installed |

### Core Libraries
| Library | Purpose | Status |
|---------|---------|--------|
| Zustand 5.0.11 | State management | Installed, working |
| NativeWind 4.0 / Tailwind 3.4.19 | Styling | Installed but **not used** — all components use `StyleSheet.create()` |
| React Native Reanimated 4.1.1 | Animations | Installed, used in Higher/Lower and others |
| @shopify/flash-list 2.0.2 | Performant lists | Installed but **not used** — FlatList used instead |
| Fuse.js 7.1.0 | Fuzzy search | Installed, working |
| expo-av | Audio | Installed, working (4 sound effects) |
| expo-haptics | Haptics | Installed, working |
| expo-blur | Glassmorphism cards | Installed, working |
| react-native-view-shot | Share screenshots | Installed, working |
| expo-sharing | Native share sheet | Installed, working |
| expo-notifications | Local push | Installed, working |
| expo-tracking-transparency | ATT prompt | Installed, integrated |

### NOT Installed (but documented in plans)
| Library | Planned Purpose | Doc Reference |
|---------|----------------|---------------|
| react-native-google-mobile-ads | Banner + rewarded ads | docs/09 |
| RevenueCat SDK | In-app purchases | docs/09 |
| Any analytics SDK | User tracking | docs/10 |
| AWS SDK | DynamoDB sync | docs/03 |

### Dev Tooling
| Tool | Status |
|------|--------|
| Jest 30 + ts-jest | Configured, 2 test files (grid generator/validator) |
| ESLint 8 + Prettier | Configured, running in CI |
| EAS CLI | Configured with placeholder Apple/Google values |
| GitHub Actions CI | TypeScript check + ESLint + web build (no tests, no mobile builds) |

---

## 3. Project Structure

```
football/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab-based navigation (14 screens)
│   │   ├── _layout.tsx           # 4 visible tabs: Home, Stats, Pro, Modes
│   │   ├── index.tsx             # Career Path game (NOT a dashboard)
│   │   ├── career.tsx            # Who Are Ya game (filename is misleading)
│   │   ├── explore.tsx           # Grid game
│   │   ├── modes.tsx             # Game mode selector
│   │   ├── profile.tsx           # Stats / settings
│   │   ├── support.tsx           # Pro upgrade page
│   │   └── [7 more game screens]
│   ├── games/                    # Stack navigator re-exports
│   │   ├── _layout.tsx
│   │   └── [10 game re-export files]
│   ├── share/[puzzleId].tsx      # Deep link handler
│   ├── _layout.tsx               # Root layout (fonts, splash, init)
│   └── modal.tsx, +html.tsx, +not-found.tsx
├── components/                   # UI components (~40 files)
│   ├── career/                   # Career Path components (8)
│   ├── games/                    # Game-specific components (12)
│   ├── ui/                       # Shared UI components (16)
│   ├── Shareable*.tsx            # Share card renderers (9)
│   └── PlayerSearch.tsx, Themed.tsx, etc.
├── hooks/                        # Zustand stores + custom hooks (8)
├── lib/                          # Business logic, generators, utils (30+)
├── types/                        # TypeScript types (7 files)
├── data/                         # Static JSON databases + team colors
├── constants/                    # Colors.ts, theme.ts
├── assets/                       # Fonts (4), images (4), sounds (4)
├── infrastructure/               # Terraform AWS configs + landing page
├── scripts/                      # ETL pipeline, deploy scripts, QA
├── docs/                         # 11 design documents
└── [config files]                # package.json, tsconfig, etc.
```

**Total source files:** ~180+ (excluding node_modules, .git)

---

## 4. Game Modes — Feature Inventory

| # | Game Mode | Planned | Built | Playable | Daily Seeded | Sharing | Hint System | XP Awards |
|---|-----------|---------|-------|----------|-------------|---------|-------------|-----------|
| 1 | Who Are Ya | Yes | Yes | Yes | Yes | Yes | 1 hint (nationality, ad-gated) | Yes |
| 2 | Grid | Yes | Yes | Yes | Yes | Yes | 3 free hints (suggest player) | Yes |
| 3 | Career Path | Partial | Yes | Yes | N/A (own streak) | **No** | 4 types (2 free, rest ad-gated) | **No** |
| 4 | Career Timeline | Yes | Yes | Yes | Yes | Yes | Per-node hint (XP cost) | Yes |
| 5 | Connections | Yes | Yes | Yes | **No** (`Date.now()`) | Yes | None | Yes |
| 6 | Higher/Lower | Yes | Yes | Yes | N/A (endless) | Yes | None | Yes |
| 7 | Blind Ranking | Yes | Yes | Yes | Yes | Yes | None | Yes |
| 8 | Missing XI | Yes | Yes | Yes | **No** (`Math.random()`) | Yes | 1 hint (first letter, ad-gated) | Yes |
| 9 | Badge Quiz | Yes | Yes | Yes | **No** (`Date.now()`) | Yes | Implicit (de-pixelation) | Yes |
| 10 | Transfer Agent | Yes | Yes | Yes | **No** (`Date.now()`) | Yes | 3 free hints (transfer direction) | Yes |

**Key Finding:** All 10 game modes are built and playable. However, 4 of the 9 "daily" modes (Connections, Missing XI, Badge, Transfer Agent) generate random puzzles each session instead of deterministic daily puzzles.

---

## 5. Screen-by-Screen Breakdown

### `app/(tabs)/index.tsx` — Career Path (Home Tab)
- **Contains:** Full Career Path game (NOT Who Are Ya, despite being the index)
- **Issues:**
  - Does not call `useDailyProgressStore.markCompleted()` — disconnected from daily system
  - Does not call `useManagerStore.addXp()` — no XP awarded
  - Uses `modeKey="who-are-ya"` for TutorialOverlay — shows wrong tutorial text
  - No share functionality

### `app/(tabs)/career.tsx` — Who Are Ya
- **Contains:** Full "Who Are Ya" game (filename misleading — should be `who-are-ya.tsx`)
- **Status:** Fully functional. 8 guesses, attribute comparison, daily seeded, sharing works
- **Issues:** Filename swap with `index.tsx` is a major maintenance hazard

### `app/(tabs)/explore.tsx` — Grid
- **Status:** Fully functional. 3x3 criteria grid, 9 guesses, hints, sharing
- **Issues:** No rarity scoring (planned in docs/05 but not implemented)

### `app/(tabs)/careertimeline.tsx` — Career Timeline
- **Status:** Fully functional. No significant issues. Feature-complete.

### `app/(tabs)/connections.tsx` — Connections
- **Status:** Playable but uses `Date.now()` seed — not daily-deterministic
- **Issues:** Different puzzle each session (breaks "same puzzle for everyone" concept)

### `app/(tabs)/higherlower.tsx` — Higher or Lower
- **Status:** Fully functional. Endless streak mode with animated transitions.
- **Issues:** None. Intentionally not daily-seeded (endless mode).

### `app/(tabs)/blindranking.tsx` — Blind Ranking
- **Status:** Fully functional. Daily seeded for first play, random for replays. Feature-complete.

### `app/(tabs)/missing11.tsx` — Missing XI
- **Status:** Playable but uses `Math.random()` — not daily-seeded
- **Issues:** Random match selection each session

### `app/(tabs)/badge.tsx` — Badge Quiz
- **Status:** Playable but uses `Date.now()` seed — not daily-deterministic

### `app/(tabs)/agent.tsx` — Transfer Agent
- **Status:** Playable but uses `Date.now()` seed — not daily-deterministic
- **Issues:** Game mechanic differs from spec (spec: "guess the fee"; impl: "match fee to player")

### `app/(tabs)/modes.tsx` — Game Mode Selector
- **Status:** Fully functional. Grid layout of all 9 daily modes with completion badges.

### `app/(tabs)/profile.tsx` — Stats / Settings
- **Status:** Fully functional UI
- **Issues:** Stats (streak, win%, games played) only reflect Who Are Ya games

### `app/(tabs)/support.tsx` — Pro Upgrade
- **Status:** UI complete. Lists Pro features (detailed stats, exclusive modes, custom themes, leaderboard)
- **Issues:** Listed Pro features are **marketing text only** — none are actually implemented. Pro just hides (already disabled) banner ads and grants free hints.

### `app/(tabs)/_layout.tsx` — Tab Navigation
- **Status:** 4 visible tabs (Home, Stats, Pro, Modes). 9 game screens hidden from tab bar but accessible via `router.push()`. Working correctly.

### `app/games/_layout.tsx` — Stack Navigator
- **Status:** All 10 games registered as stack screens with custom headers. Working.

### `app/_layout.tsx` — Root Layout
- **Status:** Loads fonts, manages splash screen, initializes remote config, checks streak freeze, requests ATT, initializes purchases, sets up notifications. Working.

### `app/share/[puzzleId].tsx` — Deep Link Handler
- **Status:** Renders but deep links not functional (URLs never generated in share flow)

---

## 6. Core Systems Status

### Daily Puzzle System
| Component | Status | Details |
|-----------|--------|---------|
| Seed generation (`dailySeed.ts`) | Working | Deterministic hash from date + mode offset |
| Target selection (`dailyPuzzle.ts`) | Working | Filters players by fame_score >= 55 |
| Daily progress tracking | Partial | 9-mode tracker works, but Career Path doesn't call it |
| Daily reset | Working | Resets at midnight local time |
| Pre-generated puzzles | **Not implemented** | Docs specify 365 pre-calculated seeds; actual uses runtime computation |

### Streak & Progress Tracking
| Component | Status | Details |
|-----------|--------|---------|
| `useDailyProgressStore` | Working | Tracks completion per mode per day |
| `useDailyStateStore` | **Partial** | Only receives data from Who Are Ya (other modes don't call `recordCompletion`) |
| `useManagerStore` (XP/levels) | Working | 11 manager titles, XP from all modes except Career Path |
| Manager levels (`managerLevels.ts`) | Working | "Intern" through "The Special One" |
| Streak freeze modal | Working | Offers streak repair (mock ad countdown) |
| Cloud sync | **Stub** | `dynamoSync.ts` logs to console only |

### Sharing System
| Component | Status | Details |
|-----------|--------|---------|
| Screenshot capture | Working | `react-native-view-shot` + `expo-sharing` |
| Shareable result cards | Working | 9 custom cards for 9 modes |
| Deep link URL generation | **Broken** | `generateShareUrl()` defined but never called |
| Share text/caption | Missing | Shares image only, no hashtags/text as docs specify |

### Sound & Haptics
| Component | Status | Details |
|-----------|--------|---------|
| 4 sound effects | Working | click, whistle, cheer, crossbar |
| 3 haptic types | Working | Impact Light/Medium, Notification Success/Error |
| User toggles | Working | Sound ON/OFF and Haptics ON/OFF in profile |

### Notifications
| Component | Status | Details |
|-----------|--------|---------|
| Permission request | Working | Requests on app mount |
| Daily reminder | Working | 10:00 AM daily, streak-aware messages |
| User toggle | Working | Notifications ON/OFF in profile |
| Tap action | **Incomplete** | Opens app to default screen, no deep routing |

### Tutorial System
| Component | Status | Details |
|-----------|--------|---------|
| TutorialOverlay component | Working | Full-screen overlay with icon, title, description |
| Per-mode tracking | Working | `useTutorialStore` tracks `seenTutorials` per mode |
| Bug | **Career Path shows Who Are Ya tutorial** | Uses `modeKey="who-are-ya"` instead of career-specific key |
| Re-viewable | **No** | One-shot only, no way to see tutorial again |

### Monetization
| Component | Status | Details |
|-----------|--------|---------|
| Banner ads (`BannerAd.tsx`) | **Disabled** | `ADS_ENABLED = false`, shows placeholder when enabled |
| Rewarded ads (`ads.ts`) | **Mocked** | Always succeeds after 500ms delay, no real SDK |
| IAP/Pro (`purchases.ts`) | **Mocked** | Always succeeds after 1s delay, no RevenueCat |
| Pro store (`useProStore`) | Working | Simple `isPro` boolean in AsyncStorage |
| Pro upgrade page | Working | UI complete, but features listed are not implemented |
| ATT tracking prompt | Working | `expo-tracking-transparency` integrated |

### Remote Config / Kill Switch
| Component | Status | Details |
|-----------|--------|---------|
| Config fetch (`remoteConfig.ts`) | Working | Fetches from S3 URL with caching |
| Maintenance screen | Working | Displays when `maintenance_mode: true` |
| `disabled_modes` | **Not consumed** | Config field exists but no code checks it |

---

## 7. Infrastructure & Backend

### Terraform (AWS)
| Resource | Status | Issues |
|----------|--------|--------|
| S3 content bucket | Defined | Versioned, encrypted, OAC — looks correct |
| S3 config bucket | **Broken** | Exists but NOT added as CloudFront origin — inaccessible |
| CloudFront CDN | Defined | No custom domain, uses legacy `forwarded_values` |
| DynamoDB table | Defined | PAY_PER_REQUEST, `userId`/`sortKey` keys |
| Cognito Identity Pool | Defined | Guest (unauthenticated) access enabled |
| IAM policies | Defined | Row-level DynamoDB scoping |
| Custom domain (`footballquiz.app`) | **Not configured** | No ACM cert, no Route53, no alias |
| Terraform remote state | **Missing** | Local state only |
| Lambda functions | **Not created** | Docs reference Lambda but none exist |

**Note:** `.terraform/` directory exists with provider binary, but no `.tfstate` file is visible — infrastructure may never have been deployed.

### CI/CD (GitHub Actions)
| Job | Status |
|-----|--------|
| TypeScript check | Active |
| ESLint | Active |
| Web build validation | Active |
| Jest tests | **Missing** (configured but not in CI) |
| Mobile builds | **Missing** |
| Daily puzzle deployment | **Missing** (manual scripts exist) |
| Terraform plan/apply | **Missing** |
| Store submission | **Missing** (manual via npm scripts) |

### Deep Linking
| Platform | Status | Issues |
|----------|--------|--------|
| iOS Universal Links (AASA) | Scaffolded | `TEAM_ID` is placeholder |
| Android App Links | Scaffolded | SHA256 fingerprint is `TODO:ADD_YOUR_SHA256_FINGERPRINT` |
| URL scheme (`footballquiz://`) | **Not implemented** | Only web URL scheme exists |
| Share URL generation | **Dead code** | `generateShareUrl()` defined but never called |

---

## 8. Data Pipeline & Content

### Data Files
| File | Description | Status |
|------|-------------|--------|
| `players_db_v1.json` | Full player database | Present |
| `career_paths.json` | Player career histories | Present (120 of target 500 — 24%) |
| `fame_scores.json` | Difficulty tiers and metrics | Present |
| `matches_db.json` | Historic match lineups | Present (50 of target 200 — 25%) |
| `transfers.json` | Transfer records | Present (106 of target 500 — 21%) |
| `player_ages.json` | Player birth years | Present (new, untracked) |
| `master_db.json` | Merged master database | Present |
| `club_id_map.json` | Club name normalization | Present |
| `player_id_map.json` | Player ID mapping | Present |
| `popularity_metrics.json` | Player popularity scores | Present |
| `teamColors.ts` | Club primary/secondary colors | Present |
| `daily_puzzles/` | Pre-generated daily puzzles | 2 days only (Feb 16-17, 2026) |

### Data Gaps (from ETL README, Feb 15 2026)
| Dataset | Current | Target | Coverage |
|---------|---------|--------|----------|
| Career paths | 120 | 500 | 24% |
| Transfer records | 106 | 500 | 21% |
| Match lineups | 50 | 200 | 25% |
| Badge colors | 73 | 176 | 41% |
| Market values (zero-value) | 790 | 0 | Problem |

### ETL Pipeline
- **~20 Python/JS scripts** in `scripts/etl/` for data ingestion, transformation, validation
- **3 data sources**: Transfermarkt datasets, Salimt datasets, Football-Data API
- **Deploy scripts**: `generate_and_deploy.sh`, `upload_daily_puzzle.sh` — manual execution only
- **No automated scheduling** (no cron, no Lambda, no GitHub Actions job)

---

## 9. Known Bugs & Broken Functionality

### Critical Bugs
| # | Bug | Location | Impact |
|---|-----|----------|--------|
| 1 | **4 modes not daily-seeded** | connections.tsx, badge.tsx, agent.tsx, missing11.tsx | Users get different puzzles — breaks core "daily challenge" concept |
| 2 | **Streak stats only track Who Are Ya** | `useDailyStateStore` only called from `useGuessGameStore` | Profile shows misleading stats (all other modes ignored) |
| 3 | **Career Path wrong tutorial** | index.tsx uses `modeKey="who-are-ya"` | Shows Who Are Ya tutorial text on Career Path screen |
| 4 | **Config bucket inaccessible** | `config-s3.tf` — bucket not added as CloudFront origin | Remote config cannot be served through CDN |

### Functional Issues
| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 5 | Career Path not in daily system | `index.tsx` — no `markCompleted()` call | Daily progress tracker ignores Career Path |
| 6 | Career Path awards no XP | `index.tsx` — no `addXp()` call | Manager level doesn't reflect Career Path play |
| 7 | Career Path has no sharing | `index.tsx` — no ShareableResult | Only mode without share capability |
| 8 | `disabled_modes` not consumed | `remoteConfig.ts` / `_layout.tsx` | Can't remotely disable specific game modes |
| 9 | Deep link URLs never generated | `deepLinks.ts` — `generateShareUrl()` never called | Sharing only sends images, no clickable links |
| 10 | Notification tap does nothing | `useNotificationSetup.ts` | No deep routing to specific game mode |

### Code Quality Issues
| # | Issue | Location |
|---|-------|----------|
| 11 | **index.tsx / career.tsx filename swap** | `app/(tabs)/` — Career Path in index, Who Are Ya in career |
| 12 | NativeWind installed but unused | All components use `StyleSheet.create()` |
| 13 | FlashList installed but unused | All lists use `FlatList` |
| 14 | Pro features are marketing-only | support.tsx lists features that don't exist |
| 15 | `expo-env.d.ts` committed | File itself says it should be gitignored |

---

## 10. Documentation vs. Reality

### Doc Discrepancies
| Topic | Docs Say | Reality |
|-------|----------|---------|
| Expo SDK version | README: SDK 52 | package.json: SDK 54 |
| Max guesses (Who Are Ya) | Architecture doc: 6 | Code: 8 |
| Game mode count | Architecture doc: 7 | Actual: 10 |
| DynamoDB keys | Doc 03: `PK`/`SK` | Terraform: `userId`/`sortKey` |
| Sharing library | Doc 08: `react-native-share` | Actual: `expo-sharing` |
| ETL structure | Doc 02: single `etl_pipeline.py` | Actual: ~20 separate scripts |
| Output filename | Doc 02: `players_db_min.json` | Actual: `players_db_v1.json` |
| Folder structure | Doc 01: `/services` | Actual: `/lib` |
| Privacy policy | "No ad/tracking SDKs" | Doc 09 plans AdMob + ATT |
| Store metadata | 2 game modes, "leaderboard" | 10 modes, no leaderboard |

### Planned Features Not Implemented
| Feature | Referenced In | Status |
|---------|--------------|--------|
| Cloud sync (DynamoDB) | docs/03, docs/07 | Stubbed only |
| AdMob integration | docs/09 | SDK not installed |
| RevenueCat IAP | docs/09 | SDK not installed |
| Archive Mode | docs/09 | Not implemented |
| Leaderboard | store metadata | Not implemented |
| Confetti animation | docs/06 | Not implemented |
| Transfer Market Value currency | docs/07 | Not implemented |
| "Shirt number" comparison | docs/04 | Not implemented (uses age instead) |
| Yellow "close match" for teams | docs/04 | Not implemented |
| Lambda functions | docs/03 | Not created |
| Custom domain | docs/08, docs/03 | Not configured |

### Implemented but Not Documented
| Feature | Files |
|---------|-------|
| TutorialOverlay system | `TutorialOverlay.tsx`, `useTutorialStore.ts` |
| Notification setup hook | `useNotificationSetup.ts` |
| Football data mappers | `footballMappers.ts` |
| Haptics system | `haptics.ts` |
| Player ages data | `player_ages.json`, `fetch_player_ages.py` |
| Blind Ranking mode | Not in architecture doc |
| Career Timeline mode | Not in architecture doc |
| Badge Quiz mode | Not in architecture doc |

---

## 11. Dependencies Audit

### package.json Analysis
- **Total dependencies:** ~30 runtime + ~15 dev
- **All installed dependencies are used** (except NativeWind and FlashList which are installed but not actively used in components)
- **No known security vulnerabilities flagged** (would need `npm audit` to verify)
- **No lock file issues visible**

### Missing Dependencies for Planned Features
| Feature | Required Package | Status |
|---------|-----------------|--------|
| Real ads | `react-native-google-mobile-ads` | Not installed |
| Real IAP | `react-native-purchases` (RevenueCat) | Not installed |
| Cloud sync | `@aws-sdk/client-dynamodb` | Not installed |
| Analytics | Any analytics SDK | Not installed |

### EAS Build Readiness
| Requirement | Status |
|-------------|--------|
| Apple ID | Placeholder (`APPLE_ID_PLACEHOLDER`) |
| ASC App ID | Placeholder (`ASC_APP_ID_PLACEHOLDER`) |
| Team ID | Placeholder (`TEAM_ID_PLACEHOLDER`) |
| Google Services Key | Referenced but likely not committed |
| Bundle Identifier | **Missing** from app.json |
| Android Package | **Missing** from app.json |

---

## 12. Recommended Next Steps

### Priority 1: Fix Critical Bugs (1-2 days)
1. **Fix daily seeding for 4 modes** — Replace `Date.now()` / `Math.random()` with `getModeSeed()` in Connections, Badge, Transfer Agent, and Missing XI
2. **Fix streak tracking** — Call `useDailyStateStore.recordCompletion()` from all game modes, not just Who Are Ya
3. **Fix Career Path integration** — Add `markCompleted()`, `addXp()`, correct tutorial `modeKey`, and sharing
4. **Fix filename swap** — Rename `index.tsx` / `career.tsx` to match their actual content, update all re-exports

### Priority 2: Complete Core Systems (3-5 days)
5. **Implement `disabled_modes` consumption** — Actually check remote config and hide/disable modes
6. **Fix config S3 bucket** — Add as second CloudFront origin so remote config is servable
7. **Add deep link URLs to shares** — Call `generateShareUrl()` in the sharing flow
8. **Add notification deep routing** — Route notification taps to the relevant game mode
9. **Update store metadata** — Reflect all 10 game modes, remove false "leaderboard" claim
10. **Update privacy policy** — Decide on monetization strategy and align policy

### Priority 3: Production Readiness (1-2 weeks)
11. **Set up EAS with real credentials** — Bundle identifiers, Apple/Google accounts
12. **Enrich data** — Career paths (24%), transfers (21%), matches (25%) need significant expansion
13. **Add Jest tests to CI** — Tests exist but aren't run in CI pipeline
14. **Deploy infrastructure** — Run `terraform apply`, verify all resources created
15. **Automate daily puzzle generation** — Set up cron/Lambda/GitHub Actions for daily deploy

### Priority 4: Monetization & Growth (2-4 weeks)
16. **Integrate real ad SDK** — Install `react-native-google-mobile-ads`, replace mocks
17. **Integrate RevenueCat** — Install SDK, replace mock purchase flow
18. **Implement cloud sync** — Complete `dynamoSync.ts` with real AWS SDK calls
19. **Set up custom domain** — ACM cert, Route53, CloudFront alias for `footballquiz.app`
20. **Complete deep linking** — Real AASA team ID, Android fingerprint, test end-to-end

### Priority 5: Polish & Launch
21. **Remove unused libraries** — Either use NativeWind/FlashList or remove them
22. **Implement Pro features** — Or remove false claims from support page
23. **Update all docs** — Align documentation with actual implementation
24. **Performance optimization** — FlashList adoption, bundle size analysis
25. **Store submission** — Screenshots, descriptions, app review preparation

---

*Generated by automated 3-agent audit system. Last verified: March 29, 2026.*

# Architecture Overview

Comprehensive architecture document for the Football Trivia App.

## Project Structure

```
football/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout with font loading, splash screen
│   ├── (tabs)/             # Tab-based navigation
│   │   ├── index.tsx       # Who Are Ya? (daily player guessing)
│   │   ├── explore.tsx     # Grid (3x3 criteria grid)
│   │   ├── missing11.tsx   # Missing 11 (guess the starting XI)
│   │   ├── connections.tsx # Connections (group 16 players into 4 categories)
│   │   ├── badge.tsx       # Badge (pixelated badge identification)
│   │   ├── higherlower.tsx # Higher/Lower (market value comparison)
│   │   ├── agent.tsx       # Agent (transfer fee guessing)
│   │   └── profile.tsx     # Stats, settings, IAP, sound toggle
│   ├── share/              # Deep link share routes
│   ├── modal.tsx           # Modal screens
│   └── +not-found.tsx      # 404 fallback
├── components/
│   ├── ui/                 # Reusable UI primitives
│   │   ├── RetroButton.tsx # Primary button with haptic + click sound
│   │   ├── GlassCard.tsx   # Frosted glass card container
│   │   ├── PopInView.tsx   # Scale-in entrance animation (Reanimated)
│   │   ├── ShakeView.tsx   # Horizontal shake animation (Reanimated)
│   │   ├── GridCell.tsx    # Grid game cell
│   │   ├── PlayerCard.tsx  # Who Are Ya attribute comparison card
│   │   ├── SearchInput.tsx # Styled text input
│   │   ├── TeamCrest.tsx   # Team badge renderer
│   │   ├── BannerAd.tsx    # AdMob banner wrapper
│   │   ├── ResultModal.tsx # Win/loss result modal
│   │   └── ...
│   ├── games/              # Game-specific components
│   │   ├── SoccerPitch.tsx # Missing 11 pitch layout
│   │   ├── JerseySlot.tsx  # Jersey position slot
│   │   ├── ConnectionsBoard.tsx # Connections tile grid
│   │   ├── ConnectionsTile.tsx  # Individual tile
│   │   ├── PixelatedBadge.tsx   # Progressively de-pixelating badge
│   │   ├── StatCard.tsx    # Higher/Lower stat display
│   │   ├── TransferCard.tsx # Agent option card
│   │   ├── ManagerCard.tsx # Manager XP/level display
│   │   └── DailyMenu.tsx   # Daily progress overview
│   └── Shareable*.tsx      # View-shot share card components
├── hooks/                  # Zustand stores
│   ├── useGuessGameStore.ts
│   ├── useDailyStateStore.ts
│   ├── useDailyProgressStore.ts
│   ├── useManagerStore.ts
│   └── useProStore.ts
├── lib/                    # Business logic & utilities
│   ├── playerData.ts       # Player search & lookup
│   ├── matchData.ts        # Match data loader
│   ├── transferData.ts     # Transfer data loader
│   ├── gridGenerator.ts    # Grid puzzle generator
│   ├── connectionsGenerator.ts # Connections puzzle generator
│   ├── badgeGameGenerator.ts   # Badge game generator
│   ├── higherLowerGenerator.ts # Higher/Lower queue generator
│   ├── agentGameGenerator.ts   # Agent game generator
│   ├── dailySeed.ts        # Deterministic daily seed
│   ├── dailyPuzzle.ts      # Daily puzzle resolution
│   ├── comparePlayers.ts   # Player attribute comparison
│   ├── sounds.ts           # Sound effects (expo-av)
│   ├── sharing.ts          # View-shot capture & share
│   ├── ads.ts              # AdMob banner & rewarded ads
│   ├── purchases.ts        # IAP Pro license
│   ├── tracking.ts         # ATT & analytics
│   ├── notifications.ts    # Push notification scheduling
│   ├── managerLevels.ts    # XP thresholds & level titles
│   ├── deepLinks.ts        # Universal link handling
│   ├── dynamoSync.ts       # DynamoDB cloud sync
│   └── remoteConfig.ts     # Remote feature flags
├── constants/
│   └── theme.ts            # Design tokens (colors, spacing, fonts)
├── data/                   # Static JSON datasets
│   ├── players_db_v1.json  # Player database
│   ├── matches_db.json     # Historic match lineups
│   ├── transfers.json      # Transfer fee records
│   └── teamColors.ts       # Team color mappings
├── types/                  # TypeScript type definitions
├── assets/
│   ├── fonts/              # BarlowCondensed font files
│   ├── images/             # App icons, splash, badges
│   └── sounds/             # Sound effect files (mp3)
├── infrastructure/         # AWS CDK / backend
├── scripts/                # QA & build scripts
└── docs/                   # Documentation
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo SDK | 54 |
| Runtime | React Native | 0.81 |
| Navigation | expo-router | 6 |
| State Management | Zustand | 5 |
| Animations | react-native-reanimated | 4.1 |
| Styling | NativeWind (Tailwind CSS) | 4 |
| Lists | @shopify/flash-list | 2 |
| Haptics | expo-haptics | 15 |
| Audio | expo-av | Lazy-loaded |
| Sharing | react-native-view-shot + expo-sharing | - |
| Storage | @react-native-async-storage/async-storage | 2.2 |
| TypeScript | typescript | 5.9 |

## Design System

### Theme Constants (`constants/theme.ts`)

**Colors:**
- `pitchGreen` (#05F26C) -- Primary accent, CTAs, success states
- `retroBlack` (#1A1A2E) -- Background, dark surfaces
- `chalkWhite` (#F5F5F0) -- Primary text
- `floodlightWhite` (#F0F6FC) -- Bright text emphasis
- `matchGreen` (#52B788) -- Secondary green, stat highlights
- `cardRed` (#E63946) -- Error states, danger actions
- `cardYellow` (#F4A261) -- Warnings, hints
- `offsideRed` (#FF2D55) -- Accent red
- `steelGray` (#6C757D) -- Muted text, secondary labels

**Typography:**
- `BarlowCondensed-Bold` -- Headings, game titles, large numbers
- `BarlowCondensed-SemiBold` -- Subheadings, button text, labels

**Spacing:** xs(4), sm(8), md(12), lg(16), xl(24), xxl(32)

### Key UI Components

- **GlassCard** -- Frosted glass container with semi-transparent background and subtle border
- **RetroButton** -- Primary interactive button with three variants (primary/secondary/danger), haptic feedback, and click sound
- **PopInView** -- Scale-from-zero entrance animation using Reanimated spring
- **ShakeView** -- Horizontal shake animation for wrong answers

## Game Modes

### 1. Who Are Ya? (`index.tsx`)
Daily player guessing game. Players guess a mystery footballer by searching and comparing attributes (team, league, nationality, position, market value). Visual feedback shows matching/close/wrong for each attribute. 6 guesses maximum.

### 2. Grid (`explore.tsx`)
3x3 criteria grid where rows and columns represent team/league/nationality criteria. Players fill each cell with a footballer matching both the row and column criteria. 9 guesses to fill 9 cells.

### 3. Missing 11 (`missing11.tsx`)
Guess all 11 players from a historic match lineup. Players tap jersey positions on a soccer pitch visualization and search for the correct player name. 3 lives for wrong guesses.

### 4. Connections (`connections.tsx`)
Group 16 footballer names into 4 categories of 4. Categories are color-coded. 4 mistakes allowed. Shuffle and deselect controls available.

### 5. Badge (`badge.tsx`)
Identify team badges from pixelated versions across 5 rounds. Badges progressively de-pixelate with wrong guesses. Scoring: 5 points at first attempt, decreasing per hint level. Max score: 25.

### 6. Higher/Lower (`higherlower.tsx`)
Endless streak game comparing market values. See the current player's value, guess whether the challenger's value is higher or lower. Streak-based scoring with high score persistence.

### 7. Agent (`agent.tsx`)
Transfer fee guessing game. Given a transfer fee, identify which of 4 players was transferred for that amount. 10 rounds per game using real transfer data.

## Data Layer

### Static Datasets
- **`players_db_v1.json`** -- Complete player database with name, team, league, nationality, position, market value, and ID
- **`matches_db.json`** -- Historic match data with lineups, formations, scores, competitions, and seasons
- **`transfers.json`** -- Transfer records with player names, clubs, fees, and dates
- **`teamColors.ts`** -- Team name to primary/secondary color mapping for crests

### Data Access (`lib/`)
- `playerData.ts` -- `getAllPlayers()`, `searchPlayers(query, limit)` with normalized fuzzy search
- `matchData.ts` -- `getAllMatches()` loading from `matches_db.json`
- `transferData.ts` -- Transfer data loader for Agent game mode

## State Management (Zustand)

### `useGuessGameStore`
Who Are Ya game state: target player, guesses array, game status (playing/won/lost), daily number, `initGame()`, `makeGuess()`, `resetGame()`.

### `useDailyStateStore`
Persistent stats: games played, games won, current streak, max streak, guess distribution (array of counts per guess number).

### `useDailyProgressStore`
Cross-game daily progress tracking: `markCompleted(mode, score)` records completion for each game mode per day. Used by DailyMenu to show completion status.

### `useManagerStore`
Manager XP/leveling meta-game: `xpByMode` (XP earned per game mode), `totalXp`, `level`, `title`. `addXp(mode, amount)` increments XP and recalculates level from thresholds in `managerLevels.ts`.

### `useProStore`
IAP state: `isPro` boolean. Controls ad visibility and hint access.

## Meta-Game Systems

### Manager XP & Leveling
Players earn XP from every game mode. XP thresholds define levels with football-themed titles (e.g., "Youth Coach", "Assistant Manager", "Legendary Manager"). Displayed via `ManagerCard` on the profile screen with XP breakdown by mode.

### Daily Seeded Puzzles
`dailySeed.ts` generates deterministic seeds from the current date, ensuring all players get the same puzzle each day. `getModeSeed(mode)` provides a unique seed per game mode per day.

### Daily Progress Tracking
`DailyMenu` component shows completion status for all 7 game modes. Each mode can be completed once per day with a score recorded.

## Monetization

### Banner Ads
`BannerAd` component renders AdMob banners at the bottom of game and profile screens. Hidden for Pro users.

### Rewarded Video Hints
Hints in Who Are Ya and Missing 11 are gated behind rewarded video ads. Pro users get free hints.

### IAP Pro License
One-time purchase removes all ads and unlocks free hints. Managed via `useProStore` with `purchasePro()` and `restorePurchases()` in `lib/purchases.ts`.

## Social Sharing

`react-native-view-shot` captures styled share cards (`Shareable*.tsx` components) as images, then `expo-sharing` presents the native share sheet. Each game mode has a dedicated share card component with themed layout showing score, game-specific stats, and branding.

Share cards: `ShareableResult`, `ShareableGridResult`, `ShareableMissing11Result`, `ShareableConnectionsResult`, `ShareableBadgeResult`, `ShareableHigherLowerResult`, `ShareableAgentResult`.

## Sound System

`lib/sounds.ts` provides a simple sound effects API using `expo-av`:

- **`playClick()`** -- Short UI click, triggered on every `RetroButton` press
- **`playWhistle()`** -- Referee whistle, played on Missing 11 game start
- **`playCheer()`** -- Crowd cheer, played on wins and high scores
- **`playCrossbar()`** -- Crossbar hit, played on losses and game overs

**Architecture:**
- Sounds are lazy-loaded on first use via `Audio.Sound.createAsync()`
- Cached `Audio.Sound` instances are reused (seek to 0 and replay)
- Global sound toggle persisted in AsyncStorage (`@sound_enabled`)
- `setSoundEnabled(bool)` / `isSoundEnabled()` control the toggle
- All playback wrapped in try/catch for graceful handling of missing files
- Sound toggle available in profile Settings section

## Animation System

### Reanimated Animations
- **PopInView** -- `withSpring` scale animation from 0 to 1 on mount, with optional delay
- **ShakeView** -- `withTiming` horizontal translateX oscillation triggered by a `shake` prop

### Haptic Feedback (expo-haptics)
- `ImpactFeedbackStyle.Light` -- Button presses (RetroButton)
- `NotificationFeedbackType.Success` -- Correct answers
- `NotificationFeedbackType.Error` -- Wrong answers

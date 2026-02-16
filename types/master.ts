/**
 * Master Player Record — the single source of truth for all game modes.
 * Every field is explicitly required by at least one game mode.
 */

export interface MasterPlayerRecord {
  // === Identity ===
  global_id: number;                    // Unified ID across all sources
  name: string;                         // Display name
  normalized_name: string;              // Lowercase, no diacritics

  // === Demographics ===
  nationality: string;                  // Country name
  position: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';

  // === Club ===
  current_team: string;                 // Current/last club canonical name
  current_team_id: string;              // Global club ID
  league: string;                       // Current/last league

  // === Valuation ===
  market_value: number;                 // In euros (0 if unknown)

  // === Career (optional — populated for 500+ players) ===
  career?: CareerSpell[];               // Chronological club history
  career_tier?: DifficultyTier;         // Difficulty rating for Career Path game

  // === Transfers (optional — populated for 500+ players) ===
  transfers?: TransferRecord[];         // Transfer history with fees

  // === Media ===
  image_url: string;                    // Player photo URL (empty string if unavailable)

  // === Metadata ===
  source_ids: {                         // Cross-reference IDs
    players_db?: number;
    career_paths?: number;
    transfers?: number;
  };
  popularity_score?: number;            // For future Popularity Scoring Engine
}

export interface CareerSpell {
  club: string;                         // Canonical club name
  club_id: string;                      // Global club ID
  from: number;                         // Start year
  to: number;                           // End year
}

export interface TransferRecord {
  club_name: string;                    // Canonical club name
  club_id: string;                      // Global club ID
  date_joined: string;                  // YYYY-MM-DD
  date_left: string | null;             // YYYY-MM-DD or null if current
  fee: string | null;                   // "€88m", "Free", or null
}

export type DifficultyTier =
  | 'legendary'
  | 'world_class'
  | 'professional'
  | 'semi_pro'
  | 'amateur'
  | 'beginner';

export interface MasterClubRecord {
  global_club_id: string;               // Lowercase hyphenated
  canonical_name: string;               // Display name
  aliases: string[];                    // Alternative names
  league: string;                       // Primary league
  country: string;                      // Country
  colors: {
    primary: string;                    // Hex color
    secondary: string;                  // Hex color
    pattern: 'chevron' | 'stripe' | 'halves' | 'circle';
  } | null;                             // null if no badge data
  player_count: number;                 // How many players in master DB
}

export interface MasterMatchRecord {
  match_id: string;                     // Unique ID
  date: string;                         // YYYY-MM-DD
  competition: string;                  // Competition name
  season: string;                       // YYYY-YY
  team_a: {
    name: string;                       // Canonical team name
    club_id: string;                    // Global club ID
  };
  team_b: {
    name: string;
    club_id: string;
  };
  score: string;                        // "3-1", "3-3 (pens)"
  lineup_a: PlayerRef[];                // 11 player references
  lineup_b: PlayerRef[];                // 11 player references
}

export interface PlayerRef {
  global_id: number | null;             // Resolved player ID (null if unresolved)
  name: string;                         // Display name
}

// === Database container ===
export interface MasterDatabase {
  version: string;                      // "2.0"
  generated: string;                    // ISO date
  stats: {
    total_players: number;
    players_with_career: number;
    players_with_transfers: number;
    total_clubs: number;
    total_matches: number;
  };
  players: MasterPlayerRecord[];
  clubs: MasterClubRecord[];
  matches: MasterMatchRecord[];
}

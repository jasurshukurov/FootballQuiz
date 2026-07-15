export interface Player {
  id: number;
  name: string;
  normalized_name: string;
  nationality: string;
  current_team: string;
  league: string;
  position: string;
  market_value: number;
  /** Optional since 2026-07-15: stripped from players_db_v1 (nothing renders
   *  it; Career Path photos come from career_paths.json instead). */
  image_url?: string;
  last_season?: number;
  status?: 'active' | 'retired';
  retired_year?: number;
}

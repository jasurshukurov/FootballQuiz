export interface Player {
  id: number;
  name: string;
  normalized_name: string;
  nationality: string;
  current_team: string;
  league: string;
  position: string;
  market_value: number;
  image_url: string;
  last_season?: number;
}

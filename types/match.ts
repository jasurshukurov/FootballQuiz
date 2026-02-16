export interface Match {
  match_id: string;
  date: string;
  competition: string;
  season: string;
  opponent_a: string;
  opponent_b: string;
  score: string;
  lineup_a_ids: number[];
  lineup_b_ids: number[];
  lineup_a_names: string[];
  lineup_b_names: string[];
}

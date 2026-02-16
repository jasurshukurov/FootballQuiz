import { Match } from '@/types/match';

const matchesJson = require('@/data/matches_db.json') as Match[];

let cachedMatches: Match[] | null = null;

export function getAllMatches(): Match[] {
  if (!cachedMatches) {
    cachedMatches = matchesJson;
  }
  return cachedMatches;
}

export function getMatchById(id: string): Match | undefined {
  return getAllMatches().find((m) => m.match_id === id);
}

export function getMatchesByTeam(teamName: string): Match[] {
  const normalized = teamName.toLowerCase().trim();
  return getAllMatches().filter(
    (m) =>
      m.opponent_a.toLowerCase().includes(normalized) ||
      m.opponent_b.toLowerCase().includes(normalized),
  );
}

export function getMatchesByCompetition(comp: string): Match[] {
  const normalized = comp.toLowerCase().trim();
  return getAllMatches().filter((m) => m.competition.toLowerCase().includes(normalized));
}

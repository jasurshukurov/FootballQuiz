import { Match } from '@/types/match';
import { rotatingPick, ROTATION_SALT } from './dailyRotation';

const matchesJson = require('@/data/matches_db.json') as Match[];

let cachedMatches: Match[] | null = null;

export function getAllMatches(): Match[] {
  if (!cachedMatches) {
    cachedMatches = matchesJson;
  }
  return cachedMatches;
}

/** A match is playable only if BOTH XIs have 11 distinct, non-empty names. */
function isPlayableMatch(m: Match): boolean {
  for (const names of [m.lineup_a_names, m.lineup_b_names]) {
    if (!names || names.length !== 11) return false;
    if (names.some((n) => !n || n.trim() === '')) return false;
    if (new Set(names.map((n) => n.toLowerCase().trim())).size !== 11) return false;
  }
  return true;
}

let cachedPlayable: Match[] | null = null;
export function getPlayableMatches(): Match[] {
  if (!cachedPlayable) {
    const playable = getAllMatches().filter(isPlayableMatch);
    cachedPlayable = playable.length > 0 ? playable : getAllMatches();
  }
  return cachedPlayable;
}

/**
 * Deterministic no-repeat daily match, indexed by absolute day number so the
 * same match never recurs until the pool cycles.
 */
export function getDailyMatch(dayIndex: number): Match {
  return rotatingPick(getPlayableMatches(), dayIndex, ROTATION_SALT.missing11);
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

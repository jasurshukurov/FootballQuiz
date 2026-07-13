// Generator for "Guess the Match" — reveal a historic match's starting XI one
// name at a time (least-famous first, famous names last) and guess the fixture
// from 4 multiple-choice options.
//
// Reads data/matches_db.json. Lineups are NAMES ONLY (ids are 0), so fame is
// joined by name via the shared helper — which prefers the disambiguated
// fame_by_id map and falls back to fame_scores for historic players (retired
// legends in old lineups) that aren't in players_db.

import { getFameByName } from './playerData';

interface RawMatch {
  match_id: string;
  date: string;
  competition: string;
  season: string;
  opponent_a: string;
  opponent_b: string;
  score: string;
  lineup_a_names: string[];
  lineup_b_names: string[];
}

const matchesData = require('@/data/matches_db.json') as RawMatch[];

export interface MatchGuessPuzzle {
  matchId: string;
  competition: string;
  year: number;
  score: string;
  teamName: string;
  opponentName: string;
  /** The revealed side's XI, least-famous first (famous names last). */
  revealOrder: string[];
  /** 4 fixture labels — exactly one is the answer. */
  options: string[];
  answerIndex: number;
  answer: string;
}

/** Fame for a player name; unknown names return -1 so they reveal first. */
export function fameOf(name: string): number {
  return getFameByName(name)?.fame_score ?? -1;
}

const COMPETITION_SHORT: [RegExp, string][] = [
  [/UEFA Champions League/i, 'UCL'],
  [/FIFA Club World Cup/i, 'Club World Cup'],
  [/FIFA World Cup/i, 'World Cup'],
  [/UEFA European Championship/i, 'Euro'],
  [/UEFA Euro/i, 'Euro'],
  [/UEFA Europa League/i, 'Europa League'],
  [/UEFA Conference League/i, 'Conference League'],
  [/UEFA Nations League/i, 'Nations League'],
  [/Africa Cup of Nations/i, 'AFCON'],
  [/AFC Asian Cup/i, 'Asian Cup'],
  [/Copa America/i, 'Copa América'],
  [/Copa Libertadores/i, 'Copa Libertadores'],
  [/Copa del Rey/i, 'Copa del Rey'],
  [/Supercopa de Espana/i, 'Supercopa'],
  [/DFB-Pokal/i, 'DFB-Pokal'],
];

function shortCompetition(competition: string): string {
  for (const [re, short] of COMPETITION_SHORT) {
    if (re.test(competition)) return competition.replace(re, short);
  }
  return competition;
}

function matchYear(match: RawMatch): number {
  return parseInt(match.date.slice(0, 4), 10);
}

function matchLabel(match: RawMatch): string {
  return `${matchYear(match)} ${shortCompetition(match.competition)} — ${match.opponent_a} vs ${match.opponent_b}`;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Matches with a full 11-name lineup on at least the chosen side. */
function playableMatches(): RawMatch[] {
  return matchesData.filter(
    (m) =>
      (Array.isArray(m.lineup_a_names) && m.lineup_a_names.length === 11) ||
      (Array.isArray(m.lineup_b_names) && m.lineup_b_names.length === 11),
  );
}

/** Build 3 plausible distractor labels: prefer same competition, then same era. */
function buildDistractors(answer: RawMatch, answerLabel: string, rand: () => number): string[] {
  const year = matchYear(answer);
  const others = matchesData.filter((m) => m.match_id !== answer.match_id);

  const sameCompetition = others.filter((m) => m.competition === answer.competition);
  const sameEra = others.filter((m) => Math.abs(matchYear(m) - year) <= 8);

  const distractors: string[] = [];
  const usedLabels = new Set<string>([answerLabel]);

  const addFrom = (pool: RawMatch[]) => {
    for (const m of seededShuffle(pool, rand)) {
      if (distractors.length >= 3) break;
      const label = matchLabel(m);
      if (usedLabels.has(label)) continue;
      usedLabels.add(label);
      distractors.push(label);
    }
  };

  addFrom(sameCompetition);
  if (distractors.length < 3) addFrom(sameEra);
  if (distractors.length < 3) addFrom(others);

  return distractors;
}

/**
 * Build a deterministic Guess the Match puzzle for a seed.
 * revealOrder is the chosen side's XI sorted by ascending fame (famous last).
 */
export function generateMatchGuessPuzzle(seed: number): MatchGuessPuzzle {
  const rand = mulberry32(seed);
  const pool = playableMatches();
  const match = pool[Math.floor(rand() * pool.length)];

  // Choose a side that actually has 11 names.
  const aOk = match.lineup_a_names?.length === 11;
  const bOk = match.lineup_b_names?.length === 11;
  const useA = aOk && (!bOk || rand() < 0.5);

  const teamName = useA ? match.opponent_a : match.opponent_b;
  const opponentName = useA ? match.opponent_b : match.opponent_a;
  const names = useA ? match.lineup_a_names : match.lineup_b_names;

  // Least famous first (unknown fame = -1 sorts first), famous last. Tiebreak on
  // name for full determinism.
  const revealOrder = [...names].sort((x, y) => {
    const fx = fameOf(x);
    const fy = fameOf(y);
    if (fx !== fy) return fx - fy;
    return x.localeCompare(y);
  });

  const answer = matchLabel(match);
  const distractors = buildDistractors(match, answer, rand);
  const options = seededShuffle([answer, ...distractors], rand);

  return {
    matchId: match.match_id,
    competition: match.competition,
    year: matchYear(match),
    score: match.score,
    teamName,
    opponentName,
    revealOrder,
    options,
    answerIndex: options.indexOf(answer),
    answer,
  };
}

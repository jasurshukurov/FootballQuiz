// Generator for "Guess the Match" — reveal a historic match's starting XI one
// name at a time (least-famous first, famous names last) and guess the fixture
// from 4 multiple-choice options.
//
// Reads data/matches_db.json. Lineups are NAMES ONLY (ids are 0), so fame is
// joined by name via the shared helper — which prefers the disambiguated
// fame_by_id map and falls back to fame_scores for historic players (retired
// legends in old lineups) that aren't in players_db.

import { getFameByName } from './playerData';
import { getTodayDateString } from './dailySeed';
import { bandForDate, FameBand, resolveSkillTier } from './difficultyCurve';
import { MIN_MATCH_YEAR } from './matchData';

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
  return `${matchYear(match)} ${shortCompetition(match.competition)} · ${match.opponent_a} vs ${match.opponent_b}`;
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

/** Matches with a full 11-name lineup on at least one side, no older than the
 *  shared MIN_MATCH_YEAR floor (pre-1990 fixtures are unguessable dailies). */
function playableMatches(): RawMatch[] {
  return matchesData.filter(
    (m) =>
      matchYear(m) >= MIN_MATCH_YEAR &&
      ((Array.isArray(m.lineup_a_names) && m.lineup_a_names.length === 11) ||
        (Array.isArray(m.lineup_b_names) && m.lineup_b_names.length === 11)),
  );
}

// ---------------------------------------------------------------------------
// Notability (difficulty axis)
// ---------------------------------------------------------------------------
// Uniform-random match selection made a World Cup final as likely as an obscure
// group-stage tie. Instead we score each match's notability — competition
// prestige + how famous its XI is — and let the weekly band bias selection:
// early week favors iconic finals, the weekend favors deep cuts.

const COMPETITION_WEIGHT: [RegExp, number][] = [
  [/FIFA World Cup/i, 1.0],
  [/UEFA Champions League/i, 0.95],
  [/UEFA European Championship|UEFA Euro/i, 0.9],
  [/Copa America/i, 0.85],
  [/Copa Libertadores/i, 0.85],
  [/FIFA Club World Cup/i, 0.8],
  [/UEFA Europa League/i, 0.7],
  [/Africa Cup of Nations/i, 0.7],
  [/AFC Asian Cup/i, 0.6],
  [/UEFA Conference League/i, 0.55],
  [/UEFA Nations League/i, 0.55],
  [/Copa del Rey|DFB-Pokal|Supercopa/i, 0.5],
];

function competitionWeight(competition: string): number {
  for (const [re, w] of COMPETITION_WEIGHT) {
    if (re.test(competition)) return w;
  }
  return 0.4;
}

/** Mean fame of a full XI, 0..~1. Unknown fame counts as 0 (obscure). */
function sideMeanFame(names: string[]): number {
  if (names.length === 0) return 0;
  const sum = names.reduce((acc, n) => acc + Math.max(0, fameOf(n)), 0);
  return sum / names.length / 100;
}

/** Notability 0..1: 60% competition prestige, 40% the most-famous available XI. */
function matchNotability(m: RawMatch): number {
  const fa = m.lineup_a_names?.length === 11 ? sideMeanFame(m.lineup_a_names) : 0;
  const fb = m.lineup_b_names?.length === 11 ? sideMeanFame(m.lineup_b_names) : 0;
  return 0.6 * competitionWeight(m.competition) + 0.4 * Math.max(fa, fb);
}

/** How far the band pulls selection toward obscure matches (0 = iconic, 1 = deep cut). */
function bandDifficulty(band: FameBand): number {
  switch (band.label) {
    case 'easy':
      return 0.1;
    case 'medium':
      return 0.35;
    case 'hard':
      return 0.6;
    case 'expert':
      return 0.85;
    case 'wildcard':
    default:
      return 0.5;
  }
}

function weightedPick<T>(items: T[], weights: number[], rand: () => number): T {
  const total = weights.reduce((a, w) => a + w, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Canonical key for a fixture so side-swapped duplicates (A vs B == B vs A) and
 *  the answer's own (year, competition, teams) triple are deduped as one. */
function fixtureKey(year: number, competition: string, a: string, b: string): string {
  return `${year}|${competition}|${[a, b].sort().join('~')}`;
}

/**
 * Build 3 plausible distractor labels that ALL feature the given team, so the
 * team banner never leaks the answer (an option is only right because of WHICH
 * fixture it is, not because it is the only one mentioning the team).
 *
 * Two sources, in order of preference:
 *   1. REAL other matches of the given team from the dataset (same competition
 *      first, then any other) — genuine fixtures the player might confuse.
 *   2. PLAUSIBLE invented fixtures — the given team in the SAME competition, a
 *      different (never future) season, against a real club drawn from that
 *      competition's actual dataset pool. Never reproduces the real answer
 *      fixture, and no two options describe the same fixture.
 */
function buildDistractors(
  answer: RawMatch,
  answerLabel: string,
  teamName: string,
  currentYear: number,
  rand: () => number,
): string[] {
  const answerYear = matchYear(answer);
  const answerOpponent = answer.opponent_a === teamName ? answer.opponent_b : answer.opponent_a;

  const distractors: string[] = [];
  const usedLabels = new Set<string>([answerLabel]);
  const usedFixtures = new Set<string>([
    fixtureKey(answerYear, answer.competition, teamName, answerOpponent),
  ]);

  const push = (label: string, fixture: string): boolean => {
    if (distractors.length >= 3) return false;
    if (usedLabels.has(label) || usedFixtures.has(fixture)) return false;
    usedLabels.add(label);
    usedFixtures.add(fixture);
    distractors.push(label);
    return true;
  };

  // 1) Real other matches of the given team — same competition first, then any.
  //    Floored to MIN_MATCH_YEAR so a modern answer never sits beside a 1950s
  //    fixture that gives itself away as filler.
  const teamMatches = matchesData.filter(
    (m) =>
      m.match_id !== answer.match_id &&
      matchYear(m) >= MIN_MATCH_YEAR &&
      (m.opponent_a === teamName || m.opponent_b === teamName),
  );
  const ordered = [
    ...seededShuffle(
      teamMatches.filter((m) => m.competition === answer.competition),
      rand,
    ),
    ...seededShuffle(
      teamMatches.filter((m) => m.competition !== answer.competition),
      rand,
    ),
  ];
  for (const m of ordered) {
    if (distractors.length >= 3) break;
    push(matchLabel(m), fixtureKey(matchYear(m), m.competition, m.opponent_a, m.opponent_b));
  }

  // 2) Plausible invented fixtures: given team, same competition, real opponent
  //    from that competition's club pool, a different non-future season.
  if (distractors.length < 3) {
    const compClubs = new Set<string>();
    for (const m of matchesData) {
      if (m.competition !== answer.competition) continue;
      if (m.opponent_a && m.opponent_a !== teamName) compClubs.add(m.opponent_a);
      if (m.opponent_b && m.opponent_b !== teamName) compClubs.add(m.opponent_b);
    }
    let opponentPool = [...compClubs];
    if (opponentPool.length === 0) {
      // Competition too thin in the dataset: any real club the team could plausibly
      // meet, falling back to the real opponent if the whole pool is empty.
      const allClubs = new Set<string>();
      for (const m of matchesData) {
        if (m.opponent_a && m.opponent_a !== teamName) allClubs.add(m.opponent_a);
        if (m.opponent_b && m.opponent_b !== teamName) allClubs.add(m.opponent_b);
      }
      opponentPool = allClubs.size > 0 ? [...allClubs] : [answerOpponent];
    }
    opponentPool = seededShuffle(opponentPool, rand);

    // Season window around the real match, never in the future.
    const maxYear = Math.min(currentYear, answerYear + 8);
    const years: number[] = [];
    for (let y = Math.max(MIN_MATCH_YEAR, answerYear - 8); y <= maxYear; y++) years.push(y);
    const shuffledYears = seededShuffle(years, rand);

    const shortComp = shortCompetition(answer.competition);
    outer: for (const opponent of opponentPool) {
      for (const y of shuffledYears) {
        if (distractors.length >= 3) break outer;
        const teamFirst = rand() < 0.5;
        const label = teamFirst
          ? `${y} ${shortComp} · ${teamName} vs ${opponent}`
          : `${y} ${shortComp} · ${opponent} vs ${teamName}`;
        push(label, fixtureKey(y, answer.competition, teamName, opponent));
      }
    }
  }

  return distractors;
}

/**
 * Build a deterministic Guess the Match puzzle for a seed + local date.
 *
 * The date drives the weekly difficulty band, which biases match selection by
 * notability (iconic finals early week, deep cuts on the weekend). revealOrder
 * is the chosen side's XI sorted by ascending fame (obscure names first, famous
 * last).
 */
export function generateMatchGuessPuzzle(
  seed: number,
  dateStr: string = getTodayDateString(),
): MatchGuessPuzzle {
  const rand = mulberry32(seed);
  const pool = playableMatches();

  // Weight by notability, tilted by the day's band. The per-user skill tier
  // (neutral 0 without play history — that path computes the exact current
  // weights) nudges the tilt by ~half a band step, clamped to [0, 1]; the
  // epsilon floor below keeps every match reachable regardless of tilt.
  const skillTier = resolveSkillTier('guessmatch');
  const d0 = bandDifficulty(bandForDate(dateStr));
  const d = skillTier === 0 ? d0 : Math.min(1, Math.max(0, d0 + skillTier * 0.15));
  const weights = pool.map((m) => {
    const n = matchNotability(m);
    // easy day -> favor high notability; expert day -> favor low. Epsilon keeps
    // every match reachable so no seed can dead-end.
    return Math.max(0.001, (1 - d) * n + d * (1 - n));
  });
  const match = weightedPick(pool, weights, rand);

  // Choose a side that actually has 11 names.
  const aOk = match.lineup_a_names?.length === 11;
  const bOk = match.lineup_b_names?.length === 11;
  const useA = aOk && (!bOk || rand() < 0.5);

  const teamName = useA ? match.opponent_a : match.opponent_b;
  const opponentName = useA ? match.opponent_b : match.opponent_a;
  const names = useA ? match.lineup_a_names : match.lineup_b_names;

  // Obscure names reveal FIRST: unknown fame (-1) and low fame sort ahead of the
  // stars (famous last). Tiebreak on name for full determinism.
  const revealOrder = [...names].sort((x, y) => {
    const fx = fameOf(x);
    const fy = fameOf(y);
    if (fx !== fy) return fx - fy;
    return x.localeCompare(y);
  });

  const answer = matchLabel(match);
  // Ceiling year for invented fixtures: derive from the puzzle date so the "never
  // in the future" clamp stays deterministic (independent of wall-clock time).
  const currentYear = parseInt(dateStr.slice(0, 4), 10) || matchYear(match);
  const distractors = buildDistractors(match, answer, teamName, currentYear, rand);
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

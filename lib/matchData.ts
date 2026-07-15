import { Match } from '@/types/match';
import { Player } from '@/types/player';
import { DifficultyTier } from '@/types/career';
import { seededShuffle, ROTATION_SALT } from './dailyRotation';
import { getDailyNumber } from './dailyPuzzle';
import { getAllPlayersWithCareer, getFameByName } from './playerData';
import { resolveSkillTier } from './difficultyCurve';

const matchesJson = require('@/data/matches_db.json') as Match[];

// Identity layer for lineup names (built by scripts/etl/build_lineup_aliases.py):
// match_id -> folded lineup name -> players_db row ids of the SAME human under a
// different spelling ("Aguero" on the team sheet vs "Sergio Aguero" in the DB).
// Arrays because players_db carries duplicate rows for some humans.
const lineupAliasesJson = require('@/data/lineup_aliases.json') as Record<
  string,
  Record<string, number[]>
>;

let cachedMatches: Match[] | null = null;

export function getAllMatches(): Match[] {
  if (!cachedMatches) {
    cachedMatches = matchesJson;
  }
  return cachedMatches;
}

/** Diacritic-fold + lowercase a name so "Özil" matches a typed "ozil". */
export function foldName(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
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

/** Floor year for every match-based mode. The raw DB reaches back to the 1930
 *  World Cup, and a 1947 FA Cup final once surfaced as a daily — matches that
 *  old are unguessable for today's audience. "Classic" era = 1990-2009. */
export const MIN_MATCH_YEAR = 1990;

let cachedPlayable: Match[] | null = null;
export function getPlayableMatches(): Match[] {
  if (!cachedPlayable) {
    const playable = getAllMatches().filter(
      (m) => isPlayableMatch(m) && matchYear(m) >= MIN_MATCH_YEAR,
    );
    cachedPlayable = playable.length > 0 ? playable : getAllMatches();
  }
  return cachedPlayable;
}

// ---------------------------------------------------------------------------
// Match notability (fame score for a match — the difficulty axis)
// ---------------------------------------------------------------------------
// A match's "notability" is how instantly a casual, modern-era fan recognizes
// it, on the same 0-100 scale as player fame so it slots straight into the
// shared weekly difficulty bands (difficultyCurve.ts). It is a multi-factor
// blend of FOUR signals, weighted so RECENCY and STAR POWER dominate — a
// prestigious-but-forgotten final (e.g. a 1996 AFCON final whose XI nobody can
// name) must land as a deep cut, while any recent Champions League / World Cup
// final full of household names sits at the top:
//
//   recency (0.34)  — strong monotonic boost for recent matches; the last ~8
//                     years get near-full credit, decaying to a floor for old
//                     fixtures. A 2019 CL final comfortably outranks a 1996
//                     AFCON final on this axis alone.
//   star power (0.30) — how famous the more-famous XI is (top-4 stars blended
//                     with the whole-XI mean via getFameByName). A lineup of
//                     superstars is recognizable regardless of the stage.
//   competition (0.20) — keyword prestige ladder (World Cup final > CL final >
//                     continental/league deciders > cup finals > group/league
//                     games). AFCON/Copa América finals are prestigious but are
//                     capped BELOW the household band so prestige alone can't
//                     carry an unrecognizable match.
//   team prominence (0.16) — stature of the two teams, derived from DATA (the
//                     mean fame of every player each club/nation has fielded
//                     across the whole match DB), not a hardcoded big-club list.
//                     Rewards famous clubs even in an off lineup, and keeps
//                     minnows (whose all-time XIs resolve little fame) low.
//
// Early-week difficulty bands select high-notability matches (recent, starry,
// prestigious); the weekend summit pulls the obscure deep cuts.

// The notability blend reads competition + lineups + dates, so it accepts any
// structurally-compatible row (the full Match, or matchGuessGenerator's names-
// only RawMatch — ids are never used here).
export type NotabilityInput = Pick<
  Match,
  | 'competition'
  | 'date'
  | 'season'
  | 'opponent_a'
  | 'opponent_b'
  | 'lineup_a_names'
  | 'lineup_b_names'
>;

/** Blend weights — recency + star power dominate (0.64 of the total). */
const NOTABILITY_WEIGHTS = { recency: 0.34, star: 0.3, comp: 0.2, prom: 0.16 } as const;

const COMPETITION_WEIGHTS: { keyword: string; weight: number }[] = [
  // most-specific first — 'club world cup' must never hit 'world cup final'
  { keyword: 'club world cup', weight: 66 },
  { keyword: 'intercontinental', weight: 64 },
  { keyword: 'world cup final', weight: 100 },
  { keyword: 'champions league final', weight: 96 },
  { keyword: 'european cup winners', weight: 60 },
  { keyword: 'european cup final', weight: 94 },
  { keyword: 'european cup', weight: 74 },
  { keyword: 'euro final', weight: 92 },
  { keyword: 'european championship final', weight: 92 },
  { keyword: 'world cup semi', weight: 88 },
  { keyword: 'copa america final', weight: 82 },
  // Continental finals below the big-three: prestigious, but capped under the
  // household band (their XIs rarely read as globally famous).
  { keyword: 'africa cup of nations final', weight: 72 },
  { keyword: 'asian cup final', weight: 66 },
  { keyword: 'champions league semi', weight: 82 },
  { keyword: 'world cup', weight: 80 }, // remaining WC rounds
  { keyword: 'champions league', weight: 74 }, // remaining CL rounds
  { keyword: 'european championship', weight: 72 },
  { keyword: 'euro ', weight: 72 },
  { keyword: 'nations league', weight: 66 },
  { keyword: 'europa league', weight: 62 },
  { keyword: 'uefa cup', weight: 62 },
  { keyword: 'conference league', weight: 54 },
  { keyword: 'libertadores', weight: 60 },
  { keyword: 'copa america', weight: 60 },
  { keyword: 'asian cup', weight: 52 },
  { keyword: 'africa cup', weight: 54 },
  { keyword: 'fa cup', weight: 58 },
  { keyword: 'league cup', weight: 50 },
  { keyword: 'super cup', weight: 55 },
  { keyword: 'copa del rey', weight: 52 },
  { keyword: 'coppa italia', weight: 50 },
  { keyword: 'dfb', weight: 50 },
  { keyword: 'supercopa', weight: 48 },
  { keyword: 'premier league', weight: 56 },
  { keyword: 'la liga', weight: 54 },
  { keyword: 'serie a', weight: 52 },
  { keyword: 'bundesliga', weight: 50 },
  { keyword: 'ligue 1', weight: 46 },
];

function competitionWeight(competition: string): number {
  const c = competition.toLowerCase();
  for (const { keyword, weight } of COMPETITION_WEIGHTS) {
    if (c.includes(keyword)) return weight;
  }
  return 45; // unknown competition: middling
}

// Recency anchor: the most recent match year in the DB. Deriving it from the
// data (not the wall clock) keeps the score deterministic and stable across
// test runs, yet self-advances as newer matches are ingested — no manual bump.
let cachedAnchorYear: number | null = null;
function recencyAnchorYear(): number {
  if (cachedAnchorYear === null) {
    let max = MIN_MATCH_YEAR;
    for (const m of getAllMatches()) max = Math.max(max, matchYear(m));
    cachedAnchorYear = max;
  }
  return cachedAnchorYear;
}

// Recency curve: piecewise-linear decay in `age` (= anchor − matchYear), so the
// most recent ~8 years keep near-full credit and older fixtures fall away
// smoothly to a floor. Knots are [age, score]; monotonically non-increasing.
const RECENCY_KNOTS: [number, number][] = [
  [0, 100],
  [8, 90],
  [16, 70],
  [26, 45],
  [36, 25],
  [60, 10],
];

/** Recency score (0-100) for a match year, relative to the DB's newest match. */
function recencyScore(year: number): number {
  const age = recencyAnchorYear() - year;
  if (age <= 0) return 100;
  for (let i = 1; i < RECENCY_KNOTS.length; i++) {
    const [a0, s0] = RECENCY_KNOTS[i - 1];
    const [a1, s1] = RECENCY_KNOTS[i];
    if (age <= a1) return s0 + ((s1 - s0) * (age - a0)) / (a1 - a0);
  }
  return RECENCY_KNOTS[RECENCY_KNOTS.length - 1][1];
}

/** Mean fame of a lineup (names → getFameByName), 0 when nothing resolves. */
function meanLineupFame(names: string[]): number {
  let sum = 0;
  let n = 0;
  for (const name of names) {
    const fame = getFameByName(name)?.fame_score;
    if (fame !== undefined) {
      sum += fame;
      n += 1;
    }
  }
  return n === 0 ? 0 : sum / n;
}

/** Mean fame of the top-`k` most-famous resolvable names in a lineup, 0 if none. */
function topKLineupFame(names: string[], k: number): number {
  const fames = names
    .map((n) => getFameByName(n)?.fame_score)
    .filter((f): f is number => f !== undefined)
    .sort((a, b) => b - a);
  if (fames.length === 0) return 0;
  const kk = Math.min(k, fames.length);
  return fames.slice(0, kk).reduce((a, b) => a + b, 0) / kk;
}

/** Star power of one XI: a few marquee names (top-4) blended with whole-XI depth. */
function sideStarPower(names: string[]): number {
  return 0.6 * topKLineupFame(names, 4) + 0.4 * meanLineupFame(names);
}

// Team prominence: the all-time stature of a club/nation, derived from the DATA
// as the mean fame of every player it has ever fielded across the whole match
// DB. A big club scores high even when a specific lineup is off; a minnow whose
// XIs resolve little fame stays low. Built lazily and cached; keyed by the
// opponent_a / opponent_b team strings the matches carry.
let cachedTeamProminence: Map<string, number> | null = null;
function teamProminence(team: string): number {
  if (!cachedTeamProminence) {
    const agg = new Map<string, { sum: number; n: number }>();
    for (const m of getAllMatches()) {
      for (const [name, lineup] of [
        [m.opponent_a, m.lineup_a_names],
        [m.opponent_b, m.lineup_b_names],
      ] as const) {
        if (!name || !lineup) continue;
        let a = agg.get(name);
        if (!a) {
          a = { sum: 0, n: 0 };
          agg.set(name, a);
        }
        for (const nm of lineup) {
          const f = getFameByName(nm)?.fame_score;
          if (f !== undefined) {
            a.sum += f;
            a.n += 1;
          }
        }
      }
    }
    cachedTeamProminence = new Map();
    for (const [t, a] of agg) cachedTeamProminence.set(t, a.n === 0 ? 0 : a.sum / a.n);
  }
  return cachedTeamProminence.get(team) ?? 0;
}

/**
 * Notability (0-100) for a match: recency + star power + competition prestige +
 * team prominence, blended per NOTABILITY_WEIGHTS (recency & star power dominate).
 * Higher = more recognizable to a casual modern fan / easier to recall.
 */
export function matchNotability(m: NotabilityInput): number {
  const recency = recencyScore(matchYear(m));
  const star = Math.max(sideStarPower(m.lineup_a_names), sideStarPower(m.lineup_b_names));
  const comp = competitionWeight(m.competition);
  const prom = (teamProminence(m.opponent_a) + teamProminence(m.opponent_b)) / 2;
  const w = NOTABILITY_WEIGHTS;
  return Math.round(w.recency * recency + w.star * star + w.comp * comp + w.prom * prom);
}

/**
 * Difficulty tier for a match, on the app's shared TierBadge vocabulary. The
 * badge reads as DIFFICULTY, matching the player-fame convention everywhere
 * else (fame 87 player = 'beginner' = anyone can get it; a deep cut =
 * 'legendary' = only football historians will): an iconic modern final full
 * of household names is a BEGINNER puzzle, an obscure old fixture is a
 * LEGENDARY one. (The old mapping ran the other way, which is how a 1996
 * AFCON final ever wore a "Beginner" badge.) Fixed notability thresholds
 * (not percentiles) so a match's badge never shifts as the pool grows.
 */
export function getMatchTier(m: NotabilityInput): DifficultyTier {
  const n = matchNotability(m);
  if (n >= 84) return 'beginner';
  if (n >= 74) return 'amateur';
  if (n >= 64) return 'semi_pro';
  if (n >= 54) return 'professional';
  if (n >= 44) return 'world_class';
  return 'legendary';
}

// ---------------------------------------------------------------------------
// Match categories (derived from existing metadata; guessability context)
// ---------------------------------------------------------------------------
// The category chip ("World Cup Final · 1990s") is PART of the challenge
// design: it structures what the screen already discloses (competition +
// season + teams + score) without revealing anything new.

const CATEGORY_FAMILIES: { keyword: string; label: string }[] = [
  // most-specific first ("club world cup" must beat "world cup")
  { keyword: 'club world cup', label: 'Club World Cup' },
  { keyword: 'intercontinental', label: 'Intercontinental Cup' },
  { keyword: 'world cup', label: 'World Cup' },
  { keyword: 'champions league', label: 'Champions League' },
  { keyword: 'cup winners', label: "Cup Winners' Cup" },
  { keyword: 'european cup', label: 'European Cup' },
  { keyword: 'european championship', label: 'Euros' },
  { keyword: 'euro ', label: 'Euros' },
  { keyword: 'nations league', label: 'Nations League' },
  { keyword: 'copa america', label: 'Copa America' },
  { keyword: 'africa cup', label: 'AFCON' },
  { keyword: 'asian cup', label: 'Asian Cup' },
  { keyword: 'gold cup', label: 'Gold Cup' },
  { keyword: 'europa league', label: 'Europa League' },
  { keyword: 'uefa cup', label: 'Europa League' },
  { keyword: 'conference league', label: 'Conference League' },
  { keyword: 'libertadores', label: 'Libertadores' },
  { keyword: 'super cup', label: 'Super Cup' },
  { keyword: 'fa cup', label: 'Domestic Cup' },
  { keyword: 'league cup', label: 'Domestic Cup' },
  { keyword: 'efl cup', label: 'Domestic Cup' },
  { keyword: 'copa del rey', label: 'Domestic Cup' },
  { keyword: 'supercopa', label: 'Domestic Cup' },
  { keyword: 'dfb', label: 'Domestic Cup' },
  { keyword: 'coppa italia', label: 'Domestic Cup' },
  { keyword: 'coupe de france', label: 'Domestic Cup' },
  { keyword: 'premier league', label: 'League Classic' },
  { keyword: 'la liga', label: 'League Classic' },
  { keyword: 'serie a', label: 'League Classic' },
  { keyword: 'bundesliga', label: 'League Classic' },
  { keyword: 'ligue 1', label: 'League Classic' },
];

function categoryStage(competition: string): string {
  const c = competition.toLowerCase();
  if (c.includes('semi')) return 'Semi-final';
  if (c.includes('quarter')) return 'Quarter-final';
  if (c.includes('round of 16')) return 'Round of 16';
  if (c.includes('third place')) return 'Third Place';
  if (c.includes('group')) return 'Group Stage';
  if (c.includes('final')) return 'Final';
  return '';
}

export interface MatchCategory {
  /** e.g. "World Cup Final", "Champions League Semi-final", "League Classic". */
  label: string;
  /** Decade of the match, e.g. "1990s". */
  era: string;
}

/** Best-effort calendar year of a match: its date, else a 4-digit run in the
 *  season string, else 2000. Drives the era chip and the modern-era rotation. */
export function matchYear(m: Pick<Match, 'date' | 'season'>): number {
  const yearStr = (m.date || '').slice(0, 4);
  if (/^\d{4}$/.test(yearStr)) return parseInt(yearStr, 10);
  return parseInt((String(m.season).match(/\d{4}/) || ['2000'])[0], 10);
}

/** Category + era for a match, derived from its competition string and date. */
export function getMatchCategory(m: Match): MatchCategory {
  const c = m.competition.toLowerCase();
  const family = CATEGORY_FAMILIES.find((f) => c.includes(f.keyword))?.label ?? 'Classic Match';
  const stage = categoryStage(c);
  // League/era categories read better without a stage suffix; cup families
  // carry their stage ("World Cup Semi-final" vs "League Classic").
  const label =
    stage && family !== 'League Classic' && family !== 'Classic Match'
      ? `${family} ${stage}`
      : family;
  return { label, era: `${Math.floor(matchYear(m) / 10) * 10}s` };
}

// ---------------------------------------------------------------------------
// Daily match schedule (era interleave + no-repeat backbone + weekly cadence)
// ---------------------------------------------------------------------------
// Two goals stacked on one deterministic schedule:
//
//   1. ERA MIX. The raw pool skews old (≈37% pre-1990, only ≈31% from 2010 on),
//      so a uniform rotation felt like "mostly old games". We instead route each
//      day to an era bucket by a fixed 4-day cadence (ERA_CADENCE): ~50% of days
//      land on 2015+ matches ("recent"), ~25% on 2010-2014 ("mid") and ~25% on
//      pre-2010 throwbacks ("classic") — ~75% modern, with 2015+ the plurality.
//      The era is a pure function of dayIndex, so every player sees the same
//      match on the same day. No old matches are deleted; they just surface less.
//
//   2. NO REPEATS. The rotation must never repeat a match within the dedup
//      window (the QA sim flags ANY repeat across a 60-day window as a hard
//      failure). We keep the notability weekday-tier backbone, but PER ERA: each
//      era bucket is notability-ranked and split into 7 contiguous weekday tiers,
//      FRONT-LOADED — small top slices feed Mon/Tue/Wed (only the era's most
//      recognizable matches), larger tiers pile the deep cuts onto the weekend.
//      For a given day we take its era's weekday tier and index into it by how many
//      earlier days shared that same (era, weekday). Because era buckets are
//      disjoint and each is partitioned by weekday, two days can only collide if
//      they share BOTH era and weekday AND land on the same within-tier slot;
//      the (era, weekday) occurrence counter can't wrap for well beyond the dedup
//      window, so there are ZERO repeats. Difficulty gating survives: Saturday
//      still serves each era's deep cuts, just deep-cut MODERN most of the time.

/** weekday(dayIndex) = (dayIndex + WEEKDAY_OFFSET) mod 7. Timezone-invariant:
 *  (localWeekday - dayIndex) mod 7 is the same for every calendar date. */
const WEEKDAY_OFFSET = (() => {
  const now = new Date();
  return (((now.getDay() - getDailyNumber(now)) % 7) + 7) % 7;
})();

// Weekdays from most-iconic to deepest-cut (JS getDay: Sun=0 ... Sat=6).
// A smooth calendar-week ramp — Monday serves the most-iconic finals and each
// day digs one tier deeper, summiting on Sunday — mirroring the Mon-easy →
// weekend-summit philosophy of difficultyCurve's weekly bands. (An earlier
// order parked Sunday mid-week, which read as random difficulty in play.)
const WEEKDAY_BY_PREFERENCE = [1, 2, 3, 4, 5, 6, 0];

// Era buckets for the interleave. Boundaries are fixed years (not percentiles)
// so a match's era never shifts as the pool grows.
const MODERN_ERA_START = 2010;
const RECENT_ERA_START = 2015;

type EraKey = 'recent' | 'mid' | 'classic';

// Deterministic era for each day, keyed by dayIndex mod 4. gcd(4, 7) = 1, so
// over any 28-day span every weekday draws this exact mix (see occurrence math
// below): ~50% recent (2015+), ~25% mid (2010-2014), ~25% classic (pre-2010) —
// i.e. ~75% modern days with 2015+ the plurality. Reorder/resize to retune the
// blend; CADENCE_CYCLE recomputes from its length.
const ERA_CADENCE: readonly EraKey[] = ['recent', 'mid', 'recent', 'classic'];

/** Least common multiple of the era cadence period and the 7-day week. */
const CADENCE_CYCLE = (() => {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const p = ERA_CADENCE.length;
  return (p * 7) / gcd(p, 7);
})();

function eraOf(m: Match): EraKey {
  const y = matchYear(m);
  if (y >= RECENT_ERA_START) return 'recent';
  if (y >= MODERN_ERA_START) return 'mid';
  return 'classic';
}

// Minimum matches per weekday tier, by era. Each (era, weekday) pair recurs on a
// fixed cadence, and the occurrence counter (below) must not wrap inside the
// dedup window or a match repeats. Over a 200-day window a recent-cadence pair
// recurs at most ~15 times, a mid/classic pair ~8 (recent fires twice per 4-day
// cadence, mid/classic once), so these floors sit just above those bounds. The
// 200-day no-repeat QA test is the hard gate; buckets (recent≈214, mid≈74,
// classic≈289) all exceed 7×floor so every weekday tier stays non-empty.
const WEEKDAY_TIER_MIN: Record<EraKey, number> = { recent: 16, mid: 9, classic: 9 };

// Front-loaded weekday split (preference order: most-notable slice first ...
// deepest last). Early-week tiers are SMALL — only the top of the era's ranking
// — so Mon/Tue/Wed serve matches a casual modern fan recognizes; later tiers
// grow, piling the obscure deep cuts onto the weekend. Ratios only; scaled to
// the bucket and floored at WEEKDAY_TIER_MIN[era] in weekdayTierSizes.
const WEEKDAY_TIER_RAMP = [1, 1.5, 2, 2.5, 3, 3.5, 4] as const;

/** Per-weekday tier sizes (preference order) for a bucket of `total` matches:
 *  the front-loaded ramp scaled to `total`, each floored at `minSize`, with any
 *  rounding remainder settled on the deepest tiers so early tiers stay small. */
function weekdayTierSizes(total: number, minSize: number): number[] {
  const sumW = WEEKDAY_TIER_RAMP.reduce((a, b) => a + b, 0);
  const sizes = WEEKDAY_TIER_RAMP.map((w) => Math.max(minSize, Math.floor((total * w) / sumW)));
  let diff = total - sizes.reduce((a, b) => a + b, 0);
  for (let i = sizes.length - 1; i >= 0 && diff !== 0; i--) {
    if (diff > 0) {
      sizes[i] += diff;
      diff = 0;
    } else {
      const take = Math.min(-diff, sizes[i] - minSize);
      sizes[i] -= take;
      diff += take;
    }
  }
  return sizes;
}

// Notability-ranked, weekday-split tiers for one era bucket: the top of the
// ranking feeds the early-week weekdays in SMALL slices (recognizable picks),
// the tail piles onto the weekend deep-cut days — each era keeps a Mon→Sun ramp.
function buildWeekdayTiers(pool: Match[], minSize: number): Match[][] {
  // Fixed salted shuffle as a deterministic tie-break, then notability desc.
  const ranked = seededShuffle(pool, ROTATION_SALT.missing11)
    .map((m) => ({ m, n: matchNotability(m) }))
    .sort((a, b) => b.n - a.n)
    .map((x) => x.m);

  const sizes = weekdayTierSizes(ranked.length, minSize);
  const tiers: Match[][] = new Array(7);
  let idx = 0;
  WEEKDAY_BY_PREFERENCE.forEach((wd, i) => {
    tiers[wd] = ranked.slice(idx, idx + sizes[i]);
    idx += sizes[i];
  });
  return tiers;
}

let cachedEraTiers: Record<EraKey, Match[][]> | null = null;

function getEraTiers(): Record<EraKey, Match[][]> {
  if (!cachedEraTiers) {
    const buckets: Record<EraKey, Match[]> = { recent: [], mid: [], classic: [] };
    for (const m of getPlayableMatches()) buckets[eraOf(m)].push(m);
    cachedEraTiers = {
      recent: buildWeekdayTiers(buckets.recent, WEEKDAY_TIER_MIN.recent),
      mid: buildWeekdayTiers(buckets.mid, WEEKDAY_TIER_MIN.mid),
      classic: buildWeekdayTiers(buckets.classic, WEEKDAY_TIER_MIN.classic),
    };
  }
  return cachedEraTiers;
}

/**
 * How many days in [0, d) shared this day's (era, weekday) — i.e. the 0-based
 * position of day d within its era's weekday tier. A day's (era, weekday) pair
 * repeats every CADENCE_CYCLE days, so we sum, over each residue in one cycle
 * that matches, how many multiples of CADENCE_CYCLE have elapsed. O(cycle),
 * closed-form, so the schedule is stable across app restarts.
 */
function eraWeekdayOccurrence(d: number, era: EraKey, weekday: number): number {
  let count = 0;
  for (let rho = 0; rho < CADENCE_CYCLE; rho++) {
    if (ERA_CADENCE[rho % ERA_CADENCE.length] !== era) continue;
    if ((((rho + WEEKDAY_OFFSET) % 7) + 7) % 7 !== weekday) continue;
    const c = Math.ceil((d - rho) / CADENCE_CYCLE); // days ≡ rho (mod cycle) in [0, d)
    if (c > 0) count += c;
  }
  return count;
}

/**
 * Deterministic daily match for an absolute day index. The day's era comes from
 * the fixed cadence (≈75% modern), then within that era's weekday notability
 * tier (iconic early week, deep cuts on the weekend) we rotate by (era, weekday)
 * occurrence — so no match repeats for well beyond the dedup window while every
 * playable match stays in the rotation.
 */
export function getDailyMatch(dayIndex: number): Match {
  const d = Math.trunc(dayIndex);
  const weekday = (((d + WEEKDAY_OFFSET) % 7) + 7) % 7;
  const eraTiers = getEraTiers();

  // Preferred era for the day, then graceful fallback if that bucket has nothing
  // on this weekday (only possible for a degenerate/tiny pool): recent → mid →
  // classic, or classic → mid → recent when a throwback day can't be served.
  const wanted = ERA_CADENCE[((d % ERA_CADENCE.length) + ERA_CADENCE.length) % ERA_CADENCE.length];
  const order: EraKey[] =
    wanted === 'classic' ? ['classic', 'mid', 'recent'] : [wanted, 'recent', 'mid', 'classic'];
  const era = order.find((e) => (eraTiers[e][weekday]?.length ?? 0) > 0);
  if (!era) {
    // Nothing on this weekday in any era: full-pool fallback keeps this total.
    const pool = getPlayableMatches();
    if (pool.length === 0) throw new Error('getDailyMatch: no playable matches');
    return pool[((d % pool.length) + pool.length) % pool.length];
  }

  const tier = eraTiers[era][weekday];
  const occurrence = eraWeekdayOccurrence(d, era, weekday);
  const base = ((occurrence % tier.length) + tier.length) % tier.length;
  // Skill nudge — SOFT ordering only, the tier is never shrunk. Within the
  // weekday tier (notability-desc), +1 skill indexes from the deep-cut end (a
  // bijection per (era, weekday), so no-repeat is preserved). Tier 0 is the exact
  // current index; -1 keeps the iconic-first neutral ordering.
  const i = resolveSkillTier('missing11') === 1 ? tier.length - 1 - base : base;
  return tier[i];
}

// ---------------------------------------------------------------------------
// Missing XI guessing (full-DB autocomplete + auto-placement)
// ---------------------------------------------------------------------------
// The guess autocomplete must be fed the ENTIRE player universe, never just the
// 11 answers — otherwise typing one letter lists the lineup and spoils the game.
// The challenge is recalling who played, so the answers hide in a 12k-player
// haystack. Historic legends in old lineups may be absent from players_db, so we
// append a synthetic entry for any lineup name we can't already type.

const SYNTHETIC_ID_BASE = 9_000_000;

/**
 * Autocomplete candidate pool for a match: the full player DB (incl. retired
 * career-path players) plus a synthetic entry for any lineup name missing from
 * it, so every answer is typeable while staying buried among all players.
 */
export function buildGuessPool(lineupNames: string[]): Player[] {
  const base = getAllPlayersWithCareer();
  const present = new Set(base.map((p) => foldName(p.name)));
  const extras: Player[] = [];
  lineupNames.forEach((name, i) => {
    const folded = foldName(name);
    if (!present.has(folded)) {
      present.add(folded);
      extras.push({
        id: SYNTHETIC_ID_BASE + i,
        name,
        normalized_name: folded,
        nationality: '',
        current_team: '',
        league: '',
        position: '',
        market_value: 0,
        image_url: '',
      });
    }
  });
  return extras.length > 0 ? [...base, ...extras] : base;
}

export interface SlotIndex {
  /** folded lineup name → slot. */
  byName: Map<string, number>;
  /** players_db id → slot, via the lineup-alias identity layer. */
  byId: Map<number, number>;
}

/**
 * Folded-name → slot-index map for a lineup, so a guessed player auto-places
 * into the slot they played (no slot picking, no coin-flip life loss between two
 * same-position players). Lineups are guaranteed 11 distinct names (see
 * isPlayableMatch), so no folded name collides.
 *
 * When `matchId` is given, the alias identity layer also maps players_db ids to
 * slots: "Aguero" on a team sheet has no DB row under that spelling, so picking
 * the DB's "Sergio Aguero" — the SAME human — must count. Ids only ever ADD
 * acceptances; the folded-name path is untouched (typing the team-sheet
 * spelling, or a good-faith namesake pick, still scores).
 */
export function buildSlotIndex(lineupNames: string[], matchId?: string): SlotIndex {
  const byName = new Map<string, number>();
  lineupNames.forEach((name, i) => byName.set(foldName(name), i));
  const byId = new Map<number, number>();
  const aliases = matchId ? lineupAliasesJson[matchId] : undefined;
  if (aliases) {
    lineupNames.forEach((name, i) => {
      for (const id of aliases[foldName(name)] ?? []) byId.set(id, i);
    });
  }
  return { byName, byId };
}

export type GuessOutcome =
  | { kind: 'correct'; slot: number }
  | { kind: 'already'; slot: number }
  | { kind: 'wrong' };

/**
 * Resolve a guessed player against a lineup: fills its slot (correct), is a
 * no-op if that slot is already revealed (already), or costs a life (wrong).
 * A guess is correct if EITHER its folded name matches a lineup name OR the
 * picked player's DB id is alias-mapped to a slot (the same human under a
 * different spelling). Pure so it can be unit-tested without the UI.
 */
export function resolveGuess(
  guess: string | { name: string; id?: number },
  slotIndex: SlotIndex,
  revealed: ReadonlySet<number>,
): GuessOutcome {
  const name = typeof guess === 'string' ? guess : guess.name;
  const id = typeof guess === 'string' ? undefined : guess.id;
  const slot =
    slotIndex.byName.get(foldName(name)) ?? (id !== undefined ? slotIndex.byId.get(id) : undefined);
  if (slot === undefined) return { kind: 'wrong' };
  if (revealed.has(slot)) return { kind: 'already', slot };
  return { kind: 'correct', slot };
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

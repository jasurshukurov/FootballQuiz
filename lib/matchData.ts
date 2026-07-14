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

let cachedPlayable: Match[] | null = null;
export function getPlayableMatches(): Match[] {
  if (!cachedPlayable) {
    const playable = getAllMatches().filter(isPlayableMatch);
    cachedPlayable = playable.length > 0 ? playable : getAllMatches();
  }
  return cachedPlayable;
}

// ---------------------------------------------------------------------------
// Match notability (difficulty axis for the daily rotation)
// ---------------------------------------------------------------------------
// A match's "notability" is how instantly recognizable it is, on the same 0-100
// scale as player fame so it slots straight into the shared weekly difficulty
// bands (difficultyCurve.ts). Two ingredients, blended 55/45:
//   - Competition importance: a World Cup / Champions League final is iconic;
//     a league group-stage game is a deep cut. Matched by keyword on the
//     competition string, most-specific first.
//   - Mean fame of the more-famous XI: a lineup of household names is easier to
//     recall than one of journeymen. We take the higher-fame side so a marquee
//     team carries the match even against weaker opposition.
// Early-week bands select high-notability iconic matches; the weekend summit
// pulls the obscure cup runs and deep league fixtures.

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
  { keyword: 'copa america final', weight: 84 },
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
  { keyword: 'africa cup', weight: 52 },
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

/**
 * Notability weight (0-100) for a match: competition importance blended with the
 * mean fame of its more-famous XI. Higher = more iconic / easier to recall.
 */
export function matchNotability(m: Match): number {
  const comp = competitionWeight(m.competition);
  const teamFame = Math.max(meanLineupFame(m.lineup_a_names), meanLineupFame(m.lineup_b_names));
  return Math.round(comp * 0.55 + teamFame * 0.45);
}

/**
 * Difficulty tier for a match, on the app's shared tier vocabulary (the same
 * one Career Path / Who Are Ya surface via TierBadge): 'legendary' = an iconic
 * final everyone can recall, 'beginner' = a deep cut. Fixed notability
 * thresholds (not percentiles) so a match's badge never shifts when the pool
 * grows, and it matches the fame-band semantics of difficultyCurve.ts.
 */
export function getMatchTier(m: Match): DifficultyTier {
  const n = matchNotability(m);
  if (n >= 85) return 'legendary';
  if (n >= 75) return 'world_class';
  if (n >= 65) return 'professional';
  if (n >= 55) return 'semi_pro';
  if (n >= 45) return 'amateur';
  return 'beginner';
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
  const yearStr = (m.date || '').slice(0, 4);
  const year = /^\d{4}$/.test(yearStr)
    ? parseInt(yearStr, 10)
    : parseInt((String(m.season).match(/\d{4}/) || ['2000'])[0], 10);
  return { label, era: `${Math.floor(year / 10) * 10}s` };
}

// ---------------------------------------------------------------------------
// Daily match schedule (no-repeat backbone + weekly notability cadence)
// ---------------------------------------------------------------------------
// The rotation must never repeat a match within the whole cycle (the QA sim
// flags ANY repeat across a 60-day window as a hard failure). An earlier version
// hard-FILTERED the playable pool by the day's difficulty band, which shrank the
// pool below the window and forced repeats. Instead the band is only a SOFT
// ordering preference: iconic finals land early in the week, deep cuts on the
// weekend — but every playable match stays in the rotation.
//
// Construction: the weekday of an absolute day index is fixed — weekday =
// (dayIndex + WEEKDAY_OFFSET) mod 7. We split the notability-ranked pool into 7
// contiguous tiers (top slice → the most-iconic weekdays, bottom → Saturday's
// deep cuts) and, for a given day, index into its weekday's tier by how many
// times that weekday has occurred (dayIndex / 7). Two days collide only if they
// share a weekday AND land on the same tier slot; within any window shorter than
// 7 × tierSize (~224 days) the per-weekday occurrence counter can't wrap, so
// there are ZERO repeats. Unlike a static full-pool permutation, the weekday↔
// tier alignment is exact for every cycle (no drift).

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

// tierByWeekday[w] = the notability slice served on weekday w.
let cachedTiers: Match[][] | null = null;

function buildWeekdayTiers(): Match[][] {
  const pool = getPlayableMatches();
  const L = pool.length;
  // Notability-ranked (desc), fixed salted shuffle as a deterministic tie-break.
  const ranked = seededShuffle(pool, ROTATION_SALT.missing11)
    .map((m) => ({ m, n: matchNotability(m) }))
    .sort((a, b) => b.n - a.n)
    .map((x) => x.m);

  const base = Math.floor(L / 7);
  const extra = L % 7; // the first `extra` (most-iconic) weekdays get one more
  const tiers: Match[][] = new Array(7);
  let idx = 0;
  WEEKDAY_BY_PREFERENCE.forEach((wd, i) => {
    const size = base + (i < extra ? 1 : 0);
    tiers[wd] = ranked.slice(idx, idx + size);
    idx += size;
  });
  return tiers;
}

/**
 * Deterministic daily match for an absolute day index. Serves the day's weekday
 * notability tier (iconic early week, deep cuts on the weekend) and rotates
 * within that tier by weekday occurrence, so no match repeats for well beyond
 * the dedup window while every playable match stays in the pool.
 */
export function getDailyMatch(dayIndex: number): Match {
  if (!cachedTiers) cachedTiers = buildWeekdayTiers();
  const d = Math.trunc(dayIndex);
  const weekday = (((d + WEEKDAY_OFFSET) % 7) + 7) % 7;
  const tier = cachedTiers[weekday];
  if (!tier || tier.length === 0) {
    // Degenerate pool (fewer than 7 matches): fall back to the full rotation.
    const pool = getPlayableMatches();
    if (pool.length === 0) throw new Error('getDailyMatch: no playable matches');
    return pool[((d % pool.length) + pool.length) % pool.length];
  }
  const occurrence = Math.floor(d / 7); // stable per weekday (d shares d mod 7)
  const base = ((occurrence % tier.length) + tier.length) % tier.length;
  // Skill nudge — SOFT ordering only, the pool is never shrunk. Within the
  // weekday's tier (notability-desc), +1 skill indexes from the deep-cut end
  // (a bijection per weekday, so the no-repeat guarantee is preserved: two
  // days still collide only on same weekday + same occurrence slot). Tier 0 is
  // the exact current index; -1 keeps the iconic-first neutral ordering, which
  // is already the easiest ordering that stays repeat-free.
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

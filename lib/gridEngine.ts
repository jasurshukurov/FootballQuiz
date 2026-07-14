import { Player } from '@/types/player';
import { CareerPlayer } from '@/types/career';
import { getAllPlayers, getFameForPlayer, isActivePlayer } from '@/lib/playerData';
import { getAllTransferHistories } from '@/lib/transferData';
import { createSeededRandom, seededShuffle, getModeSeed } from '@/lib/dailySeed';
import {
  bandForDate,
  FameBand,
  resolveSkillTier,
  skillAdjustedBand,
  SkillTier,
} from '@/lib/difficultyCurve';

const careerJson = require('@/data/career_paths.json') as CareerPlayer[];

// ---------------------------------------------------------------------------
// The Grid engine — mixed-axis 3x3 grid construction.
//
// Replaces the legacy fixed-pool generator (lib/gridGenerator.ts, kept only for
// the QA simulator): instead of "3 teams x 3 positions" style single-kind axes,
// every grid mixes header KINDS — clubs (career-based "played for"), countries,
// leagues, positions and market-value bars — on BOTH sides, with club x club
// crossings ("played for both") when the data supports them.
//
// Honesty contract (mirrors lib/connectionsGenerator.ts):
//  - club membership = recorded stint in career_paths/transfers OR currently at
//    the club. Never inferred.
//  - league membership = team-majority league of the CURRENT club (individual
//    `league` strings go stale when a player leaves the big five; a club only
//    maps to a league when >= 5 of its players agree >= 90%). A player at an
//    unmapped club matches no league — over-exclusion is the safe direction.
//  - nationality / position / market_value are exact DB fields.
// ---------------------------------------------------------------------------

export type GridCategoryKind = 'club' | 'nationality' | 'league' | 'position' | 'value';

export interface GridCategory {
  kind: GridCategoryKind;
  /** Stable identity, e.g. "club:arsenal". */
  key: string;
  /** Compact header label for ~110pt mobile header cells. */
  label: string;
  /** Micro kicker above the label ("PLAYED FOR", "NATION", ...). */
  kicker: string;
  /** Sentence fragment for the search sheet ("played for Arsenal"). */
  clause: string;
  /** players_db current_team string for TeamCrest (club kind only). */
  crestTeam?: string;
  /** Emoji flag (nationality kind only). */
  flag?: string;
  /** Fair-marking predicate over ANY players_db player. */
  matches: (p: Player) => boolean;
}

export interface GridCellData {
  row: number;
  col: number;
  /** Active players satisfying both headers, most famous first. */
  eligiblePlayers: Player[];
  /** How many of those clear the "normal humans know them" fame bar. */
  famousCount: number;
  /** Does this player satisfy BOTH headers? (full-DB, not just active). */
  matches: (p: Player) => boolean;
}

export interface DailyGrid {
  /** Deterministic identity: date|tier|header keys. Changes if the engine's
   *  output for the day changes, so stale persisted boards self-invalidate. */
  id: string;
  dateStr: string;
  rows: [GridCategory, GridCategory, GridCategory];
  cols: [GridCategory, GridCategory, GridCategory];
  cells: GridCellData[][];
  /** Distinct header kinds in this grid (mixing rule metadata / tests). */
  kinds: GridCategoryKind[];
}

// ---------------------------------------------------------------------------
// Tuning constants (measured against the July-2026 DB snapshot)
// ---------------------------------------------------------------------------

/** Fame bar for "a normal human can think of this player". */
export const GRID_FAMOUS_FAME = 60;

/**
 * A cell is valid when it has broad coverage (>= 6 eligible, >= 2 famous) OR is
 * a dense-famous crossing (>= 4 eligible of which >= 3 famous) — the classic
 * "played for both Chelsea and Real Madrid" cells live in the second clause
 * (history data covers ~600 famous careers, so club x club pools are small but
 * almost entirely famous).
 */
interface CellFloor {
  minEligible: number;
  minFamous: number;
  denseEligible: number;
  denseFamous: number;
}

const CELL_FLOORS: CellFloor[] = [
  { minEligible: 6, minFamous: 2, denseEligible: 4, denseFamous: 3 }, // L0 target
  { minEligible: 4, minFamous: 2, denseEligible: 4, denseFamous: 2 }, // L1
  { minEligible: 3, minFamous: 1, denseEligible: 3, denseFamous: 1 }, // L2 hard floor
];

/** The floor every shipped cell is guaranteed to clear (tests assert this). */
export const GRID_MIN_ELIGIBLE = 3;
export const GRID_MIN_FAMOUS = 1;

/** Salted fill attempts per template per relax level. */
const TRIES_PER_TEMPLATE = 16;

// ---------------------------------------------------------------------------
// Curated club table (same club-string knowledge as connectionsGenerator's
// PLAYED_FOR_CLUBS; duplicated by design — that module is read-only and its
// table is private). historyNames match career_paths/transfers club strings;
// dbTeams are players_db current_team strings.
// ---------------------------------------------------------------------------

interface GridClub {
  key: string;
  label: string;
  historyNames: string[];
  dbTeams: string[];
}

const GRID_CLUBS: GridClub[] = [
  {
    key: 'arsenal',
    label: 'Arsenal',
    historyNames: ['Arsenal'],
    dbTeams: ['Arsenal Football Club'],
  },
  {
    key: 'chelsea',
    label: 'Chelsea',
    historyNames: ['Chelsea'],
    dbTeams: ['Chelsea Football Club', 'Chelsea'],
  },
  {
    key: 'liverpool',
    label: 'Liverpool',
    historyNames: ['Liverpool'],
    dbTeams: ['Liverpool Football Club'],
  },
  {
    key: 'man-united',
    label: 'Man United',
    historyNames: ['Manchester United'],
    dbTeams: ['Manchester United Football Club', 'Manchester United'],
  },
  {
    key: 'man-city',
    label: 'Man City',
    historyNames: ['Manchester City'],
    dbTeams: ['Manchester City Football Club'],
  },
  {
    key: 'tottenham',
    label: 'Tottenham',
    historyNames: ['Tottenham Hotspur', 'Tottenham'],
    dbTeams: ['Tottenham Hotspur Football Club'],
  },
  {
    key: 'newcastle',
    label: 'Newcastle',
    historyNames: ['Newcastle United'],
    dbTeams: ['Newcastle United Football Club', 'Newcastle United'],
  },
  {
    key: 'west-ham',
    label: 'West Ham',
    historyNames: ['West Ham United', 'West Ham'],
    dbTeams: ['West Ham United Football Club'],
  },
  {
    key: 'aston-villa',
    label: 'Aston Villa',
    historyNames: ['Aston Villa'],
    dbTeams: ['Aston Villa Football Club'],
  },
  {
    key: 'everton',
    label: 'Everton',
    historyNames: ['Everton'],
    dbTeams: ['Everton Football Club', 'Everton'],
  },
  {
    key: 'barcelona',
    label: 'Barcelona',
    historyNames: ['FC Barcelona', 'Barcelona'],
    dbTeams: ['Futbol Club Barcelona'],
  },
  {
    key: 'real-madrid',
    label: 'Real Madrid',
    historyNames: ['Real Madrid'],
    dbTeams: ['Real Madrid Club de Fútbol', 'Real Madrid'],
  },
  {
    key: 'atletico',
    label: 'Atlético',
    historyNames: ['Atletico Madrid', 'Atletico de Madrid'],
    dbTeams: ['Club Atlético de Madrid S.A.D.'],
  },
  {
    key: 'sevilla',
    label: 'Sevilla',
    historyNames: ['Sevilla'],
    dbTeams: ['Sevilla Fútbol Club S.A.D.', 'Sevilla Fútbol Club', 'Sevilla'],
  },
  {
    key: 'valencia',
    label: 'Valencia',
    historyNames: ['Valencia'],
    dbTeams: ['Valencia Club de Fútbol S. A. D.', 'Valencia Club de Fútbol', 'Valencia'],
  },
  {
    key: 'bayern',
    label: 'Bayern',
    historyNames: ['Bayern Munich', 'FC Bayern Munich', 'Bayern München'],
    dbTeams: ['FC Bayern München', 'Bayern Munich'],
  },
  {
    key: 'dortmund',
    label: 'Dortmund',
    historyNames: ['Borussia Dortmund'],
    dbTeams: ['Borussia Dortmund'],
  },
  {
    key: 'leverkusen',
    label: 'Leverkusen',
    historyNames: ['Bayer Leverkusen'],
    dbTeams: [
      'Bayer 04 Leverkusen Fußball GmbH',
      'Bayer 04 Leverkusen Fußball',
      'Bayer Leverkusen',
    ],
  },
  {
    key: 'leipzig',
    label: 'RB Leipzig',
    historyNames: ['RB Leipzig'],
    dbTeams: ['RasenBallsport Leipzig GmbH', 'RasenBallsport Leipzig', 'RB Leipzig'],
  },
  {
    key: 'juventus',
    label: 'Juventus',
    historyNames: ['Juventus'],
    dbTeams: ['Juventus Football Club'],
  },
  {
    key: 'ac-milan',
    label: 'AC Milan',
    historyNames: ['AC Milan'],
    dbTeams: ['Associazione Calcio Milan'],
  },
  {
    key: 'inter',
    label: 'Inter',
    historyNames: ['Inter Milan', 'Internazionale'],
    dbTeams: ['Football Club Internazionale Milano S.p.A.'],
  },
  {
    key: 'roma',
    label: 'Roma',
    historyNames: ['AS Roma', 'Roma'],
    dbTeams: ['Associazione Sportiva Roma'],
  },
  {
    key: 'napoli',
    label: 'Napoli',
    historyNames: ['SSC Napoli', 'Napoli'],
    dbTeams: ['Società Sportiva Calcio Napoli'],
  },
  {
    key: 'lazio',
    label: 'Lazio',
    historyNames: ['SS Lazio', 'Lazio'],
    dbTeams: ['Società Sportiva Lazio S.p.A.'],
  },
  {
    key: 'fiorentina',
    label: 'Fiorentina',
    historyNames: ['Fiorentina'],
    dbTeams: ['Associazione Calcio Fiorentina', 'ACF Fiorentina', 'Fiorentina'],
  },
  {
    key: 'atalanta',
    label: 'Atalanta',
    historyNames: ['Atalanta'],
    dbTeams: ['Atalanta Bergamasca Calcio S.p.a.', 'Atalanta'],
  },
  {
    key: 'psg',
    label: 'PSG',
    historyNames: ['Paris Saint-Germain', 'PSG'],
    dbTeams: ['Paris Saint-Germain Football Club'],
  },
  {
    key: 'marseille',
    label: 'Marseille',
    historyNames: ['Olympique Marseille', 'Marseille'],
    dbTeams: ['Olympique de Marseille', 'Marseille'],
  },
  {
    key: 'monaco',
    label: 'Monaco',
    historyNames: ['AS Monaco', 'Monaco'],
    dbTeams: ['Association sportive de Monaco Football Club'],
  },
  {
    key: 'lyon',
    label: 'Lyon',
    historyNames: ['Olympique Lyon', 'Lyon'],
    dbTeams: ['Olympique Lyonnais'],
  },
  {
    key: 'lille',
    label: 'Lille',
    historyNames: ['Lille'],
    dbTeams: ['Lille Olympique Sporting Club', 'LOSC Lille Association'],
  },
  {
    key: 'benfica',
    label: 'Benfica',
    historyNames: ['Benfica', 'SL Benfica'],
    dbTeams: ['Benfica'],
  },
  { key: 'porto', label: 'Porto', historyNames: ['Porto', 'FC Porto'], dbTeams: ['FC Porto'] },
];

// ---------------------------------------------------------------------------
// Nations / leagues / positions / values
// ---------------------------------------------------------------------------

/** Emoji flags for header chips — language, not facts. Missing = text-only. */
const NATION_FLAGS: Record<string, string> = {
  England: '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  Scotland: '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  Wales: '🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
  Spain: '🇪🇸',
  Italy: '🇮🇹',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Brazil: '🇧🇷',
  Argentina: '🇦🇷',
  Portugal: '🇵🇹',
  Netherlands: '🇳🇱',
  Belgium: '🇧🇪',
  Croatia: '🇭🇷',
  Uruguay: '🇺🇾',
  Colombia: '🇨🇴',
  Senegal: '🇸🇳',
  Morocco: '🇲🇦',
  Denmark: '🇩🇰',
  Serbia: '🇷🇸',
  Switzerland: '🇨🇭',
  Poland: '🇵🇱',
  Austria: '🇦🇹',
  Nigeria: '🇳🇬',
  Ghana: '🇬🇭',
  Japan: '🇯🇵',
  'South Korea': '🇰🇷',
  Norway: '🇳🇴',
  Sweden: '🇸🇪',
  Ireland: '🇮🇪',
  "Cote d'Ivoire": '🇨🇮',
  Cameroon: '🇨🇲',
  Ecuador: '🇪🇨',
  Mexico: '🇲🇽',
  Turkey: '🇹🇷',
  Ukraine: '🇺🇦',
  'Czech Republic': '🇨🇿',
  Greece: '🇬🇷',
  Algeria: '🇩🇿',
  Mali: '🇲🇱',
  Egypt: '🇪🇬',
  USA: '🇺🇸',
  'United States': '🇺🇸',
};

/** A nation needs this much active depth to be a header candidate. */
const MIN_NATION_ELIGIBLE = 40;
const MIN_NATION_FAMOUS = 8;

const BIG_LEAGUES = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'];
const LEAGUE_SHORT: Record<string, string> = {
  'Premier League': 'Premier Lge',
  'La Liga': 'La Liga',
  'Serie A': 'Serie A',
  Bundesliga: 'Bundesliga',
  'Ligue 1': 'Ligue 1',
};

const POSITIONS: { db: string; label: string; clause: string }[] = [
  { db: 'Goalkeeper', label: 'Goalkeeper', clause: 'a goalkeeper' },
  { db: 'Defender', label: 'Defender', clause: 'a defender' },
  { db: 'Midfield', label: 'Midfielder', clause: 'a midfielder' },
  { db: 'Attack', label: 'Forward', clause: 'a forward' },
];

/** Market-value bars (in €m). Only ONE value header per grid (they nest). */
const VALUE_THRESHOLDS_M = [25, 40, 60];

// ---------------------------------------------------------------------------
// Data indices (lazy, module-cached — pure functions of the static DB)
// ---------------------------------------------------------------------------

function normName(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Team-majority league (same guard as connectionsGenerator — stale individual
 *  `league` strings never grant membership). */
let teamLeagueCache: Map<string, string> | null = null;
function getTeamLeague(team: string): string | undefined {
  if (!teamLeagueCache) {
    teamLeagueCache = new Map();
    const byTeam = new Map<string, string[]>();
    for (const p of getAllPlayers()) {
      if (!p.current_team || !p.league) continue;
      if (!byTeam.has(p.current_team)) byTeam.set(p.current_team, []);
      byTeam.get(p.current_team)!.push(p.league);
    }
    for (const [t, leagues] of byTeam) {
      if (leagues.length < 5) continue;
      const counts = new Map<string, number>();
      for (const l of leagues) counts.set(l, (counts.get(l) ?? 0) + 1);
      const [top, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (n / leagues.length >= 0.9) teamLeagueCache.set(t, top);
    }
  }
  return teamLeagueCache.get(team);
}

/** clubKey -> normalized player names with a recorded stint (careers + transfers). */
let stintCache: Map<string, Set<string>> | null = null;
function getStintIndex(): Map<string, Set<string>> {
  if (!stintCache) {
    stintCache = new Map();
    const byHistoryName = new Map<string, GridClub>();
    for (const club of GRID_CLUBS) {
      stintCache.set(club.key, new Set());
      for (const h of club.historyNames) byHistoryName.set(normName(h), club);
    }
    for (const cp of careerJson) {
      const player = cp.normalized_name || normName(cp.name);
      for (const stint of cp.career ?? []) {
        const club = byHistoryName.get(normName(stint.club));
        if (club) stintCache.get(club.key)!.add(player);
      }
    }
    for (const th of getAllTransferHistories()) {
      const player = normName(th.player_name);
      for (const t of th.transfers) {
        const club = byHistoryName.get(normName(t.club_name));
        if (club) stintCache.get(club.key)!.add(player);
      }
    }
  }
  return stintCache;
}

interface Candidate {
  cat: GridCategory;
  /** Active eligible player ids. */
  ids: Set<number>;
  /** Subset of `ids` clearing the famous fame bar. */
  famousIds: Set<number>;
  famousCount: number;
  /** Ranking signal for the difficulty windows (more famous first). */
  famePower: number;
}

interface CandidateLibrary {
  /** Fame-ordered (most famous club first) for band windowing. */
  clubs: Candidate[];
  nations: Candidate[];
  leagues: Candidate[];
  positions: Candidate[];
  values: Candidate[];
  byKey: Map<string, Candidate>;
}

// One id->fame map instead of ~700k getFameById object allocations while the
// candidate library is built (60 categories x 12k active players).
let fameCache: Map<number, number> | null = null;
function fameOf(p: { id: number }): number {
  if (!fameCache) {
    fameCache = new Map();
    for (const pl of getAllPlayers()) {
      fameCache.set(pl.id, getFameForPlayer(pl)?.fame_score ?? 0);
    }
  }
  return fameCache.get(p.id) ?? 0;
}

let libraryCache: CandidateLibrary | null = null;
function getLibrary(): CandidateLibrary {
  if (libraryCache) return libraryCache;

  const activePool = getAllPlayers().filter(isActivePlayer);
  const stints = getStintIndex();

  const makeCandidate = (cat: GridCategory): Candidate => {
    const ids = new Set<number>();
    const famousIds = new Set<number>();
    let famePower = 0;
    for (const p of activePool) {
      if (!cat.matches(p)) continue;
      ids.add(p.id);
      const f = fameOf(p);
      if (f >= GRID_FAMOUS_FAME) {
        famousIds.add(p.id);
        famePower += f;
      }
    }
    return { cat, ids, famousIds, famousCount: famousIds.size, famePower };
  };

  // --- clubs ("played for X": recorded stint OR currently at the club) ---
  const clubs: Candidate[] = [];
  for (const club of GRID_CLUBS) {
    const names = stints.get(club.key)!;
    const cand = makeCandidate({
      kind: 'club',
      key: `club:${club.key}`,
      label: club.label,
      kicker: 'PLAYED FOR',
      clause: `played for ${club.label}`,
      crestTeam: club.dbTeams[0],
      matches: (p) =>
        club.dbTeams.includes(p.current_team) || names.has(p.normalized_name || normName(p.name)),
    });
    // A club header must be broadly answerable on its own.
    if (cand.ids.size >= 12 && cand.famousCount >= 4) clubs.push(cand);
  }
  clubs.sort((a, b) => b.famePower - a.famePower);

  // --- nations (dynamic: any nation with real depth) ---
  const natCounts = new Map<string, number>();
  for (const p of activePool) {
    if (!p.nationality || p.nationality === 'null') continue;
    natCounts.set(p.nationality, (natCounts.get(p.nationality) ?? 0) + 1);
  }
  const nations: Candidate[] = [];
  for (const [nat, count] of natCounts) {
    if (count < MIN_NATION_ELIGIBLE) continue;
    const cand = makeCandidate({
      kind: 'nationality',
      key: `nat:${nat}`,
      label: nat,
      kicker: 'NATION',
      clause: `from ${nat}`,
      flag: NATION_FLAGS[nat],
      matches: (p) => p.nationality === nat,
    });
    if (cand.famousCount >= MIN_NATION_FAMOUS) nations.push(cand);
  }
  nations.sort((a, b) => b.famePower - a.famePower);

  // --- leagues (current league via team-majority) ---
  const leagues: Candidate[] = BIG_LEAGUES.map((lg) =>
    makeCandidate({
      kind: 'league',
      key: `league:${lg}`,
      label: LEAGUE_SHORT[lg] ?? lg,
      kicker: 'PLAYS IN',
      clause: `currently in the ${lg}`,
      matches: (p) => getTeamLeague(p.current_team) === lg,
    }),
  );
  leagues.sort((a, b) => b.famePower - a.famePower);

  // --- positions ---
  const positions: Candidate[] = POSITIONS.map((pos) =>
    makeCandidate({
      kind: 'position',
      key: `pos:${pos.db}`,
      label: pos.label,
      kicker: 'POSITION',
      clause: pos.clause,
      matches: (p) => p.position === pos.db,
    }),
  );

  // --- market value bars ---
  const values: Candidate[] = VALUE_THRESHOLDS_M.map((m) =>
    makeCandidate({
      kind: 'value',
      key: `value:${m}`,
      label: `€${m}m+`,
      kicker: 'VALUED',
      clause: `valued at €${m}m or more`,
      matches: (p) => p.market_value >= m * 1_000_000,
    }),
  );

  const byKey = new Map<string, Candidate>();
  for (const c of [...clubs, ...nations, ...leagues, ...positions, ...values]) {
    byKey.set(c.cat.key, c);
  }

  libraryCache = { clubs, nations, leagues, positions, values, byKey };
  return libraryCache;
}

/** TEST/QA: the full category library (all kinds, fame-ordered). */
export function getGridCategoryLibrary(): GridCategory[] {
  const lib = getLibrary();
  return [...lib.byKey.values()].map((c) => c.cat);
}

// ---------------------------------------------------------------------------
// Difficulty windows — the fame band shifts WHICH clubs/nations are drawn:
// famous clubs at easy, deeper cuts at hard. Positions/leagues/values are
// difficulty-neutral (there are only a handful of each).
// ---------------------------------------------------------------------------

function bandDepth(band: FameBand): number {
  // Monday easy band.min = 85 -> ~0.07 depth; Saturday expert 58 -> ~0.67;
  // skillAdjustedBand shifts min by ∓6 (≈ ∓0.13 depth).
  return Math.max(0, Math.min(1, (88 - band.min) / 45));
}

function windowSlice<T>(list: T[], band: FameBand, baseSize: number): T[] {
  if (band.label === 'wildcard') return list; // Sunday: anything goes
  const depth = bandDepth(band);
  const start = Math.min(Math.round(depth * 8), Math.max(0, list.length - baseSize));
  const size = baseSize + Math.round(depth * baseSize);
  return list.slice(start, start + size);
}

// ---------------------------------------------------------------------------
// Templates — axis kind mixes. Invariants baked into the set:
//  - >= 3 distinct kinds per grid, <= 4 club headers, <= 1 value header
//  - nationality/league/position/value appear on ONE axis only (they'd
//    intersect to an empty cell against themselves on the other axis)
//  - club may sit on both axes: club x club = "played for both".
// ---------------------------------------------------------------------------

type Template = { rows: GridCategoryKind[]; cols: GridCategoryKind[] };

const TEMPLATES: Template[] = [
  { rows: ['club', 'club', 'club'], cols: ['nationality', 'nationality', 'position'] },
  { rows: ['club', 'club', 'club'], cols: ['nationality', 'position', 'value'] },
  { rows: ['club', 'club', 'club'], cols: ['nationality', 'nationality', 'value'] },
  { rows: ['club', 'club', 'nationality'], cols: ['club', 'position', 'value'] },
  { rows: ['club', 'club', 'nationality'], cols: ['club', 'club', 'position'] },
  { rows: ['club', 'club', 'position'], cols: ['nationality', 'nationality', 'value'] },
  { rows: ['club', 'club', 'league'], cols: ['nationality', 'position', 'value'] },
  { rows: ['club', 'nationality', 'league'], cols: ['club', 'position', 'value'] },
  { rows: ['nationality', 'nationality', 'league'], cols: ['club', 'club', 'position'] },
  { rows: ['league', 'league', 'league'], cols: ['nationality', 'position', 'value'] },
  { rows: ['club', 'club', 'value'], cols: ['nationality', 'nationality', 'position'] },
  { rows: ['club', 'position', 'value'], cols: ['club', 'club', 'nationality'] },
];

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

interface CellStat {
  eligible: number;
  famous: number;
}

function intersectStat(a: Candidate, b: Candidate): CellStat {
  const [small, large] = a.ids.size <= b.ids.size ? [a, b] : [b, a];
  let eligible = 0;
  for (const id of small.ids) if (large.ids.has(id)) eligible++;
  const [smallF, largeF] = a.famousIds.size <= b.famousIds.size ? [a, b] : [b, a];
  let famous = 0;
  for (const id of smallF.famousIds) if (largeF.famousIds.has(id)) famous++;
  return { eligible, famous };
}

function cellOk(stat: CellStat, floor: CellFloor): boolean {
  return (
    (stat.eligible >= floor.minEligible && stat.famous >= floor.minFamous) ||
    (stat.eligible >= floor.denseEligible && stat.famous >= floor.denseFamous)
  );
}

/** Neither header's eligible set may contain the other's (degenerate cell). */
function isSubsetPair(a: Candidate, b: Candidate): boolean {
  const [small, large] = a.ids.size <= b.ids.size ? [a, b] : [b, a];
  for (const id of small.ids) if (!large.ids.has(id)) return false;
  return true;
}

interface PoolSet {
  club: Candidate[];
  nationality: Candidate[];
  league: Candidate[];
  position: Candidate[];
  value: Candidate[];
}

function buildPools(band: FameBand): PoolSet {
  const lib = getLibrary();
  return {
    club: windowSlice(lib.clubs, band, 14),
    nationality: windowSlice(lib.nations, band, 8),
    league: lib.leagues,
    position: lib.positions,
    value: lib.values,
  };
}

/**
 * One salted fill attempt for a template: place rows first (independent), then
 * each column must clear the cell floor against all three rows.
 */
function attemptFill(
  tpl: Template,
  pools: PoolSet,
  rand: () => number,
  floor: CellFloor,
): { rows: Candidate[]; cols: Candidate[] } | null {
  const used = new Set<string>();
  const shuffled: Record<GridCategoryKind, Candidate[]> = {
    club: seededShuffle(pools.club, rand),
    nationality: seededShuffle(pools.nationality, rand),
    league: seededShuffle(pools.league, rand),
    position: seededShuffle(pools.position, rand),
    value: seededShuffle(pools.value, rand),
  };
  const cursor: Record<string, number> = {};

  const takeRow = (kind: GridCategoryKind): Candidate | null => {
    const list = shuffled[kind];
    let i = cursor[kind] ?? 0;
    while (i < list.length && used.has(list[i].cat.key)) i++;
    cursor[kind] = i + 1;
    if (i >= list.length) return null;
    used.add(list[i].cat.key);
    return list[i];
  };

  const rows: Candidate[] = [];
  for (const kind of tpl.rows) {
    const c = takeRow(kind);
    if (!c) return null;
    rows.push(c);
  }

  const cols: Candidate[] = [];
  for (const kind of tpl.cols) {
    const list = shuffled[kind];
    let placed: Candidate | null = null;
    for (const cand of list) {
      if (used.has(cand.cat.key)) continue;
      let ok = true;
      for (const row of rows) {
        if (isSubsetPair(row, cand) || !cellOk(intersectStat(row, cand), floor)) {
          ok = false;
          break;
        }
      }
      if (ok) {
        placed = cand;
        break;
      }
    }
    if (!placed) return null;
    used.add(placed.cat.key);
    cols.push(placed);
  }

  return { rows, cols };
}

function buildGrid(
  rows: Candidate[],
  cols: Candidate[],
  dateStr: string,
  tier: SkillTier,
): DailyGrid {
  const active = getAllPlayers().filter(isActivePlayer);
  const cells: GridCellData[][] = [];
  for (let r = 0; r < 3; r++) {
    const rowCells: GridCellData[] = [];
    for (let c = 0; c < 3; c++) {
      const rowCat = rows[r].cat;
      const colCat = cols[c].cat;
      const matches = (p: Player) => rowCat.matches(p) && colCat.matches(p);
      const eligiblePlayers = active
        .filter((p) => rows[r].ids.has(p.id) && cols[c].ids.has(p.id))
        .sort((a, b) => fameOf(b) - fameOf(a));
      rowCells.push({
        row: r,
        col: c,
        eligiblePlayers,
        famousCount: eligiblePlayers.filter((p) => fameOf(p) >= GRID_FAMOUS_FAME).length,
        matches,
      });
    }
    cells.push(rowCells);
  }
  const keys = [...rows, ...cols].map((c) => c.cat.key);
  const kinds = [...new Set([...rows, ...cols].map((c) => c.cat.kind))];
  return {
    id: `${dateStr}|${tier}|${keys.join(',')}`,
    dateStr,
    rows: [rows[0].cat, rows[1].cat, rows[2].cat],
    cols: [cols[0].cat, cols[1].cat, cols[2].cat],
    cells,
    kinds,
  };
}

/**
 * Deterministic grid for a seed + date: the date's fame band (skill-adjusted)
 * picks the club/nation depth window, the seed drives template + header draws.
 * Never returns null: relax ladder L0 -> L2, then an unconditional best-effort
 * fill so the screen can't strand on a skeleton.
 */
export function generateGridFromSeed(
  seed: number,
  dateStr: string,
  tier: SkillTier = 0,
): DailyGrid {
  const band = skillAdjustedBand(bandForDate(dateStr), tier);
  const pools = buildPools(band);
  const rand = createSeededRandom(seed);
  const templates = seededShuffle(TEMPLATES, rand);

  for (const floor of CELL_FLOORS) {
    for (const tpl of templates) {
      for (let t = 0; t < TRIES_PER_TEMPLATE; t++) {
        const filled = attemptFill(tpl, pools, rand, floor);
        if (filled) return buildGrid(filled.rows, filled.cols, dateStr, tier);
      }
    }
  }

  // Unreachable in practice (L2 on big clubs x big nations always fills —
  // sweep-tested); absolute fallback keeps the contract non-null.
  const lib = getLibrary();
  const rows = lib.clubs.slice(0, 3);
  const cols = [lib.nations[0], lib.nations[1], lib.positions[0]];
  return buildGrid(rows, cols, dateStr, tier);
}

/**
 * THE daily grid: seeded from the shared daily seed, banded by the weekly
 * difficulty curve + the player's grid skill tier. Same date + tier => same
 * grid for everyone. Practice/archive callers pass tier 0 so past days are
 * identical for all users (existing practice convention).
 */
export function generateDailyGrid(
  dateStr: string,
  tier: SkillTier = resolveSkillTier('grid'),
): DailyGrid {
  return generateGridFromSeed(getModeSeed('grid', dateStr), dateStr, tier);
}

// ---------------------------------------------------------------------------
// Hints — the most famous eligible player not already used on the board.
// ---------------------------------------------------------------------------

export function hintForCell(cell: GridCellData, usedIds: ReadonlySet<number>): Player | null {
  return cell.eligiblePlayers.find((p) => !usedIds.has(p.id)) ?? null;
}

// ---------------------------------------------------------------------------
// Rarity scoring (unchanged mechanic, moved from the legacy generator):
// a correct pick of an obscure player is a "deep cut" worth bonus points.
// ---------------------------------------------------------------------------

export interface PickScore {
  /** Points for filling the square at all. */
  base: number;
  /** Extra points for picking an obscure player (0 for household names). */
  rarityBonus: number;
  /** base + rarityBonus. */
  total: number;
  /** True when the pick is obscure enough to earn a "DEEP CUT" chip. */
  deepCut: boolean;
}

/** Every correct square is worth this before rarity bonuses. */
export const GRID_BASE_POINTS = 10;

/**
 * Score a single correct pick from the answer's fame (0-100), undefined = obscure.
 * Deep cut below fame 60; the bonus escalates the more obscure the pick is.
 */
export function scoreCorrectPick(fame: number | undefined): PickScore {
  const f = fame ?? 0;
  let rarityBonus = 0;
  if (f < 30) rarityBonus = 30;
  else if (f < 45) rarityBonus = 20;
  else if (f < 60) rarityBonus = 10;
  const deepCut = f < GRID_FAMOUS_FAME;
  return { base: GRID_BASE_POINTS, rarityBonus, total: GRID_BASE_POINTS + rarityBonus, deepCut };
}

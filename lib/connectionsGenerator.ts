import { Player } from '@/types/player';
import { CareerPlayer } from '@/types/career';
import { getAllPlayers, isActivePlayer, getFameForPlayer } from '@/lib/playerData';
import { getAllTransferHistories } from '@/lib/transferData';
import { shortenClubName } from '@/lib/clubNames';
import {
  createSeededRandom,
  seededShuffle,
  getModeSeed,
  getTodayDateString,
} from '@/lib/dailySeed';
import {
  bandForDate,
  bandFameOffset,
  filterByFameBand,
  FameBand,
  resolveSkillTier,
  skillAdjustedBand,
  SkillTier,
} from '@/lib/difficultyCurve';
import { getRank } from '@/lib/rankLadder';

const careerJson = require('@/data/career_paths.json') as CareerPlayer[];

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

/**
 * Category archetype kinds. Every kind is 100% data-derivable from
 * players_db / career_paths / transfers — no fabricated facts.
 */
export type ConnectionsArchetypeKind =
  | 'club' // current-club teammates (current_team)
  | 'nationality' // nationality
  | 'position' // position across all clubs/leagues
  | 'league' // league membership (via team-majority league, see below)
  | 'nat_pos' // nationality + position ("Brazilian defenders")
  | 'league_pos' // league + position ("Premier League goalkeepers")
  | 'value' // market_value >= threshold ("Valued at €80m+")
  | 'played_for' // career/transfer history at a club, NOT currently there
  | 'first_letter'; // display-name first letter (verifiable on the tiles)

// DATA BLOCKER — birth-year/age archetypes ("Born in the 1980s", "Under-21",
// "Born in 1998") were designed and dropped: data/player_ages.json is
// systemically corrupted (namesake DOBs — e.g. Rashford "1978", Alisson
// "2005"; only 326/1344 of the active fame>=55 pool cross-validate against
// career/transfer timelines). Re-add the kinds once the ages ETL re-fetches
// with id-verified joins; membership must never assert unverifiable facts.

export interface ConnectionsCategory {
  name: string;
  playerNames: string[];
  /**
   * NYT difficulty ladder index, 0 (easiest) .. 3 (hardest), assigned after
   * ordering by archetype hardness then mean member fame. This is the SEMANTIC
   * group key — rendering maps it to the theme-aware yellow/green/blue/purple
   * group colors (see `connectionsGroupColor` in
   * components/games/ConnectionsTile.tsx). The generator stays color-free.
   */
  difficulty: number;
  /** Archetype kind that produced this category (engine metadata / tests). */
  kind?: ConnectionsArchetypeKind;
  /** Stable category identity (kind + value) — the no-repeat window key. */
  identity?: string;
  /** players_db ids of the four members, aligned with playerNames. */
  playerIds?: number[];
}

export interface ConnectionsPuzzle {
  categories: ConnectionsCategory[];
  shuffledNames: string[];
}

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/** Minimum band-filtered pool size before we accept it can seed 4 groups. */
const MIN_BAND_POOL = 120;
/** A spec needs this many in-pool members to be eligible (4 + slack). */
const MIN_SPEC_MEMBERS = 6;
/** Salt bumps per (relax level, pool) before moving down the ladder. */
const MAX_REGEN_TRIES = 4;
/** Hard no-repeat window: a category identity can't recur for this many days. */
const HARD_IDENTITY_WINDOW = 6;
/** Soft window: kinds used in the last N days are avoided (relaxes first). */
const SOFT_KIND_WINDOW = 2;
/**
 * Anchor for the deterministic no-repeat chain. Every daily pick from this
 * date forward is regenerated (memoized) in order, so day N's exclusion window
 * sees EXACTLY what days N-1..N-6 served — no approximation. Dates before the
 * epoch (no shipped puzzles exist for them) contribute no exclusions.
 */
const CHAIN_EPOCH = '2026-01-01';
/** Max categories of the same kind per puzzle. */
const MAX_PER_KIND = 2;
/** Combined cap for club-flavored kinds so a board is never club-soup. */
const CLUBBISH_KINDS: ReadonlySet<ConnectionsArchetypeKind> = new Set(['club', 'played_for']);
const MAX_CLUBBISH = 2;

/** Inherent guessing difficulty per archetype kind (0 easy .. 3 devious). */
const KIND_HARDNESS: Record<ConnectionsArchetypeKind, 0 | 1 | 2 | 3> = {
  club: 0,
  nationality: 0,
  position: 1,
  league: 1,
  nat_pos: 2,
  league_pos: 2,
  value: 2,
  played_for: 2,
  first_letter: 3,
};

/**
 * Desired hardness mix (one target per slot) per weekly band. The skill tier
 * shifts every target by ±1 so stronger players see more devious archetypes.
 */
const BAND_HARDNESS_TARGETS: Record<FameBand['label'], number[]> = {
  easy: [0, 0, 1, 2],
  medium: [0, 1, 1, 2],
  hard: [0, 1, 2, 2],
  expert: [1, 2, 2, 3],
  wildcard: [0, 1, 2, 3],
};

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const TEAM_SHORT_NAMES: Record<string, string> = {
  'Football Club Internazionale Milano S.p.A.': 'Inter Milan',
  'Associazione Sportiva Roma': 'AS Roma',
  'Società Sportiva Lazio S.p.A.': 'Lazio',
  'Atalanta Bergamasca Calcio S.p.a.': 'Atalanta',
  'Genoa Cricket and Football Club': 'Genoa',
  'Udinese Calcio': 'Udinese',
  'Torino Calcio': 'Torino',
  'Bologna Football Club 1909': 'Bologna',
  'Cagliari Calcio': 'Cagliari',
  'Parma Calcio 1913': 'Parma',
  'Eintracht Frankfurt Fußball AG': 'Eintracht Frankfurt',
  'Crystal Palace Football Club': 'Crystal Palace',
  'Real Betis Balompié S.A.D.': 'Real Betis',
  'Fußball-Club Augsburg 1907': 'FC Augsburg',
  'Getafe Club de Fútbol S. A. D. Team Dubai': 'Getafe',
  'Unione Sportiva Sassuolo Calcio': 'Sassuolo',
  'Verona Hellas Football Club': 'Hellas Verona',
  'Club Atlético de Madrid S.A.D.': 'Atlético Madrid',
  'FC Bayern München': 'Bayern Munich',
  'RasenBallsport Leipzig GmbH': 'RB Leipzig',
  'RasenBallsport Leipzig': 'RB Leipzig',
  "Olympique Gymnaste Club Nice Côte d'Azur": 'OGC Nice',
  'Racing Club de Strasbourg Alsace': 'Strasbourg',
  'Racing Club de Lens': 'RC Lens',
  'Athletic Club Bilbao': 'Athletic Bilbao',
  'Stade Rennais': 'Rennes',
};

function getTeamLabel(team: string): string {
  return TEAM_SHORT_NAMES[team] ?? shortenClubName(team);
}

/** Plural labels for the DB's position values ("Attack" would read badly raw). */
const POSITION_PLURAL: Record<string, string> = {
  Goalkeeper: 'Goalkeepers',
  Defender: 'Defenders',
  Midfield: 'Midfielders',
  Attack: 'Forwards',
};

/**
 * Demonyms for category titles ("Brazilian defenders"). Language, not facts —
 * nations without an entry fall back to "<Nation> defenders".
 */
const NATION_ADJECTIVE: Record<string, string> = {
  Brazil: 'Brazilian',
  Argentina: 'Argentine',
  Spain: 'Spanish',
  England: 'English',
  France: 'French',
  Germany: 'German',
  Italy: 'Italian',
  Portugal: 'Portuguese',
  Netherlands: 'Dutch',
  Belgium: 'Belgian',
  Croatia: 'Croatian',
  Serbia: 'Serbian',
  Uruguay: 'Uruguayan',
  Colombia: 'Colombian',
  Ecuador: 'Ecuadorian',
  Chile: 'Chilean',
  Mexico: 'Mexican',
  'United States': 'American',
  USA: 'American',
  Canada: 'Canadian',
  Denmark: 'Danish',
  Sweden: 'Swedish',
  Norway: 'Norwegian',
  Poland: 'Polish',
  Austria: 'Austrian',
  Switzerland: 'Swiss',
  Scotland: 'Scottish',
  Wales: 'Welsh',
  Ireland: 'Irish',
  Turkey: 'Turkish',
  Ukraine: 'Ukrainian',
  Russia: 'Russian',
  'Czech Republic': 'Czech',
  Hungary: 'Hungarian',
  Greece: 'Greek',
  Romania: 'Romanian',
  Slovenia: 'Slovenian',
  Slovakia: 'Slovak',
  Albania: 'Albanian',
  Kosovo: 'Kosovar',
  Georgia: 'Georgian',
  Morocco: 'Moroccan',
  Algeria: 'Algerian',
  Tunisia: 'Tunisian',
  Egypt: 'Egyptian',
  Senegal: 'Senegalese',
  Nigeria: 'Nigerian',
  Ghana: 'Ghanaian',
  Cameroon: 'Cameroonian',
  "Cote d'Ivoire": 'Ivorian',
  Mali: 'Malian',
  Guinea: 'Guinean',
  Gabon: 'Gabonese',
  Japan: 'Japanese',
  'South Korea': 'South Korean',
  Australia: 'Australian',
};

function nationAdjective(nation: string): string {
  return NATION_ADJECTIVE[nation] ?? nation;
}

// ---------------------------------------------------------------------------
// Static data indices (lazy, module-cached)
// ---------------------------------------------------------------------------

function normName(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Team-majority league. Individual `league` strings go stale when a player
 * leaves the big five (Ronaldo at Al-Nassr keeps "Premier League" — known data
 * quirk), so league MEMBERSHIP only trusts teams where >= 5 players agree
 * >= 90% on one league. Conflict checks still honor the raw stale string
 * (over-exclusion is safe; a false member is not).
 */
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

/**
 * Curated "played for" clubs. `historyNames` match the short club strings used
 * by career_paths.json and transfers.json; `dbTeams` are the official
 * players_db `current_team` strings (incl. known variants) so "Ex-<club>"
 * membership can exclude players still at the club — and conflict checks can
 * exclude current squad members from other groups on the same board.
 */
interface PlayedForClub {
  key: string;
  label: string;
  historyNames: string[];
  dbTeams: string[];
}

const PLAYED_FOR_CLUBS: PlayedForClub[] = [
  {
    key: 'arsenal',
    label: 'Arsenal',
    historyNames: ['Arsenal'],
    dbTeams: ['Arsenal Football Club', 'Arsenal Fc U21'],
  },
  {
    key: 'chelsea',
    label: 'Chelsea',
    historyNames: ['Chelsea'],
    dbTeams: ['Chelsea Football Club', 'Chelsea', 'Chelsea Fc U21'],
  },
  {
    key: 'liverpool',
    label: 'Liverpool',
    historyNames: ['Liverpool'],
    dbTeams: ['Liverpool Football Club', 'Liverpool Fc U21'],
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
    dbTeams: ['Futbol Club Barcelona', 'Fc Barcelona Atlètic'],
  },
  {
    key: 'real-madrid',
    label: 'Real Madrid',
    historyNames: ['Real Madrid'],
    dbTeams: ['Real Madrid Club de Fútbol', 'Real Madrid', 'Real Madrid Castilla'],
  },
  {
    key: 'atletico',
    label: 'Atlético Madrid',
    historyNames: ['Atletico Madrid', 'Atletico de Madrid'],
    dbTeams: ['Club Atlético de Madrid S.A.D.'],
  },
  {
    key: 'sevilla',
    label: 'Sevilla',
    historyNames: ['Sevilla'],
    dbTeams: ['Sevilla Fútbol Club S.A.D.', 'Sevilla', 'Sevilla Atlético'],
  },
  {
    key: 'valencia',
    label: 'Valencia',
    historyNames: ['Valencia'],
    dbTeams: ['Valencia Club de Fútbol S. A. D.', 'Valencia', 'Valencia Mestalla'],
  },
  {
    key: 'bayern',
    label: 'Bayern Munich',
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
    dbTeams: ['Juventus Football Club', 'Juventus Next Gen'],
  },
  {
    key: 'ac-milan',
    label: 'AC Milan',
    historyNames: ['AC Milan'],
    dbTeams: ['Associazione Calcio Milan', 'Milan Futuro'],
  },
  {
    key: 'inter',
    label: 'Inter Milan',
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
    dbTeams: ['Società Sportiva Lazio S.p.A.', 'Lazio U20'],
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
    dbTeams: ['Olympique de Marseille', 'Marseille', 'Olympique De Marseille B'],
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
  { key: 'ajax', label: 'Ajax', historyNames: ['Ajax'], dbTeams: [] },
  {
    key: 'sporting',
    label: 'Sporting CP',
    historyNames: ['Sporting CP', 'Sporting Lisbon'],
    dbTeams: [],
  },
];

let playedForCache: Map<string, Set<string>> | null = null;
/** clubKey -> set of normalized player names with a recorded stint there. */
function getPlayedForIndex(): Map<string, Set<string>> {
  if (!playedForCache) {
    playedForCache = new Map();
    const byHistoryName = new Map<string, PlayedForClub>();
    for (const club of PLAYED_FOR_CLUBS) {
      playedForCache.set(club.key, new Set());
      for (const h of club.historyNames) byHistoryName.set(normName(h), club);
    }
    for (const cp of careerJson) {
      const player = cp.normalized_name || normName(cp.name);
      for (const stint of cp.career ?? []) {
        const club = byHistoryName.get(normName(stint.club));
        if (club) playedForCache.get(club.key)!.add(player);
      }
    }
    for (const th of getAllTransferHistories()) {
      const player = normName(th.player_name);
      for (const t of th.transfers) {
        const club = byHistoryName.get(normName(t.club_name));
        if (club) playedForCache.get(club.key)!.add(player);
      }
    }
  }
  return playedForCache;
}

// ---------------------------------------------------------------------------
// Archetype spec library
// ---------------------------------------------------------------------------

interface CategorySpec {
  kind: ConnectionsArchetypeKind;
  /** Stable identity ("club:Arsenal Football Club") — no-repeat window key. */
  identity: string;
  label: string;
  hardness: 0 | 1 | 2 | 3;
  /**
   * Shared-value components; two specs sharing one never co-exist in a puzzle
   * ("Brazil players" + "Brazilian defenders" would read as a dupe even where
   * the partition stays technically unique).
   */
  components: string[];
  /** Exact membership criterion — every group member must satisfy it. */
  matches: (p: Player) => boolean;
  /**
   * Ambiguity criterion, a SUPERSET of `matches`: any player for whom this is
   * true is banned from every OTHER group on the same board. Broader than
   * membership where data is fuzzy (stale league strings, unknown birthdays,
   * players still at an "ex-club") so the solved partition is never arguable.
   */
  conflicts: (p: Player) => boolean;
}

/** Market-value thresholds (in €m) tried for the "value" archetype. */
const VALUE_THRESHOLDS_M = [100, 80, 60, 40];

/** Groups pool members by a key, dropping blank keys. */
function groupBy(pool: Player[], keyOf: (p: Player) => string | null | undefined) {
  const map = new Map<string, Player[]>();
  for (const p of pool) {
    const k = keyOf(p);
    if (!k || String(k).trim() === '') continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  }
  return map;
}

function buildSpecLibrary(pool: Player[]): CategorySpec[] {
  const specs: CategorySpec[] = [];
  const playedFor = getPlayedForIndex();

  const push = (spec: CategorySpec, memberCount: number) => {
    if (memberCount >= MIN_SPEC_MEMBERS) specs.push(spec);
  };

  // --- club (current teammates) ---
  for (const [team, group] of groupBy(pool, (p) => p.current_team)) {
    push(
      {
        kind: 'club',
        identity: `club:${team}`,
        label: `${getTeamLabel(team)} players`,
        hardness: KIND_HARDNESS.club,
        components: [`team:${team}`],
        matches: (p) => p.current_team === team,
        conflicts: (p) => p.current_team === team,
      },
      group.length,
    );
  }

  // --- nationality ---
  for (const [nat, group] of groupBy(pool, (p) => p.nationality)) {
    push(
      {
        kind: 'nationality',
        identity: `nationality:${nat}`,
        label: `${nat} players`,
        hardness: KIND_HARDNESS.nationality,
        components: [`nat:${nat}`],
        matches: (p) => p.nationality === nat,
        conflicts: (p) => p.nationality === nat,
      },
      group.length,
    );
  }

  // --- position ---
  for (const [pos, group] of groupBy(pool, (p) => (p.position === 'Missing' ? null : p.position))) {
    const plural = POSITION_PLURAL[pos];
    if (!plural) continue;
    push(
      {
        kind: 'position',
        identity: `position:${pos}`,
        label: plural,
        hardness: KIND_HARDNESS.position,
        components: [`pos:${pos}`],
        matches: (p) => p.position === pos,
        conflicts: (p) => p.position === pos,
      },
      group.length,
    );
  }

  // --- league (team-majority league; see getTeamLeague) ---
  for (const [league, group] of groupBy(pool, (p) => getTeamLeague(p.current_team))) {
    push(
      {
        kind: 'league',
        identity: `league:${league}`,
        label: `${league} players`,
        hardness: KIND_HARDNESS.league,
        components: [`lg:${league}`],
        matches: (p) => getTeamLeague(p.current_team) === league,
        conflicts: (p) => getTeamLeague(p.current_team) === league || p.league === league,
      },
      group.length,
    );
  }

  // --- nationality + position ("Brazilian defenders") ---
  for (const [key, group] of groupBy(pool, (p) =>
    p.nationality && p.position && p.position !== 'Missing'
      ? `${p.nationality}|${p.position}`
      : null,
  )) {
    const [nat, pos] = key.split('|');
    const plural = POSITION_PLURAL[pos];
    if (!plural) continue;
    push(
      {
        kind: 'nat_pos',
        identity: `nat_pos:${key}`,
        label: `${nationAdjective(nat)} ${plural.toLowerCase()}`,
        hardness: KIND_HARDNESS.nat_pos,
        components: [`nat:${nat}`, `pos:${pos}`],
        matches: (p) => p.nationality === nat && p.position === pos,
        conflicts: (p) => p.nationality === nat && p.position === pos,
      },
      group.length,
    );
  }

  // --- league + position ("Premier League goalkeepers") ---
  for (const [key, group] of groupBy(pool, (p) => {
    const league = getTeamLeague(p.current_team);
    return league && p.position && p.position !== 'Missing' ? `${league}|${p.position}` : null;
  })) {
    const [league, pos] = key.split('|');
    const plural = POSITION_PLURAL[pos];
    if (!plural) continue;
    push(
      {
        kind: 'league_pos',
        identity: `league_pos:${key}`,
        label: `${league} ${plural.toLowerCase()}`,
        hardness: KIND_HARDNESS.league_pos,
        components: [`lg:${league}`, `pos:${pos}`],
        matches: (p) => getTeamLeague(p.current_team) === league && p.position === pos,
        conflicts: (p) =>
          (getTeamLeague(p.current_team) === league || p.league === league) && p.position === pos,
      },
      group.length,
    );
  }

  // --- market value ("Valued at €80m+") — exact field, complete coverage ---
  for (const m of VALUE_THRESHOLDS_M) {
    const members = pool.filter((p) => p.market_value >= m * 1_000_000);
    push(
      {
        kind: 'value',
        identity: `value:${m}`,
        label: `Valued at €${m}m+`,
        hardness: KIND_HARDNESS.value,
        // All value specs share a component: one value group per board, so
        // nested thresholds (€100m+ ⊂ €60m+) can never co-exist.
        components: ['value'],
        matches: (p) => p.market_value >= m * 1_000_000,
        conflicts: (p) => p.market_value >= m * 1_000_000,
      },
      members.length,
    );
  }

  // --- played for a club, not currently there ("Ex-Arsenal players") ---
  for (const club of PLAYED_FOR_CLUBS) {
    const names = playedFor.get(club.key)!;
    const atClub = (p: Player) => club.dbTeams.includes(p.current_team);
    const hasStint = (p: Player) => names.has(p.normalized_name || normName(p.name));
    const members = pool.filter((p) => hasStint(p) && !atClub(p));
    push(
      {
        kind: 'played_for',
        identity: `played_for:${club.key}`,
        label: `Ex-${shortenClubName(club.label)} players`,
        hardness: KIND_HARDNESS.played_for,
        components: [`club:${club.key}`, ...club.dbTeams.map((t) => `team:${t}`)],
        matches: (p) => hasStint(p) && !atClub(p),
        // Current squad members conflict too: they "play for", not "played
        // for", so they can't sit in another group as a false lure.
        conflicts: (p) => hasStint(p) || atClub(p),
      },
      members.length,
    );
  }

  // --- first letter of the display name (verifiable on the tiles) ---
  for (const [letter, group] of groupBy(pool, (p) => {
    const c = normName(p.name).charAt(0).toUpperCase();
    return c >= 'A' && c <= 'Z' ? c : null;
  })) {
    push(
      {
        kind: 'first_letter',
        identity: `first_letter:${letter}`,
        label: `Names starting with '${letter}'`,
        hardness: KIND_HARDNESS.first_letter,
        components: ['letter'],
        matches: (p) => normName(p.name).charAt(0).toUpperCase() === letter,
        conflicts: (p) => normName(p.name).charAt(0).toUpperCase() === letter,
      },
      group.length,
    );
  }

  return specs;
}

// Spec libraries are pure functions of the pool identity; cache them so the
// history-window regeneration stays cheap.
const specLibraryCache = new Map<string, CategorySpec[]>();
function getSpecLibrary(poolKey: string, pool: Player[]): CategorySpec[] {
  let lib = specLibraryCache.get(poolKey);
  if (!lib) {
    lib = buildSpecLibrary(pool);
    specLibraryCache.set(poolKey, lib);
  }
  return lib;
}

// ---------------------------------------------------------------------------
// Category selection
// ---------------------------------------------------------------------------

interface BuiltCategory {
  spec: CategorySpec;
  players: Player[];
}

interface AttemptOptions {
  /** Per-slot hardness targets, or null to ignore hardness. */
  targets: number[] | null;
  /** Identities served in the last HARD_IDENTITY_WINDOW days (hard exclude). */
  excludeIdentities: ReadonlySet<string> | null;
  /** Kinds served recently (soft exclude — relaxes before identities). */
  excludeKinds: ReadonlySet<string> | null;
  /** Enforce MAX_PER_KIND / MAX_CLUBBISH caps. */
  enforceCaps: boolean;
}

/**
 * Try to commit 4 mutually-exclusive categories of 4 from the pool. The
 * uniqueness invariant: every chosen player `matches` exactly their own spec
 * and `conflicts` with NO other committed spec (checked in both commit
 * directions), so exactly one valid partition of the 16 exists.
 */
function attemptBuild(
  pool: Player[],
  specs: CategorySpec[],
  seed: number,
  opts: AttemptOptions,
): BuiltCategory[] | null {
  const rand = createSeededRandom(seed);
  const candidates = seededShuffle(specs, rand).filter(
    (s) => !opts.excludeIdentities?.has(s.identity) && !opts.excludeKinds?.has(s.kind),
  );

  const committed: BuiltCategory[] = [];
  const usedIds = new Set<number>();
  const usedNames = new Set<string>();
  const usedComponents = new Set<string>();
  const kindCount = new Map<string, number>();
  let clubbishCount = 0;

  for (let slot = 0; slot < 4; slot++) {
    const target = opts.targets ? opts.targets[slot] : null;
    // Stable sort over the seeded shuffle: prefer specs whose inherent
    // hardness matches this slot's target.
    const ordered =
      target === null
        ? candidates
        : [...candidates].sort(
            (a, b) => Math.abs(a.hardness - target) - Math.abs(b.hardness - target),
          );

    let placed = false;
    for (const spec of ordered) {
      if (committed.some((c) => c.spec.identity === spec.identity)) continue;
      if (opts.enforceCaps) {
        if ((kindCount.get(spec.kind) ?? 0) >= MAX_PER_KIND) continue;
        if (CLUBBISH_KINDS.has(spec.kind) && clubbishCount >= MAX_CLUBBISH) continue;
      }
      if (spec.components.some((c) => usedComponents.has(c))) continue;
      // Already-chosen players must not fit the new criterion...
      if (committed.some((c) => c.players.some((p) => spec.conflicts(p)))) continue;

      // ...and new picks must not fit any committed criterion. Also dedupe
      // display names: two same-name tiles collapse in the Set-based selection
      // UI and make a group unsolvable.
      const eligible = seededShuffle(
        pool.filter(
          (p) =>
            spec.matches(p) && !usedIds.has(p.id) && !committed.some((c) => c.spec.conflicts(p)),
        ),
        rand,
      );
      const picked: Player[] = [];
      const pickedNames = new Set<string>();
      for (const p of eligible) {
        if (usedNames.has(p.name) || pickedNames.has(p.name)) continue;
        picked.push(p);
        pickedNames.add(p.name);
        if (picked.length >= 4) break;
      }
      if (picked.length < 4) continue;

      for (const p of picked) {
        usedIds.add(p.id);
        usedNames.add(p.name);
      }
      for (const c of spec.components) usedComponents.add(c);
      kindCount.set(spec.kind, (kindCount.get(spec.kind) ?? 0) + 1);
      if (CLUBBISH_KINDS.has(spec.kind)) clubbishCount++;
      committed.push({ spec, players: picked });
      placed = true;
      break;
    }
    if (!placed) return null;
  }
  return committed;
}

// ---------------------------------------------------------------------------
// Daily band pool + skill tier
// ---------------------------------------------------------------------------

/** Shift the weekly band by its fame offset (easy days more famous, hard/expert less). */
function adjustBand(band: FameBand): FameBand {
  const off = bandFameOffset(band);
  return {
    ...band,
    min: Math.max(0, band.min + off),
    max: Math.min(101, band.max + off),
  };
}

let basePoolCache: Player[] | null = null;
function getBasePool(): Player[] {
  if (!basePoolCache) {
    basePoolCache = getAllPlayers().filter((p) => {
      const fame = getFameForPlayer(p)?.fame_score;
      return fame !== undefined && fame >= 55 && isActivePlayer(p);
    });
  }
  return basePoolCache;
}

function getBandedPool(dateStr: string, tier: SkillTier): { pool: Player[]; poolKey: string } {
  const band = skillAdjustedBand(adjustBand(bandForDate(dateStr)), tier);
  const pool = filterByFameBand(
    getBasePool(),
    band,
    (p) => getFameForPlayer(p)?.fame_score,
    MIN_BAND_POOL,
  );
  return { pool, poolKey: `band:${band.min}:${band.max}:${band.label}` };
}

function hardnessTargets(dateStr: string, tier: SkillTier): number[] {
  const base = BAND_HARDNESS_TARGETS[bandForDate(dateStr).label];
  return base.map((t) => Math.max(0, Math.min(3, t + tier)));
}

// ---------------------------------------------------------------------------
// No-repeat window (deterministic history regeneration)
// ---------------------------------------------------------------------------

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

interface WindowExclusions {
  identities: Set<string>;
  /** kindsByRecency[0] = yesterday's kinds, [1] = the day before, ... */
  kindsByRecency: Set<string>[];
}

interface DayPick {
  identities: string[];
  kinds: ConnectionsArchetypeKind[];
}

// Canonical picks per (date, tier). Filled strictly in chain order from
// CHAIN_EPOCH so every day's window reads FINALIZED history — no approximation.
const dayPickCache = new Map<string, DayPick>();
// Last chained date per tier — repeat calls resume instead of re-walking.
const chainFrontier = new Map<SkillTier, string>();

/**
 * Ensure canonical picks exist for every date in [CHAIN_EPOCH, dateStr]. Walks
 * forward once per session (memoized, ~1-2ms per day); each step generates
 * that day's canonical categories against its exact 6-day exclusion window.
 */
function ensureChain(dateStr: string, tier: SkillTier): void {
  if (dateStr < CHAIN_EPOCH) return;
  let cursor = chainFrontier.get(tier) ?? addDays(CHAIN_EPOCH, -1);
  while (cursor < dateStr) {
    cursor = addDays(cursor, 1);
    const key = `${cursor}|${tier}`;
    if (dayPickCache.has(key)) continue;
    const built = buildPuzzleCategories(
      getModeSeed('connections', cursor),
      cursor,
      tier,
      windowExclusions(cursor, tier),
    );
    dayPickCache.set(key, {
      identities: built.map((c) => c.spec.identity),
      kinds: built.map((c) => c.spec.kind),
    });
  }
  chainFrontier.set(tier, cursor);
}

/** Exclusions from the finalized picks of the previous HARD_IDENTITY_WINDOW days. */
function windowExclusions(dateStr: string, tier: SkillTier): WindowExclusions {
  const identities = new Set<string>();
  const kindsByRecency: Set<string>[] = [];
  for (let i = 1; i <= HARD_IDENTITY_WINDOW; i++) {
    const prev = addDays(dateStr, -i);
    const pick = prev < CHAIN_EPOCH ? undefined : dayPickCache.get(`${prev}|${tier}`);
    if (pick) {
      for (const id of pick.identities) identities.add(id);
      if (i <= SOFT_KIND_WINDOW) kindsByRecency.push(new Set(pick.kinds));
    }
  }
  return { identities, kindsByRecency };
}

// ---------------------------------------------------------------------------
// Puzzle assembly
// ---------------------------------------------------------------------------

/**
 * Relaxation ladder (Missing-XI philosophy: soft preferences give way before
 * the puzzle fails to generate). Each level is tried on the banded pool first,
 * then the full pool, with a few salt bumps each:
 *   L0  targets + 2-day kind window + 6-day identity window + kind caps
 *   L1  kind window shrinks to yesterday only
 *   L2  kind window dropped
 *   L3  hardness targets dropped
 *   L4  identity window dropped
 *   L5  kind caps dropped (never reached in practice — sweep-tested)
 */
const RELAX_LEVELS = [
  { targets: true, kindDays: SOFT_KIND_WINDOW, identities: true, caps: true },
  { targets: true, kindDays: 1, identities: true, caps: true },
  { targets: true, kindDays: 0, identities: true, caps: true },
  { targets: false, kindDays: 0, identities: true, caps: true },
  { targets: false, kindDays: 0, identities: false, caps: true },
  { targets: false, kindDays: 0, identities: false, caps: false },
] as const;

function buildPuzzleCategories(
  seed: number,
  dateStr: string,
  tier: SkillTier,
  exclusions: WindowExclusions | null,
): BuiltCategory[] {
  const banded = getBandedPool(dateStr, tier);
  const pools: { pool: Player[]; poolKey: string }[] = [
    banded,
    { pool: getBasePool(), poolKey: 'base' },
  ];
  const targets = hardnessTargets(dateStr, tier);

  for (const level of RELAX_LEVELS) {
    const excludeKinds =
      level.kindDays > 0 && exclusions
        ? new Set(exclusions.kindsByRecency.slice(0, level.kindDays).flatMap((s) => [...s]))
        : null;
    const excludeIdentities = level.identities && exclusions ? exclusions.identities : null;
    for (const { pool, poolKey } of pools) {
      const specs = getSpecLibrary(poolKey, pool);
      for (let i = 0; i < MAX_REGEN_TRIES; i++) {
        const bumped = (seed ^ (i * 0x9e3779b1)) | 0;
        const built = attemptBuild(pool, specs, bumped, {
          targets: level.targets ? targets : null,
          excludeIdentities,
          excludeKinds,
          enforceCaps: level.caps,
        });
        if (built) return built;
      }
    }
  }
  // Unreachable in practice — L5 on the full pool mirrors the legacy engine's
  // weakest constraints. Return an empty board rather than throwing.
  return [];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the daily Connections puzzle.
 *  - Weekly difficulty: the candidate pool is biased by the date's fame band
 *    (bandForDate + bandFameOffset), skill-adjusted via skillAdjustedBand, and
 *    widens automatically so it never starves.
 *  - Variety: a library of 12 data-derived archetypes; a 6-day hard no-repeat
 *    window on category identities and a 2-day soft window on kinds, enforced
 *    by deterministically regenerating the previous days' picks.
 *  - Winnability: every player matches exactly one committed category and
 *    conflicts with none of the other three (checked both directions), so the
 *    16 tiles admit exactly one valid partition.
 *  - Difficulty: categories ordered by archetype hardness, then mean member
 *    fame; `difficulty` 0..3 keys the NYT yellow/green/blue/purple ladder at
 *    render time (revealed only on solve/game-over).
 *
 * Same date + same skill tier => same puzzle (the seed argument only drives
 * RNG; replays pass Date.now() for a fresh board).
 */
export function generateConnectionsPuzzle(
  seed: number,
  dateStr?: string,
  skillTier?: SkillTier,
): ConnectionsPuzzle {
  const date = dateStr ?? getTodayDateString();
  const tier = skillTier ?? resolveSkillTier('connections');
  // Finalize history up to YESTERDAY, then build today against its window.
  ensureChain(addDays(date, -1), tier);
  const built = buildPuzzleCategories(seed, date, tier, windowExclusions(date, tier));

  const meanFame = (c: BuiltCategory): number => {
    const scores = c.players.map((p) => getFameForPlayer(p)?.fame_score ?? 0);
    return scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  };
  // Easy -> hard: archetype hardness first, then more famous groups first.
  const ordered = [...built].sort(
    (a, b) => a.spec.hardness - b.spec.hardness || meanFame(b) - meanFame(a),
  );
  const categories: ConnectionsCategory[] = ordered.map((c, i) => ({
    name: c.spec.label,
    playerNames: c.players.map((p) => p.name),
    difficulty: i,
    kind: c.spec.kind,
    identity: c.spec.identity,
    playerIds: c.players.map((p) => p.id),
  }));

  const rand = createSeededRandom(seed);
  const allNames = categories.flatMap((c) => c.playerNames);
  const shuffledNames = seededShuffle(allNames, rand);

  return { categories, shuffledNames };
}

/**
 * TEST-ONLY: rebuild the matcher pair for a category identity so tests can
 * verify the unique-partition invariant against the real criteria.
 */
export function specMatchersForIdentity(
  identity: string,
): { matches: (p: Player) => boolean; conflicts: (p: Player) => boolean } | undefined {
  const lib = getSpecLibrary('base', getBasePool());
  const spec = lib.find((s) => s.identity === identity);
  return spec ? { matches: spec.matches, conflicts: spec.conflicts } : undefined;
}

// ---------------------------------------------------------------------------
// Play-time helpers (used by the screen; kept here so they're unit-testable).
// ---------------------------------------------------------------------------

/**
 * "One away!" detection: a wrong 4-selection is one away when exactly 3 of the 4
 * selected tiles belong to a single (unsolved) category. Non-spoiler — it says
 * only that the group is close, never which category.
 */
/** Max number of selected names sharing one unsolved group (0-3 on a wrong
 *  guess; 4 would have been a solve). Powers the near-miss banner ladder. */
export function bestGroupOverlap(
  selectedNames: string[],
  categories: ConnectionsCategory[],
  solvedCategoryNames: string[] = [],
): number {
  if (selectedNames.length !== 4) return 0;
  const selected = new Set(selectedNames);
  const solved = new Set(solvedCategoryNames);
  return categories.reduce((best, c) => {
    if (solved.has(c.name)) return best;
    const overlap = c.playerNames.filter((n) => selected.has(n)).length;
    return Math.max(best, overlap);
  }, 0);
}

export function isOneAway(
  selectedNames: string[],
  categories: ConnectionsCategory[],
  solvedCategoryNames: string[] = [],
): boolean {
  return bestGroupOverlap(selectedNames, categories, solvedCategoryNames) === 3;
}

const CONNECTIONS_MAX_MISTAKES = 4;

/**
 * Result rank for Connections, on the universal ladder. Score combines groups
 * found (0..4) with mistakes avoided (0..4) out of 8, so a clean 4/4 sweep is a
 * perfect Ballon d'Or and each mistake costs a fraction of a tier:
 *   4 groups, 0 mistakes = 8/8 → Ballon d'Or
 *   4 groups, 4 mistakes = 4/8 → First Team
 *   2 groups, 4 mistakes = 2/8 → Squad Rotation
 */
export function connectionsRank(groupsFound: number, mistakes: number) {
  const mistakesAvoided = Math.max(0, CONNECTIONS_MAX_MISTAKES - mistakes);
  const score = Math.max(0, Math.min(4, groupsFound)) + mistakesAvoided;
  return getRank(score, 8);
}

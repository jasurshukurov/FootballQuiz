import { Player } from '@/types/player';
import { CareerPlayer } from '@/types/career';

const playersJson = require('@/data/players_db_v1.json') as Player[];
const careerJson = require('@/data/career_paths.json') as CareerPlayer[];

let cachedPlayers: Player[] | null = null;
let cachedWithCareer: Player[] | null = null;

export function getAllPlayers(): Player[] {
  if (!cachedPlayers) {
    cachedPlayers = playersJson;
  }
  return cachedPlayers;
}

// ---------------------------------------------------------------------------
// Fame lookup — id-based (disambiguated), with a name fallback for datasets
// that carry player NAMES only.
// ---------------------------------------------------------------------------
// data/fame_by_id.json is keyed by players_db id and was built with namesake
// disambiguation, so an obscure player who shares a star's name no longer
// inherits the star's fame. All players_db-based call sites should join fame by
// id via getFameForPlayer(); the name helper below exists only for datasets
// with names and no players_db id (transfers, match lineups, career_paths).

export interface FameInfo {
  fame_score: number;
  difficulty_tier: string;
  peak_valuation: number;
}

const fameByIdJson = require('@/data/fame_by_id.json') as Record<
  string,
  { name: string; fame_score: number; difficulty_tier: string; peak_valuation?: number }
>;

/** Disambiguated fame for a players_db id, or undefined if unknown. */
export function getFameById(id: number): FameInfo | undefined {
  const e = fameByIdJson[String(id)];
  if (!e) return undefined;
  return {
    fame_score: e.fame_score,
    difficulty_tier: e.difficulty_tier,
    peak_valuation: e.peak_valuation ?? 0,
  };
}

/** Disambiguated fame for a players_db player. */
export function getFameForPlayer(p: { id: number }): FameInfo | undefined {
  return getFameById(p.id);
}

function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// fame_scores.json is the legacy name-keyed source; it still covers HISTORIC
// players (retired legends in old match lineups) that aren't in players_db.
const fameScoresJson = require('@/data/fame_scores.json') as {
  name: string;
  fame_score: number;
  difficulty_tier: string;
  metrics?: { peak_valuation_euros?: number };
}[];

let nameFameCache: Map<string, FameInfo> | null = null;
/**
 * Fame for a player NAME, for datasets without players_db ids. Prefers the
 * disambiguated id-derived value (players_db id -> name, highest fame per name);
 * falls back to fame_scores.json so historic players not in players_db keep a
 * fame value. NOTE: a bare name can't distinguish two players_db namesakes, so
 * this collapses to the more-famous one — full disambiguation only exists for
 * id-based joins.
 */
export function getFameByName(name: string): FameInfo | undefined {
  if (!nameFameCache) {
    nameFameCache = new Map();
    // Layer 1 (authoritative): disambiguated fame_by_id via players_db. Highest
    // fame per name if a name maps to multiple ids.
    const idKeys = new Set<string>();
    for (const p of getAllPlayers()) {
      const f = getFameById(p.id);
      if (!f) continue;
      const k = p.normalized_name || normalizeName(p.name);
      const cur = nameFameCache.get(k);
      if (!cur || f.fame_score > cur.fame_score) nameFameCache.set(k, f);
      idKeys.add(k);
    }
    // Layer 2 (fallback): fame_scores.json fills only names absent from
    // players_db (e.g. retired legends in historic match lineups).
    for (const e of fameScoresJson) {
      const k = normalizeName(e.name);
      if (idKeys.has(k)) continue;
      const info: FameInfo = {
        fame_score: e.fame_score,
        difficulty_tier: e.difficulty_tier,
        peak_valuation: e.metrics?.peak_valuation_euros ?? 0,
      };
      const cur = nameFameCache.get(k);
      if (!cur || info.fame_score > cur.fame_score) nameFameCache.set(k, info);
    }
  }
  return nameFameCache.get(normalizeName(name));
}

/** Returns all players including retired career-path players not in the main DB */
export function getAllPlayersWithCareer(): Player[] {
  if (!cachedWithCareer) {
    const base = getAllPlayers();
    const existingNames = new Set(base.map((p) => p.normalized_name));

    // Add career-path players missing from players_db
    const extras: Player[] = [];
    for (const cp of careerJson) {
      const nn = cp.normalized_name || cp.name.toLowerCase();
      if (!existingNames.has(nn)) {
        extras.push({
          id: 100000 + cp.id,
          name: cp.name,
          normalized_name: nn,
          nationality: cp.nationality || '',
          current_team: cp.career[cp.career.length - 1]?.club || '',
          league: '',
          position: cp.position || '',
          market_value: 0,
          image_url: cp.image_url || '',
        });
        existingNames.add(nn);
      }
    }

    cachedWithCareer = [...base, ...extras];
  }
  return cachedWithCareer;
}

// Lazy id → Player index so per-render lookups (age/difficulty tiers) are O(1)
// instead of scanning the whole DB on every call.
let playerByIdCache: Map<number, Player> | null = null;

export function getPlayerById(id: number): Player | undefined {
  if (!playerByIdCache) {
    playerByIdCache = new Map(getAllPlayers().map((p) => [p.id, p]));
  }
  return playerByIdCache.get(id);
}

/**
 * A player counts as active unless explicitly retired, or their last known
 * season is older than last year. Shared by all generators so the "active"
 * threshold stays consistent instead of drifting per file.
 */
export function isActivePlayer(p: Player): boolean {
  const currentYear = new Date().getFullYear();
  return (
    p.status !== 'retired' && (p.last_season === undefined || p.last_season >= currentYear - 1)
  );
}

// Pre-computed index for O(1) grid lookups
type PlayerIndex = Map<string, Map<string, Player[]>>;
let playerIndex: PlayerIndex | null = null;

/**
 * Map career_paths club names → players_db current_team names.
 * Career paths use short names ("Borussia Dortmund") while the DB uses
 * official names ("Ballspielverein Borussia 09 e.V. Dortmund").
 */
const CAREER_TO_DB_TEAM: Record<string, string[]> = {
  // Premier League
  Arsenal: ['Arsenal Football Club'],
  Chelsea: ['Chelsea Football Club'],
  Liverpool: ['Liverpool Football Club'],
  'Manchester City': ['Manchester City Football Club'],
  'Manchester United': ['Manchester United Football Club'],
  'Tottenham Hotspur': ['Tottenham Hotspur Football Club'],
  Tottenham: ['Tottenham Hotspur Football Club'],
  'Newcastle United': ['Newcastle United Football Club'],
  'Aston Villa': ['Aston Villa Football Club'],
  'West Ham United': ['West Ham United Football Club'],
  'West Ham': ['West Ham United Football Club'],
  Everton: ['Everton Football Club'],
  'Leeds United': ['Leeds United Football Club'],
  'Leicester City': ['Leicester City Football Club'],
  // La Liga
  'FC Barcelona': ['Futbol Club Barcelona'],
  Barcelona: ['Futbol Club Barcelona'],
  'Real Madrid': ['Real Madrid Club de Fútbol'],
  'Atletico Madrid': ['Club Atlético de Madrid S.A.D.'],
  'Atletico de Madrid': ['Club Atlético de Madrid S.A.D.'],
  Sevilla: ['Sevilla Fútbol Club'],
  Valencia: ['Valencia Club de Fútbol'],
  Villarreal: ['Villarreal Club de Fútbol, S. A. D.'],
  'Real Sociedad': ['Real Sociedad de Fútbol'],
  'Real Betis': ['Real Betis Balompié S.A.D.'],
  // Bundesliga
  'Bayern Munich': ['FC Bayern München'],
  'FC Bayern Munich': ['FC Bayern München'],
  'Bayern München': ['FC Bayern München'],
  'Borussia Dortmund': ['Borussia Dortmund'],
  'Bayer Leverkusen': ['Bayer 04 Leverkusen Fußball GmbH'],
  'RB Leipzig': ['RasenBallsport Leipzig GmbH'],
  'Eintracht Frankfurt': ['Eintracht Frankfurt Fußball AG'],
  'VfL Wolfsburg': ['VfL Wolfsburg'],
  'Schalke 04': ['Fußballclub Gelsenkirchen-Schalke 04 e.V.'],
  // Serie A
  Juventus: ['Juventus Football Club'],
  'AC Milan': ['Associazione Calcio Milan'],
  'Inter Milan': ['Football Club Internazionale Milano S.p.A.'],
  Internazionale: ['Football Club Internazionale Milano S.p.A.'],
  'AS Roma': ['Associazione Sportiva Roma'],
  Roma: ['Associazione Sportiva Roma'],
  'SSC Napoli': ['Società Sportiva Calcio Napoli'],
  Napoli: ['Società Sportiva Calcio Napoli'],
  'SS Lazio': ['Società Sportiva Lazio S.p.A.'],
  Lazio: ['Società Sportiva Lazio S.p.A.'],
  Fiorentina: ['ACF Fiorentina'],
  Atalanta: ['Atalanta Bergamasca Calcio S.p.a.'],
  // Ligue 1
  'Paris Saint-Germain': ['Paris Saint-Germain Football Club'],
  PSG: ['Paris Saint-Germain Football Club'],
  'Olympique Marseille': ['Olympique de Marseille'],
  Marseille: ['Olympique de Marseille'],
  'Olympique Lyon': ['Olympique Lyonnais'],
  Lyon: ['Olympique Lyonnais'],
  'AS Monaco': ['Association sportive de Monaco Football Club'],
  Monaco: ['Association sportive de Monaco Football Club'],
  Lille: ['LOSC Lille Association'],
};

/**
 * Build a lookup: players_db team name → Set of player IDs who have played there
 * based on career_paths.json history.
 */
function buildCareerTeamIndex(): Map<string, Set<number>> {
  const index = new Map<string, Set<number>>();
  const playersByName = new Map<string, Player>();
  for (const p of getAllPlayers()) {
    playersByName.set(p.normalized_name, p);
  }

  for (const cp of careerJson) {
    const nn = cp.normalized_name || cp.name.toLowerCase();
    const player = playersByName.get(nn);
    if (!player) continue;

    for (const entry of cp.career) {
      const club = entry.club;
      // Map career club name to DB team names
      const dbTeams = CAREER_TO_DB_TEAM[club];
      if (dbTeams) {
        for (const dbTeam of dbTeams) {
          if (!index.has(dbTeam)) index.set(dbTeam, new Set());
          index.get(dbTeam)!.add(player.id);
        }
      }
    }
  }
  return index;
}

function buildIndex(players: Player[]): PlayerIndex {
  const index: PlayerIndex = new Map();
  const fields = ['current_team', 'league', 'nationality', 'position'];
  for (const field of fields) {
    const fieldMap = new Map<string, Player[]>();
    for (const p of players) {
      const val = p[field as keyof Player] as string;
      if (!fieldMap.has(val)) fieldMap.set(val, []);
      fieldMap.get(val)!.push(p);
    }
    index.set(field, fieldMap);
  }

  // Expand current_team index with career history
  const careerIndex = buildCareerTeamIndex();
  const teamMap = index.get('current_team')!;
  const playerById = new Map(players.map((p) => [p.id, p]));

  for (const [dbTeam, playerIds] of careerIndex) {
    if (!teamMap.has(dbTeam)) teamMap.set(dbTeam, []);
    const existing = new Set(teamMap.get(dbTeam)!.map((p) => p.id));
    for (const pid of playerIds) {
      if (!existing.has(pid)) {
        const player = playerById.get(pid);
        if (player) {
          teamMap.get(dbTeam)!.push(player);
          existing.add(pid);
        }
      }
    }
  }

  return index;
}

export function getPlayersByField(field: string, value: string): Player[] {
  if (!playerIndex) {
    playerIndex = buildIndex(getAllPlayers());
  }
  return playerIndex.get(field)?.get(value) ?? [];
}

export function searchPlayers(query: string, limit = 20): Player[] {
  if (!query.trim()) return [];
  const normalized = query.toLowerCase().trim();
  const players = getAllPlayers();
  const results: Player[] = [];

  for (const player of players) {
    if (player.normalized_name.includes(normalized)) {
      results.push(player);
      if (results.length >= limit) break;
    }
  }

  return results;
}

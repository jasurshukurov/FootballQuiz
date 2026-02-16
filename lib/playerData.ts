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

export function getPlayerById(id: number): Player | undefined {
  return getAllPlayers().find((p) => p.id === id);
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
  'Arsenal': ['Arsenal Football Club'],
  'Chelsea': ['Chelsea Football Club'],
  'Liverpool': ['Liverpool Football Club'],
  'Manchester City': ['Manchester City Football Club'],
  'Manchester United': ['Manchester United Football Club'],
  'Tottenham Hotspur': ['Tottenham Hotspur Football Club'],
  'Tottenham': ['Tottenham Hotspur Football Club'],
  'Newcastle United': ['Newcastle United Football Club'],
  'Aston Villa': ['Aston Villa Football Club'],
  'West Ham United': ['West Ham United Football Club'],
  'West Ham': ['West Ham United Football Club'],
  'Everton': ['Everton Football Club'],
  'Leeds United': ['Leeds United Football Club'],
  'Leicester City': ['Leicester City Football Club'],
  // La Liga
  'FC Barcelona': ['Futbol Club Barcelona'],
  'Barcelona': ['Futbol Club Barcelona'],
  'Real Madrid': ['Real Madrid Club de Fútbol'],
  'Atletico Madrid': ['Club Atlético de Madrid S.A.D.'],
  'Atletico de Madrid': ['Club Atlético de Madrid S.A.D.'],
  'Sevilla': ['Sevilla Fútbol Club'],
  'Valencia': ['Valencia Club de Fútbol'],
  'Villarreal': ['Villarreal Club de Fútbol, S. A. D.'],
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
  'Juventus': ['Juventus Football Club'],
  'AC Milan': ['Associazione Calcio Milan'],
  'Inter Milan': ['Football Club Internazionale Milano S.p.A.'],
  'Internazionale': ['Football Club Internazionale Milano S.p.A.'],
  'AS Roma': ['Associazione Sportiva Roma'],
  'Roma': ['Associazione Sportiva Roma'],
  'SSC Napoli': ['Società Sportiva Calcio Napoli'],
  'Napoli': ['Società Sportiva Calcio Napoli'],
  'SS Lazio': ['Società Sportiva Lazio S.p.A.'],
  'Lazio': ['Società Sportiva Lazio S.p.A.'],
  'Fiorentina': ['ACF Fiorentina'],
  'Atalanta': ['Atalanta Bergamasca Calcio S.p.a.'],
  // Ligue 1
  'Paris Saint-Germain': ['Paris Saint-Germain Football Club'],
  'PSG': ['Paris Saint-Germain Football Club'],
  'Olympique Marseille': ['Olympique de Marseille'],
  'Marseille': ['Olympique de Marseille'],
  'Olympique Lyon': ['Olympique Lyonnais'],
  'Lyon': ['Olympique Lyonnais'],
  'AS Monaco': ['Association sportive de Monaco Football Club'],
  'Monaco': ['Association sportive de Monaco Football Club'],
  'Lille': ['LOSC Lille Association'],
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

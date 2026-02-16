import { Player } from '@/types/player';
import { CriteriaType, Grid, GridCell, GridCriteria } from '@/types/grid';
import { getPlayersByField } from '@/lib/playerData';

const CRITERIA_POOLS: Record<CriteriaType, string[]> = {
  current_team: [
    // Premier League (most popular)
    'Arsenal Football Club',
    'Chelsea Football Club',
    'Liverpool Football Club',
    'Manchester City Football Club',
    'Manchester United Football Club',
    'Tottenham Hotspur Football Club',
    // La Liga
    'Futbol Club Barcelona',
    'Real Madrid Club de Fútbol',
    'Club Atlético de Madrid S.A.D.',
    // Bundesliga
    'FC Bayern München',
    'Borussia Dortmund',
    // Serie A
    'Juventus Football Club',
    'Associazione Calcio Milan',
    'Football Club Internazionale Milano S.p.A.',
    // Ligue 1
    'Paris Saint-Germain Football Club',
  ],
  league: ['Serie A', 'La Liga', 'Ligue 1', 'Premier League', 'Bundesliga'],
  nationality: ['Italy', 'Spain', 'France', 'Germany', 'England', 'Brazil', 'Argentina', 'Portugal', 'Netherlands'],
  position: ['Attack', 'Defender', 'Goalkeeper', 'Midfield'],
};

const TEAM_SHORT_NAMES: Record<string, string> = {
  // Premier League
  'Arsenal Football Club': 'Arsenal',
  'Chelsea Football Club': 'Chelsea',
  'Liverpool Football Club': 'Liverpool',
  'Manchester City Football Club': 'Man City',
  'Manchester United Football Club': 'Man United',
  'Tottenham Hotspur Football Club': 'Tottenham',
  // La Liga
  'Futbol Club Barcelona': 'Barcelona',
  'Real Madrid Club de Fútbol': 'Real Madrid',
  'Club Atlético de Madrid S.A.D.': 'Atlético Madrid',
  // Bundesliga
  'FC Bayern München': 'Bayern Munich',
  'Borussia Dortmund': 'Dortmund',
  // Serie A
  'Juventus Football Club': 'Juventus',
  'Associazione Calcio Milan': 'AC Milan',
  'Football Club Internazionale Milano S.p.A.': 'Inter Milan',
  // Ligue 1
  'Paris Saint-Germain Football Club': 'PSG',
};

function getCriteriaLabel(type: CriteriaType, value: string): string {
  if (type === 'current_team') {
    return TEAM_SHORT_NAMES[value] ?? value;
  }
  return value;
}

/**
 * Axis layout configs: which criteria types go on X vs Y.
 * Each type appears on at most one axis to avoid impossible intersections.
 * Layouts are chosen to maximize the chance every cell has >= 5 players:
 *   - teams x positions (every team has 10+ per position)
 *   - leagues x nationalities (top nationalities well-represented in each league)
 *   - leagues x positions (obvious)
 *   - teams x leagues (each team belongs to exactly one league, so we only use
 *     teams from multiple leagues and match with non-league criteria)
 */
const AXIS_LAYOUTS: { x: CriteriaType; y: CriteriaType }[] = [
  { x: 'current_team', y: 'position' },
  { x: 'position', y: 'current_team' },
  { x: 'league', y: 'nationality' },
  { x: 'nationality', y: 'league' },
  { x: 'league', y: 'position' },
  { x: 'position', y: 'league' },
];

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 */
function createSeededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a date string into a numeric seed.
 */
export function hashDateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const ch = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + ch;
    hash |= 0;
  }
  return hash;
}

/**
 * Shuffle an array in-place using Fisher-Yates with a seeded random.
 */
function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Find all players matching both X and Y criteria.
 */
export function findValidPlayers(
  _players: Player[],
  criteriaX: GridCriteria,
  criteriaY: GridCriteria,
): Player[] {
  const setX = getPlayersByField(criteriaX.type, criteriaX.value);
  const setY = getPlayersByField(criteriaY.type, criteriaY.value);
  const smaller = setX.length < setY.length ? setX : setY;
  const largerSet = new Set((setX.length < setY.length ? setY : setX).map((p) => p.id));
  return smaller.filter((p) => largerSet.has(p.id));
}

/**
 * Pick 3 distinct values from a criteria pool.
 */
function pick3(type: CriteriaType, rand: () => number): [GridCriteria, GridCriteria, GridCriteria] {
  const pool = [...CRITERIA_POOLS[type]];
  seededShuffle(pool, rand);
  return [
    { type, value: pool[0], label: getCriteriaLabel(type, pool[0]) },
    { type, value: pool[1], label: getCriteriaLabel(type, pool[1]) },
    { type, value: pool[2], label: getCriteriaLabel(type, pool[2]) },
  ];
}

/**
 * Generate a 3x3 Immaculate Grid.
 * Each cell is the intersection of an X criterion (column) and Y criterion (row).
 */
export function generateGrid(players: Player[], seed?: number): Grid {
  const rand = createSeededRandom(seed ?? Date.now());

  const layoutIndex = Math.floor(rand() * AXIS_LAYOUTS.length);
  const layout = AXIS_LAYOUTS[layoutIndex];

  const xCriteria = pick3(layout.x, rand);
  const yCriteria = pick3(layout.y, rand);

  const cells: GridCell[][] = [];
  for (let row = 0; row < 3; row++) {
    const rowCells: GridCell[] = [];
    for (let col = 0; col < 3; col++) {
      const valid = findValidPlayers(players, xCriteria[col], yCriteria[row]);
      rowCells.push({
        row,
        col,
        criteriaX: xCriteria[col],
        criteriaY: yCriteria[row],
        validPlayers: valid,
      });
    }
    cells.push(rowCells);
  }

  return {
    id: `grid-${seed ?? 'random'}`,
    date: new Date().toISOString().split('T')[0],
    xCriteria,
    yCriteria,
    cells,
  };
}

/**
 * Generate a grid with validation, retrying up to maxRetries times
 * to find a grid where every cell has at least minPlayersPerCell players.
 */
export function generateValidGrid(
  players: Player[],
  seed?: number,
  maxRetries = 200,
  minPlayersPerCell = 5,
): Grid | null {
  const baseSeed = seed ?? Date.now();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const grid = generateGrid(players, baseSeed + attempt);
    const allValid = grid.cells.every((row) =>
      row.every((cell) => cell.validPlayers.length >= minPlayersPerCell),
    );
    if (allValid) {
      return {
        ...grid,
        id: `grid-${baseSeed}`,
      };
    }
  }

  return null;
}

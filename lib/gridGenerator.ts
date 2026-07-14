import { Player } from '@/types/player';
import { CriteriaType, Grid, GridCell, GridCriteria } from '@/types/grid';
import { getPlayersByField } from '@/lib/playerData';
import { shortenClubName } from '@/lib/clubNames';

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
  nationality: [
    'Italy',
    'Spain',
    'France',
    'Germany',
    'England',
    'Brazil',
    'Argentina',
    'Portugal',
    'Netherlands',
  ],
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
    return TEAM_SHORT_NAMES[value] ?? shortenClubName(value);
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

/** The fewest valid players any single cell has (a grid's weakest link). */
function worstCell(grid: Grid): number {
  let worst = Infinity;
  for (const row of grid.cells) {
    for (const cell of row) {
      if (cell.validPlayers.length < worst) worst = cell.validPlayers.length;
    }
  }
  return worst;
}

/**
 * Deterministically generate a solvable grid that is NEVER null.
 *
 * generateValidGrid can return null when no shuffle of the criteria pools yields
 * a grid whose every cell clears minPlayersPerCell — which left the screen stuck
 * on the loading skeleton forever. This wrapper progressively relaxes the
 * constraint (5 → 4 → 3 → 2 → 1 players/cell) and, if even a single-player floor
 * can't be met, returns the best grid it saw (the one whose weakest cell is
 * strongest). Same seed always yields the same grid, so dailies stay stable.
 */
export function generateGridWithFallback(players: Player[], seed?: number): Grid {
  const baseSeed = seed ?? Date.now();

  for (const minPerCell of [5, 4, 3, 2, 1]) {
    const grid = generateValidGrid(players, baseSeed, 200, minPerCell);
    if (grid) return grid;
  }

  // Last resort: no relaxation produced an all-cells-fillable grid, so pick the
  // least-bad grid across a wide seed sweep instead of leaving the user stuck.
  let best: Grid | null = null;
  let bestWorst = -1;
  for (let attempt = 0; attempt < 200; attempt++) {
    const grid = generateGrid(players, baseSeed + attempt);
    const w = worstCell(grid);
    if (w > bestWorst) {
      bestWorst = w;
      best = { ...grid, id: `grid-${baseSeed}` };
      if (w >= 1) break; // any fully-fillable grid is good enough
    }
  }
  return best ?? generateGrid(players, baseSeed);
}

// ---------------------------------------------------------------------------
// Client-side rarity scoring
// ---------------------------------------------------------------------------
// True percentile rarity (how few players globally picked this answer) needs a
// backend tally. As a local proxy we reward *obscurity*: a correct pick of a
// low-fame player is a "deep cut" worth bonus points on top of the base square.
// Fame is 0-100 (data/fame_by_id.json); a missing fame value is treated as very
// obscure (deep cut) since only well-known players carry a fame score.

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
  const deepCut = f < 60;
  return { base: GRID_BASE_POINTS, rarityBonus, total: GRID_BASE_POINTS + rarityBonus, deepCut };
}

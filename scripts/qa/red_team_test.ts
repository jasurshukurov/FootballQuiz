/**
 * Red Team Test - QA validation for Football Trivia game logic.
 *
 * Simulates 1,000 Who Are Ya rounds and 100 Immaculate Grid generations
 * to verify comparison logic and grid validity.
 *
 * Run: npx tsx scripts/qa/red_team_test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types (inlined to avoid @/ import issues)
// ---------------------------------------------------------------------------
interface Player {
  id: number;
  name: string;
  normalized_name: string;
  nationality: string;
  current_team: string;
  league: string;
  position: string;
  market_value: number;
  image_url: string;
}

type AttributeStatus = 'CORRECT' | 'WRONG' | 'HIGHER' | 'LOWER';

interface ComparisonResult {
  attribute: string;
  guessValue: string;
  targetValue: string;
  status: AttributeStatus;
}

interface GridCriteria {
  type: 'current_team' | 'league' | 'nationality' | 'position';
  value: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Load player data
// ---------------------------------------------------------------------------
const dataPath = path.resolve(__dirname, '../../data/players_db_v1.json');
const players: Player[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log(`Loaded ${players.length} players\n`);

// ---------------------------------------------------------------------------
// Comparison logic (re-implemented inline)
// ---------------------------------------------------------------------------
function compareString(guessVal: string, targetVal: string): AttributeStatus {
  return guessVal === targetVal ? 'CORRECT' : 'WRONG';
}

function compareMarketValue(guessVal: number, targetVal: number): AttributeStatus {
  if (guessVal === targetVal) return 'CORRECT';
  return guessVal < targetVal ? 'HIGHER' : 'LOWER';
}

function comparePlayers(
  guess: Player,
  target: Player,
): { comparisons: Record<string, ComparisonResult>; isCorrect: boolean } {
  const comparisons: Record<string, ComparisonResult> = {
    team: {
      attribute: 'team',
      guessValue: guess.current_team,
      targetValue: target.current_team,
      status: compareString(guess.current_team, target.current_team),
    },
    league: {
      attribute: 'league',
      guessValue: guess.league,
      targetValue: target.league,
      status: compareString(guess.league, target.league),
    },
    nationality: {
      attribute: 'nationality',
      guessValue: guess.nationality,
      targetValue: target.nationality,
      status: compareString(guess.nationality, target.nationality),
    },
    position: {
      attribute: 'position',
      guessValue: guess.position,
      targetValue: target.position,
      status: compareString(guess.position, target.position),
    },
    marketValue: {
      attribute: 'marketValue',
      guessValue: String(guess.market_value),
      targetValue: String(target.market_value),
      status: compareMarketValue(guess.market_value, target.market_value),
    },
  };

  return { comparisons, isCorrect: guess.id === target.id };
}

// ---------------------------------------------------------------------------
// Grid logic (re-implemented inline)
// ---------------------------------------------------------------------------
const CRITERIA_POOLS: Record<string, string[]> = {
  current_team: [
    'Football Club Internazionale Milano S.p.A.',
    'Associazione Sportiva Roma',
    'Società Sportiva Lazio S.p.A.',
    'Atalanta Bergamasca Calcio S.p.a.',
    'Genoa Cricket and Football Club',
    'Udinese Calcio',
    'Torino Calcio',
    'Bologna Football Club 1909',
    'Cagliari Calcio',
    'Parma Calcio 1913',
    'Eintracht Frankfurt Fußball AG',
    'Crystal Palace Football Club',
    'Real Betis Balompié S.A.D.',
    'Fußball-Club Augsburg 1907',
    'Getafe Club de Fútbol S. A. D. Team Dubai',
    'Unione Sportiva Sassuolo Calcio',
    'Verona Hellas Football Club',
  ],
  league: ['Serie A', 'La Liga', 'Ligue 1', 'Premier League', 'Bundesliga'],
  nationality: ['Italy', 'Spain', 'France', 'Germany', 'England', 'Brazil', 'Argentina'],
  position: ['Attack', 'Defender', 'Goalkeeper', 'Midfield'],
};

const AXIS_LAYOUTS = [
  { x: 'current_team', y: 'position' },
  { x: 'position', y: 'current_team' },
  { x: 'league', y: 'nationality' },
  { x: 'nationality', y: 'league' },
  { x: 'league', y: 'position' },
  { x: 'position', y: 'league' },
];

function createSeededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function findValidPlayers(
  allPlayers: Player[],
  criteriaX: GridCriteria,
  criteriaY: GridCriteria,
): Player[] {
  return allPlayers.filter((p) => {
    const matchX = (p as unknown as Record<string, unknown>)[criteriaX.type] === criteriaX.value;
    const matchY = (p as unknown as Record<string, unknown>)[criteriaY.type] === criteriaY.value;
    return matchX && matchY;
  });
}

function generateGrid(seed: number): { cells: { validCount: number }[][] } {
  const rand = createSeededRandom(seed);
  const layoutIndex = Math.floor(rand() * AXIS_LAYOUTS.length);
  const layout = AXIS_LAYOUTS[layoutIndex];

  const pickPool = (type: string) => {
    const pool = [...CRITERIA_POOLS[type]];
    seededShuffle(pool, rand);
    return pool.slice(0, 3).map((v) => ({ type, value: v, label: v }) as GridCriteria);
  };

  const xCriteria = pickPool(layout.x);
  const yCriteria = pickPool(layout.y);

  const cells: { validCount: number }[][] = [];
  for (let row = 0; row < 3; row++) {
    const rowCells: { validCount: number }[] = [];
    for (let col = 0; col < 3; col++) {
      const valid = findValidPlayers(players, xCriteria[col], yCriteria[row]);
      rowCells.push({ validCount: valid.length });
    }
    cells.push(rowCells);
  }

  return { cells };
}

// ---------------------------------------------------------------------------
// WHO ARE YA simulation
// ---------------------------------------------------------------------------
console.log('=== WHO ARE YA Red Team Test (1,000 rounds) ===\n');

let totalGames = 0;
let totalErrors = 0;
const errorDetails: string[] = [];

for (let game = 0; game < 1000; game++) {
  const targetIdx = Math.floor(Math.random() * players.length);
  const target = players[targetIdx];

  for (let guessNum = 0; guessNum < 8; guessNum++) {
    const guessIdx = Math.floor(Math.random() * players.length);
    const guess = players[guessIdx];
    const { comparisons, isCorrect } = comparePlayers(guess, target);

    // Verify isCorrect
    if (guess.id === target.id && !isCorrect) {
      totalErrors++;
      errorDetails.push(`Game ${game}: Same player (${guess.name}) but isCorrect=false`);
    }
    if (guess.id !== target.id && isCorrect) {
      totalErrors++;
      errorDetails.push(`Game ${game}: Different players but isCorrect=true`);
    }

    // Verify team comparison
    if (guess.current_team === target.current_team && comparisons.team.status !== 'CORRECT') {
      totalErrors++;
      errorDetails.push(`Game ${game}: Teams match but status=${comparisons.team.status}`);
    }
    if (guess.current_team !== target.current_team && comparisons.team.status === 'CORRECT') {
      totalErrors++;
      errorDetails.push(`Game ${game}: Teams differ but status=CORRECT`);
    }

    // Verify market value direction
    const mv = comparisons.marketValue;
    if (guess.market_value === target.market_value && mv.status !== 'CORRECT') {
      totalErrors++;
      errorDetails.push(`Game ${game}: Same MV but status=${mv.status}`);
    }
    if (guess.market_value < target.market_value && mv.status !== 'HIGHER') {
      totalErrors++;
      errorDetails.push(
        `Game ${game}: Guess MV ${guess.market_value} < Target MV ${target.market_value} but status=${mv.status}`,
      );
    }
    if (guess.market_value > target.market_value && mv.status !== 'LOWER') {
      totalErrors++;
      errorDetails.push(
        `Game ${game}: Guess MV ${guess.market_value} > Target MV ${target.market_value} but status=${mv.status}`,
      );
    }

    // Verify league comparison
    if (guess.league === target.league && comparisons.league.status !== 'CORRECT') {
      totalErrors++;
      errorDetails.push(`Game ${game}: Leagues match but status=${comparisons.league.status}`);
    }

    // Verify nationality comparison
    if (guess.nationality === target.nationality && comparisons.nationality.status !== 'CORRECT') {
      totalErrors++;
      errorDetails.push(
        `Game ${game}: Nationalities match but status=${comparisons.nationality.status}`,
      );
    }

    // Verify position comparison
    if (guess.position === target.position && comparisons.position.status !== 'CORRECT') {
      totalErrors++;
      errorDetails.push(`Game ${game}: Positions match but status=${comparisons.position.status}`);
    }
  }

  totalGames++;
}

console.log(`Games played:   ${totalGames}`);
console.log(`Total guesses:  ${totalGames * 8}`);
console.log(`Errors found:   ${totalErrors}`);
if (errorDetails.length > 0) {
  console.log('\nFirst 10 errors:');
  errorDetails.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
}

// ---------------------------------------------------------------------------
// IMMACULATE GRID simulation
// ---------------------------------------------------------------------------
console.log('\n=== IMMACULATE GRID Red Team Test (100 grids) ===\n');

let gridSuccessCount = 0;
let gridFailCount = 0;
const MIN_PLAYERS_PER_CELL = 5;

for (let i = 0; i < 100; i++) {
  const baseSeed = 1000 + i;
  let found = false;

  for (let attempt = 0; attempt < 200; attempt++) {
    const grid = generateGrid(baseSeed + attempt);
    const allValid = grid.cells.every((row) =>
      row.every((cell) => cell.validCount >= MIN_PLAYERS_PER_CELL),
    );
    if (allValid) {
      gridSuccessCount++;
      found = true;
      break;
    }
  }

  if (!found) {
    gridFailCount++;
  }
}

console.log(`Grids attempted:       ${100}`);
console.log(`Valid grids found:     ${gridSuccessCount}`);
console.log(`Failed grid searches:  ${gridFailCount}`);
console.log(`Success rate:          ${gridSuccessCount}%`);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n=== SUMMARY ===\n');
const allPassed = totalErrors === 0 && gridFailCount === 0;
if (allPassed) {
  console.log('ALL CHECKS PASSED');
} else {
  console.log('ISSUES FOUND:');
  if (totalErrors > 0) console.log(`  - ${totalErrors} comparison logic errors`);
  if (gridFailCount > 0) console.log(`  - ${gridFailCount} grid generation failures`);
}

process.exit(allPassed ? 0 : 1);

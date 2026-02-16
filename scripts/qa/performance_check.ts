/**
 * Performance Check - measures key operations for Football Trivia app.
 *
 * Targets:
 *   - JSON parse: < 500ms
 *   - Player search: < 10ms avg
 *   - Grid generation: < 100ms avg
 *
 * Run: npx tsx scripts/qa/performance_check.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types (inlined)
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

interface GridCriteria {
  type: string;
  value: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Helpers (inlined from lib)
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
    const rec = p as unknown as Record<string, unknown>;
    return rec[criteriaX.type] === criteriaX.value && rec[criteriaY.type] === criteriaY.value;
  });
}

function searchPlayers(allPlayers: Player[], query: string, limit = 20): Player[] {
  const normalized = query.toLowerCase().trim();
  const results: Player[] = [];
  for (const player of allPlayers) {
    if (player.normalized_name.includes(normalized)) {
      results.push(player);
      if (results.length >= limit) break;
    }
  }
  return results;
}

function generateGrid(allPlayers: Player[], seed: number) {
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

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      findValidPlayers(allPlayers, xCriteria[col], yCriteria[row]);
    }
  }
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------
const dataPath = path.resolve(__dirname, '../../data/players_db_v1.json');

console.log('=== PERFORMANCE CHECK ===\n');

// 1. JSON parse time
const jsonRaw = fs.readFileSync(dataPath, 'utf-8');
const parseStart = performance.now();
const players: Player[] = JSON.parse(jsonRaw);
const parseMs = performance.now() - parseStart;
const parsePassed = parseMs < 500;

console.log(
  `[${parsePassed ? 'PASS' : 'FAIL'}] JSON parse: ${parseMs.toFixed(2)}ms (target: <500ms)`,
);
console.log(`       Players loaded: ${players.length}\n`);

// 2. Player search (1000 searches)
const searchQueries = [
  'messi',
  'ronaldo',
  'neymar',
  'mbappe',
  'haaland',
  'de bruyne',
  'salah',
  'lewa',
  'kane',
  'vini',
];
const searchStart = performance.now();
for (let i = 0; i < 1000; i++) {
  const q = searchQueries[i % searchQueries.length];
  searchPlayers(players, q);
}
const searchTotalMs = performance.now() - searchStart;
const searchAvgMs = searchTotalMs / 1000;
const searchPassed = searchAvgMs < 10;

console.log(
  `[${searchPassed ? 'PASS' : 'FAIL'}] Player search avg: ${searchAvgMs.toFixed(3)}ms (target: <10ms)`,
);
console.log(`       Total for 1000 searches: ${searchTotalMs.toFixed(2)}ms\n`);

// 3. Grid generation (100 generations)
const gridStart = performance.now();
for (let i = 0; i < 100; i++) {
  generateGrid(players, 5000 + i);
}
const gridTotalMs = performance.now() - gridStart;
const gridAvgMs = gridTotalMs / 100;
const gridPassed = gridAvgMs < 100;

console.log(
  `[${gridPassed ? 'PASS' : 'FAIL'}] Grid generation avg: ${gridAvgMs.toFixed(2)}ms (target: <100ms)`,
);
console.log(`       Total for 100 grids: ${gridTotalMs.toFixed(2)}ms\n`);

// Summary
console.log('=== SUMMARY ===\n');
const allPassed = parsePassed && searchPassed && gridPassed;
if (allPassed) {
  console.log('ALL PERFORMANCE CHECKS PASSED');
} else {
  console.log('PERFORMANCE ISSUES DETECTED:');
  if (!parsePassed) console.log(`  - JSON parse too slow: ${parseMs.toFixed(2)}ms`);
  if (!searchPassed) console.log(`  - Search too slow: ${searchAvgMs.toFixed(3)}ms avg`);
  if (!gridPassed) console.log(`  - Grid generation too slow: ${gridAvgMs.toFixed(2)}ms avg`);
}

process.exit(allPassed ? 0 : 1);

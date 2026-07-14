// Grid-engine space + validity report (run: npx tsx scripts/qa/grid_space_report.ts)
//
// 1. 60-day daily sweep x 3 skill tiers: every cell must clear the shipped
//    floor; reports how many days hit the strict L0 target and the kind mix.
// 2. Grid-space size: samples N random seeds per weekday band and estimates the
//    number of distinct valid grids via birthday-collision counting.
import {
  generateDailyGrid,
  generateGridFromSeed,
  GRID_MIN_ELIGIBLE,
  GRID_MIN_FAMOUS,
} from '@/lib/gridEngine';
import { SkillTier } from '@/lib/difficultyCurve';

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// 1. Daily sweep
// ---------------------------------------------------------------------------
const EPOCH = '2026-07-01';
const DAYS = 60;
const tiers: SkillTier[] = [-1, 0, 1];

let worstEligible = Infinity;
let worstFamous = Infinity;
let strictDays = 0;
let total = 0;
let floorFailures = 0;
const kindMixCounts = new Map<string, number>();
const clubHeaderCounts = new Map<number, number>();
let clubXclubCells = 0;

const t0 = Date.now();
for (let i = 0; i < DAYS; i++) {
  const date = addDays(EPOCH, i);
  for (const tier of tiers) {
    const grid = generateDailyGrid(date, tier);
    total++;
    let minE = Infinity;
    let minF = Infinity;
    for (const row of grid.cells) {
      for (const cell of row) {
        minE = Math.min(minE, cell.eligiblePlayers.length);
        minF = Math.min(minF, cell.famousCount);
      }
    }
    worstEligible = Math.min(worstEligible, minE);
    worstFamous = Math.min(worstFamous, minF);
    if (minE < GRID_MIN_ELIGIBLE || minF < GRID_MIN_FAMOUS) floorFailures++;
    // strict L0: every cell (>=6 eligible & >=2 famous) or (>=4 & >=3 famous)
    const strict = grid.cells.every((r) =>
      r.every(
        (c) =>
          (c.eligiblePlayers.length >= 6 && c.famousCount >= 2) ||
          (c.eligiblePlayers.length >= 4 && c.famousCount >= 3),
      ),
    );
    if (strict) strictDays++;
    const mix = [...grid.kinds].sort().join('+');
    kindMixCounts.set(mix, (kindMixCounts.get(mix) ?? 0) + 1);
    const clubHeaders = [...grid.rows, ...grid.cols].filter((h) => h.kind === 'club').length;
    clubHeaderCounts.set(clubHeaders, (clubHeaderCounts.get(clubHeaders) ?? 0) + 1);
    for (const r of grid.rows)
      for (const c of grid.cols) if (r.kind === 'club' && c.kind === 'club') clubXclubCells++;
  }
}
const sweepMs = Date.now() - t0;

console.log(`--- Daily sweep: ${DAYS} days x ${tiers.length} tiers (${total} grids, ${sweepMs}ms) ---`);
console.log(`floor failures (<${GRID_MIN_ELIGIBLE} eligible or <${GRID_MIN_FAMOUS} famous):`, floorFailures);
console.log(`strict L0 grids: ${strictDays}/${total} (${((strictDays / total) * 100).toFixed(1)}%)`);
console.log('worst cell across sweep: eligible', worstEligible, 'famous', worstFamous);
console.log('club headers per grid:', [...clubHeaderCounts.entries()].sort().map(([k, v]) => `${k}:${v}`).join(' '));
console.log('club x club cells total:', clubXclubCells);
console.log('kind mixes:');
for (const [mix, n] of [...kindMixCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${mix}: ${n}`);
}

// determinism spot check
{
  const a = generateDailyGrid('2026-07-20', 0);
  const b = generateDailyGrid('2026-07-20', 0);
  console.log('determinism:', a.id === b.id ? 'OK' : `FAIL ${a.id} vs ${b.id}`);
}

// ---------------------------------------------------------------------------
// 2. Grid-space size per band (birthday estimate over random seeds)
// ---------------------------------------------------------------------------
const SAMPLES = 600;
// 2026-07-13 = Monday. Mon(easy) Thu(medium) Sat(expert) Sun(wildcard)
const bandDates: [string, string][] = [
  ['Mon/easy', '2026-07-13'],
  ['Thu/medium', '2026-07-16'],
  ['Sat/expert', '2026-07-18'],
  ['Sun/wildcard', '2026-07-19'],
];

console.log(`\n--- Grid space (${SAMPLES} random seeds per band) ---`);
const unionSignatures = new Set<string>();
for (const [label, date] of bandDates) {
  const t1 = Date.now();
  const sigs = new Map<string, number>();
  let collisions = 0;
  for (let s = 0; s < SAMPLES; s++) {
    const seed = (s * 2654435761 + 123456789) >>> 0;
    const grid = generateGridFromSeed(seed, date, 0);
    const sig = [...grid.rows, ...grid.cols].map((h) => h.key).join(',');
    if (sigs.has(sig)) collisions++;
    sigs.set(sig, (sigs.get(sig) ?? 0) + 1);
    unionSignatures.add(sig);
  }
  const ms = Date.now() - t1;
  const k = SAMPLES;
  const est = collisions > 0 ? Math.round((k * k) / (2 * collisions)) : Infinity;
  console.log(
    `${label}: distinct ${sigs.size}/${SAMPLES}, collisions ${collisions}, ` +
      `birthday estimate ~${est === Infinity ? `>${Math.round((k * k) / 2).toLocaleString()}` : est.toLocaleString()} distinct grids ` +
      `(${(ms / SAMPLES).toFixed(1)}ms/grid)`,
  );
}
console.log('union of distinct header-sets across bands:', unionSignatures.size);

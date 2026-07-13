/**
 * QA harness: simulate every daily game mode across a window of daily seeds and
 * flag degenerate / broken / unbalanced puzzles.
 *
 * READ-ONLY. Imports the real generators the app screens use, seeds them exactly
 * as each screen does, and runs correctness + balance checks. Prints a
 * markdown-style report to stdout.
 *
 *   npx tsx scripts/qa/simulate_games.ts
 *   npx tsx scripts/qa/simulate_games.ts --days=60 --start=2026-07-12
 */

import { getModeSeed, createSeededRandom } from '@/lib/dailySeed';
import { getDailyTarget, getDailyNumber } from '@/lib/dailyPuzzle';
import {
  getAllPlayers,
  getAllPlayersWithCareer,
  getFameForPlayer,
  getFameByName,
} from '@/lib/playerData';
import { generateConnectionsPuzzle } from '@/lib/connectionsGenerator';
import { generateDailyAgentGame } from '@/lib/agentGameGenerator';
import { generatePlayerQueue, getFameScore } from '@/lib/higherLowerGenerator';
import { generateBlindRankingPuzzle } from '@/lib/blindRankingGenerator';
import { generateCareerTimelinePuzzle } from '@/lib/careerTimelineGenerator';
import { getCareerPlayerForDay } from '@/lib/careerData';
import { generateValidGrid, hashDateSeed } from '@/lib/gridGenerator';
import { getAllMatches, getDailyMatch } from '@/lib/matchData';
import { getAllTransferHistories } from '@/lib/transferData';
import { generateFeeQueue, MIN_FEE_GAP } from '@/lib/feeHigherLowerGenerator';
import { bandForDate, bandFameOffset, progressionForRound } from '@/lib/difficultyCurve';
import { Player } from '@/types/player';

// ---------------------------------------------------------------------------
// Config / CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
function argVal(name: string, def: string): string {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
}
const NUM_DAYS = parseInt(argVal('days', '60'), 10);
const START_DATE = argVal('start', '2026-07-12');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function dateStrings(start: string, n: number): string[] {
  const [y, m, d] = start.split('-').map(Number);
  const out: string[] = [];
  const base = new Date(Date.UTC(y, m - 1, d));
  for (let i = 0; i < n; i++) {
    const dt = new Date(base.getTime() + i * 86400000);
    out.push(dt.toISOString().slice(0, 10));
  }
  return out;
}
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function weekdayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
function dateToLocalDate(dateStr: string): Date {
  // Matches how the screens build a Date from a YYYY-MM-DD string.
  return new Date(`${dateStr}T00:00:00`);
}
function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
function median(nums: number[]): number {
  if (nums.length === 0) return NaN;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function fmt(n: number, dp = 1): string {
  return Number.isFinite(n) ? n.toFixed(dp) : 'n/a';
}

// fame lookup (mirrors generators' normalized-name join)
const fameScores = require('@/data/fame_scores.json') as {
  name: string;
  fame_score: number;
  difficulty_tier: string;
}[];
const fameByNorm = new Map<string, number>();
const tierByNorm = new Map<string, string>();
for (const e of fameScores) {
  fameByNorm.set(norm(e.name), e.fame_score);
  tierByNorm.set(norm(e.name), e.difficulty_tier);
}
function fameOf(p: { normalized_name?: string; name: string }): number | undefined {
  return fameByNorm.get(p.normalized_name ?? norm(p.name)) ?? fameByNorm.get(norm(p.name));
}

// ---------------------------------------------------------------------------
// Report accumulation
// ---------------------------------------------------------------------------
interface ModeReport {
  mode: string;
  checked: number;
  hardFailures: string[]; // date-tagged
  softIssues: Map<string, number>; // issue -> count
  notes: string[];
}
function newReport(mode: string): ModeReport {
  return { mode, checked: 0, hardFailures: [], softIssues: new Map(), notes: [] };
}
function soft(r: ModeReport, key: string) {
  r.softIssues.set(key, (r.softIssues.get(key) ?? 0) + 1);
}

const DATES = dateStrings(START_DATE, NUM_DAYS);

// ===========================================================================
// WHO ARE YA
// ===========================================================================
function checkWhoAreYa(): ModeReport {
  const r = newReport('Who Are Ya');
  const targetsByDate: { date: string; player: Player; fame?: number }[] = [];
  const fameByWeekday = new Map<string, number[]>();
  const retiredByWeekday = new Map<string, number>();
  const countByWeekday = new Map<string, number>();
  let retiredCount = 0;

  for (const date of DATES) {
    const target = getDailyTarget(dateToLocalDate(date));
    r.checked++;
    if (!target) {
      r.hardFailures.push(`${date}: getDailyTarget returned nothing`);
      continue;
    }
    const fields: (keyof Player)[] = ['nationality', 'current_team', 'league', 'position'];
    for (const f of fields) {
      if (!target[f] || String(target[f]).trim() === '') {
        soft(r, `empty field: ${f}`);
      }
    }
    // age comes from player_ages.json via getPlayerAge; whoareya shows Age column
    const fame = fameOf(target);
    const wd = weekdayOf(date);
    countByWeekday.set(wd, (countByWeekday.get(wd) ?? 0) + 1);
    if (target.status === 'retired') {
      retiredCount++;
      retiredByWeekday.set(wd, (retiredByWeekday.get(wd) ?? 0) + 1);
    }
    targetsByDate.push({ date, player: target, fame });
    if (fame !== undefined) {
      if (!fameByWeekday.has(wd)) fameByWeekday.set(wd, []);
      fameByWeekday.get(wd)!.push(fame);
    }
  }

  // repeats within window: a <7-day repeat is a hard failure; a wider repeat
  // (possible only across overlapping fame bands) is a soft note.
  let windowRepeats = 0;
  const seenIdx = new Map<number, number>();
  for (let i = 0; i < targetsByDate.length; i++) {
    const { player, date } = targetsByDate[i];
    if (seenIdx.has(player.id)) {
      const prev = seenIdx.get(player.id)!;
      const gap = i - prev;
      windowRepeats++;
      if (gap < 7) {
        r.hardFailures.push(
          `repeat target "${player.name}" on ${date} within ${gap} days (also ${targetsByDate[prev].date})`,
        );
      } else {
        soft(r, 'cross-band repeat (>7 days apart)');
        r.notes.push(
          `cross-band repeat: "${player.name}" ${targetsByDate[prev].date} & ${date} (${gap}d)`,
        );
      }
    }
    seenIdx.set(player.id, i);
  }
  r.notes.push(`total repeats in ${targetsByDate.length}-day window: ${windowRepeats}`);

  // fame distribution
  const allFame = targetsByDate.map((t) => t.fame).filter((f): f is number => f !== undefined);
  r.notes.push(
    `fame_score across window: min=${fmt(Math.min(...allFame))} median=${fmt(median(allFame))} max=${fmt(Math.max(...allFame))} (targets w/ fame: ${allFame.length}/${targetsByDate.length})`,
  );
  r.notes.push(`retired targets: ${retiredCount}/${targetsByDate.length}`);
  const retLine = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    .filter((w) => countByWeekday.has(w))
    .map((w) => `${w}=${retiredByWeekday.get(w) ?? 0}/${countByWeekday.get(w)}`)
    .join(' ');
  r.notes.push(`retired targets by weekday: ${retLine}`);
  const easyRetired = (retiredByWeekday.get('Mon') ?? 0) + (retiredByWeekday.get('Tue') ?? 0);
  if (easyRetired > 0) soft(r, `retired target on an easy day (Mon/Tue): ${easyRetired}`);
  // weekday curve (should now ramp Mon easy -> Sat expert per difficultyCurve)
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const wdLine = order
    .filter((w) => fameByWeekday.has(w))
    .map((w) => {
      const sample = DATES.find((d) => weekdayOf(d) === w)!;
      return `${w}[${bandForDate(sample).label}]=${fmt(median(fameByWeekday.get(w)!))}`;
    })
    .join(' ');
  r.notes.push(`median fame by weekday: ${wdLine}`);
  const monMed = fameByWeekday.has('Mon') ? median(fameByWeekday.get('Mon')!) : NaN;
  const satMed = fameByWeekday.has('Sat') ? median(fameByWeekday.get('Sat')!) : NaN;
  r.notes.push(
    `Mon->Sat ramp: ${fmt(monMed)} -> ${fmt(satMed)} (${monMed > satMed ? 'DESCENDING as intended (easy->hard)' : 'NOT descending'})`,
  );
  return r;
}

// ===========================================================================
// GRID
// ===========================================================================
function checkGrid(): ModeReport {
  const r = newReport('Grid');
  const players = getAllPlayers();
  const minCellCounts: number[] = [];
  const layoutCombos = new Map<string, number>();
  let nullGrids = 0;

  for (const date of DATES) {
    r.checked++;
    const seed = hashDateSeed(date);
    const grid = generateValidGrid(players, seed);
    if (!grid) {
      nullGrids++;
      r.hardFailures.push(
        `${date}: generateValidGrid returned null (screen would hang on skeleton)`,
      );
      continue;
    }
    let dayMin = Infinity;
    for (const row of grid.cells) {
      for (const cell of row) {
        const n = cell.validPlayers.length;
        dayMin = Math.min(dayMin, n);
        if (n === 0)
          r.hardFailures.push(`${date}: empty cell (0 answers) r${cell.row}c${cell.col}`);
        else if (n === 1) soft(r, 'cell with exactly 1 valid answer (brutal)');
        else if (n < 5) soft(r, 'cell with <5 valid answers (below intended floor)');
      }
    }
    minCellCounts.push(dayMin);
    const combo = `${grid.xCriteria[0].type} x ${grid.yCriteria[0].type}`;
    layoutCombos.set(combo, (layoutCombos.get(combo) ?? 0) + 1);
  }

  r.notes.push(`null grids: ${nullGrids}/${DATES.length}`);
  if (minCellCounts.length) {
    r.notes.push(
      `min-cell answer count per day: overall min=${Math.min(...minCellCounts)} median=${fmt(median(minCellCounts))}`,
    );
  }
  r.notes.push(
    `axis-layout variety: ${[...layoutCombos.entries()].map(([k, v]) => `${k}:${v}`).join(', ')}`,
  );
  return r;
}

// ===========================================================================
// CONNECTIONS
// ===========================================================================
// Build precise value->type maps from the real DB so a category can be
// classified as nationality / current_team / league / position from its label.
const NATIONALITIES = new Set(
  getAllPlayers()
    .map((p) => p.nationality)
    .filter(Boolean),
);
const LEAGUES = new Set(
  getAllPlayers()
    .map((p) => p.league)
    .filter(Boolean),
);
const POSITIONS = new Set(
  getAllPlayers()
    .map((p) => p.position)
    .filter(Boolean),
);
// name -> players sharing that name (for cross-category exclusivity checks)
const playersByName = new Map<string, Player[]>();
for (const p of getAllPlayers()) {
  if (!playersByName.has(p.name)) playersByName.set(p.name, []);
  playersByName.get(p.name)!.push(p);
}
type CatSpec = { type: 'nationality' | 'current_team' | 'position' | 'league'; value: string };
/**
 * Derive a category's (type, value) using its LABEL to fix the type (so a
 * "Premier League players" group isn't mis-read as a "Midfield" group just
 * because its members happen to all be midfielders), then the value shared by
 * all members for that type.
 */
function deriveSpec(label: string, names: string[]): CatSpec | null {
  const cls = classifyCategory(label);
  const type = (['nationality', 'current_team', 'position', 'league'] as const).find(
    (t) => t === cls,
  );
  const sharedValue = (t: CatSpec['type']): string | null => {
    const sets = names.map(
      (n) => new Set((playersByName.get(n) ?? []).map((p) => p[t]).filter(Boolean)),
    );
    for (const v of sets[0]) if (sets.every((s) => s.has(v))) return v;
    return null;
  };
  if (type) {
    const value = sharedValue(type);
    if (value) return { type, value };
  }
  // fallback: first type all members share
  for (const t of ['nationality', 'current_team', 'position', 'league'] as const) {
    const v = sharedValue(t);
    if (v) return { type: t, value: v };
  }
  return null;
}

function classifyCategory(name: string): string {
  // position labels are "<Position>s"
  const posBase = name.replace(/s$/, '');
  if (POSITIONS.has(posBase)) return 'position';
  if (name.endsWith(' players')) {
    const base = name.slice(0, -' players'.length);
    if (LEAGUES.has(base)) return 'league';
    if (NATIONALITIES.has(base)) return 'nationality';
    return 'current_team'; // team labels may be short-name mapped, treat remainder as team
  }
  return 'unknown';
}

function checkConnections(): ModeReport {
  const r = newReport('Connections');
  const typeComboCounts = new Map<string, number>();

  for (const date of DATES) {
    r.checked++;
    const seed = getModeSeed('connections', date);
    const puzzle = generateConnectionsPuzzle(seed);
    if (puzzle.categories.length !== 4) {
      r.hardFailures.push(`${date}: ${puzzle.categories.length} categories (expected 4)`);
      continue;
    }
    for (const c of puzzle.categories) {
      if (c.playerNames.length !== 4) {
        r.hardFailures.push(`${date}: category "${c.name}" has ${c.playerNames.length} players`);
      }
    }
    // Duplicate NAME on the board is unsolvable: the screen tracks selection as a
    // Set<string>, so two identical-name tiles collapse and that group can never
    // reach a 4-tile selection (Submit stays disabled forever).
    const nameCount = new Map<string, number>();
    for (const c of puzzle.categories)
      for (const n of c.playerNames) nameCount.set(n, (nameCount.get(n) ?? 0) + 1);
    for (const [n, cnt] of nameCount) {
      if (cnt > 1) {
        const cats = puzzle.categories.filter((c) => c.playerNames.includes(n)).map((c) => c.name);
        const where =
          cats.length > 1 ? `across categories [${cats.join(', ')}]` : `twice in "${cats[0]}"`;
        r.hardFailures.push(
          `${date}: duplicate name "${n}" ${where} — board UNSOLVABLE (Set collapses selection)`,
        );
      }
    }
    if (puzzle.shuffledNames.length !== 16) {
      r.hardFailures.push(`${date}: board has ${puzzle.shuffledNames.length} tiles (expected 16)`);
    }
    // CROSS-CATEGORY EXCLUSIVITY: every board name must be placeable in exactly
    // one group. For each name there must exist a real player that fits its own
    // category's criterion and NO other chosen category's criterion (otherwise
    // the puzzle has multiple valid solutions). Checked against the chosen
    // player's identity via any homonym that satisfies its own spec.
    const specs = puzzle.categories.map((c) => deriveSpec(c.name, c.playerNames));
    for (let ci = 0; ci < puzzle.categories.length; ci++) {
      const own = specs[ci];
      const foreign = specs.filter((_, cj) => cj !== ci);
      for (const name of puzzle.categories[ci].playerNames) {
        const cands = (playersByName.get(name) ?? []).filter(
          (p) => own && p[own.type] === own.value,
        );
        const hasExclusive = cands.some((p) => !foreign.some((s) => s && p[s.type] === s.value));
        if (!hasExclusive) {
          const fits = foreign
            .filter((s) => s && cands.some((p) => p[s!.type] === s!.value))
            .map((s) => `${s!.type}=${s!.value}`);
          r.hardFailures.push(
            `${date}: "${name}" (in "${puzzle.categories[ci].name}") cannot be placed exclusively — also fits ${fits.join(', ')}`,
          );
        }
      }
    }
    // categories must be ordered easy -> hard (difficulty 0..3) by DESCENDING
    // mean member fame, so the colour ladder matches perceived difficulty.
    // Use id-based fame (same source the generator orders by) to avoid a false
    // "not ordered" flag from name/id fame divergence.
    const meanFameOf = (names: string[]) => {
      const s = names.map((n) => {
        const p = (playersByName.get(n) ?? [])[0];
        return (p && getFameForPlayer(p)?.fame_score) ?? 0;
      });
      return s.reduce((a, b) => a + b, 0) / (s.length || 1);
    };
    for (let i = 0; i < puzzle.categories.length; i++) {
      if (puzzle.categories[i].difficulty !== i) {
        soft(r, 'category difficulty index not sequential 0..3');
        break;
      }
    }
    for (let i = 0; i + 1 < puzzle.categories.length; i++) {
      if (
        meanFameOf(puzzle.categories[i].playerNames) <
        meanFameOf(puzzle.categories[i + 1].playerNames) - 0.001
      ) {
        soft(r, 'categories not ordered easy->hard by mean fame');
        break;
      }
    }
    // precise category types -> variety + genuinely-confusable same-type pairs
    const types = puzzle.categories.map((c) => classifyCategory(c.name));
    const combo = [...types].sort().join('+');
    typeComboCounts.set(combo, (typeComboCounts.get(combo) ?? 0) + 1);
    const typeSeen = new Map<string, string[]>();
    puzzle.categories.forEach((c, i) => {
      const t = types[i];
      if (!typeSeen.has(t)) typeSeen.set(t, []);
      typeSeen.get(t)!.push(c.name);
    });
    // Same-type categories are NOT confusable here (membership is disjoint by
    // construction), so 2-of-a-type is fine. Only 3+ of one type is monotony.
    for (const [t, names] of typeSeen) {
      if (t !== 'unknown' && names.length >= 3) {
        soft(r, `low variety: ${names.length} categories of type ${t}`);
      } else if (t !== 'unknown' && names.length === 2) {
        soft(r, `two categories share a type (${t}) — allowed, informational`);
      }
    }
  }
  r.notes.push(
    `category-type combos (accurate): ${[...typeComboCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => `[${k}]:${v}`)
      .join('  ')}`,
  );
  return r;
}

// The progression schedule itself must be monotonically non-increasing in both
// the fame floor and the gap ratio (checked once — it's date-independent).
function assertProgressionMonotonic(r: ModeReport) {
  for (let i = 1; i < 40; i++) {
    const prev = progressionForRound(i - 1);
    const cur = progressionForRound(i);
    if (cur.minFame > prev.minFame)
      r.hardFailures.push(
        `progression fame floor rises at round ${i} (${prev.minFame}->${cur.minFame})`,
      );
    if (cur.gapRatio > prev.gapRatio)
      r.hardFailures.push(
        `progression gap ratio rises at round ${i} (${prev.gapRatio}->${cur.gapRatio})`,
      );
    // fame CAP must also be non-increasing (uncapped = Infinity).
    if ((cur.maxFame ?? Infinity) > (prev.maxFame ?? Infinity))
      r.hardFailures.push(
        `progression fame cap rises at round ${i} (${prev.maxFame ?? 'none'}->${cur.maxFame ?? 'none'})`,
      );
  }
}

/** Fame cap that applies from this round onward (Infinity if uncapped). */
function roundCap(i: number): number {
  return progressionForRound(i).maxFame ?? Infinity;
}

// ===========================================================================
// HIGHER / LOWER  (in-session progression: famous+wide-gap early, obscure late)
// ===========================================================================
function checkHigherLower(): ModeReport {
  const r = newReport('Higher/Lower');
  assertProgressionMonotonic(r);
  const queueLens: number[] = [];
  let equalPairs = 0;
  const earlyFame: number[] = []; // positions 0-4 across all days
  const lateFame: number[] = []; // positions 20-24
  let deepMaxFame = 0; // highest fame seen at any round >=20

  for (const date of DATES) {
    r.checked++;
    const seed = getModeSeed('higherlower', date);
    const offset = bandFameOffset(bandForDate(date)); // replicate the app's band offset
    const queue = generatePlayerQueue(seed, 100, offset);
    queueLens.push(queue.length);
    if (queue.length < 2) {
      r.hardFailures.push(`${date}: queue length ${queue.length} (unplayable)`);
      continue;
    }
    for (let i = 0; i + 1 < queue.length; i++) {
      if (queue[i].market_value === queue[i + 1].market_value) {
        equalPairs++;
        r.hardFailures.push(`${date}: identical adjacent value at idx ${i}`);
      }
    }
    queue.forEach((p, i) => {
      const f = getFameScore(p) ?? 0;
      if (i < 5) earlyFame.push(f);
      else if (i >= 20 && i < 25) lateFame.push(f);
      // Deep rounds must respect the fame cap (household names can't resurface).
      if (i >= 20) {
        deepMaxFame = Math.max(deepMaxFame, f);
        if (f > roundCap(i) + 1e-9) {
          r.hardFailures.push(
            `${date}: round ${i} fame ${f.toFixed(1)} exceeds cap ${roundCap(i)}`,
          );
        }
      }
    });
  }
  r.notes.push(`queue length: ${Math.min(...queueLens)}..${Math.max(...queueLens)} (target 100)`);
  r.notes.push(`identical adjacent pairs: ${equalPairs}`);
  const em = median(earlyFame);
  const lm = median(lateFame);
  r.notes.push(
    `median fame by position: rounds 1-5 = ${fmt(em)} vs rounds 21-25 = ${fmt(lm)} (${em > lm ? 'RAMP present (harder later)' : 'NO ramp'})`,
  );
  r.notes.push(`deep-round (>=20) max fame: ${fmt(deepMaxFame)} (cap ${roundCap(20)})`);
  return r;
}

// ===========================================================================
// MARKET MOVERS  (transfer-fee H/L, same in-session progression)
// ===========================================================================
function checkMarketMovers(): ModeReport {
  const r = newReport('Market Movers');
  assertProgressionMonotonic(r);
  const queueLens: number[] = [];
  let equalFeePairs = 0;
  let indecisive = 0;
  const earlyFame: number[] = [];
  const lateFame: number[] = [];
  let deepMaxFame = 0;
  // Market Movers joins fame by name (its ids aren't players_db ids); mirror the
  // generator's join so the cap check matches what the generator saw.
  const moveFame = (name: string) => getFameByName(name)?.fame_score ?? 0;

  for (const date of DATES) {
    r.checked++;
    const seed = getModeSeed('marketmovers', date);
    const queue = generateFeeQueue(seed, 100);
    queueLens.push(queue.length);
    if (queue.length < 2) {
      r.hardFailures.push(`${date}: queue length ${queue.length} (unplayable)`);
      continue;
    }
    for (let i = 0; i + 1 < queue.length; i++) {
      const a = queue[i].fee;
      const b = queue[i + 1].fee;
      if (a === b) {
        equalFeePairs++;
        r.hardFailures.push(`${date}: identical adjacent fee at idx ${i}`);
      } else {
        const hi = Math.max(a, b);
        const lo = Math.min(a, b);
        if (lo > 0 && (hi - lo) / lo < MIN_FEE_GAP - 1e-9) indecisive++;
      }
    }
    queue.forEach((m, i) => {
      const f = moveFame(m.playerName);
      if (i < 5) earlyFame.push(f);
      else if (i >= 20 && i < 25) lateFame.push(f);
      if (i >= 20) {
        deepMaxFame = Math.max(deepMaxFame, f);
        if (f > roundCap(i) + 1e-9) {
          r.hardFailures.push(
            `${date}: round ${i} fame ${f.toFixed(1)} exceeds cap ${roundCap(i)}`,
          );
        }
      }
    });
  }
  r.notes.push(`queue length: ${Math.min(...queueLens)}..${Math.max(...queueLens)} (target 100)`);
  r.notes.push(
    `identical adjacent fees: ${equalFeePairs}; sub-10% (indecisive) pairs: ${indecisive}`,
  );
  const em = median(earlyFame);
  const lm = median(lateFame);
  r.notes.push(
    `median player fame by position: rounds 1-5 = ${fmt(em)} vs rounds 21-25 = ${fmt(lm)} (${em > lm ? 'RAMP present' : 'NO ramp'})`,
  );
  r.notes.push(`deep-round (>=20) max fame: ${fmt(deepMaxFame)} (cap ${roundCap(20)})`);
  return r;
}

// ===========================================================================
// BLIND RANKING
// ===========================================================================
function checkBlindRanking(): ModeReport {
  const r = newReport('Blind Ranking');
  const catCounts = new Map<string, number>();
  for (const date of DATES) {
    r.checked++;
    const seed = getModeSeed('blindranking', date);
    const p = generateBlindRankingPuzzle(seed);
    catCounts.set(p.category.id, (catCounts.get(p.category.id) ?? 0) + 1);
    if (p.players.length !== 5) {
      r.hardFailures.push(
        `${date}: ${p.players.length} players (expected 5, category=${p.category.id})`,
      );
      continue;
    }
    if (p.correctOrder.length !== 5) {
      r.hardFailures.push(`${date}: correctOrder length ${p.correctOrder.length}`);
    }
    // distinct ids
    if (new Set(p.players.map((x) => x.id)).size !== 5) {
      r.hardFailures.push(`${date}: duplicate player in the 5`);
    }
    // ties in the sort field would make ranking ambiguous
    const vals = p.correctOrder.map((id) => rankValueForBlind(p, id));
    for (let i = 0; i + 1 < vals.length; i++) {
      if (vals[i] === vals[i + 1]) soft(r, 'tie in ranking values (ambiguous order)');
    }
  }
  r.notes.push(
    `category variety: ${[...catCounts.entries()].map(([k, v]) => `${k}:${v}`).join(', ')}`,
  );
  return r;
}
function rankValueForBlind(p: ReturnType<typeof generateBlindRankingPuzzle>, id: number): number {
  const player = p.players.find((x) => x.id === id)!;
  // reconstruct field value the same way the generator ranks
  const f = p.category.sortField;
  if (f === 'market_value') return player.market_value;
  if (f === 'fame_score') return fameByNorm.get(player.normalized_name) ?? 0;
  const entry = fameScores.find((e) => norm(e.name) === player.normalized_name) as any;
  return entry?.metrics?.[f] ?? 0;
}

// ===========================================================================
// MISSING XI
// ===========================================================================
function checkMissing11(): ModeReport {
  const r = newReport('Missing XI');
  const matches = getAllMatches();
  const usedMatch = new Map<string, string>(); // matchId -> first date
  if (matches.length === 0) {
    r.hardFailures.push('no matches in DB');
    return r;
  }
  for (const date of DATES) {
    r.checked++;
    // Replicate the screen: rotating daily match + seeded side pick.
    const rng = createSeededRandom(getModeSeed('missing11', date));
    const match = getDailyMatch(getDailyNumber(dateToLocalDate(date)));
    const side = rng() < 0.5 ? 'a' : 'b';
    const names = side === 'a' ? match.lineup_a_names : match.lineup_b_names;
    const teamName = side === 'a' ? match.opponent_a : match.opponent_b;
    if (!match.match_id) {
      r.hardFailures.push(`${date}: match has no id`);
    }
    if (!names || names.length !== 11) {
      r.hardFailures.push(
        `${date}: ${teamName} lineup has ${names?.length ?? 0} names (expected 11)`,
      );
      continue;
    }
    if (names.some((n) => !n || n.trim() === '')) {
      r.hardFailures.push(`${date}: ${teamName} lineup has empty name(s)`);
    }
    const uniq = new Set(names.map(norm));
    if (uniq.size !== names.length) {
      r.hardFailures.push(`${date}: ${teamName} lineup has duplicate names`);
    }
    if (usedMatch.has(match.match_id)) {
      r.hardFailures.push(
        `${date}: match ${match.match_id} repeated within window (first ${usedMatch.get(match.match_id)})`,
      );
    } else {
      usedMatch.set(match.match_id, date);
    }
  }
  r.notes.push(`match pool size: ${matches.length} (playable subset used for rotation)`);
  r.notes.push(
    `distinct matches used over window: ${usedMatch.size}/${DATES.length} (rotation => no repeats)`,
  );
  return r;
}

// ===========================================================================
// AGENT
// ===========================================================================
function checkAgent(): ModeReport {
  const r = newReport('Agent');
  const histories = getAllTransferHistories();
  const roundCounts: number[] = [];
  const nameFame = (name: string) => fameByNorm.get(norm(name)) ?? 0;
  const earlyFame: number[] = []; // rounds 0-2 correct player fame
  const lateFame: number[] = []; // rounds 7-9
  for (const date of DATES) {
    r.checked++;
    const gameKey = String(getModeSeed('agent', date));
    const rounds = generateDailyAgentGame(gameKey);
    roundCounts.push(rounds.length);
    if (rounds.length < 10) soft(r, `fewer than 10 rounds generated (${rounds.length})`);
    if (rounds.length === 0) {
      r.hardFailures.push(`${date}: 0 rounds`);
      continue;
    }
    rounds.forEach((rd, i) => {
      const f = nameFame(rd.correctPlayerName);
      if (i < 3) earlyFame.push(f);
      else if (i >= 7) lateFame.push(f);
    });
    const correctIds = new Set<number>();
    for (let i = 0; i < rounds.length; i++) {
      const rd = rounds[i];
      if (correctIds.has(rd.correctPlayerId)) {
        r.hardFailures.push(`${date} r${i}: duplicate correct player ${rd.correctPlayerName}`);
      }
      correctIds.add(rd.correctPlayerId);
      // options must include exactly one whose transfer fee EXACTLY equals targetFee
      const target = rd.targetFee;
      let exactMatches = 0;
      for (const opt of rd.options) {
        const h = histories.find((x) => x.player_id === opt.playerId);
        if (h && h.transfers.some((t) => t.fee === target)) exactMatches++;
      }
      if (exactMatches === 0) {
        r.hardFailures.push(`${date} r${i}: NO option has a transfer matching fee ${target}`);
      } else if (exactMatches > 1) {
        soft(r, 'two+ options share the exact target fee (ambiguous answer)');
        r.notes.push(`ambiguous: ${date} r${i} fee=${target} — ${exactMatches} options match`);
      }
      if (rd.correctClubFrom === 'Unknown') soft(r, "hint shows 'Unknown -> club'");
    }
  }
  r.notes.push(
    `rounds generated: min=${Math.min(...roundCounts)} median=${fmt(median(roundCounts))} (target 10)`,
  );
  const em = median(earlyFame);
  const lm = median(lateFame);
  r.notes.push(
    `median correct-player fame: rounds 1-3 = ${fmt(em)} vs rounds 8-10 = ${fmt(lm)} (${em > lm ? 'RAMP present' : 'NO ramp'})`,
  );
  r.notes.push(`transfer-history pool: ${histories.length} players`);
  return r;
}

// ===========================================================================
// CAREER PATH
// ===========================================================================
function checkCareerPath(): ModeReport {
  const r = newReport('Career Path');
  const searchPool = new Set(getAllPlayersWithCareer().map((p) => p.normalized_name));
  const stintCounts: number[] = [];
  const usedIdx = new Map<string, string>();
  const tierCounts = new Map<string, number>();

  for (const date of DATES) {
    r.checked++;
    // Replicate the app: rotating day pick over the >=3-stint pool.
    const player = getCareerPlayerForDay(getDailyNumber(dateToLocalDate(date)));
    tierCounts.set(player.tier, (tierCounts.get(player.tier) ?? 0) + 1);
    const stints = player.career?.length ?? 0;
    stintCounts.push(stints);
    if (stints < 3)
      r.hardFailures.push(`${date}: "${player.name}" career has ${stints} stint(s) (<3)`);

    // guessable: name must exist in the autocomplete search pool
    const nn = player.normalized_name || norm(player.name);
    if (!searchPool.has(nn)) {
      r.hardFailures.push(`${date}: "${player.name}" NOT in search pool (unguessable)`);
    }
    const key = player.name;
    if (usedIdx.has(key))
      r.hardFailures.push(
        `${date}: player "${key}" repeated within window (first ${usedIdx.get(key)})`,
      );
    else usedIdx.set(key, date);
  }
  r.notes.push(
    `career stints: min=${Math.min(...stintCounts)} median=${fmt(median(stintCounts))} max=${Math.max(...stintCounts)}`,
  );
  r.notes.push(
    `difficulty tiers used: ${[...tierCounts.entries()].map(([k, v]) => `${k}:${v}`).join(', ')}`,
  );
  r.notes.push(`distinct players over window: ${usedIdx.size}/${DATES.length}`);
  return r;
}

// ===========================================================================
// CAREER TIMELINE
// ===========================================================================
function checkCareerTimeline(): ModeReport {
  const r = newReport('Career Timeline');
  const hiddenCounts: number[] = [];
  const usedIdx = new Map<string, string>();
  for (const date of DATES) {
    r.checked++;
    const seed = getModeSeed('careertimeline', date);
    const p = generateCareerTimelinePuzzle(seed, getDailyNumber(dateToLocalDate(date)));
    if (!p.nodes || p.nodes.length < 3) {
      r.hardFailures.push(`${date}: ${p.nodes?.length ?? 0} nodes (expected >=3)`);
      continue;
    }
    if (p.totalHidden < 1) r.hardFailures.push(`${date}: nothing hidden`);
    // >=2 hidden whenever the career has >=4 stints (>=2 middle nodes available)
    const middleCount = p.nodes.length - 2;
    if (middleCount >= 2 && p.totalHidden < 2) {
      r.hardFailures.push(
        `${date}: "${p.playerName}" only ${p.totalHidden} hidden but ${middleCount} middle nodes available`,
      );
    }
    hiddenCounts.push(p.totalHidden);
    // first & last must be revealed
    if (p.nodes[0].isHidden) r.hardFailures.push(`${date}: first node hidden`);
    if (p.nodes[p.nodes.length - 1].isHidden) r.hardFailures.push(`${date}: last node hidden`);
    // chronological ordering
    for (let i = 0; i + 1 < p.nodes.length; i++) {
      if (p.nodes[i].from > p.nodes[i + 1].from) {
        soft(r, 'career nodes out of chronological order');
        r.notes.push(
          `${date}: "${p.playerName}" node ${i} from=${p.nodes[i].from} > next from=${p.nodes[i + 1].from}`,
        );
        break;
      }
    }
    // duplicate from-year among hidden nodes => ambiguous "which club" range
    const hiddenRanges = p.nodes.filter((n) => n.isHidden).map((n) => `${n.from}-${n.to}`);
    if (new Set(hiddenRanges).size !== hiddenRanges.length) {
      soft(r, 'two hidden nodes share identical year range (ambiguous)');
    }
    if (usedIdx.has(p.playerName))
      r.hardFailures.push(
        `${date}: player "${p.playerName}" repeated within window (first ${usedIdx.get(p.playerName)})`,
      );
    else usedIdx.set(p.playerName, date);
  }
  r.notes.push(
    `hidden clubs per puzzle: min=${Math.min(...hiddenCounts)} median=${fmt(median(hiddenCounts))} max=${Math.max(...hiddenCounts)}`,
  );
  r.notes.push(`distinct players over window: ${usedIdx.size}/${DATES.length}`);
  return r;
}

// ---------------------------------------------------------------------------
// Cross-mode: is there ANY difficulty control?
// ---------------------------------------------------------------------------
function checkSeedHygiene(): string[] {
  const notes: string[] = [];
  // getModeSeed collisions across modes on same date?
  const modes = [
    'connections',
    'agent',
    'higherlower',
    'marketmovers',
    'blindranking',
    'careerpath',
    'careertimeline',
    'missing11',
  ];
  let collisions = 0;
  for (const date of DATES) {
    const seen = new Map<number, string>();
    for (const m of modes) {
      const s = getModeSeed(m, date);
      if (seen.has(s)) collisions++;
      seen.set(s, m);
    }
  }
  notes.push(`getModeSeed collisions across modes (same date): ${collisions}`);
  // Grid uses hashDateSeed(date) directly; connections practice uses getModeSeed('connections', date).
  // Verify grid seed != any mode seed pattern coincidences are irrelevant; just record grid seed determinism.
  return notes;
}

// ---------------------------------------------------------------------------
// Run + print
// ---------------------------------------------------------------------------
function printReport(r: ModeReport) {
  console.log(`\n### ${r.mode}  (puzzles checked: ${r.checked})`);
  if (r.hardFailures.length === 0) console.log(`- HARD FAILURES: none`);
  else {
    console.log(`- HARD FAILURES: ${r.hardFailures.length}`);
    for (const f of r.hardFailures.slice(0, 25)) console.log(`    x ${f}`);
    if (r.hardFailures.length > 25) console.log(`    ... +${r.hardFailures.length - 25} more`);
  }
  if (r.softIssues.size === 0) console.log(`- soft issues: none`);
  else {
    console.log(`- soft issues:`);
    for (const [k, v] of [...r.softIssues.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ~ ${k}: ${v}`);
    }
  }
  for (const n of r.notes) console.log(`- ${n}`);
}

function main() {
  console.log(
    `# QA simulation — ${DATES.length} daily seeds (${DATES[0]} .. ${DATES[DATES.length - 1]})`,
  );
  console.log(
    `players_db: ${getAllPlayers().length}  matches: ${getAllMatches().length}  transferHistories: ${getAllTransferHistories().length}`,
  );

  const reports = [
    checkWhoAreYa(),
    checkGrid(),
    checkConnections(),
    checkHigherLower(),
    checkMarketMovers(),
    checkBlindRanking(),
    checkMissing11(),
    checkAgent(),
    checkCareerPath(),
    checkCareerTimeline(),
  ];
  for (const r of reports) printReport(r);

  console.log(`\n### Seed hygiene`);
  for (const n of checkSeedHygiene()) console.log(`- ${n}`);

  // summary
  const totalHard = reports.reduce((s, r) => s + r.hardFailures.length, 0);
  const totalSoft = reports.reduce(
    (s, r) => s + [...r.softIssues.values()].reduce((a, b) => a + b, 0),
    0,
  );
  console.log(
    `\n## SUMMARY: ${totalHard} hard failures, ${totalSoft} soft-issue instances across ${reports.length} modes`,
  );
  for (const r of reports) {
    const soft = [...r.softIssues.values()].reduce((a, b) => a + b, 0);
    console.log(`  - ${r.mode}: ${r.hardFailures.length} hard, ${soft} soft`);
  }
}

main();

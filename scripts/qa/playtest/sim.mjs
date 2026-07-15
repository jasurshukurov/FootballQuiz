// Deterministic re-implementation of the daily generators, using the raw JSON,
// so the QA driver can play HigherLower / BlindRanking optimally.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const players = require('../../../data/players_db_v1.json');
const fameById = require('../../../data/fame_by_id.json');
const fameScores = require('../../../data/fame_scores.json');

const norm = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const fameByNameMetrics = new Map();
for (const e of fameScores) fameByNameMetrics.set(norm(e.name), e);

const getFame = (p) => fameById[String(p.id)];
const fameScore = (p) => getFame(p)?.fame_score;
const isActive = (p) => p.status !== 'retired';

// ---- name -> market_value (HigherLower challenger lookup) ----
export const nameToMv = new Map();
for (const p of players) {
  // keep the highest mv for duplicate names
  const cur = nameToMv.get(p.name);
  if (cur === undefined || p.market_value > cur) nameToMv.set(p.name, p.market_value);
}

// ---- daily seed ----
export function getDailySeed(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}
export function getModeSeed(mode, dateStr) {
  const base = getDailySeed(dateStr);
  let mh = 0;
  for (let i = 0; i < mode.length; i++) {
    mh = (mh << 5) - mh + mode.charCodeAt(i);
    mh = mh & mh;
  }
  return Math.abs(base ^ mh);
}

function seededRandom(seed) {
  let state = seed;
  return () => {
    let t = (state += 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mirror of lib/blindRankingGenerator.ts CATEGORIES (kept in lockstep so the
// e2e probe aligns on description). Every category ranks top-value-first; the
// old ascending "Cheapest First" category was removed.
const CATEGORIES = [
  { id: 'most_expensive', title: 'Most Expensive', description: 'Rank by market value · priciest first', sortField: 'market_value', dir: 'desc' },
  { id: 'peak_value', title: 'Peak Transfer Value', description: 'Rank by career peak value · highest first', sortField: 'peak_valuation_euros', dir: 'desc' },
  { id: 'most_famous', title: 'Most Famous', description: 'Rank by fame · most famous first', sortField: 'fame_score', dir: 'desc' },
];

function fieldValue(p, field) {
  if (field === 'market_value') return p.market_value;
  if (field === 'fame_score') return getFame(p)?.fame_score ?? 0;
  if (field === 'peak_valuation_euros') return getFame(p)?.peak_valuation ?? 0;
  return fameByNameMetrics.get(p.normalized_name || norm(p.name))?.metrics?.[field] ?? 0;
}

export function generateBlindRankingPuzzle(seed) {
  const rng = seededRandom(seed);
  const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];
  const pool = players.filter((p) => {
    const f = fameScore(p);
    return f !== undefined && f >= 65 && p.market_value >= 5_000_000 && isActive(p);
  });
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const seen = new Set();
  const picked = [];
  for (const p of shuffled) {
    if (picked.length >= 5) break;
    const v = fieldValue(p, category.sortField);
    if (v > 0 && !seen.has(v)) { seen.add(v); picked.push(p); }
  }
  const sorted = [...picked].sort((a, b) => {
    const va = fieldValue(a, category.sortField), vb = fieldValue(b, category.sortField);
    return category.dir === 'desc' ? vb - va : va - vb;
  });
  const correctOrder = sorted.map((p) => p.id);
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return {
    category,
    presented: picked.map((p) => p.name),
    // name -> zero-based correct slot index
    slotByName: Object.fromEntries(
      picked.map((p) => [p.name, correctOrder.indexOf(p.id)]),
    ),
  };
}

// ---- HigherLower exact queue (by id) ----
const WEEKLY_BANDS = {
  1: 'easy', 2: 'easy', 3: 'medium', 4: 'medium', 5: 'hard', 6: 'expert', 0: 'wildcard',
};
function bandFameOffset(label) {
  if (label === 'easy') return 5;
  if (label === 'hard') return -5;
  if (label === 'expert') return -10;
  return 0;
}
const PROGRESSION_TIERS = [
  { untilRound: 5, minFame: 80, gapRatio: 0.4 },
  { untilRound: 10, minFame: 70, gapRatio: 0.25 },
  { untilRound: 15, minFame: 60, gapRatio: 0.15 },
  { untilRound: 20, minFame: 50, gapRatio: 0.1 },
  { untilRound: Infinity, minFame: 35, gapRatio: 0.06 },
];
function progressionForRound(i) {
  i = Math.max(0, Math.floor(i));
  for (const t of PROGRESSION_TIERS) if (i < t.untilRound) return t;
  return PROGRESSION_TIERS[PROGRESSION_TIERS.length - 1];
}
function hlFilteredPlayers() {
  const all = players.filter((p) => p.market_value >= 1_000_000 && isActive(p));
  let f = all.filter((p) => { const fa = getFame(p)?.fame_score; return fa !== undefined && fa >= 30; });
  if (f.length < 200) f = all.filter((p) => { const fa = getFame(p)?.fame_score; return fa !== undefined && fa >= 20; });
  return f;
}
export function generatePlayerQueue(seed, count, offset) {
  const pool = hlFilteredPlayers();
  const rng = seededRandom(seed);
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  const queue = []; const used = new Set();
  for (let i = 0; i < count; i++) {
    const prog = progressionForRound(i);
    const last = queue.length ? queue[queue.length - 1].market_value : null;
    const floorStart = prog.minFame + offset;
    let pick = null;
    const gapOk = (mv) => last === null || Math.abs(mv - last) >= prog.gapRatio * last;
    for (let floor = floorStart; floor > -1 && !pick; floor -= 5) {
      for (const p of shuffled) { if (used.has(p.id)) continue; if ((fameScore(p) ?? 0) < floor) continue; if (!gapOk(p.market_value)) continue; pick = p; break; }
    }
    if (!pick) for (const p of shuffled) { if (used.has(p.id)) continue; if (last !== null && p.market_value === last) continue; pick = p; break; }
    if (!pick) break;
    used.add(pick.id); queue.push(pick);
  }
  return queue.map((p) => ({ id: p.id, name: p.name, mv: p.market_value }));
}
export function hlQueuesForDates(dates, count = 60) {
  return dates.map((d) => {
    const dt = new Date(d + 'T12:00:00');
    const offset = bandFameOffset(WEEKLY_BANDS[dt.getDay()]);
    return { date: d, offset, queue: generatePlayerQueue(getModeSeed('higherlower', d), count, offset) };
  });
}

// ---- Missing11 daily match + lineup ----
const matches = require('../../../data/matches_db.json');
function isPlayableMatch(m) {
  for (const names of [m.lineup_a_names, m.lineup_b_names]) {
    if (!names || names.length !== 11) return false;
    if (names.some((n) => !n || n.trim() === '')) return false;
    if (new Set(names.map((n) => n.toLowerCase().trim())).size !== 11) return false;
  }
  return true;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function seededShuffle(arr, salt) {
  const out = arr.slice(); const rand = mulberry32(salt);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
const ROTATION_SALT_MISSING11 = 0x2f9e2d3d;
const EPOCH = Date.UTC(2025, 0, 1);
export function getDailyNumber(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((utc - EPOCH) / 86400000);
}
export function missing11ForDate(dateStr) {
  const playable = matches.filter(isPlayableMatch);
  const pool = playable.length > 0 ? playable : matches;
  const dayIndex = getDailyNumber(dateStr);
  const shuffled = seededShuffle(pool, ROTATION_SALT_MISSING11);
  const len = shuffled.length;
  const match = shuffled[((Math.trunc(dayIndex) % len) + len) % len];
  const rng = seededRandom(getModeSeed('missing11', dateStr)); // NOTE: app uses createSeededRandom (mulberry32)
  return { dayIndex, match };
}
// The app's side pick uses createSeededRandom (mulberry32) from dailySeed, not the
// higherLower seededRandom. Reproduce it precisely:
export function missing11Side(dateStr) {
  const r = mulberry32(getModeSeed('missing11', dateStr))();
  return r < 0.5 ? 'a' : 'b';
}

// CLI: print blindranking puzzles for candidate dates
if (import.meta.url === `file://${process.argv[1]}`) {
  const dates = process.argv.slice(2);
  if (dates.length === 0) dates.push('2026-07-13', '2026-07-12', '2026-07-14');
  const out = dates.map((d) => ({ date: d, seed: getModeSeed('blindranking', d), puzzle: generateBlindRankingPuzzle(getModeSeed('blindranking', d)) }));
  console.log(JSON.stringify(out, null, 2));
}

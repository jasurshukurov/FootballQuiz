import { Player } from '@/types/player';
import { getAllPlayers, isActivePlayer, getFameForPlayer } from './playerData';
import { formatMarketValue } from './higherLowerGenerator';
import { getPlayerAge } from './dailyPuzzle';
import { getTodayDateString, seededShuffle } from './dailySeed';
import {
  bandForDate,
  filterByFameBand,
  resolveSkillTier,
  skillAdjustedBand,
} from './difficultyCurve';

// Every sort field maps to REAL, externally verifiable data (owner call
// 2026-07-15: no rankings over invented numbers). fame_score is still used
// below \u2014 but only to pick the difficulty band, never as a displayed ranking.
type SortField = 'market_value' | 'peak_valuation_euros' | 'age';

export interface RankingCategory {
  id: string;
  title: string;
  description: string;
  sortField: SortField;
  /**
   * Ranking is always top-value-first: #1 = the highest value for the field,
   * #5 = the lowest. Kept as a field (rather than hardcoded 'desc') so a future
   * category could invert without touching the sort code — but every shipped
   * category is 'desc' so orientation stays consistent across days.
   */
  sortDirection: 'asc' | 'desc';
  formatValue: (value: number) => string;
  /** Micro tag shown on slot #1 to anchor the top end (e.g. "Most expensive"). */
  topLabel: string;
  /** Micro tag shown on slot #5 to anchor the bottom end (e.g. "Cheapest"). */
  bottomLabel: string;
}

// Every category ranks top-value-first: #1 is the highest / most, #5 the lowest
// / fewest. Orientation never flips between days, so the player only has to learn
// the rule once. (The old ascending "Cheapest First" category was removed for
// exactly this reason.)
//
// FACTUAL DATA ONLY (owner calls 2026-07-15): removed 'highest_rating'
// ("Overall/FIFA Rating") and 'most_elite_exposure' ("International Caps") —
// both SYNTHESIZED by scripts/etl/generate_popularity_metrics.js — and then
// 'most_famous' (fame_score), which is our own composite index, not an
// external fact. Surviving categories rank real-world data: market_value
// (players_db), peak_valuation_euros (real MV/fees — the pool's
// isActivePlayer + MV floor excludes the retired players whose peaks were
// ETL-backfilled), and age (real DOBs in data/player_ages.json; players
// without a DOB drop out via the val<=0 rule in collectSpaced).
const CATEGORIES: RankingCategory[] = [
  {
    id: 'most_expensive',
    title: 'Most Expensive',
    description: 'Rank by market value · priciest first',
    sortField: 'market_value',
    sortDirection: 'desc',
    formatValue: formatMarketValue,
    topLabel: 'Most expensive',
    bottomLabel: 'Cheapest',
  },
  {
    id: 'peak_value',
    title: 'Peak Transfer Value',
    description: 'Rank by career peak value · highest first',
    sortField: 'peak_valuation_euros',
    sortDirection: 'desc',
    formatValue: formatMarketValue,
    topLabel: 'Highest peak',
    bottomLabel: 'Lowest peak',
  },
  {
    id: 'oldest',
    title: 'Oldest Player',
    description: 'Rank by age · oldest first',
    sortField: 'age',
    sortDirection: 'desc',
    formatValue: (v) => `${v} yrs`,
    topLabel: 'Oldest',
    bottomLabel: 'Youngest',
  },
];

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    let t = (state += 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getFieldValue(player: Player, field: SortField): number {
  if (field === 'market_value') return player.market_value;
  // id-based (disambiguated) join for the peak carried by fame_by_id.
  if (field === 'peak_valuation_euros') return getFameForPlayer(player)?.peak_valuation ?? 0;
  return getPlayerAge(player.id) ?? 0;
}

export interface BlindRankingPuzzle {
  category: RankingCategory;
  players: Player[];
  correctOrder: number[];
}

// Relative adjacent-value gaps tried in order. A ranking is only knowledge (not
// a coin flip) when neighbouring values are meaningfully apart, so we prefer a
// 5% separation and relax toward distinct-only if the pool can't fill 5 slots.
const GAP_LEVELS = [0.05, 0.03, 0.02, 0.01, 0] as const;

/**
 * Pick 5 players whose sort-field values are distinct AND spaced apart by at
 * least `gap` (relative). Returns fewer than 5 only when the pool is too thin.
 */
function collectSpaced(shuffled: Player[], field: SortField, gap: number): Player[] {
  const picked: Player[] = [];
  const vals: number[] = [];
  for (const p of shuffled) {
    if (picked.length >= 5) break;
    const val = getFieldValue(p, field);
    if (val <= 0) continue;
    if (vals.includes(val)) continue; // distinct-value rule
    if (gap > 0 && vals.some((v) => Math.abs(val - v) / Math.max(val, v) < gap)) continue;
    picked.push(p);
    vals.push(val);
  }
  return picked;
}

export function generateBlindRankingPuzzle(
  seed: number,
  dateStr: string = getTodayDateString(),
): BlindRankingPuzzle {
  const rng = seededRandom(seed);

  const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];

  // Weekly difficulty band: household names early week, deep cuts on the
  // weekend. A market-value floor keeps the "most expensive" category
  // meaningful; filterByFameBand widens the fame window if a band is too thin.
  const base = getAllPlayers().filter((p) => p.market_value >= 5_000_000 && isActivePlayer(p));
  // Skill tier (neutral 0 without play history) shifts the fame window by at
  // most one step; filterByFameBand still widens so the pool never starves.
  const band = skillAdjustedBand(bandForDate(dateStr), resolveSkillTier('blindranking'));
  const pool = filterByFameBand(base, band, (p) => getFameForPlayer(p)?.fame_score);

  const shuffled = seededShuffle(pool, rng);

  // Pick 5 with distinct, well-separated values (relaxing the gap only if the
  // pool can't otherwise fill 5).
  let picked: Player[] = [];
  for (const gap of GAP_LEVELS) {
    const attempt = collectSpaced(shuffled, category.sortField, gap);
    if (attempt.length === 5) {
      picked = attempt;
      break;
    }
    if (attempt.length > picked.length) picked = attempt;
  }

  // Compute correct ranking
  const sorted = [...picked].sort((a, b) => {
    const va = getFieldValue(a, category.sortField);
    const vb = getFieldValue(b, category.sortField);
    return category.sortDirection === 'desc' ? vb - va : va - vb;
  });
  const correctOrder = sorted.map((p) => p.id);

  // Shuffle presentation order
  const presented = seededShuffle(picked, rng);

  return { category, players: presented, correctOrder };
}

export interface RankingScore {
  /** 2 per exact-position player + 1 per off-by-one player (max 10). */
  points: number;
  exact: number;
  adjacent: number;
}

/**
 * Partial-credit scoring: exact position = 2, adjacent (off by one) = 1.
 * A null entry marks an unplaced slot (e.g. after a give-up) and scores
 * nothing — it is neither exact nor adjacent.
 */
export function scoreRanking(userRanking: (number | null)[], correctOrder: number[]): RankingScore {
  let exact = 0;
  let adjacent = 0;
  for (let i = 0; i < userRanking.length; i++) {
    const id = userRanking[i];
    if (id == null) continue; // unplaced slot: no credit
    const correctIdx = correctOrder.indexOf(id);
    if (correctIdx === i) exact++;
    else if (Math.abs(correctIdx - i) === 1) adjacent++;
  }
  return { points: exact * 2 + adjacent, exact, adjacent };
}

export type SlotStatus = 'exact' | 'adjacent' | 'wrong';

/** Per-slot reveal status matching {@link scoreRanking}. */
export function rankingSlotStatuses(userRanking: number[], correctOrder: number[]): SlotStatus[] {
  return userRanking.map((id, i) => {
    const correctIdx = correctOrder.indexOf(id);
    if (correctIdx === i) return 'exact';
    if (Math.abs(correctIdx - i) === 1) return 'adjacent';
    return 'wrong';
  });
}

/** Max attainable points (5 players × 2 for an all-exact ranking). */
export const MAX_RANKING_POINTS = 10;

export function getRevealValue(player: Player, category: RankingCategory): string {
  const val = getFieldValue(player, category.sortField);
  return category.formatValue(val);
}

/** Raw numeric value a player is ranked by for a category (for tests/tooling). */
export function rawRankingValue(player: Player, category: RankingCategory): number {
  return getFieldValue(player, category.sortField);
}

export { formatMarketValue };

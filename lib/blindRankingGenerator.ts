import { Player } from '@/types/player';
import { getAllPlayers, isActivePlayer, getFameForPlayer } from './playerData';
import { formatMarketValue } from './higherLowerGenerator';

// fame_scores.json is kept ONLY for the ranking metrics not present in
// fame_by_id.json (peak_game_rating, elite_exposure, wikipedia_pageviews).
// fame_score and peak_valuation are joined by id (disambiguated) instead.
const fameScoresData: FameEntry[] = require('@/data/fame_scores.json');

interface FameEntry {
  global_id: number;
  name: string;
  fame_score: number;
  difficulty_tier: string;
  is_modern: boolean;
  metrics: Record<string, number>;
}

const fameByName: Map<string, FameEntry> = new Map();
for (const entry of fameScoresData) {
  const norm = entry.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  fameByName.set(norm, entry);
}

type SortField =
  | 'market_value'
  | 'fame_score'
  | 'peak_game_rating'
  | 'peak_valuation_euros'
  | 'elite_exposure'
  | 'wikipedia_pageviews';

export interface RankingCategory {
  id: string;
  title: string;
  description: string;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  formatValue: (value: number) => string;
}

function formatRating(v: number): string {
  return `${Math.round(v)} OVR`;
}

function formatExposure(v: number): string {
  return `${Math.round(v)} caps`;
}

function formatFame(v: number): string {
  return v.toFixed(1);
}

const CATEGORIES: RankingCategory[] = [
  {
    id: 'most_expensive',
    title: 'Most Expensive',
    description: 'Rank by current market value (highest first)',
    sortField: 'market_value',
    sortDirection: 'desc',
    formatValue: formatMarketValue,
  },
  {
    id: 'cheapest',
    title: 'Cheapest First',
    description: 'Rank by current market value (lowest first)',
    sortField: 'market_value',
    sortDirection: 'asc',
    formatValue: formatMarketValue,
  },
  {
    id: 'highest_rating',
    title: 'FIFA Rating',
    description: 'Rank by peak FIFA/EAFC rating (highest first)',
    sortField: 'peak_game_rating',
    sortDirection: 'desc',
    formatValue: formatRating,
  },
  {
    id: 'peak_value',
    title: 'Peak Transfer Value',
    description: 'Rank by career peak valuation (highest first)',
    sortField: 'peak_valuation_euros',
    sortDirection: 'desc',
    formatValue: formatMarketValue,
  },
  {
    id: 'most_elite_exposure',
    // elite_exposure counts international caps, not club appearances —
    // the previous "Senior Club Appearances" label graded knowledgeable
    // players wrong.
    title: 'International Caps',
    description: 'Rank by international caps (most first)',
    sortField: 'elite_exposure',
    sortDirection: 'desc',
    formatValue: formatExposure,
  },
  {
    id: 'most_famous',
    title: 'Most Famous',
    description: 'Rank by overall fame score (highest first)',
    sortField: 'fame_score',
    sortDirection: 'desc',
    formatValue: formatFame,
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
  // id-based (disambiguated) for the two fields fame_by_id carries.
  if (field === 'fame_score') return getFameForPlayer(player)?.fame_score ?? 0;
  if (field === 'peak_valuation_euros') return getFameForPlayer(player)?.peak_valuation ?? 0;
  // remaining metrics only exist in fame_scores.json, joined by name.
  return fameByName.get(player.normalized_name)?.metrics[field] ?? 0;
}

export interface BlindRankingPuzzle {
  category: RankingCategory;
  players: Player[];
  correctOrder: number[];
}

export function generateBlindRankingPuzzle(seed: number): BlindRankingPuzzle {
  const rng = seededRandom(seed);

  const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];

  const allPlayers = getAllPlayers().filter((p) => {
    const fame = getFameForPlayer(p)?.fame_score;
    return fame !== undefined && fame >= 65 && p.market_value >= 5_000_000 && isActivePlayer(p);
  });

  // Shuffle
  const shuffled = [...allPlayers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Pick 5 players with distinct sort-field values
  const seen = new Set<number>();
  const picked: Player[] = [];
  for (const p of shuffled) {
    if (picked.length >= 5) break;
    const val = getFieldValue(p, category.sortField);
    if (val > 0 && !seen.has(val)) {
      seen.add(val);
      picked.push(p);
    }
  }

  // Compute correct ranking
  const sorted = [...picked].sort((a, b) => {
    const va = getFieldValue(a, category.sortField);
    const vb = getFieldValue(b, category.sortField);
    return category.sortDirection === 'desc' ? vb - va : va - vb;
  });
  const correctOrder = sorted.map((p) => p.id);

  // Shuffle presentation order
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }

  return { category, players: picked, correctOrder };
}

export function calculateScore(userRanking: number[], correctOrder: number[]): number {
  let score = 0;
  for (let i = 0; i < correctOrder.length; i++) {
    if (userRanking[i] === correctOrder[i]) score++;
  }
  return score;
}

export function getRevealValue(player: Player, category: RankingCategory): string {
  const val = getFieldValue(player, category.sortField);
  return category.formatValue(val);
}

export { formatMarketValue };

import { Player } from '@/types/player';
import { getAllPlayers } from './playerData';

const fameScoresData: FameEntry[] = require('@/data/fame_scores.json');

interface FameEntry {
  global_id: number;
  name: string;
  fame_score: number;
  difficulty_tier: string;
  is_modern: boolean;
  metrics: Record<string, number>;
}

// Build a lookup map from normalized name → fame entry
const fameByName: Map<string, FameEntry> = new Map();
for (const entry of fameScoresData) {
  const norm = entry.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  fameByName.set(norm, entry);
}

export function formatMarketValue(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const formatted =
      millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1).replace(/\.0$/, '');
    return `\u20AC${formatted}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    const formatted =
      thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1).replace(/\.0$/, '');
    return `\u20AC${formatted}K`;
  }
  return `\u20AC${value}`;
}

/** Returns the fame score for a player, or undefined if not found */
export function getFameScore(player: Player): number | undefined {
  return fameByName.get(player.normalized_name)?.fame_score;
}

/** Returns a difficulty label based on the player's fame score */
export function getPlayerDifficulty(player: Player): string {
  const score = getFameScore(player);
  if (score === undefined) return 'Expert';
  if (score >= 80) return 'Easy';
  if (score >= 50) return 'Medium';
  if (score >= 30) return 'Hard';
  return 'Expert';
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    let t = (state += 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getFilteredPlayers(): Player[] {
  const currentYear = new Date().getFullYear();
  const allPlayers = getAllPlayers().filter(
    (p) => p.market_value >= 1_000_000 && (p.last_season ?? 0) >= currentYear - 1,
  );

  // Try with fame_score >= 30 first
  let filtered = allPlayers.filter((p) => {
    const fame = fameByName.get(p.normalized_name);
    return fame !== undefined && fame.fame_score >= 30;
  });

  // If too few, lower threshold
  if (filtered.length < 200) {
    filtered = allPlayers.filter((p) => {
      const fame = fameByName.get(p.normalized_name);
      return fame !== undefined && fame.fame_score >= 20;
    });
  }

  return filtered;
}

export function generatePlayerQueue(seed: number, count: number): Player[] {
  const players = getFilteredPlayers();
  const rng = seededRandom(seed);

  // Fisher-Yates shuffle with seeded RNG
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

import { CareerPlayer, DifficultyTier } from '@/types/career';

const careerData = require('@/data/career_paths.json') as CareerPlayer[];

// Fame scores have the correct percentile-based difficulty tiers
const fameScores = require('@/data/fame_scores.json') as {
  name: string;
  difficulty_tier: string;
}[];

// Map fame_scores tier names ("Beginner", "Semi-Pro") to DifficultyTier type
const FAME_TIER_MAP: Record<string, DifficultyTier> = {
  'Beginner': 'beginner',
  'Amateur': 'amateur',
  'Semi-Pro': 'semi_pro',
  'Professional': 'professional',
  'World Class': 'world_class',
  'Legendary': 'legendary',
  'Ultimate': 'legendary',
};

// Invert quality tier to difficulty for players without fame data.
// "legendary" quality player = easiest to guess = "beginner" difficulty
const QUALITY_TO_DIFFICULTY: Record<DifficultyTier, DifficultyTier> = {
  'legendary': 'beginner',
  'world_class': 'amateur',
  'professional': 'semi_pro',
  'semi_pro': 'professional',
  'amateur': 'world_class',
  'beginner': 'legendary',
};

let cached: CareerPlayer[] | null = null;

function buildCache(): CareerPlayer[] {
  // Build fame lookup by normalized name
  const fameLookup = new Map<string, DifficultyTier>();
  for (const f of fameScores) {
    const normalized = f.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const mapped = FAME_TIER_MAP[f.difficulty_tier];
    if (mapped) fameLookup.set(normalized, mapped);
  }

  return careerData.map((p) => {
    const normalized = p.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const fameTier = fameLookup.get(normalized);
    const difficultyTier = fameTier ?? QUALITY_TO_DIFFICULTY[p.tier] ?? 'professional';

    return { ...p, tier: difficultyTier };
  });
}

export function getAllCareerPlayers(): CareerPlayer[] {
  if (!cached) cached = buildCache();
  return cached;
}

export function getCareerPlayersByTier(tier: DifficultyTier): CareerPlayer[] {
  return getAllCareerPlayers().filter((p) => p.tier === tier);
}

export function getRandomCareerPlayer(tier?: DifficultyTier): CareerPlayer {
  const pool = tier ? getCareerPlayersByTier(tier) : getAllCareerPlayers();
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getDailyCareerPlayer(dayNumber: number): CareerPlayer {
  const players = getAllCareerPlayers();
  return players[dayNumber % players.length];
}

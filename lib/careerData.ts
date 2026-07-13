import { CareerPlayer, DifficultyTier } from '@/types/career';
import { getDailyNumber } from './dailyPuzzle';
import { rotatingPick, ROTATION_SALT } from './dailyRotation';
import { getFameByName } from './playerData';

const careerData = require('@/data/career_paths.json') as CareerPlayer[];

/** Minimum career stints for a fair Career Path puzzle (need clubs to scramble). */
const MIN_CAREER_STINTS = 3;

// Map fame_scores tier names ("Beginner", "Semi-Pro") to DifficultyTier type
const FAME_TIER_MAP: Record<string, DifficultyTier> = {
  Beginner: 'beginner',
  Amateur: 'amateur',
  'Semi-Pro': 'semi_pro',
  Professional: 'professional',
  'World Class': 'world_class',
  Legendary: 'legendary',
  Ultimate: 'legendary',
};

// Invert quality tier to difficulty for players without fame data.
// "legendary" quality player = easiest to guess = "beginner" difficulty
const QUALITY_TO_DIFFICULTY: Record<DifficultyTier, DifficultyTier> = {
  legendary: 'beginner',
  world_class: 'amateur',
  professional: 'semi_pro',
  semi_pro: 'professional',
  amateur: 'world_class',
  beginner: 'legendary',
};

let cached: CareerPlayer[] | null = null;

function buildCache(): CareerPlayer[] {
  // career_paths ids don't match players_db ids, so join fame by NAME via the
  // shared helper (id-derived/disambiguated where players_db has the player,
  // fame_scores fallback otherwise).
  return careerData.map((p) => {
    const fame = getFameByName(p.name);
    const fameTier = fame ? FAME_TIER_MAP[fame.difficulty_tier] : undefined;
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
  const pool = getGuessableCareerPlayers(tier);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getDailyCareerPlayer(dayNumber: number): CareerPlayer {
  const players = getAllCareerPlayers();
  return players[dayNumber % players.length];
}

/** Players with enough career stints to make a real scramble puzzle. */
export function getGuessableCareerPlayers(tier?: DifficultyTier): CareerPlayer[] {
  const pool = tier ? getCareerPlayersByTier(tier) : getAllCareerPlayers();
  const filtered = pool.filter((p) => (p.career?.length ?? 0) >= MIN_CAREER_STINTS);
  // Never let the length filter empty the pool (would crash the daily).
  return filtered.length > 0 ? filtered : pool;
}

/**
 * Deterministic no-repeat daily pick, indexed by absolute day number so the
 * same player never recurs until the pool cycles. Exposed for tests / QA with
 * an explicit day index.
 */
export function getCareerPlayerForDay(dayIndex: number, tier?: DifficultyTier): CareerPlayer {
  const pool = getGuessableCareerPlayers(tier);
  return rotatingPick(pool, dayIndex, ROTATION_SALT.careerPath);
}

/**
 * Deterministically pick today's Career Path player. The `seed` argument
 * (getModeSeed('careerpath')) is retained for call-site compatibility and to
 * feed the scramble RNG; player SELECTION uses the day-index rotation so it is
 * repeat-free and difficulty-safe (>= 3 stints). Career Path only ever runs for
 * "today" (Play Again uses getRandomCareerPlayer), so deriving the day here is safe.
 */
export function getSeededCareerPlayer(_seed: number, tier?: DifficultyTier): CareerPlayer {
  return getCareerPlayerForDay(getDailyNumber(), tier);
}

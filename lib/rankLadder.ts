/**
 * Universal rank ladder — one emotionally-loaded result language for all modes
 * (Spelling Bee model: partial results still feel like winning, and the next
 * rank is always visible).
 *
 * Score-based modes call getRank(score, max); streak modes call getStreakRank.
 */

export interface Rank {
  /** Football-flavored label, e.g. "World Class". */
  label: string;
  /** 0-based index into the ladder (higher = better). */
  tier: number;
  /** Next label up, or null at the top. */
  nextLabel: string | null;
  /** Points/answers/streak still needed to reach nextLabel (0 at the top). */
  toNext: number;
}

const LADDER = [
  { label: 'Kickoff', minPct: 0 },
  { label: 'Squad Rotation', minPct: 0.25 },
  { label: 'First Team', minPct: 0.5 },
  { label: 'Captain', minPct: 0.7 },
  { label: 'World Class', minPct: 0.85 },
  { label: 'Ballon d’Or', minPct: 1 },
] as const;

/** Rank for a bounded score (0..max). Perfect score = Ballon d’Or. */
export function getRank(score: number, max: number): Rank {
  if (max <= 0) return { label: LADDER[0].label, tier: 0, nextLabel: LADDER[1].label, toNext: 1 };
  const pct = Math.max(0, Math.min(1, score / max));
  let tier = 0;
  for (let i = LADDER.length - 1; i >= 0; i--) {
    if (pct >= LADDER[i].minPct) {
      tier = i;
      break;
    }
  }
  const next = tier + 1 < LADDER.length ? LADDER[tier + 1] : null;
  return {
    label: LADDER[tier].label,
    tier,
    nextLabel: next?.label ?? null,
    toNext: next ? Math.max(1, Math.ceil(next.minPct * max) - score) : 0,
  };
}

const STREAK_TIERS = [
  { label: 'Kickoff', min: 0 },
  { label: 'Squad Rotation', min: 3 },
  { label: 'First Team', min: 6 },
  { label: 'Captain', min: 10 },
  { label: 'World Class', min: 15 },
  { label: 'Ballon d’Or', min: 21 },
] as const;

/** Rank for an unbounded streak (Higher/Lower, Market Movers). */
export function getStreakRank(streak: number): Rank {
  let tier = 0;
  for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
    if (streak >= STREAK_TIERS[i].min) {
      tier = i;
      break;
    }
  }
  const next = tier + 1 < STREAK_TIERS.length ? STREAK_TIERS[tier + 1] : null;
  return {
    label: STREAK_TIERS[tier].label,
    tier,
    nextLabel: next?.label ?? null,
    toNext: next ? next.min - streak : 0,
  };
}

/** Streak milestones that earn an escalating celebration (haptic + confetti). */
export const STREAK_MILESTONES = [5, 10, 15, 21] as const;

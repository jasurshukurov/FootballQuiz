/**
 * Deterministic no-repeat daily rotation shared by the "one puzzle per day"
 * modes (Who Are Ya, Missing XI, Career Path, Career Timeline).
 *
 * Instead of `seededRandom(dayNumber) * pool.length` — which collides
 * (birthday-paradox) and repeats targets within weeks — we shuffle the pool
 * once with a FIXED constant salt and then walk it by absolute day index.
 * The same day yields the same item for every player, and no item repeats
 * until the whole pool has been consumed (`pool.length` days).
 *
 * Each mode passes a distinct salt so the modes don't rotate in lockstep.
 */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fixed-salt Fisher-Yates. Same (arr order, salt) always yields the same shuffle. */
export function seededShuffle<T>(arr: readonly T[], salt: number): T[] {
  const out = arr.slice();
  const rand = mulberry32(salt);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick the item for a given absolute day index from a fixed shuffle of the pool.
 * Consecutive day indices never repeat until `pool.length` days have elapsed.
 * `salt` must be a stable per-mode constant so the rotation is reproducible.
 */
export function rotatingPick<T>(pool: readonly T[], dayIndex: number, salt: number): T {
  if (pool.length === 0) throw new Error('rotatingPick: empty pool');
  const shuffled = seededShuffle(pool, salt);
  const len = shuffled.length;
  const idx = ((Math.trunc(dayIndex) % len) + len) % len;
  return shuffled[idx];
}

/** Stable per-mode salts (arbitrary fixed primes — never change these). */
export const ROTATION_SALT = {
  whoAreYa: 0x51ed270b,
  missing11: 0x2f9e2d3d,
  careerPath: 0x1b873593,
  careerTimeline: 0x7feb352d,
} as const;

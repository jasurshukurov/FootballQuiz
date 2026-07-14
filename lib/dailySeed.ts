/**
 * Centralized daily seed generation for all game modes.
 * Based on date string (YYYY-MM-DD) so every player globally gets the same puzzles.
 */

export function getDailySeed(dateStr?: string): number {
  const date = dateStr ?? getTodayDateString();
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    const char = date.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Per-mode seeds add an offset so different modes get different results from the same date.
 */
export function getModeSeed(mode: string, dateStr?: string): number {
  const baseSeed = getDailySeed(dateStr);
  let modeHash = 0;
  for (let i = 0; i < mode.length; i++) {
    modeHash = (modeHash << 5) - modeHash + mode.charCodeAt(i);
    modeHash = modeHash & modeHash;
  }
  return Math.abs(baseSeed ^ modeHash);
}

/** Formats a Date as YYYY-MM-DD using its LOCAL calendar parts (Wordle-style),
 *  so the daily rollover happens at the player's local midnight rather than UTC. */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayDateString(): string {
  return formatLocalDate(new Date());
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

/**
 * Seeded pseudo-random number generator (mulberry32). Returns a function that
 * yields deterministic values in [0, 1) for a given seed, so board shuffles and
 * random picks can be reproduced identically for every player on a given day.
 */
export function createSeededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Unbiased seeded Fisher-Yates shuffle (returns a new array). Use this instead
 * of `arr.sort(() => rng() - 0.5)` — a random comparator is biased and its
 * output depends on the engine's sort algorithm.
 */
export function seededShuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

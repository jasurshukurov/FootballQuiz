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

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

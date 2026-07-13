import { CareerEntry } from '@/types/career';

/** Fisher-Yates shuffle that guarantees a different order */
export function scrambleCareer(career: CareerEntry[]): CareerEntry[] {
  if (career.length <= 1) return [...career];

  const shuffled = [...career];
  let isSameOrder = true;

  while (isSameOrder) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    isSameOrder = shuffled.every((entry, idx) => entry.club === career[idx].club);
  }

  return shuffled;
}

/** Small deterministic PRNG so a given seed always produces the same shuffle. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher-Yates shuffle that guarantees a different order (deterministic per seed). */
export function scrambleCareerSeeded(career: CareerEntry[], seed: number): CareerEntry[] {
  if (career.length <= 1) return [...career];

  let attempt = 0;
  while (true) {
    const rand = mulberry32(seed + attempt);
    const shuffled = [...career];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const isSameOrder = shuffled.every((entry, idx) => entry.club === career[idx].club);
    if (!isSameOrder) return shuffled;
    attempt++;
  }
}

/** Normalize a player name for comparison (strips diacritics) */
export function normalizeGuess(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Check if a guess matches a player name */
export function isCorrectGuess(
  guess: string,
  targetName: string,
  targetNormalized: string,
): boolean {
  const normalizedGuess = normalizeGuess(guess);
  return normalizedGuess === targetNormalized || normalizedGuess === normalizeGuess(targetName);
}

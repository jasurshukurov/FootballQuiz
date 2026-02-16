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

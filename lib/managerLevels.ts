export interface ManagerLevel {
  level: number;
  title: string;
  xpRequired: number;
}

const TITLES: Record<number, string> = {
  1: 'Intern',
  5: 'Youth Coach',
  10: 'Scout',
  15: 'Assistant Manager',
  20: 'Caretaker Manager',
  25: 'Manager',
  30: 'Head Coach',
  35: 'Director of Football',
  40: 'Legendary Manager',
  45: 'Hall of Famer',
  50: 'The Special One',
};

export function getXpForLevel(level: number): number {
  return Math.floor(50 * level * (level - 1));
}

function getTitleForLevel(level: number): string {
  let title = 'Intern';
  for (const [threshold, name] of Object.entries(TITLES)) {
    if (level >= Number(threshold)) {
      title = name;
    }
  }
  return title;
}

export function getLevelForXp(totalXp: number): ManagerLevel {
  let level = 1;
  while (getXpForLevel(level + 1) <= totalXp) {
    level++;
  }
  return {
    level,
    title: getTitleForLevel(level),
    xpRequired: getXpForLevel(level),
  };
}

export function getProgressToNextLevel(totalXp: number): {
  current: number;
  next: number;
  progress: number;
} {
  const { level } = getLevelForXp(totalXp);
  const current = getXpForLevel(level);
  const next = getXpForLevel(level + 1);
  const range = next - current;
  const progress = range > 0 ? (totalXp - current) / range : 0;
  return { current, next, progress: Math.min(Math.max(progress, 0), 1) };
}

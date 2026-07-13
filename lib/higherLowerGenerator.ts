import { Player } from '@/types/player';
import { getAllPlayers, isActivePlayer, getFameForPlayer } from './playerData';
import { bandForDate, bandFameOffset, progressionForRound } from './difficultyCurve';
import { getTodayDateString } from './dailySeed';

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
  return getFameForPlayer(player)?.fame_score;
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
  const allPlayers = getAllPlayers().filter(
    (p) => p.market_value >= 1_000_000 && isActivePlayer(p),
  );

  // Try with fame_score >= 30 first
  let filtered = allPlayers.filter((p) => {
    const fame = getFameForPlayer(p)?.fame_score;
    return fame !== undefined && fame >= 30;
  });

  // If too few, lower threshold
  if (filtered.length < 200) {
    filtered = allPlayers.filter((p) => {
      const fame = getFameForPlayer(p)?.fame_score;
      return fame !== undefined && fame >= 20;
    });
  }

  return filtered;
}

/**
 * Build the Higher/Lower queue with an IN-SESSION difficulty ramp: round i pulls
 * a challenger whose fame >= progressionForRound(i).minFame (offset by the day's
 * band) and whose value differs from the previous card by >= that round's gap
 * ratio. Early rounds are famous players with obvious gaps; later rounds get
 * obscure with tight (but always decisive) gaps. Fame floors widen gracefully so
 * a tier can never starve the queue.
 *
 * `fameOffset` defaults to the current day's band offset; pass an explicit value
 * for deterministic tests / the QA sim.
 */
export function generatePlayerQueue(seed: number, count: number, fameOffset?: number): Player[] {
  const players = getFilteredPlayers();
  const rng = seededRandom(seed);

  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const offset = fameOffset ?? bandFameOffset(bandForDate(getTodayDateString()));

  const queue: Player[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    const prog = progressionForRound(i);
    const last = queue.length > 0 ? queue[queue.length - 1].market_value : null;
    const pick = pickNextByProgression(
      shuffled,
      used,
      prog.minFame + offset,
      prog.maxFame,
      last,
      prog.gapRatio,
    );
    if (!pick) break; // pool exhausted
    used.add(pick.id);
    queue.push(pick);
  }

  return queue;
}

/**
 * Find the next unused player within a fame band [floor, cap] and value-gap.
 * Widens the fame FLOOR downward in 5-point steps if the slice is too thin
 * (keeping the cap fixed so deep rounds never resurface household names), then
 * relaxes the gap as a last resort (never an equal-value pair).
 */
function pickNextByProgression(
  shuffled: Player[],
  used: Set<number>,
  fameFloor: number,
  fameCap: number | undefined,
  lastValue: number | null,
  gapRatio: number,
): Player | null {
  const cap = fameCap ?? Infinity;
  const gapOk = (mv: number) =>
    lastValue === null || Math.abs(mv - lastValue) >= gapRatio * lastValue;
  for (let floor = fameFloor; floor > -1; floor -= 5) {
    for (const p of shuffled) {
      if (used.has(p.id)) continue;
      const fame = getFameScore(p) ?? 0;
      if (fame < floor || fame > cap) continue;
      if (!gapOk(p.market_value)) continue;
      return p;
    }
  }
  // Relax the gap; still respect the cap, and never an equal value.
  for (const p of shuffled) {
    if (used.has(p.id)) continue;
    if ((getFameScore(p) ?? 0) > cap) continue;
    if (lastValue !== null && p.market_value === lastValue) continue;
    return p;
  }
  // Absolute last resort (cap-respecting slice exhausted): any non-equal value.
  for (const p of shuffled) {
    if (used.has(p.id)) continue;
    if (lastValue !== null && p.market_value === lastValue) continue;
    return p;
  }
  return null;
}

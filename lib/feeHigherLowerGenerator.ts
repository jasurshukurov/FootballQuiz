// ⚠️ DEPRECATED MODE — Market Movers (2026-07). The mode was removed from the
// product surface (lib/modeRegistry.ts) because it duplicated Higher/Lower's
// binary loop; fee knowledge is covered by Transfer Agent. This generator and
// its unit tests are kept compiling for possible revival — see the header of
// app/(tabs)/marketmovers.tsx for the full revival checklist.
//
// Generator for "Market Movers" — a transfer-fee Higher/Lower game.
// Reads data/transfers.json (records with numeric €m/€k fees) and builds a
// deterministic queue of transfer "moves" where consecutive fees differ enough
// that every Higher/Lower guess is decisive.

import {
  bandForDate,
  bandFameOffset,
  progressionForRound,
  resolveSkillTier,
} from './difficultyCurve';
import { getTodayDateString } from './dailySeed';
import { getFameByName } from './playerData';

interface RawTransferStint {
  club_name: string;
  club_id: string;
  date_joined: string | null;
  date_left: string | null;
  fee: string | null;
}

interface RawTransferPlayer {
  player_id: number;
  player_name: string;
  transfers: RawTransferStint[];
}

const transfersData = require('@/data/transfers.json') as RawTransferPlayer[];

/** Minimum relative gap between consecutive fees so a guess is never a coin-flip. */
export const MIN_FEE_GAP = 0.1;

// transfers.json carries player NAMES (its player_id is a transfermarkt id, not
// a players_db id), so fame is joined by name via the shared helper — which
// derives from the disambiguated fame_by_id map where players_db has the player.
function moveFame(m: FeeTransfer): number {
  return getFameByName(m.playerName)?.fame_score ?? 0;
}
function moveKey(m: FeeTransfer): string {
  return `${m.playerName}|${m.fromClub}|${m.toClub}|${m.year}`;
}
/** Two fees differ by at least `ratio` (relative). */
function decisiveWith(a: number, b: number, ratio: number): boolean {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return lo > 0 && (hi - lo) / lo >= ratio;
}

export interface FeeTransfer {
  playerName: string;
  fromClub: string;
  toClub: string;
  year: number;
  /** Fee in euros. */
  fee: number;
  /** Original display string, e.g. "€94m". */
  feeDisplay: string;
}

/** Parse a fee string like "€94m" / "€3.5m" / "€900k" into euros. Returns null
 *  for non-numeric fees ("Free", "Loan", null). */
function parseFee(fee: string | null): number | null {
  if (!fee) return null;
  const match = fee.match(/€\s*([\d.]+)\s*([mk])/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return null;
  return match[2].toLowerCase() === 'm' ? value * 1_000_000 : value * 1_000;
}

let cachedMoves: FeeTransfer[] | null = null;

/** All transfer moves (joining a club for a numeric fee, with a known previous
 *  club). Deduplicated and stable in file order. */
export function getAllFeeMoves(): FeeTransfer[] {
  if (cachedMoves) return cachedMoves;

  const moves: FeeTransfer[] = [];
  const seen = new Set<string>();

  for (const player of transfersData) {
    if (!Array.isArray(player.transfers)) continue;
    for (let i = 1; i < player.transfers.length; i++) {
      const stint = player.transfers[i];
      const fee = parseFee(stint.fee);
      if (fee == null || fee <= 0) continue;
      if (!stint.date_joined) continue;

      const fromClub = player.transfers[i - 1].club_name;
      const toClub = stint.club_name;
      const year = parseInt(stint.date_joined.slice(0, 4), 10);
      if (!fromClub || !toClub || Number.isNaN(year)) continue;

      const key = `${player.player_name}|${fromClub}|${toClub}|${year}`;
      if (seen.has(key)) continue;
      seen.add(key);

      moves.push({
        playerName: player.player_name,
        fromClub,
        toClub,
        year,
        fee,
        feeDisplay: stint.fee as string,
      });
    }
  }

  cachedMoves = moves;
  return moves;
}

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

function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Two fees are "decisive" if they differ by at least MIN_FEE_GAP (relative). */
export function feesAreDecisive(a: number, b: number): boolean {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (lo <= 0) return false;
  return (hi - lo) / lo >= MIN_FEE_GAP;
}

/**
 * Build a deterministic queue of transfer moves with an IN-SESSION difficulty
 * ramp: round i features a player whose fame >= progressionForRound(i).minFame
 * (widening if a tier is thin) and a fee gap >= that round's ratio (floored at
 * MIN_FEE_GAP so every guess stays decisive). Early rounds are famous players
 * with big gaps; later rounds obscure moves with tight gaps.
 *
 * `startRound` continues the ramp when the screen extends the queue mid-run
 * (pass the current queue length), so difficulty keeps rising instead of
 * resetting to "easy". `prevTailFee` is the fee of the previous queue's last
 * move, threaded in so the seam pair (old tail vs new head) is gap-checked like
 * any other consecutive pair rather than risking a coin-flip at the join.
 *
 * `fameOffset` defaults to the current day's band offset (easy days skew more
 * famous, expert days more obscure); pass an explicit value for deterministic
 * tests.
 */
export function generateFeeQueue(
  seed: number,
  size = 100,
  startRound = 0,
  fameOffset?: number,
  prevTailFee?: number | null,
): FeeTransfer[] {
  const rand = mulberry32(seed);
  const shuffled = seededShuffle(getAllFeeMoves(), rand);
  const offset = fameOffset ?? bandFameOffset(bandForDate(getTodayDateString()));
  // Per-user skill tier (neutral 0 without play history) steepens/softens the
  // in-session ramp by at most one step.
  const skillTier = resolveSkillTier('marketmovers');

  const queue: FeeTransfer[] = [];
  const usedMoves = new Set<string>();
  const usedPlayers = new Set<string>();

  for (let k = 0; k < size; k++) {
    const round = startRound + k;
    const prog = progressionForRound(round, skillTier);
    const cap = prog.maxFame ?? Infinity;
    const gap = Math.max(prog.gapRatio, MIN_FEE_GAP);
    const prevFee = queue.length > 0 ? queue[queue.length - 1].fee : (prevTailFee ?? null);

    // Widen the fame FLOOR downward if the slice is thin, but keep the cap fixed
    // so deep rounds never resurface household names.
    let pick: FeeTransfer | null = null;
    for (let floor = prog.minFame + offset; floor > -1 && !pick; floor -= 5) {
      for (const m of shuffled) {
        if (usedMoves.has(moveKey(m))) continue;
        if (round < 20 && usedPlayers.has(m.playerName)) continue;
        const fame = moveFame(m);
        if (fame < floor || fame > cap) continue;
        if (prevFee !== null && !decisiveWith(prevFee, m.fee, gap)) continue;
        pick = m;
        break;
      }
    }
    // Last resort: relax the gap but keep the cap and a decisive (fees differ) guess.
    if (!pick) {
      for (const m of shuffled) {
        if (usedMoves.has(moveKey(m))) continue;
        if (moveFame(m) > cap) continue;
        if (prevFee !== null && m.fee === prevFee) continue;
        pick = m;
        break;
      }
    }
    // Absolute last resort (capped slice exhausted): any distinct-fee move.
    if (!pick) {
      for (const m of shuffled) {
        if (usedMoves.has(moveKey(m))) continue;
        if (prevFee !== null && m.fee === prevFee) continue;
        pick = m;
        break;
      }
    }
    if (!pick) break;

    queue.push(pick);
    usedMoves.add(moveKey(pick));
    usedPlayers.add(pick.playerName);
  }

  return queue;
}

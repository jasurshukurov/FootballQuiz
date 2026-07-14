import { getAllTransferHistories } from '@/lib/transferData';
import { Transfer } from '@/types/transfer';
import { getFameByName } from '@/lib/playerData';
import { getTodayDateString } from '@/lib/dailySeed';
import {
  bandForDate,
  bandFameOffset,
  progressionForRound,
  filterByFameBand,
  resolveSkillTier,
  FameBand,
} from '@/lib/difficultyCurve';

// Disambiguated fame join by name (getFameByName) gates the answer player's
// difficulty. Raw fame_scores.json (name-keyed, no namesake disambiguation) is
// intentionally NOT used — an obscure namesake of a star must not inherit the
// star's fame and slip into an "easy" round.

export interface AgentRoundOption {
  playerId: number;
  playerName: string;
  /** The option's own highest verified transfer fee (for teach-on-miss). */
  fee: string;
  clubFrom: string;
  clubTo: string;
}

export interface AgentRound {
  targetFee: string;
  correctPlayerId: number;
  correctPlayerName: string;
  correctClubFrom: string;
  correctClubTo: string;
  options: AgentRoundOption[];
}

export function parseFeeToNumber(fee: string): number {
  const cleaned = fee.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  if (fee.toLowerCase().includes('m')) return num * 1_000_000;
  if (fee.toLowerCase().includes('k')) return num * 1_000;
  return num;
}

function isValidFee(fee: string | null): boolean {
  if (!fee) return false;
  const lower = fee.toLowerCase();
  if (
    lower === 'free transfer' ||
    lower === 'loan' ||
    lower === 'end of loan' ||
    lower.includes('free') ||
    lower.includes('loan') ||
    lower === '-' ||
    lower === '?'
  )
    return false;
  return parseFeeToNumber(fee) > 0;
}

function getHighestFeeTransfer(
  transfers: Transfer[],
  minIndex = 0,
): { transfer: Transfer; index: number } | null {
  let best: Transfer | null = null;
  let bestVal = 0;
  let bestIdx = -1;
  for (let i = minIndex; i < transfers.length; i++) {
    const t = transfers[i];
    if (!isValidFee(t.fee)) continue;
    const val = parseFeeToNumber(t.fee!);
    if (val > bestVal) {
      bestVal = val;
      best = t;
      bestIdx = i;
    }
  }
  if (!best) return null;
  return { transfer: best, index: bestIdx };
}

/** True if any of the player's valid-fee transfers is within 1% of `feeVal`. */
function hasTransferNearFee(transfers: Transfer[], feeVal: number): boolean {
  return transfers.some(
    (t) => isValidFee(t.fee) && Math.abs(parseFeeToNumber(t.fee!) - feeVal) < feeVal * 0.01,
  );
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffleArray<T>(arr: T[], rand: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type TransferHistory = ReturnType<typeof getAllTransferHistories>[number];

/** Build an option (with its own headline transfer) for teach-on-miss. */
function buildOption(
  p: TransferHistory,
  best: { transfer: Transfer; index: number },
): AgentRoundOption {
  const clubTo = best.transfer.club_name;
  const clubFrom = best.index > 0 ? p.transfers[best.index - 1].club_name : 'Unknown';
  return {
    playerId: p.player_id,
    playerName: p.player_name,
    fee: best.transfer.fee!,
    clubFrom,
    clubTo,
  };
}

/**
 * Generate one round.
 *
 * Difficulty comes from the ANSWER player's fame (the shared weekly curve),
 * NOT from distractor-fee "spacing" — fees are hidden from the player, so
 * spacing them is invisible difficulty. `gapRatio` only guarantees the
 * distractors' own headline fees are far enough from the target that a lucky
 * "they look similar" guess isn't rewarded, and the 1% exact-fee guard rejects
 * a distractor that shares the target fee (a second valid answer).
 */
export function generateAgentRound(
  seed: number,
  round: number,
  minFame = 0,
  maxFame?: number,
  gapRatio = 0.05,
): AgentRound | null {
  const rand = seededRandom(seed * 1000 + round * 137);
  const allPlayers = getAllTransferHistories();

  // Filter players with valid fee transfers
  const playersWithFees = allPlayers.filter((p) => p.transfers.some((t) => isValidFee(t.fee)));

  if (playersWithFees.length < 3) return null;

  // The CORRECT (answer) player is fame-gated by the round's difficulty band;
  // filterByFameBand widens symmetrically if the tier is too thin so a narrow
  // band never empties the pool. Distractors are drawn from the full pool.
  let correctPool = playersWithFees;
  if (minFame > 0 || maxFame !== undefined) {
    const band: FameBand = { min: minFame, max: maxFame ?? 101, label: 'medium' };
    correctPool = filterByFameBand(
      playersWithFees,
      band,
      (p) => getFameByName(p.player_name)?.fame_score,
      5,
    );
  }

  // Feature a transfer with a KNOWN origin club (index > 0) so the hint never
  // reads "Unknown -> club".
  const shuffledCorrect = shuffleArray(correctPool, rand);
  let correct: TransferHistory | null = null;
  let best: { transfer: Transfer; index: number } | null = null;
  for (const c of shuffledCorrect) {
    const b = getHighestFeeTransfer(c.transfers, 1);
    if (b) {
      correct = c;
      best = b;
      break;
    }
  }
  if (!correct || !best) return null;

  const correctFeeVal = parseFeeToNumber(best.transfer.fee!);

  // Pick 2 wrong options whose headline fees are far from the target and which
  // were never transferred for the exact target fee (that would be a second
  // valid answer). Distractor fame is unconstrained — difficulty lives in the
  // answer, not the distractors.
  const shuffled = shuffleArray(playersWithFees, rand);
  const wrongOptions: AgentRoundOption[] = [];
  for (let i = 0; i < shuffled.length && wrongOptions.length < 2; i++) {
    const candidate = shuffled[i];
    if (candidate.player_id === correct.player_id) continue;
    const candidateBest = getHighestFeeTransfer(candidate.transfers);
    if (!candidateBest) continue;
    const candidateFeeVal = parseFeeToNumber(candidateBest.transfer.fee!);
    // Headline fees must be spaced apart...
    if (Math.abs(candidateFeeVal - correctFeeVal) < correctFeeVal * gapRatio) continue;
    // ...AND the distractor must not have been transferred for the exact target
    // fee in ANY of its moves (that would be a second valid answer).
    if (hasTransferNearFee(candidate.transfers, correctFeeVal)) continue;
    wrongOptions.push(buildOption(candidate, candidateBest));
  }

  if (wrongOptions.length < 2) return null;

  // Determine club from/to based on transfer context
  const transferIdx = best.index;
  const clubTo = best.transfer.club_name;
  const clubFrom = transferIdx > 0 ? correct.transfers[transferIdx - 1].club_name : 'Unknown';

  const options: AgentRoundOption[] = shuffleArray(
    [buildOption(correct, best), ...wrongOptions],
    rand,
  );

  return {
    targetFee: best.transfer.fee!,
    correctPlayerId: correct.player_id,
    correctPlayerName: correct.player_name,
    correctClubFrom: clubFrom,
    correctClubTo: clubTo,
    options,
  };
}

/**
 * Build the 10-round daily game.
 *
 * @param seedInput numeric string used purely as the RNG seed (mode seed on the
 *   daily run, Date.now() on Play Again).
 * @param dateStr   local YYYY-MM-DD, drives the weekly difficulty band. Defaults
 *   to today so Play Again keeps the same day's band.
 */
export function generateDailyAgentGame(
  seedInput: string,
  dateStr: string = getTodayDateString(),
): AgentRound[] {
  // Create a seed from the seed-input string
  let seed = 0;
  for (let i = 0; i < seedInput.length; i++) {
    seed = (seed * 31 + seedInput.charCodeAt(i)) % 2147483647;
  }

  const band = bandForDate(dateStr);
  const offset = bandFameOffset(band);
  // Per-user skill tier (neutral 0 without play history) steepens/softens the
  // round ramp by at most one step.
  const skillTier = resolveSkillTier('agent');

  const rounds: AgentRound[] = [];
  let attempt = 0;
  while (rounds.length < 10 && attempt < 120) {
    // Difficulty ramps by round via the shared progression curve: famous
    // answers early, obscure late. The daily band nudges the whole curve
    // (easier Monday, harder Saturday).
    const pos = rounds.length;
    const prog = progressionForRound(pos, skillTier);
    const minFame = Math.max(0, prog.minFame + offset);
    const maxFame = prog.maxFame;
    const round = generateAgentRound(seed + attempt * 7, pos, minFame, maxFame, prog.gapRatio);
    if (round) {
      // Avoid duplicate correct players
      const alreadyUsed = rounds.some((r) => r.correctPlayerId === round.correctPlayerId);
      if (!alreadyUsed) {
        rounds.push(round);
      }
    }
    attempt++;
  }

  return rounds;
}

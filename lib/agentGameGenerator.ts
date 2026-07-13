import { getAllTransferHistories } from '@/lib/transferData';
import { Transfer } from '@/types/transfer';

// fame_score join by normalized player name for the in-session difficulty ramp.
const fameScoresData = require('@/data/fame_scores.json') as {
  name: string;
  fame_score: number;
}[];
const normName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const fameByName = new Map<string, number>();
for (const e of fameScoresData) fameByName.set(normName(e.name), e.fame_score);
function playerFame(name: string): number {
  return fameByName.get(normName(name)) ?? 0;
}

export interface AgentRoundOption {
  playerId: number;
  playerName: string;
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

export function generateAgentRound(
  seed: number,
  round: number,
  minFame = 0,
  spacing = 0.05,
): AgentRound | null {
  const rand = seededRandom(seed * 1000 + round * 137);
  const allPlayers = getAllTransferHistories();

  // Filter players with valid fee transfers
  const playersWithFees = allPlayers.filter((p) => p.transfers.some((t) => isValidFee(t.fee)));

  if (playersWithFees.length < 3) return null;

  // The CORRECT (answer) player is fame-gated by the round's difficulty; widen
  // if the tier is too thin. Distractors are drawn from the full pool.
  let correctPool = playersWithFees;
  if (minFame > 0) {
    for (let floor = minFame; floor > 0; floor -= 10) {
      const pool = playersWithFees.filter((p) => playerFame(p.player_name) >= floor);
      if (pool.length >= 5) {
        correctPool = pool;
        break;
      }
    }
  }

  // Feature a transfer with a KNOWN origin club (index > 0) so the hint never
  // reads "Unknown -> club".
  const shuffledCorrect = shuffleArray(correctPool, rand);
  let correct: (typeof shuffledCorrect)[number] | null = null;
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

  // Pick 2 wrong options whose fees can't be confused with the target. Fee
  // spacing tightens on later rounds (via `spacing`); the exact-fee ambiguity
  // rejection is always enforced.
  const shuffled = shuffleArray(playersWithFees, rand);
  const wrongOptions: AgentRoundOption[] = [];
  for (let i = 0; i < shuffled.length && wrongOptions.length < 2; i++) {
    const candidate = shuffled[i];
    if (candidate.player_id === correct.player_id) continue;
    const candidateBest = getHighestFeeTransfer(candidate.transfers);
    if (!candidateBest) continue;
    const candidateFeeVal = parseFeeToNumber(candidateBest.transfer.fee!);
    // Highest fees must be spaced apart...
    if (Math.abs(candidateFeeVal - correctFeeVal) < correctFeeVal * spacing) continue;
    // ...AND the distractor must not have been transferred for the exact target
    // fee in ANY of its moves (that would be a second valid answer).
    if (hasTransferNearFee(candidate.transfers, correctFeeVal)) continue;
    wrongOptions.push({
      playerId: candidate.player_id,
      playerName: candidate.player_name,
    });
  }

  if (wrongOptions.length < 2) return null;

  // Determine club from/to based on transfer context
  const transferIdx = best.index;
  const clubTo = best.transfer.club_name;
  const clubFrom = transferIdx > 0 ? correct.transfers[transferIdx - 1].club_name : 'Unknown';

  const options: AgentRoundOption[] = shuffleArray(
    [
      {
        playerId: correct.player_id,
        playerName: correct.player_name,
      },
      ...wrongOptions,
    ],
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

export function generateDailyAgentGame(dateString: string): AgentRound[] {
  // Create a seed from the date string
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed = (seed * 31 + dateString.charCodeAt(i)) % 2147483647;
  }

  const rounds: AgentRound[] = [];
  let attempt = 0;
  while (rounds.length < 10 && attempt < 80) {
    // Difficulty ramp by round position: famous answers first, obscure last;
    // distractor fee spacing tightens as the game goes on.
    const pos = rounds.length;
    const minFame = pos < 3 ? 75 : pos < 7 ? 60 : 0;
    const spacing = pos < 3 ? 0.15 : pos < 7 ? 0.08 : 0.05;
    const round = generateAgentRound(seed + attempt * 7, pos, minFame, spacing);
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

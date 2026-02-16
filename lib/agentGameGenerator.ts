import { getAllTransferHistories } from '@/lib/transferData';
import { Transfer } from '@/types/transfer';

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
): { transfer: Transfer; index: number } | null {
  let best: Transfer | null = null;
  let bestVal = 0;
  let bestIdx = -1;
  for (let i = 0; i < transfers.length; i++) {
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

export function generateAgentRound(seed: number, round: number): AgentRound | null {
  const rand = seededRandom(seed * 1000 + round * 137);
  const allPlayers = getAllTransferHistories();

  // Filter players with valid fee transfers
  const playersWithFees = allPlayers.filter((p) => p.transfers.some((t) => isValidFee(t.fee)));

  if (playersWithFees.length < 3) return null;

  const shuffled = shuffleArray(playersWithFees, rand);
  const correct = shuffled[0];
  const best = getHighestFeeTransfer(correct.transfers);
  if (!best) return null;

  const correctFeeVal = parseFeeToNumber(best.transfer.fee!);

  // Pick 2 wrong options whose highest fee is different enough
  const wrongOptions: AgentRoundOption[] = [];
  for (let i = 1; i < shuffled.length && wrongOptions.length < 2; i++) {
    const candidate = shuffled[i];
    const candidateBest = getHighestFeeTransfer(candidate.transfers);
    if (!candidateBest) continue;
    const candidateFeeVal = parseFeeToNumber(candidateBest.transfer.fee!);
    // Ensure the fee is different (at least 10% different or different string)
    if (
      candidateBest.transfer.fee === best.transfer.fee &&
      candidate.player_name !== correct.player_name
    )
      continue;
    if (Math.abs(candidateFeeVal - correctFeeVal) < correctFeeVal * 0.05) continue;
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
  while (rounds.length < 10 && attempt < 50) {
    const round = generateAgentRound(seed + attempt * 7, rounds.length);
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

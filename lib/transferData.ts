import { PlayerTransferHistory, TransferPathStep } from '@/types/transfer';

const transfersJson = require('@/data/transfers.json') as PlayerTransferHistory[];

let cachedTransfers: PlayerTransferHistory[] | null = null;

export function getAllTransferHistories(): PlayerTransferHistory[] {
  if (!cachedTransfers) {
    cachedTransfers = transfersJson;
  }
  return cachedTransfers;
}

export function getTransferHistory(playerId: number): PlayerTransferHistory | undefined {
  return getAllTransferHistories().find((p) => p.player_id === playerId);
}

export function generateTransferPath(playerId: number): TransferPathStep[] {
  const history = getTransferHistory(playerId);
  if (!history) return [];

  return history.transfers.map((t) => {
    const startYear = t.date_joined.substring(0, 4);
    const endYear = t.date_left ? t.date_left.substring(0, 4) : 'Present';
    const years = startYear === endYear ? startYear : `${startYear}-${endYear}`;

    return {
      club_name: t.club_name,
      club_id: t.club_id,
      years,
    };
  });
}

export function getPlayersByClub(clubId: string): PlayerTransferHistory[] {
  return getAllTransferHistories().filter((p) => p.transfers.some((t) => t.club_id === clubId));
}

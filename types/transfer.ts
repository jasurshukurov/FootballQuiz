export interface Transfer {
  club_name: string;
  club_id: string;
  date_joined: string;
  date_left: string | null;
  fee: string | null;
}

export interface PlayerTransferHistory {
  player_id: number;
  player_name: string;
  transfers: Transfer[];
}

export interface TransferPathStep {
  club_name: string;
  club_id: string;
  years: string;
}

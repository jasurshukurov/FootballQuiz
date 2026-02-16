const BASE_URL = 'https://footballquiz.app/share';

export function generateShareUrl(dailyNumber: number): string {
  return `${BASE_URL}/${dailyNumber}`;
}

export function parsePuzzleId(url: string): number | null {
  const match = url.match(/\/share\/(\d+)/);
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return isNaN(id) ? null : id;
}

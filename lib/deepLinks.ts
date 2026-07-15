// footballtrivia.app fronts the content CloudFront distribution; unknown
// paths serve the app landing page, so share links always resolve.
const BASE_URL = 'https://footballtrivia.app/share';

export function generateShareUrl(dailyNumber: number): string {
  return `${BASE_URL}/${dailyNumber}`;
}

export function parsePuzzleId(url: string): number | null {
  const match = url.match(/\/share\/(\d+)/);
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return isNaN(id) ? null : id;
}

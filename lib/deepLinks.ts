// CloudFront distribution domain (we don't own a custom domain yet).
// Unknown paths there serve the app landing page, so share links resolve.
const BASE_URL = 'https://d295hqf6csr5wz.cloudfront.net/share';

export function generateShareUrl(dailyNumber: number): string {
  return `${BASE_URL}/${dailyNumber}`;
}

export function parsePuzzleId(url: string): number | null {
  const match = url.match(/\/share\/(\d+)/);
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return isNaN(id) ? null : id;
}

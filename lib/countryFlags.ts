// Unicode flag emoji for national teams. Flags are plain Unicode — no crest
// artwork — so they stay inside the app's IP-free content rule. Teams without
// a usable flag (defunct states like Yugoslavia) return null and keep the
// generic TeamCrest shield.

/** ISO 3166-1 alpha-2 code per national team name (lowercased). Defunct teams
 *  map to their successor's flag only where that reads as correct on screen
 *  (West Germany -> DE); others are deliberately absent. */
const COUNTRY_ISO: Record<string, string> = {
  albania: 'AL',
  algeria: 'DZ',
  argentina: 'AR',
  australia: 'AU',
  austria: 'AT',
  belgium: 'BE',
  bolivia: 'BO',
  brazil: 'BR',
  bulgaria: 'BG',
  cameroon: 'CM',
  canada: 'CA',
  chile: 'CL',
  china: 'CN',
  colombia: 'CO',
  'costa rica': 'CR',
  croatia: 'HR',
  'czech republic': 'CZ',
  czechia: 'CZ',
  denmark: 'DK',
  ecuador: 'EC',
  egypt: 'EG',
  finland: 'FI',
  france: 'FR',
  georgia: 'GE',
  germany: 'DE',
  'west germany': 'DE',
  ghana: 'GH',
  greece: 'GR',
  honduras: 'HN',
  hungary: 'HU',
  iceland: 'IS',
  iran: 'IR',
  iraq: 'IQ',
  ireland: 'IE',
  'republic of ireland': 'IE',
  israel: 'IL',
  italy: 'IT',
  'ivory coast': 'CI',
  "cote d'ivoire": 'CI',
  jamaica: 'JM',
  japan: 'JP',
  mali: 'ML',
  mexico: 'MX',
  morocco: 'MA',
  netherlands: 'NL',
  'new zealand': 'NZ',
  nigeria: 'NG',
  'north macedonia': 'MK',
  norway: 'NO',
  panama: 'PA',
  paraguay: 'PY',
  peru: 'PE',
  poland: 'PL',
  portugal: 'PT',
  qatar: 'QA',
  romania: 'RO',
  russia: 'RU',
  'saudi arabia': 'SA',
  senegal: 'SN',
  serbia: 'RS',
  slovakia: 'SK',
  slovenia: 'SI',
  'south africa': 'ZA',
  'south korea': 'KR',
  spain: 'ES',
  sweden: 'SE',
  switzerland: 'CH',
  tunisia: 'TN',
  turkey: 'TR',
  ukraine: 'UA',
  'united states': 'US',
  usa: 'US',
  uruguay: 'UY',
  venezuela: 'VE',
};

// UK home nations use Unicode tag-sequence flags, not regional indicators.
const SPECIAL_FLAGS: Record<string, string> = {
  england: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  scotland: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  wales: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
};

/** Flag emoji for a national team name, or null if this isn't a country we
 *  can flag (clubs, defunct states). */
export function getFlagEmoji(teamName: string): string | null {
  const key = teamName.trim().toLowerCase();
  const special = SPECIAL_FLAGS[key];
  if (special) return special;
  const iso = COUNTRY_ISO[key];
  if (!iso) return null;
  return [...iso].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('');
}

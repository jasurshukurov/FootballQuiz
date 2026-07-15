/**
 * Shared club-name shortener for anywhere an official club string would
 * otherwise render raw in the UI (Connections category labels, Grid criteria
 * labels). Strips legal/organizational suffixes and prefixes and founding years
 * from official names ("Verein für Leibesübungen Wolfsburg" -> "Wolfsburg").
 *
 * A small hand map covers the cases where stripping alone leaves something ugly
 * or wrong (Inter Milan, Espanyol). Per-generator short-name maps still take
 * precedence over this fallback.
 */

// Cases where generic stripping isn't enough / would read oddly.
const HARD_SHORT_NAMES: Record<string, string> = {
  // Keep the household "FC" form rather than the bare city generic stripping
  // would leave ("Futbol Club Barcelona" -> "Barcelona").
  'Futbol Club Barcelona': 'FC Barcelona',
  'Fútbol Club Barcelona': 'FC Barcelona',
  'Football Club Internazionale Milano S.p.A.': 'Inter Milan',
  'Società Sportiva Lazio S.p.A.': 'Lazio',
  'Reial Club Deportiu Espanyol de Barcelona S.A.D.': 'Espanyol',
  'Reial Club Deportiu Espanyol de Barcelona': 'Espanyol',
  'Hamburger Sport Verein': 'Hamburg',
  '1. Fußball- und Sportverein Mainz 05': 'Mainz 05',
  '1. Fußball-Club Köln': 'FC Köln',
  'Borussia Verein für Leibesübungen 1900 Mönchengladbach': 'Mönchengladbach',
  'Turn- und Sportgemeinschaft 1899 Hoffenheim Fußball-Spielbetriebs': 'Hoffenheim',
  'Verein für Bewegungsspiele Stuttgart 1893': 'Stuttgart',
  'Association sportive de Monaco Football Club': 'AS Monaco',
};

// Organizational phrases stripped wherever they appear (longest first so
// multi-word phrases are removed before their sub-words).
const LEGAL_PHRASES: RegExp[] = [
  /\bTurn-?\s*und\s+Sportgemeinschaft\b/gi,
  /\bFußball-?\s*und\s+Sportverein\b/gi,
  /\bVerein für Leibesübungen\b/gi,
  /\bVerein für Bewegungsspiele\b/gi,
  /\bAssociation Football Club\b/gi,
  /\bAssociation sportive\b/gi,
  /\bAssociazione Sportiva\b/gi,
  /\bAssociazione Calcio\b/gi,
  /\bSocietà Sportiva\b/gi,
  /\bUnione Sportiva\b/gi,
  /\bReal Club Deportivo\b/gi,
  /\bClub Deportivo\b/gi,
  /\bClub Deportiu\b/gi,
  /\bUnión Deportiva\b/gi,
  /\bClub de Fútbol\b/gi,
  /\bClub de Futbol\b/gi,
  /\bFútbol Club\b/gi,
  /\bFutbol Club\b/gi,
  /\bFußball-?Spielbetriebs?\b/gi,
  /\bFußball-?Club\b/gi,
  /\bFootball Club\b/gi,
  /\bSport\s?Verein\b/gi,
  /\bSportverein\b/gi,
  /\bBalompié\b/gi,
  /\bCalcio\b/gi,
  /\bFußball\b/gi,
  /\bTeam Dubai\b/gi, // sponsor tag
];

// Standalone legal-form suffixes (handle the longer S.A.D. before S.A.). Dots
// are MANDATORY so we never eat the start of a real word ("S.A." vs "Saint"),
// and no trailing \b (it would strand the final dot: "Levante .").
const LEGAL_SUFFIXES: RegExp[] = [
  /\bS\.\s?p\.\s?A\.?/gi, // S.p.A.
  /\bS\.\s?A\.\s?D\.?/gi, // S.A.D.
  /\bS\.\s?A\.?(?![a-z])/gi, // S.A.
  /\be\.\s?V\.?/gi, // e.V.
  /\bGmbH\b/gi,
  /\bAG\b/gi,
];

export function shortenClubName(name: string): string {
  if (!name) return name;
  if (HARD_SHORT_NAMES[name]) return HARD_SHORT_NAMES[name];

  let s = name;
  for (const re of LEGAL_PHRASES) s = s.replace(re, ' ');
  for (const re of LEGAL_SUFFIXES) s = s.replace(re, ' ');
  s = s
    .replace(/^\s*\d+\.\s*/, '') // leading ordinal like "1."
    .replace(/\b\d{2,4}\b/g, ' ') // founding years (1907, 04, 05, 1893)
    .replace(/\.(?=\s|$)/g, ' ') // orphan/trailing dots from legal forms
    .replace(/^\s*(?:de|di|von|van)\s+/i, '') // leading connective ("de Metz")
    .replace(/\s+(?:von|de|di)\s*$/i, '') // trailing connective ("Bremen von")
    .replace(/[-–]\s*$/, '') // trailing dash left by stripping
    .replace(/\s+/g, ' ')
    .trim();

  // If stripping left too little, keep the original rather than a fragment.
  return s.length >= 3 ? s : name;
}

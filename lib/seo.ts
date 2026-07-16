// Per-route SEO metadata for the static web export. Centralized (instead of a
// <Head> in every screen) because game screens render different branches at
// build time (loading/board/game-over) — one pathname-keyed component in the
// root layout guarantees every exported page carries its title/description/
// canonical regardless of which branch static rendering hit.

export const SITE_URL = 'https://footballtrivia.app';
export const SITE_NAME = 'Football Trivia';
export const DEFAULT_DESCRIPTION =
  'Play 11 free daily football trivia games: guess the player, name famous starting XIs, solve the grid, rank stars and more. New puzzles every day.';

interface RouteSeoEntry {
  title: string;
  description: string;
}

/** Keyed by pathname (expo-router usePathname form, no trailing slash). */
export const ROUTE_SEO: Record<string, RouteSeoEntry> = {
  '/': {
    title: 'Football Trivia · 11 Free Daily Football Quiz Games',
    description: DEFAULT_DESCRIPTION,
  },
  '/careerpath': {
    title: 'Career Path · Guess the Footballer from Their Clubs | Football Trivia',
    description:
      'An endless football quiz: see a mystery player’s club history and guess who it is in 3 attempts. A new player every round, free to play.',
  },
  '/whoareya': {
    title: 'My Name Is · Daily Guess-the-Player Football Quiz | Football Trivia',
    description:
      'Guess the mystery footballer in 8 tries. Every guess grades team, league, nation, position and age, with an optional blurred photo clue. New player daily.',
  },
  '/explore': {
    title: 'The Grid · Daily Football Club-Crossing Puzzle | Football Trivia',
    description:
      'Fill the 3x3 football grid: name a player matching both clues for every square, from club crossings to nations and price tags. A new grid every day.',
  },
  '/missing11': {
    title: 'Missing XI · Name the Famous Starting Lineup | Football Trivia',
    description:
      'A real match’s starting eleven with hidden names: search and place all 11 starters from World Cup, Champions League and league classics. New XI daily.',
  },
  '/connections': {
    title: 'Football Connections · Group 16 Players into 4 | Football Trivia',
    description:
      'Sixteen footballers hide four secret groups. Find what connects them, from shared clubs to careers, in six mistakes or fewer. New puzzle daily.',
  },
  '/toplists': {
    title: 'Top Lists · Name Everyone on the Football Ranking | Football Trivia',
    description:
      'A famous football ranking with hidden names: top scorers, transfer records and more. Name everyone on the list with 5 lives. New list daily.',
  },
  '/higherlower': {
    title: 'Higher or Lower · Football Market Value Game | Football Trivia',
    description:
      'Is the next footballer worth more or less? Build the longest streak of correct market-value calls in this daily higher-lower football game.',
  },
  '/agent': {
    title: 'Transfer Agent · Guess Who Moved for the Fee | Football Trivia',
    description:
      'A real transfer fee is on the table: pick which of three players moved for it. Ten rounds of transfer-market football trivia every day.',
  },
  '/blindranking': {
    title: 'Blind Ranking · Rank 5 Footballers Without Peeking | Football Trivia',
    description:
      'Five players arrive one at a time: lock each into a rank slot before seeing who is next. Rank by market value, peak value or fame. New board daily.',
  },
  '/careertimeline': {
    title: 'Career Timeline · Rebuild the Career Club by Club | Football Trivia',
    description:
      'A star’s career timeline with three clubs hidden: work out the missing stints from the years around them. A new career to rebuild every day.',
  },
  '/guessmatch': {
    title: 'Guess the Match · Name the Fixture from Its XI | Football Trivia',
    description:
      'A famous match’s lineup is revealed one player at a time, role players first. Identify the fixture in as few names as possible. New match daily.',
  },
  '/profile': {
    title: 'Your Stats · Streaks, Ranks and Solve Times | Football Trivia',
    description:
      'Track your daily streak, per-game scores, solve-time bests and rank across all Football Trivia daily games.',
  },
  '/support': {
    title: 'More · Settings, Archive and Support | Football Trivia',
    description:
      'Replay the last 30 days from the archive, manage notifications, sound and haptics, and get support for Football Trivia.',
  },
  '/archive': {
    title: 'Archive · Replay the Last 30 Days | Football Trivia',
    description:
      'Missed a day? Replay the last 30 days of Football Trivia daily puzzles as practice runs, with no effect on your streak.',
  },
  '/photocredits': {
    title: 'Photo Credits · Wikimedia Commons Attributions | Football Trivia',
    description:
      'Player photos in Football Trivia come from Wikimedia Commons photographers under Creative Commons and public-domain licenses. Full credits.',
  },
};

export function getRouteSeo(pathname: string): RouteSeoEntry {
  const clean = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return ROUTE_SEO[clean] ?? { title: SITE_NAME, description: DEFAULT_DESCRIPTION };
}

export function canonicalUrl(pathname: string): string {
  const clean = pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return clean === '/' ? `${SITE_URL}/` : `${SITE_URL}${clean}`;
}

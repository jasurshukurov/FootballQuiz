/**
 * How-to-play copy for every registered daily mode — the SINGLE source of
 * truth, keyed by the mode registry key (lib/modeRegistry.ts). Rendered by
 * components/ui/HowToPlaySheet.tsx (opened from the "?" in ScreenHeader and
 * auto-shown once on a mode's first-ever visit).
 *
 * Keep entries to 3–5 short steps + an optional one-line footer covering
 * scoring / lives / difficulty. Copy must describe the CURRENT rules — update
 * this file whenever a mode's mechanics change.
 */

export interface HowToPlayContent {
  /** Sheet heading override. Defaults to the registry title — set only where
   *  the in-screen title differs (e.g. who-are-ya renders "Who Are Ya?"). */
  title?: string;
  /** 3–5 short bullet steps, in play order. */
  steps: string[];
  /** One-liner on scoring, lives or difficulty, shown in a soft callout. */
  footer?: string;
}

export const HOW_TO_PLAY: Record<string, HowToPlayContent> = {
  careerpath: {
    steps: [
      'A mystery player’s career appears: clubs shuffled, years hidden.',
      'Search and pick a name to guess. You get 3 attempts.',
      'Stuck? Hints sort the timeline or reveal nationality, position and years. The first two are free.',
    ],
    footer:
      'The tier badge shows how deep a cut today’s player is. Fewer attempts and hints mean a higher rank.',
  },
  'who-are-ya': {
    title: 'Who Are Ya?',
    steps: [
      'Search any player to make a guess. You have 8.',
      'Every guess grades five columns: team, league, nation, position and age.',
      'Green is a match; the age cell points HIGHER or LOWER toward the target.',
      'Tap Show Photo any time for a free, blurred picture of the mystery player.',
      'After two guesses you can reveal the nationality as a hint.',
    ],
    footer: 'Solve in fewer guesses for a higher rank on the daily ladder.',
  },
  grid: {
    steps: [
      'Nine squares, each crossing two clues: clubs, nations, leagues, positions or price tags.',
      'Tap a square and name a player who matches BOTH its row and column.',
      'Every guess, right or wrong, spends one of your 9. A wrong guess leaves the square open, so try it again with someone else.',
      'Each player fills only one square; 3 hints can suggest a valid pick.',
    ],
    footer:
      'Correct squares score 10 points. Obscure answers add a deep-cut bonus of up to +30. Hold Give Up to end the board early.',
  },
  missing11: {
    steps: [
      'A real match’s starting XI is on the pitch, names hidden.',
      'Just type a starter’s name and it drops into their shirt, no tapping needed.',
      'Picking a name that never started costs one of your 3 lives.',
      'One hint per game reveals a slot’s position and first initial.',
    ],
    footer:
      'The tier badge rates the match’s fame; the chip shows its competition and era. Name all 11 to win, or hold Give Up to reveal the lineup.',
  },
  connections: {
    steps: [
      'Sixteen players hide four secret groups of four.',
      'Select four you think belong together, then submit.',
      '“One away…” means exactly three of your four were right.',
      'Four mistakes end the game.',
    ],
    footer:
      'Groups run yellow (easy) to purple (devious). A no-mistake solve earns a flawless bonus. Hold Give Up to reveal the groups.',
  },
  toplists: {
    steps: [
      'Today’s famous ranking is hidden. Only ranks and numbers show.',
      'Just type a name and its slot reveals instantly, in any order. Typing is always free.',
      'Press GUESS for a deliberate attempt. A wrong one there costs one of your 5 lives.',
    ],
    footer:
      'Your rank badge climbs live with every name found. Full marks for naming everyone. One attempt per day, or hold Give Up to reveal the rest.',
  },
  higherlower: {
    steps: [
      'Is the challenger worth MORE or LESS than the player above?',
      'Tap HIGHER or LOWER. Market values decide.',
      'Every correct call grows your streak and brings the next player.',
      'Sudden death: one wrong call ends the run.',
    ],
    footer:
      'Early pairs are kind; later ones get tight. Your streak is your score. Hold Give Up to bank it and stop.',
  },
  agent: {
    steps: [
      'A real transfer fee is on the table: which of the 3 players moved for it?',
      'Pick one; the reveal shows the actual deal before the next round.',
      'Ten rounds, no lives. Every correct call banks a point.',
      '3 hints per game can show a deal’s clubs (one per round).',
    ],
    footer:
      'Six of ten wins the day; a perfect window tops the ladder. Hold Give Up to close the window early.',
  },
  blindranking: {
    steps: [
      'Five players arrive ONE at a time for today’s category.',
      'Rank #1 is the top — most valuable, highest rated, most caps — down to #5 at the bottom.',
      'Place each into a slot before the next arrives. Slots lock once filled, so weigh every choice.',
      'Exact spot scores 2 points, one place off scores 1.',
    ],
    footer:
      'Ten is a perfect board. Score 7 or more to win the day. Hold Give Up to see the true order.',
  },
  careertimeline: {
    steps: [
      'A player’s career timeline is laid out with three of the middle clubs hidden.',
      'Just type a club: if it matches any hidden stint it drops straight in. Tap a stint only to target it when a club repeats.',
      'Picking a club that is not in the career costs a life; typing is always free.',
      'The lightbulb on a stint reveals the club’s first letter (−5 XP each).',
    ],
    footer: 'Find all three to win; spare lives boost your XP. Hold Give Up to reveal the answer.',
  },
  guessmatch: {
    steps: [
      'A famous match’s XI is revealed one player at a time: role players first, stars last.',
      'Reveal names until the fixture clicks, then pick it from the four options.',
      'Wrong picks cost one of your 3 lives.',
      'The fewer names you needed, the more points you score (up to 11).',
    ],
    footer:
      'Guess it early for the big score. Reveal everything and it’s worth a single point. Hold Give Up to concede and see the answer.',
  },
};

/** Rules for a mode, or undefined for keys without content (e.g. deprecated modes). */
export function getHowToPlay(modeKey: string): HowToPlayContent | undefined {
  return HOW_TO_PLAY[modeKey];
}

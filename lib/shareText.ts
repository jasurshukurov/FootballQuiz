// Wordle-style share text.
//
// This module is intentionally free of React / React Native imports so it can be
// unit tested and previewed from a plain node/tsx script. Screens pass in the
// daily puzzle number (getDailyNumber) and the overall daily streak
// (useDailyStateStore.currentStreak).

import { AttributeStatus, GuessResult } from '@/types/game';
import { generateShareUrl } from '@/lib/deepLinks';

const SQUARE = {
  green: '🟩',
  yellow: '🟨',
  white: '⬜',
  red: '🟥',
  purple: '🟪',
} as const;

const HEART = '❤️';
const BLACK_HEART = '🖤';
const BALL = '⚽';
const CHECK = '✅';
const CROSS = '❌';

/** The 5 attribute statuses shown per Who Are Ya guess row (team, league,
 *  nationality, position, age). Shared by ShareableResult and buildShareText so
 *  the emoji grid and the on-screen card stay in lockstep. */
export function whoAreYaStatusRows(guesses: GuessResult[]): AttributeStatus[][] {
  return guesses.map((guess) => [
    guess.comparisons.team.status,
    guess.comparisons.league.status,
    guess.comparisons.nationality.status,
    guess.comparisons.position.status,
    guess.comparisons.age.status,
  ]);
}

function statusToSquare(status: AttributeStatus): string {
  switch (status) {
    case 'CORRECT':
      return SQUARE.green;
    case 'HIGHER':
    case 'LOWER':
      return SQUARE.yellow;
    default:
      return SQUARE.white;
  }
}

const DIFFICULTY_SQUARES = [SQUARE.green, SQUARE.yellow, SQUARE.red, SQUARE.purple];

interface ShareMeta {
  /** getDailyNumber() — same across every mode for a given day. */
  dailyNumber: number;
  /** Overall daily streak from useDailyStateStore. */
  dailyStreak: number;
}

export type ShareResultInput = ShareMeta &
  (
    | { mode: 'who-are-ya'; won: boolean; maxGuesses: number; statusRows: AttributeStatus[][] }
    | {
        mode: 'careerpath';
        won: boolean;
        attemptsUsed: number;
        totalAttempts: number;
        playerName: string;
      }
    | { mode: 'grid'; score: number; correctCells: boolean[][] }
    | { mode: 'missing11'; found: number; total: number; teamName: string }
    | { mode: 'connections'; mistakes: number; maxMistakes: number; solvedDifficulties: number[] }
    | {
        mode: 'toplists';
        found: number;
        total: number;
        livesUsed: number;
        slots: boolean[];
      }
    | { mode: 'higherlower'; streak: number }
    | { mode: 'agent'; score: number; totalRounds: number; results: boolean[] }
    | { mode: 'blindranking'; score: number; total: number; categoryTitle: string }
    | {
        mode: 'careertimeline';
        guessedCount: number;
        totalHidden: number;
        livesRemaining: number;
        totalLives: number;
        playerName: string;
      }
    | { mode: 'marketmovers'; streak: number }
    | { mode: 'guessmatch'; won: boolean; namesRevealed: number; totalNames: number }
  );

const MODE_HEADERS: Record<ShareResultInput['mode'], string> = {
  'who-are-ya': 'Who Are Ya 🔍',
  careerpath: 'Career Path 🎬',
  grid: 'Grid 🎯',
  missing11: 'Missing XI ⚽',
  connections: 'Connections 🔗',
  toplists: 'Top Lists 📋',
  higherlower: 'Higher / Lower 📈',
  agent: 'The Agent 💰',
  blindranking: 'Blind Ranking 📊',
  careertimeline: 'Career Timeline 🛤️',
  marketmovers: 'Market Movers 💰',
  guessmatch: 'Guess the Match ⚽',
};

function hearts(remaining: number, total: number): string {
  const safe = Math.max(0, Math.min(total, remaining));
  return HEART.repeat(safe) + BLACK_HEART.repeat(total - safe);
}

/** The mode-specific lines (score summary + emoji grid) between header and footer. */
function buildBody(input: ShareResultInput): string[] {
  switch (input.mode) {
    case 'who-are-ya': {
      const score = input.won
        ? `${input.statusRows.length}/${input.maxGuesses}`
        : `X/${input.maxGuesses}`;
      const rows = input.statusRows.map((row) => row.map(statusToSquare).join(''));
      return [score, ...rows];
    }
    case 'careerpath': {
      return [
        input.won ? 'Solved!' : 'Missed it',
        hearts(input.totalAttempts - input.attemptsUsed, input.totalAttempts),
      ];
    }
    case 'grid': {
      const rows = input.correctCells.map((row) =>
        row.map((ok) => (ok ? SQUARE.green : SQUARE.white)).join(''),
      );
      return [`${input.score}/9`, ...rows];
    }
    case 'missing11': {
      const row =
        BALL.repeat(Math.max(0, input.found)) +
        SQUARE.white.repeat(Math.max(0, input.total - input.found));
      return [`${input.found}/${input.total}`, row];
    }
    case 'connections': {
      const rows = input.solvedDifficulties.map((d) => (DIFFICULTY_SQUARES[d] ?? '').repeat(4));
      const summary =
        input.mistakes === 0
          ? 'Flawless!'
          : `${input.mistakes} mistake${input.mistakes !== 1 ? 's' : ''}`;
      return [summary, ...rows];
    }
    case 'toplists': {
      const row = input.slots.map((found) => (found ? SQUARE.green : SQUARE.white)).join('');
      return [
        `${input.found}/${input.total} found`,
        row,
        `${input.livesUsed} ${input.livesUsed === 1 ? 'life' : 'lives'} used`,
      ];
    }
    case 'higherlower': {
      return [`Streak: ${input.streak} 🔥`];
    }
    case 'agent': {
      const row = input.results.map((ok) => (ok ? CHECK : CROSS)).join('');
      return [`${input.score}/${input.totalRounds}`, row];
    }
    case 'blindranking': {
      const row =
        SQUARE.green.repeat(Math.max(0, input.score)) +
        SQUARE.white.repeat(Math.max(0, input.total - input.score));
      return [input.categoryTitle, `${input.score}/${input.total}`, row];
    }
    case 'careertimeline': {
      return [
        `${input.guessedCount}/${input.totalHidden} clubs`,
        hearts(input.livesRemaining, input.totalLives),
      ];
    }
    case 'marketmovers': {
      return [`💰 Streak: ${input.streak}`];
    }
    case 'guessmatch': {
      return [
        input.won
          ? `⚽ Got it after ${input.namesRevealed}/${input.totalNames} names`
          : `⚽ Missed it (${input.totalNames} names)`,
      ];
    }
  }
}

/**
 * Build a copyable Wordle-style result block for any mode, e.g.:
 *   Football Trivia #560 · Who Are Ya 🔍
 *   3/8
 *   🟥🟨⬜🟩🟩
 *   🔥 5-day streak
 *   https://footballtrivia.app/share/560
 */
export function buildShareText(input: ShareResultInput): string {
  const lines: string[] = [
    `Football Trivia #${input.dailyNumber} · ${MODE_HEADERS[input.mode]}`,
    ...buildBody(input),
  ];

  if (input.dailyStreak > 0) {
    lines.push(`🔥 ${input.dailyStreak}-day streak`);
  }

  lines.push(generateShareUrl(input.dailyNumber));

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Daily recap ("Share your day") — one block stitching every mode's result.
// ---------------------------------------------------------------------------

/** The daily modes in display order, with the emoji + name used in the recap.
 *  `key` matches useDailyProgressStore completedModes / scoresByMode keys.
 *  Deprecated modes (e.g. 'marketmovers') are removed here too, so a stale
 *  persisted completion never inflates the recap count past totalModes.
 *  (The single-game ShareResultInput 'marketmovers' variant above is kept —
 *  the dormant screen still compiles and shares if routed directly.) */
const RECAP_MODES: { key: string; emoji: string; name: string }[] = [
  { key: 'careerpath', emoji: '🎬', name: 'Career Path' },
  { key: 'who-are-ya', emoji: '🔍', name: 'Who Are Ya' },
  { key: 'grid', emoji: '🎯', name: 'Grid' },
  { key: 'missing11', emoji: '⚽', name: 'Missing XI' },
  { key: 'connections', emoji: '🔗', name: 'Connections' },
  { key: 'toplists', emoji: '📋', name: 'Top Lists' },
  { key: 'higherlower', emoji: '📈', name: 'Higher / Lower' },
  { key: 'agent', emoji: '💰', name: 'The Agent' },
  { key: 'blindranking', emoji: '📊', name: 'Blind Ranking' },
  { key: 'careertimeline', emoji: '🛤️', name: 'Career Timeline' },
  { key: 'guessmatch', emoji: '⚽', name: 'Guess the Match' },
];

export interface DailyRecapInput {
  dailyNumber: number;
  dailyStreak: number;
  totalModes: number;
  completedModes: Record<string, boolean>;
  scoresByMode: Record<string, number>;
}

/**
 * Build the "Share your day" recap, stitching a line per completed mode:
 *   Football Trivia #560 · Perfect Day! (10/10)
 *   🎬 Career Path 2
 *   🔍 Who Are Ya 3
 *   ...
 *   🔥 5-day streak
 *   https://footballtrivia.app/share/560
 */
export function buildDailyRecapText(input: DailyRecapInput): string {
  const completedCount = RECAP_MODES.filter((m) => input.completedModes[m.key]).length;
  const perfect = completedCount === input.totalModes;

  const lines: string[] = [
    `Football Trivia #${input.dailyNumber} · ${perfect ? 'Perfect Day! ' : ''}(${completedCount}/${input.totalModes})`,
  ];

  for (const mode of RECAP_MODES) {
    if (!input.completedModes[mode.key]) continue;
    const score = input.scoresByMode[mode.key];
    lines.push(`${mode.emoji} ${mode.name}${score !== undefined ? ` ${score}` : ''}`);
  }

  if (input.dailyStreak > 0) {
    lines.push(`🔥 ${input.dailyStreak}-day streak`);
  }

  lines.push(generateShareUrl(input.dailyNumber));

  return lines.join('\n');
}

import { buildShareText, buildDailyRecapText, whoAreYaStatusRows } from '@/lib/shareText';
import { generateShareUrl } from '@/lib/deepLinks';
import { GuessResult, AttributeStatus } from '@/types/game';
import { Player } from '@/types/player';

// Derived from the centralized share domain so the domain can change without
// touching these expectations.
const URL_560 = generateShareUrl(560);

function comparison(status: AttributeStatus) {
  return { attribute: '', guessValue: '', targetValue: '', status };
}

function guess(statuses: AttributeStatus[]): GuessResult {
  const [team, league, nationality, position, age] = statuses;
  return {
    player: { id: 1, name: 'X', normalized_name: 'x' } as unknown as Player,
    comparisons: {
      team: comparison(team),
      league: comparison(league),
      nationality: comparison(nationality),
      position: comparison(position),
      age: comparison(age),
    },
    isCorrect: statuses.every((s) => s === 'CORRECT'),
  };
}

describe('whoAreYaStatusRows', () => {
  it('extracts the 5 attribute statuses per guess in column order', () => {
    const rows = whoAreYaStatusRows([guess(['WRONG', 'HIGHER', 'CORRECT', 'LOWER', 'CORRECT'])]);
    expect(rows).toEqual([['WRONG', 'HIGHER', 'CORRECT', 'LOWER', 'CORRECT']]);
  });
});

describe('buildShareText', () => {
  it('renders a Who Are Ya block with emoji grid, streak and share url', () => {
    const text = buildShareText({
      mode: 'who-are-ya',
      dailyNumber: 560,
      dailyStreak: 5,
      won: true,
      maxGuesses: 8,
      statusRows: [
        ['WRONG', 'WRONG', 'HIGHER', 'CORRECT', 'CORRECT'],
        ['CORRECT', 'CORRECT', 'CORRECT', 'CORRECT', 'CORRECT'],
      ],
    });
    expect(text).toBe(
      [
        'Football Quiz #560 · Who Are Ya 🔍',
        '2/8',
        '⬜⬜🟨🟩🟩',
        '🟩🟩🟩🟩🟩',
        '🔥 5-day streak',
        URL_560,
      ].join('\n'),
    );
  });

  it('omits the streak line when the daily streak is 0', () => {
    const text = buildShareText({
      mode: 'higherlower',
      dailyNumber: 560,
      dailyStreak: 0,
      streak: 12,
    });
    expect(text).toBe(
      ['Football Quiz #560 · Higher / Lower 📈', 'Streak: 12 🔥', URL_560].join('\n'),
    );
  });

  it('renders Top Lists with a found/missed emoji row', () => {
    const text = buildShareText({
      mode: 'toplists',
      dailyNumber: 560,
      dailyStreak: 4,
      found: 3,
      total: 5,
      livesUsed: 2,
      slots: [true, true, false, true, false],
    });
    expect(text.split('\n')).toEqual([
      'Football Quiz #560 · Top Lists 📋',
      '3/5 found',
      '🟩🟩⬜🟩⬜',
      '2 lives used',
      '🔥 4-day streak',
      URL_560,
    ]);
  });

  it('renders connections with one colored row per solved category', () => {
    const text = buildShareText({
      mode: 'connections',
      dailyNumber: 560,
      dailyStreak: 3,
      mistakes: 0,
      maxMistakes: 4,
      solvedDifficulties: [0, 1, 2, 3],
    });
    expect(text.split('\n')).toEqual([
      'Football Quiz #560 · Connections 🔗',
      'Flawless!',
      '🟩🟩🟩🟩',
      '🟨🟨🟨🟨',
      '🟥🟥🟥🟥',
      '🟪🟪🟪🟪',
      '🔥 3-day streak',
      URL_560,
    ]);
  });

  it('keeps every fixed-length block within 7 lines', () => {
    const blocks = [
      buildShareText({ mode: 'higherlower', dailyNumber: 560, dailyStreak: 3, streak: 12 }),
      buildShareText({
        mode: 'missing11',
        dailyNumber: 560,
        dailyStreak: 3,
        found: 7,
        total: 11,
        teamName: 'Arsenal',
      }),
      buildShareText({
        mode: 'careerpath',
        dailyNumber: 560,
        dailyStreak: 3,
        won: false,
        attemptsUsed: 3,
        totalAttempts: 3,
        playerName: 'Kaka',
      }),
    ];
    for (const block of blocks) {
      expect(block.split('\n').length).toBeLessThanOrEqual(7);
    }
  });

  it('builds a Perfect Day recap stitching every completed mode line', () => {
    const allKeys = [
      'careerpath',
      'who-are-ya',
      'grid',
      'missing11',
      'connections',
      'higherlower',
      'agent',
      'blindranking',
      'careertimeline',
      'guessmatch',
      'toplists',
    ];
    const completedModes = Object.fromEntries(allKeys.map((k) => [k, true]));
    const scoresByMode = Object.fromEntries(allKeys.map((k, i) => [k, i]));

    const text = buildDailyRecapText({
      dailyNumber: 560,
      dailyStreak: 5,
      totalModes: 11,
      completedModes,
      scoresByMode,
    });
    const lines = text.split('\n');
    expect(lines[0]).toBe('Football Quiz #560 · Perfect Day! (11/11)');
    expect(lines[1]).toBe('🎬 Career Path 0');
    expect(lines).toContain('🔍 Who Are Ya 1');
    expect(lines).toContain('📋 Top Lists 10');
    expect(lines).toContain('🔥 5-day streak');
    expect(lines[lines.length - 1]).toBe(URL_560);
    // header + 11 mode lines + streak + url
    expect(lines).toHaveLength(14);
  });

  it('ignores persisted completions for deprecated modes (e.g. marketmovers)', () => {
    // A user who completed Market Movers before its deprecation still has
    // { marketmovers: true } in today's persisted completedModes. The recap
    // must neither list it nor let it inflate the count past totalModes.
    const text = buildDailyRecapText({
      dailyNumber: 560,
      dailyStreak: 0,
      totalModes: 11,
      completedModes: { marketmovers: true, grid: true },
      scoresByMode: { marketmovers: 7, grid: 9 },
    });
    expect(text.split('\n')).toEqual(['Football Quiz #560 · (1/11)', '🎯 Grid 9', URL_560]);
  });

  it('builds a partial recap listing only completed modes', () => {
    const text = buildDailyRecapText({
      dailyNumber: 560,
      dailyStreak: 0,
      totalModes: 10,
      completedModes: { grid: true, toplists: true },
      scoresByMode: { grid: 9, toplists: 5 },
    });
    expect(text.split('\n')).toEqual([
      'Football Quiz #560 · (2/10)',
      '🎯 Grid 9',
      '📋 Top Lists 5',
      URL_560,
    ]);
  });

  it('prints example blocks for manual inspection', () => {
    const examples = [
      buildShareText({
        mode: 'higherlower',
        dailyNumber: 560,
        dailyStreak: 5,
        streak: 12,
      }),
      buildShareText({
        mode: 'agent',
        dailyNumber: 560,
        dailyStreak: 5,
        score: 3,
        totalRounds: 5,
        results: [true, false, true, true, false],
      }),
      buildShareText({
        mode: 'careertimeline',
        dailyNumber: 560,
        dailyStreak: 5,
        guessedCount: 4,
        totalHidden: 5,
        livesRemaining: 2,
        totalLives: 3,
        playerName: 'Andrea Pirlo',
      }),
    ];
    // eslint-disable-next-line no-console
    console.log('\n' + examples.join('\n\n') + '\n');
    expect(examples).toHaveLength(3);
  });
});

// The Grid — mixed-axis 3x3 (clubs / nations / leagues / positions / value
// bars on both sides). Tap a cell -> search sheet -> pick a player; wrong
// picks leave the cell open and burn one of the 9 guesses. Hints (3) name a
// guaranteed-valid player, which this module uses for deterministic fills.
import {
  goto, dismissTutorial, tapXY, leafTexts, allTexts, pickFirstSuggestion,
  typeAndPick, pressButton, isGameOver, FAMOUS, hasText,
} from '../helpers.mjs';

export const meta = { key: 'grid', title: 'The Grid', route: '/explore' };

/** Centres of the still-empty "?" cells (robust to restyle + fills). The
 *  header's how-to-play button is ALSO a "?" leaf — exclude it by testID. */
async function emptyCells(page) {
  // v3 empty cells show a "+" in a dashed circle (was "?").
  return page.evaluate(() => [...document.querySelectorAll('div,span')]
    .filter((e) => e.children.length === 0 && ['+', '?'].includes(e.innerText?.trim()) &&
      !e.closest('[data-testid="how-to-play-button"]'))
    .map((e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; }));
}

// The "N guesses left" widget — distinct from the "0/9" score.
async function guessesLeft(page) {
  const t = (await leafTexts(page, 0, 140)).find((x) => /guess(es)? left/i.test(x.t))?.t || '';
  const m = t.match(/(\d+)\s+guess/i);
  return m ? parseInt(m[1], 10) : null;
}

/** The search sheet's input, if open. */
async function sheetOpen(page) {
  return (await page.locator('input').count()) > 0;
}

async function closeSheet(page) {
  if (!(await sheetOpen(page))) return;
  await pressButton(page, 'Cancel', true).catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
}

/** Press the Hint button inside the sheet and read the "Try: <name>" line. */
async function hintName(page) {
  const pressed = await pressButton(page, 'Hint (', false, { settle: 600 });
  if (!pressed) return null;
  const texts = await allTexts(page);
  const line = texts.find((t) => /^Try:\s+/.test(t));
  return line ? line.replace(/^Try:\s+/, '').trim() : null;
}

export async function play(page, t) {
  await goto(page, '/explore');
  await dismissTutorial(page);

  t.check('grid header renders',
    (await hasText(page, 'GRID', { timeout: 3000 })) || (await hasText(page, 'DAILY', { timeout: 1500 })),
    'grid header');
  t.check('board renders 9 empty cells', (await emptyCells(page)).length === 9,
    `${(await emptyCells(page)).length} empty cells`);

  // Mixed axes: header chips carry kind kickers (clubs/nations/leagues/...).
  // Columns use the long kicker, the left rail the short one — same 5 kinds.
  const KICKER_KIND = {
    'PLAYED FOR': 'club', CLUB: 'club',
    NATION: 'nationality',
    'PLAYS IN': 'league', LEAGUE: 'league',
    POSITION: 'position', ROLE: 'position',
    VALUED: 'value', VALUE: 'value',
  };
  const kinds = (await allTexts(page)).map((x) => KICKER_KIND[x]).filter(Boolean);
  t.check('headers span >= 3 category kinds', new Set(kinds).size >= 3,
    `kinds seen: ${[...new Set(kinds)].join(', ')}`);

  // ---- Deterministic correct fill via a hint ----
  let hintFills = 0;
  {
    const cells = await emptyCells(page);
    await tapXY(page, cells[0].x, cells[0].y, 800);
    t.check('tapping a cell opens the search sheet', await sheetOpen(page), 'input visible');
    const name = await hintName(page);
    t.check('hint suggests a player', !!name, name || 'no "Try:" line');
    if (name) {
      const picked = await typeAndPick(page, name.slice(0, Math.min(name.length, 14)), name);
      await page.waitForTimeout(600);
      if (picked && (await emptyCells(page)).length === 8) hintFills++;
    }
    await closeSheet(page);
    t.check('hint pick fills the cell (search -> select -> fill)', hintFills >= 1,
      `${(await emptyCells(page)).length} empty cells after hint pick`);
  }

  // ---- Drive to game over: hints while they last, famous burns after ----
  let picks = hintFills;
  for (let i = 0; i < 14; i++) {
    if (await isGameOver(page)) break;
    const left = await guessesLeft(page);
    if (left !== null && left <= 0) break;
    const cells = await emptyCells(page);
    if (!cells.length) break;

    await tapXY(page, cells[0].x, cells[0].y, 700);
    if (!(await sheetOpen(page))) continue;

    let done = false;
    if (picks < 3) {
      const name = await hintName(page);
      if (name) done = await typeAndPick(page, name.slice(0, Math.min(name.length, 14)), name);
    }
    if (!done) {
      const famous = FAMOUS[i % FAMOUS.length];
      done = !!(await pickFirstSuggestion(page, famous.split(' ')[0]));
    }
    if (done) picks++;
    await page.waitForTimeout(600);
    await closeSheet(page);
  }

  await page.waitForTimeout(1400);
  t.check('made multiple guesses', picks >= 3, `${picks} picks`);
  t.check('reaches game-over (9 guesses spent or perfect grid)', await isGameOver(page), 'terminal state');

  // ---- Daily re-entry restoration: reload -> finished board + result ----
  await goto(page, '/explore', 3200);
  await dismissTutorial(page);
  t.check('completed daily restores on re-entry (board + result panel)',
    await isGameOver(page), 'game-over surface after reload');
}

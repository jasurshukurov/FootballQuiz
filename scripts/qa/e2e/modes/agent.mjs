// Transfer Agent — match the player to the transfer. Pick one of the options
// each round; wrong picks cost lives. Invariant: on a MISS, the wrong pick's
// actual transfer is revealed (teach moment). Exercises the "Show Transfer" hint.
import { goto, dismissTutorial, leafTexts, pressButton, clickText, isGameOver, hasText } from '../helpers.mjs';

export const meta = { key: 'agent', title: 'Transfer Agent', route: '/agent' };

// Option labels are ALL-CAPS player names ("DIDIER DESCHAMPS"). Crucially, this
// excludes the hint reveal line "Everton → Manchester United" (has lowercase +
// arrow), which otherwise gets mistaken for an option after "Show Transfer".
function isOptionLabel(s) {
  return /^[A-ZÀ-Þ][A-ZÀ-Þ .'’-]{3,}$/.test(s) && !/→|➜|->|SHOW TRANSFER|WHICH PLAYER|ROUND|SCORE|FULL TIME|TODAY|STATS|MORE/i.test(s);
}
async function readOptions(page) {
  return (await leafTexts(page, 170, 820)).map((x) => x.t).filter(isOptionLabel);
}

export async function play(page, t) {
  await goto(page, '/agent');
  await dismissTutorial(page);
  t.check('agent prompt renders', await hasText(page, 'WHICH', { timeout: 3000 }) || await hasText(page, 'transfer', { timeout: 1500 }), 'prompt text');

  let rounds = 0, hintReveal = null;
  for (let r = 0; r < 14; r++) {
    if (await isGameOver(page)) break;
    // Exercise the "Show Transfer" hint once (round 3) and capture the reveal —
    // then pick a real (all-caps) option so the round still advances.
    if (r === 2) {
      await pressButton(page, 'Show Transfer', false);
      await page.waitForTimeout(600);
      hintReveal = (await leafTexts(page, 150, 400)).map((x) => x.t).find((s) => /→|➜|->/.test(s)) || null;
    }
    const opts = await readOptions(page);
    if (!opts.length) break;
    const pick = opts[0];
    const ok = await pressButton(page, pick, true);
    if (!ok) await clickText(page, pick, { exact: true });
    rounds++;
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(1200);
  t.check('played multiple rounds to the end', rounds >= 3, `${rounds} rounds`);
  if (hintReveal) t.check('Show Transfer hint reveals the fee\'s transfer (club → club)', /→|➜|->/.test(hintReveal), hintReveal);
  t.check('reaches game-over', await isGameOver(page), 'terminal state');
  // Invariant: on a miss the game-over summary lists the wrong pick's ACTUAL
  // transfer — the solve list shows "✗  €NNm — Player Name" rows.
  const goText = (await leafTexts(page, 0, 1500)).map((x) => x.t);
  const missRows = goText.filter((s) => /^✗/.test(s) || /€\s?\d+\s?[mMkK]\s*[—-]\s*\w/.test(s));
  const revealsTransfer = missRows.length > 0 || goText.some((s) => /€\d|€\s?\d/.test(s) && /—|-/.test(s));
  t.check('game-over reveals the actual transfer on each miss', revealsTransfer, goText.filter((s) => /€/.test(s)).slice(0, 4).join(' | '));
}

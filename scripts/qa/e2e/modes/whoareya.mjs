// My Name Is… (who-are-ya) — guess the mystery player from clues. 8 guesses;
// wrong-guess exhaustion drives the loss. Also exercises the hint after 2 guesses.
import { goto, dismissTutorial, typeAndPick, pickFirstSuggestion, leafTexts, isGameOver, FAMOUS, hasText, pressButton } from '../helpers.mjs';

export const meta = { key: 'who-are-ya', title: 'My Name Is…', route: '/whoareya' };

async function guessCount(page) {
  const t = (await leafTexts(page, 0, 70)).find((x) => /\/8/.test(x.t))?.t;
  return t ? parseInt(t.split('/')[0], 10) : 0;
}

export async function play(page, t) {
  await goto(page, '/whoareya');
  await dismissTutorial(page);

  let idx = 0, hintDone = false, landed = 0;
  while ((await guessCount(page)) < 8 && idx < FAMOUS.length) {
    if (await isGameOver(page)) break;
    if ((await page.locator('input').count()) === 0) break;
    const name = FAMOUS[idx++];
    const before = await guessCount(page);
    const ok = (await typeAndPick(page, name, name, { exactPick: true })) ||
               (await pickFirstSuggestion(page, name.split(' ')[0]));
    if (ok) landed++;
    await page.waitForTimeout(700);
    const after = await guessCount(page);
    // Exercise the hint once we have >=2 guesses (hint unlocks then).
    if (!hintDone && after >= 2) {
      const pressed = await pressButton(page, 'Get a Hint', false) || await pressButton(page, 'Hint', false);
      if (pressed) {
        await page.waitForTimeout(1000);
        const hintShown = (await leafTexts(page, 100, 340)).some((x) => /Nationality:|Position:|Team:|Age:|League:|Club:/i.test(x.t));
        t.check('hint reveals a clue attribute', hintShown, 'nationality/position/etc after hint');
      }
      hintDone = true;
    }
  }
  await page.waitForTimeout(1400);
  t.check('made at least one real guess', landed >= 1, `landed ${landed} guesses`);
  const over = await isGameOver(page) || await hasText(page, 'answer', { timeout: 1200 });
  t.check('reaches game-over via 8-guess exhaustion', over, `final guessCount ${await guessCount(page)}`);
}

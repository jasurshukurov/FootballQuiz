// Career Path — name the player from their club history. Autocomplete guessing;
// 3 wrong guesses = loss. Drive to game-over by guessing famous players.
import { goto, dismissTutorial, typeAndPick, pickFirstSuggestion, isGameOver, FAMOUS, hasText } from '../helpers.mjs';

export const meta = { key: 'careerpath', title: 'Career Path', route: '/careerpath' };

export async function play(page, t) {
  await goto(page, '/careerpath');
  await dismissTutorial(page);

  t.check('daily header renders', await hasText(page, 'CAREER PATH', { timeout: 3000 }) || await hasText(page, 'Career Path', { timeout: 1500 }), 'header text');

  // --- How-to-play affordance: "?" in the header reopens the rules sheet ---
  const infoBtn = page.locator('[data-testid="how-to-play-button"]').first();
  t.check('header shows the "?" how-to-play button',
    await infoBtn.isVisible({ timeout: 1500 }).catch(() => false), 'testID how-to-play-button');
  await infoBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  const sheetOpen = await page.locator('[data-testid="how-to-play-sheet"]').first()
    .isVisible({ timeout: 1500 }).catch(() => false);
  t.check('"?" button opens the how-to-play sheet', sheetOpen, 'testID how-to-play-sheet');
  await dismissTutorial(page);

  let guessed = 0;
  for (const name of FAMOUS) {
    if (await isGameOver(page)) break;
    if ((await page.locator('input').count()) === 0) break; // input gone => already resolved
    const ok = (await typeAndPick(page, name, name, { exactPick: true })) ||
               (await pickFirstSuggestion(page, name.split(' ')[0]));
    if (ok) guessed++;
    await page.waitForTimeout(1100);
    if (guessed >= 6) break;
  }
  await page.waitForTimeout(1400);

  t.check('made at least one real guess', guessed >= 1, `landed ${guessed} guesses`);
  // Loss reveals the answer gracefully (no shame). Confirm a reveal exists.
  const revealed = await hasText(page, 'answer', { timeout: 1500 }) || await isGameOver(page);
  t.check('resolves to a reveal / game-over', revealed, 'answer or terminal state shown');
}

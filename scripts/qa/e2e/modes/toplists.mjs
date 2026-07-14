// Top Lists — name everyone on today's ranking. Autocomplete + GUESS button,
// lives shown by the shared LivesIndicator (segment bars). Exhaust lives with
// famous wrong-but-valid guesses to reach game-over.
import { goto, dismissTutorial, pressButton, isGameOver, FAMOUS, hasText } from '../helpers.mjs';

export const meta = { key: 'toplists', title: 'Top Lists', route: '/toplists' };

export async function play(page, t) {
  await goto(page, '/toplists');
  await dismissTutorial(page);

  // Top Lists takes a free-text guess (no autocomplete dropdown): type a full
  // famous name and press GUESS. Wrong-but-valid names drain lives to the loss.
  let fi = 0, landed = 0;
  for (let i = 0; i < 12; i++) {
    if (await isGameOver(page)) break;
    if ((await page.locator('input').count()) === 0) break;
    const input = page.locator('input').first();
    try { await input.click({ force: true, timeout: 3000 }); await input.fill(''); } catch { break; }
    await input.pressSequentially(FAMOUS[fi++ % FAMOUS.length], { delay: 20 });
    await page.waitForTimeout(650);
    const pressed = await pressButton(page, 'GUESS', false);
    if (pressed) landed++;
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(1200);
  t.check('made at least one guess', landed >= 1, `submitted ${landed} guesses`);
  const over = await isGameOver(page) || await hasText(page, 'COMPLETE', { timeout: 1000 });
  t.check('reaches game-over via lives exhaustion', over, 'terminal state reached');
}

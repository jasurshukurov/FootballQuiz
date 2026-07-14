// ⚠️ DEPRECATED MODE — not registered in runner.mjs (Market Movers was removed
// from lib/modeRegistry.ts; it duplicated Higher/Lower). Kept so a revival
// only needs to re-import this module into the runner's MODES list.
//
// Market Movers — higher/lower on transfer fees. Challenger fee is hidden, so
// guessing HIGHER every round reaches a loss quickly. Streak-ranked game-over.
import { goto, dismissTutorial, leafTexts, pressButton, isGameOver, hasText } from '../helpers.mjs';

export const meta = { key: 'marketmovers', title: 'Market Movers', route: '/marketmovers' };

async function readStreak(page) {
  const txt = (await leafTexts(page, 0, 95)).find((x) => /^\d+$/.test(x.t));
  return txt ? parseInt(txt.t, 10) : 0;
}

export async function play(page, t) {
  await goto(page, '/marketmovers');
  await dismissTutorial(page);
  t.check('HIGHER/LOWER visible', await hasText(page, 'HIGHER', { timeout: 3000 }), 'CTA present');

  let rounds = 0, maxStreak = 0;
  for (let i = 0; i < 25; i++) {
    if (await isGameOver(page)) break;
    maxStreak = Math.max(maxStreak, await readStreak(page));
    const clicked = await pressButton(page, 'HIGHER', true);
    if (!clicked) break;
    rounds++;
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(1200);
  t.check('played rounds until a miss', rounds >= 1, `${rounds} rounds, max streak ${maxStreak}`);
  t.check('reaches game-over', await isGameOver(page), 'terminal state');
}

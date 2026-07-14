// Career Timeline — rebuild a player's career club by club. We exercise the
// hint, then hold "Give Up" to force the reveal / game-over.
import { goto, dismissTutorial, leafTexts, holdPress, clickText, isGameOver, hasText } from '../helpers.mjs';

export const meta = { key: 'careertimeline', title: 'Career Timeline', route: '/careertimeline' };

export async function play(page, t) {
  await goto(page, '/careertimeline');
  await dismissTutorial(page);
  t.check('timeline renders', await hasText(page, 'TIMELINE', { timeout: 3000 }) || await hasText(page, 'DAILY', { timeout: 1500 }), 'header');

  // Hint should advertise its cost (design: hints are a scored trade-off).
  const hintLabels = (await leafTexts(page, 0, 900)).map((x) => x.t).filter((s) => /Hint/i.test(s));
  if (hintLabels.length) {
    t.note('hint control present', hintLabels.join(' | '));
    await clickText(page, 'Hint', { exact: false });
    await page.waitForTimeout(700);
  }

  // End the game deterministically via Give Up (press-and-hold).
  const held = await holdPress(page, 'Give Up', 2000);
  await page.waitForTimeout(1500);
  t.check('Give Up control found', held, held ? '' : 'no Give Up button');

  const over = await isGameOver(page);
  t.check('reaches game-over via Give Up', over, 'terminal state');
  // Loss reveals the real career (clubs) — graceful reveal, not shame.
  const clubs = (await leafTexts(page, 120, 760)).map((x) => x.t)
    .filter((s) => s.length > 2 && !/\d{4}|Hint|XP|Give Up|GAME OVER|PLAY|Share|Copy|Today|Stats|More|NEXT/i.test(s));
  t.check('career reveal shows club names', clubs.length >= 1, `clubs: ${clubs.slice(0, 4).join(', ')}`);
}

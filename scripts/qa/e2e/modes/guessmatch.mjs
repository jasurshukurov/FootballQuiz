// Guess the Match — identify the game from its XI. Pick one of 4 match options;
// 3 wrong picks = loss. Invariants: a wrong pick does NOT disable/remove the
// option (you can pick it again), and 3 wrongs ends the game. Also exercises
// "Reveal next name".
import { goto, dismissTutorial, leafTexts, pressButton, clickText, isGameOver, hasText } from '../helpers.mjs';

export const meta = { key: 'guessmatch', title: 'Guess the Match', route: '/guessmatch' };

async function readOptions(page) {
  return (await leafTexts(page, 680, 1050)).map((x) => x.t)
    .filter((s) => /vs|final|cup|league|—|–|\d{4}/i.test(s));
}

async function mistakeCount(page) {
  // Wrong-pick markers ("X" glyphs / "mistakes" counter). Fall back to any /3.
  const txt = (await leafTexts(page, 0, 200)).map((x) => x.t).find((s) => /\/3|mistake/i.test(s));
  return txt || '';
}

export async function play(page, t) {
  await goto(page, '/guessmatch');
  await dismissTutorial(page);
  t.check('match prompt renders', await hasText(page, 'MATCH', { timeout: 3000 }) || await hasText(page, 'XI', { timeout: 1500 }) || (await readOptions(page)).length >= 1, 'prompt/options');

  // Exercise reveal-next-name a couple of times.
  await pressButton(page, 'Reveal next name', false);
  await page.waitForTimeout(600);
  await pressButton(page, 'Reveal next name', false);
  await page.waitForTimeout(600);

  const opts = await readOptions(page);
  t.check('shows match options', opts.length >= 1, `options: ${opts.slice(0, 3).join(' | ')}`);

  // --- Invariant: a wrong pick does NOT disable the option. ---
  let disabledInvariantOk = null;
  if (opts.length) {
    const target = opts[0];
    const clickedFirst = await pressButton(page, target.slice(0, 18), false) || await clickText(page, target.slice(0, 18), { exact: false });
    await page.waitForTimeout(1500);
    if (!(await isGameOver(page))) {
      // Same option should still be present & tappable after a wrong pick.
      const stillThere = (await readOptions(page)).some((s) => s.slice(0, 18) === target.slice(0, 18));
      const reTappable = await pressButton(page, target.slice(0, 18), false);
      disabledInvariantOk = stillThere && !!reTappable;
      t.check('guessmatch wrong pick does NOT disable the option', disabledInvariantOk,
        `stillPresent=${stillThere} reTappable=${!!reTappable}`);
      await page.waitForTimeout(1500);
    } else {
      t.note('guessmatch ended immediately (could not re-test option)', 'first pick was correct or single-life');
    }
  }

  // --- Drive to loss: keep picking the first option until 3 wrongs end it. ---
  for (let i = 0; i < 6; i++) {
    if (await isGameOver(page)) break;
    const o = await readOptions(page);
    if (!o[0]) break;
    const ok = await pressButton(page, o[0].slice(0, 18), false) || await clickText(page, o[0].slice(0, 18), { exact: false });
    if (!ok) break;
    await page.waitForTimeout(1600);
  }
  await page.waitForTimeout(1000);
  t.check('reaches game-over (3 wrong = loss)', await isGameOver(page), `mistakes ${await mistakeCount(page)}`);
}

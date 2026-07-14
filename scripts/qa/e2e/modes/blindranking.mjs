// Blind Ranking — rank 5 players into slots #1..#5 without seeing values. We
// align to the deterministic sim puzzle and place each into its correct slot,
// then assert the reveal marks each pick exact/adjacent (partial scoring).
import { goto, dismissTutorial, leafTexts, pressButton, hasText, dateWindow } from '../helpers.mjs';
import { generateBlindRankingPuzzle, getModeSeed } from '../../playtest/sim.mjs';

export const meta = { key: 'blindranking', title: 'Blind Ranking', route: '/blindranking' };

export async function play(page, t) {
  await goto(page, '/blindranking');
  await dismissTutorial(page);

  const descText = (await leafTexts(page, 40, 220)).map((x) => x.t).join(' ');
  const cands = dateWindow(3).map((d) => generateBlindRankingPuzzle(getModeSeed('blindranking', d)));
  const puzzle = cands.find((c) => descText.includes(c.category.description)) || null;
  t.check('aligned to deterministic sim puzzle', !!puzzle, puzzle ? puzzle.category.title : `desc: ${descText.slice(0, 60)}`);

  for (let step = 0; step < 5; step++) {
    const shown = (await leafTexts(page, 100, 280)).map((x) => x.t);
    let slot = step;
    if (puzzle) for (const nm of Object.keys(puzzle.slotByName)) { if (shown.includes(nm)) { slot = puzzle.slotByName[nm]; break; } }
    await pressButton(page, `#${slot + 1}`, true);
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(3500); // staggered reveal

  const rt = (await leafTexts(page, 0, 320)).map((x) => x.t);
  t.check('reveal shows a result title', rt.some((s) => /BRILLIANT|NICE|TOUGH|PERFECT|CORRECT|SPOT ON/i.test(s)) || await hasText(page, '/5', { timeout: 1000 }),
    rt.find((s) => /\/5|BRILLIANT|PERFECT|NICE|TOUGH/i.test(s)) || 'result title');

  // Invariant: per-slot reveal marks exact / adjacent (partial credit language).
  const revealText = (await leafTexts(page, 100, 900)).map((x) => x.t).join(' ');
  const hasExactAdjacent = /exact|adjacent|off by|spot on|1 off|one off|correct spot/i.test(revealText);
  t.check('reveal marks exact/adjacent placements', hasExactAdjacent, revealText.slice(0, 120));
}

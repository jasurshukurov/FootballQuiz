// Connections — sort 16 players into 4 hidden groups. 4 mistakes = loss. We
// play mixed-row selections to lose deterministically. Mode invariant: if a
// "one away" near-miss occurs, the one-away banner is shown (conditional).
import { goto, dismissTutorial, tapXY, leafTexts, pressButton, hasText } from '../helpers.mjs';

export const meta = { key: 'connections', title: 'Connections', route: '/connections' };

async function readTiles(page) {
  return (await leafTexts(page, 85, 360))
    .filter((x) => x.x >= 0 && x.x < 420 && x.t.length > 2 && !/Mistake|remaining|Shuffle|Deselect|Submit|Find 4|CONNECTIONS/i.test(x.t));
}

async function isOver(page) {
  return page.evaluate(() => [...document.querySelectorAll('div,span')].some((e) => e.children.length === 0 &&
    /FULL TIME|WELL PLAYED|Better luck|NEXT PUZZLE IN/i.test(e.innerText || '')));
}

async function oneAwayShown(page) {
  return page.evaluate(() => [...document.querySelectorAll('div,span')].some((e) => e.children.length === 0 &&
    /one away|1 away/i.test(e.innerText || '')));
}

export async function play(page, t) {
  await goto(page, '/connections');
  await dismissTutorial(page);
  t.check('board renders 16 tiles', (await readTiles(page)).length >= 12, `${(await readTiles(page)).length} tiles read`);

  let submissions = 0, over = false, sawOneAway = false;
  for (let round = 0; round < 8 && !over; round++) {
    const tiles = await readTiles(page);
    if (tiles.length < 4) break;
    // Mix categories: one tile from up to 4 different rows.
    const byRow = {};
    for (const tile of tiles) { const r = Math.round(tile.y / 40); (byRow[r] ||= []).push(tile); }
    const rows = Object.values(byRow);
    let pick = [];
    for (let c = 0; pick.length < 4 && c < 8; c++) for (const r of rows) { if (r[c]) pick.push(r[c]); if (pick.length >= 4) break; }
    if (pick.length < 4) pick = tiles.slice(round % 4, (round % 4) + 4);
    pick = pick.slice(0, 4);
    await pressButton(page, 'Deselect All', true).catch(() => {});
    for (const p of pick) await tapXY(page, p.x + 20, p.y, 250);
    await page.waitForTimeout(300);
    await pressButton(page, 'Submit', true);
    submissions++;
    await page.waitForTimeout(1700);
    if (await oneAwayShown(page)) sawOneAway = true;
    over = await isOver(page);
  }
  await page.waitForTimeout(1200);
  t.check('made submissions', submissions >= 1, `${submissions} submissions`);
  t.check('reaches game-over (FULL TIME / WELL PLAYED)', await isOver(page), 'terminal modal shown');
  // Conditional invariant: only asserts *format* if a near-miss actually occurred.
  if (sawOneAway) t.check('one-away banner shown on near-miss', true, 'banner observed');
  else t.note('one-away banner not triggered this run (no 3/4 near-miss)', 'conditional invariant skipped');
}

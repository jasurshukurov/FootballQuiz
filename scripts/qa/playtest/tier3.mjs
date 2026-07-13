import { launch, goto, shot, dismissTutorial, hasText } from './helpers.mjs';

const { browser, page, logs } = await launch();

async function pressButton(page, label) {
  const rect = await page.evaluate((lbl) => {
    const t = [...document.querySelectorAll('div,span')].find(
      (el) => el.children.length === 0 && el.innerText?.trim() === lbl);
    if (!t) return null;
    let n = t;
    for (let k = 0; k < 6 && n.parentElement; k++) {
      const r = n.getBoundingClientRect();
      if (r.height >= 44 && r.width >= 80) break;
      n = n.parentElement;
    }
    const r = n.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, label);
  if (!rect) return false;
  await page.mouse.click(rect.x, rect.y);
  await page.waitForTimeout(300);
  return true;
}

async function readChallenges() {
  return await page.evaluate(() => {
    const el = [...document.querySelectorAll('div,span')].find(
      (e) => e.children.length === 0 && /\/\d+\s*Complete/.test(e.innerText || ''));
    return el ? el.innerText.trim() : 'N/A';
  });
}

const out = {};

// 1. baseline
await goto(page, '/profile');
out.before = await readChallenges();

// 2. play higherlower to game over
await goto(page, '/higherlower');
await dismissTutorial(page);
for (let i = 0; i < 20; i++) {
  if (await hasText(page, 'GAME OVER') || await hasText(page, 'Play Again')) break;
  await pressButton(page, 'HIGHER');
  await page.waitForTimeout(1100);
}
out.higherlowerOver = await hasText(page, 'Play Again');

// 3. re-check stats
await goto(page, '/profile');
out.afterNormal = await readChallenges();
await shot(page, 'tier3_stats_after_normal');

// 4. practice connections
await goto(page, '/connections?practiceDate=2026-07-10');
await dismissTutorial(page);
out.practicePill = await hasText(page, 'PRACTICE');
await shot(page, 'tier3_practice_pill');
const EX = ['SHUFFLE','SUBMIT','DESELECT ALL','CONNECTIONS','Find 4 groups of 4 players','Mistakes remaining:','Home','Stats','Support','Modes','PRACTICE — 2026-07-10'];
for (let round = 0; round < 4; round++) {
  const names = await page.evaluate((EXX) => {
    const o = [];
    document.querySelectorAll('div,span').forEach((el) => {
      if (el.children.length === 0) {
        const t = el.innerText?.trim();
        const b = el.getBoundingClientRect();
        if (t && t.length > 3 && t.length < 30 && b.x > 0 && b.y > 120 && b.y < 660 && !EXX.includes(t)) o.push(t);
      }
    });
    return [...new Set(o)];
  }, EX);
  for (const nm of names.slice(0, 4)) await pressButton(page, nm);
  await page.waitForTimeout(300);
  await pressButton(page, 'SUBMIT');
  await page.waitForTimeout(1400);
  if (await hasText(page, 'Play Again')) break;
  await pressButton(page, 'DESELECT ALL');
  await page.waitForTimeout(400);
}
out.practiceOver = await hasText(page, 'Play Again');

// 5. re-check stats — should be unchanged from afterNormal
await goto(page, '/profile');
out.afterPractice = await readChallenges();

console.log('@@TIER3@@', JSON.stringify(out));
console.log('errors', JSON.stringify(logs.errors.slice(0, 5)));
console.log('pageerrors', JSON.stringify(logs.pageerrors.slice(0, 5)));
await browser.close();

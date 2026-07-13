import { launch, goto, shot, dismissTutorial, hasText } from './helpers.mjs';

const { browser, page, logs } = await launch();
const out = { errors: [], pageerrors: [] };

async function pressButton(page, label) {
  const rect = await page.evaluate((lbl) => {
    const L = lbl.toLowerCase();
    const t = [...document.querySelectorAll('div,span')].find(
      (el) => el.children.length === 0 && el.innerText?.trim().toLowerCase() === L);
    if (!t) return null;
    let n = t;
    for (let k = 0; k < 6 && n.parentElement; k++) {
      const r = n.getBoundingClientRect();
      if (r.height >= 40 && r.width >= 60) break;
      n = n.parentElement;
    }
    const r = n.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, label);
  if (!rect) return false;
  await page.mouse.click(rect.x, rect.y);
  await page.waitForTimeout(250);
  return true;
}
async function challengeCount() {
  return await page.evaluate(() => {
    const el = [...document.querySelectorAll('div,span')].find(
      (e) => e.children.length === 0 && /\/\d+\s*Complete/.test(e.innerText || ''));
    return el ? el.innerText.trim() : 'N/A';
  });
}
async function playConnectionsToEnd() {
  const EX = ['SHUFFLE','SUBMIT','DESELECT ALL','CONNECTIONS','Find 4 groups of 4 players','Mistakes remaining:','Home','Stats','Support','Modes'];
  for (let round = 0; round < 4; round++) {
    const names = await page.evaluate((EXX) => {
      const o = [];
      document.querySelectorAll('div,span').forEach((el) => {
        if (el.children.length === 0) {
          const t = el.innerText?.trim();
          const b = el.getBoundingClientRect();
          if (t && t.length > 3 && t.length < 30 && b.x > 0 && b.y > 120 && b.y < 680 && !EXX.includes(t) && !/practice/i.test(t)) o.push(t);
        }
      });
      return [...new Set(o)];
    }, EX);
    for (const nm of names.slice(0, 4)) await pressButton(page, nm);
    await page.waitForTimeout(250);
    await pressButton(page, 'SUBMIT');
    await page.waitForTimeout(1300);
    if (await hasText(page, 'Play Again') || await hasText(page, 'FULL TIME')) break;
    await pressButton(page, 'DESELECT ALL');
    await page.waitForTimeout(300);
  }
}

// 1. baseline
await goto(page, '/profile');
out.before = await challengeCount();
out.recapBtnBefore = await hasText(page, 'RECAP') || await hasText(page, 'Daily Recap');

// 2. enter practice from ARCHIVE (tap connections icon on first date row)
await goto(page, '/archive');
const icon = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('div')].filter((el) => {
    const r = el.getBoundingClientRect();
    return Math.abs(r.width - 40) < 8 && Math.abs(r.height - 40) < 8 && r.y > 60 && r.y < 170 && r.x > 200;
  });
  const third = btns[2] || btns[btns.length - 1];
  if (!third) return null;
  const r = third.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, found: btns.length };
});
out.archiveIconsFound = icon?.found ?? 0;
if (icon) { await page.mouse.click(icon.x, icon.y); await page.waitForTimeout(2500); }
out.practiceUrl = page.url();
out.practicePill = await hasText(page, 'PRACTICE');
await dismissTutorial(page);
await shot(page, 'fp_archive_practice');
await playConnectionsToEnd();
out.practiceCompleted = await hasText(page, 'Play Again') || await hasText(page, 'FULL TIME');

// 3. counter must NOT tick
await goto(page, '/profile');
out.afterPractice = await challengeCount();

// 4. complete a REAL mode (higherlower)
await goto(page, '/higherlower');
await dismissTutorial(page);
for (let i = 0; i < 20; i++) {
  if (await hasText(page, 'Play Again') || await hasText(page, 'GAME OVER')) break;
  await pressButton(page, 'HIGHER');
  await page.waitForTimeout(1100);
}
out.realCompleted = await hasText(page, 'Play Again');

// 5. counter must tick; recap absent when <12/12
await goto(page, '/profile');
out.afterReal = await challengeCount();
out.recapBtnAfter = await hasText(page, 'RECAP') || await hasText(page, 'Daily Recap');
await shot(page, 'fp_archive_stats');

out.errors = logs.errors.slice(0, 8);
out.pageerrors = logs.pageerrors.slice(0, 8);
console.log('@@ARCHIVE@@', JSON.stringify(out));
await browser.close();

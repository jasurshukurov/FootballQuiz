import { launch, goto, shot, dismissTutorial, hasText, dumpDom } from './helpers.mjs';

const { browser, page, logs } = await launch();
const out = { errors: [], pageerrors: [] };

async function pressButton(page, label) {
  const rect = await page.evaluate((lbl) => {
    const t = [...document.querySelectorAll('div,span')].find(
      (el) => el.children.length === 0 && el.innerText?.trim() === lbl);
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

async function typeGuess(page, text) {
  const input = page.locator('input').first();
  await input.click();
  await input.fill(text);
  await input.press('Enter');
  await page.waitForTimeout(600);
}

// ---- Phase A: play to game over ----
await goto(page, '/toplists');
await dismissTutorial(page);
await shot(page, 'fp_toplists_mid');
out.listTitle = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div,span')].find(e => e.children.length===0 && /found$/.test(e.innerText||''));
  return el ? el.innerText : '';
});

// one plausible correct guess (Ligue 1 2015-16 top scorer = Ibrahimovic, 38)
await typeGuess(page, 'Zlatan Ibrahimovic');
out.afterCorrect = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div,span')].find(e => e.children.length===0 && /\/\d+ found/.test(e.innerText||''));
  return el ? el.innerText.trim() : '?';
});
await shot(page, 'fp_toplists_aftercorrect');

// burn 4 lives with garbage
for (let i = 0; i < 4; i++) {
  await typeGuess(page, `zzqqxw${i}`);
  if (await hasText(page, 'FULL TIME') || await hasText(page, 'FULL MARKS')) break;
}
await page.waitForTimeout(800);
out.gameOverTitle = (await hasText(page, 'FULL TIME')) ? 'FULL TIME'
  : (await hasText(page, 'FULL MARKS')) ? 'FULL MARKS!' : 'NONE';
out.shareShown = await hasText(page, 'Share Result') || await hasText(page, 'SHARE RESULT');
await shot(page, 'fp_toplists_over');
const overDom = await dumpDom(page);
out.overTexts = overDom.texts.slice(0, 30);

// ---- Phase B: re-open (full reload, same context) => once-per-day lock ----
await goto(page, '/toplists');
await page.waitForTimeout(1500);
out.lock_alreadyPlayed = await hasText(page, 'ALREADY PLAYED TODAY');
out.lock_hasCountdown = await hasText(page, 'NEXT PUZZLE') || await hasText(page, ':');
out.lock_inputCount = await page.locator('input').count();
out.lock_guessBtn = await hasText(page, 'GUESS');
// verify names revealed (no ??? placeholders)
out.lock_hiddenPlaceholders = await page.evaluate(() =>
  [...document.querySelectorAll('div,span')].filter(e => e.children.length===0 && e.innerText?.trim()==='???').length);
await shot(page, 'fp_toplists_lock');

out.errors = logs.errors.slice(0, 8);
out.pageerrors = logs.pageerrors.slice(0, 8);
console.log('@@TOPLISTS@@', JSON.stringify(out));
await browser.close();

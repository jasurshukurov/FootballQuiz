import { launch, goto, shot, dismissTutorial, hasText } from './helpers.mjs';

const { browser, page, logs } = await launch();
const out = { errors: [], pageerrors: [] };

async function pickSuggestion(page, text, pick) {
  const input = page.locator('input').first();
  await input.click({ force: true });
  await input.fill('');
  await input.pressSequentially(text, { delay: 20 });
  await page.waitForTimeout(700);
  const loc = page.getByText(pick, { exact: false });
  const n = await loc.count();
  for (let i = 0; i < n; i++) {
    const box = await loc.nth(i).boundingBox().catch(() => null);
    if (box && box.x >= 0 && box.y >= 20 && box.y < 900) {
      await loc.nth(i).click({ force: true });
      await page.waitForTimeout(500);
      return true;
    }
  }
  return false;
}
async function pressButton(page, label) {
  const rect = await page.evaluate((lbl) => {
    const L = lbl.toLowerCase();
    const t = [...document.querySelectorAll('div,span')].find(
      (el) => el.children.length === 0 && (el.innerText?.trim().toLowerCase().startsWith(L)));
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
  await page.waitForTimeout(300);
  return true;
}
const hintTextShown = () => page.evaluate(() =>
  !![...document.querySelectorAll('div,span')].find(e => e.children.length===0 && /Nationality:/.test(e.innerText||'')));

// ---- Daily: use a hint ----
await goto(page, '/whoareya');
await dismissTutorial(page);
out.g1 = await pickSuggestion(page, 'Ronaldo', 'Ronaldo');
out.g2 = await pickSuggestion(page, 'Kane', 'Kane');
out.hintBtnAfter2 = await hasText(page, 'Get a Hint');
await shot(page, 'fp_whoareya_hintbtn');
await pressButton(page, 'Get a Hint');
await page.waitForTimeout(900); // ad mock 500ms
out.hintTextShown = await hintTextShown();
out.hintValue = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div,span')].find(e => e.children.length===0 && /Nationality:/.test(e.innerText||''));
  return el ? el.innerText.trim() : '';
});
await shot(page, 'fp_whoareya_hintused');

// ---- Enter practice: hint must reset ----
await goto(page, '/whoareya?practiceDate=2026-07-10');
await page.waitForTimeout(1500);
out.practicePill = await hasText(page, 'PRACTICE');
out.staleHintOnEntry = await hintTextShown(); // should be FALSE
// make 2 guesses -> hint button should be available again
await pickSuggestion(page, 'Messi', 'Messi');
await pickSuggestion(page, 'Salah', 'Salah');
out.hintBtnAvailAgain = await hasText(page, 'Get a Hint');
out.staleHintAfter2 = await hintTextShown(); // still FALSE until pressed
await shot(page, 'fp_whoareya_practice');

out.errors = logs.errors.slice(0, 8);
out.pageerrors = logs.pageerrors.slice(0, 8);
console.log('@@WHOAREYA@@', JSON.stringify(out));
await browser.close();

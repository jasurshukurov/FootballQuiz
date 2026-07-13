import { launch, goto, dismissTutorial } from './helpers.mjs';

const { browser, page } = await launch();
await goto(page, '/marketmovers');
await dismissTutorial(page);
await page.waitForTimeout(500);

async function streak() {
  return await page.evaluate(() => {
    for (const el of document.querySelectorAll('div,span')) {
      if (el.children.length === 0 && /^Streak:/.test(el.innerText?.trim() || '')) return el.innerText.trim();
    }
    return '?';
  });
}
async function challengerHidden() {
  return await page.evaluate(() => !![...document.querySelectorAll('div,span')].find(el => el.innerText?.trim() === '???'));
}

console.log('start', await streak(), 'hidden?', await challengerHidden());

// Method A: getByText force click
for (let i = 0; i < 3; i++) {
  await page.getByText('HIGHER', { exact: false }).first().click({ force: true });
  await page.waitForTimeout(1300);
  console.log('A click', i, await streak(), 'hidden?', await challengerHidden());
}

// Method B: click the Pressable ancestor of HIGHER text
const handle = await page.evaluateHandle(() => {
  const t = [...document.querySelectorAll('div,span')].find(el => el.innerText?.trim() === 'HIGHER');
  // walk up to the pressable (has role button or tabindex or onclick)
  let n = t;
  for (let k = 0; k < 5 && n; k++) { n = n.parentElement; if (n && (n.getAttribute('role') === 'button' || n.tabIndex >= 0)) return n; }
  return t?.parentElement;
});
for (let i = 0; i < 3; i++) {
  await handle.asElement()?.click({ force: true }).catch(async () => {
    const box = await handle.asElement()?.boundingBox();
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  });
  await page.waitForTimeout(1300);
  console.log('B click', i, await streak(), 'hidden?', await challengerHidden());
}

// Method C: raw coordinate click on button center (from screenshot ~ x113 y419)
for (let i = 0; i < 3; i++) {
  await page.mouse.click(113, 419);
  await page.waitForTimeout(1300);
  console.log('C click', i, await streak(), 'hidden?', await challengerHidden());
}

// Inspect the HIGHER element attributes
const attrs = await page.evaluate(() => {
  const t = [...document.querySelectorAll('div,span')].find(el => el.innerText?.trim() === 'HIGHER');
  const out = [];
  let n = t;
  for (let k = 0; k < 4 && n; k++) {
    out.push({ tag: n.tagName, role: n.getAttribute('role'), tabindex: n.tabIndex, cls: (n.className || '').slice(0, 30), pe: getComputedStyle(n).pointerEvents });
    n = n.parentElement;
  }
  return out;
});
console.log('ATTRS', JSON.stringify(attrs, null, 1));
await browser.close();

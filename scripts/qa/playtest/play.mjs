import { launch, goto, shot, dismissTutorial, hasText, dumpDom } from './helpers.mjs';

const mode = process.argv[2] || 'career';
const R = { mode, played: false, notes: [], errors: [], pageerrors: [], surface: {} };
const log = (...a) => { console.log(...a); R.notes.push(a.join(' ')); };

/** Type into input and click first ON-SCREEN suggestion matching `pick` (avoids offscreen share views). */
async function pickSuggestion(page, text, pick, { inputIndex = 0 } = {}) {
  const input = page.locator('input').nth(inputIndex);
  await input.click({ force: true });
  await input.fill('');
  await input.pressSequentially(text, { delay: 20 });
  await page.waitForTimeout(700);
  const loc = page.getByText(pick, { exact: false });
  const n = await loc.count();
  for (let i = 0; i < n; i++) {
    const el = loc.nth(i);
    const box = await el.boundingBox().catch(() => null);
    if (box && box.x >= 0 && box.y >= 20 && box.y < 900) {
      await el.click({ force: true });
      await page.waitForTimeout(600);
      return true;
    }
  }
  return false;
}

/** Click the CENTER of an on-screen element via raw mouse events. More reliable
 *  than locator.click for RN-Web Pressables whose child Text swallows synthetic clicks. */
async function mouseClick(page, text, { exact = false } = {}) {
  const loc = page.getByText(text, { exact });
  const n = await loc.count();
  for (let i = 0; i < n; i++) {
    const box = await loc.nth(i).boundingBox().catch(() => null);
    if (box && box.x >= 0 && box.y >= 0 && box.y < 932) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(300);
      return true;
    }
  }
  return false;
}

/** Press a button identified by its label text: walk up to the tappable ancestor
 *  (the RN-Web Pressable) and click ITS center with raw mouse events. */
async function pressButton(page, label) {
  const rect = await page.evaluate((lbl) => {
    const t = [...document.querySelectorAll('div,span')].find(
      (el) => el.children.length === 0 && el.innerText?.trim() === lbl,
    );
    if (!t) return null;
    // ascend to a sizeable tappable container
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

async function clickOnScreen(page, text, { exact = false } = {}) {
  const loc = page.getByText(text, { exact });
  const n = await loc.count();
  for (let i = 0; i < n; i++) {
    const el = loc.nth(i);
    const box = await el.boundingBox().catch(() => null);
    if (box && box.x >= 0 && box.y >= 0 && box.y < 932) {
      await el.click({ force: true });
      await page.waitForTimeout(400);
      return true;
    }
  }
  return false;
}

/** Long-press an on-screen element (for hold-to-reveal Give Up). */
async function holdPress(page, text, ms = 900) {
  const loc = page.getByText(text, { exact: false });
  const n = await loc.count();
  for (let i = 0; i < n; i++) {
    const el = loc.nth(i);
    const box = await el.boundingBox().catch(() => null);
    if (box && box.x >= 0 && box.y >= 0 && box.y < 932) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(ms);
      await page.mouse.up();
      await page.waitForTimeout(600);
      return true;
    }
  }
  return false;
}

async function checkSurface(page) {
  R.surface.shareResult = await hasText(page, 'Share Result');
  R.surface.copyResult = await hasText(page, 'Copy Result') || await hasText(page, 'COPY');
  R.surface.playAgain = await hasText(page, 'Play Again') || await hasText(page, 'PLAY AGAIN') || await hasText(page, 'Next');
  R.surface.countdown = await hasText(page, 'NEXT') || await hasText(page, 'Next puzzle') || await hasText(page, ':');
  R.surface.streak = await hasText(page, 'STREAK') || await hasText(page, 'Streak') || await hasText(page, 'DAY');
}

const { browser, page, logs } = await launch();

try {
  const route = { career: '/', whoareya: '/whoareya', grid: '/explore', careertimeline: '/careertimeline',
    connections: '/connections', higherlower: '/higherlower', blindranking: '/blindranking',
    missing11: '/missing11', badge: '/badge', agent: '/agent',
    marketmovers: '/marketmovers', guessmatch: '/guessmatch' }[mode];
  await goto(page, route);
  await dismissTutorial(page);
  await page.waitForTimeout(500);
  await shot(page, `${mode}_mid`);

  if (mode === 'career') {
    log('wrong guess Messi to test feedback');
    await pickSuggestion(page, 'Messi', 'Messi');
    await page.waitForTimeout(600);
    await shot(page, 'career_afterwrong');
    log('give up (long-press) to reach game over');
    await holdPress(page, 'Give Up', 900);
    await page.waitForTimeout(1500);
  }

  if (mode === 'careertimeline') {
    log('tap a hidden (?) node to open club search');
    await clickOnScreen(page, '?', { exact: true });
    await page.waitForTimeout(800);
    await shot(page, 'careertimeline_search');
    const inputs = await page.locator('input').count();
    log('club search inputs after node tap:', inputs);
    if (inputs) {
      const ok = await pickSuggestion(page, 'Manchester Uni', 'Manchester');
      log('guessed a club:', ok);
      await page.waitForTimeout(800);
    }
    log('give up (hold) to reach game over');
    await holdPress(page, 'Give Up', 900);
    await page.waitForTimeout(1300);
  }

  if (mode === 'whoareya') {
    const guesses = ['Ronaldo', 'Messi', 'Mbappe', 'Haaland', 'Kane', 'Salah', 'Neymar', 'Modric'];
    for (const g of guesses) {
      const ok = await pickSuggestion(page, g, g);
      log('guess', g, ok);
      await page.waitForTimeout(500);
      if (await hasText(page, 'Share Result')) { log('game over after', g); break; }
    }
    if (!(await hasText(page, 'Share Result'))) {
      log('give up (hold) to reach game over');
      await holdPress(page, 'Give Up', 900);
      await page.waitForTimeout(1200);
    }
  }

  if (mode === 'grid') {
    // click a cell then guess
    log('clicking a grid cell (?)');
    await clickOnScreen(page, '?');
    await page.waitForTimeout(600);
    await shot(page, 'grid_cellopen');
    // an input/modal may appear
    const hasInput = await page.locator('input').count();
    log('inputs after cell click:', hasInput);
    if (hasInput) {
      for (const g of ['Ronaldo', 'Messi', 'Benzema', 'Kroos', 'Modric']) {
        const ok = await pickSuggestion(page, g, g);
        log('grid guess', g, ok);
        if (!ok) break;
        await page.waitForTimeout(500);
        // reopen a cell if needed
        if (await hasText(page, 'Guesses left: 0')) break;
        await clickOnScreen(page, '?');
        await page.waitForTimeout(400);
      }
    }
  }

  if (mode === 'connections') {
    const EXCLUDE = ['SHUFFLE', 'SUBMIT', 'DESELECT ALL', 'CONNECTIONS', 'Find 4 groups of 4 players',
      'Mistakes remaining:', 'Home', 'Stats', 'Support', 'Modes'];
    for (let round = 0; round < 4; round++) {
      const names = await page.evaluate((EX) => {
        const out = [];
        document.querySelectorAll('div,span').forEach((el) => {
          if (el.children.length === 0) {
            const t = el.innerText?.trim();
            const box = el.getBoundingClientRect();
            if (t && t.length > 3 && t.length < 30 && box.x > 0 && box.y > 120 && box.y < 640
                && !EX.includes(t)) out.push(t);
          }
        });
        return [...new Set(out)];
      }, EXCLUDE);
      const pick = names.slice(0, 4);
      log('round', round, 'select:', pick.join(' / '));
      for (const nm of pick) await pressButton(page, nm);
      await page.waitForTimeout(300);
      if (round === 0) await shot(page, 'connections_selected');
      await pressButton(page, 'SUBMIT');
      await page.waitForTimeout(1400);
      if (await hasText(page, 'Share Result') || await hasText(page, 'Play Again')) { log('connections over round', round); break; }
      await pressButton(page, 'DESELECT ALL');
      await page.waitForTimeout(400);
    }
  }

  if (mode === 'higherlower') {
    for (let i = 0; i < 20; i++) {
      const over = await hasText(page, 'Share Result') || await hasText(page, 'GAME OVER') || await hasText(page, 'Play Again');
      if (over) { log('higherlower game over at round', i); break; }
      await pressButton(page, "HIGHER");
      await page.waitForTimeout(1100);
    }
  }

  if (mode === 'blindranking') {
    for (let i = 1; i <= 5; i++) {
      const placed = await clickOnScreen(page, `#${i}`, { exact: false });
      log('place slot', i, placed);
      await page.waitForTimeout(900);
    }
    await page.waitForTimeout(1000);
  }

  if (mode === 'missing11') {
    await shot(page, 'missing11_start');
    // try tapping a position slot to reveal input
    await clickOnScreen(page, '?');
    await page.waitForTimeout(600);
    const inputs = await page.locator('input').count();
    log('inputs after slot tap:', inputs);
    if (inputs) {
      for (const g of ['Ronaldo', 'Materazzi', 'Zanetti', 'Vieri', 'Cordoba', 'Toldo']) {
        const ok = await pickSuggestion(page, g, g);
        log('m11 guess', g, ok);
        await page.waitForTimeout(500);
      }
    }
    // try hint
    await clickOnScreen(page, 'HINT');
    await page.waitForTimeout(600);
  }

  if (mode === 'badge') {
    for (let r = 0; r < 6; r++) {
      if (await hasText(page, 'Share Result') || await hasText(page, 'Play Again')) break;
      // options are uppercase club names; click first plausible option row (y 250-700)
      const opt = await page.evaluate(() => {
        for (const el of document.querySelectorAll('div,span')) {
          if (el.children.length === 0) {
            const t = el.innerText?.trim();
            const b = el.getBoundingClientRect();
            if (t && t.length > 2 && b.y > 250 && b.y < 720 && b.x > 10) return t;
          }
        }
        return null;
      });
      log('badge round', r, 'pick', opt);
      if (opt) await clickOnScreen(page, opt, { exact: true });
      await page.waitForTimeout(1200);
    }
  }

  if (mode === 'agent') {
    for (let r = 0; r < 12; r++) {
      if (await hasText(page, 'Share Result') || await hasText(page, 'Play Again')) break;
      const opt = await page.evaluate(() => {
        for (const el of document.querySelectorAll('div,span')) {
          if (el.children.length === 0) {
            const t = el.innerText?.trim();
            const b = el.getBoundingClientRect();
            if (t && t.length > 2 && b.y > 250 && b.y < 720 && b.x > 10
                && !t.includes('Show Transfer')) return t;
          }
        }
        return null;
      });
      log('agent round', r, 'pick', opt);
      if (opt) await clickOnScreen(page, opt, { exact: true });
      await page.waitForTimeout(900);
    }
  }

  if (mode === 'marketmovers') {
    let ended = false;
    for (let i = 0; i < 30; i++) {
      if (await hasText(page, 'FULL TIME')) { log('FULL TIME at round', i); ended = true; break; }
      await pressButton(page, "HIGHER");
      await page.waitForTimeout(1300); // 900ms advance / 1100ms gameover
      if (i === 1) await shot(page, 'marketmovers_reveal');
    }
    log('reached game over:', ended);
  }

  if (mode === 'guessmatch') {
    log('reveal a few names first');
    await clickOnScreen(page, 'Reveal next name');
    await page.waitForTimeout(500);
    await clickOnScreen(page, 'Reveal next name');
    await page.waitForTimeout(500);
    await shot(page, 'guessmatch_revealed');
    // grab the 4 match options (long strings with 'vs' / '—')
    const opts = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('div,span').forEach((el) => {
        if (el.children.length === 0) {
          const t = el.innerText?.trim();
          const b = el.getBoundingClientRect();
          if (t && (t.includes(' vs ') || t.includes('Final')) && b.x > 0) out.push(t);
        }
      });
      return [...new Set(out)];
    });
    log('options:', opts.join(' | '));
    for (const o of opts) {
      if (await hasText(page, 'GOT IT') || await hasText(page, 'FULL TIME')) break;
      await clickOnScreen(page, o, { exact: true });
      await page.waitForTimeout(900);
    }
  }

  // Final surface + screenshot
  await page.waitForTimeout(800);
  await checkSurface(page);
  R.played = R.surface.shareResult || R.surface.playAgain || false;
  await shot(page, `${mode}_over`);
  const dom = await dumpDom(page);
  R.finalTexts = dom.texts.slice(0, 40);
} catch (e) {
  R.fatal = e.message;
  await shot(page, `${mode}_error`).catch(() => {});
}

R.errors = logs.errors.slice(0, 15);
R.pageerrors = logs.pageerrors.slice(0, 15);
console.log('\n@@RESULT@@', JSON.stringify(R));
await browser.close();

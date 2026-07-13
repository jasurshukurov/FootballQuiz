import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { generateBlindRankingPuzzle, getModeSeed, missing11ForDate, missing11Side } from './sim.mjs';

const BASE = 'http://localhost:8081';
const SHOTS = path.resolve('scripts/qa/playtest/shots2');
const VIEWPORT = { width: 430, height: 932 };
fs.mkdirSync(SHOTS, { recursive: true });

const which = process.argv[2] || 'all';
const R = { which, notes: [], errors: [], pageerrors: [], data: {} };
const log = (...a) => { const s = a.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(' '); console.log(s); R.notes.push(s); };

async function launch() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const logs = { errors: [], pageerrors: [] };
  page.on('console', (m) => { if (m.type() === 'error') logs.errors.push(m.text()); });
  page.on('pageerror', (e) => logs.pageerrors.push(e.message));
  return { browser, context, page, logs };
}
async function goto(page, route) { await page.goto(BASE + route, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2800); }
async function shot(page, name) { const f = path.join(SHOTS, `${name}.png`); await page.screenshot({ path: f }); return f; }
async function hasText(page, t, { exact = false, timeout = 1000 } = {}) { try { await page.getByText(t, { exact }).first().waitFor({ state: 'visible', timeout }); return true; } catch { return false; } }
async function dismissTutorial(page) {
  try { const b = page.getByText("LET'S PLAY", { exact: false }).first();
    if (await b.isVisible({ timeout: 1500 }).catch(() => false)) { await b.click({ force: true }); await page.waitForTimeout(700);
      if (await b.isVisible({ timeout: 500 }).catch(() => false)) { await b.click({ force: true }); await page.waitForTimeout(700); } } } catch {}
}
async function leaf(page, ymin = 0, ymax = 3000) {
  return await page.evaluate(({ ymin, ymax }) => { const o = [];
    document.querySelectorAll('div,span').forEach((el) => { if (el.children.length === 0) { const t = el.innerText?.trim(); const b = el.getBoundingClientRect();
      if (t && b.width > 0 && b.y >= ymin && b.y <= ymax) o.push({ t, x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }); } }); return o; }, { ymin, ymax });
}
async function pressLabel(page, label, exact = true) {
  const rect = await page.evaluate(({ lbl, ex }) => {
    const t = [...document.querySelectorAll('div,span')].find((el) => el.children.length === 0 && (ex ? el.innerText?.trim() === lbl : el.innerText?.trim().includes(lbl)));
    if (!t) return null; let n = t;
    for (let k = 0; k < 6 && n.parentElement; k++) { const r = n.getBoundingClientRect(); if (r.height >= 40 && r.width >= 60) break; n = n.parentElement; }
    const r = n.getBoundingClientRect(); if (r.y < 0 || r.y > 900) return null; return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, { lbl: label, ex: exact });
  if (!rect) return false; await page.mouse.click(rect.x, rect.y); await page.waitForTimeout(300); return true;
}
async function clickAt(page, x, y) { await page.mouse.click(x, y); await page.waitForTimeout(500); }
async function guessInModal(page, name) {
  if (!(await hasText(page, 'Who plays in this position', { timeout: 1000 }))) return false;
  const input = page.locator('input').last();
  await input.click({ force: true }); await input.fill(''); await input.pressSequentially(name.split(' ')[0], { delay: 25 });
  await page.waitForTimeout(700);
  const loc = page.getByText(name, { exact: true }); const n = await loc.count();
  for (let i = 0; i < n; i++) { const b = await loc.nth(i).boundingBox().catch(() => null); if (b && b.y > 20 && b.y < 900) { await loc.nth(i).click({ force: true }); await page.waitForTimeout(800); return true; } }
  return false;
}

const { browser, page, logs } = await launch();
try {
  // ---- FIX 1: Agent FULL TIME scrolls, PLAY AGAIN reachable ----
  if (which === 'all' || which === 'agent') {
    await goto(page, '/agent'); await dismissTutorial(page);
    for (let r = 0; r < 12; r++) {
      if (await hasText(page, 'FULL TIME', { timeout: 500 })) break;
      const opts = (await leaf(page, 250, 800)).map(x => x.t).filter(t => t.length > 2 && !/Show Transfer|Round|Score|Which player|transferred|FULL TIME|\d\/\d/.test(t));
      if (opts[0]) { const ok = await pressLabel(page, opts[0], true); }
      await page.waitForTimeout(1800);
    }
    const over = await hasText(page, 'FULL TIME', { timeout: 1000 });
    R.data.agentFullTime = over;
    await shot(page, 'verify_agent_top');
    // count result rows, then scroll the gameover scrollview to the bottom
    for (let s = 0; s < 6; s++) { await page.mouse.wheel(0, 400); await page.waitForTimeout(400); }
    await page.waitForTimeout(500);
    await shot(page, 'verify_agent_scrolled');
    // Is PLAY AGAIN visible and above the tab bar (not occluded)?
    const pa = (await leaf(page, 0, 932)).find(x => /PLAY AGAIN/i.test(x.t));
    R.data.agentPlayAgainY = pa?.y ?? null;
    // tab bar top is ~832 (floating bar). Reachable if PLAY AGAIN center y < ~820
    R.data.agentPlayAgainReachable = pa ? pa.y < 815 : false;
    // actually click it to confirm it restarts (round resets to 1/..)
    if (pa) { await page.mouse.click(pa.x, pa.y); await page.waitForTimeout(1500); }
    R.data.agentRestarted = await hasText(page, 'Round 1/', { timeout: 1500 }) || await hasText(page, 'Score: 0/', { timeout: 800 });
    R.data.agentErrs = logs.errors.length; R.data.agentPageErrs = logs.pageerrors.length;
    log('agent: fullTime', over, 'playAgainY', R.data.agentPlayAgainY, 'reachable', R.data.agentPlayAgainReachable, 'restarted', R.data.agentRestarted);
  }

  // ---- FIX 2: Blind Ranking category = International Caps, title/values agree ----
  if (which === 'all' || which === 'blindranking') {
    await goto(page, '/blindranking'); await dismissTutorial(page);
    const desc = (await leaf(page, 40, 220)).map(x => x.t);
    R.data.brHeader = desc;
    const dtc = ['2026-07-11','2026-07-12','2026-07-13','2026-07-14','2026-07-15'].map(d => generateBlindRankingPuzzle(getModeSeed('blindranking', d)));
    const descText = desc.join(' ');
    const puzzle = dtc.find(c => descText.includes(c.category.description));
    R.data.brCategoryOnScreen = desc.find(t => /Rank by|appearances|caps|value|rating|fame/i.test(t));
    for (let step = 0; step < 5; step++) {
      const shown = (await leaf(page, 120, 340)).map(x => x.t);
      let slot = step;
      if (puzzle) for (const nm of Object.keys(puzzle.slotByName)) if (shown.includes(nm)) { slot = puzzle.slotByName[nm]; break; }
      await pressLabel(page, `#${slot + 1}`, true); await page.waitForTimeout(900);
    }
    await page.waitForTimeout(3400);
    const rev = await leaf(page, 0, 900);
    R.data.brTitle = rev.map(x => x.t).find(t => /Caps|Appearances|Expensive|Cheapest|Rating|Value|Famous/i.test(t) && !/Rank by/.test(t));
    R.data.brValues = rev.map(x => x.t).filter(t => /caps|OVR|€/.test(t)).slice(0, 6);
    R.data.brResultTitle = rev.map(x => x.t).find(t => /BRILLIANT|NICE TRY|TOUGH/.test(t));
    await shot(page, 'verify_blindranking_reveal');
    R.data.brErrs = logs.errors.length; R.data.brPageErrs = logs.pageerrors.length;
    log('blindranking: onScreenCat', R.data.brCategoryOnScreen, '| title', R.data.brTitle, '| values', R.data.brValues);
  }

  // ---- FIX 3: Missing XI loss shows true pre-reveal found count ----
  if (which === 'all' || which === 'missing11') {
    await goto(page, '/missing11'); await dismissTutorial(page);
    const side = missing11Side('2026-07-13');
    const lineup = (side === 'a' ? missing11ForDate('2026-07-13').match.lineup_a_names : missing11ForDate('2026-07-13').match.lineup_b_names);
    // Correct guesses: GK (idx0), ST-left (idx9), ST-right (idx10)
    const labels = await leaf(page, 200, 800);
    const gk = labels.find(x => x.t === 'GK');
    const sts = labels.filter(x => x.t === 'ST').sort((a, b) => a.x - b.x);
    const plan = [];
    if (gk) plan.push([gk.x, gk.y - 28, lineup[0]]);
    if (sts[0]) plan.push([sts[0].x, sts[0].y - 28, lineup[9]]);
    if (sts[1]) plan.push([sts[1].x, sts[1].y - 28, lineup[10]]);
    let found = 0;
    for (const [x, y, name] of plan) {
      await clickAt(page, x, y);
      const ok = await guessInModal(page, name);
      if (ok) found++;
      log('  correct-guess', name, '->', ok);
      await page.waitForTimeout(600);
    }
    R.data.foundBeforeLoss = found;
    await shot(page, 'verify_missing11_progress');
    // Now lose: tap remaining slots, guess a deliberately-wrong hidden name each time
    const wrongNames = [lineup[6], lineup[7], lineup[8], lineup[5], lineup[2], lineup[3]]; // midfielders/defenders
    let wi = 0, lives = 3;
    for (let attempt = 0; attempt < 8 && lives > 0; attempt++) {
      if (await hasText(page, 'GAME OVER', { timeout: 400 })) break;
      const qs = await leaf(page, 250, 780); const q = qs.find(x => x.t === '?');
      if (!q) { await clickAt(page, 168, 552); } else await clickAt(page, q.x, q.y);
      if (await hasText(page, 'Who plays in this position', { timeout: 800 })) {
        // pick a wrong name that's not the tapped slot — cycle known names
        const nm = wrongNames[wi % wrongNames.length]; wi++;
        const ok = await guessInModal(page, nm);
        if (ok) lives--; // wrong (may occasionally be right; loop continues either way)
        log('  wrong-attempt', nm, 'guessed', ok, 'livesLeft~', lives);
      }
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(900);
    R.data.m11GameOver = await hasText(page, 'GAME OVER', { timeout: 800 });
    R.data.m11CardText = (await leaf(page, 250, 650)).map(x => x.t).find(t => /players found/.test(t));
    await shot(page, 'verify_missing11_loss');
    R.data.m11Errs = logs.errors.length; R.data.m11PageErrs = logs.pageerrors.length;
    log('missing11: found', found, '| gameOver', R.data.m11GameOver, '| card', R.data.m11CardText);
  }

  // ---- FIX 4: Career Timeline hint button reads "Hint (−5 XP)" ----
  if (which === 'all' || which === 'careertimeline') {
    await goto(page, '/careertimeline'); await dismissTutorial(page);
    await page.waitForTimeout(600);
    const hintBtn = (await leaf(page, 100, 800)).find(x => /Hint/i.test(x.t));
    R.data.ctHintLabel = hintBtn?.t;
    R.data.ctHintHasCost = /−5 XP|-5 XP|−5|5 XP/i.test(hintBtn?.t || '');
    await shot(page, 'verify_careertimeline_hint');
    R.data.ctErrs = logs.errors.length; R.data.ctPageErrs = logs.pageerrors.length;
    log('careertimeline: hintLabel', R.data.ctHintLabel, '| hasCost', R.data.ctHintHasCost);
  }
} catch (e) {
  R.fatal = e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n');
  await shot(page, 'verify_error').catch(() => {});
}
R.errors = logs.errors.slice(0, 20);
R.pageerrors = logs.pageerrors.slice(0, 20);
console.log('\n@@VERIFY@@', JSON.stringify(R));
await browser.close();

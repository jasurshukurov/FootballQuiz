// Higher / Lower — build a market-value streak. We align to the deterministic
// sim queue, answer correctly to grow the streak, then deliberately miss.
// Invariants: streak increments while correct; the losing reveal shows BOTH
// values with a gap %.
import { goto, dismissTutorial, leafTexts, pressButton, isGameOver, hasText, dateWindow } from '../helpers.mjs';
import { hlQueuesForDates } from '../../playtest/sim.mjs';

export const meta = { key: 'higherlower', title: 'Higher / Lower', route: '/higherlower' };

async function readStreak(page) {
  const txt = (await leafTexts(page, 0, 95)).find((x) => /^\d+$/.test(x.t));
  return txt ? parseInt(txt.t, 10) : 0;
}

export async function play(page, t) {
  await goto(page, '/higherlower');
  await dismissTutorial(page);

  // CTA sizing sanity (DESIGN_SYSTEM: primary CTA >= 56pt).
  const cta = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div,span')].find((e) => e.children.length === 0 && e.innerText?.trim() === 'HIGHER');
    if (!el) return null; let n = el;
    for (let k = 0; k < 6 && n.parentElement; k++) { const r = n.getBoundingClientRect(); if (r.height >= 40) break; n = n.parentElement; }
    const r = n.getBoundingClientRect(); return { h: Math.round(r.height) };
  });
  t.check('HIGHER/LOWER visible', cta != null, cta ? `cta height ${cta.h}` : 'no HIGHER button');

  // Align to a sim queue by matching the two currently-shown player names IN
  // ON-SCREEN ORDER (current card sits ABOVE the challenger). Inclusion alone
  // is not enough: adjacent dates can contain the same pair reversed, and
  // matching the reversed queue makes every subsequent call wrong.
  const cands = hlQueuesForDates(dateWindow(3));
  const startRows = await leafTexts(page, 90, 620);
  const nameY = new Map();
  for (const r of startRows) if (!nameY.has(r.t)) nameY.set(r.t, r.y);
  let chosen = null, k0 = 0;
  for (const c of cands) {
    for (let k = 0; k < c.queue.length - 1; k++) {
      const yCur = nameY.get(c.queue[k].name), yChal = nameY.get(c.queue[k + 1].name);
      if (yCur != null && yChal != null && yCur < yChal) { chosen = c; k0 = k; break; }
    }
    if (chosen) break;
  }
  const startTexts = startRows.map((x) => x.t);
  t.check('aligned to deterministic sim queue', !!chosen, chosen ? `date ${chosen.date} @idx ${k0}` : `shown: ${startTexts.slice(0, 6).join(', ')}`);

  let idx = k0, streak = 0, maxStreak = 0, sawIncrement = false, lost = false;
  let lossReveal = { values: [], pct: false };
  for (let i = 0; i < 40 && chosen; i++) {
    if (await isGameOver(page)) break;
    const cur = chosen.queue[idx], chal = chosen.queue[idx + 1];
    if (!cur || !chal) break;
    const before = await readStreak(page);
    // Build streak to >=3, then deliberately answer WRONG.
    let guess;
    if (streak >= 3 && !lost) { guess = chal.mv >= cur.mv ? 'LOWER' : 'HIGHER'; lost = true; }
    else guess = chal.mv >= cur.mv ? 'HIGHER' : 'LOWER';
    await pressButton(page, guess, true);
    await page.waitForTimeout(1350);
    if (lost) {
      // The reveal after a miss must show both values + gap %.
      const reveal = (await leafTexts(page, 60, 700)).map((x) => x.t);
      lossReveal.values = reveal.filter((s) => /€|m\b|M\b|k\b|K\b/.test(s) && /\d/.test(s));
      lossReveal.pct = reveal.some((s) => /%/.test(s));
      await page.waitForTimeout(1500);
      break;
    }
    const after = await readStreak(page);
    if (after > before) sawIncrement = true;
    streak = after; maxStreak = Math.max(maxStreak, after);
    idx++;
  }
  await page.waitForTimeout(800);
  t.check('streak increments on correct answers', sawIncrement || maxStreak >= 1, `max streak ${maxStreak}`);
  t.check('losing reveal shows both values', lossReveal.values.length >= 2, `values: ${lossReveal.values.slice(0, 3).join(', ')}`);
  t.check('losing reveal shows a gap %', lossReveal.pct, lossReveal.pct ? '% present' : 'no % on reveal');
  t.check('reaches game-over', await isGameOver(page), 'terminal state');
}

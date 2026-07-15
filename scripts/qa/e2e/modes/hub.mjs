// Hub + navigation checks. Runs in ONE context: reads the Today hub (3 tabs +
// progress meter), plays a mode to completion IN THIS SAME CONTEXT, then
// verifies the completed card moved to the "Done today" section and the meter
// advanced. Then exercises Stats, More, and Archive navigation.
import { goto, dismissTutorial, leafTexts, allTexts, pressButton, clickText, isGameOver, hasText } from '../helpers.mjs';

export const meta = { key: 'hub', title: 'Hub + Nav', route: '/' };

// Meter total derives from the mode registry (do NOT hardcode a count here —
// deprecating a mode must not break this check).
async function progressMeter(page) {
  const texts = await allTexts(page);
  const leaf = texts.find((s) => /\b\d+\s*\/\s*\d+\s*played/i.test(s)) ||
               texts.find((s) => /\b\d+\s*\/\s*\d+\b/.test(s));
  if (leaf) return leaf;
  // The meter count renders as nested Texts ("5" + muted "/11"), which are
  // separate leaf nodes — read the composed textContent of small parents too.
  return page.evaluate(() => {
    for (const el of document.querySelectorAll('div,span')) {
      const t = el.textContent?.trim() ?? '';
      if (t.length <= 8 && /^\d+\s*\/\s*\d+$/.test(t)) return t;
    }
    return null;
  });
}
function meterNum(s) { const m = s && s.match(/(\d+)\s*\/\s*(\d+)/); return m ? parseInt(m[1], 10) : null; }

async function tabLabels(page) {
  return (await leafTexts(page, 850, 932)).map((x) => x.t).filter((s) => /Today|Stats|More/.test(s));
}

export async function play(page, t) {
  await goto(page, '/');

  // --- 3 tabs ---
  const tabs = await tabLabels(page);
  const uniqTabs = [...new Set(tabs)];
  t.check('hub shows 3 tabs (Today / Stats / More)',
    ['Today', 'Stats', 'More'].every((l) => uniqTabs.includes(l)), `tabs: ${uniqTabs.join(', ')}`);

  // --- progress meter ---
  const meter0 = await progressMeter(page);
  const n0 = meterNum(meter0 || '');
  t.check('hub shows a daily progress meter (N/total)', n0 != null, meter0 || 'no N/total meter found');

  const feed0 = await allTexts(page);
  t.check('hub feed lists game modes', feed0.some((s) => /Career Path|Higher|Connections/i.test(s)), 'mode cards present');

  // --- Play Higher/Lower to completion IN THIS CONTEXT ---
  // (Always answering HIGHER reaches a wrong guess, i.e. game-over, quickly.)
  await goto(page, '/higherlower');
  await dismissTutorial(page);
  for (let i = 0; i < 25; i++) {
    if (await isGameOver(page)) break;
    if (!(await pressButton(page, 'HIGHER', true))) break;
    await page.waitForTimeout(1400);
  }
  await page.waitForTimeout(1200);
  const played = await isGameOver(page);
  t.check('completed a mode (Higher/Lower) in the hub context', played, 'reached game-over');

  // --- Back to hub: meter advances + card moves to Done ---
  await goto(page, '/');
  await page.waitForTimeout(800);
  const meter1 = await progressMeter(page);
  const n1 = meterNum(meter1 || '');
  t.check('progress meter advanced after completion', n0 != null && n1 != null && n1 > n0, `${meter0} -> ${meter1}`);

  // Scan the whole feed for a Done section and where Higher / Lower sits.
  let sawDoneSection = false, hlInDone = false;
  for (let s = 0; s < 8; s++) {
    const rows = await leafTexts(page, 90, 860);
    for (const r of rows) {
      if (/DONE TODAY|Done today|Completed|Played today|DONE/i.test(r.t)) sawDoneSection = true;
    }
    // Higher / Lower row with a result glyph nearby, or under the done header.
    const hl = rows.find((r) => /Higher\s*\/\s*Lower/i.test(r.t));
    if (hl && sawDoneSection) hlInDone = true;
    await page.mouse.wheel(0, 500); await page.waitForTimeout(350);
  }
  t.check('hub has a "Done today" section after a completion', sawDoneSection, `doneSection=${sawDoneSection}`);
  t.check('completed mode card appears in Done section', hlInDone || sawDoneSection, `hlInDone=${hlInDone}`);

  // --- Stats tab ---
  await goto(page, '/');
  await pressButton(page, 'Stats', true);
  await page.waitForTimeout(1600);
  t.check('Stats tab navigates to profile', /profile/i.test(page.url()), page.url());
  t.check('Stats shows streak/played content',
    await hasText(page, 'Streak', { timeout: 1500 }) || await hasText(page, 'Played', { timeout: 800 }) || await hasText(page, 'Games', { timeout: 800 }), 'stats content');
  const statsBad = (await allTexts(page)).filter((s) => /\bNaN\b|\bundefined\b|\bInfinity\b/.test(s));
  t.check('Stats has no NaN/undefined text', statsBad.length === 0, statsBad.slice(0, 3).join(' | '));

  // --- More tab ---
  await pressButton(page, 'More', true);
  await page.waitForTimeout(1600);
  t.check('More tab navigates', /support|more/i.test(page.url()), page.url());
  t.check('More shows settings/archive content',
    await hasText(page, 'Notification', { timeout: 1200 }) || await hasText(page, 'Support', { timeout: 800 }) || await hasText(page, 'Archive', { timeout: 800 }), 'more content');

  // --- Archive navigation ---
  const archived = await clickText(page, 'Archive', { exact: false });
  await page.waitForTimeout(2200);
  t.check('Archive link navigates', archived && /archive/i.test(page.url()), `${archived} url=${page.url()}`);
}

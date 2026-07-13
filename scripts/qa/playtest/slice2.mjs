import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { nameToMv, generateBlindRankingPuzzle, getModeSeed } from './sim.mjs';

const BASE = 'http://localhost:8081';
const SHOTS = path.resolve('scripts/qa/playtest/shots2');
const VIEWPORT = { width: 430, height: 932 };
fs.mkdirSync(SHOTS, { recursive: true });

const mode = process.argv[2] || 'career';
const R = { mode, played: false, notes: [], errors: [], pageerrors: [], surface: {}, data: {} };
const log = (...a) => { const s = a.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(' '); console.log(s); R.notes.push(s); };

async function launch() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const logs = { errors: [], pageerrors: [] };
  page.on('console', (m) => { if (m.type() === 'error') logs.errors.push(m.text()); });
  page.on('pageerror', (e) => logs.pageerrors.push(e.message));
  return { browser, page, logs };
}
async function goto(page, route) {
  await page.goto(route.startsWith('http') ? route : BASE + route, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2800);
}
async function shot(page, name) { const f = path.join(SHOTS, `${name}.png`); await page.screenshot({ path: f }); return f; }
async function hasText(page, text, { exact = false, timeout = 1200 } = {}) {
  try { await page.getByText(text, { exact }).first().waitFor({ state: 'visible', timeout }); return true; } catch { return false; }
}
async function dismissTutorial(page) {
  try {
    const btn = page.getByText("LET'S PLAY", { exact: false }).first();
    if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await btn.click({ force: true }); await page.waitForTimeout(700);
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) { await btn.click({ force: true }); await page.waitForTimeout(700); }
      return true;
    }
  } catch {}
  return false;
}
async function pressButton(page, label, exact = true) {
  const rect = await page.evaluate(({ lbl, ex }) => {
    const t = [...document.querySelectorAll('div,span')].find(
      (el) => el.children.length === 0 && (ex ? el.innerText?.trim() === lbl : el.innerText?.trim().includes(lbl)));
    if (!t) return null;
    let n = t;
    for (let k = 0; k < 6 && n.parentElement; k++) { const r = n.getBoundingClientRect(); if (r.height >= 40 && r.width >= 60) break; n = n.parentElement; }
    const r = n.getBoundingClientRect();
    if (r.y < 0 || r.y > 900) return null;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, { lbl: label, ex: exact });
  if (!rect) return false;
  await page.mouse.click(rect.x, rect.y); await page.waitForTimeout(300); return true;
}
async function clickOnScreen(page, text, { exact = false } = {}) {
  const loc = page.getByText(text, { exact }); const n = await loc.count();
  for (let i = 0; i < n; i++) { const b = await loc.nth(i).boundingBox().catch(() => null);
    if (b && b.x >= 0 && b.y >= 0 && b.y < 900) { await loc.nth(i).click({ force: true }); await page.waitForTimeout(400); return true; } }
  return false;
}
async function holdPress(page, text, ms = 800) {
  const loc = page.getByText(text, { exact: false }); const n = await loc.count();
  for (let i = 0; i < n; i++) { const b = await loc.nth(i).boundingBox().catch(() => null);
    if (b && b.x >= 0 && b.y >= 0 && b.y < 900) { await page.mouse.move(b.x + b.width/2, b.y + b.height/2); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); await page.waitForTimeout(700); return true; } }
  return false;
}
async function pickSuggestion(page, text, pick, { inputIndex = 0 } = {}) {
  const input = page.locator('input').nth(inputIndex);
  await input.click({ force: true }); await input.fill('');
  await input.pressSequentially(text, { delay: 20 }); await page.waitForTimeout(750);
  const loc = page.getByText(pick, { exact: false }); const n = await loc.count();
  for (let i = 0; i < n; i++) { const b = await loc.nth(i).boundingBox().catch(() => null);
    if (b && b.x >= 0 && b.y >= 20 && b.y < 900) { await loc.nth(i).click({ force: true }); await page.waitForTimeout(600); return true; } }
  return false;
}
async function leafTexts(page, ymin = 0, ymax = 932) {
  return await page.evaluate(({ ymin, ymax }) => {
    const out = [];
    document.querySelectorAll('div,span').forEach((el) => {
      if (el.children.length === 0) { const t = el.innerText?.trim(); const b = el.getBoundingClientRect();
        if (t && b.x >= -5 && b.y >= ymin && b.y <= ymax && b.width > 0) out.push({ t, x: Math.round(b.x), y: Math.round(b.y) }); } });
    return out;
  }, { ymin, ymax });
}
async function checkSurface(page) {
  R.surface.share = await hasText(page, 'Share') || await hasText(page, 'SHARE');
  R.surface.copy = await hasText(page, 'Copy') || await hasText(page, 'COPY');
  R.surface.playAgain = await hasText(page, 'Play Again') || await hasText(page, 'PLAY AGAIN') || await hasText(page, 'NEXT PLAYER') || await hasText(page, 'Next');
  R.surface.overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
}

const { browser, page, logs } = await launch();
try {
  const route = { career: '/', careertimeline: '/careertimeline', higherlower: '/higherlower',
    blindranking: '/blindranking', missing11: '/missing11', agent: '/agent', modes: '/modes', profile: '/profile' }[mode];
  await goto(page, route);
  await dismissTutorial(page);
  await page.waitForTimeout(600);
  await shot(page, `${mode}_mid`);

  if (mode === 'career') {
    // Unlock 2 free hints (Nationality, Position), then wrong-guess to reach last chance, screenshot pulse, then give up.
    await pressButton(page, 'Nationality'); await page.waitForTimeout(500);
    await pressButton(page, 'Position'); await page.waitForTimeout(500);
    await shot(page, 'career_hints');
    // wrong guesses to reach attemptsLeft === 1
    await pickSuggestion(page, 'Ronaldo', 'Ronaldo'); await page.waitForTimeout(700);
    await pickSuggestion(page, 'Messi', 'Messi'); await page.waitForTimeout(900);
    R.data.lastChancePulse = await hasText(page, 'LAST', { timeout: 1500 }) || await hasText(page, 'CHANCE', { timeout: 500 }) || await hasText(page, 'last chance', { timeout: 500 });
    await shot(page, 'career_lastchance');
    await holdPress(page, 'Give Up', 800);
    await page.waitForTimeout(1500);
  }

  if (mode === 'careertimeline') {
    // reveal a node hint (XP cost) then open a node search, then give up
    R.data.player = (await leafTexts(page, 40, 90)).map(x => x.t).slice(0, 2);
    const hinted = await clickOnScreen(page, 'Hint', { exact: true });
    log('clicked node Hint button:', hinted);
    await page.waitForTimeout(700);
    await shot(page, 'careertimeline_hint');
    // tap a hidden node "?" to open club search
    await clickOnScreen(page, '?', { exact: true });
    await page.waitForTimeout(800);
    const inputs = await page.locator('input').count();
    log('club search inputs after node tap:', inputs);
    await shot(page, 'careertimeline_search');
    if (inputs) { const ok = await pickSuggestion(page, 'Manchester', 'Manchester'); log('guessed club:', ok); await page.waitForTimeout(800); }
    await holdPress(page, 'Give Up', 800);
    await page.waitForTimeout(1300);
  }

  if (mode === 'higherlower') {
    const { hlQueuesForDates } = await import('./sim.mjs');
    const cands = hlQueuesForDates(['2026-07-11','2026-07-12','2026-07-13','2026-07-14','2026-07-15']);
    // read first current + challenger names to align to a candidate queue
    const readNames = async () => {
      const texts = await leafTexts(page, 100, 470);
      const withDiff = texts;
      const cur = texts.find(x => x.t && /^[A-ZÀ-Ý]/.test(x.t) && x.t.length > 3 && / |\./.test(x.t));
      return { texts: withDiff };
    };
    const startTexts = (await leafTexts(page, 100, 470)).map(x => x.t);
    let chosen = null, k0 = 0;
    for (const c of cands) {
      for (let k = 0; k < c.queue.length - 1; k++) {
        if (startTexts.includes(c.queue[k].name) && startTexts.includes(c.queue[k + 1].name)) { chosen = c; k0 = k; break; }
      }
      if (chosen) break;
    }
    R.data.aligned = !!chosen; R.data.date = chosen?.date; R.data.offset = chosen?.offset;
    log('aligned queue date', chosen?.date, 'offset', chosen?.offset, 'startIdx', k0);
    const rounds = [];
    let gaveWrong = false;
    let idx = k0;
    for (let i = 0; i < 40 && chosen; i++) {
      if (await hasText(page, 'GAME OVER', { timeout: 600 })) { log('game over at round', i); break; }
      const cur = chosen.queue[idx], chal = chosen.queue[idx + 1];
      if (!cur || !chal) { log('queue exhausted'); break; }
      const texts = await leafTexts(page, 100, 470);
      const shownNames = texts.map(x => x.t);
      const diffTxt = texts.filter(x => ['Easy','Medium','Hard','Expert'].includes(x.t)).sort((a,b)=>a.x-b.x)[0];
      const synced = shownNames.includes(cur.name);
      rounds.push({ i, cur: cur.name, curMv: cur.mv, chal: chal.name, chalMv: chal.mv, diff: diffTxt?.t, synced });
      if (i < 6) log('round', i, cur.name, `€${(cur.mv/1e6).toFixed(0)}M [${diffTxt?.t}]`, 'vs', chal.name, `€${(chal.mv/1e6).toFixed(0)}M`, synced ? '' : '(DESYNC)');
      const streakTxt = (await leafTexts(page, 0, 100)).find(x => /Streak/i.test(x.t));
      const streakNow = streakTxt ? parseInt(streakTxt.t.replace(/\D/g, '') || '0', 10) : i;
      let guess;
      if (streakNow >= 11 && !gaveWrong) { guess = chal.mv >= cur.mv ? 'LOWER' : 'HIGHER'; gaveWrong = true; log('deliberate WRONG at streak', streakNow); await shot(page, 'higherlower_streak10'); }
      else guess = chal.mv >= cur.mv ? 'HIGHER' : 'LOWER';
      await pressButton(page, guess);
      await page.waitForTimeout(1350);
      idx++;
      if (gaveWrong) { await page.waitForTimeout(1400); break; }
    }
    R.data.rounds = rounds.slice(0, 15);
    R.data.firstFive = rounds.slice(0, 5).map(r => `${r.cur}[${r.diff}] €${(r.curMv/1e6).toFixed(0)}M`);
    R.data.laterFive = rounds.slice(10, 15).map(r => `${r.cur}[${r.diff}] €${(r.curMv/1e6).toFixed(0)}M`);
    await page.waitForTimeout(600);
    R.data.gameoverStreak = (await leafTexts(page, 0, 932)).find(x => /^Streak:/.test(x.t))?.t;
    R.data.celebration = await hasText(page, 'PLAY AGAIN', { timeout: 800 });
    await shot(page, 'higherlower_over');
  }

  if (mode === 'blindranking') {
    const desc = (await leafTexts(page, 40, 200)).map(x => x.t);
    log('header texts:', desc.slice(0, 6));
    // Build candidate puzzles across nearby dates and match by category description.
    const dates = ['2026-07-11','2026-07-12','2026-07-13','2026-07-14','2026-07-15'];
    const cands = dates.map(d => generateBlindRankingPuzzle(getModeSeed('blindranking', d)));
    const descText = desc.join(' ');
    let puzzle = cands.find(c => descText.includes(c.category.description)) || null;
    log('matched category:', puzzle?.category?.title, 'presented:', puzzle?.presented);
    R.data.category = puzzle?.category?.title || desc.join(' | ');
    // place 5 players
    for (let step = 0; step < 5; step++) {
      // read current challenger card name (top area, biggest name near category label)
      const cardTexts = await leafTexts(page, 120, 340);
      const shown = cardTexts.map(x => x.t);
      let slot = null, whichName = null;
      if (puzzle) {
        for (const nm of Object.keys(puzzle.slotByName)) { if (shown.includes(nm)) { slot = puzzle.slotByName[nm]; whichName = nm; break; } }
      }
      if (slot === null) { // fallback: next empty slot
        slot = step; whichName = shown.find(s => nameToMv.has(s)) || '?';
        log('step', step, 'no map match, fallback slot', slot, 'shown', shown.slice(0,6));
      } else log('step', step, 'place', whichName, '-> slot #'+(slot+1));
      const placed = await pressButton(page, `#${slot + 1}`, true);
      if (!placed) { log('failed to click slot #'+(slot+1)); await shot(page, `blindranking_stuck_${step}`); }
      await page.waitForTimeout(900);
    }
    await page.waitForTimeout(3200); // staggered reveal
    R.data.resultTitle = (await leafTexts(page, 0, 200)).map(x=>x.t).find(t=>/BRILLIANT|NICE TRY|TOUGH/.test(t));
    R.data.score = (await leafTexts(page, 0, 300)).map(x=>x.t).find(t=>/\/5 Correct/.test(t));
    // reveal values present?
    R.data.revealValues = (await leafTexts(page, 200, 900)).filter(x => /€|OVR|caps|^\d/.test(x.t)).map(x=>x.t).slice(0, 8);
    await shot(page, 'blindranking_reveal');
  }

  if (mode === 'missing11') {
    await shot(page, 'missing11_start');
    R.data.teamLabel = (await leafTexts(page, 40, 130)).map(x => x.t).find(t => /Guess the/i.test(t));
    // Use the hint first (while playing) — button label renders as "HINT (AD)"
    const hintOk = await pressButton(page, 'HINT', false);
    log('hint pressed:', hintOk);
    await page.waitForTimeout(1200);
    R.data.hintText = (await leafTexts(page, 100, 260)).map(x => x.t).find(t => /starts with|position/i.test(t));
    await shot(page, 'missing11_hint');
    // Guess real lineup names (computed) to force progress + a clean game-over reveal
    const { missing11ForDate, missing11Side } = await import('./sim.mjs');
    const mm = missing11ForDate('2026-07-13');
    const side = missing11Side('2026-07-13');
    const lineup = side === 'a' ? mm.match.lineup_a_names : mm.match.lineup_b_names;
    R.data.computedLineup = lineup;
    R.data.computedDistinct = new Set(lineup).size === lineup.length;
    log('computed lineup', lineup.join(', '), 'distinct:', R.data.computedDistinct);
    for (let attempt = 0; attempt < 12; attempt++) {
      if (await hasText(page, 'GAME OVER', { timeout: 400 }) || await hasText(page, 'COMPLETE!', { timeout: 300 })) { log('ended at attempt', attempt); break; }
      await clickOnScreen(page, '?', { exact: true });
      await page.waitForTimeout(500);
      let modal = await hasText(page, 'Who plays in this position', { timeout: 900 });
      if (!modal) { await page.mouse.click(215, 470); await page.waitForTimeout(500); modal = await hasText(page, 'Who plays in this position', { timeout: 800 }); }
      log('attempt', attempt, 'modal:', modal);
      if (modal) {
        const name = lineup[attempt % lineup.length];
        const first = name.split(' ')[0];
        const input = page.locator('input').last();
        await input.click({ force: true }); await input.fill(''); await input.pressSequentially(first, { delay: 25 });
        await page.waitForTimeout(700);
        const clicked = await pressButton(page, name, true) || await clickOnScreen(page, name, { exact: true });
        log('  guessed', name, '->', clicked);
        if (attempt === 0) await shot(page, 'missing11_search');
        if (!clicked) await clickOnScreen(page, 'Cancel', { exact: true });
        await page.waitForTimeout(900);
      } else break;
    }
    await page.waitForTimeout(900);
    R.data.gameOver = await hasText(page, 'GAME OVER', { timeout: 500 }) || await hasText(page, 'COMPLETE!', { timeout: 300 });
    // capture revealed lineup names (exclude position labels & UI)
    const POS = new Set(['GK','CB','LB','RB','LWB','RWB','CDM','CM','CAM','LM','RM','LW','RW','CF','ST','SS','DM','AM']);
    const names = (await leafTexts(page, 150, 800)).map(x => x.t)
      .filter(t => t.length > 2 && !POS.has(t) && !/FOUND|position|Guess|players found|starting|GAME OVER|COMPLETE|PLAY AGAIN|Share|Copy|\d+\/11|HINT|Home|Stats|Support|Modes/i.test(t) && !/^\d/.test(t));
    R.data.revealedNames = [...new Set(names)].slice(0, 14);
    const seen = {}; const dups = [];
    for (const n of names) { seen[n] = (seen[n]||0)+1; if (seen[n] === 2) dups.push(n); }
    R.data.duplicateNames = [...new Set(dups)];
    await shot(page, 'missing11_over');
  }

  if (mode === 'agent') {
    const roundData = [];
    const allHints = [];
    for (let r = 0; r < 12; r++) {
      if (await hasText(page, 'FULL TIME', { timeout: 500 })) { log('FULL TIME at round', r); break; }
      const fee = (await leafTexts(page, 120, 250)).map(x => x.t).find(t => /€|M|K|FREE|LOAN/i.test(t));
      const opts = (await leafTexts(page, 250, 800)).map(x => x.t).filter(t => t.length > 2 && !/Show Transfer|Round|Score|Which player|transferred|FULL TIME|\d\/\d/.test(t));
      // use hint each round to check for 'Unknown ->' text (verify across rounds)
      const hintPressed = await pressButton(page, 'Show Transfer', false);
      await page.waitForTimeout(600);
      const hintLine = (await leafTexts(page, 180, 360)).map(x => x.t).find(t => t.includes('→') || t.includes('->') || /Unknown/i.test(t));
      if (hintLine) allHints.push(hintLine);
      if (r === 0) { R.data.hintTexts = (await leafTexts(page, 150, 360)).map(x => x.t); await shot(page, 'agent_hint'); }
      roundData.push({ r, fee, opts: opts.slice(0, 4), hint: hintLine });
      if (r < 5) log('round', r, fee, 'opts:', opts.slice(0, 4), 'hint:', hintLine);
      const opt = opts[0];
      if (opt) { const ok = await pressButton(page, opt, true); if (!ok) await clickOnScreen(page, opt, { exact: true }); }
      await page.waitForTimeout(1800);
    }
    R.data.rounds = roundData;
    R.data.earlyOptions = roundData.slice(0, 3).map(x => x.opts);
    R.data.hints = allHints;
    R.data.hintHasUnknown = allHints.some(t => /Unknown/i.test(t));
    await shot(page, 'agent_lastround');
    await page.waitForTimeout(800);
  }

  if (mode === 'modes') {
    const titles = (await leafTexts(page, 0, 3000)).map(x => x.t);
    const expected = ['My name is...','Immaculate Grid','Career Path','Missing XI','Connections','Top Lists','Higher / Lower','Transfer Agent','Blind Ranking','Career Timeline','Market Movers','Guess the Match'];
    R.data.presentCards = expected.filter(t => titles.includes(t));
    R.data.missingCards = expected.filter(t => !titles.includes(t));
    R.data.hasArchive = titles.includes('Archive');
    R.data.hasBadgeQuiz = titles.some(t => /Badge/i.test(t));
    log('present cards:', R.data.presentCards.length, 'archive:', R.data.hasArchive, 'badgeQuiz:', R.data.hasBadgeQuiz);
    await shot(page, 'modes_grid');
    // scroll to bottom to capture all cards
    await page.mouse.wheel(0, 600); await page.waitForTimeout(600); await shot(page, 'modes_grid_bottom');
    // tap 2 cards to verify navigation
    await pressButton(page, 'Blind Ranking'); await page.waitForTimeout(2000);
    R.data.navBlindRanking = await hasText(page, 'BLIND RANKING', { timeout: 2000 }) || page.url().includes('blindranking');
    R.data.navUrl1 = page.url();
    await goto(page, '/modes'); await page.waitForTimeout(500);
    await pressButton(page, 'Transfer Agent'); await page.waitForTimeout(2000);
    R.data.navAgent = await hasText(page, 'Which player', { timeout: 2000 }) || page.url().includes('agent');
    R.data.navUrl2 = page.url();
    await shot(page, 'modes_nav2');
  }

  if (mode === 'profile') {
    // First populate XP by playing blindranking to a real score in this same context
    await goto(page, '/blindranking'); await dismissTutorial(page);
    const { generateBlindRankingPuzzle: gen, getModeSeed: seed } = await import('./sim.mjs');
    const descP = (await leafTexts(page, 40, 200)).map(x => x.t).join(' ');
    const cP = ['2026-07-11','2026-07-12','2026-07-13','2026-07-14','2026-07-15'].map(d => gen(seed('blindranking', d)));
    const puzzleP = cP.find(c => descP.includes(c.category.description));
    for (let step = 0; step < 5; step++) {
      const shownP = (await leafTexts(page, 120, 340)).map(x => x.t);
      let slot = step;
      if (puzzleP) for (const nm of Object.keys(puzzleP.slotByName)) if (shownP.includes(nm)) { slot = puzzleP.slotByName[nm]; break; }
      await pressButton(page, `#${slot + 1}`, true);
      await page.waitForTimeout(900);
    }
    await page.waitForTimeout(3200);
    R.data.warmupScore = (await leafTexts(page, 0, 300)).map(x=>x.t).find(t=>/\/5 Correct/.test(t));
    await goto(page, '/profile'); await page.waitForTimeout(1200);
    const texts = (await leafTexts(page, 0, 3000)).map(x => x.t);
    R.data.dailyNumberText = texts.find(t => /Daily Puzzle #/.test(t));
    const m = R.data.dailyNumberText?.match(/#(-?\d+)/); R.data.dailyNumber = m ? parseInt(m[1], 10) : null;
    R.data.hasXpBreakdown = texts.includes('XP Breakdown');
    R.data.xpLabels = (await leafTexts(page, 0, 3000)).filter(x => x.x < 120).map(x => x.t);
    R.data.statLabels = texts.filter(t => /Played|Win %|Streak|Best|Perfect Days/.test(t));
    await shot(page, 'profile_top');
    await page.mouse.wheel(0, 500); await page.waitForTimeout(600); await shot(page, 'profile_xp');
    // capture XP breakdown labels specifically
    R.data.xpBreakdownVisible = await hasText(page, 'XP Breakdown', { timeout: 800 });
  }

  await page.waitForTimeout(600);
  await checkSurface(page);
  R.played = R.surface.playAgain || R.surface.share || (mode === 'modes') || (mode === 'profile');
  await shot(page, `${mode}_over`);
} catch (e) {
  R.fatal = e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n');
  await shot(page, `${mode}_error`).catch(() => {});
}
R.errors = logs.errors.slice(0, 20);
R.pageerrors = logs.pageerrors.slice(0, 20);
console.log('\n@@RESULT@@', JSON.stringify(R));
await browser.close();

// Shared interaction + assertion primitives for the permanent E2E flow.
// Recipes proven against RN-web Expo (raw-mouse tapping for Pressables, leaf-text
// scraping with viewport coords, autocomplete typing). Kept selector-agnostic:
// we locate by visible text, not by CSS class, so restyles don't break the suite.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const BASE = process.env.EXPO_URL || 'http://localhost:8081';
export const VIEWPORT = { width: 430, height: 932 };
export const ARTIFACTS = path.join(__dirname, 'artifacts');
fs.mkdirSync(ARTIFACTS, { recursive: true });

// ---------------------------------------------------------------------------
// Rank labels (lib/rankLadder.ts). The game-over RankBadge must show one of
// these, uppercased. Ballon d'Or uses a curly apostrophe — match loosely.
// ---------------------------------------------------------------------------
export const RANK_LABELS = ['KICKOFF', 'SQUAD ROTATION', 'FIRST TEAM', 'CAPTAIN', 'WORLD CLASS', 'BALLON D'];
export const RANK_RE = /KICKOFF|SQUAD ROTATION|FIRST TEAM|CAPTAIN|WORLD CLASS|BALLON D['’ ]?OR/i;

// Console-error noise that is not an app defect (empty in practice on this app,
// but present for robustness against dev-only warnings that surface as errors).
const BENIGN_CONSOLE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /favicon\.ico/i,
  /Failed to load resource: the server responded with a status of 404.*favicon/i,
];
export function isBenignConsole(text) {
  return BENIGN_CONSOLE.some((re) => re.test(text));
}

// ---------------------------------------------------------------------------
// Browser / context management. One browser, a fresh isolated context per mode
// so daily-completion locks written to localStorage never cross-contaminate.
// ---------------------------------------------------------------------------
export async function launchBrowser() {
  return chromium.launch();
}

export async function newModeContext(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const logs = { errors: [], pageerrors: [] };
  page.on('console', (m) => {
    if (m.type() === 'error' && !isBenignConsole(m.text())) logs.errors.push(m.text());
  });
  page.on('pageerror', (e) => logs.pageerrors.push(e.message));
  return { context, page, logs };
}

// ---------------------------------------------------------------------------
// Navigation / capture
// ---------------------------------------------------------------------------
export async function goto(page, route, wait = 2800) {
  const url = route.startsWith('http') ? route : BASE + route;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(wait); // Expo web hydration + font load
}

export async function shot(page, name) {
  const file = path.join(ARTIFACTS, `${name}.png`);
  await page.screenshot({ path: file }).catch(() => {});
  return file;
}

// ---------------------------------------------------------------------------
// Text queries
// ---------------------------------------------------------------------------
export async function hasText(page, text, { exact = false, timeout = 1200 } = {}) {
  try {
    await page.getByText(text, { exact }).first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/** All leaf text nodes with viewport coords in a y-band. The workhorse scraper. */
export async function leafTexts(page, ymin = 0, ymax = 932) {
  return page.evaluate(({ ymin, ymax }) => {
    const out = [];
    document.querySelectorAll('div,span').forEach((el) => {
      if (el.children.length === 0) {
        const t = el.innerText?.trim();
        const b = el.getBoundingClientRect();
        if (t && b.x >= -5 && b.y >= ymin && b.y <= ymax && b.width > 0) {
          out.push({ t, x: Math.round(b.x), y: Math.round(b.y), h: Math.round(b.height), w: Math.round(b.width) });
        }
      }
    });
    return out;
  }, { ymin, ymax });
}

/** Every visible leaf string across the full (scrollable) document. */
export async function allTexts(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('div,span').forEach((el) => {
      if (el.children.length === 0) {
        const t = el.innerText?.trim();
        if (t) out.push(t);
      }
    });
    return out;
  });
}

// ---------------------------------------------------------------------------
// Tapping — RN-web Pressables need raw mouse events at element centre. We walk
// up from the matched leaf to a tappable (>=40px) ancestor, exactly as the
// proven playtest recipes do.
// ---------------------------------------------------------------------------
export async function tapXY(page, x, y, settle = 400) {
  await page.mouse.click(x, y);
  await page.waitForTimeout(settle);
}

export async function pressButton(page, label, exact = true, { settle = 350 } = {}) {
  const rect = await page.evaluate(({ lbl, ex }) => {
    const t = [...document.querySelectorAll('div,span')].find(
      (el) => el.children.length === 0 && el.getBoundingClientRect().x > -50 &&
        (ex ? el.innerText?.trim() === lbl : el.innerText?.trim().includes(lbl)));
    if (!t) return null;
    let n = t;
    for (let k = 0; k < 6 && n.parentElement; k++) {
      const r = n.getBoundingClientRect();
      if (r.height >= 40 && r.width >= 60) break;
      n = n.parentElement;
    }
    const r = n.getBoundingClientRect();
    if (r.y < 0 || r.y > 920) return null;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: Math.round(r.width), h: Math.round(r.height) };
  }, { lbl: label, ex: exact });
  if (!rect) return null;
  await page.mouse.click(rect.x, rect.y);
  await page.waitForTimeout(settle);
  return rect;
}

/** Click first visible on-screen (y in [0,910]) element containing text. */
export async function clickText(page, text, { exact = false } = {}) {
  const loc = page.getByText(text, { exact });
  const n = await loc.count();
  for (let i = 0; i < n; i++) {
    const b = await loc.nth(i).boundingBox().catch(() => null);
    if (b && b.x >= 0 && b.y >= 0 && b.y < 910) {
      await loc.nth(i).click({ force: true });
      await page.waitForTimeout(400);
      return true;
    }
  }
  return false;
}

/** Press-and-hold a labelled control (Give Up buttons use a hold gesture). */
export async function holdPress(page, text, ms = 1600) {
  const rect = await page.evaluate((lbl) => {
    const t = [...document.querySelectorAll('div,span')].find(
      (e) => e.children.length === 0 && new RegExp(lbl, 'i').test(e.innerText || ''));
    if (!t) return null;
    let n = t;
    for (let k = 0; k < 6 && n.parentElement; k++) {
      const r = n.getBoundingClientRect();
      if (r.height >= 30 && r.width >= 40) break;
      n = n.parentElement;
    }
    const r = n.getBoundingClientRect();
    if (r.y < 0 || r.y > 910) return null;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, text);
  if (!rect) return false;
  await page.mouse.move(rect.x, rect.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
  await page.waitForTimeout(1200);
  return true;
}

/**
 * Dismiss the how-to-play sheet if present. The sheet AUTO-shows on a mode's
 * first-ever visit (components/ui/HowToPlaySheet.tsx via ScreenHeader), and the
 * suite runs against a fresh profile — so every mode module calls this right
 * after goto(). Targets the stable testID first, then falls back to the
 * "LET'S PLAY" CTA text (the proven RN-web click recipe).
 */
export async function dismissTutorial(page) {
  try {
    const sheet = page.locator('[data-testid="how-to-play-sheet"]').first();
    const btn = page.getByText("LET'S PLAY", { exact: false }).first();
    const present =
      (await sheet.isVisible({ timeout: 1500 }).catch(() => false)) ||
      (await btn.isVisible({ timeout: 500 }).catch(() => false));
    if (!present) return false;
    await btn.click({ force: true });
    await page.waitForTimeout(700);
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click({ force: true });
      await page.waitForTimeout(700);
    }
    return true;
  } catch {}
  return false;
}

// ---------------------------------------------------------------------------
// Autocomplete: type a query and pick a suggestion.
// ---------------------------------------------------------------------------

/** Type `query`, then click the suggestion row whose text === `pick` (or first
 *  containing it). Returns true if a row was clicked. */
export async function typeAndPick(page, query, pick, { inputIndex = 0, exactPick = false } = {}) {
  const input = page.locator('input').nth(inputIndex);
  if (!(await input.count())) return false;
  await input.click({ force: true });
  await input.fill('');
  await input.pressSequentially(query, { delay: 25 });
  await page.waitForTimeout(800); // debounce + render
  const loc = page.getByText(pick, { exact: exactPick });
  const n = await loc.count();
  for (let i = 0; i < n; i++) {
    const b = await loc.nth(i).boundingBox().catch(() => null);
    if (b && b.x >= 0 && b.y >= 25 && b.y < 910) {
      await loc.nth(i).click({ force: true });
      await page.waitForTimeout(700);
      return true;
    }
  }
  return false;
}

/** Type a query and click the FIRST suggestion row below the input (name-agnostic).
 *  Returns the picked name string, or false. */
export async function pickFirstSuggestion(page, query, { inputIndex = 0 } = {}) {
  const input = page.locator('input').nth(inputIndex);
  if (!(await input.count())) return false;
  await input.click({ force: true });
  await input.fill('');
  await input.pressSequentially(query, { delay: 25 });
  await page.waitForTimeout(850);
  const row = await page.evaluate((idx) => {
    const inputs = document.querySelectorAll('input');
    const inp = inputs[idx] || inputs[0];
    if (!inp) return null;
    const iy = inp.getBoundingClientRect().bottom;
    const cands = [...document.querySelectorAll('div,span')].filter((e) => {
      if (e.children.length !== 0) return false;
      const b = e.getBoundingClientRect();
      const t = e.innerText?.trim() || '';
      return b.x >= 0 && b.y > iy && b.y < iy + 340 && t.length > 2 && !/Cancel|Search|GUESS/i.test(t);
    }).sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    if (!cands.length) return null;
    let n = cands[0];
    for (let k = 0; k < 5 && n.parentElement; k++) {
      const r = n.getBoundingClientRect();
      if (r.height >= 36 && r.width >= 100) break;
      n = n.parentElement;
    }
    const r = n.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, name: cands[0].innerText.trim() };
  }, inputIndex);
  if (!row) return false;
  await page.mouse.click(row.x, row.y);
  await page.waitForTimeout(750);
  return row.name;
}

/** The visible autocomplete suggestion names currently below the input. */
export async function suggestionNames(page, { inputIndex = 0 } = {}) {
  return page.evaluate((idx) => {
    const inputs = document.querySelectorAll('input');
    const inp = inputs[idx] || inputs[0];
    if (!inp) return [];
    const iy = inp.getBoundingClientRect().bottom;
    return [...document.querySelectorAll('div,span')]
      .filter((e) => {
        if (e.children.length !== 0) return false;
        const b = e.getBoundingClientRect();
        const t = e.innerText?.trim() || '';
        return b.x >= 0 && b.y > iy - 4 && b.y < iy + 360 && t.length > 2 && !/Cancel|Search|GUESS/i.test(t);
      })
      .map((e) => e.innerText.trim());
  }, inputIndex);
}

// ---------------------------------------------------------------------------
// Player DB — famous valid guesses for wrong-guess exhaustion + name lookups.
// ---------------------------------------------------------------------------
const players = require(path.join(__dirname, '../../../data/players_db_v1.json'));
export const PLAYERS = players;
const nameSet = new Set(players.map((p) => p.name));
export function isRealPlayer(name) {
  return nameSet.has(name);
}

// A vetted pool of very famous players, filtered to those present in the DB, used
// as wrong guesses to exhaust lives across autocomplete modes. Large enough that
// a mode never runs out even after skipping ones that collide with the answer.
const FAMOUS_CANDIDATES = [
  'Lionel Messi', 'Cristiano Ronaldo', 'Erling Haaland', 'Kylian Mbappé', 'Kevin De Bruyne',
  'Mohamed Salah', 'Harry Kane', 'Luka Modrić', 'Robert Lewandowski', 'Neymar',
  'Vinicius Junior', 'Jude Bellingham', 'Karim Benzema', 'Toni Kroos', 'Sergio Ramos',
  'Virgil van Dijk', 'Son Heung-min', 'Bruno Fernandes', 'Bukayo Saka', 'Phil Foden',
  'Rodri', 'Federico Valverde', 'Antoine Griezmann', 'Marcus Rashford', 'Joshua Kimmich',
];
export const FAMOUS = FAMOUS_CANDIDATES.filter((n) => nameSet.has(n));
// Fallback: if too few matched (DB uses different spellings), take top market-value names.
if (FAMOUS.length < 8) {
  const byValue = [...players].sort((a, b) => (b.market_value || 0) - (a.market_value || 0)).slice(0, 30);
  for (const p of byValue) if (!FAMOUS.includes(p.name)) FAMOUS.push(p.name);
}

/** A famous player name NOT in the given exclusion set (e.g. not in a lineup). */
export function famousNotIn(excludeNames) {
  const ex = new Set(excludeNames.map((n) => (n || '').toLowerCase().trim()));
  return FAMOUS.find((n) => !ex.has(n.toLowerCase().trim())) || FAMOUS[0];
}

// ---------------------------------------------------------------------------
// Date window for sim alignment — try a spread around "today" (timezone-safe).
// ---------------------------------------------------------------------------
export function dateWindow(days = 3) {
  const out = [];
  const now = new Date();
  for (let d = -days; d <= days; d++) {
    const dt = new Date(now.getTime() + d * 86400000);
    out.push(dt.toISOString().slice(0, 10));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Game-over surface scraping + the shared checklist.
// ---------------------------------------------------------------------------

/** Scrape the game-over surface across the whole document (scroll-independent). */
export async function gameOverSurface(page) {
  const texts = await allTexts(page);
  const joined = texts.join(' | ');
  return {
    texts,
    rankLabel: texts.find((t) => RANK_RE.test(t)) || null,
    hasRank: RANK_RE.test(joined),
    hasShare: /share|copy/i.test(joined),
    hasCountdown: /next puzzle in/i.test(joined) || /\d{1,2}:\d\d:\d\d/.test(joined),
    hasNextUp: /next up/i.test(joined),
    hasAllDone: /all done for today|all done|perfect day|come back tomorrow/i.test(joined),
    nextUpMode: (() => { const i = texts.findIndex((t) => /next up/i.test(t)); return i >= 0 ? texts[i + 1] : null; })(),
    badText: [...new Set(texts.filter((t) => /\bNaN\b|\bundefined\b|\bInfinity\b|\$\{/.test(t)))],
  };
}

/** Is the game at an end state? NOTE: we do NOT key on the rank label — several
 *  modes (Top Lists, etc.) render the RankBadge LIVE during play to show
 *  progress, so a rank alone is not terminal. The next-puzzle countdown and the
 *  explicit end words only appear at true game-over. */
export async function isGameOver(page) {
  const s = await gameOverSurface(page);
  return s.hasCountdown ||
    /GAME OVER|FULL TIME|PLAY AGAIN|Play Again|WELL PLAYED|Better luck|COMPLETE|Come back tomorrow/i.test(s.texts.join(' '));
}

/**
 * Verify the game-over content is not HIDDEN BEHIND the floating tab bar. We
 * hit-test each terminal anchor's centre: if the element actually painted there
 * belongs to the tab-bar container, the anchor is covered (a real occlusion);
 * if the anchor paints on top (as in the Connections modal, where Next-up sits
 * above the tab bar) it is visible and passes. Elements below the fold pass when
 * the page can scroll them into view. Returns { ok, detail }.
 */
export async function checkNotOccluded(page) {
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 800); await page.waitForTimeout(250); }
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    // tab-bar container: the wide pill holding the Today leaf.
    const todayEl = [...document.querySelectorAll('div,span')].find((e) => e.children.length === 0 && e.innerText?.trim() === 'Today');
    let tabBar = null;
    if (todayEl) {
      let n = todayEl;
      for (let k = 0; k < 8; k++) { n = n.parentElement; if (!n) break; const r = n.getBoundingClientRect(); if (r.width > 300) { tabBar = n; break; } }
    }
    const anchors = [...document.querySelectorAll('div,span')].filter((e) => e.children.length === 0 &&
      /NEXT UP|NEXT PUZZLE IN|SHARE RESULT|COPY RESULT|PLAY AGAIN|All done/i.test(e.innerText || ''));
    if (!anchors.length) return { ok: true, detail: 'no terminal anchor found (skipped)' };
    const canScroll = document.documentElement.scrollHeight > window.innerHeight + 2;
    const vh = window.innerHeight;
    for (const a of anchors) {
      const r = a.getBoundingClientRect();
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      if (cy > vh - 1) {
        if (canScroll) continue; // below fold but scrollable -> reachable
        return { ok: false, detail: `anchor "${a.innerText.trim().slice(0, 24)}" below fold (cy=${Math.round(cy)}) and page cannot scroll` };
      }
      const hit = document.elementFromPoint(cx, cy);
      if (hit && tabBar && tabBar.contains(hit)) {
        return { ok: false, detail: `anchor "${a.innerText.trim().slice(0, 24)}" is covered by the tab bar (hit-test)` };
      }
    }
    return { ok: true, detail: `all ${anchors.length} terminal anchors visible (hit-test)` };
  });
}

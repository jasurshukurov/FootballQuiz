import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

export const BASE = 'http://localhost:8081';
export const SHOTS = path.resolve('scripts/qa/playtest/shots');
export const VIEWPORT = { width: 430, height: 932 };

fs.mkdirSync(SHOTS, { recursive: true });

/** Launch a browser + context. Pass storageState path to persist localStorage. */
export async function launch({ storageState } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    storageState: storageState && fs.existsSync(storageState) ? storageState : undefined,
  });
  const page = await context.newPage();
  const logs = { errors: [], warnings: [], pageerrors: [] };
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'error') logs.errors.push(m.text());
    else if (t === 'warning') logs.warnings.push(m.text());
  });
  page.on('pageerror', (e) => logs.pageerrors.push(e.message));
  return { browser, context, page, logs };
}

export async function goto(page, route) {
  const url = route.startsWith('http') ? route : BASE + route;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Expo web hydration + font load
  await page.waitForTimeout(2500);
}

export async function shot(page, name) {
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file });
  return file;
}

/** Click the LET'S PLAY tutorial button if visible. Returns true if dismissed.
 *  The button has an infinite pulse animation, so Playwright's stability check
 *  never settles — use force:true to skip actionability waiting. */
export async function dismissTutorial(page) {
  try {
    const btn = page.getByText("LET'S PLAY", { exact: false }).first();
    if (await btn.isVisible({ timeout: 1500 })) {
      await btn.click({ force: true });
      await page.waitForTimeout(700);
      // verify gone
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click({ force: true });
        await page.waitForTimeout(700);
      }
      return true;
    }
  } catch {}
  return false;
}

/** Type into a text input (first by default) and pick a suggestion row by name. */
export async function typeAndPick(page, text, pickName, { inputIndex = 0 } = {}) {
  const input = page.locator('input').nth(inputIndex);
  await input.click();
  await input.fill('');
  await input.type(text, { delay: 20 });
  await page.waitForTimeout(500); // debounce 250ms + render
  // suggestion rows show player name text
  const target = pickName ? page.getByText(pickName, { exact: true }).first()
                          : page.locator('input').first(); // fallback
  try {
    await target.waitFor({ state: 'visible', timeout: 2500 });
    await target.click();
    await page.waitForTimeout(500);
    return true;
  } catch {
    return false;
  }
}

/** Click first visible element containing this text. */
export async function clickText(page, text, { exact = false, timeout = 3000 } = {}) {
  const el = page.getByText(text, { exact }).first();
  await el.waitFor({ state: 'visible', timeout });
  await el.click();
  await page.waitForTimeout(300);
}

export async function hasText(page, text, { exact = false, timeout = 1500 } = {}) {
  try {
    await page.getByText(text, { exact }).first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/** Dump visible text + inputs + buttons for recon. */
export async function dumpDom(page) {
  return await page.evaluate(() => {
    const out = { inputs: [], buttons: [], texts: [] };
    document.querySelectorAll('input,textarea').forEach((el) => {
      out.inputs.push({ ph: el.placeholder || '', val: el.value || '' });
    });
    document.querySelectorAll('[role="button"]').forEach((el) => {
      const t = el.innerText?.trim();
      if (t) out.buttons.push(t.slice(0, 40));
    });
    const seen = new Set();
    document.querySelectorAll('div,span').forEach((el) => {
      if (el.children.length === 0) {
        const t = el.innerText?.trim();
        if (t && t.length < 60 && !seen.has(t)) { seen.add(t); out.texts.push(t); }
      }
    });
    return out;
  });
}

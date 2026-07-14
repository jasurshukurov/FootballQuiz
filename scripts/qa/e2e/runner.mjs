#!/usr/bin/env node
// Permanent end-to-end regression gate for the Football Daily app.
//
// Plays every registered daily mode to a genuine end state (each in an isolated browser
// context so daily-completion locks never cross-contaminate), asserts the
// shared game-over contract + mode-specific invariants on every one, then runs
// hub / stats / more / archive navigation checks. Exits non-zero on any failure.
//
// Usage:  node scripts/qa/e2e/runner.mjs            (expects Expo web on :8081)
//         EXPO_URL=http://localhost:8082 node scripts/qa/e2e/runner.mjs
//         node scripts/qa/e2e/runner.mjs higherlower agent   (subset by key)
import { launchBrowser, newModeContext, shot, BASE, ARTIFACTS } from './helpers.mjs';
import { makeCollector, sharedGameOverChecks } from './assertions.mjs';

import * as careerpath from './modes/careerpath.mjs';
import * as whoareya from './modes/whoareya.mjs';
import * as grid from './modes/grid.mjs';
import * as missing11 from './modes/missing11.mjs';
import * as connections from './modes/connections.mjs';
import * as toplists from './modes/toplists.mjs';
import * as higherlower from './modes/higherlower.mjs';
import * as agent from './modes/agent.mjs';
import * as blindranking from './modes/blindranking.mjs';
import * as careertimeline from './modes/careertimeline.mjs';
import * as guessmatch from './modes/guessmatch.mjs';
import * as hub from './modes/hub.mjs';

// Registry order (matches lib/modeRegistry.ts). Each entry drives one mode.
// marketmovers is deprecated (removed from the registry); its module stays in
// ./modes/ unregistered so a revival only needs to re-import it here.
const MODES = [careerpath, whoareya, grid, missing11, connections, toplists, higherlower, agent, blindranking, careertimeline, guessmatch];

const C = { reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', cyan: '\x1b[36m' };
const PASS = `${C.green}PASS${C.reset}`;
const FAIL = `${C.red}FAIL${C.reset}`;

/** Run one module in a fresh isolated context. `shared` = apply the game-over checklist. */
async function runModule(browser, mod, { shared = true } = {}) {
  const key = mod.meta.key;
  const t = makeCollector(key);
  const { context, page, logs } = await newModeContext(browser);
  const start = Date.now();
  try {
    await mod.play(page, t);
    if (shared) await sharedGameOverChecks(page, logs, t, { modeKey: key });
    else {
      // Non-shared modules (hub) still get the console/error gate + a
      // failure-only screenshot for triage.
      t.check('zero console errors', logs.errors.length === 0, logs.errors.slice(0, 5).join(' || '));
      t.check('zero page errors', logs.pageerrors.length === 0, logs.pageerrors.slice(0, 5).join(' || '));
      if (!t.ok) await shot(page, `FAIL-${key}`);
    }
  } catch (e) {
    t.check('module ran without throwing', false, `${e.message}\n${(e.stack || '').split('\n').slice(1, 4).join('\n')}`);
    // Even on a crash, capture the console/page errors + a screenshot.
    if (logs.errors.length) t.check('zero console errors', false, logs.errors.slice(0, 5).join(' || '));
    if (logs.pageerrors.length) t.check('zero page errors', false, logs.pageerrors.slice(0, 5).join(' || '));
    await shot(page, `FAIL-${key}-crash`).catch(() => {});
  } finally {
    await context.close().catch(() => {});
  }
  t.ms = Date.now() - start;
  return t;
}

async function main() {
  const argv = process.argv.slice(2);
  const only = argv.filter((a) => !a.startsWith('-'));
  // Match by exact key, dash-stripped key, or route basename (so "whoareya"
  // selects the "who-are-ya" mode).
  const matches = (m, a) => m.meta.key === a || m.meta.key.replace(/-/g, '') === a || m.meta.route.split('/').pop() === a;
  const selected = only.length ? MODES.filter((m) => only.some((a) => matches(m, a))) : MODES;
  const runHub = !only.length || only.includes('hub');

  console.log(`${C.bold}${C.cyan}Football Daily — E2E regression gate${C.reset}`);
  console.log(`${C.dim}target ${BASE} · viewport 430x932 · ${selected.length} modes${runHub ? ' + hub' : ''}${C.reset}\n`);

  const browser = await launchBrowser();
  const t0 = Date.now();
  const results = [];

  for (const mod of selected) {
    process.stdout.write(`${C.dim}▶ ${mod.meta.key}…${C.reset} `);
    const t = await runModule(browser, mod, { shared: true });
    results.push(t);
    console.log(t.ok ? `${PASS} ${C.dim}(${(t.ms / 1000).toFixed(1)}s)${C.reset}` : `${FAIL} ${C.dim}(${t.failed.length} failed, ${(t.ms / 1000).toFixed(1)}s)${C.reset}`);
  }

  let hubResult = null;
  if (runHub) {
    process.stdout.write(`${C.dim}▶ hub…${C.reset} `);
    hubResult = await runModule(browser, hub, { shared: false });
    results.push(hubResult);
    console.log(hubResult.ok ? `${PASS} ${C.dim}(${(hubResult.ms / 1000).toFixed(1)}s)${C.reset}` : `${FAIL} ${C.dim}(${hubResult.failed.length} failed)${C.reset}`);
  }

  await browser.close().catch(() => {});
  const totalMs = Date.now() - t0;

  // ---- Summary table ----
  console.log(`\n${C.bold}Results${C.reset}`);
  const w = Math.max(...results.map((r) => r.mode.length), 10);
  for (const r of results) {
    const pad = r.mode.padEnd(w);
    const status = r.ok ? PASS : FAIL;
    const counts = `${r.passed.filter((c) => !c.note).length} ok${r.failed.length ? `, ${C.red}${r.failed.length} failed${C.reset}` : ''}`;
    console.log(`  ${status}  ${pad}  ${C.dim}${counts} · ${(r.ms / 1000).toFixed(1)}s${C.reset}`);
  }

  // ---- Failure detail ----
  const failedModes = results.filter((r) => !r.ok);
  if (failedModes.length) {
    console.log(`\n${C.bold}${C.red}Failure detail${C.reset}`);
    for (const r of failedModes) {
      console.log(`\n${C.red}● ${r.mode}${C.reset}`);
      for (const c of r.failed) {
        console.log(`    ${C.red}✗${C.reset} ${c.name}${c.detail ? `\n        ${C.dim}${c.detail}${C.reset}` : ''}`);
      }
    }
    console.log(`\n${C.dim}Screenshots for failed modes: ${ARTIFACTS}/FAIL-*.png${C.reset}`);
  }

  const passN = results.filter((r) => r.ok).length;
  const modeN = results.length;
  console.log(`\n${C.bold}${passN === modeN ? C.green : C.red}${passN}/${modeN} passed${C.reset} ${C.dim}· ${(totalMs / 1000).toFixed(1)}s total${C.reset}`);

  process.exit(passN === modeN ? 0 : 1);
}

main().catch((e) => { console.error('runner crashed:', e); process.exit(2); });

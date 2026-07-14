// Test collector + the universal game-over checklist applied to every mode.
import { gameOverSurface, isGameOver, checkNotOccluded, shot } from './helpers.mjs';

/** A tiny per-mode result collector. */
export function makeCollector(mode) {
  const checks = [];
  return {
    mode,
    checks,
    /** Record a named assertion. `cond` truthy = pass. */
    check(name, cond, detail = '') {
      checks.push({ name, pass: !!cond, detail: String(detail).slice(0, 300) });
      return !!cond;
    },
    note(name, detail = '') {
      checks.push({ name, pass: true, detail: String(detail).slice(0, 300), note: true });
    },
    get failed() { return checks.filter((c) => !c.pass); },
    get passed() { return checks.filter((c) => c.pass); },
    get ok() { return checks.every((c) => c.pass); },
  };
}

/**
 * The DESIGN_SYSTEM game-over contract that EVERY mode must satisfy. Run after a
 * mode module has driven the game to its end state. Also folds in the
 * zero-console-error / zero-pageerror gate.
 */
export async function sharedGameOverChecks(page, logs, t, { modeKey } = {}) {
  const over = await isGameOver(page);
  t.check('reaches game-over state', over, over ? '' : 'no terminal marker (rank/countdown/PLAY AGAIN) found');

  const s = await gameOverSurface(page);
  t.check('game-over shows a RankBadge rank label', s.hasRank, s.rankLabel || `none of the 6 ranks in: ${s.texts.slice(0, 30).join(' / ')}`);
  // Sharing is behind FEATURES.sharing (lib/featureFlags.ts) and currently OFF —
  // assert the buttons are absent so a stray render is caught. Restore the
  // positive check when the flag is re-enabled.
  t.check('game-over hides share/copy row (FEATURES.sharing=false)', !s.hasShare, s.hasShare ? 'share/copy text unexpectedly present' : '');
  t.check('game-over shows next-puzzle countdown', s.hasCountdown, s.hasCountdown ? '' : 'no "next puzzle in" / clock text');
  t.check('game-over shows Next-up card OR all-done note', s.hasNextUp || s.hasAllDone,
    s.hasNextUp ? `next up: ${s.nextUpMode || '(mode)'}` : (s.hasAllDone ? 'all-done note' : 'neither next-up nor all-done present'));
  t.check('no raw NaN/undefined/Infinity text', s.badText.length === 0, s.badText.join(' | '));

  const occ = await checkNotOccluded(page);
  t.check('last game-over element not occluded by tab bar', occ.ok, occ.detail);

  t.check('zero console errors', logs.errors.length === 0, logs.errors.slice(0, 5).join(' || '));
  t.check('zero page errors', logs.pageerrors.length === 0, logs.pageerrors.slice(0, 5).join(' || '));

  // Screenshot on any failure for triage.
  if (!t.ok) await shot(page, `FAIL-${t.mode}`);
}

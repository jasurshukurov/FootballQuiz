// Missing XI — fill in a famous starting lineup. Tap a slot -> autocomplete ->
// guess; wrong guesses cost lives (4 wrong = loss). Mode invariant: the
// autocomplete is a GLOBAL player search (shows players NOT in the lineup),
// not restricted to the 11 correct answers.
import { goto, dismissTutorial, tapXY, leafTexts, suggestionNames, pressButton, clickText, isGameOver, FAMOUS, hasText } from '../helpers.mjs';

export const meta = { key: 'missing11', title: 'Missing XI', route: '/missing11' };

// Formation slot centres (4-4-2-ish) at the 430x932 viewport.
const SLOTS = [[138, 298], [291, 298], [77, 417], [168, 417], [261, 417], [353, 417], [77, 537], [168, 537], [261, 537], [353, 537], [215, 657]];

async function pitchNames(page) {
  return (await leafTexts(page, 150, 800))
    .map((x) => x.t)
    .filter((s) => s.length > 2 && !/GK|CB|LB|RB|CM|LM|RM|ST|CF|CAM|CDM|found|GAME|OVER|Share|Copy|Play|Guess|the/i.test(s));
}

async function openSlot(page, sx, sy) {
  await tapXY(page, sx, sy, 700);
  return (await page.locator('input').count()) > 0;
}

export async function play(page, t) {
  await goto(page, '/missing11');
  await dismissTutorial(page);
  t.check('lineup prompt renders', await hasText(page, 'Guess', { timeout: 3000 }) || await hasText(page, 'MISSING', { timeout: 1500 }), 'team/guess prompt');

  // Difficulty tier badge (shared TIER_LABELS vocabulary) + category chip are
  // shown in the match header so the player knows how deep today's cut is.
  const TIERS = ['Legendary', 'World Class', 'Professional', 'Semi-Pro', 'Amateur', 'Beginner'];
  let tierShown = false;
  for (const label of TIERS) {
    if (await hasText(page, label, { timeout: 200 })) { tierShown = true; break; }
  }
  t.check('difficulty tier badge shown', tierShown, 'TierBadge label in header');

  // --- Invariant: global-search autocomplete surfaces non-lineup players. ---
  let invariantChecked = false;
  for (const [sx, sy] of SLOTS) {
    if (await openSlot(page, sx, sy)) {
      const famous = FAMOUS[0];
      const input = page.locator('input').last();
      await input.click({ force: true }); await input.fill('');
      await input.pressSequentially(famous.split(' ')[0], { delay: 25 });
      await page.waitForTimeout(800);
      const sugg = await suggestionNames(page);
      const onPitch = new Set((await pitchNames(page)).map((s) => s.toLowerCase()));
      const nonLineup = sugg.filter((s) => !onPitch.has(s.toLowerCase()));
      t.check('missing11 autocomplete shows non-lineup players', sugg.length > 0 && nonLineup.length > 0,
        `suggestions=[${sugg.slice(0, 4).join(', ')}] nonLineup=${nonLineup.length}`);
      invariantChecked = true;
      // close the search overlay before playing
      await pressButton(page, 'Cancel', true).catch(() => {});
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(400);
      break;
    }
  }
  if (!invariantChecked) t.check('missing11 slot opens a search', false, 'no slot opened an input');

  // --- Drive to game-over: guess famous (wrong) players until lives run out. ---
  let wrongLanded = 0, fi = 0;
  for (let i = 0; i < 8 && wrongLanded < 4; i++) {
    if (await isGameOver(page)) break;
    const [sx, sy] = SLOTS[i % SLOTS.length];
    if (!(await openSlot(page, sx, sy))) continue;
    const name = FAMOUS[fi++ % FAMOUS.length];
    const input = page.locator('input').last();
    await input.click({ force: true }); await input.fill('');
    await input.pressSequentially(name.split(' ')[0], { delay: 25 });
    await page.waitForTimeout(700);
    const clicked = await pressButton(page, name, true) || await clickText(page, name.split(' ')[0], { exact: false });
    await page.waitForTimeout(1000);
    if (clicked) wrongLanded++;
    else { await pressButton(page, 'Cancel', true).catch(() => {}); await page.keyboard.press('Escape').catch(() => {}); }
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1500);
  t.check('landed guesses to exhaust lives', wrongLanded >= 1, `${wrongLanded} guesses landed`);
  t.check('reaches game-over', await isGameOver(page), 'terminal state');
}

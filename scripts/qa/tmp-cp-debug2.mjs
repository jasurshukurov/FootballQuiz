// Repro flow, then dump persisted store state after re-entry.
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
const dismiss = async () => {
  const lp = page.getByText(/let's play/i).first();
  if (await lp.count()) { await lp.click().catch(() => {}); await page.waitForTimeout(600); }
};
await page.goto('http://localhost:8081/careerpath', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
await dismiss();
const giveUp = page.getByText('Give Up').first();
const box = await giveUp.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down(); await page.waitForTimeout(1200); await page.mouse.up();
await page.waitForTimeout(1500);
await page.getByText('Play Again').first().click();
await page.waitForTimeout(2500);
// storage right after Play Again:
let dump = await page.evaluate(() => ({
  career: localStorage.getItem('career-game-storage'),
  progress: localStorage.getItem('daily-progress-storage'),
  keys: Object.keys(localStorage),
}));
const cg = JSON.parse(dump.career || '{}');
console.log('after PlayAgain: dailySeed=', cg.state?.dailySeed, 'player=', cg.state?.currentPlayer?.name, 'status=', cg.state?.gameStatus);
console.log('progress key present:', !!dump.progress, '| ls keys:', dump.keys.join(','));
if (dump.progress) {
  const p = JSON.parse(dump.progress);
  console.log('progress state:', JSON.stringify(p.state).slice(0, 200));
}
await page.goto('http://localhost:8081/careerpath', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
dump = await page.evaluate(() => localStorage.getItem('career-game-storage'));
const cg2 = JSON.parse(dump || '{}');
console.log('after re-entry: dailySeed=', cg2.state?.dailySeed, 'player=', cg2.state?.currentPlayer?.name, 'status=', cg2.state?.gameStatus);
await browser.close();

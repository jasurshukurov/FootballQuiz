import { launch, goto } from './helpers.mjs';
const { browser, page } = await launch();
const failed = [];
page.on('requestfailed', r => failed.push(r.url()));
page.on('response', r => { if (r.status()===404) failed.push('404 '+r.url()); });
for (const route of ['/marketmovers','/guessmatch']) {
  const before = failed.length;
  await goto(page, route);
  await page.waitForTimeout(1500);
  console.log(route, '->', failed.slice(before).map(u=>u.replace('http://localhost:8081','')).join('\n   ') || 'none');
}
await browser.close();

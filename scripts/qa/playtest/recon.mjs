import { launch, goto, dumpDom, shot, dismissTutorial } from './helpers.mjs';

const routes = process.argv.slice(2);
if (!routes.length) routes.push('/');

const { browser, page, logs } = await launch();
for (const r of routes) {
  console.log('\n===== ROUTE', r, '=====');
  await goto(page, r);
  const pre = await dumpDom(page);
  console.log('BEFORE tutorial dismiss:');
  console.log('  inputs:', JSON.stringify(pre.inputs));
  console.log('  buttons:', JSON.stringify(pre.buttons));
  const dismissed = await dismissTutorial(page);
  console.log('  tutorial dismissed:', dismissed);
  const post = await dumpDom(page);
  console.log('AFTER:');
  console.log('  inputs:', JSON.stringify(post.inputs));
  console.log('  buttons:', JSON.stringify(post.buttons));
  console.log('  texts:', JSON.stringify(post.texts.slice(0, 60)));
  const name = 'recon_' + r.replace(/[^a-z0-9]/gi, '_');
  await shot(page, name);
}
console.log('\nERRORS:', JSON.stringify(logs.errors.slice(0, 10)));
console.log('PAGEERRORS:', JSON.stringify(logs.pageerrors.slice(0, 10)));
await browser.close();

// v3: interaction screenshots (ticked rows + one disclosure open) and other chapters under the new app bar.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const OUT = process.env.OUT || '/workspace/oracle-qa/v3/after';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const [w, h] of [[1024, 768], [390, 844]]) {
  const ctx = await b.newContext({ colorScheme: 'dark', viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(BASE + '#offer'); await p.waitForTimeout(400);
  for (const i of [0, 2, 5]) await p.click(`[data-offer="${i}"]`);
  await p.click('.row:has(#offer-ai) .row-exp');
  await p.screenshot({ path: `${OUT}/offer-${w}-dark-interact.png`, fullPage: true });
  await p.goto(BASE + '#extraction'); await p.waitForTimeout(400);
  await p.click('[data-fp="1"]'); await p.click('[data-fp="3"]');
  await p.click('.row:has(#fp-location) .row-exp');
  await p.screenshot({ path: `${OUT}/extraction-${w}-dark-interact.png`, fullPage: true });
  for (const ch of ['machine', 'loop', 'revelation']) { await p.goto(BASE + '#' + ch); await p.waitForTimeout(900); await p.evaluate(() => scrollTo(0, 700)); await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/${ch}-${w}-dark-mid.png` }); }
  await ctx.close();
}
await b.close(); console.log('ok');

// v3 screenshots: Offer + Extraction at 1024 / 1280 / 1440 / 390, viewport + full page, dark + light.
// Usage: OUT=/workspace/oracle-qa/v3/after node v3-shots.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const OUT = process.env.OUT || '/workspace/oracle-qa/v3/after';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const widths = (process.env.WIDTHS || '1024,1280,1440,390').split(',').map(Number);
const schemes = (process.env.SCHEMES || 'dark,light').split(',');
for (const scheme of schemes) for (const w of widths) {
  const ctx = await b.newContext({ colorScheme: scheme, viewport: { width: w, height: w < 600 ? 844 : 768 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  for (const ch of ['offer', 'extraction']) {
    await p.goto(BASE + '#' + ch); await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/${ch}-${w}-${scheme}.png` });
    await p.screenshot({ path: `${OUT}/${ch}-${w}-${scheme}-full.png`, fullPage: true });
    // mid-scroll viewport (where floating chrome overlaps content)
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)); await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/${ch}-${w}-${scheme}-mid.png` });
  }
  await ctx.close();
}
await b.close();
console.log('ok', OUT);

// Word count of on-screen copy per screen (visible text inside #app; collapsed <details> content excluded), plus screenshots.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const OUT = process.env.OUT || '/workspace/oracle-qa/simplify/after';
const FIXED = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const screens = [['00-approach', ''], ['01-offer', '#offer'], ['02-extraction', '#extraction'], ['03-machine', '#machine'], ['04-loop', '#loop'], ['05-revelation', `#revelation?${FIXED}&fmt=portrait`], ['v12-harvest', '#protocol']];
const res = {};
for (const [view, vp] of [['desktop', { width: 1280, height: 860 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: view === 'mobile' ? 2 : 1, reducedMotion: 'reduce', colorScheme: 'dark' });
  const page = await ctx.newPage();
  for (const [name, hash] of screens) {
    await page.goto(BASE + hash); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500);
    if (name === 'v12-harvest') { const c = await page.$('#btn-crypto'); if (c) { await c.click(); await page.waitForTimeout(300); } const n = await page.$('#btn-next'); if (n) { await n.click(); await page.waitForTimeout(400); } }
    if (view === 'desktop') res[name] = await page.evaluate(() => {
      const w = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT); let words = 0, ctas = 0;
      while (w.nextNode()) { const el = w.currentNode.parentElement; if (!el || el.closest('details:not([open]) > :not(summary), .vh, [hidden], script, style')) continue; if (!el.getClientRects().length) continue; words += (w.currentNode.textContent.match(/[A-Za-z0-9\u00c0-\u024f'’]+/g) || []).length; }
      ctas = document.querySelectorAll('#app button:not([disabled]), #app a[href]').length;
      return { words, controls: ctas, height: document.documentElement.scrollHeight };
    });
    await page.screenshot({ path: `${OUT}/${name}-${view}.png`, fullPage: true });
    if (view === 'desktop') res[name].total = await page.evaluate(() => { // everything incl. text inside expanders
      document.querySelectorAll('#app details').forEach(d => { d.open = true; });
      const w = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT); let n = 0;
      while (w.nextNode()) { const el = w.currentNode.parentElement; if (!el || el.closest('.vh, [hidden], script, style') || !el.getClientRects().length) continue; n += (w.currentNode.textContent.match(/[A-Za-z0-9\u00c0-\u024f'’]+/g) || []).length; }
      return n;
    });
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(`${OUT}/words.json`, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res));

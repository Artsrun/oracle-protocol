// Cognitive-load metrics per screen + full-page and first-viewport screenshots. Measures; asserts nothing.
// Run before and after a UX change and compare the two tables (see docs/HANDOVER-UX.md).
//   BASE=http://127.0.0.1:8765/oracle-protocol/ CHROME=/path/to/chrome OUT=/tmp/oracle-load/before node load.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const OUT = process.env.OUT || '/tmp/oracle-load';
const SCHEME = process.env.COLOR_SCHEME === 'light' ? 'light' : 'dark';
const FIXED = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4';
const SCREENS = [['00-approach', ''], ['01-offer', '#offer'], ['02-extraction', '#extraction'], ['03-machine', '#machine'],
  ['04-loop', '#loop'], ['05-revelation', `#revelation?${FIXED}&fmt=portrait`], ['02b-sensors', '#sensors']];
const VIEWS = [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 860 }]];
fs.mkdirSync(OUT, { recursive: true });

// Runs in the page. Counts only what a visitor sees without opening anything.
const measure = () => {
  const app = document.getElementById('app');
  const seen = (el) => el.getClientRects().length && !el.closest('details:not([open]) > :not(summary), .vh, [hidden]');
  const all = (sel, root) => [...(root || app).querySelectorAll(sel)].filter(seen);
  const ownText = (el) => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  const count = (s) => (s.match(/[A-Za-z0-9À-ɏ'’]+/g) || []).length;
  let words = 0, foldWords = 0;
  const w = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const el = w.currentNode.parentElement; if (!el || !seen(el)) continue;
    const n = count(w.currentNode.textContent); words += n;
    if (el.getBoundingClientRect().top < innerHeight) foldWords += n;
  }
  // A checkbox or radio is as big as its label; everything else is as big as its own box.
  const box = (el) => {
    const r = el.getBoundingClientRect(); let wd = r.width, ht = r.height;
    if (/^(checkbox|radio)$/.test(el.type || '')) for (const l of el.labels || []) { const q = l.getBoundingClientRect(); wd = Math.max(wd, q.width); ht = Math.max(ht, q.height); }
    return Math.min(wd, ht);
  };
  const controls = all('button:not([disabled]), a[href], input, select, textarea, summary');
  const chrome = all('button, a[href], select', document.querySelector('.appbar'));
  const texts = all('*').filter(ownText);
  const sizes = [...new Set(texts.map(el => Math.round(parseFloat(getComputedStyle(el).fontSize))))].sort((a, b) => a - b);
  const caps = texts.filter(el => getComputedStyle(el).textTransform === 'uppercase' || /^[^a-z]*[A-Z]{2}[^a-z]*$/.test(el.textContent.trim())).length;
  const primary = all('.btn-fill, .btn-sm.primary')[0];
  return {
    words, foldWords,
    controls: controls.length, chromeControls: chrome.length,
    disclosures: all('details, .row-exp').length,
    labels: all('.prov, .perm-badge, dt').length,          // badge-style labels a visitor has to decode
    under44: controls.concat(chrome).filter(el => box(el) < 44).length,
    under24: controls.concat(chrome).filter(el => box(el) < 24).length,
    fontSizes: sizes.join('/'), smallestPx: sizes[0], caps,
    appbarPx: Math.round(document.querySelector('.appbar').getBoundingClientRect().height),
    viewports: +(document.documentElement.scrollHeight / innerHeight).toFixed(1),
    primaryActionY: primary ? Math.round(primary.getBoundingClientRect().top + scrollY) : null
  };
};

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const res = {};
for (const [view, viewport] of VIEWS) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce', colorScheme: SCHEME });
  const page = await ctx.newPage();
  for (const [name, hash] of SCREENS) {
    await page.goto(BASE + hash); await page.reload();
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400);
    res[`${name} ${view}`] = await page.evaluate(measure);
    await page.screenshot({ path: `${OUT}/${name}-${view}-fold.png` });
    await page.screenshot({ path: `${OUT}/${name}-${view}.png`, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/load.json`, JSON.stringify(res, null, 1));
console.table(res);
console.log('screenshots + load.json in ' + OUT);

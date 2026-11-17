// Cognitive-load metrics per screen + full-page and first-viewport screenshots. Measures; asserts nothing.
// Run before and after a UX change and compare the two tables (docs/QA.md, v4 WP10). v4: the legacy .appbar is
// gone (appbarPx is null when absent), Reveal and Extras are measured, and a scripted walk records the words read
// on every card, the taps to the artwork and an estimated time to finish (238 wpm + 1 s per decision).
//   BASE=http://127.0.0.1:8765/oracle-protocol/ CHROME=/path/to/chrome OUT=/tmp/oracle-load/before node load.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const OUT = process.env.OUT || '/tmp/oracle-load';
const SCHEME = process.env.COLOR_SCHEME === 'light' ? 'light' : 'dark';
const FIXED = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4';
const SCREENS = [['00-approach', ''], ['01-offer', '#offer'], ['02-extraction', '#extraction'], ['03-machine', '#machine'],
  ['04-loop', '#loop'], ['04b-reveal', '#reveal'], ['05-revelation', `#revelation?${FIXED}&fmt=portrait`], ['06-extras', '#extras'],
  ['02b-sensors', '#sensors']];
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
  const bar = document.querySelector('.appbar');
  const chrome = bar ? all('button, a[href], select', bar) : [];
  const texts = all('*').filter(ownText);
  const sizes = [...new Set(texts.map(el => Math.round(parseFloat(getComputedStyle(el).fontSize))))].sort((a, b) => a - b);
  const caps = texts.filter(el => getComputedStyle(el).textTransform === 'uppercase' || /^[^a-z]*[A-Z]{2}[^a-z]*$/.test(el.textContent.trim())).length;
  const primary = all('.btn-primary, .btn-fill, .btn-sm.primary')[0];
  const art = document.getElementById('pv-canvas'), ar = art && art.getBoundingClientRect();
  return {
    words, foldWords,
    controls: controls.length, chromeControls: chrome.length,
    disclosures: all('details, .row-exp').length,
    labels: all('.prov, .perm-badge, dt').length,          // badge-style labels a visitor has to decode
    under44: controls.concat(chrome).filter(el => box(el) < 44).length,
    under24: controls.concat(chrome).filter(el => box(el) < 24).length,
    fontSizes: sizes.join('/'), smallestPx: sizes[0], caps,
    options: all('input[type=checkbox], input[type=radio]').length,   // choices shown at once
    questions: all('fieldset').length,
    primaries: all('.btn-primary').length,
    artInView: !!ar && ar.width > 40 && ar.top >= 0 && ar.bottom <= innerHeight,
    appbarPx: bar && bar.getClientRects().length ? Math.round(bar.getBoundingClientRect().height) : null,
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

// Scripted walk at 390 px: fast path (Skip the cards) and full read (every Loop and Reveal card).
const words = () => document.querySelector('#app') && (() => { let n = 0; const w = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const el = w.currentNode.parentElement; if (!el || !el.getClientRects().length || el.closest('details:not([open]) > :not(summary), .vh, [hidden]')) continue; n += (w.currentNode.textContent.match(/[A-Za-z0-9À-ɏ'’]+/g) || []).length; } return n; })();
const walk = async (full) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: SCHEME, hasTouch: true });
  const p = await ctx.newPage(); const log = []; let taps = 0, decisions = 0, scrolls = 0;
  const read = async (label) => { await p.waitForTimeout(250); const n = await p.evaluate(words); const sh = await p.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1); if (sh) scrolls++; log.push([label, n]); };
  const tap = async (sel, decision) => { await p.click(sel); taps++; if (decision) decisions++; };
  await p.goto(BASE); await p.reload(); await p.evaluate(() => document.fonts.ready); await read('start');
  await tap('#btn-begin'); await read('trade');
  await tap('label[for=offer-0]', 1); await tap('label[for=offer-2]', 1); await tap('[data-goto=extraction]'); await read('footprint');
  decisions++; // reading the pre-ticked footprint and accepting it is one decision
  await tap('[data-goto=machine]'); await read('loop card 1');
  if (full) { for (let i = 2; i <= 7; i++) { await tap('#card-next'); await read('loop card ' + i); } await tap('#card-next'); }
  else await tap('#card-skip');
  await read('feed'); await tap('label.radio-card', 1);
  await tap('.v4s .btn-primary[data-goto]'); await read('reveal card 1');
  if (full) { for (let i = 2; i <= 5; i++) { await tap('#card-next'); await read('reveal card ' + i); } await tap('#card-next'); }
  else await tap('#card-skip');
  await read('artwork');
  const onArt = await p.evaluate(() => location.hash.startsWith('#revelation') || !!document.getElementById('rv-download'));
  const total = log.reduce((a, [, n]) => a + n, 0);
  await ctx.close();
  return { total, taps, decisions, scrolls, onArt, estSeconds: Math.round(total / 238 * 60 + decisions), log: log.map(([l, n]) => l + ' ' + n).join(', ') };
};
res['path fast'] = await walk(false);
res['path full'] = await walk(true);
await browser.close();
fs.writeFileSync(`${OUT}/load.json`, JSON.stringify(res, null, 1));
console.table(res);
console.log('screenshots + load.json in ' + OUT);

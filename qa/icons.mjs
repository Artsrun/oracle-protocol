// v8 WP1/WP2: icons + captions. On every screen and the two big sheets, at 390×844:
//  - every <use> resolves to a <symbol> of the inline sprite (no request is made for icons);
//  - every icon is aria-hidden and unfocusable; it is never the control's only name (caption or aria-label present);
//  - every visible control that carries an icon is ≥44 px tall/wide (hit target).
//   BASE=http://127.0.0.1:8765/oracle-protocol/ CHROME=/path/to/chrome node icons.mjs
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const FIXED = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4&v=3';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let fails = 0, total = 0; const out = [];
const check = (ok, msg, d) => { total++; if (!ok) fails++; out.push(`${ok ? 'PASS' : 'FAIL'}  ${msg}${ok || d === undefined ? '' : '  — ' + JSON.stringify(d).slice(0, 400)}`); };
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage(), errs = [], reqs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('request', r => { if (/\.svg(\?|$)/.test(r.url())) reqs.push(r.url()); });
const audit = (scope) => page.evaluate((scope) => {
  const root = scope ? document.querySelector(scope) : document.getElementById('app');
  const icons = [...root.querySelectorAll('svg.i')], bad = [], small = [], nameless = [];
  for (const s of icons) {
    const u = s.querySelector('use'), id = u && (u.getAttribute('href') || '').slice(1);
    if (!id || !document.getElementById(id) || document.getElementById(id).tagName.toLowerCase() !== 'symbol') bad.push(id || '(no use)');
    if (s.getAttribute('aria-hidden') !== 'true' || s.getAttribute('focusable') !== 'false') bad.push('aria:' + id);
    const c = s.closest('button,a,label,summary');
    if (c) {
      const name = (c.getAttribute('aria-label') || c.textContent || '').trim();
      if (!name) nameless.push(c.outerHTML.slice(0, 80));
      const r = c.getBoundingClientRect();
      if (r.width && r.height && (r.height < 43.5 || r.width < 43.5) && getComputedStyle(c).visibility !== 'hidden') small.push(`${(c.id || c.className || c.tagName)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
  }
  return { n: icons.length, bad, small, nameless };
}, scope);
const ROUTES = ['', '#offer', '#extraction', '#device', '#machine', '#loop', '#reveal?' + FIXED, '#revelation?' + FIXED, '#extras'];
for (const r of ROUTES) {
  await page.goto(BASE + r); await page.waitForTimeout(700);
  const a = await audit();
  const name = r.split('?')[0] || 'start';
  check(a.n > 0, `${name}: icons present (${a.n})`, a.n);
  check(!a.bad.length, `${name}: every icon resolves to the sprite and is aria-hidden/unfocusable`, a.bad);
  check(!a.nameless.length, `${name}: no icon is a control's only name`, a.nameless);
  check(!a.small.length, `${name}: icon controls ≥44 px`, a.small);
}
// sheets: Options (artwork) and Why these? (Q1)
await page.goto(BASE + '#revelation?' + FIXED); await page.waitForTimeout(700);
await page.click('#rv-options'); await page.waitForTimeout(400);
{ const a = await audit('#sheet'); check(a.n >= 6 && !a.bad.length && !a.nameless.length && !a.small.length, `Options sheet: ${a.n} icons resolve, named, ≥44 px`, a); }
await page.goto(BASE + '#offer'); await page.waitForTimeout(600);
await page.click('#why-offer'); await page.waitForTimeout(400);
{ const a = await audit('#sheet'); check(a.n >= 7 && !a.bad.length && !a.nameless.length && !a.small.length, `Why these? sheet: ${a.n} icons resolve, named, ≥44 px`, a); }
const sprites = await page.evaluate(() => document.querySelectorAll('#oracle-icons').length);
check(sprites === 1, 'the sprite is mounted once', sprites);
check(!reqs.length, 'no icon file is requested over the network', reqs);
check(!errs.length, 'no page errors', errs);
await b.close();
console.log(out.join('\n')); console.log(`\nicons: ${total - fails}/${total} passed`); process.exit(fails ? 1 : 0);

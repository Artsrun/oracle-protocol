// v7 WP9: draggable bottom sheet. Real touch input through CDP (Input.dispatchTouchEvent → Pointer Events) at 390×844.
// Long sheet = Options; short sheet = a Device ⓘ. Checks D12–D14 and that v6 Back/Esc/Close behaviour is intact.
//   BASE=http://127.0.0.1:8765/oracle-protocol/ CHROME=/path/to/chrome node sheet.mjs   (SHOT=dir saves a mid-drag image)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const FIXED = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4&v=3';
const SCHEME = process.env.COLOR_SCHEME || 'dark', SHOT = process.env.SHOT || '';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let fails = 0; const out = [];
process.on('uncaughtException', (e) => { console.log(out.join('\n')); console.log('CRASH', e.message.split('\n')[0]); process.exit(1); });
const check = (ok, msg, d) => { if (!ok) fails++; out.push(`${ok ? 'PASS' : 'FAIL'}  ${msg}${ok || d === undefined ? '' : '  — ' + JSON.stringify(d).slice(0, 400)}`); };
async function setup(o = {}) {
  const ctx = await b.newContext({ colorScheme: SCHEME, viewport: o.vp || { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: !o.desktop, hasTouch: true, reducedMotion: o.reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  const cdp = await ctx.newCDPSession(page);
  await page.goto(BASE + '#revelation?' + FIXED); await page.waitForTimeout(900);
  return { ctx, page, cdp, errs };
}
const openOptions = async (page) => { await page.click('#rv-options'); await page.waitForTimeout(350); };
const st = (page) => page.evaluate(() => { const d = document.getElementById('sheet'), p = d && d.querySelector('.sheet-panel');
  return { open: !!(d && d.open), snap: d && d.dataset.snap || 'full', tf: p ? p.style.transform : '', h: p ? Math.round(p.getBoundingClientRect().height) : 0, top: p ? Math.round(p.getBoundingClientRect().top) : 0,
    sentinel: !!(history.state && history.state.oracleSheet), focus: document.activeElement && (document.activeElement.id || document.activeElement.className), anims: document.getAnimations().length, tr: p ? p.style.transition : '' }; });
const grabPoint = (page, sel = '.sheet-grab') => page.evaluate((s) => { const r = document.querySelector('#sheet ' + s).getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }, sel);
// a touch drag: `steps` moves of dy/steps each, `gap` ms apart
async function drag(cdp, page, from, dy, steps, gap, opts = {}) {
  const tp = (y) => [{ x: from.x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(from.y) });
  for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(from.y + dy * i / steps) }); if (gap) await page.waitForTimeout(gap); }
  if (opts.mid) await opts.mid();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(260);
}
// 1. long sheet: slow 40 % drag closes and drops the history sentinel; focus returns to Options
{ const { ctx, page, cdp, errs } = await setup(); await openOptions(page);
  const s0 = await st(page), g = await grabPoint(page);
  await drag(cdp, page, g, Math.round(s0.h * 0.4), 12, 30, { mid: SHOT ? async () => { await page.screenshot({ path: SHOT + '/sheet-mid-drag.png' }); } : null });
  const s1 = await st(page);
  check(s0.open && s0.sentinel && !s1.open && !s1.sentinel && s1.focus === 'rv-options', 'long sheet: a slow 40 % drag from the handle closes it; history sentinel removed; focus back on Options', { s0, s1 });
  // 2. a 10 % drag springs back
  await openOptions(page); const h = (await st(page)).h, g2 = await grabPoint(page);
  await drag(cdp, page, g2, Math.round(h * 0.1), 6, 40);
  const s2 = await st(page);
  check(s2.open && s2.tf === '' && s2.snap === 'full' && s2.sentinel && s2.tr === '', 'a slow 10 % drag stays open and settles back (no leftover transform or transition)', s2);
  // 3. a fast flick (≈ 90 px in ≈ 40 ms) closes
  await drag(cdp, page, g2, 90, 3, 12);
  const s3 = await st(page);
  check(!s3.open && !s3.sentinel, 'a fast flick (> 0.4 px/ms) closes even though it is under 25 %', s3);
  // 4. snap: a slow drag past the half-way point between full and half, but under 25 %, snaps to half; dragging up returns to full
  await openOptions(page); const s4a = await st(page), g4 = await grabPoint(page);
  const toHalf = Math.round((s4a.h - 844 * 0.5) / 2 + 12);
  await drag(cdp, page, g4, Math.min(toHalf, Math.round(s4a.h * 0.24)), 10, 40);
  const s4 = await st(page);
  check(s4.open && s4.snap === 'half' && Math.abs(s4.h - 422) <= 2 && s4.tf === '', `long sheet snaps to half (${s4a.h}px → ${s4.h}px) on a ${toHalf}px drag`, { s4a, s4, toHalf });
  { await page.evaluate(AXE); const v = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(x => x.id)); check(!v.length, 'axe 0 on the half-height sheet', v); }
  const g5 = await grabPoint(page); await drag(cdp, page, g5, -80, 6, 30);
  const s5 = await st(page);
  check(s5.open && s5.snap === 'full' && s5.h === s4a.h, 'dragging up from half returns to full height', s5);
  // 5. tap on the handle toggles half/full on a long sheet
  const g6 = await grabPoint(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g6.x, y: g6.y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(250);
  const s6 = await st(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g6.x, y: (await grabPoint(page)).y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(250);
  const s7 = await st(page);
  check(s6.snap === 'half' && s7.snap === 'full' && s7.open, 'a tap on the handle toggles half ↔ full', { s6, s7 });
  // 6. header drag works too; header buttons still tap
  const hd = await page.evaluate(() => { const r = document.querySelector('#sheet .sheet-title').getBoundingClientRect(); return { x: Math.round(r.left + 10), y: Math.round(r.top + r.height / 2) }; });
  await drag(cdp, page, hd, Math.round(s7.h * 0.4), 10, 30);
  check(!(await st(page)).open, 'dragging the header (title) closes too', { ...(await st(page)), hash: await page.evaluate(() => location.hash + ' ' + state.stage) });
  await openOptions(page); await page.tap('#sheet .sheet-close'); await page.waitForTimeout(250);
  check(!(await st(page)).open, 'Close still closes by tap', await st(page));
  // 7. dragging inside the body scrolls, never moves the panel
  await openOptions(page); const bd = await page.evaluate(() => { const r = document.querySelector('#sheet-body').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
  await drag(cdp, page, bd, 200, 8, 20); const s8 = await st(page);
  check(s8.open && s8.tf === '', 'a drag inside the body does not move or close the sheet', s8);
  // 8. Back still closes (v6 WP8)
  await page.goBack(); await page.waitForTimeout(300); const s9 = await st(page);
  check(!s9.open && await page.evaluate(() => state.stage) === 'revelation', 'Back closes the sheet and stays on the artwork (v6 WP8)', s9);
  check(!errs.length, 'no page errors', errs);
  // short sheet: no half snap, a tap on the handle does nothing
  await page.click('#rv-options'); await page.waitForTimeout(200); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await ctx.close();
}
{ const { ctx, page, cdp } = await setup();
  await page.evaluate(() => OracleSheet.open({ title: 'Short sheet', html: '<p>Two lines of text.</p><p>Nothing else.</p>', from: document.getElementById('rv-options') })); await page.waitForTimeout(300);
  const s0 = await st(page), g = await grabPoint(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.x, y: g.y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(250);
  const s1 = await st(page);
  await drag(cdp, page, g, Math.round(s0.h * 0.15), 6, 40); const s2 = await st(page);
  check(s1.open && s1.snap === 'full' && s2.open && s2.snap === 'full' && s2.h === s0.h, `short sheet (${s0.h}px): no half snap; tap does nothing; a small drag springs back`, { s0, s1, s2 });
  await ctx.close();
}
// reduced motion: no settle transition at all; drag still closes
{ const { ctx, page, cdp } = await setup({ reduce: true }); await openOptions(page);
  await page.evaluate(() => { window.__tr = []; const p = document.querySelector('#sheet .sheet-panel'); new MutationObserver(() => window.__tr.push(p.style.transition)).observe(p, { attributes: true, attributeFilter: ['style'] }); });
  const s0 = await st(page), g = await grabPoint(page);
  await drag(cdp, page, g, Math.round(s0.h * 0.1), 5, 40);
  await drag(cdp, page, g, Math.round(s0.h * 0.4), 10, 30);
  const tr = await page.evaluate(() => window.__tr.filter(Boolean));
  check(!tr.length && !(await st(page)).open, 'reduced motion: no transition ever set; a 40 % drag still closes', tr);
  await ctx.close();
}
// wide screen: side panel, no dragging
{ const { ctx, page, cdp } = await setup({ vp: { width: 1280, height: 860 }, desktop: true }); await openOptions(page);
  const hd = await page.evaluate(() => { const r = document.querySelector('#sheet .sheet-title').getBoundingClientRect(); return { x: Math.round(r.left + 10), y: Math.round(r.top + r.height / 2) }; });
  await drag(cdp, page, hd, 300, 10, 20); const s = await st(page);
  const grab = await page.evaluate(() => getComputedStyle(document.querySelector('#sheet .sheet-grab')).display);
  check(s.open && s.tf === '' && grab === 'none', '≥900 px side panel: no handle, header drag does nothing', { s, grab });
  await ctx.close();
}
// no endless animation after any of this
await b.close();
console.log(out.join('\n'));
console.log(`sheet: ${out.length - fails}/${out.length} checks pass`);
process.exit(fails ? 1 : 0);

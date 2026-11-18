// v6 mobile harness (PLAN-v6 WP0). Measures every journey screen at nine sizes in one colour scheme, plus the
// phone behaviours the v6 work packages change: safe-area insets (CDP override), the on-screen keyboard
// (SIMULATED by shrinking the viewport), Back/history/focus, swipe on cards, text zoom, offline reload and a
// throttled first load. Prints a targets table (met / missed) and writes mobile.json.
//   BASE=http://127.0.0.1:8765/oracle-protocol/ COLOR_SCHEME=dark|light OUT=/tmp/oracle-mobile node mobile.mjs
//   STRICT=1 exits non-zero when a target is missed.  QUICK=1 skips the throttled load.
//   Dev filters: ONLY_VIEWS=844x390,360x640  ONLY_SCREENS=trade,footprint  NO_BEHAVIOUR=1 (targets then cover only what ran).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const OUT = process.env.OUT || '/tmp/oracle-mobile';
const SCHEME = process.env.COLOR_SCHEME === 'light' ? 'light' : 'dark';
const FIXED = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4';
const SHOTS = process.env.SHOTS !== '0';
fs.mkdirSync(OUT, { recursive: true });
// [name, hash, steps]; a step is a selector to click or a function(page).
const toArtworkWithDevice = async (p) => { await p.click('#dev-show'); await p.waitForTimeout(1500); await p.evaluate(() => OracleChapters.go('revelation')); await p.waitForTimeout(700); };
const SCREENS = [
  ['start', ''], ['trade', '#offer'], ['footprint', '#extraction'], ['device-ask', '#device'],
  ['device-readout', '#device', ['#dev-show']], ['device-card', '#device', ['#dev-show', '#dev-next']],
  ['loop', '#machine'], ['feed', '#loop'], ['reveal', '#reveal'], ['artwork', `#revelation?${FIXED}&fmt=portrait`],
  ['options-legacy', `#revelation?${FIXED}&fmt=portrait`, ['#rv-options'], 'sheet'],
  ['options-device', '#device', [toArtworkWithDevice, '#rv-options'], 'sheet'], ['extras', '#extras']];
const JOURNEY = ['trade', 'footprint', 'device-ask', 'device-readout', 'device-card', 'loop', 'feed', 'reveal', 'artwork'];
const ALL_VIEWS = [['320x568', 320, 568, 2], ['360x640', 360, 640, 3], ['390x844', 390, 844, 3], ['430x932', 430, 932, 3],
  ['667x375', 667, 375, 2], ['844x390', 844, 390, 3], ['932x430', 932, 430, 3], ['768x1024', 768, 1024, 2], ['1280x800', 1280, 800, 1, false]];
const LANDSCAPE = ['667x375', '844x390', '932x430'];
const pick = (list, env) => process.env[env] ? list.filter(x => process.env[env].split(',').includes(x[0])) : list;
const VIEWS = pick(ALL_VIEWS, 'ONLY_VIEWS');
const ORIGIN = new URL(BASE).origin + '/';

const measure = (sheet) => {
  const root = sheet ? document.querySelector('#sheet .sheet-panel') : document.getElementById('app');
  const clipped = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return true; const r = e.getBoundingClientRect(); if (s.position === 'absolute' && r.width <= 1 && r.height <= 1) return true; } return false; };
  const vis = (el) => el.getClientRects().length && !el.closest('details:not([open]) > :not(summary), .vh, .legend-vh, [hidden]') && !clipped(el);
  const all = (sel) => [...root.querySelectorAll(sel)].filter(vis);
  let words = 0; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const el = w.currentNode.parentElement; if (!el || el.closest('script,style') || !vis(el)) continue; words += (w.currentNode.textContent.match(/[A-Za-z0-9À-ɏ'’]+/g) || []).length; }
  const box = (el) => { const r = el.getBoundingClientRect(); let wd = r.width, ht = r.height;
    if (/^(checkbox|radio)$/.test(el.type || '')) for (const l of el.labels || []) { const q = l.getBoundingClientRect(); wd = Math.max(wd, q.width); ht = Math.max(ht, q.height); }
    return Math.min(wd, ht); };
  const controls = all('button:not([disabled]), a[href], input:not([type=hidden]), select, textarea, summary');
  const foot = document.getElementById('sitefoot'), fr = foot && foot.getClientRects().length && getComputedStyle(foot).display !== 'none' ? foot.getBoundingClientRect() : null;
  const docH = document.documentElement.scrollHeight;
  const screenH = fr ? fr.top + scrollY : docH;
  const prim = [...document.querySelectorAll('#app .btn-primary')].filter(vis)[0], pr = prim && prim.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio, 3);
  const arts = [...document.querySelectorAll('#app canvas')].filter(vis).map(c => { const r = c.getBoundingClientRect(); return { id: c.id, w: Math.round(r.width), h: Math.round(r.height), ratio: +(Math.min(c.width / (r.width * dpr), c.height / (r.height * dpr))).toFixed(2), backing: c.width + 'x' + c.height }; });
  const inputs = [...document.querySelectorAll('input[type=text], textarea, select')].filter(el => el.getClientRects().length).map(el => parseFloat(getComputedStyle(el).fontSize));
  const texts = all('*').filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  const sizes = [...new Set(texts.map(el => Math.round(parseFloat(getComputedStyle(el).fontSize))))].sort((a, b) => a - b);
  // last option row → primary button gap (WP1: Next directly under the list, no empty band)
  // = empty band between the content right above the CTA row and the CTA row itself
  const cta = pr && prim.closest('.screen-cta');
  let above = null; for (let e = cta && cta.previousElementSibling; e; e = e.previousElementSibling) if (vis(e)) { above = e; break; }
  const lastOpt = [...root.querySelectorAll('.check-row, .radio-card, .dev-row')].filter(vis).pop();
  const gap = cta && above && lastOpt ? Math.round(cta.getBoundingClientRect().top - above.getBoundingClientRect().bottom) : null;
  return { words, controls: controls.length, under44: controls.filter(el => box(el) < 44).length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    vp: +(screenH / innerHeight).toFixed(2), docVp: +(docH / innerHeight).toFixed(2),
    primary: pr ? { top: Math.round(pr.top / innerHeight * 100), bottom: Math.round(pr.bottom / innerHeight * 100), inView: pr.top >= 0 && pr.bottom <= innerHeight + 0.5 } : null,
    arts, inputMin: inputs.length ? Math.min(...inputs) : null, fontSizes: sizes.join('/'), gapToPrimary: gap };
};

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const external = [];
const watch = (page) => page.on('request', r => { const u = r.url(); if (!u.startsWith(ORIGIN) && !/^(data|blob):/.test(u)) external.push(u); });
const M = {};
const run = async (page, hash, steps) => {
  await page.goto(BASE + hash); await page.reload(); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(350);
  for (const s of steps || []) { if (typeof s === 'function') await s(page); else { await page.click(s, { timeout: 5000 }); await page.waitForTimeout(s === '#dev-show' ? 1500 : 500); } }
};
for (const [view, w, h, dsf, mobile] of VIEWS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, isMobile: mobile !== false, hasTouch: mobile !== false, reducedMotion: 'reduce', colorScheme: SCHEME, serviceWorkers: 'block' });
  const page = await ctx.newPage(); watch(page);
  for (const [name, hash, steps, kind] of pick(SCREENS, 'ONLY_SCREENS')) {
    try { await run(page, hash, steps); } catch (e) { M[`${view} ${name}`] = { error: String(e).split('\n')[0] }; continue; }
    M[`${view} ${name}`] = await page.evaluate(measure, kind === 'sheet');
    if (SHOTS) { fs.mkdirSync(`${OUT}/shots`, { recursive: true }); await page.screenshot({ path: `${OUT}/shots/${name}-${view}.png`, scale: 'css' }); }
  }
  await ctx.close();
}

// ── behaviours (390×844 phone unless noted) ──────────────────────────────
const B = {};
if (!process.env.NO_BEHAVIOUR) {
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: 'reduce', colorScheme: SCHEME, serviceWorkers: 'block' };
// Safe-area insets: portrait 47 top / 34 bottom; landscape 47 left / 47 right / 21 bottom (iPhone-like, SIMULATED).
{
  const out = {};
  for (const [label, vp, insets, list] of [['portrait', { width: 390, height: 844 }, { top: 47, bottom: 34, left: 0, right: 0 }, [['trade', '#offer'], ['footprint', '#extraction'], ['device-ask', '#device'], ['feed', '#loop'], ['reveal', '#reveal'], ['artwork', `#revelation?${FIXED}&fmt=portrait`], ['start', ''], ['options', `#revelation?${FIXED}&fmt=portrait`, ['#rv-options']]]],
    ['landscape', { width: 844, height: 390 }, { top: 0, bottom: 21, left: 47, right: 47 }, [['trade', '#offer'], ['artwork', `#revelation?${FIXED}&fmt=portrait`], ['start', '']]]]) {
    const ctx = await browser.newContext({ ...phone, viewport: vp }); const p = await ctx.newPage(); watch(p);
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets });
    for (const [n, hash, steps] of list) {
      await run(p, hash, steps);
      out[`${label} ${n}`] = await p.evaluate((ins) => {
        const sheet = document.querySelector('#sheet[open] .sheet-panel');
        const scope = sheet || document.getElementById('app');
        const ctl = [...scope.querySelectorAll('button, a[href], input, select, label.radio-card, .check-row label')].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
        const top = Math.min(...ctl.map(el => el.getBoundingClientRect().top + (sheet ? 0 : scrollY)));
        const prim = document.querySelector('#app .btn-primary'), pr = prim && prim.getBoundingClientRect();
        const left = Math.min(...ctl.map(el => el.getBoundingClientRect().left)), right = Math.max(...ctl.map(el => el.getBoundingClientRect().right));
        const sheetBottom = sheet ? Math.round(innerHeight - Math.max(...[...sheet.querySelectorAll('.sheet-body > *')].map(e => e.getBoundingClientRect().bottom + 0)) - 0) : null;
        const body = sheet && sheet.querySelector('.sheet-body');
        return { topGap: sheet ? null : Math.round(top), primaryBottomGap: pr && !sheet ? Math.round(innerHeight - pr.bottom) : null, leftGap: Math.round(left), rightGap: Math.round(innerWidth - right),
          sheetPadBottom: body ? parseFloat(getComputedStyle(body).paddingBottom) + parseFloat(getComputedStyle(sheet).paddingBottom || 0) : null, ins };
      }, insets);
    }
    await ctx.close();
  }
  B.safeArea = out;
}
// Keyboard (SIMULATED): open Options, focus the seed field, shrink the viewport by 336 px (a typical phone keyboard).
{
  const ctx = await browser.newContext(phone); const p = await ctx.newPage(); watch(p);
  await run(p, `#revelation?${FIXED}&fmt=portrait`, ['#rv-options']);
  const opened = await p.evaluate(() => { const d = document.querySelector('#sheet details.more-opts'); if (d) d.open = true; return !!d; });
  await p.waitForTimeout(200);
  await p.focus('#rv-restore'); await p.waitForTimeout(300);
  await p.setViewportSize({ width: 390, height: 508 }); await p.waitForTimeout(600);
  B.keyboard = await p.evaluate(() => { const i = document.getElementById('rv-restore'), r = i.getBoundingClientRect(); return { focused: document.activeElement === i, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, visible: r.top >= 0 && r.bottom <= innerHeight, font: parseFloat(getComputedStyle(i).fontSize) }; });
  B.keyboard.moreDisclosure = opened;
  if (SHOTS) await p.screenshot({ path: `${OUT}/shots/keyboard-sim-390.png`, scale: 'css' });
  await ctx.close();
}
// Back, history and focus.
{
  const ctx = await browser.newContext(phone); const p = await ctx.newPage(); watch(p);
  const st = () => p.evaluate(() => ({ stage: state.stage, hash: location.hash, sheet: !!(document.getElementById('sheet') || {}).open, focus: document.activeElement && document.activeElement.tagName, h1: !!document.activeElement && document.activeElement.matches('#app h1, #card-title') }));
  const r = {};
  await p.goto(BASE); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.click('#btn-begin'); await p.waitForTimeout(300); await p.click('[data-goto=extraction]'); await p.waitForTimeout(300);
  await p.goBack(); await p.waitForTimeout(400); r.backToTrade = await st();
  await p.click('[data-info], #why-offer'); await p.waitForTimeout(400); r.sheetOpen = await st();
  await p.goBack(); await p.waitForTimeout(400); r.backWithSheet = await st();
  // 20 random open/close sequences on Trade, then one Back must reach Start (no orphan entries).
  await p.goto(BASE); await p.reload(); await p.waitForTimeout(300); await p.click('#btn-begin'); await p.waitForTimeout(300);
  let orphan = 0; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 20; i++) try {
    for (let k = 0; k < 4; k++) {
      const open = await p.evaluate(() => !!(document.getElementById('sheet') || {}).open), x = rnd();
      if (!open) { await p.click('[data-info], #why-offer', { timeout: 2000 }); }
      else if (x < 0.33) await p.keyboard.press('Escape');
      else if (x < 0.66) await p.click('[data-sheet-close]');
      else await p.goBack();
      await p.waitForTimeout(150);
    }
    if (await p.evaluate(() => !!(document.getElementById('sheet') || {}).open)) { await p.keyboard.press('Escape'); await p.waitForTimeout(150); }
    const s0 = await st(); if (s0.stage !== 'offer') orphan++;
    await p.goBack(); await p.waitForTimeout(250); const s1 = await st(); if (s1.stage !== 'approach') orphan++;
    await p.goForward(); await p.waitForTimeout(250);
  } catch (e) { orphan++; await p.goto(BASE); await p.reload(); await p.waitForTimeout(300); await p.click('#btn-begin'); await p.waitForTimeout(300); }
  r.orphans = orphan;
  // Device sub-steps: ask → readout; Back returns to the ask.
  await p.goto(BASE + '#device'); await p.reload(); await p.waitForTimeout(400);
  await p.click('#dev-show'); await p.waitForTimeout(1500);
  await p.goBack(); await p.waitForTimeout(400); r.deviceBack = await p.evaluate(() => ({ stage: state.stage, ask: !!document.getElementById('dev-show'), h1: document.activeElement && document.activeElement.matches('#app h1') }));
  // Old links and aliases still open their screens.
  const links = {};
  for (const h of ['#sensors', '#protocol', '#portrait', '#offer', `#revelation?${FIXED}`]) { await p.goto(BASE + h); await p.reload(); await p.waitForTimeout(300); links[h] = await p.evaluate(() => state.stage); }
  r.links = links;
  B.back = r; await ctx.close();
}
// Swipe on cards (touch events through CDP; Chrome turns them into pointer events).
{
  const ctx = await browser.newContext(phone); const p = await ctx.newPage(); watch(p); const cdp = await ctx.newCDPSession(p);
  const swipe = async (x0, x1, y0, y1) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
    for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / 6, y: y0 + (y1 - y0) * i / 6 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(300);
  };
  const title = () => p.evaluate(() => (document.querySelector('.card-count, #card-title') || {}).textContent);
  const out = {};
  for (const [n, hash] of [['loop', '#machine'], ['reveal', '#reveal']]) {
    await run(p, hash);
    const box = await p.evaluate(() => { const c = document.querySelector('#cards .story-card') || document.getElementById('cards'); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const t0 = await title(); await swipe(box.x + 80, box.x - 80, box.y, box.y); const t1 = await title();
    await swipe(box.x - 80, box.x + 80, box.y, box.y); const t2 = await title();
    await swipe(box.x, box.x + 10, box.y + 60, box.y - 60); const t3 = await title();
    await swipe(6, 180, box.y, box.y); const t4 = await title();
    out[n] = { next: t1 !== t0, prev: t2 === t0, verticalIgnored: t3 === t2, edgeIgnored: t4 === t3 };
  }
  B.swipe = out; await ctx.close();
}
// Text zoom 200 % (root font size doubled, like a large browser font setting).
{
  const ctx = await browser.newContext(phone); const p = await ctx.newPage(); watch(p); const out = {};
  for (const [n, hash] of [['trade', '#offer'], ['footprint', '#extraction'], ['device', '#device'], ['feed', '#loop'], ['artwork', `#revelation?${FIXED}&fmt=portrait`]]) {
    await run(p, hash);
    const before = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#app h1')).fontSize));
    await p.addStyleTag({ content: 'html{font-size:200% !important}' }); await p.waitForTimeout(300);
    out[n] = await p.evaluate((b) => ({ h1: b + '→' + parseFloat(getComputedStyle(document.querySelector('#app h1')).fontSize), scales: parseFloat(getComputedStyle(document.querySelector('#app h1')).fontSize) > b, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth }), before);
  }
  B.textZoom = out; await ctx.close();
}
// Offline: load once with the service worker allowed, wait until it controls the page, go offline, reload.
{
  const ctx = await browser.newContext({ ...phone, serviceWorkers: 'allow' }); const p = await ctx.newPage(); watch(p);
  await p.goto(BASE); await p.waitForTimeout(500);
  const sw = await p.evaluate(async () => { if (!('serviceWorker' in navigator)) return 'unsupported'; const regs = await navigator.serviceWorker.getRegistrations(); if (!regs.length) return 'none'; await navigator.serviceWorker.ready; return 'ready'; });
  let offline = null;
  if (sw === 'ready') { await p.reload(); await p.waitForTimeout(500); await ctx.setOffline(true);
    try { await p.reload({ timeout: 8000 }); await p.waitForTimeout(500); offline = await p.evaluate(() => !!document.querySelector('#app h1') && !!window.OracleChapters); await p.click('#btn-begin'); await p.waitForTimeout(400); offline = offline && await p.evaluate(() => state.stage === 'offer' && !!document.querySelector('#pv-canvas')); } catch (e) { offline = 'failed: ' + String(e).split('\n')[0].slice(0, 80); } }
  const extra = await p.evaluate(() => ({ manifest: !!document.querySelector('link[rel=manifest]'), touchIcon: !!document.querySelector('link[rel=apple-touch-icon]'), icon: (document.querySelector('link[rel=icon]') || {}).getAttribute?.('href') })).catch(() => ({}));
  B.offline = { sw, offline, ...extra }; await ctx.close();
}
// First load: Begin visible, cold cache, Slow 4G (150 ms, 1.6 Mbps) + 4× CPU (SIMULATED).
if (!process.env.QUICK) {
  const ctx = await browser.newContext({ ...phone, serviceWorkers: 'block' }); const p = await ctx.newPage(); watch(p); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let reqs = 0; p.on('request', () => reqs++);
  const t0 = Date.now(); await p.goto(BASE, { waitUntil: 'commit' }); await p.waitForSelector('#btn-begin', { state: 'visible', timeout: 60000 }); const begin = Date.now() - t0;
  await p.waitForLoadState('load'); const ready = Date.now() - t0;
  B.load = { beginVisibleMs: begin, loadMs: ready, requests: reqs }; await ctx.close();
}
} // behaviours
await browser.close();

// ── targets (PLAN-v6 §3 acceptance) ──────────────────────────────────────
const T = [];
const t = (wp, name, ok, measured) => T.push({ wp, name, ok: !!ok, measured: typeof measured === 'string' ? measured : JSON.stringify(measured) });
const g = (v, s) => M[`${v} ${s}`] || {};
const artMin = (v, list) => Math.min(...list.flatMap(s => (g(v, s).arts || []).map(a => a.h)));
for (const v of LANDSCAPE) {
  t('WP1', `${v}: every art canvas ≥160 px tall`, artMin(v, ['start', 'trade', 'footprint', 'device-ask', 'device-readout', 'device-card', 'loop', 'feed', 'reveal', 'artwork']) >= 160, artMin(v, ['start', 'trade', 'footprint', 'device-ask', 'device-readout', 'device-card', 'loop', 'feed', 'reveal', 'artwork']) + ' px');
  const one = ['start', 'device-ask', 'device-card', 'reveal', 'artwork', 'trade', 'feed'];
  const bad = one.filter(s => !(g(v, s).vp <= 1.0 && g(v, s).primary && g(v, s).primary.inView));
  t('WP1', `${v}: Start, Device ask/card, Reveal, Artwork, Trade, Feed ≤1.0 vp with the primary in view`, !bad.length, bad.map(s => s + ' ' + g(v, s).vp).join(', ') || 'all 1.0');
  t('WP1', `${v}: Footprint ≤1.25 vp`, g(v, 'footprint').vp <= 1.25, g(v, 'footprint').vp);
  const gaps = ['trade', 'footprint', 'feed'].map(s => g(v, s).gapToPrimary);
  t('WP1', `${v}: Next directly under the last option (gap ≤ 24 px)`, gaps.every(x => x !== null && x <= 24), gaps.join('/'));
}
for (const v of ['360x640']) { const bad = JOURNEY.filter(s => !(g(v, s).vp <= 1.0 && g(v, s).primary && g(v, s).primary.inView)); t('WP2', `${v}: every journey screen ≤1.0 vp, Next in view`, !bad.length, bad.map(s => s + ' ' + g(v, s).vp).join(', ') || 'all ≤1.0'); }
{ const v = '320x568', worst = Math.max(...JOURNEY.map(s => g(v, s).vp || 9)); t('WP2', `${v}: every journey screen ≤1.1 vp`, worst <= 1.1, 'max ' + worst + ' (' + JOURNEY.map(s => s + ' ' + g(v, s).vp).join(', ') + ')'); }
{ const u = VIEWS.flatMap(([v]) => JOURNEY.map(s => g(v, s).under44 || 0)).reduce((a, b) => a + b, 0); t('WP2', 'targets ≥44 px on journey screens (all sizes)', u === 0, u + ' under 44'); }
t('WP3', 'Trade ≤9 controls', g('390x844', 'trade').controls <= 9, g('390x844', 'trade').controls);
t('WP3', 'Footprint ≤11 controls', g('390x844', 'footprint').controls <= 11, g('390x844', 'footprint').controls);
t('WP4', 'Device ask ≤40 words', g('390x844', 'device-ask').words <= 40, g('390x844', 'device-ask').words);
t('WP4', 'Permission card ≤30 words', g('390x844', 'device-card').words <= 30, g('390x844', 'device-card').words);
for (const o of ['options-legacy', 'options-device']) {
  t('WP5', `${o}: ≤12 controls on open`, g('390x844', o).controls <= 12, g('390x844', o).controls);
  t('WP5', `${o}: ≤60 words on open`, g('390x844', o).words <= 60, g('390x844', o).words);
}
{ const sa = B.safeArea || {}; const p = Object.entries(sa).filter(([k]) => k.startsWith('portrait') && !k.endsWith('options'));
  t('WP6', 'portrait insets 47/34: first control ≥55 px from top', p.every(([, x]) => x.topGap >= 55), p.map(([k, x]) => k.split(' ')[1] + ' ' + x.topGap).join(', '));
  t('WP6', 'portrait insets 47/34: primary ≥42 px from bottom', p.filter(([, x]) => x.primaryBottomGap !== null).every(([, x]) => x.primaryBottomGap >= 42), p.filter(([, x]) => x.primaryBottomGap !== null).map(([k, x]) => k.split(' ')[1] + ' ' + x.primaryBottomGap).join(', '));
  const o = sa['portrait options']; t('WP6', 'sheet bottom padding ≥ inset (34) + 8', o && o.sheetPadBottom >= 42, o && o.sheetPadBottom);
  const l = Object.entries(sa).filter(([k]) => k.startsWith('landscape'));
  t('WP6', 'landscape side insets 47: controls ≥47 px from both edges', l.every(([, x]) => x.leftGap >= 47 && x.rightGap >= 47), l.map(([k, x]) => k.split(' ')[1] + ' ' + x.leftGap + '/' + x.rightGap).join(', ')); }
{ const mins = VIEWS.flatMap(([v]) => SCREENS.map(([s]) => g(v, s).inputMin).filter(x => x != null)); t('WP6', 'text inputs and selects ≥16 px', mins.every(x => x >= 16), 'min ' + Math.min(...mins)); }
t('WP6', 'keyboard (SIMULATED, 508 px): focused seed field fully visible', B.keyboard && B.keyboard.visible && B.keyboard.focused, B.keyboard);
t('WP6', 'text zoom 200%: type scales, no horizontal overflow', B.textZoom && Object.values(B.textZoom).every(x => x.scales && x.overflowX <= 0), B.textZoom);
{ const r = VIEWS.flatMap(([v]) => SCREENS.flatMap(([s]) => (g(v, s).arts || []).map(a => [v + ' ' + s + ' ' + a.id, a.ratio]))); const worst = r.reduce((m, x) => x[1] < m[1] ? x : m, ['', 9]);
  t('WP7', 'every visible art canvas ≥0.95× the device pixels it needs (cap 3×)', worst[1] >= 0.95, 'lowest ' + worst.join(' ')); }
{ const a = (g('390x844', 'trade').arts || [])[0]; t('WP7', 'question-screen preview ≥25% of viewport height at 390×844', a && a.h >= 0.25 * 844, a && a.h + ' px'); }
{ const bad = JOURNEY.filter(s => g('390x844', s).vp > 1.0); t('WP7', '390×844: every journey screen still ≤1.0 vp', !bad.length, bad.join(',') || 'all ≤1.0'); }
{ const b = B.back || {}; t('WP8', 'Back with a sheet open closes the sheet and stays on the screen', b.backWithSheet && !b.backWithSheet.sheet && b.backWithSheet.stage === 'offer', b.backWithSheet);
  t('WP8', 'Back from the Device readout returns to the ask', b.deviceBack && b.deviceBack.ask && b.deviceBack.stage === 'device', b.deviceBack);
  t('WP8', 'focus on the H1 after Back', b.backToTrade && b.backToTrade.h1 && b.deviceBack && b.deviceBack.h1, { trade: b.backToTrade && b.backToTrade.focus, device: b.deviceBack && b.deviceBack.h1 });
  t('WP8', 'no orphan history entries after 20 random sheet sequences', b.orphans === 0, b.orphans);
  t('WP8', 'old links and aliases still open their screens', b.links && b.links['#sensors'] === 'device' && b.links['#protocol'] === 'device' && b.links['#portrait'] === 'device' && b.links['#offer'] === 'offer' && /revelation/.test(Object.values(b.links).pop()), b.links); }
{ const s = B.swipe || {}; t('WP9', 'swipe changes Loop and Reveal cards; vertical and edge swipes ignored', ['loop', 'reveal'].every(n => s[n] && s[n].next && s[n].prev && s[n].verticalIgnored && s[n].edgeIgnored), s); }
if (B.load) t('WP11', 'Begin visible ≤2.5 s with Slow 4G + 4× CPU', B.load.beginVisibleMs <= 2500, B.load.beginVisibleMs + ' ms');
t('WP11', 'offline reload works after one visit (service worker)', B.offline && B.offline.offline === true, B.offline);
t('WP11', 'manifest, touch icon and a real favicon', B.offline && B.offline.manifest && B.offline.touchIcon && B.offline.icon && B.offline.icon !== 'data:,', B.offline);
t('ALL', 'zero requests leave localhost', !external.length, external.slice(0, 3));
{ const o = VIEWS.flatMap(([v]) => SCREENS.map(([s]) => [v + ' ' + s, g(v, s).overflowX])).filter(([, x]) => x > 0); t('ALL', 'no horizontal overflow, 13 screens × 9 sizes', !o.length, o.slice(0, 4)); }
{ const e = Object.entries(M).filter(([, x]) => x.error); t('ALL', 'every screen state opens', !e.length, e.slice(0, 3)); }

fs.writeFileSync(`${OUT}/mobile.json`, JSON.stringify({ scheme: SCHEME, when: new Date().toString(), screens: M, behaviour: B, targets: T }, null, 1));
if (process.env.TABLE) for (const [k, x] of Object.entries(M)) console.log(k.padEnd(26), x.error || `vp ${x.vp} prim ${x.primary ? x.primary.top + '-' + x.primary.bottom + '%' : '-'} gap ${x.gapToPrimary} ctl ${x.controls} w ${x.words} <44 ${x.under44} in ${x.inputMin} art ${(x.arts || []).map(a => a.w + 'x' + a.h + '@' + a.ratio).join(',')}`);
for (const x of T) console.log(`${x.ok ? 'MET   ' : 'MISSED'} ${x.wp.padEnd(4)} ${x.name} — ${String(x.measured).slice(0, 300)}`);
const met = T.filter(x => x.ok).length;
console.log(`\nmobile (${SCHEME}): ${met}/${T.length} targets met · results in ${OUT}/mobile.json`);
process.exit(process.env.STRICT && met < T.length ? 1 : 0);

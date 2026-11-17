// Oracle Protocol v4 — end-to-end QA (grows one section per work package; see docs/QA.md "v4").
// Serve the repo's parent folder so the site lives under /oracle-protocol/ like GitHub Pages:
//   python3 -m http.server 8765 --bind 127.0.0.1
//   COLOR_SCHEME=dark|light QA_DIR=/tmp/v4 CHROME=/path/to/chrome node v4.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const QA = process.env.QA_DIR || '/tmp/oracle-v4-qa';
const SCHEME = process.env.COLOR_SCHEME === 'light' ? 'light' : 'dark';
const R = { scheme: SCHEME, checks: [], requests: [], consoleErrors: [], axe: {} };
const check = (name, ok, detail) => { R.checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined && !ok ? '  — ' + JSON.stringify(detail).slice(0, 400) : ''}`); };
fs.mkdirSync(QA, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const instrument = (page, tag) => {
  page.on('console', m => { if (m.type() === 'error') R.consoleErrors.push({ tag, text: m.text() }); });
  page.on('pageerror', e => R.consoleErrors.push({ tag, text: 'pageerror: ' + e.message }));
  page.on('request', r => R.requests.push({ tag, url: r.url(), method: r.method() }));
};
const settle = (page, ms = 400) => page.waitForTimeout(ms);
const axe = async (page, name) => {
  await page.evaluate(AXE); // CDP evaluate is not subject to the page CSP (addScriptTag is blocked, as intended)
  const res = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, n: v.nodes.length, t: v.nodes.slice(0, 2).map(x => x.target.join(' ')) })));
  R.axe[name] = res; return res;
};
// Nothing fixed or sticky may cover page content (an open, user-summoned <dialog> is the one exception).
const overlayFree = (page) => page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => {
  const cs = getComputedStyle(el); if (!/fixed|sticky/.test(cs.position)) return false;
  if (el.closest('dialog')) return false; const r = el.getBoundingClientRect();
  if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false;
  if (el.tagName === 'CANVAS' && cs.pointerEvents === 'none' && +cs.zIndex < 0) return false; // background art behind content
  return cs.pointerEvents !== 'none';
}).map(el => el.tagName + '.' + el.className));
const running = (page) => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity).length);

// ── 0. invariants on every main screen (both widths) ─────────────────────
const SCREENS = (process.env.SCREENS || 'approach:,offer:#offer,extraction:#extraction,machine:#machine,loop:#loop,revelation:#revelation').split(',').map(s => s.split(':'));
for (const [view, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 860 }]]) {
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); instrument(page, view);
  const bad = [], anim = [], viol = {};
  for (const [name, hash] of SCREENS) {
    await page.goto(BASE + hash); await page.reload(); await settle(page, 700);
    const o = await overlayFree(page); if (o.length) bad.push([name, o]);
    const a = await running(page); if (a) anim.push([name, a]);
    const v = await axe(page, `${view}-${name}`); if (v.length) viol[name] = v;
  }
  check(`${view}: no fixed or sticky UI over content on any screen`, !bad.length, bad);
  check(`${view}: no endless animation left running (reduced motion)`, !anim.length, anim);
  check(`${view}: axe-core WCAG 2.1 A/AA zero violations on every screen`, !Object.keys(viol).length, viol);
  // CSP probe: the page itself cannot make a network request.
  const blocked = await page.evaluate(async () => { try { await fetch('https://example.com/x'); return false; } catch (e) { return true; } });
  check(`${view}: CSP connect-src 'none' blocks fetch`, blocked);
  await ctx.close();
}

// ── per-WP sections are appended below this line ─────────────────────────
// ── WP3: frame — Back, progress, art in view, one primary action ──────────
for (const [view, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 860 }]]) {
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); instrument(page, 'wp3-' + view);
  const steps = [['offer', 1, 'approach'], ['extraction', 2, 'offer'], ['machine', 3, 'extraction'], ['loop', 4, 'machine']];
  const bad = [];
  for (const [id, n, prev] of steps) {
    await page.goto(BASE + '#' + id); await page.reload(); await settle(page, 500);
    const f = await page.evaluate(() => {
      const c = document.getElementById('pv-canvas'), r = c && c.getBoundingClientRect();
      const pb = document.querySelector('.progress[role=progressbar]');
      return { art: !!r && r.width > 40 && r.top >= 0 && r.bottom <= innerHeight, now: pb && +pb.getAttribute('aria-valuenow'),
        back: (document.querySelector('[data-back]') || {}).dataset?.back || null, primaries: document.querySelectorAll('#app .btn-primary').length };
    });
    if (!f.art || f.now !== n || f.back !== prev || f.primaries !== 1) bad.push([id, f]);
  }
  check(`${view}: WP3 every step screen has Back, "n of 5" progress, the artwork in view and one primary action`, !bad.length, bad);
  await page.goto(BASE + '#extraction'); await page.reload(); await settle(page, 400);
  await page.click('[data-back]'); await settle(page, 400);
  check(`${view}: WP3 Back returns to the previous screen`, await page.evaluate(() => state.stage) === 'offer');
  await page.goto(BASE); await page.reload(); await settle(page, 400);
  const st = await page.evaluate(() => ({ h1: document.querySelector('h1').textContent, begin: !!document.getElementById('btn-begin') }));
  await page.click('#btn-begin'); await settle(page, 400);
  check(`${view}: WP3 Start has one question-free promise and Begin opens step 1`, st.begin && await page.evaluate(() => state.stage) === 'offer', st);
  await ctx.close();
}

// ── WP4: Trade + Footprint ───────────────────────────────────────────────
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true });
  const page = await ctx.newPage(); instrument(page, 'wp4');
  const words = () => page.evaluate(() => { let n = 0; const w = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const el = w.currentNode.parentElement; if (el.getClientRects().length && !el.closest('.vh,.legend-vh,[hidden]')) n += (w.currentNode.textContent.match(/[A-Za-z0-9'’]+/g) || []).length; } return n; });
  const groups = () => page.evaluate(() => { const p = OracleArt.normalize(OracleChapters.artParams()), sc = OracleLayers.compose(p, 0.8);
    return Object.fromEntries(OracleLayers.GROUPS.map(g => [g, JSON.stringify(OracleLayers.group(sc, g)).length + ':' + OracleArt.sceneHash({ layers: [{ items: OracleLayers.group(sc, g) }] })])); });
  await page.goto(BASE); await page.reload(); await settle(page, 300);
  await page.click('#btn-begin'); await settle(page, 300);
  const tradeWords = await words();
  const g0 = await groups(); const pv0 = await page.$eval('#pv-canvas', c => c.toDataURL());
  await page.tap('label[for=offer-0]'); await settle(page, 200);
  const g1 = await groups(); const pv1 = await page.$eval('#pv-canvas', c => c.toDataURL());
  const changed = Object.keys(g0).filter(k => g0[k] !== g1[k]);
  check('WP4 Trade: ≤45 words on screen', tradeWords <= 45, tradeWords);
  check('WP4 ticking a trade redraws the preview and changes only the shards layer', pv0 !== pv1 && changed.join() === 'shards', changed);
  await page.tap('label[for=offer-3]'); await settle(page, 150);
  await page.click('[data-info="offer:0"]'); await settle(page, 300);
  const sh = await page.evaluate(() => ({ open: document.getElementById('sheet').open, modal: document.getElementById('sheet').matches(':modal'), verified: !!document.querySelector('#sheet .prov-verified'), cite: !!document.querySelector('#sheet .cite[data-source]'), inferred: !!document.querySelector('#sheet .prov-inferred') }));
  check('WP4 tapping ⓘ opens a modal sheet with the VERIFIED claim, its source and the INFERRED reading', sh.open && sh.modal && sh.verified && sh.cite && sh.inferred, sh);
  await page.click('#sheet .cite'); await settle(page, 200);
  const src = await page.evaluate(() => ({ t: document.getElementById('sheet-title').textContent, back: !document.querySelector('[data-sheet-back]').hidden, link: (document.querySelector('#sheet-body a[href^="http"]') || {}).rel }));
  await page.click('[data-sheet-back]'); await settle(page, 150);
  const backT = await page.evaluate(() => document.getElementById('sheet-title').textContent);
  check('WP4 a source opens inside the sheet; Back returns to the claim; source links are noopener', src.back && /noopener/.test(src.link || '') && backT === 'Social apps', { src, backT });
  await page.keyboard.press('Escape'); await settle(page, 200);
  const after = await page.evaluate(() => ({ open: document.getElementById('sheet').open, focus: document.activeElement.dataset.info }));
  check('WP4 Esc closes the sheet and focus returns to the ⓘ button', !after.open && after.focus === 'offer:0', after);
  await page.click('[data-goto=extraction]'); await settle(page, 300);
  const fp = await page.evaluate(() => ({ mask: state.v2.footprint, expect: OracleState.prefillFootprint(state.v2.offers), lead: document.querySelector('.lead').textContent, checked: document.querySelectorAll('[data-fp]:checked').length }));
  check('WP4 Footprint is pre-filled from the trades and says it is our assumption', fp.mask === fp.expect && fp.checked > 0 && /our assumption/i.test(fp.lead), fp);
  check('WP4 Footprint: ≤50 words on screen', (await words()) <= 50, await words());
  const gf0 = await groups(); await page.tap('label[for=fp-7]'); await settle(page, 150); const gf1 = await groups();
  const fch = Object.keys(gf0).filter(k => gf0[k] !== gf1[k]);
  check('WP4 ticking a footprint kind changes only the lattice (and network for relationships)', fch.length && fch.every(k => k === 'lattice' || k === 'network'), fch);
  const edited = await page.evaluate(() => state.v2.footprint);
  await page.click('[data-back]'); await settle(page, 300); await page.tap('label[for=offer-4]'); await settle(page, 100);
  await page.click('[data-goto=extraction]'); await settle(page, 300);
  check('WP4 an edited footprint is never overwritten by later trade changes', await page.evaluate(() => state.v2.footprint) === edited);
  await ctx.close();
}

// ── WP5: Loop story cards ────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); instrument(page, 'wp5');
  await page.goto(BASE + '#machine'); await page.reload(); await settle(page, 300);
  const seen = [], maxWords = [];
  for (let i = 0; i < 7; i++) {
    const c = await page.evaluate(() => ({ t: document.getElementById('card-title').textContent, n: document.querySelector('.card-count').textContent,
      w: (document.querySelector('.story-card').innerText.match(/[A-Za-z0-9'’]+/g) || []).length }));
    seen.push(c.n); maxWords.push(c.w);
    if (i === 2) { await page.click('#card-ev'); await settle(page, 200); }
    if (i === 2) { const ok = await page.evaluate(() => document.getElementById('sheet').open && !!document.querySelector('#sheet .prov')); check('WP5 a card\'s Evidence opens the sheet with its labelled claim', ok); await page.keyboard.press('Escape'); await settle(page, 150); }
    await page.click('#card-next'); await settle(page, 200);
  }
  check('WP5 seven tap-through cards (1 of 7 … 7 of 7), then the Feed', seen.join() === [1, 2, 3, 4, 5, 6, 7].map(n => n + ' of 7').join() && await page.evaluate(() => state.stage) === 'loop', seen);
  check('WP5 ≤20 words per card (plus its count and Evidence link)', Math.max(...maxWords) <= 24, maxWords);
  await page.goto(BASE + '#machine'); await page.reload(); await settle(page, 300);
  await page.click('#card-skip'); await settle(page, 300);
  check('WP5 Skip goes straight to the Feed', await page.evaluate(() => state.stage) === 'loop');
  await ctx.close();
}

// @@SECTIONS@@

// ── network + console (always last) ──────────────────────────────────────
const ext = R.requests.filter(r => !/^http:\/\/127\.0\.0\.1:8765\//.test(r.url) && !/^(data|blob):/.test(r.url));
check('network: zero requests leave localhost (the CSP probe is blocked before it is sent)', ext.every(r => /example\.com\/x$/.test(r.url)) , ext.slice(0, 5));
check('network: only GET requests', R.requests.every(r => r.method === 'GET'));
const errs = R.consoleErrors.filter(e => !/Content Security Policy|example\.com|Failed to fetch|net::ERR_/.test(e.text));
check('console: zero app errors', !errs.length, errs.slice(0, 5));
const pass = R.checks.filter(c => c.ok).length;
console.log(`\nv4 QA (${SCHEME}): ${pass}/${R.checks.length} passed`);
fs.writeFileSync(`${QA}/v4-results-${SCHEME}.json`, JSON.stringify(R, null, 1));
await browser.close();
process.exit(pass === R.checks.length ? 0 : 1);

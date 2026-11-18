// Oracle Protocol — end-to-end QA. v4 sections (WP3–WP10) plus v5 sections (Device step, privacy, fixtures).
// Renamed from qa/v4.mjs at v5 WP0; it grows one section per v5 work package (docs/QA.md "v5").
// Serve the repo's parent folder so the site lives under /oracle-protocol/ like GitHub Pages:
//   python3 -m http.server 8765 --bind 127.0.0.1
//   COLOR_SCHEME=dark|light QA_DIR=/tmp/v5 CHROME=/path/to/chrome node v5.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const { PNG } = require('pngjs');
const crypto = require('node:crypto');
const Art = require(new URL('../art/oracle-art.js', import.meta.url).pathname);
const Lay = require(new URL('../art/layers.js', import.meta.url).pathname);
const Fp = require(new URL('../art/fingerprint.js', import.meta.url).pathname);
const FX = require(new URL('./fixtures/devices.cjs', import.meta.url).pathname);
const FIXED = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4';
const readPng = (file) => { const buf = fs.readFileSync(file), png = PNG.sync.read(buf), texts = {}; let o = 8;
  while (o < buf.length) { const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8); if (type === 'tEXt') { const d = buf.subarray(o + 8, o + 8 + len); const z = d.indexOf(0); texts[d.toString('latin1', 0, z)] = d.toString('latin1', z + 1); } o += 12 + len; }
  return { w: png.width, h: png.height, texts, sha256: crypto.createHash('sha256').update(buf).digest('hex') }; };
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const QA = process.env.QA_DIR || '/tmp/oracle-v5-qa';
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
const SCREENS = (process.env.SCREENS || 'approach:,offer:#offer,extraction:#extraction,device:#device,machine:#machine,loop:#loop,reveal:#reveal,revelation:#revelation,extras:#extras,sensors:#sensors,identity:#protocol').split(',').map(s => s.split(':'));
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
  const steps = [['offer', 1, 'approach'], ['extraction', 2, 'offer'], ['device', 3, 'extraction'], ['machine', 4, 'device'], ['loop', 5, 'machine']];
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
  check(`${view}: WP3 every step screen has Back, "n of 6" progress (v5), the artwork in view and one primary action`, !bad.length, bad);
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

// ── WP6: Feed ────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); instrument(page, 'wp6');
  const groups = () => page.evaluate(() => { const p = OracleArt.normalize(OracleChapters.artParams()), sc = OracleLayers.compose(p, 0.8);
    return Object.fromEntries(OracleLayers.GROUPS.map(g => [g, OracleArt.sceneHash({ layers: [{ items: OracleLayers.group(sc, g) }] })])); });
  await page.goto(BASE + '#loop'); await page.reload(); await settle(page, 300);
  const w = await page.evaluate(() => (document.getElementById('app').innerText.match(/[A-Za-z0-9'’]+/g) || []).length);
  check('WP6 Feed: ≤60 words on screen', w <= 60, w);
  const g0 = await groups();
  await page.click('label.radio-card:has([value=engaging])'); await settle(page, 200);
  const r0 = await page.textContent('#feed-result'); const g1 = await groups();
  const ch = Object.keys(g0).filter(k => g0[k] !== g1[k]);
  check('WP6 picking a feed changes only the flow lines and core echoes', ch.length && ch.every(k => k === 'flow' || k === 'core'), ch);
  await page.click('#feed-run'); await settle(page, 300);
  const r4 = await page.textContent('#feed-result');
  check('WP6 Most engaging: top 3 get 69% → 92% after "Let it run" (4 rounds, handover values)', /69%/.test(r0) && /After 4 rounds/.test(r4) && /92%/.test(r4), { r0, r4 });
  const lab = await page.evaluate(() => !!document.querySelector('.feed-result .prov-simulated'));
  check('WP6 the result is labelled SIMULATED', lab);
  await page.click('#feed-tune'); await settle(page, 300);
  await page.$eval('#tune-e', (el) => { el.value = 10; el.dispatchEvent(new Event('input', { bubbles: true })); }); await settle(page, 150);
  const t = await page.evaluate(() => ({ open: document.getElementById('sheet').open, n: document.querySelectorAll('#sheet [data-tune]').length, out: document.getElementById('tune-e-out').textContent, e: state.v2.lab.e }));
  await page.keyboard.press('Escape'); await settle(page, 200);
  const radios = await page.evaluate(() => [...document.querySelectorAll('[name=feed]')].filter(r => r.checked).length);
  check('WP6 Tune opens six labelled sliders in the sheet; moving one leaves the presets (custom mix)', t.open && t.n === 6 && t.out === '10' && t.e === 10 && radios === 0, { ...t, radios });
  await ctx.close();
}

// ── WP7: Reveal + Artwork ────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', acceptDownloads: true, hasTouch: true });
  const page = await ctx.newPage(); instrument(page, 'wp7');
  await page.goto(BASE); await page.reload(); await settle(page, 300);
  // shortest path (v5): Begin → Next → Next → Skip device → Skip cards → See your artwork → Skip/Next = 7 taps
  let taps = 0; const tap = async (sel) => { await page.click(sel); taps++; await settle(page, 250); };
  await tap('#btn-begin'); await page.tap('label[for=offer-0]'); await page.tap('label[for=offer-5]');
  await tap('[data-goto=extraction]'); await tap('[data-goto=device]'); await tap('#dev-skip'); await tap('#card-skip');
  await page.click('label.radio-card:has([value=foryou])'); await settle(page, 150);
  await tap('[data-goto=reveal]');
  const cards = [];
  for (let i = 0; i < 5; i++) {
    cards.push(await page.evaluate(() => ({ t: document.getElementById('card-title').textContent, w: (document.getElementById('card-title').textContent.match(/[A-Za-z0-9'’]+/g) || []).length })));
    if (i < 4) { await page.click('#card-next'); await settle(page, 150); }
  }
  check('WP7 Reveal: five cards, ≤12 words each, naming what the answers drew', cards.length === 5 && cards.every(c => c.w <= 12) && /2 red shards/.test(cards[0].t) && /For you/.test(cards[3].t), cards);
  await page.click('#card-next'); await settle(page, 900);
  check('WP7 shortest path from Start to the artwork is ≤7 taps (v5: Begin, Next, Next, Skip device, Skip, See your artwork, Skip/Next)', taps + 1 <= 7, taps + 1);
  const art = await page.evaluate(() => ({ stage: state.stage, hash: location.hash, w: (document.getElementById('app').innerText.match(/[A-Za-z0-9'’]+/g) || []).length, primaries: document.querySelectorAll('#app .btn-primary').length,
    canvas: (() => { const r = document.getElementById('art-canvas').getBoundingClientRect(); return r.width > 250 && r.bottom <= innerHeight; })() }));
  check('WP7 Artwork: link carries v=3 (v5 engine, choices only), ≤25 words, one primary action, the artwork fully in view', art.stage === 'revelation' && /&v=3(&|$)/.test(art.hash) && !/dg=|db=/.test(art.hash) && art.w <= 25 && art.primaries === 1 && art.canvas, art);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#rv-download')]);
  const f = QA + '/wp7-' + dl.suggestedFilename(); await dl.saveAs(f); const png = readPng(f);
  const p1 = await page.evaluate(() => OracleArt.normalize(OracleChapters.artParams()));
  check('WP7 Save image: 1080×1350 PNG whose metadata holds only the seed, answers and v=3 (choices only)', png.w === 1080 && png.h === 1350 && png.texts.Comment.startsWith('oracle:s=' + p1.s) && /&v=3;id=/.test(png.texts.Comment) && !/lat|lng|ua=|gpu/i.test(png.texts.Comment), png.texts);
  const id1 = await page.evaluate(() => OracleFingerprint.compositionId(OracleArt.normalize(OracleChapters.artParams())));
  check('WP7 cross-engine: Node engine-3 compositionId (ring withheld) === browser', Fp.compositionId(p1) === id1, { node: Fp.compositionId(p1), id1 });
  const hasShare = await page.evaluate(() => typeof navigator.share === 'function');
  const [sdl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.click('#rv-share')]); await settle(page, 300);
  check('WP7 Share without Web Share: image downloaded + caption copy attempted', !hasShare && !!sdl && /downloaded/.test(await page.textContent('#rv-status')), await page.textContent('#rv-status'));
  await page.evaluate(() => { window.__shared = null; navigator.canShare = () => true; navigator.share = async (d) => { window.__shared = { files: d.files.map(f => [f.name, f.type]), text: d.text }; }; });
  await page.click('#rv-share'); await page.waitForFunction(() => window.__shared, null, { timeout: 10000 }).catch(() => {});
  const shared = await page.evaluate(() => window.__shared);
  check('WP7 Share native path (stubbed) receives the PNG and a caption without personal data', shared && shared.files[0][1] === 'image/png' && shared.text.includes(p1.s) && /no personal data/.test(shared.text), shared);
  await page.click('#rv-options'); await settle(page, 300);
  const opt = await page.evaluate(() => ({ open: document.getElementById('sheet').open, fmts: document.querySelectorAll('#sheet [name=rv-fmt]').length, made: document.querySelectorAll('#sheet .made-from li').length, seed: document.getElementById('seed-line').textContent }));
  check('WP7 Options open in the sheet: 4 formats, title, link, caption, seed, what it was made from', opt.open && opt.fmts === 4 && opt.made === 5 && opt.seed.includes(p1.s), opt);
  await page.click('label.radio-card:has([value=story])'); await settle(page, 600);
  const story = await page.evaluate(() => ({ fmt: state.v2.format, open: document.getElementById('sheet').open, hash: location.hash }));
  check('WP7 changing the format keeps the sheet open and updates the link', story.fmt === 'story' && story.open && /fmt=story/.test(story.hash), story);
  await page.click('#rv-new'); await settle(page, 500);
  const seed2 = await page.evaluate(() => state.v2.seed);
  await page.fill('#rv-restore', p1.s); await page.click('#rv-restore-btn'); await settle(page, 500);
  const back = await page.evaluate(() => ({ s: state.v2.seed, id: OracleFingerprint.compositionId(OracleArt.normalize(OracleChapters.artParams())) }));
  check('WP7 new seed differs; opening the old seed restores the same composition', seed2 !== p1.s && back.s === p1.s && back.id === id1, { seed2, back });
  const hist = await page.evaluate(() => JSON.parse(localStorage.getItem('oracle.v2.history') || '[]'));
  check('WP7 history stays in this browser and holds parameters only', hist.length >= 2 && hist.every(h => Object.keys(h).join() === 'enc,s,id'), hist.slice(0, 2));
  await page.click('#rv-options'); await settle(page, 300); await page.click('#rv-clean'); await settle(page, 600);
  check('WP7 clean view shows only the artwork', await page.evaluate(() => !!document.getElementById('art-clean') && state.stage === 'art'));
  await page.click('#ac-back'); await settle(page, 600);
  // an old link (no v=2) skips Reveal and renders on the legacy engine
  await page.goto(BASE + '#revelation?' + FIXED); await page.reload(); await settle(page, 600);
  const old = await page.evaluate(() => ({ e: state.v2.engine, id: OracleEngine.get(state.v2.engine).compositionId(OracleArt.normalize(OracleChapters.artParams())), hash: location.hash }));
  check('WP7 an old link stays on the legacy engine (same composition id as before v4) and keeps no v=2', old.e === 1 && old.id === Art.compositionId(Art.decode(FIXED)) && !/v=2/.test(old.hash), old);
  await page.goto(BASE + '#reveal'); await page.reload(); await settle(page, 300);
  await page.click('#card-skip'); await settle(page, 400);
  check('WP7 Reveal Skip goes straight to the artwork', await page.evaluate(() => state.stage) === 'revelation');
  await page.click('#rv-restart'); await settle(page, 300);
  check('WP7 Start over returns to Start with nothing chosen', await page.evaluate(() => state.stage === 'approach' && state.v2.offers === 0 && state.v2.seed === null));
  await ctx.close();
}

// ── WP8: visual + type ───────────────────────────────────────────────────
for (const [view, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 860 }]]) {
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); instrument(page, 'wp8-' + view);
  const res = {};
  for (const [name, hash] of SCREENS) {
    await page.goto(BASE + hash); await page.reload(); await settle(page, 400);
    res[name] = await page.evaluate(() => {
      const sizes = new Set();
      document.querySelectorAll('#app *').forEach(el => { if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || !el.getClientRects().length || el.closest('.vh,.legend-vh')) return;
        const cs = getComputedStyle(el); if (cs.position === 'absolute' && cs.clip !== 'auto') return; sizes.add(Math.round(parseFloat(cs.fontSize))); });
      const deco = ['cosmos', 'scanlines', 'noise', 'vignette'].filter(c => { const el = document.getElementById(c) || document.querySelector('.' + c); return el && getComputedStyle(el).display !== 'none'; });
      return { sizes: [...sizes].sort((a, b) => a - b), deco };
    });
  }
  const bad = Object.entries(res).filter(([, r]) => r.sizes.length > 4 || r.sizes[0] < 13 || r.deco.length);
  check(`${view}: WP8 ≤4 text sizes per screen, none under 13 px, no starfield/scanline/noise/vignette layers`, !bad.length, bad.length ? bad : Object.fromEntries(Object.entries(res).map(([k, r]) => [k, r.sizes.join('/')])));
  await ctx.close();
}

// ── WP9: Extras, sensor demo, Sources; simulator gone ────────────────────
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); instrument(page, 'wp9-denied');
  await page.goto(BASE + '#revelation'); await page.reload(); await settle(page, 600);
  await page.click('#app [data-goto=extras]'); await settle(page, 300);
  check('WP9 Extras is reached from the artwork (after it, optional)', await page.evaluate(() => state.stage) === 'extras');
  await page.click('#ex-sensors'); await settle(page, 400);
  const d = await page.evaluate(() => ({ stage: state.stage, hash: location.hash, rows: document.querySelectorAll('.perm-row').length, badges: [...document.querySelectorAll('.perm-badge')].map(b => b.textContent),
    emoji: /\p{Extended_Pictographic}/u.test(document.getElementById('app').innerText),
    small: Math.min(...[...document.querySelectorAll('#app *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && el.getClientRects().length).map(el => parseFloat(getComputedStyle(el).fontSize))) }));
  check('WP9 sensor demo: 11 rows, all TAP before asking, no emoji, no text under 12 px', d.stage === 'permissions' && d.hash === '#sensors' && d.rows === 11 && d.badges.every(b => b === 'TAP') && !d.emoji && d.small >= 12, d);
  await page.click('[data-perm=geo]'); await settle(page, 1500);
  const geo = await page.$eval('[data-perm=geo] .perm-badge', b => b.textContent);
  check('WP9 location without permission reads DENIED (refused), never LIVE', geo === 'DENIED', geo);
  await page.click('[data-perm=gpu]'); await settle(page, 600);
  const gpu = await page.$eval('[data-perm=gpu] .perm-badge', b => b.textContent);
  check('WP9 a passive read shows OK (LIVE is reserved for real sensor events)', gpu === 'OK' || gpu === 'UNAVAILABLE', gpu);
  await page.click('#btn-portrait'); await settle(page, 400);
  check('WP9 portrait opens and leads back to Extras', await page.evaluate(() => state.stage === 'portrait' && !!document.getElementById('btn-continue-machine')));
  await page.click('#btn-continue-machine'); await settle(page, 300);
  await page.click('#ex-sources'); await settle(page, 300);
  const src = await page.evaluate(() => ({ n: document.querySelectorAll('#sheet .source-list li').length, total: OracleEvidence.SOURCES.length, legend: document.querySelectorAll('#sheet .legend .prov').length }));
  check('WP9 Sources open in the sheet: every source plus the four label meanings', src.n === src.total && src.legend === 4, src);
  await page.click('#open-who'); await settle(page, 200);
  check('WP9 Who is in this loop opens from Sources, with Back', await page.evaluate(() => !!document.querySelector('#sheet .rel-table') && !document.querySelector('[data-sheet-back]').hidden));
  await page.keyboard.press('Escape');
  await page.goto(BASE + '?simulator=1#offer'); await page.reload(); await settle(page, 300);
  check('WP9 the hidden Exchange simulator is gone (?simulator=1 shows no sliders)', await page.evaluate(() => !document.querySelector('input[type=range]') && !document.getElementById('exsim-title')));
  check('WP9 no legacy chapter scripts are loaded', await page.evaluate(() => ![...document.scripts].some(s => /chapters\//.test(s.src))));
  await ctx.close();
  const ctx2 = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 }, permissions: ['geolocation'], geolocation: { latitude: 40.18, longitude: 44.51 } });
  const p2 = await ctx2.newPage(); instrument(p2, 'wp9-granted');
  await p2.goto(BASE + '#sensors'); await p2.reload(); await settle(p2, 300);
  await p2.click('[data-perm=geo]'); await settle(p2, 1500);
  const g2 = await p2.evaluate(() => ({ b: document.querySelector('[data-perm=geo] .perm-badge').textContent, v: (document.getElementById('pval-geo') || {}).textContent, stored: JSON.stringify(localStorage).includes('40.18') }));
  check('WP9 granted location reads OK, is shown only on the page and is never stored', g2.b === 'OK' && /40\.18/.test(g2.v || '') && !g2.stored, g2);
  await ctx2.close();
}

// ── WP10: checks ported from the retired qa.mjs (see docs/QA.md "qa.mjs → v4.mjs") ──────────────
{
  const other = SCHEME === 'dark' ? 'light' : 'dark';
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 1280, height: 860 }, acceptDownloads: true });
  const page = await ctx.newPage(); instrument(page, 'wp10');
  // keyboard
  await page.goto(BASE); await page.reload(); await settle(page, 500);
  let tabs = 0; while (tabs++ < 12 && !(await page.evaluate(() => document.activeElement?.id === 'btn-begin'))) await page.keyboard.press('Tab');
  await page.keyboard.press('Enter'); await settle(page);
  check('WP10 keyboard: Tab + Enter on Begin opens step 1', await page.evaluate(() => state.stage === 'offer' && location.hash === '#offer'));
  // theme (the switch lives in the footer on Start, Artwork and Extras)
  const th = () => page.evaluate(() => ({ t: document.documentElement.dataset.theme, pref: document.documentElement.dataset.themePref, ls: localStorage.getItem('oracle.theme'), sel: document.getElementById('theme-select')?.value, pal: document.documentElement.dataset.palette, type: document.documentElement.dataset.type }));
  await page.goto(BASE); await settle(page, 400);
  let t = await th();
  check(`WP10 theme: auto follows the device scheme (${SCHEME}); default look observatory + instrument`, t.t === SCHEME && t.pref === 'auto' && t.sel === 'auto' && t.ls === null && t.pal === 'observatory' && t.type === 'instrument', t);
  const name = await page.$eval('#theme-select', el => ({ label: el.labels[0]?.textContent, opts: [...el.options].map(o => o.textContent) }));
  check('WP10 theme: switch is a labelled native <select> with 3 options', name.label === 'Colour theme' && name.opts.length === 3, name);
  await page.emulateMedia({ colorScheme: other }); await settle(page, 200);
  t = await th(); check('WP10 theme: auto reacts live when the device scheme changes', t.t === other, t);
  await page.emulateMedia({ colorScheme: SCHEME }); await settle(page, 200);
  await page.selectOption('#theme-select', other); await settle(page, 200);
  t = await th(); const stored = t.t === other && t.ls === other;
  await page.reload(); await settle(page, 400);
  const t2 = await th(); check('WP10 theme: manual choice applies, is stored locally and survives a reload', stored && t2.t === other && t2.sel === other, { t, t2 });
  await page.focus('#theme-select'); await page.keyboard.press('ArrowUp'); await settle(page, 200);
  t = await th(); check('WP10 theme: keyboard can change the switch', t.sel !== other, t);
  await page.selectOption('#theme-select', 'auto'); await settle(page, 200);
  t = await th(); check('WP10 theme: back to auto clears storage and follows the device', t.t === SCHEME && t.ls === null, t);
  await page.goto(BASE + '?palette=nope&type=nope'); await settle(page, 300);
  t = await th(); check('WP10 theme: unknown ?palette/?type fall back to defaults', t.pal === 'observatory' && t.type === 'instrument', t);
  await page.goto(BASE + '#revelation?' + FIXED + '&fmt=portrait'); await page.reload(); await settle(page, 900);
  const px = () => page.evaluate(() => ({ id: OracleEngine.get(state.v2.engine).compositionId(OracleArt.normalize(OracleChapters.artParams())), px: [...document.getElementById('art-canvas').getContext('2d').getImageData(4, 4, 1, 1).data].slice(0, 3).join(), look: OracleExport.lookNow() }));
  const b4 = await px(); await page.selectOption('#theme-select', other); await settle(page, 900); const af = await px();
  check('WP10 theme: switching repaints the artwork, composition id unchanged', b4.id === af.id && b4.px !== af.px && af.look.th === other, { b4, af });
  await page.evaluate(() => localStorage.clear()); await page.goto(BASE + '#art?' + FIXED + '&fmt=portrait'); await page.reload(); await settle(page, 900);
  const legacy = await page.evaluate(() => ({ look: OracleExport.lookNow(), engine: state.v2.engine, stage: state.stage }));
  check('WP10 an old shared link without look params keeps the legacy look (observatory · night · signal) and the legacy engine', legacy.look.pal === 'observatory' && legacy.look.th === 'dark' && legacy.look.ty === 'signal' && legacy.engine !== 2, legacy);
  await page.evaluate(() => localStorage.clear());
  // reduced motion: artwork drawn immediately
  await ctx.close();
  const rc = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce', acceptDownloads: true });
  const rp = await rc.newPage(); instrument(rp, 'wp10-reduced');
  await rp.goto(BASE); await rp.click('#btn-begin'); await rp.click('label[for=offer-0]'); await rp.click('[data-goto=extraction]'); await rp.click('[data-goto=device]'); await rp.click('#dev-skip');
  await rp.click('#card-skip'); await rp.click('.v4s .btn-primary[data-goto]'); await settle(rp, 200); await rp.click('#card-skip'); await settle(rp, 250);
  const drawn = await rp.$eval('#art-canvas', c => { const L = OracleExport.lookNow(), bg = OracleArt.PALETTES[L.pal + '-' + L.th].bg, v = parseInt(bg.slice(1), 16), B = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 0; i < d.length; i += 4 * 97) if (Math.abs(d[i] - B[0]) + Math.abs(d[i + 1] - B[1]) + Math.abs(d[i + 2] - B[2]) > 60) lit++; return lit; });
  check('WP10 reduced motion: the artwork is drawn immediately (no draw-in)', drawn > 50, { lit: drawn });
  // every export format
  const link = await rp.evaluate(() => location.hash), dims = {};
  for (const fmt of ['portrait', 'story', 'square', 'hires']) {
    await rp.click('#rv-options'); await settle(rp, 250); await rp.click(`#sheet input[name=rv-fmt][value=${fmt}]`); await settle(rp, 250);
    await rp.keyboard.press('Escape'); await settle(rp, 250);
    const [dl] = await Promise.all([rp.waitForEvent('download'), rp.click('#rv-download')]);
    const f = `${QA}/wp10-${fmt}.png`; await dl.saveAs(f); const png = readPng(f); dims[fmt] = `${png.w}x${png.h}`;
  }
  check('WP10 export sizes: portrait 1080×1350, story 1080×1920, square 1080×1080, hi-res 2160×2700', dims.portrait === '1080x1350' && dims.story === '1080x1920' && dims.square === '1080x1080' && dims.hires === '2160x2700', dims);
  const id1 = await rp.evaluate(() => OracleEngine.get(state.v2.engine).compositionId(OracleArt.normalize(OracleChapters.artParams())));
  await rc.close();
  // a shared v=2 link restores the same composition in a fresh browser
  const fc = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 } });
  const fp = await fc.newPage(); instrument(fp, 'wp10-fresh');
  await fp.goto(BASE + link); await settle(fp, 700);
  const id2 = await fp.evaluate(() => OracleEngine.get(state.v2.engine).compositionId(OracleArt.normalize(OracleChapters.artParams())));
  check('WP10 a shared v=3 link restores the same composition id in a fresh browser', /&v=3(&|$)/.test(link) && id1 === id2, { link, id1, id2 });
  // no horizontal overflow at 390 on any screen
  const over = {};
  for (const [nm, h] of SCREENS) { await fp.goto(BASE + h); await fp.reload(); await settle(fp, 350); const o = await fp.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 0) over[nm] = o; }
  check('WP10 mobile: no horizontal overflow on any screen', !Object.keys(over).length, over);
  // preview redraw cost at maximum density
  const perf = await fp.evaluate(() => { const c = document.createElement('canvas'); c.width = 216; c.height = 270; const ctx = c.getContext('2d');
    const p = OracleArt.normalize({ s: 'ORACLE-PERF-TEST', o: 63, f: 255, d: 100, c: 100, p: 100, y: 100, x: 100, i: 100, e: 100, r: 100, t: 100, k: 100, a: 100, n: 12, v: 2 });
    const ts = []; for (let i = 0; i < 15; i++) { const t0 = performance.now(); OracleArt.render(ctx, OracleLayers.compose(p, 1), c.width, c.height, OracleExport.renderOpts(OracleExport.lookNow())); ts.push(performance.now() - t0); }
    ts.sort((a, b) => a - b); return +ts[7].toFixed(1); });
  check('WP10 preview redraw at maximum density (216×270, layered engine): median under 50 ms (desktop CPU, not a phone)', perf < 50, perf);
  await fc.close();
  // sensor demo: identity step, sensors this device lacks, keyboard rows, settling
  const sc = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 1280, height: 860 } });
  const sp = await sc.newPage(); instrument(sp, 'wp10-demo');
  await sp.goto(BASE + '#protocol'); await sp.reload(); await settle(sp, 400);
  const deep = await sp.isVisible('#btn-crypto');
  await sp.click('#btn-crypto'); await settle(sp, 500);
  check('WP10 #protocol opens the optional identity step; an anonymous ID links without a wallet', deep && /Linked/.test(await sp.textContent('.auth-card')));
  await sp.goto(BASE + '#sensors'); await settle(sp, 400);
  for (const id of ['orient', 'shake']) { await sp.click(`[data-perm="${id}"]`); await settle(sp, 1600); }
  const bd = await sp.$$eval('.perm-item', els => els.map(e => [e.dataset.perm, e.querySelector('.perm-badge').textContent]));
  check('WP10 sensors this device lacks read UNAVAILABLE, never LIVE (orientation, shake)', ['orient', 'shake'].every(id => bd.find(b => b[0] === id)?.[1] === 'UNAVAILABLE') && !bd.some(b => b[1] === 'LIVE'), bd);
  await sp.focus('[data-perm="gpu"]'); await sp.keyboard.press('Enter'); await settle(sp, 500);
  check('WP10 sensor rows are native buttons that work with Enter', await sp.$eval('[data-perm="gpu"]', e => e.tagName === 'BUTTON' && e.tabIndex === 0 && /OK/.test(e.textContent)));
  await settle(sp, 3000);
  const inf = await sp.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => a.animationName));
  check('WP10 after reading sensors every animation settles; re-render does not replay earlier rows', !inf.length && await sp.evaluate(() => !document.querySelector('[data-perm="orient"]').closest('.just')), inf);
  await sc.close();
}

// ── v5 WP1: core/device.js loaded, consent-gated; dead getGeo gone; mic level labelled correctly ──
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(FX.install, FX.PROFILES.pixel);
  const page = await ctx.newPage(); instrument(page, 'v5-wp1');
  await page.goto(BASE + '#offer'); await page.reload(); await settle(page, 300);
  const g = await page.evaluate(async () => { let refused = false; try { await OracleDevice.readPassive(); } catch (e) { refused = /Show me/.test(e.message); }
    return { loaded: typeof OracleDevice === 'object', refused, getGeo: typeof getGeo, snap: OracleDevice.snapshot() }; });
  check('v5 WP1 core/device.js is loaded and refuses passive reads before Show me; nothing read at load', g.loaded && g.refused && g.getGeo === 'undefined' && g.snap.passive === null, g);
  await page.goto(BASE + '#sensors'); await settle(page, 300);
  await page.click('[data-perm=mic]'); await settle(page, 2600);
  const mic = await page.evaluate(() => ({ b: document.querySelector('[data-perm=mic] .perm-badge').textContent, v: (document.getElementById('pval-mic') || {}).textContent || '', stopped: window.__micStopped || 0 }));
  check('v5 WP1 microphone level reads in dBFS with a quiet/room/loud bucket (no "hz avg"); the track is stopped', mic.b === 'OK' && /^-?\d+ dBFS \((quiet|room|loud)\)$/.test(mic.v) && !/hz/i.test(mic.v) && mic.stopped >= 1, mic);
  await ctx.close();
}

// ── v5 WP2: core/privacy.js in the browser — buckets, digest, share modes, Forget everything ──
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', timezoneId: 'Asia/Kathmandu' });
  await ctx.addInitScript(FX.install, FX.PROFILES.pixel);
  const page = await ctx.newPage(); instrument(page, 'v5-wp2');
  await page.goto(BASE + '#offer'); await page.reload(); await settle(page, 300);
  const r = await page.evaluate(async () => {
    localStorage.setItem('oracle.theme', 'dark'); localStorage.setItem('unrelated', '1');
    OracleDevice.allowPassive(); await OracleDevice.readPassive(); const S = OracleDevice.snapshot();
    const pat = await OraclePrivacy.pattern('ORACLE-7K3F-Q9ZD', S), choices = OraclePrivacy.linkPart(pat);
    OraclePrivacy.setShare('pattern'); const withPat = OraclePrivacy.linkPart(pat);
    const fixed = await OraclePrivacy.digest(new Uint8Array(16).fill(7), OraclePrivacy.canonical(S));
    const canon = OraclePrivacy.canonical(S), raw = OraclePrivacy.rawStrings(S);
    OraclePrivacy.forgetEverything();
    return { choices, withPat, fixed, canon, raw, keys: Object.keys(localStorage), after: OracleDevice.snapshot(), share: OraclePrivacy.share() };
  });
  const expect = crypto.createHash('sha256').update(Buffer.concat([Buffer.alloc(16, 7), Buffer.from(r.canon)])).digest('hex').slice(0, 8);
  check('v5 WP2 browser digest (WebCrypto) equals node:crypto for the same salt and canonical text', r.fixed === expect, { browser: r.fixed, node: expect });
  const sent = FX.SENTINELS().filter(x => (r.choices + r.withPat).includes(x));
  check('v5 WP2 default link part is empty (Choices only); the opt-in adds only &dg=8hex&db=3 chars, no sentinel or raw string', r.choices === '' && /^&dg=[0-9a-f]{8}&db=[A-Z0-9]{3}$/.test(r.withPat) && !sent.length && !r.raw.some(x => r.withPat.includes(x)), { r: { choices: r.choices, withPat: r.withPat }, sent });
  check('v5 WP2 Forget everything clears readings and every oracle.* key, keeps other sites\' keys', r.keys.join() === 'unrelated' && r.after.passive === null && r.share === 'choices', { keys: r.keys, after: r.after });
  await ctx.close();
}

// ── v5 WP3: engine 3 (v=3) — fingerprint ring from a link's pattern; v4 layers untouched; exports carry only dg + db ──
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); instrument(page, 'v5-wp3');
  const textsOf = async () => { const b64 = await page.evaluate(async () => { const p = OracleArt.normalize(OracleChapters.artParams()); const { blob } = await OracleExport.exportBlob(p, 'portrait');
    const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); });
    const f = QA + '/v5-wp3.png'; fs.writeFileSync(f, Buffer.from(b64, 'base64')); return readPng(f).texts; };
  await page.goto(BASE + '#art?' + FIXED + '&v=3&dg=1a2b3c4d&db=N2M&fmt=portrait'); await settle(page, 700);
  const a = await page.evaluate(() => ({ engine: state.v2.engine, ctx: OracleFingerprint.context(), ring: OracleEngine.get(3).compose(OracleArt.normalize(OracleChapters.artParams()), 0.8).ring }));
  const t = await textsOf();
  check('v5 WP3 a v=3 link with a pattern opens on engine 3 and draws 5 ridge loops turned 120° (db=N2M)', a.engine === 3 && a.ctx.mode === 'pattern' && a.ring.loops === 5 && a.ring.turn === 120, a);
  check('v5 WP3 its PNG metadata carries the link\'s pattern (&v=3&dg=1a2b3c4d&db=N2M) and nothing else device-related', /&v=3&dg=1a2b3c4d&db=N2M;id=C-/.test(t.Comment) && /fingerprint ring v1/.test(t.Software) && !/lat|lng|ua=|gpu=/i.test(t.Comment), t);
  await page.goto(BASE + '#art?' + FIXED + '&v=3&dg=ZZZZ&db=N2M&fmt=portrait'); await page.reload(); await settle(page, 700);
  const w = await page.evaluate(() => OracleFingerprint.context()), t2 = await textsOf();
  check('v5 WP3 a malformed pattern falls back to the withheld ring and is not re-exported', w.mode === 'none' && /&v=3;id=/.test(t2.Comment) && !/dg=/.test(t2.Comment), { w, c: t2.Comment });
  await page.goto(BASE + '#revelation?' + FIXED + '&v=2'); await page.reload(); await settle(page, 700);
  const t3 = await textsOf();
  check('v5 WP3 a v=2 link stays on engine 2 (v4 metadata, no ring)', /&v=2;id=/.test(t3.Comment) && /layered engine v2$/.test(t3.Software), t3);
  await ctx.close();
}

// ── v5 WP4: Step 3 Device — 3a ask (Show me / Skip), 3b readout (6 grouped rows, ⓘ sheet), Back within, Forget ──
for (const prof of ['pixel', 'missing', 'brave']) {
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(FX.install, FX.PROFILES[prof]);
  const page = await ctx.newPage(); instrument(page, 'v5-wp4-' + prof);
  const copyWords = () => page.evaluate(() => { let n = 0; const w = document.createTreeWalker(document.getElementById('app'), NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const el = w.currentNode.parentElement; if (el.getClientRects().length && !el.closest('.vh,[hidden],.dev-list,figcaption')) n += (w.currentNode.textContent.match(/[A-Za-z0-9'’]+/g) || []).length; } return n; });
  await page.goto(BASE + '#device'); await page.reload(); await settle(page, 500);
  const ask = await page.evaluate(() => ({ stage: state.stage, now: +document.querySelector('.progress').getAttribute('aria-valuenow'), total: +document.querySelector('.progress').getAttribute('aria-valuemax'),
    show: !!document.getElementById('dev-show'), skip: !!document.getElementById('dev-skip'), read: OracleDevice.snapshot().passive, ring: OracleFingerprint.context().mode }));
  const askW = await copyWords();
  if (prof === 'pixel') {
    check('v5 WP4 3a: step 3 of 6, Show me + Skip, ≤60 words, nothing read yet, ring withheld', ask.stage === 'device' && ask.now === 3 && ask.total === 6 && ask.show && ask.skip && ask.read === null && ask.ring === 'none' && askW <= 60, { ask, askW });
    const a1 = await axe(page, 'v5-device-ask'); check('v5 WP4 3a axe 0', !a1.length, a1);
    await page.click('#dev-skip'); await settle(page, 400);
    check('v5 WP4 Skip goes straight to Loop in one tap; nothing read; ring stays withheld', await page.evaluate(() => state.stage === 'machine' && OracleDevice.snapshot().passive === null && OracleFingerprint.context().mode === 'none'));
    await page.click('[data-back]'); await settle(page, 400);
  }
  await page.click('#dev-show'); await page.waitForSelector('#dev-next', { timeout: 8000 }); await settle(page, 300);
  const ro = await page.evaluate(() => ({ rows: [...document.querySelectorAll('dl.dev-list .dev-row')].map(r => [r.querySelector('dt').textContent, r.querySelector('dd span').textContent]),
    infos: document.querySelectorAll('[data-dev-info]').length, count: (document.getElementById('dev-count') || {}).textContent, ring: OracleFingerprint.context(), cap: document.getElementById('pv-cap').textContent,
    focus: document.activeElement && document.activeElement.tagName }));
  const roW = await copyWords();
  if (prof === 'pixel') {
    check('v5 WP4 3b: six grouped rows in a <dl>, each with ⓘ; ≤60 words of copy; ring drawn from this device in the tab', ro.rows.length === 6 && ro.infos === 6 && roW <= 60 && ro.ring.mode === 'full' && /^[0-9a-f]{8}$/.test(ro.ring.dg) && /ridge loops/.test(ro.cap), { ro, roW });
    await page.click('[data-dev-info=graphics]'); await settle(page, 300);
    const sh = await page.evaluate(() => ({ open: document.getElementById('sheet').open, t: document.getElementById('sheet-body').innerText }));
    check('v5 WP4 ⓘ sheet says what was read, which API, why sites read it and what it draws', sh.open && /WEBGL_debug_renderer_info/.test(sh.t) && /Why sites read it/.test(sh.t) && /In your artwork/.test(sh.t) && /Nothing here is sent/.test(sh.t), sh.t.slice(0, 300));
    const a2 = await axe(page, 'v5-device-sheet'); check('v5 WP4 sheet axe 0', !a2.length, a2);
    await page.keyboard.press('Escape'); await settle(page, 200);
    const a3 = await axe(page, 'v5-device-readout'); check('v5 WP4 3b axe 0', !a3.length, a3);
    await page.click('.btn-back'); await settle(page, 300);
    const bk = await page.evaluate(() => ({ stage: state.stage, ask: !!document.getElementById('dev-show') }));
    check('v5 WP4 Back on 3b returns to 3a (same step)', bk.stage === 'device' && bk.ask, bk);
    await page.click('#dev-show'); await page.waitForSelector('#dev-forget'); await page.evaluate(() => localStorage.setItem('oracle.v2.history', '[]'));
    await page.click('#dev-forget'); await settle(page, 300);
    const fg = await page.evaluate(() => ({ snap: OracleDevice.snapshot(), ring: OracleFingerprint.context().mode, keys: Object.keys(localStorage).filter(k => k.startsWith('oracle.')), ask: !!document.getElementById('dev-show'), status: (document.querySelector('[role=status]') || {}).textContent || '' }));
    check('v5 WP4 Forget everything on the Device step: readings, ring and oracle.* storage gone; says permissions stay in site settings', fg.snap.passive === null && fg.ring === 'none' && !fg.keys.length && fg.ask && /site settings/.test(fg.status), fg);
  }
  if (prof === 'missing') check('v5 WP4 everything missing: rows say "Not shared by this browser", the step still works, ring withheld or partial', ro.rows.length === 6 && ro.rows.filter(r => /Not shared/.test(r[1])).length >= 2 && !!ro.ring, ro.rows);
  if (prof === 'brave') check('v5 WP4 Brave-like: randomised rows say so and stay out of the digest', ro.rows.some(r => /randomised/.test(r[1])) && /Brave/.test(ro.rows[0][1]), ro.rows);
  await ctx.close();
}

// ── v5 WP5: permission cards 3c–3e — tilt (live), rough location, 2 s mic level; Not now asks nothing ──
for (const [prof, rm, mode] of [['pixel', 'no-preference', 'allow'], ['pixel', 'reduce', 'notnow'], ['macff', 'reduce', 'allow'], ['missing', 'reduce', 'allow']]) {
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 }, reducedMotion: rm });
  await ctx.addInitScript(FX.install, FX.PROFILES[prof]);
  const page = await ctx.newPage(); instrument(page, `v5-wp5-${prof}-${mode}`);
  await page.goto(BASE + '#device'); await page.reload(); await settle(page, 400);
  await page.click('#dev-show'); await page.waitForSelector('#dev-next'); await page.click('#dev-next'); await settle(page, 300);
  const res = {};
  for (const c of ['tilt', 'loc', 'mic']) {
    const card = await page.evaluate(() => ({ h: document.querySelector('h1').textContent, allow: !!document.getElementById('perm-allow'), skip: !!document.getElementById('perm-skip') }));
    if (c === 'tilt' && prof === 'pixel' && mode === 'allow') {
      const a = await axe(page, 'v5-device-card'); check('v5 WP5 permission card axe 0', !a.length, a);
      await page.click('.btn-back'); await settle(page, 250);
      check('v5 WP5 Back on the first card returns to the readout', await page.evaluate(() => !!document.getElementById('dev-next')));
      await page.click('#dev-next'); await settle(page, 250);
    }
    if (mode === 'notnow') { await page.click('#perm-skip'); await settle(page, 250); res[c] = card; continue; }
    await page.click('#perm-allow'); await page.waitForSelector('#perm-next', { timeout: 15000 }); await settle(page, 400);
    res[c] = { ...card, r: await page.evaluate(() => document.getElementById('perm-result').textContent), tf: await page.evaluate(() => document.getElementById('pv-canvas').style.transform),
      slider: await page.evaluate(() => !!document.getElementById('tilt-slider')) };
    await page.click('#perm-next'); await settle(page, 300);
  }
  const end = await page.evaluate(() => ({ stage: state.stage, asked: [window.__motionAsked || 0, window.__geoAsked || 0, window.__micAsked || 0], stopped: window.__micStopped || 0,
    snap: OracleDevice.snapshot(), ring: OracleFingerprint.describe(OracleFingerprint.context()), html: document.documentElement.outerHTML }));
  const leak = ['40.18', '44.51', ((res.mic && res.mic.r || '').match(/-?\d+ dBFS/) || ['@@none'])[0]].filter(x => end.html.includes(x));
  if (prof === 'pixel' && mode === 'allow') {
    check('v5 WP5 tilt: Allow asks (orientation + motion permission), the preview follows live (CSS transform); nothing kept', res.tilt.allow && res.tilt.skip && /rotateY/.test(res.tilt.tf) && end.asked[0] >= 1 && end.asked[0] <= 2 && JSON.stringify(end.snap.tilt) === '{"state":"ok"}', { t: res.tilt, s: end.snap.tilt });
    check('v5 WP5 location: shown once rounded to 1 decimal, only band + hemisphere kept', /40\.2° N, 44\.5° E/.test(res.loc.r) && JSON.stringify(end.snap.location) === '{"state":"ok","band":1,"hemi":"N"}', { r: res.loc.r, s: end.snap.location });
    check('v5 WP5 mic: 2 s level (dBFS shown once), only the level kept, stream stopped', /^Level: (quiet|room|loud) \(-?\d+ dBFS over 2 s\)/.test(res.mic.r) && /^\{"state":"ok","level":"(quiet|room|loud)"\}$/.test(JSON.stringify(end.snap.mic)) && end.stopped >= 1, { r: res.mic.r, s: end.snap.mic, stopped: end.stopped });
    check('v5 WP5 after the cards: on Loop, ring adds horizon arc and vibration, no coordinate or dB value left in the page', end.stage === 'machine' && /horizon arc/.test(end.ring) && /vibration/.test(end.ring) && !leak.length, { ring: end.ring, leak });
  }
  if (mode === 'notnow') check('v5 WP5 Not now on every card asks for nothing and reaches Loop', end.stage === 'machine' && end.asked.join() === '0,0,0' && end.snap.location === null && end.snap.mic === null, end.asked);
  if (prof === 'macff') check('v5 WP5 denied / no sensor (macOS Firefox-like): honest messages, no re-prompt, journey continues', /doesn’t offer/.test(res.tilt.r) && /Not allowed/.test(res.loc.r) && /Not allowed/.test(res.mic.r) && end.stage === 'machine' && end.asked[1] === 1 && end.asked[2] === 1, res);
  if (prof === 'missing') check('v5 WP5 APIs absent: every card says the browser doesn’t offer it, nothing throws', ['tilt', 'loc', 'mic'].every(c => /doesn’t offer/.test(res[c].r)) && end.stage === 'machine', res);
  await ctx.close();
}
{ // reduced motion: a slider instead of live motion
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(FX.install, FX.PROFILES.pixel);
  const page = await ctx.newPage(); instrument(page, 'v5-wp5-rm');
  await page.goto(BASE + '#device'); await page.reload(); await settle(page, 400);
  await page.click('#dev-show'); await page.waitForSelector('#dev-next'); await page.click('#dev-next'); await settle(page, 300);
  await page.click('#perm-allow'); await page.waitForSelector('#perm-next', { timeout: 8000 }); await settle(page, 400);
  const before = await page.evaluate(() => document.getElementById('pv-canvas').style.transform);
  await page.fill('#tilt-slider', '20'); await settle(page, 100);
  const after = await page.evaluate(() => document.getElementById('pv-canvas').style.transform);
  check('v5 WP5 reduced motion: tilt does not move the preview by itself; a labelled slider does', before === '' && /rotateY\(6\.7deg\)/.test(after), { before, after });
  await ctx.close();
}

// @@SECTIONS@@

// ── network + console (always last) ──────────────────────────────────────
const ext = R.requests.filter(r => !/^http:\/\/127\.0\.0\.1:8765\//.test(r.url) && !/^(data|blob):/.test(r.url));
check('network: zero requests leave localhost (the CSP probe is blocked before it is sent)', ext.every(r => /example\.com\/x$/.test(r.url)) , ext.slice(0, 5));
check('network: only GET requests', R.requests.every(r => r.method === 'GET'));
const leaky = R.requests.filter(r => /[?&](lat|lng|latitude|longitude|ua|gpu)=|40\.18|51\.50|Mozilla|ORACLE_HASH/i.test(r.url.replace(/^http:\/\/127\.0\.0\.1:8765\/oracle-protocol\/[^?#]*/, '')));
check('network: no request carries location, user agent, GPU or hash values', !leaky.length, leaky.slice(0, 3));
const errs = R.consoleErrors.filter(e => !/Content Security Policy|example\.com|Failed to fetch|net::ERR_/.test(e.text));
check('console: zero app errors', !errs.length, errs.slice(0, 5));
const pass = R.checks.filter(c => c.ok).length;
console.log(`\nv5 QA (${SCHEME}): ${pass}/${R.checks.length} passed`);
fs.writeFileSync(`${QA}/v5-results-${SCHEME}.json`, JSON.stringify(R, null, 1));
await browser.close();
process.exit(pass === R.checks.length ? 0 : 1);

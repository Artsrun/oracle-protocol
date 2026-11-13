// Oracle Protocol v2 — end-to-end QA. Serves must be running at BASE (python -m http.server, /oracle-protocol/ subpath).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Art = require(new URL('../art/oracle-art.js', import.meta.url).pathname);
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = (process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/');
const QA = (process.env.QA_DIR || '/workspace/oracle-qa');
const SCHEME = process.env.COLOR_SCHEME === 'light' ? 'light' : 'dark'; // emulated prefers-color-scheme for every context
const R = { started: new Date().toISOString(), checks: [], requests: [], consoleErrors: [], exports: {}, axe: {} };
const FIXED = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4';
const FAKE_GEO = { latitude: 51.50135, longitude: -0.14189 }; // fake coordinates used only to detect leaks
const check = (name, ok, detail) => { R.checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`); };
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
for (const d of ['shots/desktop', 'shots/mobile', 'shots/reduced', 'shots/denied', 'exports/run1', 'exports/run2', 'exports/mobile', 'exports/fixed']) fs.mkdirSync(`${QA}/${d}`, { recursive: true });

const browser = await chromium.launch({ executablePath: (process.env.CHROME || '/usr/bin/google-chrome'), args: ['--no-sandbox'] });

function instrument(page, tag) {
  page.on('console', m => { if (m.type() === 'error') R.consoleErrors.push({ tag, text: m.text() }); });
  page.on('pageerror', e => R.consoleErrors.push({ tag, text: 'pageerror: ' + e.message }));
  page.on('request', r => R.requests.push({ tag, url: r.url(), method: r.method(), post: r.postData() || null }));
}
const setRange = (page, sel, v) => page.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
const settle = (page, ms = 350) => page.waitForTimeout(ms);
const openMore = (page, id) => page.evaluate(i => { const d = document.getElementById(i); if (d && !d.open) d.open = true; }, id);
async function axe(page, label) {
  await page.evaluate(AXE); // CDP evaluate is not subject to the page CSP (addScriptTag is blocked by script-src 'self' — as intended)
  const res = await page.evaluate(async () => {
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes.slice(0, 2).map(n => n.target.join(' ')) })),
      incomplete: r.incomplete.map(v => ({ id: v.id, nodes: v.nodes.length })), passes: r.passes.length };
  });
  R.axe[label] = res;
  return res;
}
async function exportFmt(page, fmt, dir) {
  await page.click(`[data-fmt="${fmt}"]`); await settle(page, 500);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#rv-download')]);
  const file = `${dir}/${dl.suggestedFilename()}`;
  await dl.saveAs(file);
  const buf = fs.readFileSync(file);
  const png = PNG.sync.read(buf);
  // read tEXt chunks
  const texts = {}; let o = 8;
  while (o < buf.length) { const len = buf.readUInt32BE(o), type = buf.toString('latin1', o + 4, o + 8); if (type === 'tEXt') { const d = buf.subarray(o + 8, o + 8 + len); const z = d.indexOf(0); texts[d.toString('latin1', 0, z)] = d.toString('latin1', z + 1); } o += 12 + len; }
  return { file, bytes: buf.length, w: png.width, h: png.height, sha256: sha(buf), pixelSha256: sha(png.data), texts };
}

// ── 1. v1.2 regression, desktop, permissions DENIED (none granted) ─────────
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const page = await ctx.newPage(); instrument(page, 'regression-denied');
  await page.goto(BASE); await settle(page, 700);
  check('approach: exactly one entry action (BEGIN); v1.2 demo lives in 02', await page.isVisible('#btn-investigate') && (await page.$$('#app button')).length === 1);
  await page.screenshot({ path: `${QA}/shots/denied/00-approach.png` });
  await axe(page, 'approach');
  await page.goto(BASE + '#protocol'); await settle(page, 400); await page.click('#btn-crypto'); await settle(page, 500);
  check('handshake: anonymous ephemeral identity without wallet', (await page.textContent('.auth-card')).includes('LINKED'));
  await page.click('#btn-bio'); await settle(page, 600);
  await page.screenshot({ path: `${QA}/shots/denied/01-handshake.png` });
  await page.click('#btn-next'); await settle(page);
  for (const id of ['geo', 'cam', 'mic', 'gpu', 'cpu', 'net', 'base', 'bt', 'bat', 'orient', 'shake']) { await page.click(`[data-perm="${id}"]`); await settle(page, ['orient', 'shake'].includes(id) ? 1600 : 700); }
  const badges = await page.$$eval('.perm-item', els => els.map(e => [e.dataset.perm, e.querySelector('.perm-badge').textContent]));
  check('harvest: refused sensors show DENIED (geo, mic); camera DENIED or UNAVAILABLE (headless has no camera device)', ['geo', 'mic'].every(id => badges.find(b => b[0] === id)?.[1] === 'DENIED') && ['DENIED', 'UNAVAILABLE'].includes(badges.find(b => b[0] === 'cam')?.[1]), badges);
  check('harvest: no-prompt tiles show OK (gpu, cpu, net, base)', ['gpu', 'cpu', 'net', 'base'].every(id => badges.find(b => b[0] === id)?.[1] === 'OK'));
  check('harvest: sensors this device lacks show UNAVAILABLE, never LIVE (orient, shake)', ['orient', 'shake'].every(id => badges.find(b => b[0] === id)?.[1] === 'UNAVAILABLE') && !badges.some(b => b[1] === 'LIVE'), badges);
  await page.focus('[data-perm="gpu"]'); await page.keyboard.press('Enter'); await settle(page, 400);
  check('harvest: tiles are native buttons, keyboard-activatable (Enter)', await page.$eval('[data-perm="gpu"]', e => e.tagName === 'BUTTON' && e.tabIndex === 0));
  await page.click('.perm-explain summary');
  await axe(page, 'v1.2-harvest');
  await page.screenshot({ path: `${QA}/shots/denied/02-harvest-denied.png`, fullPage: true });
  await page.click('#btn-portrait'); await settle(page);
  const hash = await page.textContent('.identity-hash');
  check('witness: portrait + ORACLE_HASH render', /ORACLE_HASH \/\/ [0-9A-F]{8}/.test(hash), hash);
  check('witness: geo panel shows withheld/denied text', (await page.textContent('.portrait-grid')).includes('Denied'));
  await page.screenshot({ path: `${QA}/shots/denied/03-witness.png`, fullPage: true });
  await axe(page, 'v1.2-witness');
  check('witness: continue-to-machine button present', await page.isVisible('#btn-continue-machine'));
  await page.click('#btn-reset'); await settle(page);
  check('reset returns to approach and clears collected', await page.isVisible('#btn-investigate') && await page.evaluate(() => Object.keys(state.collected).length === 0));
  await ctx.close();
}

// ── 2. v1.2 grant path (geolocation granted with FAKE coords) ──────────────
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 1280, height: 800 }, permissions: ['geolocation'], geolocation: FAKE_GEO });
  const page = await ctx.newPage(); instrument(page, 'regression-granted');
  await page.goto(BASE + '#protocol'); await settle(page, 600);
  check('#protocol deep link opens handshake', await page.isVisible('#btn-crypto'));
  await page.click('#btn-crypto'); await settle(page, 300); await page.click('#btn-next'); await settle(page);
  await page.click('[data-perm="geo"]'); await settle(page, 900);
  const geoTxt = await page.textContent('[data-perm="geo"]');
  check('harvest: granted geolocation shows coordinates locally', geoTxt.includes('51.50135'), geoTxt.trim().replace(/\s+/g, ' '));
  await page.screenshot({ path: `${QA}/shots/denied/04-harvest-geo-granted.png` });
  await settle(page, 3600);
  const infG = await page.evaluate(() => document.getAnimations().filter(an => an.playState === 'running').map(an => an.animationName + ':' + an.effect.getTiming().iterations));
  check('after grant: every animation has settled (no LIVE pulse / glow loop left running)', infG.length === 0, infG);
  await page.click('[data-perm="gpu"]'); await settle(page, 600);
  check('after grant: re-render does not replay the grant animation on earlier tiles', await page.evaluate(() => !document.querySelector('[data-perm="geo"]').classList.contains('just') && document.querySelector('[data-perm="gpu"]').classList.contains('just')));
  // CSP: page cannot make network requests even if code tried
  const csp = await page.evaluate(async () => { try { await fetch('https://example.com/?probe=1'); return 'fetch allowed'; } catch (e) { return 'blocked: ' + e.message; } });
  check('CSP connect-src none blocks outbound fetch', csp.startsWith('blocked'), csp);
  await ctx.close();
}

// ── 3. full five-chapter journey, desktop, zero permissions ───────────────
let seed1, id1, params1;
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const page = await ctx.newPage(); instrument(page, 'journey-desktop');
  await page.goto(BASE); await settle(page, 600);
  await page.keyboard.press('Tab');
  let tabs = 0; while (tabs++ < 8 && !(await page.evaluate(() => document.activeElement?.id === 'btn-investigate'))) await page.keyboard.press('Tab');
  await page.keyboard.press('Enter'); await settle(page);
  check('keyboard: Tab + Enter starts the investigation', await page.evaluate(() => state.stage === 'offer' && location.hash === '#offer'));
  check('offer: exchange simulator hidden by default (no .sim, no sliders)', await page.evaluate(() => !document.querySelector('.sim') && !document.querySelector('#app input[type=range]')));
  check('offer: one vertical checklist of 6 rows with checkboxes', await page.evaluate(() => document.querySelectorAll('#app .rows > .row input[type=checkbox][data-offer]').length === 6 && !document.querySelector('.offer-grid')));
  for (const i of [0, 2, 5]) await page.click(`[data-offer="${i}"]`);
  const offerState = await page.evaluate(() => ({ o: state.v2.offers, ex: state.v2.ex, want: OracleContent.deriveEx(0b100101), tally: document.querySelector('.tally').textContent.replace(/\s+/g, ' ').trim() }));
  check('offer: checkboxes set the offers bitmask; tally shows "3 of 6"', offerState.o === 0b100101 && offerState.tally.startsWith('3 of 6'), offerState.tally);
  check('offer: art dials derived deterministically from ticked trades when simulator hidden', JSON.stringify(offerState.ex) === JSON.stringify(offerState.want) && offerState.ex.d === 56, offerState.ex);
  await page.focus('[data-offer="1"]'); await page.keyboard.press('Space'); await page.keyboard.press('Space');
  check('offer: checkbox keyboard-operable (Space toggles)', await page.evaluate(() => state.v2.offers === 0b100101));
  await page.screenshot({ path: `${QA}/shots/desktop/01-offer.png`, fullPage: true });
  await axe(page, 'offer');
  // sources drawer via a citation
  check('offer: evidence collapsed by default (no visible provenance badges)', await page.locator('#app .prov:visible').count() === 0);
  await page.click('.row:has(#offer-social) .row-exp');
  check('offer: row disclosure reveals labelled evidence (VERIFIED/INFERRED)', await page.locator('#offer-social-more .prov-verified:visible').count() === 1 && await page.locator('#offer-social-more .prov-inferred:visible').count() === 1);
  await page.click('.row:has(#offer-ai) .row-exp');
  check('offer: accordion keeps one row open', await page.evaluate(() => document.getElementById('offer-social-more').hidden && !document.getElementById('offer-ai-more').hidden));
  const cite = page.locator('.cite:visible').first();
  await cite.click(); await settle(page);
  check('sources drawer opens from a citation and highlights the source', await page.isVisible('#sources-drawer') && (await page.$$('.src-hit')).length === 1);
  await page.screenshot({ path: `${QA}/shots/desktop/01b-sources-drawer.png` });
  await page.keyboard.press('Escape'); await settle(page);
  check('drawer: Esc closes and returns focus to the citation', await page.isHidden('#sources-drawer') && await page.evaluate(() => document.activeElement?.classList.contains('cite')));
  await page.click('[data-goto="extraction"]'); await settle(page);
  check('extraction: explainer is a vertical stack (3 rows, one column)', await page.evaluate(() => { const r = [...document.querySelectorAll('.kinds > div')].map(d => d.getBoundingClientRect()); return r.length === 3 && r[0].left === r[1].left && r[1].top > r[0].top && r[2].top > r[1].top; }));
  check('extraction: footprint is a vertical checklist (8 rows), details collapsed', await page.evaluate(() => document.querySelectorAll('#app [data-fp]').length === 8 && [...document.querySelectorAll('#app .row-more')].every(m => m.hidden) && !document.querySelector('.cat-list')));
  await page.click('[data-fp="1"]'); await page.click('[data-fp="3"]');
  await page.click('.row:has(#fp-purchases) .row-exp');
  check('extraction: footprint checkboxes + inline accordion details', await page.evaluate(() => state.v2.footprint === 0b1010 && !document.getElementById('fp-purchases-more').hidden && document.getElementById('fp-purchases-more').textContent.includes('OBSERVED') && document.querySelector('.tally').textContent.trim().startsWith('2 of 8')));
  check('extraction: live sensor demo collapsed by default', await page.evaluate(() => !document.getElementById('live-more').open));
  await page.screenshot({ path: `${QA}/shots/desktop/02-extraction.png`, fullPage: true });
  await axe(page, 'extraction');
  // enter the live harvest with everything denied, come back
  await openMore(page, 'live-more'); await page.click('#btn-live'); await settle(page);
  check('extraction: sensor demo opens straight on the sensor tiles (identity step optional)', await page.isVisible('[data-perm="geo"]') && await page.evaluate(() => location.hash === '#sensors'));
  await page.click('[data-perm="cam"]'); await settle(page, 600);
  await page.click('#btn-back-extraction'); await settle(page);
  check('extraction ↔ live harvest round trip (denied camera recorded)', (await page.textContent('.live-box')).includes('denied'));
  await page.click('[data-goto="machine"]'); await settle(page);
  await page.click('[data-node="5"]');
  await openMore(page, 'm-rel'); await page.click('[data-filter="ownership"]');
  const rows = await page.$$eval('#rel-body tr', t => t.length);
  check('machine: node stepping + relation filter', (await page.textContent('#node-detail')).includes('Attention allocation') && rows === 5, { rows });
  await page.screenshot({ path: `${QA}/shots/desktop/03-machine.png`, fullPage: true });
  await axe(page, 'machine');
  await page.click('[data-goto="loop"]'); await settle(page);
  const before = await page.textContent('.metric b');
  await setRange(page, '#sl-a', 85); await setRange(page, '#sl-e', 80);
  for (let i = 0; i < 5; i++) await page.click('#lab-step');
  await settle(page);
  const after = await page.textContent('.metric b');
  check('loop: amplification + feedback rounds raise top-3 concentration', parseFloat(after) > parseFloat(before), { before, after });
  await page.click('#lab-chrono'); await settle(page);
  const chrono = await page.textContent('.metric b');
  check('loop: chronological baseline lowers concentration', parseFloat(chrono) < parseFloat(after), { chrono });
  await setRange(page, '#sl-a', 60); await setRange(page, '#sl-e', 70); await setRange(page, '#sl-k', 55);
  await page.screenshot({ path: `${QA}/shots/desktop/04-loop.png`, fullPage: true });
  await axe(page, 'loop');
  await page.click('[data-goto="revelation"]'); await settle(page, 1800);
  seed1 = (await page.textContent('#seed-line')).match(/ORACLE-[0-9A-Z]{4}-[0-9A-Z]{4}/)[0];
  id1 = (await page.textContent('#seed-line')).match(/C-[0-9A-F]{10}/)[0];
  params1 = await page.evaluate(() => OracleArt.normalize(OracleChapters.artParams()));
  check('revelation: seed + composition id shown; URL holds only abstract params', /^#revelation\?s=ORACLE-/.test(await page.evaluate(() => location.hash)), await page.evaluate(() => location.hash));
  const nodeId = Art.compositionId(params1);
  check('cross-engine determinism: Node compositionId === browser compositionId', nodeId === id1, { node: nodeId, browser: id1 });
  check('artwork params reflect visitor choices (offers/footprint/derived dials/rounds)', params1.o === 37 && params1.f === 10 && params1.d === 56 && params1.n === 5, params1);
  await page.screenshot({ path: `${QA}/shots/desktop/05-revelation.png`, fullPage: true });
  await axe(page, 'revelation');
  for (const fmt of ['portrait', 'story', 'square', 'hires']) R.exports['run1-' + fmt] = await exportFmt(page, fmt, `${QA}/exports/run1`);
  const dims = Object.fromEntries(Object.entries(R.exports).map(([k, v]) => [k, `${v.w}x${v.h}`]));
  check('export dimensions', dims['run1-portrait'] === '1080x1350' && dims['run1-story'] === '1080x1920' && dims['run1-square'] === '1080x1080' && dims['run1-hires'] === '2160x2700', dims);
  const meta = R.exports['run1-portrait'].texts.Comment || '';
  check('PNG tEXt metadata holds seed + abstract params only', meta.startsWith('oracle:s=' + seed1) && !/lat|lng|ua=|gpu/i.test(meta), meta);
  // share fallback (headless Linux Chrome: navigator.share unavailable)
  const hasShare = await page.evaluate(() => typeof navigator.share === 'function');
  await page.click('[data-fmt="portrait"]'); await settle(page, 400);
  const [sdl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.click('#rv-share')]);
  await settle(page, 400);
  const shareStatus = await page.textContent('#rv-status');
  check('share fallback: no Web Share → PNG downloaded + caption copy attempted', !hasShare && !!sdl && /downloaded/.test(shareStatus), { hasShare, shareStatus, file: sdl.suggestedFilename() });
  // simulate a device WITH Web Share (files) to exercise the native path
  await page.evaluate(() => { window.__shared = null; navigator.canShare = () => true; navigator.share = async (d) => { window.__shared = { files: d.files.map(f => [f.name, f.type, f.size]), text: d.text }; }; });
  await page.click('#rv-share'); await page.waitForFunction(() => window.__shared, null, { timeout: 10000 }).catch(() => {});
  const shared = await page.evaluate(() => window.__shared);
  check('share native path (stubbed navigator.share) receives PNG file + caption', shared && shared.files[0][1] === 'image/png' && shared.text.includes(seed1), shared && { file: shared.files[0], text: shared.text.slice(0, 80) });
  await page.click('#rv-clean'); await settle(page, 800);
  check('clean view hides app chrome', await page.evaluate(() => getComputedStyle(document.querySelector('.hud-bar')).display === 'none' && !!document.getElementById('art-clean')));
  await page.screenshot({ path: `${QA}/shots/desktop/06-clean-view.png` });
  await axe(page, 'clean-view');
  await page.click('#ac-back'); await settle(page, 600);
  // regenerate + restore
  await openMore(page, 'rv-more'); await page.click('#rv-new'); await settle(page, 600);
  const seed2 = (await page.textContent('#seed-line')).match(/ORACLE-[0-9A-Z]{4}-[0-9A-Z]{4}/)[0];
  await openMore(page, 'rv-more'); await page.fill('#rv-restore', seed1); await page.click('#rv-restore-btn'); await settle(page, 600);
  const restored = (await page.textContent('#seed-line'));
  check('new seed differs; restore by seed returns the original composition id', seed2 !== seed1 && restored.includes(seed1) && restored.includes(id1), { seed1, seed2, restored: restored.trim() });
  const hist = await page.evaluate(() => JSON.parse(localStorage.getItem('oracle.v2.history')));
  await openMore(page, 'rv-more'); await page.click('#rv-clear'); await settle(page, 400);
  const cleared = await page.evaluate(() => localStorage.getItem('oracle.v2.history'));
  check('history can be cleared (revocable)', cleared === null, { cleared });
  check('history stored locally, parameters only', hist.length >= 2 && hist.every(h => Object.keys(h).join() === 'enc,s,id'), hist.slice(0, 2));
  await ctx.close();
}

// ── 4. determinism: fresh context, open the shared link, export again ─────
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 1440, height: 900 }, acceptDownloads: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); instrument(page, 'determinism');
  await page.goto(BASE + '#art?' + Art.encode(params1) + '&fmt=portrait&pal=observatory&th=' + SCHEME + '&ty=instrument'); await settle(page, 900); // as produced by COPY LINK
  await page.screenshot({ path: `${QA}/shots/desktop/07-shared-link-clean-view.png` });
  await page.click('#ac-back'); await settle(page, 800);
  const id2 = (await page.textContent('#seed-line')).match(/C-[0-9A-F]{10}/)[0];
  check('shared link restores the same composition id in a fresh browser context', id2 === id1, { id1, id2 });
  for (const fmt of ['portrait', 'story', 'square', 'hires']) R.exports['run2-' + fmt] = await exportFmt(page, fmt, `${QA}/exports/run2`);
  const same = ['portrait', 'story', 'square', 'hires'].map(f => [f, R.exports['run1-' + f].sha256 === R.exports['run2-' + f].sha256]);
  check('same seed + params → byte-identical PNGs across contexts (DPR 1 vs 2, different viewport)', same.every(s => s[1]), Object.fromEntries(same));
  // legacy link (pre-theming, no look params) → rendered with the legacy look so old links reproduce exactly
  await page.goto(BASE + '#art?' + Art.encode(params1) + '&fmt=portrait'); await settle(page, 900);
  const legacyLook = await page.evaluate(() => OracleExport.lookNow());
  check('legacy link without look params renders with the legacy look (observatory · night · signal)', legacyLook.pal === 'observatory' && legacyLook.th === 'dark' && legacyLook.ty === 'signal', legacyLook);
  // fixed reference composition (stable across QA runs)
  await page.goto(BASE + '#revelation?' + FIXED); await settle(page, 900);
  for (const fmt of ['portrait', 'story', 'square', 'hires']) R.exports['fixed-desktop-' + fmt] = await exportFmt(page, fmt, `${QA}/exports/fixed`);
  // different seed → different image
  await openMore(page, 'rv-more'); await page.fill('#rv-restore', 'ORACLE-0000-0001'); await page.click('#rv-restore-btn'); await settle(page, 600);
  const other = await exportFmt(page, 'portrait', `${QA}/exports/run2`);
  check('different seed → different PNG', other.sha256 !== R.exports['run1-portrait'].sha256, other.sha256.slice(0, 16));
  await ctx.close();
}

// ── 5. mobile viewport (390×844, touch, DPR 3), zero permissions ──────────
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0 Mobile Safari/537.36' });
  const page = await ctx.newPage(); instrument(page, 'mobile');
  await page.goto(BASE); await settle(page, 700);
  await page.screenshot({ path: `${QA}/shots/mobile/00-approach.png` });
  const overflow = {};
  for (const [i, ch] of ['offer', 'extraction', 'machine', 'loop', 'revelation'].entries()) {
    await page.tap(`[data-go="${ch}"]`); await settle(page, ch === 'revelation' ? 1800 : 500);
    overflow[ch] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: `${QA}/shots/mobile/0${i + 1}-${ch}.png`, fullPage: true });
    await page.screenshot({ path: `${QA}/shots/mobile/0${i + 1}-${ch}-viewport.png` });
    await axe(page, 'mobile-' + ch);
  }
  check('mobile: no horizontal overflow in any chapter', Object.values(overflow).every(v => v <= 0), overflow);
  const pipH = await page.$eval('.phase-pip', e => e.getBoundingClientRect().height);
  await page.tap('#btn-sources'); await settle(page);
  check('mobile: sources drawer usable full-width', await page.$eval('.drawer-panel', e => e.getBoundingClientRect().width) >= 380);
  await page.screenshot({ path: `${QA}/shots/mobile/06-sources-drawer.png` });
  await page.tap('.drawer-close'); await settle(page);
  await page.goto(BASE + '#revelation?' + FIXED + '&fmt=story'); await settle(page, 900);
  R.exports['fixed-mobile-story'] = await exportFmt(page, 'story', `${QA}/exports/mobile`);
  check('fixed reference: mobile emulation (DPR 3, touch) export === desktop export (story)', R.exports['fixed-mobile-story'].sha256 === R.exports['fixed-desktop-story'].sha256, R.exports['fixed-mobile-story'].sha256);
  const t0 = Date.now();
  R.exports['mobile-story'] = await exportFmt(page, 'story', `${QA}/exports/mobile`);
  const exportMs = Date.now() - t0;
  check('mobile: story export 1080×1920 works', R.exports['mobile-story'].w === 1080 && R.exports['mobile-story'].h === 1920, { exportMs });
  const perf = await page.evaluate(() => { const p = OracleArt.normalize({ ...OracleChapters.artParams(), d: 100, f: 255, o: 63, e: 100, r: 100, t: 100, k: 100, a: 100, n: 12 }); const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const t = performance.now(); const s = OracleArt.compose(p, 1080 / 1920); const t1 = performance.now(); OracleArt.render(c.getContext('2d'), s, 1080, 1920, {}); return { compose: +(t1 - t).toFixed(1), render: +(performance.now() - t1).toFixed(1), prims: s.layers.reduce((a, L) => a + L.items.length, 0) }; });
  check('perf (desktop CPU, mobile emulation – not a real phone): max-density story compose+render', perf.compose + perf.render < 1000, perf);
  check('mobile: phase-rail targets ≥ 24px tall', pipH >= 24, { pipH });
  await ctx.close();
}

// ── 6. reduced motion ─────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); instrument(page, 'reduced-motion');
  await page.goto(BASE + '#machine'); await settle(page, 600);
  const raf1 = await page.evaluate(() => cosmosRaf);
  await settle(page, 500);
  const raf2 = await page.evaluate(() => cosmosRaf);
  check('reduced motion: starfield loop not running (static frame)', raf1 === 0 && raf2 === 0, { raf1, raf2 });
  check('reduced motion: PLAY THE LOOP disabled', await page.$eval('#m-play', b => b.disabled));
  await page.goto(BASE + '#revelation'); await settle(page, 400);
  const drawn = await page.$eval('#art-canvas', c => { const L = OracleExport.lookNow(), bg = OracleArt.PALETTES[L.pal + '-' + L.th].bg, v = parseInt(bg.slice(1), 16), B = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 0; i < d.length; i += 4 * 97) if (Math.abs(d[i] - B[0]) + Math.abs(d[i + 1] - B[1]) + Math.abs(d[i + 2] - B[2]) > 60) lit++; return lit; });
  check('reduced motion: artwork drawn immediately (no draw-in)', drawn > 50, { litSamples: drawn });
  await page.screenshot({ path: `${QA}/shots/reduced/05-revelation-reduced.png` });
  await ctx.close();
  const ctx2 = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 1280, height: 800 } });
  const p2 = await ctx2.newPage(); instrument(p2, 'motion-on');
  await p2.goto(BASE); await settle(p2, 400);
  const a = await p2.evaluate(() => cosmosRaf); await settle(p2, 300); const b = await p2.evaluate(() => cosmosRaf);
  check('control: without reduced motion the starfield animates', b > a, { a, b });
  await settle(p2, 6400);
  const c = await p2.evaluate(() => cosmosRaf);
  check('motion settles: starfield stops by itself after ~6 s (no endless loop)', c === 0, { c });
  const inf = await p2.evaluate(() => document.getAnimations().filter(an => an.effect.getTiming().iterations === Infinity && an.playState === 'running').map(an => an.animationName || an.id));
  check('motion settles: no infinite CSS animation running on approach', inf.length === 0, inf);
  await p2.goto(BASE); await settle(p2, 300); await p2.click('#btn-investigate'); await settle(p2, 300);
  check('motion settles: entering a chapter stops the starfield immediately', await p2.evaluate(() => cosmosRaf) === 0);
  await ctx2.close();
}

// ── v3: simulator flag + app chrome never floats over content (1024 / 1280 / 1440 / 390) ──
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage(); instrument(page, 'simulator-flag');
  await page.goto(BASE + '?simulator=1#offer'); await settle(page, 500);
  await setRange(page, '#sl-d', 82); await setRange(page, '#sl-i', 70);
  await page.click('[data-offer="0"]');
  const sim = await page.evaluate(() => ({ d: state.v2.ex.d, i: state.v2.ex.i, label: document.querySelector('.sim')?.textContent.includes('SIMULATED'), model: document.getElementById('model-wrap')?.textContent.includes('Exposure') }));
  check('?simulator=1 restores the Exchange simulator (sliders drive dials, ticks do not overwrite them, SIMULATED label)', sim.d === 82 && sim.i === 70 && sim.label && sim.model, sim);
  await axe(page, 'offer-simulator');
  await ctx.close();
  const layout = {};
  for (const [w, h] of [[1024, 768], [1280, 800], [1440, 900], [390, 844]]) {
    const c2 = await browser.newContext({ colorScheme: SCHEME, viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600 });
    const p = await c2.newPage(); instrument(p, 'layout-' + w);
    for (const ch of ['offer', 'extraction', 'machine', 'loop', 'revelation']) {
      await p.goto(BASE + '#' + ch); await settle(p, ch === 'revelation' ? 1200 : 400);
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)); await settle(p, 150);
      layout[w + '-' + ch] = await p.evaluate(() => {
        const bar = document.querySelector('.appbar'), r = bar.getBoundingClientRect(), cs = getComputedStyle(bar); const docTop = Math.round(r.top + window.scrollY);
        const allowed = new Set(['cosmos', 'sources-drawer']);
        const fixed = [...document.body.querySelectorAll('*')].filter(e => ['fixed', 'sticky'].includes(getComputedStyle(e).position) && e.getClientRects().length && !allowed.has(e.id) && !e.closest('#sources-drawer') && !['scanlines', 'noise', 'vignette'].some(k => e.classList.contains(k)));
        const nav = document.querySelector('#app .ch-nav button, #app #rv-download'); nav && nav.scrollIntoView({ block: 'center' });
        const nr = nav && nav.getBoundingClientRect();
        const hit = nav && document.elementFromPoint(nr.left + nr.width / 2, nr.top + nr.height / 2);
        const railInBar = bar.contains(document.getElementById('phase-rail'));
        return { inFlow: ['static', 'relative'].includes(cs.position), docTop, opaque: !/rgba?\(.*,\s*0(\.\d+)?\)$/.test(cs.backgroundColor) || cs.backgroundColor.startsWith('rgb('), railInBar, fixed: fixed.map(e => e.className || e.tagName), navClear: !nav || nav.contains(hit) };
      });
    }
    await c2.close();
  }
  check('chrome: app bar sits in page flow at the document top, opaque, holds the chapter nav (all widths, mid-scroll)', Object.values(layout).every(v => v.inFlow && v.docTop === 0 && v.opaque && v.railInBar), Object.fromEntries(Object.entries(layout).filter(([, v]) => !(v.inFlow && v.docTop === 0 && v.opaque && v.railInBar))));
  check('chrome: no fixed or sticky UI floats over content; primary action never covered', Object.values(layout).every(v => v.fixed.length === 0 && v.navClear), Object.fromEntries(Object.entries(layout).filter(([, v]) => v.fixed.length || !v.navClear)));
}

// ── cognitive load: one filled action per screen, one navigation pattern, consistent names ──
{
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage(); instrument(page, 'consistency');
  const per = {};
  for (const r of ['', '#offer', '#extraction', '#machine', '#loop', '#revelation', '#sensors', '#protocol']) {
    await page.goto(BASE + r); await settle(page, 500);
    per[r || '#approach'] = await page.evaluate(() => ({ filled: [...document.querySelectorAll('#app .btn-fill, #app .btn-sm.primary')].filter(b => b.getClientRects().length).length,
      backNav: document.querySelectorAll('#app .ch-nav button').length, kicker: document.querySelector('#app .stage-label')?.textContent || '', hud: document.getElementById('hud-phase').textContent }));
  }
  check('one filled (primary) action per screen at most', Object.values(per).every(v => v.filled <= 1), per);
  check('chapters: forward-only chapter nav (back = phase rail)', ['#offer', '#extraction', '#machine', '#loop'].every(k => per[k].backNav === 1) && per['#revelation'].backNav === 0, Object.fromEntries(Object.entries(per).map(([k, v]) => [k, v.backNav])));
  check('names match: chapter kicker "NN · LABEL" equals HUD "NN LABEL"', ['#offer', '#extraction', '#machine', '#loop', '#revelation'].every(k => per[k].kicker.replace(' \u00b7 ', ' ') === per[k].hud), Object.fromEntries(Object.entries(per).map(([k, v]) => [k, [v.kicker, v.hud]])));
  check('v1.2 demo screens are labelled as part of 02 (no competing PHASE numbering)', per['#sensors'].kicker.startsWith('02') && per['#protocol'].kicker.startsWith('02') && per['#sensors'].hud.includes('02 EXTRACTION'), [per['#sensors'], per['#protocol']]);
  await ctx.close();
}

// ── theme: auto follows prefers-color-scheme, manual override persists, artwork repaints with same composition ──
{
  const other = SCHEME === 'dark' ? 'light' : 'dark';
  const ctx = await browser.newContext({ colorScheme: SCHEME, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage(); instrument(page, 'theme');
  const th = () => page.evaluate(() => ({ t: document.documentElement.dataset.theme, pref: document.documentElement.dataset.themePref, ls: localStorage.getItem('oracle.theme'), sel: document.getElementById('theme-select')?.value, pal: document.documentElement.dataset.palette, type: document.documentElement.dataset.type }));
  await page.goto(BASE + '#offer'); await settle(page, 400);
  let t = await th();
  check(`theme: auto mode follows emulated prefers-color-scheme (${SCHEME})`, t.t === SCHEME && t.pref === 'auto' && t.sel === 'auto' && t.ls === null, t);
  check('theme: default look is observatory palette + instrument type', t.pal === 'observatory' && t.type === 'instrument', t);
  const name = await page.$eval('#theme-select', el => ({ label: el.labels[0]?.textContent, opts: [...el.options].map(o => o.textContent) }));
  check('theme: switch is a labelled native <select> (Auto/Night/Day)', name.label === 'Colour theme' && name.opts.length === 3, name);
  await page.emulateMedia({ colorScheme: other }); await settle(page, 200);
  t = await th(); check('theme: auto mode reacts live when the device scheme changes', t.t === other, t);
  await page.emulateMedia({ colorScheme: SCHEME }); await settle(page, 200);
  await page.selectOption('#theme-select', other); await settle(page, 200);
  t = await th(); check('theme: manual override applies and is stored in localStorage', t.t === other && t.ls === other, t);
  await page.reload(); await settle(page, 400);
  t = await th(); check('theme: manual override persists across reload (device scheme unchanged)', t.t === other && t.sel === other, t);
  await page.focus('#theme-select'); await page.keyboard.press('ArrowUp'); await settle(page, 200);
  t = await th(); check('theme: keyboard can change the switch', t.sel !== other, t);
  await page.selectOption('#theme-select', 'auto'); await settle(page, 200);
  t = await th(); check('theme: back to auto clears storage and follows device again', t.t === SCHEME && t.ls === null, t);
  await page.goto(BASE + '?palette=nope&type=nope#offer'); await settle(page, 300);
  t = await th(); check('theme: unknown ?palette/?type fall back to defaults', t.pal === 'observatory' && t.type === 'instrument', t);
  await page.goto(BASE + '#revelation?' + FIXED + '&fmt=portrait'); await settle(page, 1800);
  const before = await page.evaluate(() => ({ id: document.querySelector('#seed-line small').textContent, px: [...document.getElementById('art-canvas').getContext('2d').getImageData(4, 4, 1, 1).data].slice(0, 3) }));
  await page.selectOption('#theme-select', other); await settle(page, 1800);
  const after = await page.evaluate(() => ({ id: document.querySelector('#seed-line small').textContent, px: [...document.getElementById('art-canvas').getContext('2d').getImageData(4, 4, 1, 1).data].slice(0, 3), look: OracleExport.lookNow() }));
  check('theme: switching theme repaints the artwork, composition id unchanged', before.id === after.id && before.px.join() !== after.px.join() && after.look.th === other, { before, after });
  await page.evaluate(() => localStorage.clear());
  await ctx.close();
}

await browser.close();

// ── privacy: every request, every run ─────────────────────────────────────
const external = R.requests.filter(r => !r.url.startsWith('http://127.0.0.1:8765/'));
check('network: zero non-localhost requests across all runs', external.length === 0, external.slice(0, 5));
const leaky = R.requests.filter(r => /51\.50|0\.141|Pixel 8|ANGLE|ORACLE_HASH/.test(r.url + (r.post || '')));
check('network: no request carries geolocation, UA, GPU or hash values', leaky.length === 0, leaky.slice(0, 3));
check('network: only GET requests for static files', R.requests.every(r => r.method === 'GET'), [...new Set(R.requests.map(r => r.method))]);
const probe = R.consoleErrors.filter(e => e.text.includes('example.com/?probe=1'));
const realErrors = R.consoleErrors.filter(e => !e.text.includes('example.com/?probe=1'));
check('console: only the deliberate CSP probe errors (2 expected), zero app errors', realErrors.length === 0 && probe.length === 2, { app: realErrors.slice(0, 5), probe: probe.length });
const axeV = Object.fromEntries(Object.entries(R.axe).map(([k, v]) => [k, v.violations.map(x => `${x.id}(${x.impact})×${x.nodes}`)]));
check('axe-core WCAG 2.1 A/AA: zero violations on every screen tested', Object.values(R.axe).every(v => v.violations.length === 0), axeV);
R.requestSummary = Object.entries(R.requests.reduce((m, r) => { const u = r.url.replace(/[?#].*/, ''); m[u] = (m[u] || 0) + 1; return m; }, {})).map(([u, n]) => `${n}× ${u}`);
R.finished = new Date().toISOString();
fs.writeFileSync(`${QA}/results.json`, JSON.stringify(R, null, 1));
const failed = R.checks.filter(c => !c.ok).length;
console.log(`\n${R.checks.length - failed}/${R.checks.length} checks passed`);
process.exit(failed ? 1 : 0);

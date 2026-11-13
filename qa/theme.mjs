// Theme exploration harness: screenshots of every palette × mode and type × mode at desktop + 390px,
// side-by-side comparison sheets, token/art palette parity, per-theme export hashes (twice, different DPR).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const OUT = process.env.THEME_DIR || '/workspace/oracle-qa/theme';
const FIXED = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4';
const PALETTES = ['observatory', 'sodium', 'spectral'], TYPES = ['instrument', 'signal', 'almanac'], MODES = ['dark', 'light'];
const VIEWS = { desktop: { width: 1280, height: 860, dpr: 1 }, mobile: { width: 390, height: 844, dpr: 2 } };
const R = { started: new Date().toISOString(), errors: [], requests: [], parity: {}, hashes: {}, shots: [] };
fs.mkdirSync(`${OUT}/palette`, { recursive: true }); fs.mkdirSync(`${OUT}/type`, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });

async function ctxFor(view, mode, extra = {}) {
  const v = VIEWS[view];
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.dpr, colorScheme: mode, reducedMotion: 'reduce', acceptDownloads: true, ...extra });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') R.errors.push({ view, mode, text: m.text() }); });
  page.on('pageerror', e => R.errors.push({ view, mode, text: 'pageerror: ' + e.message }));
  page.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) R.requests.push(r.url()); });
  return { ctx, page };
}
const go = async (page, qs, hash) => { await page.goto(`${BASE}?${qs}${hash}`); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(450); };

if (!process.env.SHEETS_ONLY) {
// 1. screenshots (auto mode: device scheme emulated — no ?theme= so the real auto path is exercised)
for (const view of Object.keys(VIEWS)) for (const mode of MODES) {
  const { ctx, page } = await ctxFor(view, mode);
  for (const pal of PALETTES) {
    for (const [tag, hash] of [['offer', '#offer'], ['revelation', `#revelation?${FIXED}&fmt=portrait`]]) {
      await go(page, `palette=${pal}&type=instrument`, hash);
      const got = await page.evaluate(() => ({ th: document.documentElement.dataset.theme, pal: document.documentElement.dataset.palette }));
      if (got.th !== mode || got.pal !== pal) R.errors.push({ view, mode, text: `theme attr mismatch ${JSON.stringify(got)}` });
      const f = `${OUT}/palette/${pal}-${mode}-${view}-${tag}.png`; await page.screenshot({ path: f }); R.shots.push(f);
    }
  }
  for (const ty of TYPES) {
    await go(page, `palette=observatory&type=${ty}`, '#extraction');
    const f = `${OUT}/type/${ty}-${mode}-${view}-extraction.png`; await page.screenshot({ path: f }); R.shots.push(f);
    await go(page, `palette=observatory&type=${ty}`, '#loop');
    const f2 = `${OUT}/type/${ty}-${mode}-${view}-loop.png`; await page.screenshot({ path: f2 }); R.shots.push(f2);
  }
  await ctx.close();
}

// 2. token parity: theme.css custom properties == OracleArt.PALETTES
{
  const { ctx, page } = await ctxFor('desktop', 'dark');
  for (const pal of PALETTES) for (const mode of MODES) {
    await go(page, `palette=${pal}&theme=${mode}`, '#offer');
    R.parity[`${pal}-${mode}`] = await page.evaluate((k) => {
      const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim().toLowerCase();
      const css = { bg: v('--bg'), roles: ['--ink', '--signal', '--trace', '--alert', '--slate'].map(v) };
      const art = OracleArt.PALETTES[k];
      return { ok: css.bg === art.bg && css.roles.every((c, i) => c === art.roles[i]), css, art };
    }, `${pal}-${mode}`);
  }
  await ctx.close();
}

// 3. export hashes per look, twice: context A (DPR 1, desktop, auto via emulated scheme) and B (DPR 3, mobile, ?theme= forced)
async function hashesIn(view, dpr, forced) {
  const out = {};
  for (const mode of MODES) {
    const { ctx, page } = await ctxFor(view, mode, { deviceScaleFactor: dpr });
    for (const pal of PALETTES) for (const ty of ['instrument', 'signal']) {
      await go(page, `palette=${pal}&type=${ty}${forced ? `&theme=${mode}` : ''}`, `#revelation?${FIXED}&fmt=portrait`);
      out[`${pal}-${mode}-${ty}`] = await page.evaluate(async () => {
        const p = OracleArt.normalize(OracleChapters.artParams());
        const { blob, id, w, h } = await OracleExport.exportBlob(p, 'portrait');
        const d = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
        return { sha256: [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''), id, w, h, bytes: blob.size, look: OracleExport.lookNow() };
      });
    }
    await ctx.close();
  }
  return out;
}
R.hashes.A = await hashesIn('desktop', 1, false);
R.hashes.B = await hashesIn('mobile', 3, true);
// pinned-link check: open a sodium/light/almanac link while the device is dark → art must use the link's look
{
  const { ctx, page } = await ctxFor('desktop', 'dark');
  await go(page, '', `#art?${FIXED}&fmt=portrait&pal=sodium&th=light&ty=signal`);
  R.pinned = await page.evaluate(async () => {
    const p = OracleArt.normalize(OracleChapters.artParams());
    const { blob } = await OracleExport.exportBlob(p, 'portrait');
    const d = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return { sha256: [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''), look: OracleExport.lookNow(), siteTheme: document.documentElement.dataset.theme };
  });
  await page.screenshot({ path: `${OUT}/pinned-link-sodium-light-on-dark-device.png` });
  await ctx.close();
}
R.finished = new Date().toISOString();
fs.writeFileSync(`${OUT}/theme-results.json`, JSON.stringify(R, null, 2));
} // end !SHEETS_ONLY

// 4. comparison sheets (local file page, screenshots only)
function sheet(name, title, rows, cols, file) {
  const cell = (src, cap) => `<figure><img src="${src}"><figcaption>${cap}</figcaption></figure>`;
  const html = `<!doctype html><meta charset=utf-8><style>
    body{margin:0;padding:28px;background:#808080;font:14px/1.3 'IBM Plex Mono',monospace;color:#111}
    h1{font:600 22px system-ui;margin:0 0 6px}p{margin:0 0 18px}
    .row{display:grid;grid-template-columns:150px repeat(${cols.length},auto);gap:14px;align-items:start;margin-bottom:18px}
    .lab{font-weight:600;font-size:16px;padding-top:4px}figure{margin:0}figcaption{font-size:12px;margin-top:4px}
    img{display:block;border:1px solid #222}img.d{width:440px}img.m{width:150px}</style>
    <h1>${title}</h1><p>${name}</p>${rows.map(r => `<div class="row"><div class="lab">${r.label}</div>${cols.map(c => cell(r.src(c), c.cap).replace('<img', `<img class="${c.cls}"`)).join('')}</div>`).join('')}`;
  fs.writeFileSync(file.replace(/\.png$/, '.html'), html);
  return file;
}
const colsP = [{ m: 'dark', v: 'desktop', cls: 'd', cap: 'Night · desktop 1280' }, { m: 'dark', v: 'mobile', cls: 'm', cap: 'Night · 390' }, { m: 'light', v: 'desktop', cls: 'd', cap: 'Day · desktop 1280' }, { m: 'light', v: 'mobile', cls: 'm', cap: 'Day · 390' }];
const sheets = [
  sheet('Chapter 01 (offer) · type = Instrument · auto mode via emulated prefers-color-scheme', 'Palette exploration — Observatory (A) · Sodium (B) · Spectral (C)',
    PALETTES.map(p => ({ label: p, src: c => `palette/${p}-${c.m}-${c.v}-offer.png` })), colsP, `${OUT}/compare-palettes.png`),
  sheet('Chapter 05 artwork · same seed ORACLE-7K3F-Q9ZD, same composition id, palette applied at render', 'Palette exploration — artwork',
    PALETTES.map(p => ({ label: p, src: c => `palette/${p}-${c.m}-${c.v}-revelation.png` })), colsP, `${OUT}/compare-palettes-artwork.png`),
  sheet('Chapter 02 (extraction) · palette = Observatory', 'Type exploration — Instrument (default) · Signal (v1.2 voice) · Almanac',
    TYPES.map(t => ({ label: t, src: c => `type/${t}-${c.m}-${c.v}-extraction.png` })), colsP, `${OUT}/compare-typefaces.png`)
];
// 1:1 detail sheet for type: real pixel size, cropped to the heading + first panel (desktop) and the top of the 390px view.
{
  const crop = (src, w, h, scale) => `<div style="width:${w}px;height:${h}px;overflow:hidden;border:1px solid #222"><img src="${src}" style="width:${src.includes('mobile') ? 390 : 1280}px;max-width:none;display:block;border:0;transform-origin:0 0"></div>`;
  const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;padding:24px;background:#808080;font:14px 'IBM Plex Mono',monospace;color:#111}h1{font:600 22px system-ui;margin:0 0 4px}
    .row{display:flex;gap:14px;align-items:flex-start;margin:14px 0 22px}.lab{width:120px;font-weight:600;font-size:15px}</style>
    <h1>Type exploration — 1:1 detail (chapter 02, Observatory)</h1><div>Instrument = Space Grotesk + IBM Plex Sans + IBM Plex Mono · Signal = Syne + IBM Plex Mono · Almanac = Fraunces + IBM Plex Sans + IBM Plex Mono — all SIL OFL 1.1, self-hosted</div>
    ${TYPES.map(t => `<div class="row"><div class="lab">${t}</div>${crop(`type/${t}-dark-desktop-extraction.png`, 900, 400, 1)}${crop(`type/${t}-light-mobile-extraction.png`, 390, 400, 0.5 * 2)}</div>`).join('')}`;
  // mobile shots are DPR 2 (780px wide): show at 390 css px
  fs.writeFileSync(`${OUT}/compare-typefaces-detail.html`, html.replaceAll('width:390px;max-width:none', 'width:390px;max-width:none'));
  sheets.push(`${OUT}/compare-typefaces-detail.png`);
}
const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 } });
const page = await ctx.newPage();
for (const s of sheets) { await page.goto('file://' + s.replace(/\.png$/, '.html')); await page.waitForLoadState('load'); await page.screenshot({ path: s, fullPage: true }); }
await browser.close();
if (!process.env.SHEETS_ONLY) console.log(JSON.stringify({ shots: R.shots.length, errors: R.errors, thirdParty: R.requests, parity: Object.fromEntries(Object.entries(R.parity).map(([k, v]) => [k, v.ok])), pinned: R.pinned,
  hashesMatchAcrossContexts: Object.keys(R.hashes.A).every(k => R.hashes.A[k].sha256 === R.hashes.B[k].sha256), distinct: new Set(Object.values(R.hashes.A).map(h => h.sha256)).size, ids: [...new Set(Object.values(R.hashes.A).map(h => h.id))] }, null, 1));

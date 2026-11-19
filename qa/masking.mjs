// v7 WP8: masking checks end to end in Chromium. A clean browser (several sizes, DPRs, time zones incl. UTC) must give
// ZERO flags and no summary line; simulated protections must be labelled, explained in ⓘ, and left out of the pattern.
// Browser-native protections are simulated with Proxy-wrapped overrides (they look built-in, as the real ones are);
// the "extension" is a plain JS override (what most spoofing extensions do). Also: nothing runs before Show me,
// axe 0 on the flagged readout and its ⓘ sheet, zero outbound requests.
//   BASE=http://127.0.0.1:8765/oracle-protocol/ CHROME=/path/to/chrome node masking.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const SCHEME = process.env.COLOR_SCHEME || 'dark';
const origin = new URL(BASE).origin;
// Runs in the page before any script. kind: clean | firefox | safari | extension | tz
const SIM = (kind) => {
  const nat = (f) => new Proxy(f, {});
  window.__mk = { reads: 0 };
  const gi = CanvasRenderingContext2D.prototype.getImageData;
  const count = { getImageData(...a) { window.__mk.reads++; return gi.apply(this, a); } }.getImageData;
  if (kind === 'firefox') CanvasRenderingContext2D.prototype.getImageData = nat({ getImageData(...a) { window.__mk.reads++; const d = gi.apply(this, a); for (let i = 1; i < d.data.length; i += 68) d.data[i] ^= 1; return d; } }.getImageData);
  else if (kind === 'safari') CanvasRenderingContext2D.prototype.getImageData = nat({ getImageData(...a) { window.__mk.reads++; const d = gi.apply(this, a); for (let i = 0; i < d.data.length; i += 4) if (d.data[i] === 0x3c && d.data[i + 1] === 0x6e && (i / 4) % 9 === 0) d.data[i + 2] ^= 1; return d; } }.getImageData);
  else CanvasRenderingContext2D.prototype.getImageData = nat(count);
  if (kind === 'extension') {
    Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { configurable: true, get() { return 4; } });
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: 2 });
  }
  if (kind === 'tz') { const ro = Intl.DateTimeFormat.prototype.resolvedOptions; Intl.DateTimeFormat.prototype.resolvedOptions = nat({ resolvedOptions() { const o = ro.call(this); return { ...o, timeZone: o.timeZone === 'Asia/Yerevan' ? 'America/New_York' : o.timeZone }; } }.resolvedOptions); }
};
const CASES = [
  { kind: 'clean', vp: { width: 1280, height: 860 }, dpr: 1, tz: 'Asia/Yerevan', want: [] },
  { kind: 'clean', vp: { width: 390, height: 844 }, dpr: 3, tz: 'UTC', mobile: true, want: [] },
  { kind: 'clean', vp: { width: 360, height: 640 }, dpr: 2, tz: 'Etc/GMT', mobile: true, want: [] },
  { kind: 'clean', vp: { width: 1440, height: 900 }, dpr: 1.25, tz: 'Asia/Kathmandu', want: [] },
  { kind: 'clean', vp: { width: 820, height: 1180 }, dpr: 2, tz: 'America/New_York', mobile: true, want: [] },
  { kind: 'firefox', vp: { width: 390, height: 844 }, dpr: 3, tz: 'Asia/Yerevan', want: ['canvas', 'fonts'], check: 'm1' },
  { kind: 'safari', vp: { width: 390, height: 844 }, dpr: 3, tz: 'Asia/Yerevan', want: ['canvas', 'fonts'], check: 'm1' },
  { kind: 'extension', vp: { width: 390, height: 844 }, dpr: 3, tz: 'Asia/Yerevan', want: ['cores', 'memory'], check: 'm3', info: 'hardware' },
  { kind: 'tz', vp: { width: 390, height: 844 }, dpr: 3, tz: 'Asia/Yerevan', want: ['tz'], check: 'm4tz', info: 'time' }
];
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let fails = 0; const out = []; let fp = 0, cleanRuns = 0;
const check = (ok, msg, d) => { if (!ok) fails++; out.push(`${ok ? 'PASS' : 'FAIL'}  ${msg}${ok || d === undefined ? '' : '  — ' + JSON.stringify(d).slice(0, 400)}`); };
for (const C of CASES) {
  const tag = `${C.kind} ${C.vp.width}×${C.vp.height}@${C.dpr} ${C.tz}`;
  const ctx = await b.newContext({ colorScheme: SCHEME, viewport: C.vp, deviceScaleFactor: C.dpr, isMobile: !!C.mobile, hasTouch: !!C.mobile, timezoneId: C.tz, reducedMotion: 'reduce' });
  await ctx.addInitScript(SIM, C.kind);
  const page = await ctx.newPage(), outbound = [], errs = [];
  page.on('request', r => { if (!r.url().startsWith(origin) && !/^(data|blob):/.test(r.url())) outbound.push(r.url()); });
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + '#device'); await page.reload(); await page.waitForTimeout(500);
  const pre = await page.evaluate(() => ({ reads: window.__mk.reads, mk: OracleDevice.maskingResult() }));
  await page.click('#dev-show'); await page.waitForSelector('#dev-next', { timeout: 8000 }); await page.waitForTimeout(300);
  const r = await page.evaluate(() => { const R = OracleDevice.snapshot().passive; return { mk: OracleDevice.maskingResult(), rand: Object.values(R).filter(e => e.state === 'randomised').map(e => e.id).sort(),
    line: (document.getElementById('dev-masked') || {}).textContent || '', total: Object.keys(R).length, reads: window.__mk.reads, canon: OraclePrivacy.canonical(OracleDevice.snapshot()) }; });
  const flagged = Object.keys(r.mk.flags).sort();
  check(pre.reads === 0 && pre.mk === null, `${tag}: no masking check before Show me`, pre);
  check(Object.values(r.mk.ran).every(Boolean), `${tag}: M1–M4 all ran after Show me`, r.mk.ran);
  check(JSON.stringify(flagged) === JSON.stringify(C.want) && JSON.stringify(r.rand) === JSON.stringify(C.want), `${tag}: flags [${flagged}] (want [${C.want}])`, r);
  if (C.kind === 'clean') { cleanRuns++; fp += flagged.length; check(!r.line, `${tag}: no summary line on a clean browser`, r.line); }
  else {
    check(new RegExp(`changes ${C.want.length} of ${r.total} readings to protect you`).test(r.line), `${tag}: summary line "${r.line.trim()}"`, r.line);
    check(C.want.every(id => !new RegExp('[|]' + ({ canvas: 'canvas=[^-]', fonts: 'fontset=[^-]' }[id] || 'zz')).test(r.canon)), `${tag}: flagged readings stay out of the pattern`, r.canon);
    const grp = C.info || 'render';
    await page.click(`[data-dev-info="${grp}"]`); await page.waitForSelector('#sheet[open] #sheet-body', { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(300);
    const sh = await page.evaluate(() => { if (!document.getElementById('sheet')) return { t: 'NO SHEET ' + location.href + ' ' + document.body.innerText.slice(0, 200) }; const s = document.querySelector('#sheet-body') || document.querySelector('#sheet .sheet-body') || document.getElementById('sheet'); return { open: document.getElementById('sheet').open, t: s.innerText, ver: s.querySelectorAll('.prov-verified').length, inf: s.querySelectorAll('.prov-inferred').length }; });
    check(/check/i.test(sh.t) && /Left out of your pattern/.test(sh.t) && (C.check === 'm1' ? sh.ver >= 1 : sh.inf >= 1), `${tag}: ⓘ names the check with its label`, sh);
    await page.evaluate(AXE);
    const v = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(x => x.id));
    check(!v.length, `${tag}: axe 0 on the ⓘ sheet over the flagged readout`, v);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    const v2 = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(x => x.id));
    check(!v2.length, `${tag}: axe 0 on the flagged readout`, v2);
    if (process.env.SHOT && C.kind === 'extension') await page.screenshot({ path: process.env.SHOT });
  }
  check(!outbound.length && !errs.length, `${tag}: zero outbound requests, no page errors`, { outbound, errs });
  await ctx.close();
}
await b.close();
console.log(out.join('\n'));
console.log(`INFO  clean-browser false positives: ${fp} flags across ${cleanRuns} clean runs`);
console.log(`masking: ${out.length - fails}/${out.length} checks pass`);
process.exit(fails ? 1 : 0);

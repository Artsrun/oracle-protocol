// v7 WP6: "Play sound" in the QA browser — no AudioContext before the tap; ZzFX's own context is closed; the samples
// written to the buffer are byte-identical to Node's (V8) for the reference links; tap again stops; zero outbound.
//   BASE=http://127.0.0.1:8765/oracle-protocol/ CHROME=/path/to/chrome node sound.mjs
import { chromium } from 'playwright-core';
import crypto from 'node:crypto';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/oracle-protocol/';
const FIXED = 's=ORACLE-7K3F-Q9ZD&o=21&f=77&d=80&c=40&p=70&y=60&x=65&i=55&e=75&r=60&t=50&k=60&a=70&n=4';
// PCM hashes pinned in tests/sound.test.cjs (Node, V8). Links without a pattern use the "choices" sound.
const CASES = [
  { name: 'v4 layered', q: FIXED + '&v=2', pcm: '913c8577072bf4ef' },
  { name: 'v5 ring withheld', q: FIXED + '&v=3', pcm: '913c8577072bf4ef' },
  { name: 'v5 ring pattern', q: FIXED + '&v=3&dg=1a2b3c4d&db=N2M', pcm: '40a7f299d33b30a9' },
  { name: 'v1 legacy', q: FIXED, pcm: '913c8577072bf4ef' }
];
const SPY = () => {
  window.__ac = { made: 0, closed: 0, started: 0, writes: [] };
  const Real = window.AudioContext;
  window.AudioContext = class extends Real {
    constructor(...a) { super(...a); window.__ac.made++; window.__ac.stack = (window.__ac.stack || []).concat([new Error().stack.split('\n').slice(2, 4).join(' | ')]); }
    close() { window.__ac.closed++; return super.close(); }
  };
  const copy = AudioBuffer.prototype.copyToChannel;
  AudioBuffer.prototype.copyToChannel = function (arr, ...r) { const u = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); window.__ac.writes.push(btoa(s)); return copy.call(this, arr, ...r); };
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) { window.__ac.started++; return start.apply(this, a); };
};
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=user-gesture-required'] });
const origin = new URL(BASE).origin; let fails = 0; const out = [];
const check = (ok, msg, d) => { if (!ok) fails++; out.push(`${ok ? 'PASS' : 'FAIL'}  ${msg}${ok || d === undefined ? '' : '  — ' + JSON.stringify(d).slice(0, 300)}`); };
for (const C of CASES) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(SPY);
  const page = await ctx.newPage(), outbound = [], errors = [];
  page.on('request', (r) => { if (!r.url().startsWith(origin)) outbound.push(r.url()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '#revelation?' + C.q); await page.waitForTimeout(900);
  await page.click('#rv-options'); await page.waitForTimeout(300);
  const before = await page.evaluate(() => ({ made: window.__ac.made, zz: OracleVendor.loaded('zzfx') }));
  check(before.made === 0 && !before.zz, `${C.name}: no AudioContext and no ZzFX before the tap`, before);
  await page.tap('#rv-sound');
  await page.waitForFunction(() => window.__ac.started > 0, null, { timeout: 5000 }).catch(() => {});
  const mid = await page.evaluate(() => ({ ...window.__ac, writes: window.__ac.writes.length, pressed: document.getElementById('rv-sound').getAttribute('aria-pressed'), st: document.getElementById('rv-opt-status').textContent }));
  const w = await page.evaluate(() => window.__ac.writes[0]);
  const h = w ? crypto.createHash('sha256').update(Buffer.from(w, 'base64')).digest('hex').slice(0, 16) : '';
  check(mid.started === 1 && mid.writes === 1 && mid.pressed === 'true' && /Playing/.test(mid.st), `${C.name}: one tap plays once (aria-pressed true, status says so)`, mid);
  check(mid.made === 2 && mid.closed === 1, `${C.name}: our context made in the tap + ZzFX's own one closed (made ${mid.made}, closed ${mid.closed})`, mid.stack);
  check(h === C.pcm, `${C.name}: samples written = Node PCM ${C.pcm} (got ${h})`);
  await page.waitForFunction(() => document.getElementById('rv-sound').getAttribute('aria-pressed') === 'false', null, { timeout: 4000 }).catch(() => {});
  check(await page.evaluate(() => document.getElementById('rv-sound').getAttribute('aria-pressed')) === 'false', `${C.name}: aria-pressed returns to false when the sound ends (≤1.2 s)`);
  await page.tap('#rv-sound'); await page.waitForFunction(() => window.__ac.started > 1, null, { timeout: 3000 }).catch(() => {});
  await page.tap('#rv-sound'); await page.waitForTimeout(150);
  const stop = await page.evaluate(() => ({ made: window.__ac.made, pressed: document.getElementById('rv-sound').getAttribute('aria-pressed'), st: document.getElementById('rv-opt-status').textContent }));
  check(stop.pressed === 'false' && /stopped/.test(stop.st) && stop.made === 2, `${C.name}: tapping again while playing stops it; the context is reused`, stop);
  check(outbound.length === 0 && errors.length === 0, `${C.name}: zero outbound requests, no page errors`, { outbound, errors });
  await ctx.close();
}
await b.close();
console.log(out.join('\n'));
console.log(`sound: ${out.length - fails}/${out.length} checks pass`);
process.exit(fails ? 1 : 0);
